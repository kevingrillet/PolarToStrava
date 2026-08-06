/**
 * Étape 1 — connexion à Strava.
 *
 * La connexion se fait par navigation complète vers `/api/auth/login` (et non par
 * `fetch`) : OAuth2 exige que l'utilisateur voie l'écran d'autorisation de
 * Strava. Le backend renvoie ensuite vers l'interface avec un paramètre `auth`
 * décrivant l'issue, que l'on traduit ici.
 */
import type { AuthStatus, ServerConfig } from '../../core/dto';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Callout } from './ui/Callout';
import { Panel } from './ui/Panel';
import { useI18n } from '../i18n/I18nProvider';

/** Issues possibles du retour d'authentification, telles que le backend les nomme. */
const AUTH_FEEDBACK: Record<string, { key: string; tone: 'success' | 'warning' | 'danger' }> = {
  ok: { key: 'auth.connectedAs', tone: 'success' },
  denied: { key: 'auth.denied', tone: 'warning' },
  'invalid-state': { key: 'auth.invalidState', tone: 'danger' },
  'missing-scope': { key: 'auth.missingScope', tone: 'danger' },
  failed: { key: 'auth.failed', tone: 'danger' },
};

export interface StravaConnectionProps {
  status: AuthStatus | undefined;
  config: ServerConfig | undefined;
  /** Paramètre `auth` présent dans l'URL au retour d'OAuth. */
  feedback: string | undefined;
  backendDown: boolean;
  /** `true` quand la voie d'envoi retenue ne passe pas par l'API. */
  optional: boolean;
  onLogout: () => void;
}

export function StravaConnection({
  status,
  config,
  feedback,
  backendDown,
  optional,
  onLogout,
}: StravaConnectionProps) {
  const { t } = useI18n();
  const connected = status?.connected === true;
  const notice = feedback !== undefined && feedback !== 'ok' ? AUTH_FEEDBACK[feedback] : undefined;

  return (
    <Panel
      title={`1. ${t('steps.connect')}`}
      description={t('auth.description')}
      actions={
        connected ? (
          <Badge variant="success">{status?.athlete?.name ?? t('auth.connectedAs')}</Badge>
        ) : optional ? (
          <Badge>{t('auth.optionalBadge')}</Badge>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {backendDown && <Callout tone="danger">{t('auth.backendDown')}</Callout>}

        {/* Sans cette précision, l'utilisateur croit devoir s'abonner pour
            commencer, alors que la voie gratuite ne demande rien ici. */}
        {optional && !connected && <Callout tone="info">{t('auth.optional')}</Callout>}

        {notice !== undefined && <Callout tone={notice.tone}>{t(notice.key)}</Callout>}

        {!backendDown && config?.stravaConfigured === false && (
          <Callout tone="warning" badge={t('auth.notConfigured')}>
            {t('auth.notConfiguredHelp')}
          </Callout>
        )}

        {/* Un jeton présent mais refusé par Strava (révoqué, portées changées) :
            on affiche la raison plutôt qu'un simple « non connecté ». */}
        {!connected && status?.error !== undefined && (
          <Callout tone="warning">{status.error}</Callout>
        )}

        <div className="flex items-center gap-3">
          {connected ? (
            // Le nom figure déjà dans le badge d'en-tête : ne pas le répéter ici.
            <Button variant="secondary" onClick={onLogout}>
              {t('auth.disconnect')}
            </Button>
          ) : (
            <>
              <span className="text-sm text-fg-muted">{t('auth.notConnected')}</span>
              {/* Lien et non bouton : c'est une navigation, pas une action locale. */}
              <a
                href="/api/auth/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg shadow-btn transition hover:bg-accent-hover aria-disabled:pointer-events-none aria-disabled:opacity-50"
                aria-disabled={config?.stravaConfigured === false || backendDown}
              >
                {t('auth.connect')}
              </a>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
