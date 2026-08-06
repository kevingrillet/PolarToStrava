/**
 * Client de l'API Strava : OAuth2, envoi d'activités, et surtout respect des
 * quotas.
 *
 * ## Quotas, et pourquoi ils dictent l'architecture
 *
 * Strava limite à **200 requêtes par tranche de 15 minutes** et **2 000 par
 * jour** (valeurs par défaut d'une application ; elles sont annoncées dans les
 * en-têtes `X-RateLimit-Limit` / `X-RateLimit-Usage` de chaque réponse). Or un
 * envoi coûte 1 requête, plus 1 à 4 sondages d'état, plus éventuellement 1 mise
 * à jour du type de sport : compter ~3 à 4 requêtes par séance. Un historique de
 * 700 séances demande donc plus de 2 000 requêtes, soit **au moins deux jours**.
 *
 * Conséquences, assumées dans le code :
 *  - on lit les en-têtes de quota à chaque réponse et on attend le basculement
 *    de fenêtre au lieu de se faire refuser ;
 *  - les fenêtres de 15 minutes de Strava sont alignées sur l'horloge (:00, :15,
 *    :30, :45) et le quota journalier sur minuit UTC ; l'attente est calculée
 *    sur ces bornes et non sur un délai arbitraire ;
 *  - la progression est journalisée sur disque (`server/store.ts`) pour que
 *    l'import reprenne où il s'est arrêté.
 *
 * ## Type de sport
 *
 * Le TCX ne sait exprimer que `Running`, `Biking` ou `Other` : Strava en déduit
 * `Run`, `Ride` ou `Workout`. Pour obtenir « Randonnée », « Marche », « Natation »
 * ou « Musculation », il faut corriger l'activité **après** l'envoi via
 * `PUT /activities/{id}`. C'est une requête de plus par séance, donc optionnelle.
 */
import { gzipSync } from 'node:zlib';
import { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI } from './config';
import { readToken, writeToken, type StravaToken } from './store';
import type { StravaSportType } from '../core/polar/sports';

const API = 'https://www.strava.com/api/v3';
const OAUTH = 'https://www.strava.com/oauth';

/**
 * Portées demandées. `activity:write` est indispensable pour envoyer,
 * `activity:read_all` pour relire les activités privées créées.
 */
const SCOPES = ['read', 'activity:read_all', 'activity:write'] as const;

/** Marge de sécurité sur le quota : on n'utilise pas les toutes dernières unités. */
const RATE_LIMIT_MARGIN = 3;

// ---------------------------------------------------------------------------
// Suivi des quotas
// ---------------------------------------------------------------------------

export interface RateLimitState {
  /** Quota par tranche de 15 min et par jour. */
  readonly shortLimit: number;
  readonly dailyLimit: number;
  readonly shortUsage: number;
  readonly dailyUsage: number;
  /** Instant (ms epoch) où l'attente en cours se termine, si l'on est bloqué. */
  readonly blockedUntil?: number;
}

let rateLimit: RateLimitState = {
  shortLimit: 200,
  dailyLimit: 2000,
  shortUsage: 0,
  dailyUsage: 0,
};

export function getRateLimit(): RateLimitState {
  return rateLimit;
}

/** Début de la prochaine tranche de 15 minutes alignée sur l'horloge. */
function nextShortWindow(now = Date.now()): number {
  const quarter = 15 * 60_000;
  return Math.ceil((now + 1) / quarter) * quarter;
}

/** Prochain minuit UTC, borne de remise à zéro du quota journalier. */
function nextDailyWindow(now = Date.now()): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function parseLimitPair(header: string | null): [number, number] | undefined {
  if (header === null) return undefined;
  const [short, daily] = header.split(',').map((v) => Number.parseInt(v.trim(), 10));
  if (Number.isNaN(short) || Number.isNaN(daily)) return undefined;
  return [short, daily];
}

function absorbRateLimitHeaders(response: Response): void {
  const limits = parseLimitPair(response.headers.get('x-ratelimit-limit'));
  const usage = parseLimitPair(response.headers.get('x-ratelimit-usage'));
  rateLimit = {
    shortLimit: limits?.[0] ?? rateLimit.shortLimit,
    dailyLimit: limits?.[1] ?? rateLimit.dailyLimit,
    shortUsage: usage?.[0] ?? rateLimit.shortUsage,
    dailyUsage: usage?.[1] ?? rateLimit.dailyUsage,
  };
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/**
 * Attend, si nécessaire, que le quota se libère.
 *
 * Renvoie la durée effectivement attendue, pour que l'interface puisse
 * l'afficher — une attente de 15 minutes sans explication passerait pour un
 * blocage.
 */
export async function awaitQuota(onWait?: (untilMs: number) => void): Promise<number> {
  const now = Date.now();
  let until = 0;

  if (rateLimit.dailyUsage >= rateLimit.dailyLimit - RATE_LIMIT_MARGIN) {
    until = nextDailyWindow(now);
  } else if (rateLimit.shortUsage >= rateLimit.shortLimit - RATE_LIMIT_MARGIN) {
    until = nextShortWindow(now);
  }

  if (until <= now) return 0;

  rateLimit = { ...rateLimit, blockedUntil: until };
  onWait?.(until);
  await sleep(until - now);
  // Nouvelle fenêtre : Strava remettra les compteurs à jour à la prochaine
  // réponse, on repart d'une hypothèse optimiste en attendant.
  rateLimit = { ...rateLimit, shortUsage: 0, blockedUntil: undefined };
  return until - now;
}

// ---------------------------------------------------------------------------
// OAuth2
// ---------------------------------------------------------------------------

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPES.join(','),
    state,
  });
  return `${OAUTH}/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

async function requestToken(body: Record<string, string>): Promise<StravaToken> {
  const response = await fetch(`${OAUTH}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `échange de jeton refusé par Strava (${response.status}) : ${await response.text()}`,
    );
  }
  const data = (await response.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    ...(data.athlete !== undefined
      ? {
          athlete: {
            id: data.athlete.id,
            ...(data.athlete.firstname !== undefined ? { firstname: data.athlete.firstname } : {}),
            ...(data.athlete.lastname !== undefined ? { lastname: data.athlete.lastname } : {}),
          },
        }
      : {}),
  };
}

export async function exchangeCode(code: string): Promise<StravaToken> {
  const token = await requestToken({ code, grant_type: 'authorization_code' });
  writeToken(token);
  return token;
}

/**
 * Renvoie un jeton valide, en le rafraîchissant si besoin. On anticipe de cinq
 * minutes : un import long peut franchir l'expiration en cours de route.
 */
export async function validToken(): Promise<StravaToken> {
  const current = readToken();
  if (current === undefined) throw new Error('non connecté à Strava');

  const expiresInSeconds = current.expiresAt - Math.floor(Date.now() / 1000);
  if (expiresInSeconds > 300) return current;

  const refreshed = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: current.refreshToken,
  });
  // Strava ne renvoie pas l'athlète lors d'un rafraîchissement : on le conserve.
  const merged: StravaToken = {
    ...refreshed,
    ...(refreshed.athlete === undefined && current.athlete !== undefined
      ? { athlete: current.athlete }
      : {}),
  };
  writeToken(merged);
  return merged;
}

// ---------------------------------------------------------------------------
// Envoi d'activités
// ---------------------------------------------------------------------------

export interface UploadRequest {
  /** Contenu du fichier : FIT (binaire) ou TCX (XML). */
  readonly content: Uint8Array | string;
  readonly format: 'fit' | 'tcx';
  readonly fileName: string;
  readonly externalId: string;
  readonly name?: string;
  readonly description?: string;
  readonly sportType: StravaSportType;
  readonly trainer?: boolean;
  readonly commute?: boolean;
  /** Corriger le type de sport après l'envoi (1 requête de plus). */
  readonly applySportType?: boolean;
}

export type UploadResult =
  | { readonly status: 'uploaded'; readonly activityId: number }
  | { readonly status: 'duplicate'; readonly activityId?: number }
  | { readonly status: 'failed'; readonly error: string };

interface UploadStatus {
  id: number;
  external_id: string | null;
  error: string | null;
  status: string;
  activity_id: number | null;
}

/** Délais de sondage, en ms. Strava traite un TCX en quelques secondes. */
const POLL_DELAYS = [3_000, 5_000, 10_000, 20_000] as const;

async function authedFetch(
  token: StravaToken,
  path: string,
  init: RequestInit,
  onWait?: (untilMs: number) => void,
): Promise<Response> {
  await awaitQuota(onWait);
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token.accessToken}` },
  });
  absorbRateLimitHeaders(response);

  // 429 : quota dépassé malgré nos précautions (autre client, ou compteurs
  // désynchronisés). On force l'attente de la prochaine fenêtre puis on retente.
  if (response.status === 429) {
    rateLimit = { ...rateLimit, shortUsage: rateLimit.shortLimit };
    await awaitQuota(onWait);
    const retry = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token.accessToken}` },
    });
    absorbRateLimitHeaders(retry);
    return retry;
  }
  return response;
}

/** Repère le message de doublon que renvoie Strava pour une activité déjà connue. */
function duplicateActivityId(error: string): number | undefined {
  const match = /duplicate of (?:activity )?(\d+)/i.exec(error);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

/**
 * Envoie une séance et attend le verdict de Strava.
 *
 * L'envoi est asynchrone côté Strava : la requête initiale ne renvoie qu'un
 * identifiant d'upload qu'il faut sonder. Un doublon n'est **pas** une erreur —
 * c'est le cas normal quand la séance était déjà dans Strava (synchronisation
 * Polar active) — et il est rapporté comme tel pour ne pas être retenté.
 */
export async function uploadActivity(
  request: UploadRequest,
  onWait?: (untilMs: number) => void,
): Promise<UploadResult> {
  const token = await validToken();

  // Strava accepte les variantes compressées (`fit.gz`, `tcx.gz`). Ce n'est pas
  // cosmétique : une sortie de 6 h à 1 Hz produit un TCX de ~15 Mo, et le FIT
  // comme le XML se compriment très bien. Cela réduit d'autant le temps d'envoi
  // et le risque de buter sur la taille maximale acceptée.
  const raw =
    typeof request.content === 'string'
      ? Buffer.from(request.content, 'utf8')
      : Buffer.from(request.content);
  const compressed = gzipSync(raw);
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(compressed)], { type: 'application/gzip' }),
    `${request.fileName}.gz`,
  );
  form.append('data_type', `${request.format}.gz`);
  form.append('external_id', request.externalId);
  if (request.name !== undefined) form.append('name', request.name);
  if (request.description !== undefined) form.append('description', request.description);
  if (request.trainer === true) form.append('trainer', '1');
  if (request.commute === true) form.append('commute', '1');

  const created = await authedFetch(token, '/uploads', { method: 'POST', body: form }, onWait);
  if (!created.ok) {
    return { status: 'failed', error: `POST /uploads → ${created.status} ${await created.text()}` };
  }

  let upload = (await created.json()) as UploadStatus;
  if (upload.error !== null && upload.error !== '') {
    const duplicate = duplicateActivityId(upload.error);
    if (duplicate !== undefined) return { status: 'duplicate', activityId: duplicate };
    return { status: 'failed', error: upload.error };
  }

  for (const delay of POLL_DELAYS) {
    if (upload.activity_id !== null) break;
    await sleep(delay);
    const polled = await authedFetch(token, `/uploads/${upload.id}`, { method: 'GET' }, onWait);
    if (!polled.ok) {
      return { status: 'failed', error: `GET /uploads → ${polled.status} ${await polled.text()}` };
    }
    upload = (await polled.json()) as UploadStatus;
    if (upload.error !== null && upload.error !== '') {
      const duplicate = duplicateActivityId(upload.error);
      if (duplicate !== undefined) return { status: 'duplicate', activityId: duplicate };
      return { status: 'failed', error: upload.error };
    }
  }

  if (upload.activity_id === null) {
    return {
      status: 'failed',
      error: `Strava n'a pas fini de traiter l'envoi (état « ${upload.status} ») — à retenter`,
    };
  }

  if (request.applySportType === true) {
    await applySportType(upload.activity_id, request.sportType, onWait);
  }
  return { status: 'uploaded', activityId: upload.activity_id };
}

/**
 * Corrige le type de sport d'une activité déjà créée.
 *
 * Un échec ici n'invalide pas l'envoi : l'activité existe, seul son libellé est
 * imprécis. On ne remonte donc pas d'erreur bloquante.
 */
export async function applySportType(
  activityId: number,
  sportType: StravaSportType,
  onWait?: (untilMs: number) => void,
): Promise<boolean> {
  const token = await validToken();
  const response = await authedFetch(
    token,
    `/activities/${activityId}`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sport_type: sportType }),
    },
    onWait,
  );
  return response.ok;
}

/** Vérifie le jeton et renvoie l'athlète connecté. */
export async function currentAthlete(): Promise<{ id: number; name: string }> {
  const token = await validToken();
  const response = await authedFetch(token, '/athlete', { method: 'GET' });
  if (!response.ok) throw new Error(`GET /athlete → ${response.status}`);
  const data = (await response.json()) as { id: number; firstname?: string; lastname?: string };
  return { id: data.id, name: `${data.firstname ?? ''} ${data.lastname ?? ''}`.trim() };
}
