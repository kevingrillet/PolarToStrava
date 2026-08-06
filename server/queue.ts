/**
 * File d'envoi des séances vers Strava.
 *
 * Un seul import à la fois : les quotas Strava sont globaux à l'application, donc
 * paralléliser ne ferait qu'atteindre la limite plus vite. Le traitement est
 * séquentiel, interruptible, et chaque issue est journalisée sur disque avant de
 * passer à la suivante — ce qui garantit qu'un arrêt (volontaire, plantage,
 * quota journalier épuisé) ne fasse jamais réenvoyer une séance déjà acceptée.
 */
import { EventEmitter } from 'node:events';
import { buildFit } from '../core/fit/build';
import { buildTcx } from '../core/tcx/build';
import { readSession } from '../core/polar/session';
import { resolveSport, type StravaSportType } from '../core/polar/sports';
import type { ExportFormat, RunEvent, RunState, SessionSummary, UploadOutcome } from '../core/dto';
import { readSessionFile } from './polarExport';
import { getRateLimit, uploadActivity } from './strava';
import { isAlreadyDone, readProgress, recordUpload } from './store';

export type { RunEvent, RunState };

export interface RunOptions {
  /** Chemin de l'archive ou du dossier d'export. */
  readonly source: string;
  /** Séances retenues, dans l'ordre d'envoi. */
  readonly sessions: readonly SessionSummary[];
  /** Réaffectations de sport décidées par l'utilisateur. */
  readonly sportOverrides: Readonly<Record<number, StravaSportType>>;
  /** Format envoyé. Le FIT porte le sport, le TCX non. */
  readonly format: ExportFormat;
  /**
   * Corriger le type de sport après envoi (`PUT /activities/{id}`, 1 requête de
   * plus par séance). Indispensable en TCX, inutile en FIT — conservé comme
   * échappatoire au cas où Strava n'honorerait pas le sport du FIT.
   */
  readonly applySportType: boolean;
  /** Marquer les séances comme trajets domicile-travail. */
  readonly commute: boolean;
  /** Rejouer les séances déjà envoyées (par défaut on les saute). */
  readonly redoDone: boolean;
}

const IDLE: RunState = {
  running: false,
  total: 0,
  index: 0,
  uploaded: 0,
  duplicates: 0,
  failed: 0,
  skipped: 0,
};

class UploadQueue extends EventEmitter {
  private state: RunState = IDLE;
  private stopRequested = false;

  getState(): RunState {
    return this.state;
  }

  requestStop(): void {
    if (this.state.running) this.stopRequested = true;
  }

  private emitEvent(event: RunEvent): void {
    this.emit('event', event);
  }

  private emitQuota(): void {
    const quota = getRateLimit();
    this.emitEvent({
      type: 'quota',
      shortUsage: quota.shortUsage,
      shortLimit: quota.shortLimit,
      dailyUsage: quota.dailyUsage,
      dailyLimit: quota.dailyLimit,
    });
  }

  /**
   * Lance un import. Rejette si un import est déjà en cours — plutôt que de
   * lancer un second traitement qui doublerait la consommation de quota.
   */
  async run(options: RunOptions): Promise<void> {
    if (this.state.running) throw new Error('un import est déjà en cours');

    this.stopRequested = false;
    this.state = { ...IDLE, running: true, total: options.sessions.length };
    this.emitEvent({ type: 'start', total: options.sessions.length });

    const progress = readProgress();

    try {
      for (let index = 0; index < options.sessions.length; index += 1) {
        if (this.stopRequested) break;

        const summary = options.sessions[index];
        this.state = { ...this.state, index: index + 1 };

        if (!options.redoDone && isAlreadyDone(summary.id, progress)) {
          this.state = { ...this.state, skipped: this.state.skipped + 1 };
          this.emitEvent({
            type: 'session',
            index: index + 1,
            total: options.sessions.length,
            sessionId: summary.id,
            file: summary.file,
            state: 'skipped',
          });
          continue;
        }

        this.emitEvent({
          type: 'session',
          index: index + 1,
          total: options.sessions.length,
          sessionId: summary.id,
          file: summary.file,
          state: 'uploading',
        });

        const outcome = await this.uploadOne(summary, options);
        recordUpload(summary.id, { ...outcome, at: new Date().toISOString() });

        this.state = {
          ...this.state,
          uploaded: this.state.uploaded + (outcome.outcome === 'uploaded' ? 1 : 0),
          duplicates: this.state.duplicates + (outcome.outcome === 'duplicate' ? 1 : 0),
          failed: this.state.failed + (outcome.outcome === 'failed' ? 1 : 0),
        };

        this.emitEvent({
          type: 'session',
          index: index + 1,
          total: options.sessions.length,
          sessionId: summary.id,
          file: summary.file,
          state: outcome.outcome,
          ...(outcome.activityId !== undefined ? { activityId: outcome.activityId } : {}),
          ...(outcome.error !== undefined ? { error: outcome.error } : {}),
        });
        this.emitQuota();
      }
    } finally {
      const { uploaded, duplicates, failed, skipped } = this.state;
      this.emitEvent({
        type: 'done',
        uploaded,
        duplicates,
        failed,
        skipped,
        stopped: this.stopRequested,
      });
      this.state = { ...this.state, running: false };
      this.stopRequested = false;
    }
  }

  /** Convertit puis envoie une séance. Ne lève pas : toute erreur devient un échec. */
  private async uploadOne(
    summary: SessionSummary,
    options: RunOptions,
  ): Promise<{ outcome: UploadOutcome; activityId?: number; error?: string }> {
    try {
      const text = readSessionFile(options.source, summary.file);
      const session = readSession(text, options.sportOverrides);
      if (session === undefined) return { outcome: 'failed', error: 'séance illisible' };
      if (!session.usable) {
        return {
          outcome: 'failed',
          error: 'aucune donnée exploitable (ni GPS, ni FC, ni distance)',
        };
      }

      const sport = resolveSport(summary.sportId, options.sportOverrides);
      // FIT par défaut : il porte le sport, donc la requête de correction
      // (`PUT /activities/{id}`) devient inutile — une requête de moins par séance
      // sur un quota qui est la ressource rare.
      const useFit = options.format !== 'tcx';
      const result = await uploadActivity(
        {
          content: useFit ? buildFit(session) : buildTcx(session),
          format: useFit ? 'fit' : 'tcx',
          fileName: `${summary.file.replace(/\.json$/, '')}.${useFit ? 'fit' : 'tcx'}`,
          // L'`external_id` permet à Strava de reconnaître un doublon et nous
          // laisse une trace du fichier d'origine sur chaque activité.
          externalId: summary.file,
          ...(session.name !== undefined ? { name: session.name } : {}),
          description: `Importé depuis Polar Flow (${sport.label})`,
          sportType: sport.stravaSportType,
          trainer: sport.indoor,
          commute: options.commute,
          applySportType: options.applySportType,
        },
        (untilMs) => this.emitEvent({ type: 'waiting', untilMs, reason: 'quota' }),
      );

      if (result.status === 'uploaded')
        return { outcome: 'uploaded', activityId: result.activityId };
      if (result.status === 'duplicate') {
        return {
          outcome: 'duplicate',
          ...(result.activityId !== undefined ? { activityId: result.activityId } : {}),
        };
      }
      return { outcome: 'failed', error: result.error };
    } catch (error) {
      return { outcome: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
  }
}

/** File unique du processus. */
export const queue = new UploadQueue();
