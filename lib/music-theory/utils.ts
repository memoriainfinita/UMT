/**
 * Utility functions for note naming, MIDI conversion, interval naming,
 * and enharmonic spelling in 12-TET.
 */
import { Hertz, MidiNote } from './types';

/** Note names in 12-TET using sharps, ordered from A (index 0 = A, index 3 = C, etc.). */
export const NOTE_NAMES_12TET_SHARP = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
/** Note names in 12-TET using flats, ordered from A (index 0 = A, index 3 = C, etc.). */
export const NOTE_NAMES_12TET_FLAT = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

const NOTE_REGEX = /^([A-G])([#b]*)/;

/**
 * Converts a standard note name (e.g., "C#", "Bb") + octave to steps from A4 in 12-TET.
 * A4 = 0. C4 = -9.
 */
export function parseNoteToStep12TET(noteName: string, octave: number = 4): number {
  const baseNotes: Record<string, number> = { 'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2 };
  const match = noteName.match(NOTE_REGEX);
  if (!match) throw new Error(`Invalid note name: ${noteName}`);
  const [, note, accidentals] = match;
  let step = baseNotes[note];
  for (const acc of accidentals) {
    if (acc === '#') step += 1;
    if (acc === 'b') step -= 1;
  }
  step += (octave - 4) * 12;
  return step;
}

/**
 * Returns the full note name with octave for a step offset from A4 in 12-TET.
 * @param stepsFromA4 - Integer semitone offset from A4 (A4 = 0, C4 = -9).
 * @param preferFlats - If true, uses flat spelling (e.g. Bb instead of A#).
 * @returns Note name with octave, e.g. `"C4"`, `"Bb3"`.
 */
export function get12TETName(stepsFromA4: number, preferFlats: boolean = false): string {
  const normalizedStep = ((stepsFromA4 % 12) + 12) % 12;
  const octave = Math.floor((stepsFromA4 + 9) / 12) + 4; // A4 is step 0. C4 is step -9.
  const names = preferFlats ? NOTE_NAMES_12TET_FLAT : NOTE_NAMES_12TET_SHARP;
  return `${names[normalizedStep]}${octave}`;
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_STEPS: Record<string, number> = { 'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2 };

/**
 * Names a 12-TET step using the letter `degree` positions above `rootLetter`
 * (degree 0 = the root letter itself), with whatever accidentals that letter needs.
 * The octave number follows the letter, so B#3 and C4 are the same pitch.
 * @returns Full name with octave (e.g. `"E#4"`, `"Cb5"`), or null when the letter
 *   would need more than two accidentals.
 */
export function spellByLetter(stepsFromA4: number, rootLetter: string, degree: number): string | null {
  const rootIdx = LETTERS.indexOf(rootLetter);
  if (rootIdx === -1) return null;
  const letter = LETTERS[(rootIdx + degree) % 7];
  const natural = LETTER_STEPS[letter];
  // Signed distance from the natural letter, folded to the nearest octave (-6..5).
  const diff = ((((stepsFromA4 - natural) % 12) + 18) % 12) - 6;
  if (Math.abs(diff) > 2) return null;
  const octave = Math.round((stepsFromA4 - diff - natural) / 12) + 4;
  const acc = diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  return `${letter}${acc}${octave}`;
}

/**
 * Letter offset of a chord tone above the root, from its interval in semitones and the
 * rest of the chord (`pcs`: the chord's intervals mod 12): 6 is b5 without a perfect fifth
 * and #11 with one; 8 is #5 or b13; 3 is #9 when the chord has a major third; 9 is the
 * bb7 of a diminished seventh.
 */
export function chordToneOffset(semitones: number, pcs: ReadonlySet<number>): number {
  switch (((semitones % 12) + 12) % 12) {
    case 0: return 0;
    case 1: case 2: return 1;
    case 3: return pcs.has(4) ? 1 : 2;
    case 4: return 2;
    case 5: return 3;
    case 6: return pcs.has(7) ? 3 : 4;
    case 7: return 4;
    case 8: return pcs.has(7) ? 5 : 4;
    case 9: return pcs.has(3) && pcs.has(6) && !pcs.has(10) && !pcs.has(11) ? 6 : 5;
    default: return 6;   // 10, 11: the seventh
  }
}

/**
 * The written root of a symbol (`"Cb"` from `"Cbmaj7"`, `"E#"` from `"E# major"`) when it
 * names the pitch of `stepsFromA4` in 12-TET; otherwise null.
 */
export function writtenRoot(symbol: string, stepsFromA4: number): string | null {
  const root = symbol.match(/^([A-G][#b]*)/)?.[1];
  if (!root) return null;
  const pc = (n: number) => ((n % 12) + 12) % 12;
  return pc(parseNoteToStep12TET(root)) === pc(stepsFromA4) ? root : null;
}

/** Returns just the note letter+accidental without octave number (e.g. "C#", "Bb"). */
export function get12TETBaseName(stepsFromA4: number, preferFlats: boolean = false): string {
  const normalizedStep = ((stepsFromA4 % 12) + 12) % 12;
  const names = preferFlats ? NOTE_NAMES_12TET_FLAT : NOTE_NAMES_12TET_SHARP;
  return names[normalizedStep];
}

/**
 * Returns the other spellings of a note, up to double sharps and double flats (`##`,
 * `bb`), fewest accidentals first. With an octave, the octave follows the letter
 * (C4 → B#3, Dbb4).
 * @param noteName - Note name with optional accidental and octave, e.g. `"C#"`, `"F#4"`.
 * @returns Enharmonic equivalents, e.g. `["Db", "B##"]` for `"C#"`; empty for an invalid name.
 */
export function getEnharmonics(noteName: string): string[] {
  const match = noteName.trim().match(/^([A-G])([#b]*)(-?\d+)?$/);
  if (!match) return [];
  const [, letter, acc, octave] = match;
  const step = parseNoteToStep12TET(letter + acc, octave !== undefined ? parseInt(octave, 10) : 4);
  const count = (n: string) => (n.match(/[#b]/g) ?? []).length;
  return LETTERS
    .map((_, degree) => spellByLetter(step, 'C', degree))
    .filter((n): n is string => n !== null && n[0] !== letter)
    .sort((a, b) => count(a) - count(b))
    .map(n => (octave !== undefined ? n : n.replace(/-?\d+$/, '')));
}
/** Major key roots that use flat accidentals (circle of fifths, flat side). */
const FLAT_MAJOR_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);
/** Minor key roots that use flat accidentals (circle of fifths, flat side). */
const FLAT_MINOR_ROOTS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']);

/**
 * Semitones from a mode root down to its parent major (Ionian) root.
 * Used to compute the parent key and determine flat/sharp preference via the circle of fifths.
 */
const MAJOR_MODE_PARENT_OFFSET: Record<string, number> = {
  'major': 0, 'ionian': 0, 'bebop major': 0, 'blues major': 0, 'harmonic major': 0,
  'dorian': 2, 'bebop dorian': 2,
  'phrygian': 4,
  'lydian': 5,
  'mixolydian': 7, 'bebop dominant': 7,
  'aeolian': 9, 'natural minor': 9,
  'locrian': 11,
};

/**
 * Semitones from a mode root down to its parent minor root: modes of the harmonic and
 * melodic minor take the key signature of that minor key (E phrygian dominant → A minor,
 * G lydian dominant → D minor).
 */
const MINOR_MODE_PARENT_OFFSET: Record<string, number> = {
  'minor': 0,
  // harmonic minor family
  'harmonic minor': 0, 'locrian #6': 2, 'ionian #5': 3, 'dorian #4': 5,
  'phrygian dominant': 7, 'lydian #2': 8, 'super locrian bb7': 11,
  // melodic minor family
  'melodic minor': 0, 'jazz minor': 0, 'dorian b2': 2, 'lydian augmented': 3,
  'lydian dominant': 5, 'mixolydian b6': 7, 'locrian #2': 9, 'altered': 11, 'super locrian': 11,
};

/**
 * Returns true if the given key should use flat accidentals for note naming.
 *
 * Uses circle-of-fifths logic extended to the church modes and the modes of harmonic and
 * melodic minor. For major-family modes, the parent Ionian key is looked up in the circle;
 * for minor-family modes, the parent minor key (a minor tonic is looked up by its own name).
 * Falls back to checking the root's own accidental for unknown scale types.
 *
 * @param rootName - Root note name (e.g. 'D', 'Bb', 'F#'). Octave digits are stripped.
 * @param scaleType - Scale or mode type (e.g. 'major', 'dorian', 'harmonic minor'). Default: 'major'.
 */
export function preferFlatsForKey(rootName: string, scaleType: string = 'major'): boolean {
  const base = rootName.replace(/\d+$/, '');
  const normalized = base.charAt(0).toUpperCase() + base.slice(1);
  const type = scaleType.toLowerCase().trim();
  const parentPc = (offset: number) => {
    const rootPC = ((parseNoteToStep12TET(normalized, 4) % 12) + 12) % 12;
    return ((rootPC - offset) % 12 + 12) % 12;
  };

  // Major-mode family: compute parent major key pitch class, then look up in flat set.
  const majorOffset = MAJOR_MODE_PARENT_OFFSET[type];
  if (majorOffset !== undefined) {
    return FLAT_MAJOR_ROOTS.has(NOTE_NAMES_12TET_FLAT[parentPc(majorOffset)]);
  }

  // Minor-family modes: the parent minor key; a minor tonic keeps its own name (A# minor).
  const minorOffset = MINOR_MODE_PARENT_OFFSET[type];
  if (minorOffset !== undefined) {
    return FLAT_MINOR_ROOTS.has(minorOffset === 0 ? normalized : NOTE_NAMES_12TET_FLAT[parentPc(minorOffset)]);
  }

  // Fallback: check root's own accidental (covers custom/unknown scale types).
  return /[A-G]b/.test(base);
}

/**
 * @deprecated Use `preferFlatsForKey(rootName, scaleType)` instead.
 * This alias only considers the root note without scale-type context,
 * which gives incorrect results for modes and minor-family scales.
 */
export function usesFlats(rootName: string): boolean {
  return preferFlatsForKey(rootName);
}

/** Semitones of the major or perfect interval for each simple number (unison to seventh). */
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
/** Default number (0 = unison … 6 = seventh) for each semitone mod 12; the tritone is d5. */
const DEFAULT_NUMBER = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];

/**
 * Quality symbol of an interval from its number (1-based, any size) and its semitones:
 * P, M, m, A, d, AA, dd. Null when the pair is further than a doubly augmented or
 * doubly diminished interval.
 */
function intervalQuality(number: number, semitones: number): string | null {
  const simple = (number - 1) % 7;
  const octaves = Math.floor((number - 1) / 7);
  const diff = semitones - (NATURAL_SEMITONES[simple] + 12 * octaves);
  const perfect = simple === 0 || simple === 3 || simple === 4;
  if (perfect) return ({ '-2': 'dd', '-1': 'd', '0': 'P', '1': 'A', '2': 'AA' } as Record<string, string>)[diff] ?? null;
  return ({ '-3': 'dd', '-2': 'd', '-1': 'm', '0': 'M', '1': 'A', '2': 'AA' } as Record<string, string>)[diff] ?? null;
}

/**
 * Returns the interval abbreviation for a number of semitones above a root, compound
 * intervals included at any size (`m9`, `P11`, `M13`, `P15`, `M17`).
 * Pitch alone cannot tell A4 from d5: pass `letterSteps` (letters above the root, 0 =
 * unison) to choose; without it, 6 semitones is `d5` and every other size takes its
 * usual number (3 = m3, 8 = m6).
 * @param stepsFromRoot - Semitones above the root (negative: measured downwards).
 * @param is12TET - If false, returns a generic `"Step N"` label.
 * @param letterSteps - Letter distance, e.g. 3 for a fourth, 9 for a tenth.
 * @returns Interval abbreviation, e.g. `"M3"`, `"A4"`, `"m10"`; `"Step N"` when the
 *   letter distance and the semitones do not make an interval.
 */
export function getIntervalName(stepsFromRoot: number, is12TET: boolean = true, letterSteps?: number): string {
  if (!is12TET) return `Step ${stepsFromRoot}`;
  const semis = Math.abs(stepsFromRoot);
  const letters = letterSteps !== undefined
    ? Math.abs(letterSteps)
    : DEFAULT_NUMBER[semis % 12] + 7 * Math.floor(semis / 12);
  const quality = intervalQuality(letters + 1, semis);
  return quality ? `${quality}${letters + 1}` : `Step ${stepsFromRoot}`;
}

const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/**
 * Names the interval between two written notes by their letters and octaves: C4–F#4 is
 * `A4`, C4–Gb4 is `d5`, C4–E5 is `M10`. Order does not matter; the interval is measured
 * from the lower note. Notes without an octave are taken in octave 4.
 * @param a - Note name, e.g. `"C4"`, `"F#"`, `"Bb3"`.
 * @param b - Note name.
 * @throws if either name is not a note.
 */
export function getIntervalBetween(a: string, b: string): string {
  const parse = (name: string) => {
    const m = name.trim().match(/^([A-Ga-g])([#b]*)(-?\d+)?$/);
    if (!m) throw new Error(`getIntervalBetween: invalid note name "${name}".`);
    const letter = m[1].toUpperCase();
    const octave = m[3] !== undefined ? parseInt(m[3], 10) : 4;
    return { pos: octave * 7 + LETTER_INDEX[letter], step: parseNoteToStep12TET(letter + m[2], octave) };
  };
  let lo = parse(a), hi = parse(b);
  if (hi.pos < lo.pos || (hi.pos === lo.pos && hi.step < lo.step)) [lo, hi] = [hi, lo];
  return getIntervalName(hi.step - lo.step, true, hi.pos - lo.pos);
}

const ORDINALS = ['Unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave'];
const QUALITY_WORDS: Record<string, string> = {
  P: 'Perfect', M: 'Major', m: 'Minor', A: 'Augmented', d: 'Diminished',
};

function ordinal(n: number): string {
  if (n <= 8) return ORDINALS[n - 1];
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/**
 * Returns a human-readable interval name from a cent value.
 * Matches to the nearest 12-TET interval within ±10 cents, compound intervals included
 * (`Major 10th (M10)`, `Perfect 15th (P15)`); the tritone is `Tritone (A4/d5)` and its
 * compounds `Augmented 11th (A11)`. Otherwise returns the raw cent value.
 * Useful for microtonal tunings where exact semitone counts don't apply.
 * @param cents - Interval size in cents (negative: measured downwards).
 * @returns Interval name, e.g. `"Major 3rd (M3)"`, or `"350.00 cents"` if no match.
 */
export function getSemanticIntervalName(cents: number): string {
  const semis = Math.round(Math.abs(cents) / 100);
  if (Math.abs(Math.abs(cents) - semis * 100) > 10) return `${cents.toFixed(2)} cents`;
  if (semis === 6) return 'Tritone (A4/d5)';
  // A compound tritone reads as an augmented 11th, 18th…, as in chord symbols (#11)
  const name = semis % 12 === 6
    ? getIntervalName(semis, true, 3 + 7 * Math.floor(semis / 12))
    : getIntervalName(semis);
  const m = name.match(/^([PMmAd]+)(\d+)$/);
  if (!m) return `${cents.toFixed(2)} cents`;
  const number = parseInt(m[2], 10);
  const quality = QUALITY_WORDS[m[1]] ?? m[1];
  if (number === 1) return 'Unison (P1)';
  return `${quality === 'Perfect' && number === 8 ? 'Octave' : `${quality} ${ordinal(number)}`} (${name})`;
}

/**
 * Converts a frequency in Hz to the nearest MIDI note number, clamped to 0-127.
 * MIDI note 69 is A4 (default 440Hz).
 */
export function freqToMidi(freq: Hertz, baseA4: Hertz = 440): MidiNote {
  const midi = Math.round(69 + 12 * Math.log2(freq / baseA4));
  return Math.min(127, Math.max(0, midi));
}

/**
 * Converts a frequency to the closest valid MIDI note and the pitch bend offset in cents.
 * Useful for microtonal playback via standard MIDI.
 */
export function freqToMidiPitchBend(freq: Hertz, baseA4: Hertz = 440): { note: MidiNote; centsOffset: number } {
  const exactMidi = 69 + 12 * Math.log2(freq / baseA4);
  const note = Math.round(exactMidi);
  const centsOffset = (exactMidi - note) * 100;
  return { note, centsOffset };
}

/**
 * Converts a MIDI note number (0-127) to frequency in Hz.
 */
export function midiToFreq(midi: MidiNote, baseA4: Hertz = 440): Hertz {
  return baseA4 * Math.pow(2, (midi - 69) / 12);
}
