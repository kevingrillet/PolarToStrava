import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
};
export default meta;

type Story = StoryObj<typeof Select>;

const options = [
  { value: 'base64', label: 'Base64' },
  { value: 'url', label: 'URL' },
  { value: 'jwt', label: 'JWT' },
];

/** Exemple contrôlé (l'état vit dans le parent, comme dans les outils). */
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState('base64');
    return <Select label="Format" value={value} onChange={setValue} options={options} />;
  },
};
