/**
 * Normalisation d'une séance de l'export Polar Flow.
 *
 * Transforme le JSON brut (forme documentée dans `docs/polar-export.md`) en une
 * structure plate et exploitable : une piste de points à 1 Hz fusionnant les
 * canaux d'échantillons et la trace GPS, plus les métadonnées nécessaires à la
 * génération TCX et à l'affichage dans l'interface.
 *
 * Trois pièges du format, tous vérifiés sur un export réel :
 *
 * 1. **Dates naïves.** `startTime` vaut `"2020-08-18T10:23:06"` sans fuseau ; le
 *    décalage est à côté, dans `timezoneOffsetMinutes`. Interpréter la chaîne
 *    directement décalerait toutes les activités de plusieurs heures.
 * 2. **Échantillons sans horodatage.** Les canaux sont des tableaux de valeurs
 *    accompagnés d'un seul `intervalMillis` ; l'instant du point `i` se déduit de
 *    `startTime + i × intervalMillis`. Les trous valent `NaN` dans le JSON (donc
 *    `null` après assainissement) et ne doivent pas devenir des zéros.
 * 3. **GPS sur une base de temps distincte.** Les waypoints portent un
 *    `elapsedMillis` relatif à `routes.route.startTime`, qui n'est pas forcément
 *    le `startTime` de l'exercice. On repasse donc tout en temps absolu avant de
 *    fusionner.
 */
import { parsePolarJson } from './json';
import { resolveSport, type ResolvedSport, type StravaSportType } from './sports';

// ---------------------------------------------------------------------------
// Formes brutes (tout est optionnel : on ne fait confiance à rien)
// ---------------------------------------------------------------------------

interface RawIdentifier {
  id?: string;
}

interface RawSample {
  type?: string;
  intervalMillis?: number;
  values?: (number | null)[];
}

interface RawWayPoint {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  elapsedMillis?: number | null;
}

interface RawRoute {
  startTime?: string;
  wayPoints?: RawWayPoint[];
}

interface RawLap {
  splitTimeMillis?: number;
  durationMillis?: number;
  distanceMeters?: number;
}

interface RawStatistic {
  type?: string;
  min?: number | null;
  avg?: number | null;
  max?: number | null;
}

interface RawPause {
  startTime?: string;
  endTime?: string;
}

interface RawExercise {
  identifier?: RawIdentifier;
  startTime?: string;
  stopTime?: string;
  durationMillis?: number;
  distanceMeters?: number;
  calories?: number;
  ascentMeters?: number;
  descentMeters?: number;
  timezoneOffsetMinutes?: number;
  sport?: RawIdentifier;
  samples?: { samples?: RawSample[] };
  routes?: { route?: RawRoute; transitionRoute?: RawRoute };
  laps?: { laps?: RawLap[]; autoLaps?: RawLap[] };
  statistics?: { statistics?: RawStatistic[] };
  pauseTimes?: RawPause[];
}

interface RawSession {
  identifier?: RawIdentifier;
  startTime?: string;
  stopTime?: string;
  name?: string;
  deviceId?: string;
  durationMillis?: number;
  distanceMeters?: number;
  calories?: number;
  hrAvg?: number;
  hrMax?: number;
  timezoneOffsetMinutes?: number;
  sport?: RawIdentifier;
  product?: { modelName?: string };
  application?: { name?: string };
  exercises?: RawExercise[];
}

// ---------------------------------------------------------------------------
// Formes normalisées
// ---------------------------------------------------------------------------

/** Un point de la piste, horodaté en absolu. Tout champ absent = pas de mesure. */
export interface TrackPoint {
  /** Instant absolu, en millisecondes epoch. */
  readonly at: number;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly altitudeMeters?: number;
  /** Distance cumulée depuis le départ, en mètres. */
  readonly distanceMeters?: number;
  readonly heartRateBpm?: number;
  readonly cadence?: number;
  /** Vitesse instantanée en **m/s** (Polar la fournit en km/h). */
  readonly speedMetersPerSecond?: number;
}

export interface NormalizedLap {
  readonly startedAt: number;
  readonly totalTimeSeconds: number;
  readonly distanceMeters?: number;
}

export interface NormalizedExercise {
  readonly id: string | undefined;
  readonly startedAt: number;
  readonly durationSeconds: number;
  readonly distanceMeters?: number;
  readonly calories?: number;
  readonly ascentMeters?: number;
  readonly descentMeters?: number;
  readonly sport: ResolvedSport;
  readonly laps: readonly NormalizedLap[];
  readonly track: readonly TrackPoint[];
  readonly heartRate?: { readonly avg?: number; readonly max?: number };
  readonly maxSpeedMetersPerSecond?: number;
  /** Canaux d'échantillons présents et réellement porteurs de valeurs. */
  readonly channels: readonly string[];
}

export interface NormalizedSession {
  readonly id: string;
  /** Instant de départ absolu (ms epoch). */
  readonly startedAt: number;
  /** Heure locale telle que Polar l'a enregistrée, sans fuseau. */
  readonly localStart: string;
  readonly timezoneOffsetMinutes: number;
  readonly durationSeconds: number;
  readonly distanceMeters?: number;
  readonly calories?: number;
  readonly heartRate?: { readonly avg?: number; readonly max?: number };
  readonly sport: ResolvedSport;
  readonly name?: string;
  readonly deviceModel?: string;
  /** `Polar Flow` (montre) ou `Polar Connect` (saisie/synchro tierce). */
  readonly application?: string;
  readonly exercises: readonly NormalizedExercise[];
  readonly hasGps: boolean;
  readonly hasHeartRate: boolean;
  /**
   * `false` quand la séance ne porte aucune donnée exploitable : ni GPS, ni
   * fréquence cardiaque, ni distance. Un tel fichier produit un TCX vide, que
   * Strava refuse — il faut donc l'exclure avant l'envoi.
   */
  readonly usable: boolean;
}

// ---------------------------------------------------------------------------
// Outils de temps
// ---------------------------------------------------------------------------

/**
 * Convertit une date locale naïve Polar (`"2020-08-18T10:23:06"`, avec ou sans
 * fraction de seconde) en millisecondes epoch, à l'aide du décalage fourni
 * séparément par la séance.
 *
 * Renvoie `undefined` si la chaîne est absente ou inexploitable — plusieurs
 * séances de l'export ont un `routes.route.startTime` vide.
 */
export function toEpochMillis(
  naiveLocal: string | undefined,
  timezoneOffsetMinutes: number,
): number | undefined {
  if (naiveLocal === undefined || naiveLocal === '') return undefined;
  // En suffixant `Z` on force l'interprétation UTC, puis on retire le décalage
  // pour retrouver l'instant réel.
  const asUtc = Date.parse(`${naiveLocal}Z`);
  if (Number.isNaN(asUtc)) return undefined;
  return asUtc - timezoneOffsetMinutes * 60_000;
}

/** Formate un instant epoch en ISO 8601 UTC, tel que l'attend le TCX. */
export function toIsoUtc(epochMillis: number): string {
  return new Date(epochMillis).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Indexe les canaux par type, en ne gardant que ceux porteurs d'au moins une valeur. */
function indexChannels(samples: RawSample[]): Map<string, RawSample> {
  const byType = new Map<string, RawSample>();
  for (const sample of samples) {
    if (sample.type === undefined) continue;
    const hasValue = (sample.values ?? []).some((v) => finiteOrUndefined(v) !== undefined);
    if (!hasValue) continue;
    byType.set(sample.type, sample);
  }
  return byType;
}

/**
 * Fusionne canaux d'échantillons et trace GPS en une piste à pas régulier.
 *
 * La base de temps vient des canaux (tous à `intervalMillis`, généralement
 * 1000 ms). Les waypoints sont replacés sur cette base via leur `elapsedMillis`
 * ramené en absolu. Quand la séance n'a aucun canal utile mais une trace GPS,
 * la piste est construite depuis les waypoints seuls.
 */
function buildTrack(
  exercise: RawExercise,
  exerciseStartedAt: number,
  timezoneOffsetMinutes: number,
  pauses: readonly { from: number; to: number }[],
): { track: TrackPoint[]; channels: string[] } {
  const channels = indexChannels(exercise.samples?.samples ?? []);
  const interval = finiteOrUndefined([...channels.values()][0]?.intervalMillis) ?? 1000;

  const wayPoints = exercise.routes?.route?.wayPoints ?? [];
  const routeStartedAt =
    toEpochMillis(exercise.routes?.route?.startTime, timezoneOffsetMinutes) ?? exerciseStartedAt;

  // Position par index de pas : on projette chaque waypoint sur la grille.
  const positions = new Map<number, RawWayPoint>();
  for (const wp of wayPoints) {
    const elapsed = finiteOrUndefined(wp.elapsedMillis);
    if (elapsed === undefined) continue;
    if (finiteOrUndefined(wp.latitude) === undefined) continue;
    const step = Math.round((routeStartedAt + elapsed - exerciseStartedAt) / interval);
    if (step < 0) continue;
    positions.set(step, wp);
  }

  const channelLength = Math.max(0, ...[...channels.values()].map((c) => (c.values ?? []).length));
  const stepCount = Math.max(
    channelLength,
    positions.size === 0 ? 0 : Math.max(...positions.keys()) + 1,
  );

  // Borne de début incluse : à l'instant où la pause commence, l'enregistrement
  // est déjà arrêté. Borne de fin exclue pour ne pas perdre le point de reprise.
  const isPaused = (at: number) => pauses.some((p) => at >= p.from && at < p.to);

  const track: TrackPoint[] = [];
  for (let step = 0; step < stepCount; step += 1) {
    const at = exerciseStartedAt + step * interval;
    if (isPaused(at)) continue;

    const wp = positions.get(step);
    const speedKmh = finiteOrUndefined(channels.get('SPEED')?.values?.[step]);
    const cadence = finiteOrUndefined(channels.get('CADENCE')?.values?.[step]);
    // L'altitude du waypoint est plus fiable que le canal barométrique lorsque
    // les deux existent : c'est celle que Polar associe à la position.
    const altitude =
      finiteOrUndefined(wp?.altitude) ??
      finiteOrUndefined(channels.get('ALTITUDE')?.values?.[step]);

    const point: TrackPoint = {
      at,
      ...(finiteOrUndefined(wp?.latitude) !== undefined
        ? { latitude: wp?.latitude as number, longitude: wp?.longitude as number }
        : {}),
      ...(altitude !== undefined ? { altitudeMeters: altitude } : {}),
      ...(finiteOrUndefined(channels.get('DISTANCE')?.values?.[step]) !== undefined
        ? { distanceMeters: channels.get('DISTANCE')?.values?.[step] as number }
        : {}),
      ...(finiteOrUndefined(channels.get('HEART_RATE')?.values?.[step]) !== undefined
        ? { heartRateBpm: Math.round(channels.get('HEART_RATE')?.values?.[step] as number) }
        : {}),
      ...(cadence !== undefined ? { cadence: Math.min(254, Math.round(cadence)) } : {}),
      // Polar exprime la vitesse en km/h ; TCX attend des m/s.
      ...(speedKmh !== undefined ? { speedMetersPerSecond: speedKmh / 3.6 } : {}),
    };

    // Un point n'est retenu que s'il porte une mesure **autre** que l'altitude.
    //
    // Contrairement aux autres canaux, où l'absence de mesure vaut `NaN`,
    // l'altimètre barométrique renvoie `0` le temps de se caler — quelques
    // secondes en début de séance. Conserver ces points ferait démarrer le profil
    // altimétrique au niveau de la mer avant de sauter à l'altitude réelle, soit
    // un dénivelé positif fictif de plusieurs centaines de mètres côté Strava.
    const hasMeasurement =
      point.latitude !== undefined ||
      point.heartRateBpm !== undefined ||
      point.distanceMeters !== undefined ||
      point.speedMetersPerSecond !== undefined ||
      point.cadence !== undefined;
    if (hasMeasurement) track.push(point);
  }

  return { track, channels: [...channels.keys()] };
}

function normalizeLaps(
  exercise: RawExercise,
  exerciseStartedAt: number,
  durationSeconds: number,
  distanceMeters: number | undefined,
): NormalizedLap[] {
  const raw = exercise.laps?.laps?.length ? exercise.laps.laps : (exercise.laps?.autoLaps ?? []);

  const laps: NormalizedLap[] = [];
  for (const lap of raw) {
    const duration = finiteOrUndefined(lap.durationMillis);
    const split = finiteOrUndefined(lap.splitTimeMillis);
    if (duration === undefined || split === undefined) continue;
    // `splitTimeMillis` est le temps cumulé à la fin du tour.
    laps.push({
      startedAt: exerciseStartedAt + (split - duration),
      totalTimeSeconds: duration / 1000,
      ...(finiteOrUndefined(lap.distanceMeters) !== undefined
        ? { distanceMeters: lap.distanceMeters }
        : {}),
    });
  }

  // TCX exige au moins un tour : à défaut, un tour unique couvrant la séance.
  if (laps.length === 0) {
    laps.push({
      startedAt: exerciseStartedAt,
      totalTimeSeconds: durationSeconds,
      ...(distanceMeters !== undefined ? { distanceMeters } : {}),
    });
  }
  return laps;
}

function statistic(exercise: RawExercise, type: string): RawStatistic | undefined {
  return (exercise.statistics?.statistics ?? []).find((s) => s.type === type);
}

function normalizeExercise(
  exercise: RawExercise,
  sessionOffset: number,
  fallbackSportId: number,
  overrides: Readonly<Record<number, StravaSportType>>,
): NormalizedExercise | undefined {
  const offset = finiteOrUndefined(exercise.timezoneOffsetMinutes) ?? sessionOffset;
  const startedAt = toEpochMillis(exercise.startTime, offset);
  if (startedAt === undefined) return undefined;

  const durationSeconds = (finiteOrUndefined(exercise.durationMillis) ?? 0) / 1000;
  const distanceMeters = finiteOrUndefined(exercise.distanceMeters);

  const pauses = (exercise.pauseTimes ?? []).flatMap((p) => {
    const from = toEpochMillis(p.startTime, offset);
    const to = toEpochMillis(p.endTime, offset);
    return from !== undefined && to !== undefined && to > from ? [{ from, to }] : [];
  });

  const { track, channels } = buildTrack(exercise, startedAt, offset, pauses);

  const hrStat = statistic(exercise, 'STATISTICS_TYPE_HEART_RATE');
  const speedStat = statistic(exercise, 'STATISTICS_TYPE_SPEED');
  const maxSpeedKmh = finiteOrUndefined(speedStat?.max);

  const sportId = Number.parseInt(exercise.sport?.id ?? '', 10);

  return {
    id: exercise.identifier?.id,
    startedAt,
    durationSeconds,
    ...(distanceMeters !== undefined ? { distanceMeters } : {}),
    ...(finiteOrUndefined(exercise.calories) !== undefined ? { calories: exercise.calories } : {}),
    ...(finiteOrUndefined(exercise.ascentMeters) !== undefined
      ? { ascentMeters: exercise.ascentMeters }
      : {}),
    ...(finiteOrUndefined(exercise.descentMeters) !== undefined
      ? { descentMeters: exercise.descentMeters }
      : {}),
    sport: resolveSport(Number.isNaN(sportId) ? fallbackSportId : sportId, overrides),
    laps: normalizeLaps(exercise, startedAt, durationSeconds, distanceMeters),
    track,
    ...(hrStat !== undefined
      ? {
          heartRate: {
            ...(finiteOrUndefined(hrStat.avg) !== undefined
              ? { avg: Math.round(hrStat.avg as number) }
              : {}),
            ...(finiteOrUndefined(hrStat.max) !== undefined
              ? { max: Math.round(hrStat.max as number) }
              : {}),
          },
        }
      : {}),
    ...(maxSpeedKmh !== undefined ? { maxSpeedMetersPerSecond: maxSpeedKmh / 3.6 } : {}),
    channels,
  };
}

/**
 * Normalise une séance Polar déjà parsée.
 *
 * `overrides` réaffecte le `sport_type` Strava d'un `sport.id` donné (voir
 * `resolveSport`). Renvoie `undefined` si le fichier n'a ni date de départ
 * exploitable ni exercice : il n'y a alors rien à convertir.
 */
export function normalizeSession(
  raw: unknown,
  overrides: Readonly<Record<number, StravaSportType>> = {},
): NormalizedSession | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const session = raw as RawSession;

  const offset = finiteOrUndefined(session.timezoneOffsetMinutes) ?? 0;
  const startedAt = toEpochMillis(session.startTime, offset);
  if (startedAt === undefined) return undefined;

  const sportId = Number.parseInt(session.sport?.id ?? '', 10);
  const resolvedSportId = Number.isNaN(sportId) ? -1 : sportId;

  const exercises = (session.exercises ?? []).flatMap((ex) => {
    const normalized = normalizeExercise(ex, offset, resolvedSportId, overrides);
    return normalized ? [normalized] : [];
  });

  const distanceMeters = finiteOrUndefined(session.distanceMeters);
  const hrAvg = finiteOrUndefined(session.hrAvg);
  const hrMax = finiteOrUndefined(session.hrMax);

  const hasGps = exercises.some((ex) => ex.track.some((p) => p.latitude !== undefined));
  const hasHeartRate = exercises.some((ex) => ex.track.some((p) => p.heartRateBpm !== undefined));

  return {
    id: session.identifier?.id ?? `${startedAt}`,
    startedAt,
    localStart: session.startTime ?? '',
    timezoneOffsetMinutes: offset,
    durationSeconds: (finiteOrUndefined(session.durationMillis) ?? 0) / 1000,
    ...(distanceMeters !== undefined ? { distanceMeters } : {}),
    ...(finiteOrUndefined(session.calories) !== undefined ? { calories: session.calories } : {}),
    ...(hrAvg !== undefined || hrMax !== undefined
      ? {
          heartRate: {
            ...(hrAvg !== undefined ? { avg: hrAvg } : {}),
            ...(hrMax !== undefined ? { max: hrMax } : {}),
          },
        }
      : {}),
    sport: resolveSport(resolvedSportId, overrides),
    ...(session.name !== undefined && session.name !== '' ? { name: session.name } : {}),
    ...(session.product?.modelName !== undefined ? { deviceModel: session.product.modelName } : {}),
    ...(session.application?.name !== undefined ? { application: session.application.name } : {}),
    exercises,
    hasGps,
    hasHeartRate,
    usable: hasGps || hasHeartRate || (distanceMeters !== undefined && distanceMeters > 0),
  };
}

/** Raccourci : parse le texte d'un fichier d'export puis le normalise. */
export function readSession(
  text: string,
  overrides: Readonly<Record<number, StravaSportType>> = {},
): NormalizedSession | undefined {
  return normalizeSession(parsePolarJson(text), overrides);
}
