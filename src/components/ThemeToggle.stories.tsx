import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../hooks/useTheme';

/**
 * Bouton de bascule clair/sombre. Composant contrôlé : il reçoit le mode courant
 * et un callback. Les stories `Light`/`Dark` figent l'état ; `Interactive` le
 * gère localement pour montrer la bascule.
 */
const meta: Meta<typeof ThemeToggle> = {
  title: 'App/ThemeToggle',
  component: ThemeToggle,
};
export default meta;

type Story = StoryObj<typeof ThemeToggle>;

export const Light: Story = { args: { theme: 'light', onToggle: () => {} } };
export const Dark: Story = { args: { theme: 'dark', onToggle: () => {} } };

export const Interactive: Story = {
  render: () => {
    const [theme, setTheme] = useState<Theme>('light');
    return (
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
    );
  },
};
