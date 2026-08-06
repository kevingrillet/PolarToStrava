import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThemeSelector } from './ThemeSelector';
import type { ThemeName } from '../theme';

/**
 * Sélecteur d'identité visuelle. Composant contrôlé (l'état vit dans le parent,
 * comme dans `App` via `useTheme`). Les libellés proviennent de l'i18n (FR par
 * défaut hors `I18nProvider`).
 */
const meta: Meta<typeof ThemeSelector> = {
  title: 'App/ThemeSelector',
  component: ThemeSelector,
};
export default meta;

type Story = StoryObj<typeof ThemeSelector>;

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState<ThemeName>('default');
    return <ThemeSelector value={value} onChange={setValue} />;
  },
};
