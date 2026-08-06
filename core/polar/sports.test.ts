import { describe, expect, it } from 'vitest';
import { POLAR_SPORTS, resolveSport, tcxSportFor } from './sports';

/** Les 13 `sport.id` réellement présents dans l'export de référence (726 séances). */
const CORPUS_IDS = [1, 2, 3, 11, 13, 15, 16, 17, 18, 38, 39, 50, 83] as const;

describe('POLAR_SPORTS', () => {
  it('couvre tous les sport.id du corpus de référence', () => {
    const missing = CORPUS_IDS.filter((id) => POLAR_SPORTS[id] === undefined);
    expect(missing).toEqual([]);
  });
});

describe('resolveSport', () => {
  it('résout les sports de plein air à GPS', () => {
    expect(resolveSport(1)).toMatchObject({
      label: 'Course à pied',
      stravaSportType: 'Run',
      tcxSport: 'Running',
      unknown: false,
      indoor: false,
    });
    expect(resolveSport(2)).toMatchObject({ stravaSportType: 'Ride', tcxSport: 'Biking' });
    expect(resolveSport(3)).toMatchObject({ stravaSportType: 'Walk', tcxSport: 'Other' });
    expect(resolveSport(11)).toMatchObject({ label: 'Randonnée', stravaSportType: 'Hike' });
  });

  it('marque les sports sur machine fixe comme indoor', () => {
    expect(resolveSport(17)).toMatchObject({
      label: 'Course sur tapis',
      stravaSportType: 'Run',
      indoor: true,
    });
    expect(resolveSport(18)).toMatchObject({ stravaSportType: 'Ride', indoor: true });
  });

  it('mappe les sports de ballon vers Soccer faute de type dédié', () => {
    expect(resolveSport(39)).toMatchObject({ label: 'Football', stravaSportType: 'Soccer' });
    expect(resolveSport(50)).toMatchObject({ label: 'Futsal', stravaSportType: 'Soccer' });
  });

  it('retombe sur Workout pour les sports « autre »', () => {
    expect(resolveSport(83)).toMatchObject({
      label: "Autre sport d'intérieur",
      stravaSportType: 'Workout',
      tcxSport: 'Other',
      unknown: false,
    });
  });

  it('signale un id absent du dictionnaire sans lever', () => {
    expect(resolveSport(9999)).toMatchObject({
      label: 'Sport #9999',
      stravaSportType: 'Workout',
      unknown: true,
    });
  });

  it('donne la priorité à un override utilisateur', () => {
    // 83 « Autre sport d'intérieur » forcé en musculation : le sport TCX suit.
    expect(resolveSport(83, { 83: 'WeightTraining' })).toMatchObject({
      stravaSportType: 'WeightTraining',
      tcxSport: 'Other',
    });
    // Un override peut aussi changer le sport TCX.
    expect(resolveSport(83, { 83: 'TrailRun' })).toMatchObject({ tcxSport: 'Running' });
  });
});

describe('tcxSportFor', () => {
  it("n'émet que les trois valeurs admises par TCX", () => {
    expect(tcxSportFor('Run')).toBe('Running');
    expect(tcxSportFor('TrailRun')).toBe('Running');
    expect(tcxSportFor('Ride')).toBe('Biking');
    expect(tcxSportFor('MountainBikeRide')).toBe('Biking');
    expect(tcxSportFor('Swim')).toBe('Other');
    expect(tcxSportFor('Workout')).toBe('Other');
  });
});
