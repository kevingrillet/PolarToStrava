import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('associe le libellé au champ', () => {
    render(<Input label="Courriel" />);
    expect(screen.getByLabelText('Courriel')).toBeInTheDocument();
  });

  it('affiche le hint et le relie via aria-describedby', () => {
    render(<Input label="Nom" hint="Visible par vous seul" />);
    const input = screen.getByLabelText('Nom');
    const hint = screen.getByText('Visible par vous seul');
    expect(input.getAttribute('aria-describedby')).toContain(hint.id);
  });

  it('passe en état invalide et affiche le message d’erreur', () => {
    render(<Input label="Nom" error="Requis" />);
    const input = screen.getByLabelText('Nom');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByText('Requis');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });
});
