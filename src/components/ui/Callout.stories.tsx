import type { Meta, StoryObj } from '@storybook/react-vite';
import { Callout } from './Callout';

const meta: Meta<typeof Callout> = {
  title: 'UI/Callout',
  component: Callout,
  args: { children: 'Message contextuel.' },
  argTypes: {
    tone: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
    block: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Callout>;

export const Info: Story = { args: { tone: 'info' } };
export const Success: Story = { args: { tone: 'success', badge: 'OK' } };
export const Warning: Story = { args: { tone: 'warning', badge: 'Précision' } };
export const Danger: Story = { args: { tone: 'danger', badge: 'Erreur' } };

/** Présentation « bloc » : état vide ou repli. */
export const Block: Story = {
  args: {
    block: true,
    children: 'Aucun élément à afficher pour le moment.',
  },
};

/** Les quatre tons côte à côte. */
export const Tons: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Callout tone="info">Information neutre.</Callout>
      <Callout tone="success" badge="OK">
        Opération réussie.
      </Callout>
      <Callout tone="warning" badge="Précision">
        Une valeur approche une limite.
      </Callout>
      <Callout tone="danger" badge="Erreur">
        Saisie invalide — ligne 1, colonne 8.
      </Callout>
    </div>
  ),
};
