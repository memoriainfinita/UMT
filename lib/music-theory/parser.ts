import { CHORD_FORMULAS, SCALE_PATTERNS } from './dictionaries';
import { TET12, TuningSystem } from './tuning';
import { Chord } from './chord';
import { Scale } from './scale';
import { Note } from './note';
import { get12TETName, get12TETBaseName, parseNoteToStep12TET } from './utils';

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
 * Infers the canonical chord suffix for a Roman numeral token.
 * Handles the context-dependent '7' rule (ii7=m7, V7=dom7, I7=maj7),
 * then delegates shorthands to normalizeSuffix.
 */
function inferRomanSuffix(raw: string, isMinor: boolean, degree: number): string {
  let s = raw.trim();
  if (s === '') return isMinor ? 'm' : 'M';
  if (s === '7') {
    if (isMinor) return 'm7';
    if (degree === 5) return '7';
    return 'maj7';
  }
  return normalizeSuffix(s);
}

/**
 * Parses a standard chord symbol into a `Chord` object.
 *
 * Supported formats:
 * - Triads: `C`, `Cm`, `Cdim`, `Caug`, `Csus2`, `Csus4`
 * - Seventh chords: `Cmaj7`, `Cm7`, `C7`, `Cdim7`, `Cm7b5`, `CmM7`
 * - Extended: `C9`, `C11`, `C13`, `Cmaj9`, etc.
 * - Altered: `C7b9`, `C7#11`, `C7alt`, `Calt`
 * - Slash chords: `C/E`, `Cmaj7/G`
 * - Shorthands: `CΔ`, `CΔ7`, `Cø`, `C-7`, `C°`, `C°7`, `C+`
 *
 * Root is case-insensitive (`cmaj7` = `Cmaj7`).
 *
 * @param symbol - Chord symbol string.
 * @param tuning - Target tuning system (default: 12-TET). Intervals are mapped via `getStepFromStandard`.
 * @param octave - Octave for the root note (default: 4).
 * @throws if the symbol cannot be parsed or the chord type is unknown.
 */
export function parseChordSymbol(symbol: string, tuning: TuningSystem = TET12, octave: number = 4): Chord {
  // Normalize root to uppercase (e.g. "cmaj7" → "Cmaj7")
  const normalizedSymbol = symbol.trim().charAt(0).toUpperCase() + symbol.trim().slice(1);

  // Separate main symbol and bass note for slash chords
  const [mainSymbol, bassSymbol] = normalizedSymbol.split('/');

  const match = mainSymbol.match(/^([A-G][#b]*)(.*)$/);
  if (!match) throw new Error(`parseChordSymbol: invalid chord symbol "${symbol}".`);

  const [, rootName, typeRaw] = match;
  const type = normalizeSuffix(typeRaw.trim());

  const intervals12TET = CHORD_FORMULAS[type];
  if (!intervals12TET) throw new Error(`parseChordSymbol: unknown chord type "${typeRaw}" in "${symbol}".`);

  const intervals = intervals12TET.map(s => tuning.getStepFromStandard(s));
  const rootStep = tuning.getStepFromStandard(parseNoteToStep12TET(rootName, octave));

  let bassStep: number | undefined = undefined;
  if (bassSymbol) {
    const bassNormalized = bassSymbol.trim().charAt(0).toUpperCase() + bassSymbol.trim().slice(1);
    bassStep = tuning.getStepFromStandard(parseNoteToStep12TET(bassNormalized, octave));
  }

  return new Chord(normalizedSymbol, tuning, rootStep, intervals, bassStep);
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
  const rootStep = tuning.getStepFromStandard(parseNoteToStep12TET(rootName.charAt(0).toUpperCase() + rootName.slice(1), octave));
  return new Scale(symbol, tuning, rootStep, pattern);
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

/**
 * Parses a Roman numeral progression in a given key into an array of `Chord` objects.
 *
 * Supported syntax:
 * - Uppercase numerals = major quality: `I`, `IV`, `V`
 * - Lowercase numerals = minor quality: `ii`, `iii`, `vi`
 * - `7` suffix: degree-sensitive — `ii7` = m7, `V7` = dom7, `I7` = maj7
 * - Other suffixes delegate to `normalizeSuffix`: `IVmaj7`, `iiø`, etc.
 * - Chromatic accidentals: `bVII`, `#IV`
 * - Applied chords: `V7/ii`, `IV/V`
 * - Tritone substitution: `subV7`, `subV7/ii`
 *
 * Example: `parseRomanProgression("ii7 V7 subV7/ii Imaj7", "C major")`
 *
 * **Note:** Applied chord names use 12-TET note names regardless of the target tuning.
 * This is a known limitation for non-12-TET tunings.
 *
 * @param progression - Space- or hyphen-separated Roman numeral tokens.
 * @param keySymbol - Key and scale type, e.g. `"C major"`, `"D dorian"`.
 * @param tuning - Target tuning system (default: 12-TET).
 * @param octave - Octave for root notes (default: 4).
 */
export function parseRomanProgression(progression: string, keySymbol: string, tuning: TuningSystem = TET12, octave: number = 4): Chord[] {
  const keyScale = parseScaleSymbol(keySymbol, tuning, octave);
  const scaleNotes = keyScale.getNotes(2); // Get 2 octaves to be safe
  
  const tokens = progression.split(/[\s-]+/).filter(t => t.length > 0);
  
  return tokens.map(token => {
    // Check for applied chords (e.g., V7/ii)
    const parts = token.split('/');
    if (parts.length === 2) {
      const appliedRoman = parts[0];
      const targetRoman = parts[1];
      
      // 1. Find the root step of the target roman numeral in the main key
      const targetMatch = targetRoman.match(/^([b#]?)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/i);
      if (!targetMatch) throw new Error(`Invalid target Roman numeral: ${targetRoman}`);
      
      const [, tAcc, tRom] = targetMatch;
      const tDegree = ROMAN_VALUES[tRom.toLowerCase()];
      let targetRootStep = scaleNotes[tDegree - 1].stepsFromBase;
      if (tAcc === 'b') targetRootStep -= 1;
      if (tAcc === '#') targetRootStep += 1;
      
      // 2. Create a temporary major scale based on that target root
      const targetRootName = get12TETBaseName(targetRootStep);
      // Determine if target is minor based on roman numeral casing
      const isTargetMinor = tRom === tRom.toLowerCase();
      const tempKeyScale = parseScaleSymbol(`${targetRootName} ${isTargetMinor ? 'minor' : 'major'}`, tuning, octave);
      const tempScaleNotes = tempKeyScale.getNotes(2);

      // 3. Parse the applied roman numeral in that temporary key
      const appliedMatch = appliedRoman.match(/^(sub)?([b#]?)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/i);
      if (!appliedMatch) throw new Error(`Invalid applied Roman numeral: ${appliedRoman}`);

      const [, isSub, aAcc, aRom, aSuffixRaw] = appliedMatch;
      const aDegree = ROMAN_VALUES[aRom.toLowerCase()];
      if (!aDegree) throw new Error(`parseRomanProgression: unknown Roman numeral "${aRom}" in applied chord "${token}".`);
      const isMinor = aRom === aRom.toLowerCase();
      const aSuffix = inferRomanSuffix(aSuffixRaw, isMinor, aDegree);

      const intervals12TET = CHORD_FORMULAS[aSuffix] || CHORD_FORMULAS['M'];
      const intervals = intervals12TET.map(s => tuning.getStepFromStandard(s));

      let rootStep = tempScaleNotes[aDegree - 1].stepsFromBase;
      if (aAcc === 'b') rootStep -= tuning.getStepFromStandard(1);
      if (aAcc === '#') rootStep += tuning.getStepFromStandard(1);

      if (isSub) {
        rootStep += tuning.getStepFromStandard(6); // Tritone substitution
      }

      const rootName = get12TETBaseName(rootStep, true);
      const chordName = `${rootName}${aSuffixRaw}`;

      return new Chord(chordName, tuning, rootStep, intervals);
    }
    
    // Normal parsing
    const match = token.match(/^(sub)?([b#]?)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/i);
    if (!match) throw new Error(`Invalid Roman numeral: ${token}`);
    
    const [, isSub, accidental, roman, suffixRaw] = match;
    const degree = ROMAN_VALUES[roman.toLowerCase()];
    if (!degree) throw new Error(`Unknown Roman numeral: ${roman}`);
    
    const isMinor = roman === roman.toLowerCase();
    const suffix = inferRomanSuffix(suffixRaw, isMinor, degree);

    const intervals12TET = CHORD_FORMULAS[suffix] || CHORD_FORMULAS['M'];
    const intervals = intervals12TET.map(s => tuning.getStepFromStandard(s));

    // Calculate root step
    let rootStep = scaleNotes[degree - 1].stepsFromBase;
    if (accidental === 'b') rootStep -= tuning.getStepFromStandard(1);
    if (accidental === '#') rootStep += tuning.getStepFromStandard(1);

    if (isSub) {
      rootStep += tuning.getStepFromStandard(6); // Tritone substitution
    }

    // Create a readable chord name like "Gmaj7"
    const preferFlats = !!isSub || accidental === 'b';
    const rootName = get12TETBaseName(rootStep, preferFlats);
    const chordName = `${rootName}${suffixRaw}`;

    return new Chord(chordName, tuning, rootStep, intervals);
  });
}
