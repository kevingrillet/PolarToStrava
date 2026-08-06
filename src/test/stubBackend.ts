/**
 * Doubles du backend pour les tests de composants.
 *
 * `App` interroge le backend au montage et ouvre un flux `EventSource` ; jsdom ne
 * fournit ni `fetch` utilisable ni `EventSource`. Ce module centralise les deux
 * doubles pour éviter de les redéfinir dans chaque fichier de test.
 */
import { vi } from 'vitest';

/** Réponses par défaut : backend disponible, Strava configuré et connecté. */
export const DEFAULT_RESPONSES: Record<string, unknown> = {
  '/api/config': {
    stravaConfigured: true,
    redirectUri: 'http://localhost:8787/api/auth/callback',
  },
  '/api/auth/status': { connected: true, athlete: { id: 1, name: 'Kevin Grillet' } },
  '/api/progress': {},
  '/api/upload/state': {
    running: false,
    total: 0,
    index: 0,
    uploaded: 0,
    duplicates: 0,
    failed: 0,
    skipped: 0,
  },
};

/** `EventSource` minimal : de quoi monter le composant et vérifier la fermeture. */
export class EventSourceStub {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  // Type annoté explicitement : le type inféré de `vi.fn()` référence un symbole
  // interne à vitest, que TypeScript ne sait pas nommer dans un fichier déclaré.
  close: () => void = vi.fn();
}

/**
 * Installe les doubles. `override` permet de renvoyer autre chose pour une route
 * donnée (renvoyer `undefined` retombe sur la réponse par défaut).
 */
export function stubBackend(override?: (path: string) => unknown): void {
  vi.stubGlobal('EventSource', EventSourceStub);
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const body = override?.(input) ?? DEFAULT_RESPONSES[input];
      if (body === undefined) return Promise.reject(new Error(`route non simulée : ${input}`));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
    }),
  );
}

/** Simule un backend éteint : toute requête échoue. */
export function stubBackendDown(): void {
  vi.stubGlobal('EventSource', EventSourceStub);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
  );
}
