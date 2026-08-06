import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './CopyButton';

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe('CopyButton', () => {
  it('copie la valeur et bascule le libellé', async () => {
    render(<CopyButton value="hello" label="Copier" copiedLabel="Copié ✓" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copier' }));
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(await screen.findByRole('button', { name: 'Copié ✓' })).toBeInTheDocument();
  });

  it('est désactivé quand il n’y a rien à copier', () => {
    render(<CopyButton value="" label="Copier" />);
    expect(screen.getByRole('button', { name: 'Copier' })).toBeDisabled();
  });
});
