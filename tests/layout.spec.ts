import { test, expect } from '@playwright/test';

/**
 * Alignement du bouton d'analyse avec le champ de chemin.
 *
 * Invariant : sur une largeur où les deux tiennent côte à côte, leurs **bas**
 * doivent coïncider. Le piège est que le champ embarque un texte d'aide sous lui :
 * un simple `items-end` alignerait alors le bouton sur le bas de ce texte, et non
 * sur celui du champ — d'où un décalage de la hauteur de l'aide.
 */
test('le bouton d’analyse est aligné sur le bas du champ de chemin', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const field = page.getByLabel('Chemin de l’export');
  const button = page.getByRole('button', { name: 'Analyser' });

  const fieldBox = await field.boundingBox();
  const buttonBox = await button.boundingBox();
  expect(fieldBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();

  const fieldBottom = (fieldBox?.y ?? 0) + (fieldBox?.height ?? 0);
  const buttonBottom = (buttonBox?.y ?? 0) + (buttonBox?.height ?? 0);

  // Côte à côte, et non empilés.
  expect(buttonBox?.x ?? 0).toBeGreaterThan((fieldBox?.x ?? 0) + (fieldBox?.width ?? 0) - 1);
  // Bas alignés, à un pixel d'arrondi près.
  expect(Math.abs(fieldBottom - buttonBottom)).toBeLessThanOrEqual(1);
});
