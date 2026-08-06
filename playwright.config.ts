import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests d'intégration / end-to-end.
 *
 * Le serveur Vite de prévisualisation est démarré automatiquement (`webServer`)
 * sur le build de production, ce qui reflète le comportement réel du site déployé.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Langue déterministe : l'app détecte fr-FR → interface en français par défaut.
    locale: 'fr-FR',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
