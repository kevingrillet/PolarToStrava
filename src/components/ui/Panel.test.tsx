import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  it('rend le titre comme un titre de niveau 2 par défaut', () => {
    render(<Panel title="Résultat">corps</Panel>);
    expect(screen.getByRole('heading', { name: 'Résultat', level: 2 })).toBeInTheDocument();
  });

  it('respecte titleLevel', () => {
    render(
      <Panel title="Sous-section" titleLevel={3}>
        corps
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'Sous-section', level: 3 })).toBeInTheDocument();
  });

  it('rend la description, les actions et les enfants', () => {
    render(
      <Panel title="T" description="desc" actions={<button>Action</button>}>
        Contenu
      </Panel>,
    );
    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('sans en-tête, rend uniquement les enfants', () => {
    render(<Panel>juste le corps</Panel>);
    expect(screen.getByText('juste le corps')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
