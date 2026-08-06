/* eslint-disable react-refresh/only-export-components --
   Fichier de configuration Storybook : il exporte la config `preview` (objet) à
   côté d'un petit composant utilitaire local (`ThemeFrame`). Le Fast Refresh ne
   s'applique pas ici, la contrainte « un seul composant exporté » n'a pas de sens. */
import type { Preview, Decorator } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import '../src/index.css';

/**
 * Preview Storybook : applique les styles globaux (Tailwind) et expose DEUX
 * sélecteurs INDÉPENDANTS dans la barre d'outils, comme les deux axes de l'app :
 *  - « Thème »  → `data-theme` (default / atelier / blueprint / aurora) ;
 *  - « Mode »   → classe `dark` (clair / sombre).
 *
 * On n'utilise PAS les décorateurs de `@storybook/addon-themes` : `withThemeBy…`
 * écrivent tous deux dans le même global `theme` (collision → un seul menu
 * fonctionnel) et n'appliquent pas forcément `data-theme` ET `.dark` sur le MÊME
 * élément, alors que nos tokens l'exigent (`[data-theme='x'].dark`). On gère donc
 * les deux globals nous-mêmes et on les pose sur le <html> de l'iframe, exactement
 * comme `useTheme` en production. Les 8 combinaisons sont ainsi prévisualisables.
 */
/** Applique identité + mode au <html> de l'iframe et encadre la story. Composant
 *  (nom capitalisé) pour que `useEffect` respecte les règles des hooks React. */
function ThemeFrame({
  themeId,
  mode,
  children,
}: {
  themeId: string;
  mode: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeId || 'default';
    root.classList.toggle('dark', mode === 'dark');
  }, [themeId, mode]);

  return (
    <div className="bg-canvas font-base text-fg" style={{ padding: '1.5rem' }}>
      {children}
    </div>
  );
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame themeId={context.globals.themeId as string} mode={context.globals.mode as string}>
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    themeId: {
      description: 'Identité visuelle (data-theme)',
      defaultValue: 'default',
      toolbar: {
        title: 'Thème',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          { value: 'default', title: 'Défaut' },
          { value: 'atelier', title: 'Atelier' },
          { value: 'blueprint', title: 'Blueprint' },
          { value: 'aurora', title: 'Aurora' },
        ],
      },
    },
    mode: {
      description: 'Mode clair / sombre (classe dark)',
      defaultValue: 'light',
      toolbar: {
        title: 'Mode',
        icon: 'contrast',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Clair', icon: 'sun' },
          { value: 'dark', title: 'Sombre', icon: 'moon' },
        ],
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
