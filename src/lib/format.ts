/**
 * Formatage des valeurs affichées, sensible à la langue.
 *
 * Les dates sont formatées depuis la chaîne **locale** de Polar
 * (`"2020-08-18T10:23:06"`) et non depuis l'instant absolu : l'utilisateur veut
 * revoir l'heure à laquelle il s'est entraîné, pas sa transposition dans le
 * fuseau du navigateur — une sortie de 8 h du matin en vacances à l'étranger ne
 * doit pas s'afficher à 2 h.
 */
import type { Lang } from '../i18n/messages';

const LOCALES: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };

/** `1h07`, `12 min`, `45 s`. */
export function formatDuration(seconds: number, lang: Lang): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} s`;

  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const separator = lang === 'fr' ? 'h' : 'h ';
  return `${hours}${separator}${String(rest).padStart(2, '0')}`;
}

/** `18,7 km` ou `450 m`. */
export function formatDistance(meters: number | undefined, lang: Lang): string {
  if (meters === undefined) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString(LOCALES[lang], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

/** Date et heure locales de la séance, telles qu'enregistrées par Polar. */
export function formatSessionDateTime(localStart: string, lang: Lang): string {
  const [date, time = ''] = localStart.split('T');
  const [year, month, day] = date.split('-');
  const hhmm = time.slice(0, 5);
  if (year === undefined || month === undefined || day === undefined) return localStart;
  const dmy = lang === 'fr' ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;
  return hhmm === '' ? dmy : `${dmy} ${hhmm}`;
}

/** Date seule (`YYYY-MM-DD` → format local). */
export function formatDate(isoDate: string, lang: Lang): string {
  const [year, month, day] = isoDate.split('-');
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  return lang === 'fr' ? `${day}/${month}/${year}` : isoDate;
}

/** Durée restante avant un instant donné, en minutes et secondes. */
export function formatCountdown(untilMs: number, nowMs: number): string {
  const remaining = Math.max(0, Math.ceil((untilMs - nowMs) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
