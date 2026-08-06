import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from './Panel';
import { Button } from './Button';
import { Badge } from './Badge';

const meta: Meta<typeof Panel> = {
  title: 'UI/Panel',
  component: Panel,
};
export default meta;

type Story = StoryObj<typeof Panel>;

export const Plain: Story = {
  args: { children: 'Contenu du panneau, sans en-tête.' },
};

export const WithHeader: Story = {
  args: {
    title: 'Résultat',
    description: 'Calculé localement dans votre navigateur.',
    children: 'Corps du panneau.',
  },
};

export const WithActions: Story = {
  render: () => (
    <Panel
      title="Hachage SHA-256"
      description="Cliquez pour copier."
      actions={
        <>
          <Badge variant="success">Vérifié</Badge>
          <Button size="sm" variant="secondary">
            Copier
          </Button>
        </>
      }
    >
      <code className="break-all text-xs">e3b0c44298fc1c149afbf4c8996fb924…</code>
    </Panel>
  ),
};
