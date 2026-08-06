import { describe, expect, it } from 'vitest';
import { EMPTY_INDOOR_JSON, OUTDOOR_RIDE_JSON, TREADMILL_JSON } from '../polar/fixtures';
import { readSession, type NormalizedSession } from '../polar/session';
import { buildTcx, escapeXml } from './build';

function tcxFor(json: string): string {
  return buildTcx(readSession(json) as NormalizedSession);
}

describe('escapeXml', () => {
  it('échappe les cinq entités XML', () => {
    expect(escapeXml(`<a href="x">& '`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp; &apos;');
  });
});

describe('buildTcx — séance de plein air', () => {
  const tcx = tcxFor(OUTDOOR_RIDE_JSON);

  it('déclare le namespace TCX et un prologue XML', () => {
    expect(tcx.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(tcx).toContain('xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"');
  });

  it('utilise le sport TCX déduit et un Id en UTC', () => {
    expect(tcx).toContain('<Activity Sport="Biking">');
    expect(tcx).toContain('<Id>2020-08-18T08:23:06Z</Id>');
  });

  it('respecte l’ordre des éléments imposé par le schéma dans un Lap', () => {
    const lap = tcx.slice(tcx.indexOf('<Lap '), tcx.indexOf('</Lap>'));
    const order = [
      'TotalTimeSeconds',
      'DistanceMeters',
      'MaximumSpeed',
      'Calories',
      'AverageHeartRateBpm',
      'MaximumHeartRateBpm',
      'Intensity',
      'TriggerMethod',
      'Track',
    ];
    const positions = order.map((tag) => lap.indexOf(`<${tag}>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("respecte l'ordre des éléments dans un Trackpoint", () => {
    const start = tcx.indexOf('<Trackpoint>', tcx.indexOf('<Position>') - 200);
    const point = tcx.slice(start, tcx.indexOf('</Trackpoint>', start));
    const positions = ['Time', 'Position', 'AltitudeMeters', 'DistanceMeters', 'HeartRateBpm'].map(
      (tag) => point.indexOf(`<${tag}>`),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('émet un Lap par tour, avec les calories sur le premier seulement', () => {
    expect(tcx.match(/<Lap /g)).toHaveLength(2);
    // 12 kcal au total : imputées au 1er tour, 0 au second, pour ne pas doubler.
    expect(tcx.match(/<Calories>12<\/Calories>/g)).toHaveLength(1);
    expect(tcx.match(/<Calories>0<\/Calories>/g)).toHaveLength(1);
  });

  it('exprime la vitesse en m/s dans l’extension Garmin', () => {
    expect(tcx).toContain('<TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">');
    // 18 km/h → 5 m/s.
    expect(tcx).toContain('<Speed>5</Speed>');
    // 21,6 km/h → 6 m/s (vitesse max de la séance).
    expect(tcx).toContain('<MaximumSpeed>6</MaximumSpeed>');
  });

  it('place les positions GPS sur les bons points', () => {
    expect(tcx.match(/<Position>/g)).toHaveLength(3);
    expect(tcx).toContain('<LatitudeDegrees>46.9376917</LatitudeDegrees>');
    expect(tcx).toContain('<LongitudeDegrees>4.732505</LongitudeDegrees>');
  });

  it('répartit les points entre les tours sans en perdre', () => {
    const laps = tcx.split('<Lap ').slice(1);
    const counts = laps.map((lap) => (lap.match(/<Trackpoint>/g) ?? []).length);
    // 6 pas d'échantillonnage, moins celui de départ qui ne porte qu'une altitude
    // non calée : 2 points avant la bascule de tour (à +3 s), 3 après.
    expect(counts).toEqual([2, 3]);
  });

  it('renseigne le modèle de montre comme créateur', () => {
    expect(tcx).toContain('<Creator xsi:type="Device_t">');
    expect(tcx).toContain('<Name>Polar Vantage M</Name>');
  });
});

describe('buildTcx — cas limites', () => {
  it('produit un fichier structurellement valide mais sans point pour une séance vide', () => {
    const tcx = tcxFor(EMPTY_INDOOR_JSON);
    expect(tcx).toContain('<Activity Sport="Other">');
    // Les éléments requis restent présents...
    expect(tcx).toContain('<TotalTimeSeconds>');
    expect(tcx).toContain('<DistanceMeters>0</DistanceMeters>');
    expect(tcx).toContain('<Intensity>Active</Intensity>');
    // ...mais il n'y a aucune donnée : c'est bien pourquoi `usable` vaut false.
    expect(tcx).not.toContain('<Trackpoint>');
    expect(tcx).not.toContain('<Track>');
  });

  it('émet un tour unique de repli quand le fichier n’en déclare aucun', () => {
    const tcx = tcxFor(TREADMILL_JSON);
    expect(tcx.match(/<Lap /g)).toHaveLength(1);
    expect(tcx).toContain('<Activity Sport="Running">');
  });

  it('échappe le nom de séance placé en Notes', () => {
    const session = readSession(TREADMILL_JSON) as NormalizedSession;
    const tcx = buildTcx({ ...session, name: 'Côtes & <sprints>' });
    expect(tcx).toContain('<Notes>Côtes &amp; &lt;sprints&gt;</Notes>');
  });

  it('omet la cadence absente plutôt que d’émettre une valeur nulle', () => {
    const tcx = tcxFor(OUTDOOR_RIDE_JSON);
    expect(tcx).not.toContain('<Cadence>');
  });
});
