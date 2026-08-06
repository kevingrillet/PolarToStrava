import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Tests de fumée end-to-end.
 *
 * Playwright ne lance que l'interface (`npm run build && npm run preview`), **pas
 * le backend** : les appels à `/api` échouent donc, et c'est voulu. Ce que l'on
 * vérifie ici, c'est précisément que l'interface reste utilisable et lisible sans
 * backend — les deux premières étapes s'affichent, l'état « non connecté » est
 * annoncé, et les thèmes fonctionnent.
 */

test('l’assistant se charge en français', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Polar → Strava', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1. Connexion Strava' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. Export Polar' })).toBeVisible();
});

test('les étapes 3 et 4 restent masquées avant analyse', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '3. Sélection des séances' })).toBeHidden();
  await expect(page.getByRole('heading', { name: '4. Envoi' })).toBeHidden();
});

test('l’analyse est désactivée sans chemin d’export', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Analyser' })).toBeDisabled();
});

test('la bascule de langue traduit toute l’interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Passer en anglais' }).click();
  await expect(page.getByRole('heading', { name: '1. Strava connection' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyse' })).toBeVisible();
});

test('le bouton de thème bascule en mode sombre', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await expect(html).toHaveClass(/dark/);
});

/**
 * Accessibilité automatisée (axe-core).
 *
 * On scanne avec les jeux de règles WCAG 2.x A + AA et on n'échoue que sur les
 * violations `serious` / `critical` : ce seuil attrape les vrais blocages
 * (contraste, nom accessible, ARIA cassé) sans transformer chaque avertissement
 * mineur en test rouge.
 */
async function scanSeriousA11yViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test("l'app n'a pas de violation a11y sérieuse/critique (clair)", async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Polar → Strava', level: 1 })).toBeVisible();
  expect(await scanSeriousA11yViolations(page)).toEqual([]);
});

test("l'app n'a pas de violation a11y sérieuse/critique (sombre)", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Activer le mode sombre' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await scanSeriousA11yViolations(page)).toEqual([]);
});
