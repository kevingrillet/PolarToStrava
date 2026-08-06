/**
 * Sélection des séances à envoyer.
 *
 * C'est l'étape que le billet de référence traitait à coups de `ls | awk | xargs
 * rm` sur les noms de fichiers — irréversible, et de toute façon caduque : le
 * format de nom a changé (`training-session_<ISO>_<id>.json`, avec l'heure).
 * On filtre donc sur les données normalisées, sans jamais toucher à l'archive.
 *
 * Chaque exclusion est motivée, pour que l'interface puisse répondre à la seule
 * question qui compte quand une séance manque : « pourquoi celle-là n'y est
 * pas ? ».
 *
 * Le filtrage porte sur les **résumés** (`SessionSummary`) et non sur les séances
 * complètes : c'est ce que l'interface a en main, et reconstruire les pistes de
 * 726 séances pour décider laquelle garder serait absurde.
 */
import type { SessionSummary } from './dto';

/** Motif d'exclusion d'une séance. */
export type ExclusionReason =
  | 'before-from'
  | 'after-to'
  | 'too-short'
  | 'too-long'
  | 'too-close'
  | 'no-gps'
  | 'sport-excluded'
  | 'unusable';

export interface SessionFilter {
  /** Date locale de début, incluse (`YYYY-MM-DD`). */
  readonly from?: string;
  /** Date locale de fin, incluse (`YYYY-MM-DD`). */
  readonly to?: string;
  /** Durée minimale, en secondes — écarte les trajets domicile-travail. */
  readonly minDurationSeconds?: number;
  readonly maxDurationSeconds?: number;
  /** Distance minimale, en mètres. Une séance sans distance n'est pas écartée. */
  readonly minDistanceMeters?: number;
  /** Si défini, seuls ces `sport.id` sont retenus. */
  readonly sportIds?: readonly number[];
  /** Écarte les séances sans GPS, FC ni distance (rien à envoyer). Défaut : `true`. */
  readonly excludeUnusable?: boolean;
  /** N'accepte que les séances porteuses d'une trace GPS. */
  readonly requireGps?: boolean;
}

export interface ExcludedSession {
  readonly session: SessionSummary;
  readonly reason: ExclusionReason;
}

export interface FilterResult {
  readonly kept: readonly SessionSummary[];
  readonly excluded: readonly ExcludedSession[];
}

/**
 * Date locale de la séance (`YYYY-MM-DD`), telle que Polar l'a enregistrée.
 *
 * On travaille sur l'heure **locale** et non UTC : une sortie du 1ᵉʳ janvier à
 * 00h30 en heure locale doit être filtrée comme étant du 1ᵉʳ janvier, alors
 * qu'en UTC elle tombe le 31 décembre.
 */
export function localDateOf(session: SessionSummary): string {
  if (session.localStart.length >= 10) return session.localStart.slice(0, 10);
  return new Date(session.startedAt).toISOString().slice(0, 10);
}

/** Évalue une séance et renvoie son motif d'exclusion, ou `undefined` si elle passe. */
export function exclusionReasonFor(
  session: SessionSummary,
  filter: SessionFilter,
): ExclusionReason | undefined {
  const { excludeUnusable = true } = filter;

  if (excludeUnusable && !session.usable) return 'unusable';
  if (filter.requireGps === true && !session.hasGps) return 'no-gps';

  const date = localDateOf(session);
  if (filter.from !== undefined && date < filter.from) return 'before-from';
  if (filter.to !== undefined && date > filter.to) return 'after-to';

  if (
    filter.minDurationSeconds !== undefined &&
    session.durationSeconds < filter.minDurationSeconds
  ) {
    return 'too-short';
  }
  if (
    filter.maxDurationSeconds !== undefined &&
    session.durationSeconds > filter.maxDurationSeconds
  ) {
    return 'too-long';
  }

  // Une séance sans distance mesurée (salle, sport de ballon) ne peut pas être
  // jugée sur ce critère : on ne l'écarte pas pour autant.
  if (
    filter.minDistanceMeters !== undefined &&
    session.distanceMeters !== undefined &&
    session.distanceMeters < filter.minDistanceMeters
  ) {
    return 'too-close';
  }

  if (filter.sportIds !== undefined && !filter.sportIds.includes(session.sportId)) {
    return 'sport-excluded';
  }

  return undefined;
}

/** Applique le filtre à un lot de séances, en conservant l'ordre chronologique. */
export function filterSessions(
  sessions: readonly SessionSummary[],
  filter: SessionFilter,
): FilterResult {
  const kept: SessionSummary[] = [];
  const excluded: ExcludedSession[] = [];

  for (const session of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const reason = exclusionReasonFor(session, filter);
    if (reason === undefined) kept.push(session);
    else excluded.push({ session, reason });
  }

  return { kept, excluded };
}

/** Compte les exclusions par motif — alimente le récapitulatif de l'interface. */
export function countByReason(excluded: readonly ExcludedSession[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { reason } of excluded) counts[reason] = (counts[reason] ?? 0) + 1;
  return counts;
}

/** Bornes de dates couvertes par un lot de séances, pour initialiser l'interface. */
export function dateRangeOf(
  sessions: readonly SessionSummary[],
): { readonly from: string; readonly to: string } | undefined {
  if (sessions.length === 0) return undefined;
  const dates = sessions.map(localDateOf).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}
