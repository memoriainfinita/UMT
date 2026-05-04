/**
 * Symbol translation utilities for non-English input.
 *
 * `translateSymbol` performs a greedy left-to-right substitution pass over a
 * music symbol string before it reaches the parser. Longer alias keys take
 * priority over shorter ones, so `Sol` is matched before `Si` and
 * `disminuido` before `dis`.
 *
 * Accidentals (`#`, `b`) and Arabic digits are language-neutral and pass
 * through unchanged, so `Sib` → `Bb` without needing an explicit `Sib` entry.
 *
 * Predefined maps cover the most common cases; combine them with spread syntax:
 * ```ts
 * const es = { ...SOLFEGE_ROOTS, ...QUALITY_ALIASES_ES };
 * parseChordSymbol(translateSymbol('Sib menor', es)); // Bbm
 * parseScaleSymbol(translateSymbol('Do mayor',  es)); // C major
 * ```
 */

/**
 * Translates a music symbol string by replacing alias keys with their values.
 * Longer keys take priority. Case-sensitive.
 *
 * @param input   - Raw symbol, e.g. `'Dom7'`, `'Do mayor'`, `'Sol mineur'`.
 * @param aliases - Map of alias → canonical string.
 * @returns Translated string ready for `parseChordSymbol` / `parseScaleSymbol`.
 */
export function translateSymbol(input: string, aliases: Record<string, string>): string {
  const keys = Object.keys(aliases).sort((a, b) => b.length - a.length);
  let result = '';
  let i = 0;
  while (i < input.length) {
    let matched = false;
    for (const key of keys) {
      if (input.startsWith(key, i)) {
        result += aliases[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += input[i];
      i++;
    }
  }
  return result;
}

/** Solfège note names → English note letters. Accidentals (`#`, `b`) pass through. */
export const SOLFEGE_ROOTS: Record<string, string> = {
  'Do':  'C',
  'Re':  'D',
  'Mi':  'E',
  'Fa':  'F',
  'Sol': 'G',
  'La':  'A',
  'Si':  'B',
};

/** Spanish quality names → canonical parser tokens. */
export const QUALITY_ALIASES_ES: Record<string, string> = {
  'semidisminuido': 'm7b5',
  'disminuido':     'dim',
  'aumentado':      'aug',
  'dominante':      '7',
  'mayor':          'major',
  'menor':          'minor',
};

/** French quality names → canonical parser tokens. */
export const QUALITY_ALIASES_FR: Record<string, string> = {
  'augmenté':  'aug',
  'diminué':   'dim',
  'majeur':    'major',
  'mineur':    'minor',
};

/** Italian quality names → canonical parser tokens. */
export const QUALITY_ALIASES_IT: Record<string, string> = {
  'diminuito': 'dim',
  'aumentato': 'aug',
  'maggiore':  'major',
  'minore':    'minor',
};
