import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Badge' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'accent', 'success', 'warning', 'danger'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Neutral: Story = { args: { variant: 'neutral' } };
export const Accent: Story = { args: { variant: 'accent' } };
export const Success: Story = { args: { variant: 'success', children: 'AAA' } };
export const Warning: Story = { args: { variant: 'warning', children: 'AA' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Échec' } };

/** Exemple : badges de conformité de l'outil de palette RGAA. */
export const Conformite: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success">AAA · 8.2:1</Badge>
      <Badge variant="warning">AA · 4.7:1</Badge>
      <Badge variant="danger">Échec · 2.1:1</Badge>
    </div>
  ),
};
