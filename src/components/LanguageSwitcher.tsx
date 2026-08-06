/**
 * Bouton de bascule de langue (FR ⇄ EN), dans le même esprit que `ThemeToggle`.
 *
 * Il affiche le drapeau de la langue active et bascule vers l'autre au clic.
 * Les drapeaux sont des SVG inline (et non des emojis) : ils s'affichent de façon
 * identique sur toutes les plateformes — notamment Windows, où les emojis drapeaux
 * ne sont pas rendus — et leur taille fixe évite tout décalage de la mise en page.
 */
import type { ReactElement } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { LANGS, type Lang } from '../i18n/messages';

/** Drapeau français (3 bandes verticales). */
function FlagFR() {
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" className="h-4 w-6 rounded-xs shadow-xs">
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  );
}

/** Drapeau britannique (Union Jack, version compacte). */
function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" aria-hidden="true" className="h-4 w-6 rounded-xs shadow-xs">
      <clipPath id="lang-gb-clip">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="lang-gb-diag">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#lang-gb-clip)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#lang-gb-diag)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

const FLAGS: Record<Lang, () => ReactElement> = {
  fr: FlagFR,
  en: FlagGB,
};

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  // Avec deux langues, on bascule simplement vers « l'autre ».
  const otherLang = LANGS.find((code) => code !== lang) ?? lang;
  const Flag = FLAGS[lang];

  return (
    <button
      type="button"
      onClick={() => setLang(otherLang)}
      aria-label={t('language.toggle')}
      title={t('language.toggle')}
      className="inline-flex h-10 w-10 items-center justify-center rounded-control border bg-surface transition hover:bg-subtle"
    >
      <Flag />
    </button>
  );
}
