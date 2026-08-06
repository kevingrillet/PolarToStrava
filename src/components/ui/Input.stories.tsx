import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  args: { label: 'Nom', placeholder: 'Saisir une valeur…' },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithHint: Story = {
  args: { hint: 'Visible uniquement par vous, jamais envoyé à un serveur.' },
};
export const WithError: Story = {
  args: { error: 'Ce champ est requis.', defaultValue: '' },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Non modifiable' } };
