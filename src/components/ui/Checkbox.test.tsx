import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('reflète l’état coché et lie le libellé', () => {
    render(<Checkbox label="Option" checked onChange={() => {}} />);
    expect(screen.getByLabelText('Option')).toBeChecked();
  });

  it('appelle onChange avec le nouvel état', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Option" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Option'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
