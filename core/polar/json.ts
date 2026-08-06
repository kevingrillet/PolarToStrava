/**
 * Lecture des JSON de l'export Polar Flow.
 *
 * Ces fichiers ne sont **pas du JSON valide** : les canaux d'échantillons
 * contiennent des littéraux `NaN` nus (`"values": [NaN, NaN, 122, …]`) pour les
 * points sans mesure. `JSON.parse` lève sur ces tokens, et c'est le premier
 * piège de tout l'import : un `JSON.parse` direct échoue sur la quasi-totalité
 * du corpus.
 *
 * On les remplace donc par `null` **avant** de parser. Un simple
 * `replace(/NaN/g, 'null')` serait faux : il corromprait un `NaN` apparaissant
 * dans une chaîne (nom de séance « Course NaNterre », par exemple). On balaye
 * donc le texte en suivant l'état « dans une chaîne / hors chaîne », avec
 * gestion des échappements, et on ne substitue qu'en dehors des chaînes.
 */

/** Littéraux non-JSON que Polar émet et que l'on convertit en `null`. */
const NON_JSON_LITERALS = ['NaN', 'Infinity', '-Infinity'] as const;

/**
 * Remplace les littéraux non-JSON (`NaN`, `±Infinity`) par `null`, en ignorant
 * ceux situés à l'intérieur d'une chaîne JSON.
 *
 * Exporté pour être testé directement : c'est la brique la plus critique et la
 * plus facile à casser silencieusement.
 */
export function sanitizePolarJson(text: string): string {
  let out = '';
  let i = 0;
  let inString = false;

  while (i < text.length) {
    const ch = text[i];

    if (inString) {
      // Dans une chaîne : on recopie tel quel, en avalant les échappements
      // (`\"` ne ferme pas la chaîne).
      if (ch === '\\') {
        out += text.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }

    // Hors chaîne : tentative de substitution d'un littéral non-JSON.
    const literal = NON_JSON_LITERALS.find((lit) => text.startsWith(lit, i));
    if (literal !== undefined) {
      out += 'null';
      i += literal.length;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * Parse un fichier JSON de l'export Polar. Assainit d'abord les littéraux
 * non-JSON, puis délègue à `JSON.parse`.
 *
 * Optimisation : le balayage caractère par caractère coûte cher sur les gros
 * fichiers (jusqu'à ~8 Mo pour une sortie de 6 h). On tente donc `JSON.parse`
 * directement, et on n'assainit que si ça échoue — la majorité des fichiers
 * sans `NaN` évitent ainsi le balayage.
 */
export function parsePolarJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return JSON.parse(sanitizePolarJson(text)) as unknown;
  }
}
