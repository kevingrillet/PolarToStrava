/**
 * Internationalisation (fr / en) — implémentation maison, sans dépendance externe.
 *
 * Expose un contexte React fournissant :
 *  - `lang`    : la langue active ('fr' | 'en') ;
 *  - `setLang` : pour changer de langue (persistée dans localStorage) ;
 *  - `t(key)`  : la fonction de traduction (clé en notation pointée, ex.
 *                `types.wifi.label`). Une clé absente est renvoyée telle quelle.
 *
 * Le contexte a une valeur par défaut en français, si bien que les composants
 * fonctionnent même sans `<I18nProvider>` (utile en tests/Storybook isolés).
 */
/* eslint-disable react-refresh/only-export-components --
   Ce module regroupe volontairement le Provider, le hook useI18n et getInitialLang :
   c'est l'API publique cohérente de l'i18n. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { messages, type Lang } from './messages';

const STORAGE_KEY = 'lang';

/** Résout une clé pointée (`a.b.c`) dans le dictionnaire de la langue donnée. */
function translate(lang: Lang, key: string): string {
  let node: unknown = messages[lang];
  for (const part of key.split('.')) {
    if (node !== null && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key; // clé inconnue : on renvoie la clé (aide au repérage).
    }
  }
  return typeof node === 'string' ? node : key;
}

/** Détermine la langue initiale : préférence enregistrée, puis langue du navigateur. */
export function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'fr';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    /* localStorage indisponible : on ignore. */
  }
  const navLang = typeof navigator !== 'undefined' ? navigator.language : 'fr';
  return navLang.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => translate('fr', key),
});

/** Accès au contexte i18n depuis n'importe quel composant. */
export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, 'app.title');
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage indisponible : on ignore la persistance. */
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const t = useCallback((key: string) => translate(lang, key), [lang]);
  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
