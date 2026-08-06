/**
 * Persistance locale sur disque, dans `DATA_DIR` (`.data/`, ignoré par git).
 *
 * Deux fichiers :
 *  - `token.json` : jeton OAuth Strava (accès + rafraîchissement + expiration) ;
 *  - `progress.json` : ce qui a **déjà** été envoyé.
 *
 * Le second est indispensable, pas cosmétique : les quotas Strava
 * (200 requêtes / 15 min, 2 000 / jour) rendent l'import d'un historique
 * complet impossible en une seule session. La reprise doit donc survivre à un
 * arrêt du serveur, et surtout ne jamais réenvoyer une séance déjà acceptée.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Progress, UploadOutcome, UploadRecord } from '../core/dto';
import { DATA_DIR } from './config';

export type { Progress, UploadOutcome, UploadRecord };

export interface StravaToken {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Expiration en secondes epoch, telle que fournie par Strava. */
  readonly expiresAt: number;
  readonly athlete?: {
    readonly id: number;
    readonly firstname?: string;
    readonly lastname?: string;
  };
}

const TOKEN_FILE = join(DATA_DIR, 'token.json');
const PROGRESS_FILE = join(DATA_DIR, 'progress.json');

function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

/**
 * Écrit un JSON de façon atomique : on écrit un fichier temporaire puis on le
 * renomme. Sans ça, une interruption au mauvais moment laisserait un
 * `progress.json` tronqué — donc un journal d'envois illisible, et le risque de
 * tout réenvoyer.
 */
function writeJsonAtomic(path: string, value: unknown): void {
  ensureDataDir();
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temp, path);
}

export function readToken(): StravaToken | undefined {
  // `clearToken` écrit `null` : on le normalise en `undefined` pour que le type
  // de retour ne mente pas sur ce qu'un appelant peut recevoir.
  return readJson<StravaToken | null>(TOKEN_FILE) ?? undefined;
}

export function writeToken(token: StravaToken): void {
  writeJsonAtomic(TOKEN_FILE, token);
}

export function clearToken(): void {
  writeJsonAtomic(TOKEN_FILE, null);
}

export function readProgress(): Progress {
  return readJson<Progress>(PROGRESS_FILE) ?? {};
}

export function recordUpload(sessionId: string, record: UploadRecord): void {
  const progress = readProgress();
  progress[sessionId] = record;
  writeJsonAtomic(PROGRESS_FILE, progress);
}

/**
 * `true` si la séance a déjà été traitée avec succès. Un échec n'est pas
 * bloquant : on autorise une nouvelle tentative (erreur réseau, quota atteint).
 */
export function isAlreadyDone(sessionId: string, progress: Progress = readProgress()): boolean {
  const record = progress[sessionId];
  return record !== undefined && record.outcome !== 'failed';
}
