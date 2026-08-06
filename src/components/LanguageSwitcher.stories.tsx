import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Bouton de bascule de langue (FR ⇄ EN). Il consomme directement le contexte
 * i18n (valeur par défaut : FR) ; le clic bascule la langue de l'app.
 */
const meta: Meta<typeof LanguageSwitcher> = {
  title: 'App/LanguageSwitcher',
  component: LanguageSwitcher,
};
export default meta;

type Story = StoryObj<typeof LanguageSwitcher>;

export const Default: Story = {};
