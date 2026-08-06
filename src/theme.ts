/**
 * Système de thèmes de l'application.
 *
 * Depuis la 2.1.0, le thème se choisit AU RUNTIME (et non plus au build via
 * `VITE_THEME`). Deux axes INDÉPENDANTS, tous deux persistés dans localStorage :
 *
 *   1. l'identité visuelle (`ThemeName`) : default | atelier | blueprint | aurora,
 *      appliquée en `data-theme` sur <html> ;
 *   2. le mode clair/sombre (`Mode`) : light | dark, appliqué via la classe `dark`
 *      sur <html> (variantes `dark:` de Tailwind).
 *
 * Les quatre thèmes déclinent désormais une variante claire ET sombre : les huit
 * combinaisons sont valides. Les valeurs des tokens vivent dans `src/index.css`
 * (`[data-theme='…']` et `[data-theme='…'].dark`). Ce module ne gère que le choix
 * et son application au DOM ; la persistance/réactivité vit dans `hooks/useTheme.ts`.
 */
export const THEMES = ['default', 'atelier', 'blueprint', 'aurora'] as const;
export type ThemeName = (typeof THEMES)[number];

export type Mode = 'light' | 'dark';

export const DEFAULT_THEME: ThemeName = 'default';

/** Clé localStorage de l'identité visuelle. */
export const THEME_STORAGE_KEY = 'theme-name';
/** Clé localStorage du mode clair/sombre (conservée depuis la 1.0 pour l'anti-flash). */
export const MODE_STORAGE_KEY = 'theme';

/** Résout une valeur quelconque vers un thème valide (sinon `default`). */
export function resolveTheme(value: string | null | undefined): ThemeName {
  return (THEMES as readonly string[]).includes(value ?? '') ? (value as ThemeName) : DEFAULT_THEME;
}

/** Applique l'identité visuelle au document (`data-theme` sur <html>). */
export function applyThemeName(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

/** Applique le mode clair/sombre au document (classe `dark` sur <html>). */
export function applyMode(mode: Mode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}
