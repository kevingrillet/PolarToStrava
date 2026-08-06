/**
 * Étape 2 — désignation et analyse de l'export Polar.
 *
 * Deux façons de désigner l'archive, parce qu'aucune ne suffit seule :
 *
 * - **dépôt / sélection de fichier** : le plus naturel, mais un navigateur ne
 *   divulgue jamais le chemin réel d'un fichier (`C:\fakepath\…`). L'archive est
 *   donc recopiée vers le backend, qui tourne sur la même machine, et c'est le
 *   chemin renvoyé par le serveur qui alimente l'analyse ;
 * - **saisie du chemin** : évite la copie de ~50 Mo, et reste le seul moyen de
 *   désigner un **dossier** déjà décompressé.
 */
import { useId, useRef, useState, type DragEvent } from 'react';
import type { ScanResult } from '../../core/dto';
import { dateRangeOf } from '../../core/filter';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Callout } from './ui/Callout';
import { Input } from './ui/Input';
import { Panel } from './ui/Panel';
import { useI18n } from '../i18n/I18nProvider';
import { cx } from '../lib/cx';
import { formatDate } from '../lib/format';

export interface ExportPickerProps {
  source: string;
  onSourceChange: (value: string) => void;
  scan: ScanResult | undefined;
  scanning: boolean;
  error: string | undefined;
  onScan: () => void;
  /** Recopie l'archive déposée vers le backend ; résout sur le chemin obtenu. */
  onUpload: (file: File) => void;
  uploading: boolean;
}

export function ExportPicker({
  source,
  onSourceChange,
  scan,
  scanning,
  error,
  onScan,
  onUpload,
  uploading,
}: ExportPickerProps) {
  const { t, lang } = useI18n();
  const pathHintId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const withGps = scan?.sessions.filter((s) => s.hasGps).length ?? 0;
  const unusable = scan?.sessions.filter((s) => !s.usable).length ?? 0;
  const range = scan !== undefined ? dateRangeOf(scan.sessions) : undefined;

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) onUpload(file);
  };

  return (
    <Panel title={`2. ${t('steps.load')}`} description={t('load.description')}>
      <div className="flex flex-col gap-4">
        {/* -------------------- procédure côté Polar --------------------- */}
        <details className="rounded-control bg-subtle px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-fg">
            {t('load.howToTitle')}
          </summary>
          <ol className="mt-2 flex list-inside list-decimal flex-col gap-1 text-sm text-fg-muted">
            <li>
              {t('load.howTo1')}{' '}
              <a
                href="https://account.polar.com"
                target="_blank"
                rel="noreferrer"
                className="text-accent-strong underline"
              >
                account.polar.com
              </a>
            </li>
            <li>{t('load.howTo2')}</li>
            <li>{t('load.howTo3')}</li>
            <li>{t('load.howTo4')}</li>
          </ol>
        </details>

        {/* ------------------------ zone de dépôt ------------------------ */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cx(
            'flex flex-col items-center gap-2 rounded-card border border-dashed px-4 py-6 text-center transition',
            dragging ? 'border-accent-strong bg-accent-soft' : 'bg-surface',
          )}
        >
          <p className="text-sm text-fg">{t('load.drop')}</p>
          {/* Un input caché piloté par un bouton : l'input natif n'est pas
              thématisable. Il porte quand même un nom accessible — un champ de
              formulaire sans étiquette est une violation critique — et sort du
              parcours de tabulation, le bouton visible étant le vrai contrôle. */}
          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip"
            aria-label={t('load.chooseFile')}
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) onUpload(file);
              // Permet de re-sélectionner le même fichier après une erreur.
              event.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? t('load.uploading') : t('load.browse')}
          </Button>
          <p className="text-xs text-fg-muted">{t('load.dropHint')}</p>
        </div>

        {/* ------------------------ chemin + analyse --------------------- */}
        {/* Le texte d'aide est placé SOUS la rangée, et non dans le champ : à
            l'intérieur, il s'intercalerait sous l'input et `items-end` alignerait
            le bouton sur le bas de l'aide — soit 20 px trop bas. Le lien
            d'accessibilité est préservé via `aria-describedby`. */}
        <form
          className="flex flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            onScan();
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grow">
              <Input
                label={t('load.pathLabel')}
                aria-describedby={pathHintId}
                value={source}
                spellCheck={false}
                // Attribut JSX : chaîne littérale, pas d'échappement — un `\\`
                // s'afficherait tel quel.
                placeholder="C:\Users\moi\Downloads\polar-user-data-export.zip"
                onChange={(event) => onSourceChange(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={scanning || uploading || source.trim() === ''}>
              {scanning ? t('load.scanning') : t('load.scan')}
            </Button>
          </div>
          <p id={pathHintId} className="text-xs text-fg-muted">
            {t('load.pathHint')}
          </p>
        </form>

        {error !== undefined && (
          <Callout tone="danger" badge={t('load.error')}>
            {error}
          </Callout>
        )}

        {scan !== undefined && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">
                {scan.sessionCount} {t('load.found')}
              </Badge>
              {range !== undefined && (
                <Badge>
                  {t('load.range')} : {formatDate(range.from, lang)} → {formatDate(range.to, lang)}
                </Badge>
              )}
              <Badge>
                {withGps} {t('load.withGps')}
              </Badge>
              {unusable > 0 && (
                <Badge variant="warning">
                  {unusable} {t('load.unusable')}
                </Badge>
              )}
              {scan.errors.length > 0 && (
                <Badge variant="danger">
                  {scan.errors.length} {t('load.unreadable')}
                </Badge>
              )}
            </div>

            {unusable > 0 && <Callout tone="info">{t('load.unusableHelp')}</Callout>}

            {scan.errors.length > 0 && (
              <ul className="list-inside list-disc text-xs text-fg-muted">
                {scan.errors.slice(0, 5).map((entry) => (
                  <li key={entry.file}>
                    <code>{entry.file}</code> — {entry.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
