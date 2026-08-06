/**
 * Boîte à outils pour les tests d'accessibilité (a11y) unitaires.
 *
 * STYLE DE RÉFÉRENCE pour les tests a11y de ce socle (repris par les autres
 * projets). Un bon test a11y vérifie l'expérience réelle plutôt que le markup :
 *
 *  - rôle + nom accessible (`getByRole(role, { name })`) plutôt que classes CSS ;
 *  - attributs ARIA d'état (`aria-pressed`, `aria-label`, `aria-expanded`…) ;
 *  - navigation clavier (Tab / Entrée / Espace / flèches) via `user-event` ;
 *  - effets observables sur le DOM (classe `dark`, `data-theme`) et sur
 *    `localStorage` (persistance) — le comportement, pas l'implémentation.
 *
 * Les composants d'en-tête consomment le contexte i18n : on rend donc toujours
 * sous `<I18nProvider>` pour disposer des vrais libellés (noms accessibles).
 */
import type { ReactElement } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../i18n/I18nProvider';

/** Rend un composant dans le contexte i18n (libellés réels) et renvoie un
 *  `user` prêt à l'emploi pour les interactions clavier/souris déterministes. */
export function renderA11y(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  return { user, ...render(<I18nProvider>{ui}</I18nProvider>, options) };
}

/** Raccourci lisible : l'élément <html> sur lequel `data-theme` / `.dark` sont posés. */
export function htmlEl(): HTMLElement {
  return document.documentElement;
}
