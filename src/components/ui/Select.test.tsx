import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
];

describe('Select', () => {
  it('rend les options et lie le libellé', () => {
    render(<Select label="Choix" value="a" onChange={() => {}} options={options} />);
    const select = screen.getByLabelText('Choix');
    expect(select).toHaveValue('a');
    expect(screen.getByRole('option', { name: 'Bravo' })).toBeInTheDocument();
  });

  it('appelle onChange avec la valeur sélectionnée', async () => {
    const onChange = vi.fn();
    render(<Select label="Choix" value="a" onChange={onChange} options={options} />);
    await userEvent.selectOptions(screen.getByLabelText('Choix'), 'b');
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
