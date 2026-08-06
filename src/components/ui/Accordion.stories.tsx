import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from './Accordion';

const meta: Meta<typeof Accordion> = {
  title: 'UI/Accordion',
  component: Accordion,
};
export default meta;

type Story = StoryObj<typeof Accordion>;

const items = [
  {
    id: 'a',
    title: 'Qu’est-ce que DevTools Hub ?',
    content: 'Une collection d’outils client-side.',
  },
  {
    id: 'b',
    title: 'Mes données sont-elles envoyées ?',
    content: 'Non, tout reste dans le navigateur.',
  },
  { id: 'c', title: 'Est-ce open source ?', content: 'Oui, sous licence MIT.' },
];

export const Single: Story = {
  args: { items, allowMultiple: false },
};

export const MultipleOpen: Story = {
  args: {
    items: items.map((item, i) => ({ ...item, defaultOpen: i === 0 })),
    allowMultiple: true,
  },
};
