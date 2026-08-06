/**
 * Découpage de la sélection en lots, pour l'envoi par l'interface web de Strava.
 *
 * La page « Upload and Sync » n'accepte qu'un nombre limité de fichiers à la fois
 * — **15 pour un compte sans abonnement, 25 pour un abonné** — et applique en plus
 * un plafond de **30 séances par jour**, soit deux lots de 15 (mesuré ; Strava ne
 * le documente pas). On écrit donc les fichiers dans des sous-dossiers numérotés,
 * chacun de la taille d'un lot : il n'y a plus qu'à glisser un dossier après
 * l'autre, sans avoir à compter — deux par jour.
 *
 * Le plafond journalier n'est volontairement pas appliqué ici : rien ne le signale
 * côté Strava (pas d'en-tête, pas de code d'erreur distinct), et découper la
 * sélection par jour figerait une valeur non contractuelle dans les noms de
 * dossiers. Il est donc documenté, pas modélisé.
 */
import type { SessionSummary } from '../dto';

/** Nombre de fichiers acceptés par lot sur la page d'upload de Strava. */
export const BATCH_SIZE_FREE = 15;
export const BATCH_SIZE_SUBSCRIBER = 25;

export interface Batch {
  /** Numéro de lot, à partir de 1. */
  readonly index: number;
  /** Nom du sous-dossier, zéro-padé pour que l'ordre alphabétique soit le bon. */
  readonly folder: string;
  readonly sessions: readonly SessionSummary[];
}

export interface BatchPlan {
  readonly batches: readonly Batch[];
  readonly batchSize: number;
  readonly sessionCount: number;
}

/**
 * Translittère un libellé en fragment de nom de fichier : sans accent, en
 * minuscules, sans caractère susceptible de déplaire à un système de fichiers.
 */
export function slugify(label: string): string {
  return (
    label
      .normalize('NFD')
      // Retire les marques diacritiques laissées par la décomposition NFD. On
      // passe par la propriété Unicode plutôt que par une plage de caractères
      // combinants écrite littéralement, qui rendrait la source dépendante de son
      // propre encodage.
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      // Tout ce qui n'est pas alphanumérique devient un tiret : on ne prend pas le
      // risque d'un caractère refusé par un système de fichiers.
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Nom de fichier d'une séance : date et heure locales, sport, identifiant.
 *
 * Préfixé de la date au format ISO pour que le tri alphabétique soit chronologique,
 * et suffixé de l'identifiant Polar pour rester unique même si deux séances
 * démarrent à la même minute.
 */
export function fileNameFor(
  session: SessionSummary,
  sportLabel: string,
  extension: 'fit' | 'tcx',
): string {
  const [date = 'sans-date', time = ''] = session.localStart.split('T');
  const hhmm = time.slice(0, 5).replace(':', 'h');
  const sport = slugify(sportLabel) || 'sport';
  return `${date}_${hhmm}_${sport}_${session.id}.${extension}`;
}

/** Répartit les séances en lots, dans l'ordre chronologique. */
export function planBatches(
  sessions: readonly SessionSummary[],
  batchSize: number = BATCH_SIZE_FREE,
): BatchPlan {
  const size = Math.max(1, Math.floor(batchSize));
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const batches: Batch[] = [];

  // Largeur de la numérotation calculée sur le nombre total de lots : `lot-01`
  // pour une dizaine, `lot-001` au-delà de cent.
  const count = Math.ceil(ordered.length / size);
  const width = Math.max(2, String(count).length);

  for (let offset = 0; offset < ordered.length; offset += size) {
    const index = batches.length + 1;
    batches.push({
      index,
      folder: `lot-${String(index).padStart(width, '0')}`,
      sessions: ordered.slice(offset, offset + size),
    });
  }

  return { batches, batchSize: size, sessionCount: ordered.length };
}
