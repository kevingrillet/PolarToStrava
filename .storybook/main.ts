import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Configuration Storybook (builder Vite).
 * Les stories vivent à côté des composants (`src/**\/*.stories.tsx`).
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // Les thèmes sont gérés par des globals personnalisés dans preview.tsx (et non
  // par `@storybook/addon-themes`, dont les deux décorateurs entraient en collision).
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
