import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Callout } from './Callout';

describe('Callout', () => {
  it('affiche le texte et le badge optionnel', () => {
    render(
      <Callout tone="warning" badge="Précision">
        Message
      </Callout>,
    );
    expect(screen.getByText('Précision')).toBeInTheDocument();
    expect(screen.getByText(/Message/)).toBeInTheDocument();
  });

  it('rôle « alert » pour danger, « status » sinon', () => {
    const { rerender } = render(<Callout tone="danger">x</Callout>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<Callout tone="warning">x</Callout>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('le rôle explicite a la priorité', () => {
    render(
      <Callout tone="danger" role="status">
        x
      </Callout>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
