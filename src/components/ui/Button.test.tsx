import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('rend son contenu et a le type "button" par défaut', () => {
    render(<Button>Cliquer</Button>);
    const btn = screen.getByRole('button', { name: 'Cliquer' });
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('déclenche onClick au clic', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>OK</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ne déclenche pas onClick quand il est désactivé', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        OK
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
