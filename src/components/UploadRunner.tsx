/**
 * Étape 4 — envoi vers Strava, avec suivi en direct.
 *
 * L'affichage des quotas n'est pas décoratif : un import complet dépasse
 * forcément la limite journalière de Strava, donc l'outil **va** s'arrêter en
 * attente. Sans l'expliquer à l'écran, ce comportement normal passerait pour un
 * blocage. D'où le compte à rebours, l'estimation du nombre de requêtes, et le
 * rappel que la reprise est automatique.
 */
import { useEffect, useState } from 'react';
import type { QuotaState, RunEvent, RunState, SessionSummary } from '../../core/dto';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Callout } from './ui/Callout';
import { Checkbox } from './ui/Checkbox';
import { useI18n } from '../i18n/I18nProvider';
import { formatCountdown } from '../lib/format';

/** Requêtes consommées par séance : 1 envoi + ~2 sondages (+ 1 correction de sport). */
const REQUESTS_PER_SESSION = 3;

export interface UploadOptions {
  applySportType: boolean;
  commute: boolean;
  redoDone: boolean;
}

export interface UploadRunnerProps {
  sessions: readonly SessionSummary[];
  options: UploadOptions;
  onOptionsChange: (next: UploadOptions) => void;
  state: RunState;
  quota: QuotaState | undefined;
  /** Dernières lignes de journal, la plus récente en tête. */
  log: readonly RunEvent[];
  waitingUntil: number | undefined;
  finished: Extract<RunEvent, { type: 'done' }> | undefined;
  disabled: boolean;
  error: string | undefined;
  onStart: () => void;
  onStop: () => void;
}

export function UploadRunner({
  sessions,
  options,
  onOptionsChange,
  state,
  quota,
  log,
  waitingUntil,
  finished,
  disabled,
  error,
  onStart,
  onStop,
}: UploadRunnerProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  // L'horloge ne tourne que pendant une attente de quota : inutile de réveiller
  // React chaque seconde le reste du temps.
  useEffect(() => {
    if (waitingUntil === undefined || waitingUntil <= now) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitingUntil, now]);

  const perSession = REQUESTS_PER_SESSION + (options.applySportType ? 1 : 0);
  const estimatedRequests = sessions.length * perSession;
  const estimatedDays = quota !== undefined ? estimatedRequests / quota.dailyLimit : 0;

  const patch = (next: Partial<UploadOptions>): void => onOptionsChange({ ...options, ...next });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">{t('send.description')}</p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Checkbox
            label={t('send.applySportType')}
            checked={options.applySportType}
            onChange={(checked) => patch({ applySportType: checked })}
          />
          <p className="pl-6 text-xs text-fg-muted">{t('send.applySportTypeHint')}</p>
          <Checkbox
            label={t('send.commute')}
            checked={options.commute}
            onChange={(checked) => patch({ commute: checked })}
          />
          <Checkbox
            label={t('send.redoDone')}
            checked={options.redoDone}
            onChange={(checked) => patch({ redoDone: checked })}
          />
        </div>

        {/* ----------------------- estimation ----------------------------- */}
        {sessions.length > 0 && (
          <div className="flex flex-col gap-1 rounded-control bg-subtle px-3 py-2">
            <p className="text-sm text-fg">
              {t('send.estimate')} : <strong>{sessions.length}</strong> × {perSession} ={' '}
              <strong>{estimatedRequests}</strong> requêtes
              {estimatedDays > 1 && <> — ≥ {Math.ceil(estimatedDays)} j</>}
            </p>
            <p className="text-xs text-fg-muted">{t('send.estimateHelp')}</p>
          </div>
        )}

        {/* ------------------------ commandes ----------------------------- */}
        <div className="flex flex-wrap items-center gap-3">
          {state.running ? (
            <Button variant="danger" onClick={onStop}>
              {t('send.stop')}
            </Button>
          ) : (
            <Button onClick={onStart} disabled={disabled || sessions.length === 0}>
              {t('send.start')}
            </Button>
          )}

          {state.running && (
            <span className="text-sm text-fg-muted" role="status">
              {t('send.running')} {state.index} / {state.total}
            </span>
          )}

          {quota !== undefined && (
            <span className="text-xs text-fg-muted tabular-nums">
              {t('send.quota')} : {quota.shortUsage}/{quota.shortLimit} {t('send.quotaShort')} ·{' '}
              {quota.dailyUsage}/{quota.dailyLimit} {t('send.quotaDaily')}
            </span>
          )}
        </div>

        {error !== undefined && <Callout tone="danger">{error}</Callout>}

        {waitingUntil !== undefined && waitingUntil > now && (
          <Callout tone="warning" role="status">
            {t('send.waiting')} {formatCountdown(waitingUntil, now)}
          </Callout>
        )}

        {/* ------------------------- compteurs ---------------------------- */}
        {(state.running || finished !== undefined) && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">
              {state.uploaded} {t('send.uploaded')}
            </Badge>
            <Badge>
              {state.duplicates} {t('send.duplicates')}
            </Badge>
            {state.skipped > 0 && (
              <Badge>
                {state.skipped} {t('send.skipped')}
              </Badge>
            )}
            {state.failed > 0 && (
              <Badge variant="danger">
                {state.failed} {t('send.failed')}
              </Badge>
            )}
          </div>
        )}

        {finished !== undefined && (
          <Callout tone={finished.stopped ? 'warning' : 'success'}>
            {finished.stopped ? t('send.stoppedTitle') : t('send.doneTitle')} — {finished.uploaded}{' '}
            {t('send.uploaded')}, {finished.duplicates} {t('send.duplicates')}, {finished.failed}{' '}
            {t('send.failed')}. {t('send.resumeHint')}
          </Callout>
        )}

        {/* -------------------------- journal ----------------------------- */}
        {log.length > 0 && (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-xs">
            {log.map((event, index) =>
              event.type === 'session' ? (
                <li
                  key={`${event.sessionId}-${event.state}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-control bg-subtle px-2 py-1"
                >
                  <span className="tabular-nums text-fg-muted">
                    {event.index}/{event.total}
                  </span>
                  <span
                    className={
                      event.state === 'failed'
                        ? 'text-danger'
                        : event.state === 'uploaded'
                          ? 'text-success'
                          : 'text-fg-muted'
                    }
                  >
                    {t(`send.states.${event.state}`)}
                  </span>
                  <code className="truncate text-fg-muted">{event.file}</code>
                  {event.activityId !== undefined && (
                    <a
                      href={`https://www.strava.com/activities/${event.activityId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-strong underline"
                    >
                      #{event.activityId}
                    </a>
                  )}
                  {event.error !== undefined && <span className="text-danger">{event.error}</span>}
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
