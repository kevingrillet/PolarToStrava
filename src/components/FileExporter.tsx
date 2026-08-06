/**
 * Étape 4, variante « fichiers » — la voie sans abonnement Strava.
 *
 * Depuis juin 2026, l'accès API exige un abonnement, alors que l'import manuel de
 * fichiers reste gratuit. On écrit donc les séances converties dans des lots de la
 * taille acceptée par la page d'upload de Strava, et l'envoi se fait par
 * glisser-déposer.
 *
 * Le format par défaut est le FIT : contrairement au TCX, il porte le sport, ce
 * qui est indispensable ici puisqu'il n'y a plus d'API pour corriger le type
 * après coup.
 */
import type { ExportFormat, FileExportResult } from '../../core/dto';
import { BATCH_SIZE_FREE, BATCH_SIZE_SUBSCRIBER } from '../../core/export/batches';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Callout } from './ui/Callout';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { useI18n } from '../i18n/I18nProvider';

export interface FileExportOptions {
  format: ExportFormat;
  batchSize: number;
  outputDir: string;
}

export interface FileExporterProps {
  sessionCount: number;
  options: FileExportOptions;
  onOptionsChange: (next: FileExportOptions) => void;
  result: FileExportResult | undefined;
  running: boolean;
  error: string | undefined;
  onExport: () => void;
}

export function FileExporter({
  sessionCount,
  options,
  onOptionsChange,
  result,
  running,
  error,
  onExport,
}: FileExporterProps) {
  const { t } = useI18n();
  const batches = Math.ceil(sessionCount / Math.max(1, options.batchSize));
  const patch = (next: Partial<FileExportOptions>): void =>
    onOptionsChange({ ...options, ...next });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">{t('files.description')}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label={t('files.format')}
          value={options.format}
          onChange={(value) => patch({ format: value as ExportFormat })}
          options={[
            { value: 'fit', label: t('files.formatFit') },
            { value: 'tcx', label: t('files.formatTcx') },
          ]}
        />
        <Select
          label={t('files.batchSize')}
          value={String(options.batchSize)}
          onChange={(value) => patch({ batchSize: Number.parseInt(value, 10) })}
          options={[
            { value: String(BATCH_SIZE_FREE), label: t('files.batchFree') },
            { value: String(BATCH_SIZE_SUBSCRIBER), label: t('files.batchSubscriber') },
          ]}
        />
        <Input
          label={t('files.outputDir')}
          hint={t('files.outputDirHint')}
          value={options.outputDir}
          spellCheck={false}
          placeholder=".data/export"
          onChange={(event) => patch({ outputDir: event.target.value })}
        />
      </div>

      {options.format === 'tcx' && <Callout tone="warning">{t('files.tcxWarning')}</Callout>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onExport} disabled={running || sessionCount === 0}>
          {running ? t('files.exporting') : t('files.export')}
        </Button>
        {sessionCount > 0 && (
          <span className="text-sm text-fg-muted">
            {sessionCount} {t('files.sessionsIn')} {batches} {t('files.batches')}
          </span>
        )}
      </div>

      {error !== undefined && <Callout tone="danger">{error}</Callout>}

      {result !== undefined && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              {result.written} {t('files.written')}
            </Badge>
            <Badge>{(result.totalBytes / 1024 / 1024).toFixed(1)} Mo</Badge>
            <Badge>{result.format.toUpperCase()}</Badge>
            {result.purged > 0 && (
              <Badge variant="warning">
                {result.purged} {t('files.purged')}
              </Badge>
            )}
            {result.errors.length > 0 && (
              <Badge variant="danger">
                {result.errors.length} {t('files.failed')}
              </Badge>
            )}
          </div>

          <Callout tone="success">{t('files.done')}</Callout>

          <div className="rounded-control bg-subtle px-3 py-2">
            <p className="text-xs text-fg-muted">{t('files.outputAt')}</p>
            <code className="text-sm break-all text-fg">{result.outputDir}</code>
          </div>

          <ol className="flex flex-col gap-1 text-sm text-fg">
            <li>
              1. {t('files.step1')}{' '}
              <a
                href="https://www.strava.com/upload/select"
                target="_blank"
                rel="noreferrer"
                className="text-accent-strong underline"
              >
                strava.com/upload/select
              </a>
            </li>
            <li>2. {t('files.step2')}</li>
            <li>3. {t('files.step3')}</li>
          </ol>

          <details className="text-sm">
            <summary className="cursor-pointer text-fg-muted">
              {t('files.batchList')} ({result.batches.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {result.batches.map((batch) => (
                <li key={batch.folder} className="flex items-center gap-2">
                  <code className="text-fg">{batch.folder}</code>
                  <span className="text-fg-muted">
                    {batch.files.length} {t('files.filesShort')}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          {result.errors.length > 0 && (
            <ul className="list-inside list-disc text-xs text-danger">
              {result.errors.slice(0, 5).map((entry) => (
                <li key={entry.file}>
                  <code>{entry.file}</code> — {entry.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
