/**
 * Hook de gestion du thème : identité visuelle (default/atelier/blueprint/aurora)
 * ET mode clair/sombre, deux axes indépendants choisis au runtime.
 *
 * Stratégie (cohérente avec le script anti-flash de index.html) :
 *  1. l'identité est lue dans localStorage (clé "theme-name"), à défaut `default` ;
 *  2. le mode est lu dans localStorage (clé "theme"), à défaut la préférence
 *     système (prefers-color-scheme) ;
 *  3. l'identité est appliquée via `data-theme` et le mode via la classe `dark`
 *     sur <html>. Les deux sont persistés à chaque changement.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  applyMode,
  applyThemeName,
  resolveTheme,
  type Mode,
  type ThemeName,
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from '../theme';

/** Alias historique : le « thème » au sens clair/sombre. */
export type Theme = Mode;

/** Lit une clé localStorage sans jeter (mode privé, etc.). */
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* localStorage indisponible : on ignore la persistance. */
  }
}

/** Mode initial : préférence enregistrée, puis préférence système. */
export function getInitialMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  const stored = readStorage(MODE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Identité initiale : préférence enregistrée, sinon `default`. */
export function getInitialThemeName(): ThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  return resolveTheme(readStorage(THEME_STORAGE_KEY));
}

/**
 * Applique identité + mode en une passe, en coupant les transitions le temps
 * d'une frame : sans ça, le fond (sans transition) change instantanément tandis
 * que boutons/onglets (avec `transition`) « traînent » de ~150 ms — effet
 * désynchronisé. Réactivées une fois le nouveau thème peint (double rAF).
 */
function applyTheme(themeName: ThemeName, mode: Mode): void {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  applyThemeName(themeName);
  applyMode(mode);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => root.classList.remove('theme-switching'));
  });
}

export interface UseThemeResult {
  /** Mode clair/sombre courant. */
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  /** Identité visuelle courante. */
  themeName: ThemeName;
  setThemeName: (theme: ThemeName) => void;
}

export function useTheme(): UseThemeResult {
  const [mode, setModeState] = useState<Mode>(getInitialMode);
  const [themeName, setThemeNameState] = useState<ThemeName>(getInitialThemeName);

  useEffect(() => {
    applyTheme(themeName, mode);
    writeStorage(MODE_STORAGE_KEY, mode);
    writeStorage(THEME_STORAGE_KEY, themeName);
  }, [themeName, mode]);

  const setMode = useCallback((next: Mode) => setModeState(next), []);
  const toggleMode = useCallback(
    () => setModeState((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );
  const setThemeName = useCallback((next: ThemeName) => setThemeNameState(next), []);

  return { mode, setMode, toggleMode, themeName, setThemeName };
}
