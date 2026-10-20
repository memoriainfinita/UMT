import { Note } from './note';
import { TET12 } from './tuning';
import { parseNoteToStep12TET } from './utils';

const FIXED_DO_FLAT  = ['la', 'sib', 'si', 'do', 'reb', 're', 'mib', 'mi', 'fa', 'solb', 'sol', 'lab'];
const FIXED_DO_SHARP = ['la', 'la#', 'si', 'do', 'do#', 're', 're#', 'mi', 'fa', 'fa#', 'sol', 'sol#'];

// Movable-do syllables relative to tonic (index = scale degree 0-6)
const MOVABLE_DO_MAJOR = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
// Scale step pattern for major scale
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

// Tonic sol-fa / Kodály: ti on the seventh, and a syllable for each raised and lowered degree
// (null where the system has none: mi and ti raised, do and fa lowered)
const MOVABLE_DO_TI = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'];
const MOVABLE_DO_RAISED = ['di', 'ri', null, 'fi', 'si', 'li', null];
const MOVABLE_DO_LOWERED = [null, 'ra', 'me', null, 'se', 'le', 'te'];

/**
 * Syllable system for movable do. `'si'`: the Latin syllables (do re mi fa sol la si), diatonic
 * only. `'ti'`: tonic sol-fa and Kodály (… la ti), with the chromatic syllables di ri fi si li
 * (raised) and ra me se le te (lowered); here "si" is the raised fifth.
 * @category World music
 */
export type MovableDoSyllables = 'si' | 'ti';

/**
 * Options for `Solfege.movableDo` and `Solfege.fromSolfege`.
 * @category World music
 */
export interface MovableDoOptions {
  /** Syllable system (default `'si'`). */
  syllables?: MovableDoSyllables;
}

// Semitones from a mode's tonic down to its parent major's tonic, where "do" sits
// (la-based minor: A minor sings la-si-do; D dorian sings re-mi-fa)
const MODE_TO_DO: Record<string, number> = {
  major: 0, ionian: 0, dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7,
  minor: 9, aeolian: 9, 'natural minor': 9, locrian: 11,
};
// The same distance in letters (D dorian: do is C, one letter down)
const MODE_TO_DO_LETTERS: Record<string, number> = {
  major: 0, ionian: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4,
  minor: 5, aeolian: 5, 'natural minor': 5, locrian: 6,
};
const LETTERS = 'CDEFGAB';

/** "Do" in a key, the tonic of the key or of its parent major: its pitch class (A = 0) and letter (C = 0). */
function doOfKey(keySymbol: string): { pc: number; letter: number; tonic: string } | null {
  const m = keySymbol.trim().match(/^([A-G])([#b]*)\s*(.*)$/i);
  if (!m) return null;
  const mode = (m[3] || 'major').toLowerCase();
  const offset = MODE_TO_DO[mode];
  if (offset === undefined) return null;
  const tonic = m[1].toUpperCase() + m[2];
  const letter = (LETTERS.indexOf(m[1].toUpperCase()) - MODE_TO_DO_LETTERS[mode] + 7) % 7;
  return { pc: ((parseNoteToStep12TET(tonic, 4) - offset) % 12 + 12) % 12, letter, tonic };
}

/**
 * Solfège (solmization) tools.
 * @category World music
 */
export class Solfege {
  /**
   * Returns the fixed-do solfège syllable for a note (C = do always).
   * Uses Spanish naming convention (do, re, mi, fa, sol, la, si). In another tuning, the
   * syllable of the 12-TET note the step stands for (`TuningSystem.getStandardStep`); `'?'`
   * when it stands for none.
   */
  static fixedDo(note: Note, preferFlats = false): string {
    const standard = note.tuningSystem.getStandardStep(note.stepsFromBase);
    if (standard === null) return '?';
    const pc = ((standard % 12) + 12) % 12;
    return preferFlats ? FIXED_DO_FLAT[pc] : FIXED_DO_SHARP[pc];
  }

  /**
   * Returns the movable-do solfège syllable for a note in a given key.
   * "Do" is the tonic of a major key; minor keys and the church modes sing from their
   * parent major's do (la-based minor: in A minor, A is "la"; in D dorian, D is "re").
   * In another tuning the note is read as the 12-TET note its step stands for. Returns `'?'` for
   * unknown modes and steps that stand for no 12-TET note.
   *
   * With `syllables: 'si'` (default) chromatic notes give `'?'`. With `syllables: 'ti'` the
   * note's letter gives the degree and its accidental the syllable: C# in C major is "di", Db is
   * "ra", G# in A minor is "si". A note spelled without regard to the key (MIDI input in flats)
   * can be spelled first with `spellPitchInKey`. An alteration the system has no syllable for
   * (Cb, E# in C major) gives `'?'`.
   *
   * @param note - The note to solmize.
   * @param keySymbol - Key, e.g. `'C major'`, `'A minor'`, `'D dorian'`; the tonic in either case.
   * @param options - `syllables`: `'si'` (default) or `'ti'`.
   */
  static movableDo(note: Note, keySymbol: string, options: MovableDoOptions = {}): string {
    const standard = note.tuningSystem.getStandardStep(note.stepsFromBase);
    if (standard === null) return '?';

    const keyDo = doOfKey(keySymbol);
    if (keyDo === null) return '?';
    const notePc = ((standard % 12) + 12) % 12;

    if (options.syllables !== 'ti') {
      const degreeIdx = MAJOR_STEPS.indexOf((notePc - keyDo.pc + 12) % 12);
      return degreeIdx >= 0 ? MOVABLE_DO_MAJOR[degreeIdx] : '?';
    }

    // Degree from the written letter, alteration from the pitch against that degree
    const written = note.name.match(/^([A-G])/);
    if (!written) return '?';
    const degree = (LETTERS.indexOf(written[1]) - keyDo.letter + 7) % 7;
    const alteration = ((notePc - keyDo.pc - MAJOR_STEPS[degree]) % 12 + 18) % 12 - 6;
    const syllable = alteration === 0 ? MOVABLE_DO_TI[degree]
      : alteration === 1 ? MOVABLE_DO_RAISED[degree]
      : alteration === -1 ? MOVABLE_DO_LOWERED[degree]
      : null;
    return syllable ?? '?';
  }

  /**
   * Converts a solfège syllable back to a Note in the given key, in the octave that starts
   * on do: fixed do gives C4–B4; movable do counts up from the key's tonic in octave 4
   * (la-based minor: "la" in A minor is A4, "do" C5).
   *
   * @param syllable - Solfège syllable (e.g., `'do'`, `'sol'`).
   * @param keySymbol - Key context.
   * Movable do takes "ti" and the chromatic syllables (di ri fi li, ra me se le te) in either
   * system; "si" is the seventh with `syllables: 'si'` (default) and the raised fifth with `'ti'`.
   *
   * @param syllable - Solfège syllable (e.g., `'do'`, `'sol'`).
   * @param keySymbol - Key context.
   * @param mode - `'fixed'` (C=do) or `'movable'` (tonic=do). Default: `'movable'`.
   * @param options - `syllables`: `'si'` (default) or `'ti'`, for movable do.
   */
  static fromSolfege(syllable: string, keySymbol: string, mode: 'fixed' | 'movable' = 'movable', options: MovableDoOptions = {}): Note {
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
    const keyDo = doOfKey(keySymbol);
    if (keyDo === null) throw new Error(`Solfege.fromSolfege: invalid key "${keySymbol}".`);
    const tonicStep = parseNoteToStep12TET(keyDo.tonic, 4);
    const doStep = tonicStep - (((tonicStep - keyDo.pc) % 12) + 12) % 12;

    const movableMap: Record<string, number> = {
      'do': 0, 're': 2, 'mi': 4, 'fa': 5, 'sol': 7, 'la': 9, 'ti': 11,
      'si': options.syllables === 'ti' ? 8 : 11,
      'di': 1, 'ri': 3, 'fi': 6, 'li': 10,
      'ra': 1, 'me': 3, 'se': 6, 'le': 8, 'te': 10,
    };
    const relPc = movableMap[s];
    if (relPc === undefined) throw new Error(`Solfege.fromSolfege: unknown movable syllable "${syllable}".`);
    // la-based minor and modes: the syllables from the tonic up stay in the tonic's octave
    const fromTonic = (doStep + relPc - tonicStep + 12) % 12;
    return new Note(TET12, tonicStep + fromTonic);
  }
}
