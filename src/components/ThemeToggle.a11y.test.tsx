/**
 * Tests d'accessibilité de `ThemeToggle`.
 *
 * `ThemeToggle` est un composant CONTRÔLÉ (props `theme` + `onToggle`). On le
 * teste donc sur deux plans :
 *  1. rôle / nom accessible / titre selon l'état (light vs dark) ;
 *  2. activation clavier (Entrée, Espace) qui déclenche bien `onToggle`.
 * Le câblage avec `useTheme` (classe `dark` + persistance localStorage) est
 * couvert par `ThemeSelector.a11y.test.tsx` via un harnais partagé.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { renderA11y } from '../test/a11y';

describe('ThemeToggle (a11y)', () => {
  it('en mode clair : nom accessible « passer en sombre » et icône décorative', () => {
    renderA11y(<ThemeToggle theme="light" onToggle={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Activer le mode sombre' });
    expect(btn).toHaveAttribute('title', 'Mode sombre');
    // L'emoji est purement décoratif : il ne doit pas polluer le nom accessible.
    expect(btn.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('en mode sombre : nom accessible « passer en clair »', () => {
    renderA11y(<ThemeToggle theme="dark" onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Activer le mode clair' })).toHaveAttribute(
      'title',
      'Mode clair',
    );
  });

  it('est activable au clavier (Entrée puis Espace)', async () => {
    const onToggle = vi.fn();
    const { user } = renderA11y(<ThemeToggle theme="light" onToggle={onToggle} />);
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
