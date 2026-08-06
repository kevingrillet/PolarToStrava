import { describe, expect, it } from 'vitest';
import {
  countByReason,
  dateRangeOf,
  exclusionReasonFor,
  filterSessions,
  localDateOf,
} from './filter';
import type { SessionSummary } from './dto';

/** Fabrique un résumé de séance minimal, pour tester le filtrage seul. */
function session(over: {
  localStart: string;
  durationSeconds?: number;
  distanceMeters?: number;
  sportId?: number;
  hasGps?: boolean;
  usable?: boolean;
}): SessionSummary {
  const {
    localStart,
    durationSeconds = 3600,
    distanceMeters,
    sportId = 2,
    hasGps = true,
    usable = true,
  } = over;
  return {
    id: localStart,
    file: `training-session_${localStart.replace(/:/g, '-')}_1.json`,
    startedAt: Date.parse(`${localStart}Z`),
    localStart,
    durationSeconds,
    ...(distanceMeters !== undefined ? { distanceMeters } : {}),
    sportId,
    hasGps,
    hasHeartRate: true,
    usable,
    trackPoints: 0,
  };
}

describe('localDateOf', () => {
  it('retient la date locale et non la date UTC', () => {
    // 00h30 heure locale à +02:00 → 22h30 la veille en UTC ; on veut le 1er.
    const s: SessionSummary = {
      ...session({ localStart: '2024-01-01T00:30:00' }),
      startedAt: Date.parse('2023-12-31T22:30:00Z'),
    };
    expect(localDateOf(s)).toBe('2024-01-01');
  });

  it('retombe sur la date UTC si localStart est absent', () => {
    const s: SessionSummary = {
      ...session({ localStart: '2024-05-02T10:00:00' }),
      localStart: '',
    };
    expect(localDateOf(s)).toBe('2024-05-02');
  });
});

describe('exclusionReasonFor', () => {
  const base = session({ localStart: '2022-06-15T08:00:00', durationSeconds: 3600 });

  it('accepte une séance conforme', () => {
    expect(exclusionReasonFor(base, { from: '2022-01-01', to: '2022-12-31' })).toBeUndefined();
  });

  it('borne les dates aux deux extrémités, bornes incluses', () => {
    expect(exclusionReasonFor(base, { from: '2022-06-16' })).toBe('before-from');
    expect(exclusionReasonFor(base, { to: '2022-06-14' })).toBe('after-to');
    expect(exclusionReasonFor(base, { from: '2022-06-15', to: '2022-06-15' })).toBeUndefined();
  });

  it('écarte les séances trop courtes', () => {
    const commute = session({ localStart: '2022-06-15T08:00:00', durationSeconds: 12 * 60 });
    expect(exclusionReasonFor(commute, { minDurationSeconds: 20 * 60 })).toBe('too-short');
    expect(exclusionReasonFor(commute, { minDurationSeconds: 10 * 60 })).toBeUndefined();
  });

  it('écarte les séances trop longues', () => {
    expect(exclusionReasonFor(base, { maxDurationSeconds: 1800 })).toBe('too-long');
  });

  it('écarte les séances trop courtes en distance', () => {
    const s = session({ localStart: '2022-06-15T08:00:00', distanceMeters: 2000 });
    expect(exclusionReasonFor(s, { minDistanceMeters: 5000 })).toBe('too-close');
  });

  it("n'écarte pas sur la distance une séance qui n'en mesure aucune", () => {
    // Séance en salle : pas de distance → le critère ne s'applique pas.
    const indoor = session({ localStart: '2022-06-15T08:00:00', sportId: 83 });
    expect(exclusionReasonFor(indoor, { minDistanceMeters: 5000 })).toBeUndefined();
  });

  it('filtre par sport', () => {
    expect(exclusionReasonFor(base, { sportIds: [1, 11] })).toBe('sport-excluded');
    expect(exclusionReasonFor(base, { sportIds: [2] })).toBeUndefined();
  });

  it('écarte les séances inexploitables par défaut', () => {
    const empty = session({ localStart: '2022-06-15T08:00:00', usable: false });
    expect(exclusionReasonFor(empty, {})).toBe('unusable');
    expect(exclusionReasonFor(empty, { excludeUnusable: false })).toBeUndefined();
  });

  it('peut exiger une trace GPS', () => {
    const noGps = session({ localStart: '2022-06-15T08:00:00', hasGps: false });
    expect(exclusionReasonFor(noGps, { requireGps: true })).toBe('no-gps');
    expect(exclusionReasonFor(noGps, {})).toBeUndefined();
  });

  it('priorise le motif « inexploitable » sur les autres', () => {
    const empty = session({
      localStart: '2019-01-01T08:00:00',
      durationSeconds: 10,
      usable: false,
    });
    expect(exclusionReasonFor(empty, { from: '2022-01-01', minDurationSeconds: 600 })).toBe(
      'unusable',
    );
  });
});

describe('filterSessions', () => {
  const sessions = [
    session({ localStart: '2023-03-02T18:00:00', durationSeconds: 12 * 60 }), // vélotaff
    session({ localStart: '2021-07-14T09:00:00', durationSeconds: 7200 }),
    session({ localStart: '2019-05-01T10:00:00', durationSeconds: 3600 }),
    session({ localStart: '2022-11-11T20:00:00', durationSeconds: 5, usable: false }),
  ];

  it('trie les séances retenues par ordre chronologique', () => {
    const { kept } = filterSessions(sessions, {});
    expect(kept.map(localDateOf)).toEqual(['2019-05-01', '2021-07-14', '2023-03-02']);
  });

  it('combine bornes de dates et durée minimale', () => {
    const { kept, excluded } = filterSessions(sessions, {
      from: '2020-01-01',
      minDurationSeconds: 30 * 60,
    });
    expect(kept.map(localDateOf)).toEqual(['2021-07-14']);
    expect(countByReason(excluded)).toEqual({
      'before-from': 1,
      'too-short': 1,
      unusable: 1,
    });
  });

  it('ne perd aucune séance entre retenues et exclues', () => {
    const { kept, excluded } = filterSessions(sessions, { from: '2021-01-01' });
    expect(kept.length + excluded.length).toBe(sessions.length);
  });
});

describe('dateRangeOf', () => {
  it('renvoie les bornes du lot', () => {
    expect(
      dateRangeOf([
        session({ localStart: '2023-03-02T18:00:00' }),
        session({ localStart: '2019-05-01T10:00:00' }),
      ]),
    ).toEqual({ from: '2019-05-01', to: '2023-03-02' });
  });

  it('renvoie undefined sur un lot vide', () => {
    expect(dateRangeOf([])).toBeUndefined();
  });
});
