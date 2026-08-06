import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { label: 'Entrée', placeholder: 'Coller du texte…' },
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};
export const WithHint: Story = { args: { hint: 'Traité localement, jamais envoyé.' } };
export const WithError: Story = { args: { error: 'Entrée invalide.' } };
export const ReadOnly: Story = {
  args: { label: 'Sortie', readOnly: true, value: 'Résultat en lecture seule' },
};
