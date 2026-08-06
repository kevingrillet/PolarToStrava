import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <Checkbox label="Activer l’option" checked={checked} onChange={setChecked} />;
  },
};
