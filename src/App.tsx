/**
 * Composant racine : l'assistant d'import en quatre étapes.
 *
 * Tout l'état vit ici, dans quelques `useState` — pas de gestionnaire d'état
 * externe : le flux est linéaire (connexion → export → sélection → envoi) et les
 * données ne circulent que vers le bas. La seule subtilité est le flux de
 * progression (SSE), isolé dans `useUploadStream`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthStatus, FileExportResult, Progress, ScanResult, ServerConfig } from '../core/dto';
import { BATCH_SIZE_FREE } from '../core/export/batches';
import { dateRangeOf, filterSessions, type SessionFilter } from '../core/filter';
import type { StravaSportType } from '../core/polar/sports';
import { ExportPicker } from './components/ExportPicker';
import { FileExporter, type FileExportOptions } from './components/FileExporter';
import { Panel } from './components/ui/Panel';
import { Select } from './components/ui/Select';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { SessionSelection } from './components/SessionSelection';
import { StravaConnection } from './components/StravaConnection';
import { ThemeSelector } from './components/ThemeSelector';
import { ThemeToggle } from './components/ThemeToggle';
import { UploadRunner, type UploadOptions } from './components/UploadRunner';
import { useTheme } from './hooks/useTheme';
import { useUploadStream } from './hooks/useUploadStream';
import { I18nProvider, useI18n } from './i18n/I18nProvider';
import { ApiError, api } from './lib/api';

/**
 * Durée minimale par défaut : 20 minutes. Un export réel est dominé par les
 * trajets domicile-travail (dans le corpus de référence, 309 séances de 12 min
 * en moyenne sur 726), qui n'ont aucun intérêt dans un historique Strava.
 */
const DEFAULT_MIN_DURATION_SECONDS = 20 * 60;

const DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
  // Inutile en FIT, qui porte déjà le sport : conservé comme échappatoire.
  applySportType: false,
  commute: false,
  redoDone: false,
};

const DEFAULT_FILE_OPTIONS: FileExportOptions = {
  format: 'fit',
  batchSize: BATCH_SIZE_FREE,
  outputDir: '',
};

/**
 * Voie d'envoi. « fichiers » est le défaut : depuis juin 2026, l'accès API en
 * tier Standard exige un abonnement Strava, alors que l'import manuel de fichiers
 * reste gratuit.
 */
type UploadMode = 'files' | 'api';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function AppContent() {
  const { t } = useI18n();
  const { mode, toggleMode, themeName, setThemeName } = useTheme();

  const [config, setConfig] = useState<ServerConfig>();
  const [auth, setAuth] = useState<AuthStatus>();
  const [backendDown, setBackendDown] = useState(false);

  const [source, setSource] = useState('');
  const [scan, setScan] = useState<ScanResult>();
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanError, setScanError] = useState<string>();

  const [filter, setFilter] = useState<SessionFilter>({
    minDurationSeconds: DEFAULT_MIN_DURATION_SECONDS,
  });
  const [sportOverrides, setSportOverrides] = useState<Record<number, StravaSportType>>({});
  const [progress, setProgress] = useState<Progress>({});

  const [uploadMode, setUploadMode] = useState<UploadMode>('files');
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>(DEFAULT_UPLOAD_OPTIONS);
  const [uploadError, setUploadError] = useState<string>();

  const [fileOptions, setFileOptions] = useState<FileExportOptions>(DEFAULT_FILE_OPTIONS);
  const [fileResult, setFileResult] = useState<FileExportResult>();
  const [fileRunning, setFileRunning] = useState(false);
  const [fileError, setFileError] = useState<string>();

  // Le journal de reprise est relu à la fin de chaque import : il détermine les
  // séances à sauter au passage suivant. On s'abonne à l'événement de fin plutôt
  // que de réagir à un changement d'état, pour ne pas enchaîner deux rendus.
  const refreshProgress = useCallback(async () => {
    try {
      setProgress(await api.progress());
    } catch {
      /* Journal indisponible : on repart d'un journal vide, sans bloquer. */
    }
  }, []);

  const { state, quota, log, waitingUntil, finished, reset } = useUploadStream({
    onFinished: () => void refreshProgress(),
  });

  /** Paramètre `auth` déposé dans l'URL par le retour OAuth du backend. */
  const authFeedback = useMemo(
    () => new URLSearchParams(window.location.search).get('auth') ?? undefined,
    [],
  );

  // Chargement initial : configuration du serveur, état de connexion et journal
  // de reprise en une seule passe. Le drapeau `cancelled` évite d'écrire dans un
  // composant démonté si l'utilisateur quitte pendant les requêtes.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [serverConfig, status, journal] = await Promise.all([
          api.config(),
          api.authStatus(),
          api.progress(),
        ]);
        if (cancelled) return;
        setConfig(serverConfig);
        setAuth(status);
        setProgress(journal);
        setBackendDown(false);
      } catch (error) {
        if (!cancelled) setBackendDown(error instanceof ApiError && error.status === 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(undefined);
    try {
      const result = await api.scan(source);
      setScan(result);
      // On initialise les bornes de dates sur la période réellement couverte :
      // des champs vides n'indiqueraient pas ce qui est disponible.
      const range = dateRangeOf(result.sessions);
      if (range !== undefined) setFilter((current) => ({ ...current, ...range }));
    } catch (error) {
      setScan(undefined);
      setScanError(message(error));
    } finally {
      setScanning(false);
    }
  }, [source]);

  /**
   * Recopie l'archive déposée vers le backend, puis enchaîne sur l'analyse : une
   * fois le fichier choisi, l'utilisateur n'a aucune raison de devoir cliquer une
   * seconde fois.
   */
  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setScanError(undefined);
    try {
      const { source: uploaded } = await api.uploadExport(file);
      setSource(uploaded);
      const result = await api.scan(uploaded);
      setScan(result);
      const range = dateRangeOf(result.sessions);
      if (range !== undefined) setFilter((current) => ({ ...current, ...range }));
    } catch (error) {
      setScan(undefined);
      setScanError(message(error));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setAuth(await api.logout());
    } catch (error) {
      setAuth({ connected: false, error: message(error) });
    }
  }, []);

  const sessions = useMemo(() => scan?.sessions ?? [], [scan]);
  const kept = useMemo(() => filterSessions(sessions, filter).kept, [sessions, filter]);

  const handleStart = useCallback(async () => {
    setUploadError(undefined);
    reset();
    try {
      await api.startUpload({
        source: scan?.source ?? source,
        sessions: kept,
        sportOverrides,
        format: 'fit',
        ...uploadOptions,
      });
    } catch (error) {
      setUploadError(message(error));
    }
  }, [kept, reset, scan, source, sportOverrides, uploadOptions]);

  const handleExportFiles = useCallback(async () => {
    setFileRunning(true);
    setFileError(undefined);
    try {
      setFileResult(
        await api.exportFiles({
          source: scan?.source ?? source,
          sessions: kept,
          sportOverrides,
          ...fileOptions,
        }),
      );
    } catch (error) {
      setFileResult(undefined);
      setFileError(message(error));
    } finally {
      setFileRunning(false);
    }
  }, [fileOptions, kept, scan, source, sportOverrides]);

  const handleStop = useCallback(async () => {
    try {
      await api.stopUpload();
    } catch (error) {
      setUploadError(message(error));
    }
  }, []);

  return (
    <div className="min-h-full bg-canvas font-base text-fg">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a
          href="#main"
          className="sr-only rounded-control bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          {t('a11y.skipToContent')}
        </a>

        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('app.title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{t('header.subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSelector value={themeName} onChange={setThemeName} />
            <LanguageSwitcher />
            <ThemeToggle theme={mode} onToggle={toggleMode} />
          </div>
        </header>

        <main id="main" className="flex flex-col gap-6">
          <StravaConnection
            status={auth}
            config={config}
            feedback={authFeedback}
            backendDown={backendDown}
            optional={uploadMode === 'files'}
            onLogout={() => void handleLogout()}
          />

          <ExportPicker
            source={source}
            onSourceChange={setSource}
            scan={scan}
            scanning={scanning}
            error={scanError}
            onScan={() => void handleScan()}
            onUpload={(file) => void handleUpload(file)}
            uploading={uploading}
          />

          {scan !== undefined && (
            <SessionSelection
              sessions={scan.sessions}
              filter={filter}
              onFilterChange={setFilter}
              sportOverrides={sportOverrides}
              onSportOverride={(sportId, sportType) =>
                setSportOverrides((current) => ({ ...current, [sportId]: sportType }))
              }
              progress={progress}
            />
          )}

          {scan !== undefined && (
            <Panel
              title={`4. ${t('steps.send')}`}
              actions={
                <Select
                  aria-label={t('mode.label')}
                  value={uploadMode}
                  onChange={(value) => setUploadMode(value as UploadMode)}
                  options={[
                    { value: 'files', label: t('mode.files') },
                    { value: 'api', label: t('mode.api') },
                  ]}
                />
              }
              description={uploadMode === 'files' ? t('mode.filesHint') : t('mode.apiHint')}
            >
              {uploadMode === 'files' ? (
                <FileExporter
                  sessionCount={kept.length}
                  options={fileOptions}
                  onOptionsChange={setFileOptions}
                  result={fileResult}
                  running={fileRunning}
                  error={fileError}
                  onExport={() => void handleExportFiles()}
                />
              ) : (
                <UploadRunner
                  sessions={kept}
                  options={uploadOptions}
                  onOptionsChange={setUploadOptions}
                  state={state}
                  quota={quota}
                  log={log}
                  waitingUntil={waitingUntil}
                  finished={finished}
                  disabled={auth?.connected !== true}
                  error={uploadError}
                  onStart={() => void handleStart()}
                  onStop={() => void handleStop()}
                />
              )}
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
