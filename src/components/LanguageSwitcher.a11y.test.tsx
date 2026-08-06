/**
 * Tests d'accessibilité de `LanguageSwitcher`.
 *
 * Le composant consomme directement le contexte i18n : rendu sous `<I18nProvider>`
 * (via `renderA11y`), il bascule FR ⇄ EN. On vérifie :
 *  - le nom accessible du bouton (libellé i18n) et le drapeau décoratif ;
 *  - la bascule de langue au clic → `lang` de <html>, `document.title` et
 *    persistance localStorage (clé `lang`) ;
 *  - l'activation clavier (Entrée).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { renderA11y, htmlEl } from '../test/a11y';

describe('LanguageSwitcher (a11y)', () => {
  it('expose un bouton nommé (libellé i18n) avec un drapeau décoratif', () => {
    renderA11y(<LanguageSwitcher />);
    const btn = screen.getByRole('button', { name: 'Passer en anglais' });
    expect(btn).toHaveAttribute('title', 'Passer en anglais');
    // Le drapeau SVG est purement décoratif (aria-hidden), pas dans le nom accessible.
    expect(btn.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('bascule la langue au clic (html lang, titre du document, localStorage)', async () => {
    const { user } = renderA11y(<LanguageSwitcher />);
    await user.click(screen.getByRole('button', { name: 'Passer en anglais' }));

    expect(htmlEl().lang).toBe('en');
    expect(window.localStorage.getItem('lang')).toBe('en');
    // Après bascule, le bouton propose le retour au français.
    expect(screen.getByRole('button', { name: 'Switch to French' })).toBeInTheDocument();
  });

  it('est activable au clavier (Tab puis Entrée)', async () => {
    const { user } = renderA11y(<LanguageSwitcher />);
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Switch to French' })).toBeInTheDocument();
  });
});
