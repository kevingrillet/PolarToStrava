import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatDate,
  formatDistance,
  formatDuration,
  formatSessionDateTime,
} from './format';

describe('formatDuration', () => {
  it('affiche les secondes sous la minute', () => {
    expect(formatDuration(45, 'fr')).toBe('45 s');
  });

  it('affiche les minutes sous l’heure', () => {
    expect(formatDuration(12 * 60, 'fr')).toBe('12 min');
    expect(formatDuration(59 * 60 + 29, 'fr')).toBe('59 min');
  });

  it('affiche heures et minutes au-delà', () => {
    expect(formatDuration(4045, 'fr')).toBe('1h07');
    expect(formatDuration(4045, 'en')).toBe('1h 07');
  });

  it('gère une durée nulle', () => {
    expect(formatDuration(0, 'fr')).toBe('0 s');
  });
});

describe('formatDistance', () => {
  it('affiche les mètres sous le kilomètre', () => {
    expect(formatDistance(450, 'fr')).toBe('450 m');
  });

  it('affiche les kilomètres avec une décimale', () => {
    expect(formatDistance(18730.5, 'fr')).toBe('18,7 km');
    expect(formatDistance(18730.5, 'en')).toBe('18.7 km');
  });

  it('affiche un tiret en l’absence de distance', () => {
    expect(formatDistance(undefined, 'fr')).toBe('—');
  });
});

describe('formatSessionDateTime', () => {
  it("conserve l'heure locale de la séance", () => {
    expect(formatSessionDateTime('2020-08-18T10:23:06', 'fr')).toBe('18/08/2020 10:23');
    expect(formatSessionDateTime('2020-08-18T10:23:06', 'en')).toBe('2020-08-18 10:23');
  });

  it('accepte une date sans heure', () => {
    expect(formatSessionDateTime('2020-08-18', 'fr')).toBe('18/08/2020');
  });

  it('renvoie la valeur brute si elle est inattendue', () => {
    expect(formatSessionDateTime('', 'fr')).toBe('');
  });
});

describe('formatDate', () => {
  it('adapte l’ordre des composantes à la langue', () => {
    expect(formatDate('2021-05-08', 'fr')).toBe('08/05/2021');
    expect(formatDate('2021-05-08', 'en')).toBe('2021-05-08');
  });
});

describe('formatCountdown', () => {
  it('compte le temps restant en minutes et secondes', () => {
    expect(formatCountdown(1_000_000 + 125_000, 1_000_000)).toBe('2:05');
  });

  it('ne descend pas sous zéro', () => {
    expect(formatCountdown(1_000, 5_000)).toBe('0:00');
  });
});
