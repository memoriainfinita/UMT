import { Note } from './note';
import { TET12 } from './tuning';
import { parseNoteToStep12TET } from './utils';

const FIXED_DO_SYLLABLES = ['la', 'la#/sib', 'si', 'do', 'do#/reb', 're', 're#/mib', 'mi', 'fa', 'fa#/solb', 'sol', 'sol#/lab'];
const FIXED_DO_FLAT  = ['la', 'sib', 'si', 'do', 'reb', 're', 'mib', 'mi', 'fa', 'solb', 'sol', 'lab'];
const FIXED_DO_SHARP = ['la', 'la#', 'si', 'do', 'do#', 're', 're#', 'mi', 'fa', 'fa#', 'sol', 'sol#'];

// Movable-do syllables relative to tonic (index = scale degree 0-6)
const MOVABLE_DO_MAJOR = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
// Scale step pattern for major scale
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

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
   * The tonic of the key is always "do".
   * Only works in 12-TET. Returns `'?'` for chromatic notes or unsupported tunings.
   *
   * @param note - The note to solmize.
   * @param keySymbol - Key, e.g. `'C major'`, `'G major'`.
   */
  static movableDo(note: Note, keySymbol: string): string {
    if (note.tuningSystem.octaveSteps !== 12) return '?';

    const keyMatch = keySymbol.match(/^([A-G][#b]*)\s*/i);
    if (!keyMatch) return '?';

    const tonicStep = parseNoteToStep12TET(keyMatch[1], 4);
    const tonicPc = ((tonicStep % 12) + 12) % 12;
    const notePc = ((note.stepsFromBase % 12) + 12) % 12;
    const relPc = ((notePc - tonicPc + 12) % 12);

    const degreeIdx = MAJOR_STEPS.indexOf(relPc);
    return degreeIdx >= 0 ? MOVABLE_DO_MAJOR[degreeIdx] : '?';
  }

  /**
   * Converts a solfège syllable back to a Note in the given key.
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
      return new Note(TET12, pc);
    }

    // Movable: tonic = do
    const keyMatch = keySymbol.match(/^([A-G][#b]*)\s*/i);
    if (!keyMatch) throw new Error(`Solfege.fromSolfege: invalid key "${keySymbol}".`);
    const tonicStep = parseNoteToStep12TET(keyMatch[1], 4);
    const tonicPc = ((tonicStep % 12) + 12) % 12;

    const movableMap: Record<string, number> = {
      'do': 0, 're': 2, 'mi': 4, 'fa': 5, 'sol': 7, 'la': 9, 'si': 11,
    };
    const relPc = movableMap[s];
    if (relPc === undefined) throw new Error(`Solfege.fromSolfege: unknown movable syllable "${syllable}".`);
    const notePc = (tonicPc + relPc) % 12;
    return new Note(TET12, notePc);
  }
}
