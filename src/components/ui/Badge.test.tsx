import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('rend son contenu', () => {
    render(<Badge>AAA</Badge>);
    expect(screen.getByText('AAA')).toBeInTheDocument();
  });

  it('applique la variante demandée (classe de token)', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK').className).toContain('text-success');
  });
});
