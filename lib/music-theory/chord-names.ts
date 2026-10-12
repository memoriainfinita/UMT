/**
 * Chord symbol styles (Cmaj7 / CΔ7 / CM7), roots in solfège, and names in English and Spanish:
 * chords, scales and modes, cadences, substitution types.
 */
import { Chord } from './chord';

/**
 * How `formatChordSymbol` writes qualities.
 * @category Tonal harmony
 */
export type ChordSymbolStyle = 'standard' | 'symbols' | 'short';
/**
 * Languages of `chordLongName` and `localizeNoteName`.
 * @category Tonal harmony
 */
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
 * @category Tonal harmony
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
 * @category Tonal harmony
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
 * @category Tonal harmony
 */
export function chordLongName(chord: Chord | string, language: ChordNameLanguage = 'en'): string {
  const { root, suffix, bass } = splitSymbol(typeof chord === 'string' ? chord : chord.name);
  const quality = QUALITY_NAMES[QUALITY_ALIASES[suffix] ?? suffix]?.[language] ?? suffix;
  const head = `${localizeNoteName(root, language, true)} ${quality}`.trim();
  if (!bass) return head;
  return language === 'es' ? `${head} con bajo en ${localizeNoteName(bass, 'es', true)}` : `${head} over ${localizeNoteName(bass, 'en', true)}`;
}

// Spanish names of the scales of SCALE_PATTERNS. Modes are masculine, as "modo" (Re dórico);
// other scales feminine, as "escala" (La menor armónica)
const SCALE_NAMES_ES: Record<string, string> = {
  major: 'mayor', minor: 'menor', 'natural minor': 'menor natural',
  ionian: 'jónico', dorian: 'dórico', phrygian: 'frigio', lydian: 'lidio',
  mixolydian: 'mixolidio', aeolian: 'eólico', locrian: 'locrio',
  'harmonic minor': 'menor armónica', 'locrian #6': 'locrio #6', 'ionian #5': 'jónico #5',
  'dorian #4': 'dórico #4', 'phrygian dominant': 'frigio dominante', 'lydian #2': 'lidio #2',
  'super locrian bb7': 'superlocrio bb7', 'harmonic major': 'mayor armónica',
  'melodic minor': 'menor melódica', 'jazz minor': 'menor jazz', 'dorian b2': 'dórico b2',
  'lydian augmented': 'lidio aumentado', 'lydian dominant': 'lidio dominante', acoustic: 'acústica',
  'mixolydian b6': 'mixolidio b6', 'locrian #2': 'locrio #2', altered: 'alterada',
  'super locrian': 'superlocrio',
  'whole tone': 'de tonos enteros', augmented: 'aumentada', chromatic: 'cromática',
  'whole-half diminished': 'disminuida tono-semitono', 'half-whole diminished': 'disminuida semitono-tono',
  'messiaen-4': 'modo 4 de Messiaen', 'messiaen-5': 'modo 5 de Messiaen',
  'messiaen-6': 'modo 6 de Messiaen', 'messiaen-7': 'modo 7 de Messiaen',
  'pentatonic major': 'pentatónica mayor', 'pentatonic minor': 'pentatónica menor',
  blues: 'blues', 'blues major': 'blues mayor',
  'bebop dominant': 'bebop dominante', 'bebop major': 'bebop mayor', 'bebop dorian': 'bebop dórico',
  'double harmonic': 'doble armónica', 'hungarian minor': 'húngara menor',
  'neapolitan minor': 'napolitana menor', 'neapolitan major': 'napolitana mayor',
  enigmatic: 'enigmática', persian: 'persa', prometheus: 'de Prometeo',
  balinese: 'balinesa', chinese: 'china', egyptian: 'egipcia',
  'greek-dorian': 'dórico griego', 'greek-phrygian': 'frigio griego', 'greek-lydian': 'lidio griego',
  'greek-mixolydian': 'mixolidio griego', 'greek-hypodorian': 'hipodórico griego',
  'greek-hypophrygian': 'hipofrigio griego', 'greek-hypolydian': 'hipolidio griego',
  'greek-hypomixolydian': 'hipomixolidio griego',
  spanish: 'española', flamenco: 'flamenca', hindu: 'hindú', 'romanian minor': 'rumana menor',
  byzantine: 'bizantina', 'gypsy major': 'gitana mayor', 'gypsy minor': 'gitana menor',
};

/**
 * A scale or mode name in another language, with or without a root: the `name` of
 * `findScalesForNotes` and `scale` of `getSuggestedScales` (`'D dorian'`), or the
 * `sourceMode` of `getBorrowedChords` and `borrowedFrom` of `analyzeProgression`
 * (`'harmonic minor'`). Names without a translation (hirajoshi, pelog, freygish…) are kept.
 * Roots are in solfège in Spanish and in letters in English unless `roots` says otherwise.
 * @example scaleName('F# lydian dominant', 'es') // 'Fa# lidio dominante'
 * @example scaleName('A harmonic minor', 'en', { roots: 'solfege' }) // 'La harmonic minor'
 * @category Tonal harmony
 */
export function scaleName(
  name: string,
  language: ChordNameLanguage = 'en',
  options: { roots?: 'letters' | 'solfege' } = {},
): string {
  const m = name.match(/^([A-G](?:#{1,2}|b{1,2})?) (.+)$/);
  const [root, type] = m ? [m[1], m[2]] : [undefined, name];
  const words = language === 'es' ? SCALE_NAMES_ES[type.toLowerCase()] ?? type : type;
  if (!root) return words;
  const solfege = (options.roots ?? (language === 'es' ? 'solfege' : 'letters')) === 'solfege';
  return `${solfege ? localizeNoteName(root, 'es') : root} ${words}`;
}

// Cadences of `Harmony.analyzeCadence`: [long, short] name per language
const CADENCE_NAMES: Record<string, Record<ChordNameLanguage, [string, string]>> = {
  'Authentic Cadence': { en: ['Authentic Cadence', 'Authentic'], es: ['Cadencia auténtica', 'Auténtica'] },
  'Plagal Cadence': { en: ['Plagal Cadence', 'Plagal'], es: ['Cadencia plagal', 'Plagal'] },
  'Minor Plagal Cadence': { en: ['Minor Plagal Cadence', 'Minor plagal'], es: ['Cadencia plagal menor', 'Plagal menor'] },
  'Deceptive Cadence': { en: ['Deceptive Cadence', 'Deceptive'], es: ['Cadencia rota', 'Rota'] },
  'Half Cadence': { en: ['Half Cadence', 'Half'], es: ['Semicadencia', 'Semicadencia'] },
  'Phrygian Cadence': { en: ['Phrygian Cadence', 'Phrygian'], es: ['Cadencia frigia', 'Frigia'] },
  'Phrygian Half Cadence': { en: ['Phrygian Half Cadence', 'Phrygian half'], es: ['Semicadencia frigia', 'Semicadencia frigia'] },
  'Backdoor Cadence': { en: ['Backdoor Cadence', 'Backdoor'], es: ['Cadencia backdoor', 'Backdoor'] },
  'Picardy Third': { en: ['Picardy Third', 'Picardy third'], es: ['Tercera de picardía', 'Tercera de picardía'] },
  'Tritone Sub Resolution': { en: ['Tritone Sub Resolution', 'Tritone sub'], es: ['Resolución del sustituto tritonal', 'Sustituto tritonal'] },
  'No standard cadence': { en: ['No standard cadence', 'None'], es: ['Sin cadencia', 'Ninguna'] },
};

/**
 * A cadence from `Harmony.analyzeCadence` (or `cadenceWithNext` of `analyzeProgression`) in
 * another language. The long form keeps the numerals (`'Cadencia rota (V -> vi)'`); `short`
 * gives the name alone (`'Rota'`, `'Authentic'`). An unknown string is returned unchanged.
 * @category Tonal harmony
 */
export function cadenceName(cadence: string, language: ChordNameLanguage = 'en', options: { short?: boolean } = {}): string {
  const m = cadence.match(/^(.*?)(?: (\(.*\)))?$/);
  const names = m ? CADENCE_NAMES[m[1]]?.[language] : undefined;
  if (!m || !names) return cadence;
  if (options.short) return names[1];
  return m[2] ? `${names[0]} ${m[2]}` : names[0];
}

const SUBSTITUTION_NAMES: Record<string, Record<ChordNameLanguage, string>> = {
  tritone: { en: 'tritone', es: 'tritonal' },
  diatonic: { en: 'diatonic', es: 'diatónica' },
  deceptive: { en: 'deceptive', es: 'rota' },
  'chromatic-mediant': { en: 'chromatic mediant', es: 'mediante cromática' },
  sus4: { en: 'sus4', es: 'sus4' },
  modal: { en: 'modal', es: 'modal' },
};

/**
 * The `type` of a `getSubstitutions` option in words: `'tritone'` → `'tritonal'`
 * (sustitución tritonal), `'chromatic-mediant'` → `'chromatic mediant'` / `'mediante cromática'`.
 * An unknown type is returned unchanged.
 * @category Tonal harmony
 */
export function substitutionTypeName(type: string, language: ChordNameLanguage = 'en'): string {
  return SUBSTITUTION_NAMES[type]?.[language] ?? type;
}
