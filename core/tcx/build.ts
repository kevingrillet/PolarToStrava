/**
 * Génération de fichiers TCX (Garmin Training Center Database v2).
 *
 * C'est l'étape que le billet de référence sous-traitait à un convertisseur web
 * tiers ; on la fait ici, sans dépendance, pour ne pas envoyer ses données
 * personnelles à un service externe.
 *
 * Le TCX est validé par un schéma XSD strict : **l'ordre des éléments est
 * imposé**, et plusieurs d'entre eux sont obligatoires même quand la donnée
 * manque. Strava rejette silencieusement (`Not a valid TCX file`) un fichier qui
 * s'en écarte. On respecte donc :
 *
 * - `ActivityLap_t` : `TotalTimeSeconds`, `DistanceMeters`, `MaximumSpeed?`,
 *   `Calories`, `AverageHeartRateBpm?`, `MaximumHeartRateBpm?`, `Intensity`,
 *   `Cadence?`, `TriggerMethod`, `Track*` — `TotalTimeSeconds`, `DistanceMeters`,
 *   `Calories`, `Intensity` et `TriggerMethod` sont **requis**.
 * - `Trackpoint_t` : `Time`, `Position?`, `AltitudeMeters?`, `DistanceMeters?`,
 *   `HeartRateBpm?`, `Cadence?`, `SensorState?`, `Extensions?`.
 * - `Activity_t` : `Id`, `Lap+`, `Notes?`, `Training?`, `Creator?`.
 *
 * La vitesse instantanée n'existe pas dans le TCX de base : elle passe par
 * l'extension Garmin `ActivityExtension/v2` (`ns3:TPX/ns3:Speed`), en m/s.
 */
import {
  toIsoUtc,
  type NormalizedExercise,
  type NormalizedSession,
  type TrackPoint,
} from '../polar/session';

const TCX_NS = 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2';
const EXT_NS = 'http://www.garmin.com/xmlschemas/ActivityExtension/v2';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const SCHEMA_LOCATION = `${TCX_NS} http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd`;

/** Échappe le texte destiné à un nœud XML. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Sérialise un nombre avec au plus `decimals` décimales, sans zéros inutiles. */
function num(value: number, decimals = 6): string {
  return Number.parseFloat(value.toFixed(decimals)).toString();
}

function trackpointXml(point: TrackPoint, indent: string): string {
  const lines = [`${indent}<Trackpoint>`, `${indent}  <Time>${toIsoUtc(point.at)}</Time>`];

  if (point.latitude !== undefined && point.longitude !== undefined) {
    lines.push(
      `${indent}  <Position>`,
      `${indent}    <LatitudeDegrees>${num(point.latitude, 7)}</LatitudeDegrees>`,
      `${indent}    <LongitudeDegrees>${num(point.longitude, 7)}</LongitudeDegrees>`,
      `${indent}  </Position>`,
    );
  }
  if (point.altitudeMeters !== undefined) {
    lines.push(`${indent}  <AltitudeMeters>${num(point.altitudeMeters, 2)}</AltitudeMeters>`);
  }
  if (point.distanceMeters !== undefined) {
    lines.push(`${indent}  <DistanceMeters>${num(point.distanceMeters, 2)}</DistanceMeters>`);
  }
  if (point.heartRateBpm !== undefined) {
    lines.push(
      `${indent}  <HeartRateBpm>`,
      `${indent}    <Value>${Math.round(point.heartRateBpm)}</Value>`,
      `${indent}  </HeartRateBpm>`,
    );
  }
  if (point.cadence !== undefined) {
    lines.push(`${indent}  <Cadence>${Math.round(point.cadence)}</Cadence>`);
  }
  if (point.speedMetersPerSecond !== undefined) {
    lines.push(
      `${indent}  <Extensions>`,
      `${indent}    <TPX xmlns="${EXT_NS}">`,
      `${indent}      <Speed>${num(point.speedMetersPerSecond, 3)}</Speed>`,
      `${indent}    </TPX>`,
      `${indent}  </Extensions>`,
    );
  }

  lines.push(`${indent}</Trackpoint>`);
  return lines.join('\n');
}

/**
 * Répartit les points de la piste entre les tours, par fenêtre temporelle.
 * Les points antérieurs au premier tour sont rattachés à celui-ci pour ne rien
 * perdre (le GPS démarre parfois avant le premier tour).
 */
function splitTrackByLap(exercise: NormalizedExercise): TrackPoint[][] {
  const { laps, track } = exercise;
  const buckets: TrackPoint[][] = laps.map(() => []);

  for (const point of track) {
    let index = 0;
    for (let i = laps.length - 1; i >= 0; i -= 1) {
      if (point.at >= laps[i].startedAt) {
        index = i;
        break;
      }
    }
    buckets[index].push(point);
  }
  return buckets;
}

function lapXml(
  exercise: NormalizedExercise,
  lapIndex: number,
  points: readonly TrackPoint[],
  indent: string,
): string {
  const lap = exercise.laps[lapIndex];
  const lines = [
    `${indent}<Lap StartTime="${toIsoUtc(lap.startedAt)}">`,
    `${indent}  <TotalTimeSeconds>${num(lap.totalTimeSeconds, 3)}</TotalTimeSeconds>`,
    // Requis par le schéma même sans distance mesurée (séances en salle).
    `${indent}  <DistanceMeters>${num(lap.distanceMeters ?? 0, 2)}</DistanceMeters>`,
  ];

  if (exercise.maxSpeedMetersPerSecond !== undefined) {
    lines.push(
      `${indent}  <MaximumSpeed>${num(exercise.maxSpeedMetersPerSecond, 3)}</MaximumSpeed>`,
    );
  }
  // `Calories` est requis : on ne l'impute qu'au premier tour pour ne pas
  // multiplier le total de la séance par le nombre de tours.
  const calories = lapIndex === 0 ? Math.round(exercise.calories ?? 0) : 0;
  lines.push(`${indent}  <Calories>${calories}</Calories>`);

  if (exercise.heartRate?.avg !== undefined) {
    lines.push(
      `${indent}  <AverageHeartRateBpm>`,
      `${indent}    <Value>${exercise.heartRate.avg}</Value>`,
      `${indent}  </AverageHeartRateBpm>`,
    );
  }
  if (exercise.heartRate?.max !== undefined) {
    lines.push(
      `${indent}  <MaximumHeartRateBpm>`,
      `${indent}    <Value>${exercise.heartRate.max}</Value>`,
      `${indent}  </MaximumHeartRateBpm>`,
    );
  }

  lines.push(
    `${indent}  <Intensity>Active</Intensity>`,
    `${indent}  <TriggerMethod>Manual</TriggerMethod>`,
  );

  if (points.length > 0) {
    lines.push(`${indent}  <Track>`);
    for (const point of points) lines.push(trackpointXml(point, `${indent}    `));
    lines.push(`${indent}  </Track>`);
  }

  lines.push(`${indent}</Lap>`);
  return lines.join('\n');
}

function creatorXml(session: NormalizedSession, indent: string): string {
  const name = escapeXml(session.deviceModel ?? 'Polar');
  return [
    `${indent}<Creator xsi:type="Device_t">`,
    `${indent}  <Name>${name}</Name>`,
    `${indent}  <UnitId>0</UnitId>`,
    `${indent}  <ProductID>0</ProductID>`,
    `${indent}</Creator>`,
  ].join('\n');
}

/**
 * Construit le TCX d'une séance normalisée.
 *
 * Chaque exercice devient une `<Activity>` : une séance multisport (triathlon,
 * transitions) produit donc plusieurs activités dans un même fichier, ce que
 * Strava sait ingérer.
 */
export function buildTcx(session: NormalizedSession): string {
  const activities: string[] = [];

  for (const exercise of session.exercises) {
    const buckets = splitTrackByLap(exercise);
    const laps = exercise.laps.map((_, i) => lapXml(exercise, i, buckets[i], '      '));

    activities.push(
      [
        `    <Activity Sport="${exercise.sport.tcxSport}">`,
        `      <Id>${toIsoUtc(exercise.startedAt)}</Id>`,
        ...laps,
        ...(session.name !== undefined ? [`      <Notes>${escapeXml(session.name)}</Notes>`] : []),
        creatorXml(session, '      '),
        '    </Activity>',
      ].join('\n'),
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<TrainingCenterDatabase xmlns="${TCX_NS}" xmlns:xsi="${XSI_NS}" xsi:schemaLocation="${SCHEMA_LOCATION}">`,
    '  <Activities>',
    ...activities,
    '  </Activities>',
    '</TrainingCenterDatabase>',
    '',
  ].join('\n');
}
