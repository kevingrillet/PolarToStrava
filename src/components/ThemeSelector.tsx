/**
 * Sélecteur d'identité visuelle (default / atelier / blueprint / aurora).
 *
 * Un `<select>` natif : accessible au clavier d'emblée (flèches, Home/End, saisie
 * au clavier), nommé via une `<label>` visible. Composant contrôlé — l'état vit
 * dans `App` (hook `useTheme`).
 */
import { useId } from 'react';
import { THEMES, type ThemeName } from '../theme';
import { useI18n } from '../i18n/I18nProvider';

export interface ThemeSelectorProps {
  value: ThemeName;
  onChange: (theme: ThemeName) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const { t } = useI18n();
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-fg-muted">
      <span className="sr-only sm:not-sr-only">{t('theme.select')}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as ThemeName)}
        // Les `<option>` reçoivent un fond OPAQUE (`--color-canvas`, opaque dans
        // les 8 variantes) + `--color-fg` : sans ça, certains navigateurs peignent
        // la liste déroulante avec le fond du select — translucide pour les thèmes
        // « verre » (aurora) — d'où un texte clair sur fond clair, illisible.
        className="h-10 cursor-pointer rounded-control border bg-surface px-2 text-sm font-medium text-fg transition hover:bg-subtle [&>option]:bg-canvas [&>option]:text-fg"
      >
        {THEMES.map((theme) => (
          <option key={theme} value={theme}>
            {t(`theme.names.${theme}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
