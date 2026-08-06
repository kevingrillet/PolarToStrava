/**
 * Backend de PolarToStrava.
 *
 * Il n'existe que pour trois raisons, toutes rédhibitoires côté navigateur :
 *  - l'échange du code OAuth Strava contre un jeton exige le `client_secret` ;
 *  - l'API Strava n'autorise pas l'upload depuis une origine web (CORS) ;
 *  - lire une archive de 50 Mo et écrire un journal de reprise demande un accès
 *    au système de fichiers.
 *
 * Il écoute sur `127.0.0.1` uniquement : c'est un outil personnel, il n'a aucune
 * raison d'être joignable depuis le réseau.
 */
import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import Fastify from 'fastify';
import { API_PORT, DATA_DIR, WEB_ORIGIN, isStravaConfigured, STRAVA_REDIRECT_URI } from './config';
import { exportFiles } from './fileExport';
import { scanExport, type SessionSummary } from './polarExport';
import { queue, type RunEvent } from './queue';
import { clearToken, readProgress, readToken } from './store';
import { authorizeUrl, currentAthlete, exchangeCode, getRateLimit } from './strava';
import { BATCH_SIZE_FREE } from '../core/export/batches';
import type { ExportFilesBody, ExportFormat } from '../core/dto';
import type { StravaSportType } from '../core/polar/sports';

const app = Fastify({ logger: { transport: undefined, level: 'warn' } });

/** État aléatoire de la requête OAuth en cours, pour se prémunir du CSRF. */
let pendingOAuthState: string | undefined;

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------

/**
 * Réception de l'archive déposée dans l'interface.
 *
 * Un navigateur ne divulgue **jamais** le chemin réel d'un fichier choisi
 * (`C:\fakepath\…`) : un sélecteur ne peut donc pas renseigner le champ « chemin
 * de l'export ». On recopie donc l'archive vers le backend — qui tourne sur la
 * même machine, ce qui rend l'opération quasi instantanée — et on renvoie le
 * chemin local obtenu.
 *
 * Le corps est traité en **flux** plutôt que mis en tampon : une archive réelle
 * pèse ~50 Mo, et la limite de corps par défaut de Fastify est de 1 Mo.
 */
app.addContentTypeParser(
  ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  (_request, payload, done) => {
    done(null, payload);
  },
);

app.get('/api/health', () => ({ ok: true }));

app.get('/api/config', () => ({
  stravaConfigured: isStravaConfigured(),
  redirectUri: STRAVA_REDIRECT_URI,
}));

// ---------------------------------------------------------------------------
// Authentification Strava
// ---------------------------------------------------------------------------

app.get('/api/auth/status', async () => {
  const token = readToken();
  if (token === undefined) return { connected: false };
  try {
    const athlete = await currentAthlete();
    return { connected: true, athlete, expiresAt: token.expiresAt };
  } catch (error) {
    // Jeton présent mais refusé (révoqué côté Strava, portées insuffisantes…).
    return { connected: false, error: error instanceof Error ? error.message : String(error) };
  }
});

app.get('/api/auth/login', (_request, reply) => {
  if (!isStravaConfigured()) {
    return reply
      .code(400)
      .send({ error: 'STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET manquants (voir .env)' });
  }
  pendingOAuthState = randomUUID();
  return reply.redirect(authorizeUrl(pendingOAuthState));
});

app.get<{ Querystring: { code?: string; state?: string; error?: string; scope?: string } }>(
  '/api/auth/callback',
  async (request, reply) => {
    const { code, state, error, scope } = request.query;

    if (error !== undefined) {
      return reply.redirect(`${WEB_ORIGIN}/?auth=denied`);
    }
    if (code === undefined || state === undefined || state !== pendingOAuthState) {
      return reply.redirect(`${WEB_ORIGIN}/?auth=invalid-state`);
    }
    pendingOAuthState = undefined;

    // Sans `activity:write`, l'utilisateur a décoché la permission d'écriture :
    // l'import échouerait à la première séance, autant le dire tout de suite.
    if (scope !== undefined && !scope.includes('activity:write')) {
      return reply.redirect(`${WEB_ORIGIN}/?auth=missing-scope`);
    }

    try {
      await exchangeCode(code);
      return reply.redirect(`${WEB_ORIGIN}/?auth=ok`);
    } catch {
      return reply.redirect(`${WEB_ORIGIN}/?auth=failed`);
    }
  },
);

app.post('/api/auth/logout', () => {
  clearToken();
  return { connected: false };
});

// ---------------------------------------------------------------------------
// Export Polar
// ---------------------------------------------------------------------------

app.post<{ Querystring: { name?: string } }>('/api/export/upload', async (request, reply) => {
  // On n'utilise que le nom de base fourni par le navigateur, et on le
  // désinfecte : accepter un chemin permettrait d'écrire n'importe où.
  const raw = request.query.name ?? 'polar-export.zip';
  const safe = basename(raw).replace(/[^A-Za-z0-9._-]/g, '_');
  const name = safe.toLowerCase().endsWith('.zip') ? safe : `${safe}.zip`;

  const dir = join(DATA_DIR, 'upload');
  mkdirSync(dir, { recursive: true });
  const target = join(dir, name);

  try {
    await pipeline(request.body as Readable, createWriteStream(target));
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
  }

  return { source: target, bytes: statSync(target).size };
});

app.post<{ Body: { source?: string } }>('/api/export/scan', async (request, reply) => {
  const source = request.body?.source?.trim();
  if (source === undefined || source === '') {
    return reply.code(400).send({ error: 'chemin de l’export manquant' });
  }
  try {
    return await scanExport(source);
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/progress', () => readProgress());

// ---------------------------------------------------------------------------
// Export de fichiers (voie sans abonnement Strava)
// ---------------------------------------------------------------------------

app.post<{ Body: Partial<ExportFilesBody> }>('/api/export/files', async (request, reply) => {
  const body = request.body ?? {};
  if (body.source === undefined || body.sessions === undefined || body.sessions.length === 0) {
    return reply.code(400).send({ error: 'source et sessions requis' });
  }

  const outputDir = body.outputDir?.trim();
  try {
    return await exportFiles({
      source: body.source,
      sessions: body.sessions,
      sportOverrides: body.sportOverrides ?? {},
      format: body.format ?? 'fit',
      batchSize: body.batchSize ?? BATCH_SIZE_FREE,
      // Par défaut, à côté des données locales : l'utilisateur n'a pas à choisir
      // un dossier pour un premier essai.
      outputDir: outputDir !== undefined && outputDir !== '' ? outputDir : join(DATA_DIR, 'export'),
    });
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
  }
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

interface StartBody {
  source?: string;
  sessions?: SessionSummary[];
  sportOverrides?: Record<number, StravaSportType>;
  format?: ExportFormat;
  applySportType?: boolean;
  commute?: boolean;
  redoDone?: boolean;
}

app.post<{ Body: StartBody }>('/api/upload/start', (request, reply) => {
  const body = request.body ?? {};
  if (body.source === undefined || body.sessions === undefined || body.sessions.length === 0) {
    return reply.code(400).send({ error: 'source et sessions requis' });
  }
  if (queue.getState().running) {
    return reply.code(409).send({ error: 'un import est déjà en cours' });
  }

  // On ne bloque pas la réponse sur l'import : le suivi passe par /api/upload/events.
  void queue
    .run({
      source: body.source,
      sessions: body.sessions,
      sportOverrides: body.sportOverrides ?? {},
      format: body.format ?? 'fit',
      // En FIT le sport est déjà dans le fichier : la requête de correction ne
      // sert plus à rien, on ne la fait donc que si elle est demandée
      // explicitement, ou par défaut en TCX qui ne sait pas l'exprimer.
      applySportType: body.applySportType ?? body.format === 'tcx',
      commute: body.commute ?? false,
      redoDone: body.redoDone ?? false,
    })
    .catch((error: unknown) => {
      app.log.error(error);
    });

  return reply.code(202).send({ started: true, total: body.sessions.length });
});

app.post('/api/upload/stop', () => {
  queue.requestStop();
  return { stopping: true };
});

app.get('/api/upload/state', () => ({ ...queue.getState(), quota: getRateLimit() }));

/**
 * Flux de progression (Server-Sent Events).
 *
 * SSE plutôt qu'un WebSocket : le flux est unidirectionnel, tient en quelques
 * lignes et se reconnecte tout seul côté navigateur.
 */
app.get('/api/upload/events', (request, reply) => {
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });

  const send = (event: RunEvent): void => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Un commentaire SSE immédiat évite que le proxy Vite garde la réponse en
  // tampon en attendant le premier octet utile.
  reply.raw.write(': connecté\n\n');

  const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 20_000);
  queue.on('event', send);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    queue.off('event', send);
  });
});

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

try {
  await app.listen({ port: API_PORT, host: '127.0.0.1' });
  const configured = isStravaConfigured()
    ? ''
    : '  ⚠ STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET absents : copier .env.example vers .env\n';
  process.stdout.write(
    `\n  API PolarToStrava sur http://127.0.0.1:${API_PORT}\n${configured}  interface : ${WEB_ORIGIN}\n\n`,
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
