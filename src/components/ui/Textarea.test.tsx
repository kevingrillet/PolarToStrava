import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('associe le libellé au champ', () => {
    render(<Textarea label="Entrée" />);
    expect(screen.getByLabelText('Entrée')).toBeInTheDocument();
  });

  it('passe en état invalide et relie le message d’erreur', () => {
    render(<Textarea label="Entrée" error="Invalide" />);
    const field = screen.getByLabelText('Entrée');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field.getAttribute('aria-describedby')).toContain(screen.getByText('Invalide').id);
  });
});
