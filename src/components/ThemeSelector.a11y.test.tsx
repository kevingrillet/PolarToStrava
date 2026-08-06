/**
 * Tests d'accessibilité de `ThemeSelector` + intégration avec `useTheme`.
 *
 * On câble ici les contrôles de thème comme dans l'app (harnais `ThemeHarness`)
 * pour vérifier les EFFETS OBSERVABLES du parcours réel :
 *  - `ThemeSelector` : `<select>` natif nommé, changement d'identité → `data-theme`
 *    sur <html> + persistance localStorage (clé `theme-name`) ;
 *  - `ThemeToggle` : bascule → classe `dark` sur <html> + persistance (clé `theme`).
 *
 * Le `<select>` natif est déjà accessible au clavier (rôle `combobox`), on se
 * concentre donc sur le nom accessible et les effets.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { ThemeSelector } from './ThemeSelector';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { THEME_STORAGE_KEY, MODE_STORAGE_KEY } from '../theme';
import { renderA11y, htmlEl } from '../test/a11y';

/** Reproduit le câblage de `App` : état de thème réel branché sur les contrôles. */
function ThemeHarness() {
  const { mode, toggleMode, themeName, setThemeName } = useTheme();
  return (
    <>
      <ThemeSelector value={themeName} onChange={setThemeName} />
      <ThemeToggle theme={mode} onToggle={toggleMode} />
    </>
  );
}

describe('ThemeSelector (a11y)', () => {
  it('est un combobox nommé « Thème » listant les 4 identités', () => {
    renderA11y(<ThemeHarness />);
    const select = screen.getByRole('combobox', { name: 'Thème' });
    expect(select).toBeInTheDocument();
    for (const name of ['Défaut', 'Atelier', 'Blueprint', 'Aurora']) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('change `data-theme` sur <html> et le persiste dans localStorage', async () => {
    const { user } = renderA11y(<ThemeHarness />);
    const select = screen.getByRole('combobox', { name: 'Thème' });

    await user.selectOptions(select, 'aurora');

    expect(htmlEl().dataset.theme).toBe('aurora');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('aurora');
  });

  it('applique la classe `dark` et la persiste au clic sur le toggle', async () => {
    const { user } = renderA11y(<ThemeHarness />);
    expect(htmlEl().classList.contains('dark')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Activer le mode sombre' }));

    expect(htmlEl().classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(MODE_STORAGE_KEY)).toBe('dark');

    // Re-bascule : retour en clair, la classe `dark` disparaît.
    await user.click(screen.getByRole('button', { name: 'Activer le mode clair' }));
    expect(htmlEl().classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(MODE_STORAGE_KEY)).toBe('light');
  });

  it('est atteignable et pilotable au clavier (Tab jusqu’au select)', async () => {
    const { user } = renderA11y(<ThemeHarness />);
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Thème' })).toHaveFocus();
  });
});
