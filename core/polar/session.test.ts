import { describe, expect, it } from 'vitest';
import { EMPTY_INDOOR_JSON, OUTDOOR_RIDE_JSON, TREADMILL_JSON } from './fixtures';
import { readSession, toEpochMillis, toIsoUtc } from './session';

describe('toEpochMillis', () => {
  it('recombine une date locale naïve avec son décalage', () => {
    // 10:23:06 heure locale, décalage +120 min → 08:23:06 UTC.
    const at = toEpochMillis('2020-08-18T10:23:06', 120);
    expect(at).toBeDefined();
    expect(toIsoUtc(at as number)).toBe('2020-08-18T08:23:06Z');
  });

  it('accepte une fraction de seconde', () => {
    const at = toEpochMillis('2023-11-17T07:43:12.000', 60);
    expect(toIsoUtc(at as number)).toBe('2023-11-17T06:43:12Z');
  });

  it('gère un décalage négatif', () => {
    const at = toEpochMillis('2020-01-01T00:00:00', -300);
    expect(toIsoUtc(at as number)).toBe('2020-01-01T05:00:00Z');
  });

  it('renvoie undefined sur une chaîne vide ou absente', () => {
    expect(toEpochMillis('', 60)).toBeUndefined();
    expect(toEpochMillis(undefined, 60)).toBeUndefined();
    expect(toEpochMillis('pas une date', 60)).toBeUndefined();
  });
});

describe('readSession — séance de plein air', () => {
  const session = readSession(OUTDOOR_RIDE_JSON);

  it('normalise les métadonnées', () => {
    expect(session).toBeDefined();
    expect(session).toMatchObject({
      id: '5022701696',
      timezoneOffsetMinutes: 120,
      durationSeconds: 6,
      distanceMeters: 27,
      calories: 12,
      deviceModel: 'Polar Vantage M',
      application: 'Polar Flow',
      hasGps: true,
      hasHeartRate: true,
      usable: true,
    });
    expect(session?.sport).toMatchObject({ label: 'Cyclisme', stravaSportType: 'Ride' });
  });

  it('ignore un nom de séance vide', () => {
    expect(session?.name).toBeUndefined();
  });

  it('convertit la vitesse de km/h en m/s', () => {
    const point = session?.exercises[0].track.find((p) => p.speedMetersPerSecond !== undefined);
    // 18 km/h → 5 m/s exactement.
    expect(point?.speedMetersPerSecond).toBeCloseTo(5, 6);
  });

  it('écarte le point de départ qui ne porte qu’une altitude non calée', () => {
    // Au pas 0 du fichier : FC, vitesse et distance valent NaN, il n'y a pas
    // encore de position, et l'altimètre annonce 180 sans être calé. Ce point ne
    // porte donc aucune mesure utile et créerait un faux dénivelé.
    const track = session?.exercises[0].track ?? [];
    expect(track).toHaveLength(5);
    expect(toIsoUtc(track[0].at)).toBe('2020-08-18T08:23:07Z');
  });

  it('traite les NaN comme des trous et non comme des zéros', () => {
    const track = session?.exercises[0].track ?? [];
    // Dernier pas : la FC est NaN alors que vitesse et distance sont mesurées.
    const last = track[track.length - 1];
    expect(last.heartRateBpm).toBeUndefined();
    expect(last.distanceMeters).toBe(27);
    expect(last.speedMetersPerSecond).toBeCloseTo(6, 6);
  });

  it('replace les waypoints GPS sur la base de temps des échantillons', () => {
    const positioned = (session?.exercises[0].track ?? []).filter((p) => p.latitude !== undefined);
    expect(positioned).toHaveLength(3);
    expect(positioned[0]).toMatchObject({ latitude: 46.93769167, longitude: 4.732505 });
    // elapsedMillis 2000 → 2 s après le départ absolu.
    expect(toIsoUtc(positioned[0].at)).toBe('2020-08-18T08:23:08Z');
  });

  it("privilégie l'altitude du waypoint sur celle du canal barométrique", () => {
    const positioned = (session?.exercises[0].track ?? []).find((p) => p.latitude !== undefined);
    // Canal ALTITUDE = 182 au pas 2, waypoint = 183 → on garde le waypoint.
    expect(positioned?.altitudeMeters).toBe(183);
  });

  it('déduit le départ de chaque tour du temps cumulé', () => {
    const laps = session?.exercises[0].laps ?? [];
    expect(laps).toHaveLength(2);
    expect(toIsoUtc(laps[0].startedAt)).toBe('2020-08-18T08:23:06Z');
    // 2e tour : splitTime 6000 - duration 3000 = 3 s après le départ.
    expect(toIsoUtc(laps[1].startedAt)).toBe('2020-08-18T08:23:09Z');
    expect(laps[1].distanceMeters).toBe(27);
  });

  it('expose les canaux réellement porteurs de valeurs', () => {
    // TEMPERATURE est présent dans le fichier et porte des valeurs, mais reste
    // inutilisé côté TCX ; ALTITUDE, HEART_RATE, SPEED et DISTANCE comptent.
    expect(session?.exercises[0].channels).toContain('HEART_RATE');
    expect(session?.exercises[0].channels).toContain('ALTITUDE');
  });
});

describe('readSession — séance en salle sans donnée', () => {
  const session = readSession(EMPTY_INDOOR_JSON);

  it('la marque inexploitable', () => {
    expect(session).toMatchObject({
      hasGps: false,
      hasHeartRate: false,
      usable: false,
    });
    expect(session?.sport).toMatchObject({
      label: "Autre sport d'intérieur",
      stravaSportType: 'Workout',
    });
  });

  it('produit une piste vide malgré des canaux déclarés', () => {
    expect(session?.exercises[0].track).toHaveLength(0);
    expect(session?.exercises[0].channels).toEqual([]);
  });

  it("conserve la FC de synthèse de l'en-tête même sans échantillons", () => {
    // Polar renseigne hrAvg/hrMax au niveau séance alors que le canal est vide.
    expect(session?.heartRate).toEqual({ avg: 109, max: 135 });
  });

  it('signale une séance issue de Polar Connect', () => {
    expect(session?.application).toBe('Polar Connect');
  });
});

describe('readSession — tapis de course', () => {
  const session = readSession(TREADMILL_JSON);

  it('marque le sport comme pratiqué sur machine fixe', () => {
    expect(session?.sport).toMatchObject({
      label: 'Course sur tapis',
      stravaSportType: 'Run',
      indoor: true,
    });
  });

  it('produit une piste sans position mais avec FC et cadence', () => {
    const track = session?.exercises[0].track ?? [];
    expect(track.every((p) => p.latitude === undefined)).toBe(true);
    expect(track[0]).toMatchObject({ heartRateBpm: 140, cadence: 80 });
  });

  it('écarte les points situés dans une pause', () => {
    // Pause de 12:14:35 à 12:14:36 → le point du pas 2 est retiré.
    const times = (session?.exercises[0].track ?? []).map((p) => toIsoUtc(p.at));
    expect(times).toEqual(['2020-10-08T10:14:33Z', '2020-10-08T10:14:34Z', '2020-10-08T10:14:36Z']);
  });

  it('borne la cadence à la valeur maximale admise par TCX', () => {
    const track = session?.exercises[0].track ?? [];
    // 300 dépasse le `ubyte` du schéma TCX (max 254).
    expect(track[track.length - 1].cadence).toBe(254);
  });

  it('conserve un nom de séance non vide', () => {
    expect(session?.name).toBe('Fractionné');
  });
});

describe('readSession — robustesse', () => {
  it('renvoie undefined sans date de départ', () => {
    expect(readSession('{"identifier":{"id":"1"}}')).toBeUndefined();
  });

  it("renvoie undefined sur autre chose qu'un objet", () => {
    expect(readSession('[]')).toBeUndefined();
    expect(readSession('null')).toBeUndefined();
  });

  it('supporte une séance sans exercice', () => {
    const session = readSession(
      '{"startTime":"2020-01-01T10:00:00","timezoneOffsetMinutes":0,"sport":{"id":"2"}}',
    );
    expect(session?.exercises).toEqual([]);
    expect(session?.usable).toBe(false);
  });
});
