/**
 * Chord symbol styles (Cmaj7 / CΔ7 / CM7), roots in solfège, and long chord names in
 * English and Spanish.
 */
import { Chord } from './chord';

/** How `formatChordSymbol` writes qualities. */
export type ChordSymbolStyle = 'standard' | 'symbols' | 'short';
/** Languages of `chordLongName` and `localizeNoteName`. */
export type ChordNameLanguage = 'en' | 'es';

const SOLFEGE: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const ACCIDENTAL_WORDS: Record<ChordNameLanguage, Record<string, string>> = {
  en: { '#': 'sharp', '##': 'double sharp', b: 'flat', bb: 'double flat' },
  es: { '#': 'sostenido', '##': 'doble sostenido', b: 'bemol', bb: 'doble bemol' },
};

function splitSymbol(symbol: string): { root: string; suffix: string; bass?: string } {
  const m = symbol.match(/^([A-G](?:#{1,2}|b{1,2})?)(.*?)(?:\/([A-G](?:#{1,2}|b{1,2})?))?$/);
  if (!m) throw new RangeError(`Not a chord symbol: "${symbol}"`);
  return { root: m[1], suffix: m[2], bass: m[3] };
}

/**
 * A note name in another language. Short form keeps the accidental sign (`'F#'` → `'Fa#'`);
 * long form spells it (`'F#'` → `'F sharp'` / `'Fa sostenido'`). An octave number is kept.
 */
export function localizeNoteName(name: string, language: ChordNameLanguage, long = false): string {
  const m = name.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)?$/);
  if (!m) throw new RangeError(`Not a note name: "${name}"`);
  const [, letter, acc = '', octave = ''] = m;
  const base = language === 'es' ? SOLFEGE[letter] : letter;
  if (!long) return `${base}${acc}${octave}`;
  return [base, acc && ACCIDENTAL_WORDS[language][acc], octave].filter(Boolean).join(' ');
}

// Rewrites of the quality suffix, in order
const STYLE_RULES: Record<Exclude<ChordSymbolStyle, 'standard'>, [RegExp, string][]> = {
  symbols: [
    [/^m7b5/, 'ø7'], [/^m11b5/, 'ø11'], [/^(?:half-diminished)$/, 'ø7'],
    [/^dimM7/, '°Δ7'], [/^dim7/, '°7'], [/^dim/, '°'],
    [/^augM7|^aug\(maj7\)/, '+Δ7'], [/^aug/, '+'],
    [/^mM|^m\(maj(\d+)\)/, '-Δ$1'], [/^minor$/, '-'], [/^m(?!aj)/, '-'],
    [/^major$|^M$/, ''], [/maj/, 'Δ'],
  ],
  short: [[/^major$/, ''], [/maj/, 'M']],
};

/**
 * Writes a chord symbol in another style, optionally with the root (and slash bass) in
 * solfège.
 * - `'standard'`: as the library writes it (Cmaj7, Cm7, Cm7b5, Cdim7, Caug)
 * - `'symbols'`: jazz symbols (CΔ7, C-7, Cø7, C°7, C+, C-Δ7)
 * - `'short'`: M for major seventh (CM7, CM9)
 * @example formatChordSymbol('F#m7b5', { style: 'symbols', roots: 'solfege' }) // 'Fa#ø7'
 */
export function formatChordSymbol(
  chord: Chord | string,
  options: { style?: ChordSymbolStyle; roots?: 'letters' | 'solfege' } = {},
): string {
  const { root, suffix, bass } = splitSymbol(typeof chord === 'string' ? chord : chord.name);
  let quality = suffix;
  if (options.style && options.style !== 'standard') {
    for (const [pattern, replacement] of STYLE_RULES[options.style]) quality = quality.replace(pattern, replacement);
  }
  const name = (n: string) => (options.roots === 'solfege' ? localizeNoteName(n, 'es') : n);
  return `${name(root)}${quality}${bass ? `/${name(bass)}` : ''}`;
}

// Long names of common qualities; other qualities are written as a symbol after the root
const QUALITY_NAMES: Record<string, Record<ChordNameLanguage, string>> = {
  '': { en: 'major', es: 'mayor' },
  m: { en: 'minor', es: 'menor' },
  dim: { en: 'diminished', es: 'disminuido' },
  aug: { en: 'augmented', es: 'aumentado' },
  sus2: { en: 'suspended second', es: 'suspendido de segunda' },
  sus4: { en: 'suspended fourth', es: 'suspendido de cuarta' },
  '6': { en: 'sixth', es: 'sexta' },
  m6: { en: 'minor sixth', es: 'menor sexta' },
  '7': { en: 'dominant seventh', es: 'séptima' },
  maj7: { en: 'major seventh', es: 'séptima mayor' },
  m7: { en: 'minor seventh', es: 'menor séptima' },
  mM7: { en: 'minor major seventh', es: 'menor séptima mayor' },
  m7b5: { en: 'half-diminished seventh', es: 'semidisminuido' },
  dim7: { en: 'diminished seventh', es: 'séptima disminuida' },
};
const QUALITY_ALIASES: Record<string, string> = {
  M: '', major: '', minor: 'm', dominant7: '7', 'half-diminished': 'm7b5', 'm(maj7)': 'mM7',
};

/**
 * A chord's name in words: `'C major seventh'`, `'Do séptima mayor'`, `'F sharp minor'`,
 * `'Fa sostenido menor'`. A slash bass reads "over E" / "con bajo en Mi". Qualities beyond
 * triads, sixths, suspensions and seventh chords keep their symbol after the root
 * (`'C 7#9'`, `'Do 7#9'`).
 */
export function chordLongName(chord: Chord | string, language: ChordNameLanguage = 'en'): string {
  const { root, suffix, bass } = splitSymbol(typeof chord === 'string' ? chord : chord.name);
  const quality = QUALITY_NAMES[QUALITY_ALIASES[suffix] ?? suffix]?.[language] ?? suffix;
  const head = `${localizeNoteName(root, language, true)} ${quality}`.trim();
  if (!bass) return head;
  return language === 'es' ? `${head} con bajo en ${localizeNoteName(bass, 'es', true)}` : `${head} over ${localizeNoteName(bass, 'en', true)}`;
}
