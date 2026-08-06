import { describe, expect, it } from 'vitest';
import type { SessionSummary } from '../dto';
import { BATCH_SIZE_FREE, fileNameFor, planBatches, slugify } from './batches';

function session(id: string, localStart: string): SessionSummary {
  return {
    id,
    file: `training-session_${id}.json`,
    startedAt: Date.parse(`${localStart}Z`),
    localStart,
    durationSeconds: 3600,
    sportId: 2,
    hasGps: true,
    hasHeartRate: true,
    usable: true,
    trackPoints: 10,
  };
}

describe('slugify', () => {
  it('retire les accents et met en minuscules', () => {
    expect(slugify('Randonnée')).toBe('randonnee');
    expect(slugify('Séance de musculation')).toBe('seance-de-musculation');
  });

  it('remplace toute ponctuation par des tirets', () => {
    expect(slugify("Autre sport d'intérieur")).toBe('autre-sport-d-interieur');
    expect(slugify('Classique, ski de fond')).toBe('classique-ski-de-fond');
  });

  it('ne laisse pas de tiret en début ni en fin', () => {
    expect(slugify('  Ski !  ')).toBe('ski');
  });

  it('renvoie une chaîne vide si rien ne subsiste', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('fileNameFor', () => {
  it('préfixe par la date pour que le tri soit chronologique', () => {
    expect(fileNameFor(session('123', '2020-08-18T10:23:06'), 'Randonnée', 'fit')).toBe(
      '2020-08-18_10h23_randonnee_123.fit',
    );
  });

  it("inclut l'identifiant, deux séances pouvant démarrer la même minute", () => {
    const a = fileNameFor(session('1', '2020-08-18T10:23:06'), 'Cyclisme', 'fit');
    const b = fileNameFor(session('2', '2020-08-18T10:23:40'), 'Cyclisme', 'fit');
    expect(a).not.toBe(b);
  });

  it('accepte l’extension tcx', () => {
    expect(fileNameFor(session('9', '2021-01-02T07:00:00'), 'Squash', 'tcx')).toBe(
      '2021-01-02_07h00_squash_9.tcx',
    );
  });

  it('reste exploitable si le libellé de sport est vide', () => {
    expect(fileNameFor(session('9', '2021-01-02T07:00:00'), '', 'fit')).toBe(
      '2021-01-02_07h00_sport_9.fit',
    );
  });
});

describe('planBatches', () => {
  const many = Array.from({ length: 32 }, (_, i) =>
    session(String(i), `2020-01-${String((i % 28) + 1).padStart(2, '0')}T08:00:00`),
  );

  it('découpe à la taille demandée', () => {
    const plan = planBatches(many, 15);
    expect(plan.batches.map((b) => b.sessions.length)).toEqual([15, 15, 2]);
    expect(plan.sessionCount).toBe(32);
    expect(plan.batchSize).toBe(15);
  });

  it('utilise 15 par défaut, la limite d’un compte sans abonnement', () => {
    expect(planBatches(many).batchSize).toBe(BATCH_SIZE_FREE);
  });

  it('numérote les dossiers pour que l’ordre alphabétique soit le bon', () => {
    expect(planBatches(many, 15).batches.map((b) => b.folder)).toEqual([
      'lot-01',
      'lot-02',
      'lot-03',
    ]);
  });

  it('élargit la numérotation au-delà de cent lots', () => {
    const huge = Array.from({ length: 101 }, (_, i) => session(String(i), '2020-01-01T08:00:00'));
    const folders = planBatches(huge, 1).batches.map((b) => b.folder);
    expect(folders[0]).toBe('lot-001');
    expect(folders[100]).toBe('lot-101');
  });

  it('trie les séances chronologiquement avant de découper', () => {
    const plan = planBatches(
      [session('b', '2022-05-02T08:00:00'), session('a', '2019-01-01T08:00:00')],
      15,
    );
    expect(plan.batches[0].sessions.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('ne produit aucun lot pour une sélection vide', () => {
    expect(planBatches([], 15).batches).toEqual([]);
  });

  it('se protège d’une taille de lot absurde', () => {
    expect(planBatches(many, 0).batchSize).toBe(1);
  });
});
