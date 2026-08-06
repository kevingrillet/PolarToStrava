import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyButton } from './CopyButton';

const meta: Meta<typeof CopyButton> = {
  title: 'UI/CopyButton',
  component: CopyButton,
  args: { value: 'Texte à copier' },
};
export default meta;

type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {};
export const Empty: Story = { args: { value: '' } };
export const CustomLabels: Story = {
  args: { label: 'Copier le hash', copiedLabel: 'Copié dans le presse-papiers' },
};
