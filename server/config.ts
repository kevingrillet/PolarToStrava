/**
 * Configuration du backend, lue dans l'environnement (fichier `.env`).
 *
 * Le `client_secret` Strava ne doit jamais atteindre le navigateur : c'est la
 * raison d'être de ce backend. Il reste donc côté serveur, et le front ne voit
 * jamais que l'état de connexion.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env');
if (existsSync(ENV_FILE)) {
  // Disponible depuis Node 20.6 ; évite une dépendance à dotenv.
  process.loadEnvFile(ENV_FILE);
}

/** Port du backend — doit rester aligné sur `API_PORT` dans `vite.config.ts`. */
export const API_PORT = Number.parseInt(process.env.PORT ?? '8787', 10);

/** Origine du front en développement, vers laquelle on renvoie après OAuth. */
export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

/** Dossier des données locales (jetons, TCX générés, état de la file). */
export const DATA_DIR = resolve(process.cwd(), process.env.DATA_DIR ?? '.data');

export const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID ?? '';
export const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET ?? '';

/**
 * URL de retour OAuth. Strava n'autorise qu'un **domaine** de callback, à
 * déclarer dans les réglages de l'application (« Authorization Callback
 * Domain ») : mettre `localhost`. Le port n'est pas vérifié, mais le domaine
 * doit correspondre exactement — d'où `localhost` et non `127.0.0.1`.
 */
export const STRAVA_REDIRECT_URI =
  process.env.STRAVA_REDIRECT_URI ?? `http://localhost:${API_PORT}/api/auth/callback`;

/** `true` si l'application Strava est configurée : sans ça, pas d'upload possible. */
export function isStravaConfigured(): boolean {
  return STRAVA_CLIENT_ID !== '' && STRAVA_CLIENT_SECRET !== '';
}
