import { Note } from './note';
import { TET12 } from './tuning';
import { parseNoteToStep12TET } from './utils';

const FIXED_DO_FLAT  = ['la', 'sib', 'si', 'do', 'reb', 're', 'mib', 'mi', 'fa', 'solb', 'sol', 'lab'];
const FIXED_DO_SHARP = ['la', 'la#', 'si', 'do', 'do#', 're', 're#', 'mi', 'fa', 'fa#', 'sol', 'sol#'];

// Movable-do syllables relative to tonic (index = scale degree 0-6)
const MOVABLE_DO_MAJOR = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
// Scale step pattern for major scale
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

// Semitones from a mode's tonic down to its parent major's tonic, where "do" sits
// (la-based minor: A minor sings la-si-do; D dorian sings re-mi-fa)
const MODE_TO_DO: Record<string, number> = {
  major: 0, ionian: 0, dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7,
  minor: 9, aeolian: 9, 'natural minor': 9, locrian: 11,
};

/** Pitch class (A = 0) of "do" in a key: the tonic of the key or of its parent major. */
function doPitchClass(keySymbol: string): number | null {
  const m = keySymbol.trim().match(/^([A-G][#b]*)\s*(.*)$/i);
  if (!m) return null;
  const offset = MODE_TO_DO[(m[2] || 'major').toLowerCase()];
  if (offset === undefined) return null;
  return ((parseNoteToStep12TET(m[1], 4) - offset) % 12 + 12) % 12;
}

/**
 * Solfège (solmization) tools.
 */
export class Solfege {
  /**
   * Returns the fixed-do solfège syllable for a note (C = do always).
   * Uses Spanish naming convention (do, re, mi, fa, sol, la, si).
   */
  static fixedDo(note: Note, preferFlats = false): string {
    const pc = ((note.stepsFromBase % 12) + 12) % 12;
    return preferFlats ? FIXED_DO_FLAT[pc] : FIXED_DO_SHARP[pc];
  }

  /**
   * Returns the movable-do solfège syllable for a note in a given key.
   * "Do" is the tonic of a major key; minor keys and the church modes sing from their
   * parent major's do (la-based minor: in A minor, A is "la"; in D dorian, D is "re").
   * Only works in 12-TET. Returns `'?'` for chromatic notes, unknown modes or unsupported tunings.
   *
   * @param note - The note to solmize.
   * @param keySymbol - Key, e.g. `'C major'`, `'A minor'`, `'D dorian'`.
   */
  static movableDo(note: Note, keySymbol: string): string {
    if (note.tuningSystem.octaveSteps !== 12) return '?';

    const doPc = doPitchClass(keySymbol);
    if (doPc === null) return '?';
    const notePc = ((note.stepsFromBase % 12) + 12) % 12;
    const relPc = ((notePc - doPc + 12) % 12);

    const degreeIdx = MAJOR_STEPS.indexOf(relPc);
    return degreeIdx >= 0 ? MOVABLE_DO_MAJOR[degreeIdx] : '?';
  }

  /**
   * Converts a solfège syllable back to a Note in the given key, in the octave that starts
   * on do: fixed do gives C4–B4; movable do counts up from the key's tonic in octave 4
   * (la-based minor: "la" in A minor is A4, "do" C5).
   *
   * @param syllable - Solfège syllable (e.g., `'do'`, `'sol'`).
   * @param keySymbol - Key context.
   * @param mode - `'fixed'` (C=do) or `'movable'` (tonic=do). Default: `'movable'`.
   */
  static fromSolfege(syllable: string, keySymbol: string, mode: 'fixed' | 'movable' = 'movable'): Note {
    const s = syllable.toLowerCase().trim();

    if (mode === 'fixed') {
      // Fixed: do=C (PC 3 in UMT where A=0)
      const fixedMap: Record<string, number> = {
        'do': 3, 're': 5, 'mi': 7, 'fa': 8, 'sol': 10, 'la': 0, 'si': 2,
        'do#': 4, 'reb': 4, 're#': 6, 'mib': 6, 'fa#': 9, 'solb': 9,
        'sol#': 11, 'lab': 11, 'la#': 1, 'sib': 1,
      };
      const pc = fixedMap[s];
      if (pc === undefined) throw new Error(`Solfege.fromSolfege: unknown syllable "${syllable}".`);
      return new Note(TET12, ((pc - 3 + 12) % 12) - 9); // C4 = -9 … B4 = 2
    }

    // Movable: do of the key (its tonic, or its parent major's), from octave 4
    const keyMatch = keySymbol.trim().match(/^([A-G][#b]*)/i);
    const doPc = doPitchClass(keySymbol);
    if (!keyMatch || doPc === null) throw new Error(`Solfege.fromSolfege: invalid key "${keySymbol}".`);
    const tonicStep = parseNoteToStep12TET(keyMatch[1], 4);
    const doStep = tonicStep - (((tonicStep - doPc) % 12) + 12) % 12;

    const movableMap: Record<string, number> = {
      'do': 0, 're': 2, 'mi': 4, 'fa': 5, 'sol': 7, 'la': 9, 'si': 11,
    };
    const relPc = movableMap[s];
    if (relPc === undefined) throw new Error(`Solfege.fromSolfege: unknown movable syllable "${syllable}".`);
    // la-based minor and modes: the syllables from the tonic up stay in the tonic's octave
    const fromTonic = (doStep + relPc - tonicStep + 12) % 12;
    return new Note(TET12, tonicStep + fromTonic);
  }
}
