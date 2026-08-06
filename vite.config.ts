import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Port du backend Fastify — doit rester aligné sur `server/config.ts`. */
const API_PORT = 8787;

/**
 * Configuration Vite + Vitest.
 *
 * Contrairement aux autres projets du dossier `Node/`, celui-ci **n'est pas une
 * application statique** : il lui faut un backend (voir `server/`), parce que
 * l'échange du code OAuth Strava contre un jeton exige le `client_secret`, qui
 * ne doit jamais être exposé au navigateur, et que l'API Strava n'autorise pas
 * l'upload depuis une origine web. D'où le proxy ci-dessous plutôt qu'un
 * `base: './'` déployable sur GitHub Pages.
 *
 * Le service worker du template a également été retiré : sur un outil lancé en
 * local, il ne sert à rien et fait activement du mal (il resservirait une
 * version en cache de l'interface après modification).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['node_modules', 'dist', 'tests/**', '.storybook/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      // `core/` porte la logique métier (parsing Polar, TCX, filtrage) : c'est là
      // que la couverture compte le plus.
      include: ['src/**/*.{ts,tsx}', 'core/**/*.ts', 'server/**/*.ts'],
      exclude: ['src/**/*.stories.tsx', 'src/test/**', 'src/main.tsx', 'core/**/fixtures.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
});
