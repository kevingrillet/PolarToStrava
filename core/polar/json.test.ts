import { describe, expect, it } from 'vitest';
import { parsePolarJson, sanitizePolarJson } from './json';

describe('sanitizePolarJson', () => {
  it('remplace les NaN nus par null', () => {
    expect(sanitizePolarJson('{"values":[NaN,NaN,122]}')).toBe('{"values":[null,null,122]}');
  });

  it('remplace Infinity et -Infinity', () => {
    expect(sanitizePolarJson('[Infinity,-Infinity]')).toBe('[null,null]');
  });

  it('préserve un NaN situé dans une chaîne', () => {
    // Le piège du replace global : ce nom de séance doit rester intact.
    expect(sanitizePolarJson('{"name":"Course NaNterre"}')).toBe('{"name":"Course NaNterre"}');
  });

  it('préserve une chaîne contenant un guillemet échappé avant un NaN', () => {
    const input = '{"name":"dit \\"NaN\\" ici","v":[NaN]}';
    expect(sanitizePolarJson(input)).toBe('{"name":"dit \\"NaN\\" ici","v":[null]}');
  });

  it('ne casse pas sur un antislash final échappé suivi de NaN hors chaîne', () => {
    const input = '{"path":"C:\\\\temp\\\\","v":[NaN]}';
    expect(sanitizePolarJson(input)).toBe('{"path":"C:\\\\temp\\\\","v":[null]}');
  });

  it('laisse un JSON déjà valide inchangé', () => {
    const input = '{"a":1,"b":[1,2,3],"c":"x"}';
    expect(sanitizePolarJson(input)).toBe(input);
  });
});

describe('parsePolarJson', () => {
  it('parse un JSON valide', () => {
    expect(parsePolarJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parse un JSON contenant des NaN', () => {
    expect(parsePolarJson('{"values":[NaN,1,NaN]}')).toEqual({ values: [null, 1, null] });
  });

  it("parse un extrait réel d'export Polar", () => {
    const raw = `{
      "identifier": { "id": "7766215556" },
      "startTime": "2023-11-15T12:23:32",
      "timezoneOffsetMinutes": 60,
      "exercises": [
        {
          "samples": {
            "samples": [
              { "type": "HEART_RATE", "intervalMillis": 1000, "values": [122, 122, NaN] },
              { "type": "SPEED", "intervalMillis": 1000, "values": [NaN, NaN, NaN] }
            ]
          }
        }
      ]
    }`;
    const parsed = parsePolarJson(raw) as {
      exercises: { samples: { samples: { type: string; values: (number | null)[] }[] } }[];
    };
    expect(parsed.exercises[0].samples.samples[0].values).toEqual([122, 122, null]);
    expect(parsed.exercises[0].samples.samples[1].values).toEqual([null, null, null]);
  });

  it('propage une erreur sur du JSON réellement invalide', () => {
    expect(() => parsePolarJson('{"a":')).toThrow();
  });
});
