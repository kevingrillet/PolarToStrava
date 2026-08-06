import { Decoder, Stream } from '@garmin/fitsdk';
import { describe, expect, it } from 'vitest';
import { EMPTY_INDOOR_JSON, OUTDOOR_RIDE_JSON, TREADMILL_JSON } from '../polar/fixtures';
import { readSession, type NormalizedSession } from '../polar/session';
import { buildFit, toLocalDateTime, toSemicircles } from './build';
import { fitSportFor } from './sports';

/**
 * Les FIT produits sont **relus avec le décodeur officiel** plutôt que comparés à
 * des octets attendus. C'est la seule vérification qui ait du sens sur un format
 * binaire : elle valide l'en-tête, les définitions de messages, le CRC et les
 * échelles d'un coup, et elle a effectivement attrapé deux erreurs de contrat du
 * SDK (positions en semicircles et non en degrés, `localDateTime` en nombre et
 * non en `Date`).
 */
interface DecodedRecord {
  timestamp: Date;
  positionLat?: number;
  positionLong?: number;
  altitude?: number;
  distance?: number;
  heartRate?: number;
  cadence?: number;
  speed?: number;
}

interface DecodedSession {
  sport: string;
  subSport: string;
  totalElapsedTime: number;
  totalDistance?: number;
  totalCalories?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  totalAscent?: number;
  numLaps: number;
  startTime: Date;
}

function decode(json: string): {
  records: DecodedRecord[];
  sessions: DecodedSession[];
  laps: { sport: string; startTime: Date }[];
  activities: { numSessions: number }[];
  fileIds: { type: string }[];
  integrity: boolean;
  errors: unknown[];
} {
  const session = readSession(json) as NormalizedSession;
  const bytes = buildFit(session);
  const stream = Stream.fromByteArray(bytes);
  const decoder = new Decoder(stream);
  const integrity = decoder.checkIntegrity();
  const { messages, errors } = decoder.read({ convertDateTimesToDates: true });
  return {
    records: (messages.recordMesgs ?? []) as DecodedRecord[],
    sessions: (messages.sessionMesgs ?? []) as DecodedSession[],
    laps: (messages.lapMesgs ?? []) as { sport: string; startTime: Date }[],
    activities: (messages.activityMesgs ?? []) as { numSessions: number }[],
    fileIds: (messages.fileIdMesgs ?? []) as { type: string }[],
    integrity,
    errors,
  };
}

describe('toSemicircles', () => {
  it('convertit des degrés en semicircles réversiblement', () => {
    const degrees = 46.93769167;
    const back = toSemicircles(degrees) / (2 ** 31 / 180);
    expect(back).toBeCloseTo(degrees, 7);
  });

  it('gère les longitudes négatives', () => {
    expect(toSemicircles(-4.5) / (2 ** 31 / 180)).toBeCloseTo(-4.5, 7);
  });
});

describe('toLocalDateTime', () => {
  it("décale l'instant du fuseau, en secondes depuis l'époque FIT", () => {
    // 2020-08-18T08:23:06Z avec un décalage de +120 min.
    const epoch = Date.parse('2020-08-18T08:23:06Z');
    const expected = (epoch - 631_065_600_000) / 1000 + 7200;
    expect(toLocalDateTime(epoch, 120)).toBe(expected);
  });
});

describe('buildFit — séance de plein air', () => {
  const decoded = decode(OUTDOOR_RIDE_JSON);

  it('produit un fichier FIT valide et intègre', () => {
    expect(decoded.integrity).toBe(true);
    expect(decoded.errors).toEqual([]);
  });

  it('déclare un fichier de type activité', () => {
    expect(decoded.fileIds[0].type).toBe('activity');
    expect(decoded.activities[0].numSessions).toBe(1);
  });

  it('porte le sport dans la session, ce que le TCX ne sait pas faire', () => {
    expect(decoded.sessions).toHaveLength(1);
    expect(decoded.sessions[0].sport).toBe('cycling');
    expect(decoded.sessions[0].subSport).toBe('generic');
  });

  it('conserve les positions au degré près après aller-retour', () => {
    const positioned = decoded.records.filter((r) => r.positionLat !== undefined);
    expect(positioned).toHaveLength(3);
    const lat = (positioned[0].positionLat as number) / (2 ** 31 / 180);
    const lon = (positioned[0].positionLong as number) / (2 ** 31 / 180);
    expect(lat).toBeCloseTo(46.93769167, 6);
    expect(lon).toBeCloseTo(4.732505, 6);
  });

  it('conserve les mesures et leurs échelles', () => {
    const first = decoded.records[0];
    expect(first.heartRate).toBe(120);
    // 18 km/h → 5 m/s ; le SDK applique l'échelle 1000 du profil.
    expect(first.speed).toBeCloseTo(5, 2);
    expect(first.distance).toBeCloseTo(5, 2);
  });

  it('écarte le point de départ sans mesure, comme en TCX', () => {
    expect(decoded.records).toHaveLength(5);
  });

  it('écrit un tour par tour Polar', () => {
    expect(decoded.laps).toHaveLength(2);
    expect(decoded.sessions[0].numLaps).toBe(2);
  });

  it('résume la séance : distance, calories, FC, dénivelé', () => {
    const session = decoded.sessions[0];
    expect(session.totalElapsedTime).toBeCloseTo(6, 3);
    expect(session.totalDistance).toBeCloseTo(27, 2);
    expect(session.totalCalories).toBe(12);
    expect(session.avgHeartRate).toBe(122);
    expect(session.maxHeartRate).toBe(123);
    expect(session.totalAscent).toBe(5);
  });
});

describe('buildFit — cas où le FIT bat le TCX', () => {
  it('marque une course sur tapis comme telle', () => {
    const decoded = decode(TREADMILL_JSON);
    expect(decoded.sessions[0].sport).toBe('running');
    expect(decoded.sessions[0].subSport).toBe('treadmill');
  });

  it('reste valide sur une séance sans aucune donnée', () => {
    const decoded = decode(EMPTY_INDOOR_JSON);
    expect(decoded.integrity).toBe(true);
    expect(decoded.errors).toEqual([]);
    expect(decoded.records).toHaveLength(0);
    // « Autre sport d'intérieur » → training/generic, que Strava lit en Workout.
    expect(decoded.sessions[0].sport).toBe('training');
  });
});

describe('fitSportFor', () => {
  it('traduit les sports que le TCX aplatit en « autre »', () => {
    expect(fitSportFor('Hike')).toEqual({ sport: 'hiking', subSport: 'generic' });
    expect(fitSportFor('Walk')).toEqual({ sport: 'walking', subSport: 'generic' });
    expect(fitSportFor('Squash')).toEqual({ sport: 'racket', subSport: 'squash' });
    expect(fitSportFor('Soccer')).toEqual({ sport: 'soccer', subSport: 'generic' });
    expect(fitSportFor('WeightTraining')).toEqual({
      sport: 'training',
      subSport: 'strengthTraining',
    });
  });

  it('affine le sous-sport pour les machines fixes', () => {
    expect(fitSportFor('Run', true)).toEqual({ sport: 'running', subSport: 'treadmill' });
    expect(fitSportFor('Ride', true)).toEqual({ sport: 'cycling', subSport: 'indoorCycling' });
  });

  it('préserve un sous-sport déjà précis malgré le drapeau intérieur', () => {
    // Un trail reste un trail : « tapis » serait une perte d'information.
    expect(fitSportFor('TrailRun', true)).toEqual({ sport: 'running', subSport: 'trail' });
  });

  it("n'invente pas de sport quand le FIT n'en a pas d'équivalent", () => {
    expect(fitSportFor('Skateboard')).toEqual({ sport: 'generic', subSport: 'generic' });
  });
});
