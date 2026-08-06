/**
 * Client HTTP du backend local.
 *
 * Les types viennent de `core/dto.ts`, partagés avec le serveur : une
 * divergence de contrat devient une erreur de compilation.
 *
 * En développement, Vite relaie `/api` vers le backend (voir `vite.config.ts`) ;
 * les URL restent donc relatives et il n'y a aucune question d'origine à gérer.
 */
import type {
  AuthStatus,
  ExportFilesBody,
  FileExportResult,
  Progress,
  RunState,
  ScanResult,
  ServerConfig,
  StartUploadBody,
} from '../../core/dto';

/** Erreur portant le code HTTP, pour distinguer « pas connecté » d'un vrai incident. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    // Cas le plus fréquent en pratique : le backend n'est pas démarré.
    throw new ApiError('backend injoignable', 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export const api = {
  config: (): Promise<ServerConfig> => request('/api/config'),

  authStatus: (): Promise<AuthStatus> => request('/api/auth/status'),

  /** L'authentification Strava impose une navigation complète, pas un fetch. */
  loginUrl: (): string => '/api/auth/login',

  logout: (): Promise<AuthStatus> => request('/api/auth/logout', { method: 'POST' }),

  scan: (source: string): Promise<ScanResult> =>
    request('/api/export/scan', { method: 'POST', body: JSON.stringify({ source }) }),

  /**
   * Recopie l'archive vers le backend et renvoie son chemin local.
   *
   * Nécessaire parce qu'un navigateur ne divulgue pas le chemin réel d'un fichier
   * choisi : sans cette copie, un sélecteur ne pourrait rien transmettre
   * d'exploitable au serveur.
   */
  uploadExport: (file: File): Promise<{ source: string; bytes: number }> =>
    request(`/api/export/upload?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/zip' },
      body: file,
    }),

  progress: (): Promise<Progress> => request('/api/progress'),

  exportFiles: (body: ExportFilesBody): Promise<FileExportResult> =>
    request('/api/export/files', { method: 'POST', body: JSON.stringify(body) }),

  startUpload: (body: StartUploadBody): Promise<{ started: boolean; total: number }> =>
    request('/api/upload/start', { method: 'POST', body: JSON.stringify(body) }),

  stopUpload: (): Promise<{ stopping: boolean }> => request('/api/upload/stop', { method: 'POST' }),

  uploadState: (): Promise<RunState> => request('/api/upload/state'),
};
