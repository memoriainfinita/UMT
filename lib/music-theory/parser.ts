import { CHORD_FORMULAS, SCALE_PATTERNS } from './dictionaries';
import { TET12, TuningSystem } from './tuning';
import { Chord } from './chord';
import { Scale } from './scale';
import { Note } from './note';
import { parseNoteToStep12TET, preferFlatsForKey, spellByLetter } from './utils';

/**
 * Attempts to parse a chord suffix using a compositional grammar when the
 * dictionary has no entry for it.
 *
 * Grammar: `<quality>? <'maj'|'M'>? <number>? <alteration>*`
 * - quality:    `m` | `dim` | `aug` | `sus2` | `sus4`  (default: major)
 * - maj prefix: `maj` or `M` before a digit → major 7th instead of dominant 7th
 * - number:     `7` | `9` | `11` | `13`  (implies all lower extensions)
 * - alteration: `b5` | `#5` | `b9` | `#9` | `#11` | `b13`  (any order)
 *
 * Returns a sorted interval array in 12-TET semitones, or `null` if the suffix
 * cannot be parsed (e.g. it is a named chord like `add9` or `dim7`).
 */
function parseCompositionalSuffix(suffix: string): readonly number[] | null {
  let rest = suffix.replace(/\s+/g, '');

  type Quality = 'M' | 'm' | 'dim' | 'aug' | 'sus2' | 'sus4';
  let quality: Quality = 'M';

  if (rest.startsWith('sus4'))      { quality = 'sus4'; rest = rest.slice(4); }
  else if (rest.startsWith('sus2')) { quality = 'sus2'; rest = rest.slice(4); }
  else if (rest.startsWith('dim'))  { quality = 'dim';  rest = rest.slice(3); }
  else if (rest.startsWith('aug'))  { quality = 'aug';  rest = rest.slice(3); }
  else if (rest.startsWith('m') && !rest.startsWith('maj')) { quality = 'm'; rest = rest.slice(1); }

  let isMaj7 = false;
  if (rest.startsWith('maj')) {
    isMaj7 = true; rest = rest.slice(3);
  } else if (rest.startsWith('M') && /^\d/.test(rest[1] ?? '')) {
    isMaj7 = true; rest = rest.slice(1);
  }

  let number: 7 | 9 | 11 | 13 | null = null;
  if (rest.startsWith('13'))      { number = 13; rest = rest.slice(2); }
  else if (rest.startsWith('11')) { number = 11; rest = rest.slice(2); }
  else if (rest.startsWith('9'))  { number = 9;  rest = rest.slice(1); }
  else if (rest.startsWith('7'))  { number = 7;  rest = rest.slice(1); }

  if (number === null && !isMaj7) return null;

  const ALTS = ['#11', 'b13', '#5', 'b5', '#9', 'b9'] as const;
  type Alt = typeof ALTS[number];
  const alterations: Alt[] = [];

  while (rest.length > 0) {
    const found = ALTS.find(a => rest.startsWith(a));
    if (!found) return null;
    alterations.push(found);
    rest = rest.slice(found.length);
  }

  const iv = new Set<number>([0]);

  switch (quality) {
    case 'M':    iv.add(4); iv.add(7); break;
    case 'm':    iv.add(3); iv.add(7); break;
    case 'dim':  iv.add(3); iv.add(6); break;
    case 'aug':  iv.add(4); iv.add(8); break;
    case 'sus2': iv.add(2); iv.add(7); break;
    case 'sus4': iv.add(5); iv.add(7); break;
  }

  if (isMaj7)        iv.add(11);
  else if (number !== null) iv.add(10);

  if (number !== null && number >= 9)  iv.add(14);
  if (number !== null && number >= 11) iv.add(17);
  if (number !== null && number >= 13) iv.add(21);

  for (const alt of alterations) {
    switch (alt) {
      case 'b5':  iv.delete(7);  iv.add(6);  break;
      case '#5':  iv.delete(7);  iv.add(8);  break;
      case 'b9':  iv.delete(14); iv.add(13); break;
      case '#9':  iv.delete(14); iv.add(15); break;
      case '#11': iv.delete(17); iv.add(18); break;
      case 'b13': iv.delete(21); iv.add(20); break;
    }
  }

  return [...iv].sort((a, b) => a - b);
}

/**
 * Normalizes chord suffix shorthands to canonical dictionary keys.
 * Context-independent: '-7' → 'm7', 'Δ' → 'maj7', 'ø' → 'm7b5', etc.
 */
function normalizeSuffix(type: string): string {
  if (type === '') return 'M';
  if (type === '-') return 'm';
  if (type === 'maj' || type === 'Maj') return 'M';
  if (type === '-7') return 'm7';
  if (type === 'Δ' || type === '△' || type === 'Δ7' || type === '△7' || type === 'M7') return 'maj7';
  if (type === 'ø' || type === 'ø7') return 'm7b5';
  if (type === 'o' || type === '°') return 'dim';
  if (type === 'o7' || type === '°7') return 'dim7';
  if (type === '+') return 'aug';
  if (type === '+7') return 'aug7';
  if (type === '7alt') return 'alt';
  return type;
}

/**
 * Parses a standard chord symbol into a `Chord` object.
 *
 * Supported formats:
 * - Triads: `C`, `Cm`, `Cdim`, `Caug`, `Csus2`, `Csus4`
 * - Seventh chords: `Cmaj7`, `Cm7`, `C7`, `Cdim7`, `Cm7b5`, `CmM7`
 * - Extended: `C9`, `C11`, `C13`, `Cmaj9`, etc.
 * - Altered: `C7b9`, `C7#11`, `C7alt`, `Calt`
 * - Slash chords: `C/E`, `Cmaj7/G`, `C6/9/E` (only a note name after the last slash is a bass)
 * - Shorthands: `CΔ`, `CΔ7`, `Cø`, `C-7`, `C°`, `C°7`, `C+`
 * - Compositional (any combination): `Cm9b5`, `C13b9#11`, `CmM9`, `Cmaj13#11`
 *   Alterations (`b5 #5 b9 #9 #11 b13`) may appear in any order.
 *   Spaces within the suffix are ignored (`C7 b9 #11` = `C7b9#11`).
 *
 * Resolution order: dictionary lookup → compositional parser → error.
 * Named chords (`dim7`, `add9`, `6/9`, `alt`, etc.) are always resolved via
 * the dictionary regardless of whether they could be parsed compositionally.
 *
 * Root is case-insensitive (`cmaj7` = `Cmaj7`).
 *
 * @param symbol - Chord symbol string.
 * @param tuning - Target tuning system (default: 12-TET). Intervals are mapped via `getStepFromStandard`.
 * @param octave - Octave for the root note (default: 4).
 * @throws if the symbol cannot be parsed or the chord type is neither in the dictionary nor compositionally valid.
 */
export function parseChordSymbol(symbol: string, tuning: TuningSystem = TET12, octave: number = 4): Chord {
  // Normalize root to uppercase (e.g. "cmaj7" → "Cmaj7")
  const normalizedSymbol = symbol.trim().charAt(0).toUpperCase() + symbol.trim().slice(1);

  // Separate main symbol and bass note for slash chords. Only a note name after the last
  // slash is a bass: the slash in `6/9` belongs to the chord type.
  const slash = normalizedSymbol.match(/^(.*)\/\s*([A-Ga-g][#b]*)$/);
  const mainSymbol = slash ? slash[1] : normalizedSymbol;
  const bassSymbol = slash ? slash[2] : undefined;

  const match = mainSymbol.match(/^([A-G][#b]*)(.*)$/);
  if (!match) throw new Error(`parseChordSymbol: invalid chord symbol "${symbol}".`);

  const [, rootName, typeRaw] = match;
  const type = normalizeSuffix(typeRaw.trim());

  const intervals12TET = CHORD_FORMULAS[type] ?? parseCompositionalSuffix(type);
  if (!intervals12TET) throw new Error(`parseChordSymbol: unknown chord type "${typeRaw}" in "${symbol}".`);

  const intervals = intervals12TET.map(s => tuning.getStepFromStandard(s));
  const rootStep = tuning.getStepFromStandard(parseNoteToStep12TET(rootName, octave));

  let bassStep: number | undefined = undefined;
  if (bassSymbol) {
    const bassNormalized = bassSymbol.trim().charAt(0).toUpperCase() + bassSymbol.trim().slice(1);
    bassStep = tuning.getStepFromStandard(parseNoteToStep12TET(bassNormalized, octave));
  }

  const pf = rootName.includes('#') ? false : rootName.includes('b') ? true : preferFlatsForKey(rootName);
  return new Chord(normalizedSymbol, tuning, rootStep, intervals, bassStep, pf);
}

/**
 * Parses a scale symbol into a `Scale` object.
 *
 * Format: `"<Root> <type>"`, e.g. `"C# dorian"`, `"Bb harmonic minor"`, `"D melodic minor"`.
 * Root is case-insensitive. Scale type must match a key in `SCALE_PATTERNS` (case-insensitive).
 *
 * @param symbol - Scale symbol string with root and type separated by a space.
 * @param tuning - Target tuning system (default: 12-TET). Pattern steps are mapped via `getStepFromStandard`.
 * @param octave - Octave for the root note (default: 4).
 * @throws if the symbol cannot be parsed or the scale type is unknown.
 */
export function parseScaleSymbol(symbol: string, tuning: TuningSystem = TET12, octave: number = 4): Scale {
  const match = symbol.match(/^([A-G][#b]*)\s+(.*)$/i);
  if (!match) throw new Error(`parseScaleSymbol: invalid scale symbol "${symbol}". Expected format: "C dorian", "Bb major".`);

  const [, rootName, typeRaw] = match;
  const type = typeRaw.trim().toLowerCase();

  const pattern12TET = SCALE_PATTERNS[type];
  if (!pattern12TET) throw new Error(`parseScaleSymbol: unknown scale type "${typeRaw}" in "${symbol}".`);

  const pattern = pattern12TET.map(s => tuning.getStepFromStandard(s));
  const rootNormalized = rootName.charAt(0).toUpperCase() + rootName.slice(1);
  const rootStep = tuning.getStepFromStandard(parseNoteToStep12TET(rootNormalized, octave));
  const pf = rootNormalized.includes('#') ? false : rootNormalized.includes('b') ? true : preferFlatsForKey(rootNormalized, type);
  return new Scale(symbol, tuning, rootStep, pattern, pf);
}

/**
 * Parses a note string into a `Note` object in 12-TET.
 *
 * Accepts: `"C4"`, `"Bb3"`, `"F#"`, `"c#5"` (case-insensitive root).
 * The original spelling (sharp or flat) is preserved in the returned Note's name.
 *
 * @param noteStr - Note string with optional octave number.
 * @param defaultOctave - Octave to use if none is specified (default: 4).
 * @throws if the string cannot be parsed.
 */
export function parseNote(noteStr: string, defaultOctave: number = 4): Note {
  const match = noteStr.trim().match(/^([A-G])([#b]*)(-?\d+)?$/i);
  if (!match) throw new Error(`parseNote: invalid note string "${noteStr}".`);

  const name = match[1].toUpperCase() + match[2];
  const oct = match[3] ? parseInt(match[3], 10) : defaultOctave;

  const step = parseNoteToStep12TET(name, oct);
  // Preserve the original spelling so "Bb4" returns a Note named "Bb4", not "A#4".
  return new Note(TET12, step, `${name}${oct}`);
}

const ROMAN_VALUES: Record<string, number> = {
  'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7
};

const ROMAN_TOKEN = /^(sub)?(bb|b|##|#)?(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/;

/** A suffix that already says the chord's quality (`m7b5`, `dim`, `sus4`, `maj7`…). */
const QUALITY_PREFIX = /^(m(?!aj)|dim|aug|sus|alt|maj|M\d|°|o|ø|\+|-|Δ|△)/;

type RomanKey = { scale: Scale; letters: string[]; naturalMinor: boolean };

function romanKey(keySymbol: string, octave: number): RomanKey {
  // Names and qualities come from the 12-TET key; the chord is then mapped to the tuning
  const scale = parseScaleSymbol(keySymbol, TET12, octave);
  if (scale.stepPattern.length !== 7) {
    throw new Error(`parseRomanProgression: "${keySymbol}" is not a seven-note key.`);
  }
  const type = keySymbol.trim().replace(/^\S+\s+/, '').toLowerCase();
  return {
    scale,
    letters: scale.getNotes().slice(0, 7).map(n => n.name),
    naturalMinor: type === 'minor' || type === 'aeolian' || type === 'natural minor',
  };
}

/**
 * One Roman numeral in a key → chord symbol with octave (`"Dm"`, 4). The case gives the
 * third; what the numeral leaves unsaid comes from the key: `ii` in C is Dm, `vii` is
 * Bdim, `vii7` is Bm7b5, `V7` is G7, `I7` is Cmaj7. A numeral whose third is not the key's
 * takes the plain chord of its case (`II` → D, `II7` → D7, `iv` in major → Fm, `iv7` →
 * Fm7). Accidentals move the key's own degree (`bVII` in C is Bb; in A minor, Gb).
 * In a natural minor key, `vii°`, `vii°7` and `viiø7` stand on the raised leading tone.
 */
function romanToSymbol(token: string, key: RomanKey): { symbol: string; octave: number } {
  const m = token.match(ROMAN_TOKEN);
  if (!m) throw new Error(`parseRomanProgression: invalid Roman numeral "${token}".`);
  const [, isSub, acc = '', roman, suffixRaw] = m;
  if (roman !== roman.toUpperCase() && roman !== roman.toLowerCase()) {
    throw new Error(`parseRomanProgression: mixed-case numeral "${token}".`);
  }
  const degree = ROMAN_VALUES[roman.toLowerCase()];
  const lower = roman === roman.toLowerCase();
  const suffix = suffixRaw.trim();

  const degreeName = key.letters[degree - 1];
  const letter = degreeName[0];
  const degreeStep = parseNoteToStep12TET(degreeName.replace(/-?\d+$/, ''), parseInt(degreeName.match(/-?\d+$/)![0], 10));
  let shift = [...acc].reduce((n, c) => n + (c === '#' ? 1 : -1), 0);
  // the leading-tone chord of a natural minor key stands on the raised seventh
  if (key.naturalMinor && degree === 7 && lower && acc === '' && /^(°|o|ø|dim|m7b5)/.test(suffix)) shift = 1;

  let type: string;
  const diatonic = acc === '' && shift === 0;
  if (/^dom\d/.test(suffix)) {
    // explicit dominant, whatever the key's seventh (`Idom7` in C is C7, `IVdom9` F9)
    if (lower) throw new Error(`parseRomanProgression: a dominant needs an upper-case numeral, got "${token}".`);
    type = suffix.slice(3);
  } else if (suffix === '' || suffix === '7') {
    const chord = key.scale.getChordOnDegree(degree, suffix === '7' ? 'seventh' : 'triad');
    const pcs = chord.intervalsInSteps.map(i => ((i % 12) + 12) % 12);
    const keyThirdMinor = pcs.includes(3);
    if (diatonic && keyThirdMinor === lower && !chord.name.includes('(')) {
      type = chord.name.replace(/^[A-G][#b]*/, '');
    } else {
      type = suffix === '7' ? (lower ? 'm7' : '7') : (lower ? 'm' : '');
    }
  } else {
    const normalized = suffix === 'o' || suffix === '°' ? 'dim' : suffix;
    type = lower && !QUALITY_PREFIX.test(normalized) ? `m${normalized}` : normalized;
  }

  let step = degreeStep + shift;
  let spelled = spellByLetter(step, letter, 0);
  if (isSub) {
    // tritone substitute: a diminished fifth above, on the letter four above (G → Db)
    step += 6;
    spelled = spellByLetter(step, letter, 4);
  }
  if (!spelled) throw new Error(`parseRomanProgression: cannot spell the root of "${token}".`);
  const [, root, oct] = spelled.match(/^([A-G][#b]*)(-?\d+)$/)!;
  const canonical = normalizeSuffix(type);
  return { symbol: `${root}${canonical === 'M' ? '' : canonical}`, octave: parseInt(oct, 10) };
}

/**
 * Parses a Roman numeral progression in a given key into an array of `Chord` objects.
 *
 * - Case gives the third: `I`, `IV`, `V` major; `ii`, `iii`, `vi` minor
 * - What the numeral leaves unsaid comes from the key: `vii` in C major is Bdim,
 *   `ii7` is Dm7, `vii7` is Bm7b5, `V7` is G7, `I7` is Cmaj7. A third that is not the
 *   key's gives the plain chord of the case: `II` is D, `II7` D7, `iv7` in major Fm7
 * - Any other suffix is a chord type, read like `parseChordSymbol` (dictionary, then
 *   compositional); lower case adds the minor third: `ii9` is Dm9, `V7b9` G7b9,
 *   `viiø7` Bm7b5, `vii°7` Bdim7. An unknown suffix throws
 * - `dom` asks for a dominant whatever the key says: `Idom7` in C is C7, `IVdom9` F9
 * - Accidentals move the key's own degree: `bVII` in C major is Bb, `bII` in A minor is
 *   Bb. In minor, `VII` and `VI` are the natural degrees (G and F in A minor), and
 *   `vii°`, `vii°7`, `viiø7` stand on the raised leading tone (G#)
 * - Applied chords: `V7/ii`, `vii°7/V`, `V/bVI` (read in the major or minor key of the
 *   target, as its case says)
 * - Tritone substitution: `subV7`, `subV7/ii`
 *
 * Roots are named as the key writes them (`bII` in E major is F, `V/vi` in Db major is Ab).
 * Example: `parseRomanProgression("ii7 V7 subV7/ii Imaj7", "C major")`
 *
 * @param progression - Space- or hyphen-separated Roman numeral tokens.
 * @param keySymbol - Seven-note key, e.g. `"C major"`, `"A minor"`, `"D dorian"`.
 * @param tuning - Target tuning system (default: 12-TET). Chords are built as in
 *   `parseChordSymbol`, with intervals mapped by `getStepFromStandard`.
 * @param octave - Octave of the key's tonic (default: 4).
 * @throws on an invalid numeral, an unknown suffix or a key that is not heptatonic.
 */
export function parseRomanProgression(progression: string, keySymbol: string, tuning: TuningSystem = TET12, octave: number = 4): Chord[] {
  const key = romanKey(keySymbol, octave);
  const tokens = progression.split(/[\s-]+/).filter(t => t.length > 0);

  return tokens.map(token => {
    // `V7/ii`: the target is a bare degree of the main key, and the applied numeral is
    // read in the target's key (major or minor by its case). `I6/9` is not applied.
    const applied = token.match(/^(.+)\/((?:bb|b|##|#)?(?:IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v))$/);
    let chordKey = key;
    if (applied) {
      const target = romanToSymbol(applied[2], key);
      const targetRoot = target.symbol.match(/^[A-G][#b]*/)![0];
      const targetMinor = /[iv]/.test(applied[2]);
      chordKey = romanKey(`${targetRoot} ${targetMinor ? 'minor' : 'major'}`, target.octave);
    }
    const { symbol, octave: rootOctave } = romanToSymbol(applied ? applied[1] : token, chordKey);
    try {
      return parseChordSymbol(symbol, tuning, rootOctave);
    } catch {
      throw new Error(`parseRomanProgression: unknown chord type in "${token}" (read as "${symbol}").`);
    }
  });
}

/**
 * Parses a polychord notation into two separate chords.
 *
 * Formats supported:
 * - `"Fmaj7|Gmaj7"` - upper chord | lower chord (vertical stack)
 * - `"D/C"` - upper chord over the triad of the bass note; throws when the bass is a
 *   tone of the upper chord (`"C/E"` is an inversion: use `parseChordSymbol`)
 *
 * @throws if the symbol cannot be parsed.
 */
export function parsePolychord(
  symbol: string,
  tuning: TuningSystem = TET12
): { upper: Chord; lower: Chord } {
  const s = symbol.trim();

  // Explicit polychord separator: `|`
  if (s.includes('|')) {
    const [upperSym, lowerSym] = s.split('|').map(p => p.trim());
    return {
      upper: parseChordSymbol(upperSym, tuning),
      lower: parseChordSymbol(lowerSym, tuning),
    };
  }

  // Slash notation: an upper chord over a lower triad on the bass note. A bass that is a
  // tone of the upper chord makes an inversion (C/E), not a polychord.
  if (s.includes('/')) {
    const cut = s.lastIndexOf('/');
    const upperSym = s.slice(0, cut).trim();
    const bassSym = s.slice(cut + 1).trim();
    const upper = parseChordSymbol(upperSym, tuning);
    const normalizedBass = bassSym.charAt(0).toUpperCase() + bassSym.slice(1);
    const lower = parseChordSymbol(normalizedBass, tuning);
    if (upper.contains(lower.rootStep)) {
      throw new Error(`parsePolychord: "${symbol}" is an inversion (the bass is a tone of ${upperSym}); use parseChordSymbol.`);
    }
    return { upper, lower };
  }

  throw new Error(`parsePolychord: unrecognized polychord format "${symbol}". Use "|" or "/" separator.`);
}

