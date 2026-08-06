/**
 * Génération de fichiers FIT à partir d'une séance normalisée.
 *
 * ## Pourquoi FIT plutôt que TCX
 *
 * Le TCX ne sait exprimer que trois sports (`Running`, `Biking`, `Other`) : par
 * l'interface web de Strava — la seule voie gratuite depuis que l'API exige un
 * abonnement — une randonnée, une marche ou une séance de musculation arriveraient
 * donc en « Workout » générique, sans moyen de les corriger autrement qu'à la
 * main. Le FIT porte un couple `sport` / `sub_sport` que Strava lit, ce qui règle
 * le problème à la source.
 *
 * ## Pourquoi le SDK officiel
 *
 * Le FIT est un format binaire à définitions de messages, CRC et types à échelle
 * et décalage. L'écrire à la main serait une source de bugs silencieux, et les
 * enums de sports changent à chaque version du profil. On délègue donc à
 * `@garmin/fitsdk`, dont l'`Encoder` gère l'en-tête, les définitions et le CRC.
 *
 * Trois particularités de son contrat, vérifiées par aller-retour encodage →
 * décodage (voir `build.test.ts`) :
 *
 * - les champs `dateTime` acceptent un `Date`, mais `localDateTime` attend un
 *   **nombre** de secondes depuis l'époque FIT ;
 * - les positions se donnent en **semicircles** brutes, pas en degrés ;
 * - altitude, vitesse et distance se donnent en unités SI, le SDK appliquant
 *   lui-même l'échelle et le décalage du profil.
 */
import {
  Encoder,
  Profile,
  type ActivityMesg,
  type Encodable,
  type FileIdMesg,
  type LapMesg,
  type RecordMesg,
  type SessionMesg,
} from '@garmin/fitsdk';
import type { NormalizedExercise, NormalizedSession } from '../polar/session';
import { fitSportFor } from './sports';

/** Époque FIT : 1989-12-31T00:00:00Z, en millisecondes epoch Unix. */
const FIT_EPOCH_MS = 631_065_600_000;

/** Le FIT stocke les positions en 2³¹/180 unités par degré. */
const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

/** Convertit des degrés décimaux en semicircles. */
export function toSemicircles(degrees: number): number {
  return Math.round(degrees * SEMICIRCLES_PER_DEGREE);
}

/** Convertit un instant epoch en `localDateTime` FIT (secondes, décalées du fuseau). */
export function toLocalDateTime(epochMillis: number, timezoneOffsetMinutes: number): number {
  return Math.round((epochMillis - FIT_EPOCH_MS) / 1000) + timezoneOffsetMinutes * 60;
}

/** Moyenne des valeurs définies d'une série, ou `undefined` si elle est vide. */
function average(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Écrit les points de piste d'un exercice.
 *
 * Un champ absent n'est pas écrit du tout : le FIT distingue « pas de mesure » de
 * « mesure nulle », et c'est justement ce que les `NaN` de Polar signifient.
 */
function writeRecords(encoder: Encoder, exercise: NormalizedExercise): void {
  for (const point of exercise.track) {
    // Message typé dans une variable, et non passé en littéral : `writeMesg`
    // accepte `Encodable<Mesg>`, dont le contrôle d'excédent rejetterait des
    // champs pourtant valides. Le type concret vérifie donc réellement les champs.
    const record: Encodable<RecordMesg> = {
      mesgNum: Profile.MesgNum.RECORD,
      timestamp: new Date(point.at),
      ...(point.latitude !== undefined && point.longitude !== undefined
        ? {
            positionLat: toSemicircles(point.latitude),
            positionLong: toSemicircles(point.longitude),
          }
        : {}),
      ...(point.altitudeMeters !== undefined ? { altitude: point.altitudeMeters } : {}),
      ...(point.distanceMeters !== undefined ? { distance: point.distanceMeters } : {}),
      ...(point.heartRateBpm !== undefined ? { heartRate: point.heartRateBpm } : {}),
      ...(point.cadence !== undefined ? { cadence: point.cadence } : {}),
      ...(point.speedMetersPerSecond !== undefined ? { speed: point.speedMetersPerSecond } : {}),
    };
    encoder.writeMesg(record);
  }
}

/** Écrit les tours d'un exercice et renvoie le nombre écrit. */
function writeLaps(encoder: Encoder, exercise: NormalizedExercise, firstIndex: number): number {
  const fit = fitSportFor(exercise.sport.stravaSportType, exercise.sport.indoor);

  exercise.laps.forEach((lap, index) => {
    const mesg: Encodable<LapMesg> = {
      mesgNum: Profile.MesgNum.LAP,
      messageIndex: firstIndex + index,
      timestamp: new Date(lap.startedAt + lap.totalTimeSeconds * 1000),
      startTime: new Date(lap.startedAt),
      totalElapsedTime: lap.totalTimeSeconds,
      totalTimerTime: lap.totalTimeSeconds,
      ...(lap.distanceMeters !== undefined ? { totalDistance: lap.distanceMeters } : {}),
      sport: fit.sport,
      subSport: fit.subSport,
      event: 'lap',
      eventType: 'stop',
    };
    encoder.writeMesg(mesg);
  });

  return exercise.laps.length;
}

/** Écrit le message de session résumant un exercice. */
function writeSession(
  encoder: Encoder,
  exercise: NormalizedExercise,
  sessionIndex: number,
  firstLapIndex: number,
): void {
  const fit = fitSportFor(exercise.sport.stravaSportType, exercise.sport.indoor);
  const speeds = exercise.track.flatMap((p) =>
    p.speedMetersPerSecond !== undefined ? [p.speedMetersPerSecond] : [],
  );
  const avgSpeed = average(speeds);

  const mesg: Encodable<SessionMesg> = {
    mesgNum: Profile.MesgNum.SESSION,
    messageIndex: sessionIndex,
    timestamp: new Date(exercise.startedAt + exercise.durationSeconds * 1000),
    startTime: new Date(exercise.startedAt),
    totalElapsedTime: exercise.durationSeconds,
    totalTimerTime: exercise.durationSeconds,
    ...(exercise.distanceMeters !== undefined ? { totalDistance: exercise.distanceMeters } : {}),
    sport: fit.sport,
    subSport: fit.subSport,
    firstLapIndex,
    numLaps: exercise.laps.length,
    event: 'session',
    eventType: 'stop',
    ...(exercise.calories !== undefined ? { totalCalories: Math.round(exercise.calories) } : {}),
    ...(exercise.heartRate?.avg !== undefined ? { avgHeartRate: exercise.heartRate.avg } : {}),
    ...(exercise.heartRate?.max !== undefined ? { maxHeartRate: exercise.heartRate.max } : {}),
    ...(avgSpeed !== undefined ? { avgSpeed } : {}),
    ...(exercise.maxSpeedMetersPerSecond !== undefined
      ? { maxSpeed: exercise.maxSpeedMetersPerSecond }
      : {}),
    ...(exercise.ascentMeters !== undefined
      ? { totalAscent: Math.round(exercise.ascentMeters) }
      : {}),
    ...(exercise.descentMeters !== undefined
      ? { totalDescent: Math.round(exercise.descentMeters) }
      : {}),
  };
  encoder.writeMesg(mesg);
}

/**
 * Construit le FIT d'une séance normalisée.
 *
 * Un exercice donne une `session` ; une séance multisport en produit donc
 * plusieurs dans le même fichier. L'ordre des messages suit celui attendu d'un
 * fichier d'activité : `file_id`, puis pour chaque exercice ses `record` et `lap`,
 * puis sa `session`, et enfin `activity`.
 */
export function buildFit(session: NormalizedSession): Uint8Array {
  const encoder = new Encoder();

  const fileId: Encodable<FileIdMesg> = {
    mesgNum: Profile.MesgNum.FILE_ID,
    type: 'activity',
    manufacturer: 'development',
    product: 0,
    // Identifiant de séance Polar, ramené à ce que tient un uint32z : sert de
    // repère si l'on doit rapprocher un fichier de sa source.
    serialNumber: Number.parseInt(session.id, 10) % 0xffffffff || 1,
    timeCreated: new Date(session.startedAt),
  };
  encoder.writeMesg(fileId);

  let lapIndex = 0;
  session.exercises.forEach((exercise, index) => {
    writeRecords(encoder, exercise);
    const laps = writeLaps(encoder, exercise, lapIndex);
    writeSession(encoder, exercise, index, lapIndex);
    lapIndex += laps;
  });

  const endedAt = session.startedAt + session.durationSeconds * 1000;
  const activity: Encodable<ActivityMesg> = {
    mesgNum: Profile.MesgNum.ACTIVITY,
    timestamp: new Date(endedAt),
    totalTimerTime: session.durationSeconds,
    numSessions: session.exercises.length,
    type: 'manual',
    event: 'activity',
    eventType: 'stop',
    localTimestamp: toLocalDateTime(endedAt, session.timezoneOffsetMinutes),
  };
  encoder.writeMesg(activity);

  return encoder.close();
}
