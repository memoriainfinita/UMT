/**
 * Figured Bass (basso continuo) realization tools.
 * Supports standard figured bass numerals with accidentals.
 */
import { Note } from './note';
import { Chord } from './chord';
import { TET12, TuningSystem } from './tuning';
import { parseNoteToStep12TET } from './utils';

// Maps figured bass numeral to interval in semitones above bass note
const FIGURE_INTERVALS: Record<number, number> = {
  2: 2,   // major 2nd
  3: 3,   // minor/major 3rd (context-dependent; use minor here as default)
  4: 5,   // perfect 4th
  5: 7,   // perfect 5th
  6: 9,   // major 6th (minor 3rd above 5th)
  7: 10,  // minor 7th (dominant)
  8: 12,  // octave
  9: 14,  // 9th
};

// Default semitone offsets per figure numeral (when no accidental)
const FIGURE_DEFAULT_SEMITONES: Record<number, number> = {
  2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 10, 8: 12, 9: 14,
};

function applyAccidental(semitones: number, acc: '#' | 'b' | 'n' | undefined): number {
  if (acc === '#') return semitones + 1;
  if (acc === 'b') return semitones - 1;
  return semitones;
}

export class FiguredBass {
  /**
   * Parses a figured bass symbol into interval offsets and accidentals.
   *
   * Supported formats: `'6'`, `'6/4'`, `'7'`, `'6/5'`, `'4/3'`, `'4/2'`,
   * `'9'`, `'#6'`, `'b7'`, `'6/4/2'`, empty string (= root position triad).
   *
   * @returns Object with `intervals` (semitone offsets above bass) and
   *   `accidentals` (Map from interval index to accidental).
   */
  static parse(symbol: string): { intervals: number[]; accidentals: Map<number, '#' | 'b' | 'n'> } {
    const accidentals = new Map<number, '#' | 'b' | 'n'>();

    if (symbol === '' || symbol === '5' || symbol === '5/3' || symbol === '3') {
      return { intervals: [4, 7], accidentals };
    }

    const parts = symbol.split('/').filter(Boolean);
    const intervals: number[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      const accMatch = part.match(/^([#bn]?)(\d+)$/);
      if (!accMatch) continue;
      const [, acc, numStr] = accMatch;
      const num = parseInt(numStr, 10);
      const semitones = FIGURE_DEFAULT_SEMITONES[num] ?? (num - 1);
      const adjusted = applyAccidental(semitones, (acc as '#' | 'b' | 'n') || undefined);
      intervals.push(adjusted);
      if (acc) accidentals.set(i, acc as '#' | 'b' | 'n');
    }

    return { intervals, accidentals };
  }

  /**
   * Realizes a figured bass symbol above a bass note, returning a Chord.
   *
   * @param bassNote - The bass note.
   * @param figures - The figured bass symbol (e.g., `'6'`, `'6/4'`, `'7'`, `''`).
   * @param _keySymbol - Key context (reserved for accidental resolution; not yet used).
   * @param voices - Number of voices (currently figures are used as-is; doubling not implemented).
   */
  static realize(bassNote: Note, figures: string, _keySymbol = 'C major', _voices = 4): Chord {
    const ts = bassNote.tuningSystem;
    const { intervals } = this.parse(figures);
    const allIntervals = [0, ...intervals]; // include bass

    const name = `${bassNote.getName()}-${figures || '5/3'}`;
    return new Chord(name, ts, bassNote.stepsFromBase, allIntervals);
  }

  /**
   * Derives the figured bass symbol from a chord and its bass note.
   * Returns the standard abbreviation (e.g., `'6'` for first inversion, `'6/4'` for second).
   */
  static fromChord(chord: Chord, bassNote: Note): string {
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;
    const bassStep = bassNote.stepsFromBase;
    const rootStep = chord.rootStep;
    const bassPc = ((bassStep % oct) + oct) % oct;
    const rootPc = ((rootStep % oct) + oct) % oct;

    if (bassPc === rootPc) return ''; // root position
    const bassOffset = ((bassPc - rootPc + oct) % oct);

    // Standard inversions for triads (M or m)
    const is3rd = bassOffset === 4 || bassOffset === 3;
    const is5th = bassOffset === 7;

    if (is3rd) return '6';
    if (is5th) return '6/4';

    // For 7th chords
    if (bassOffset === 7 && chord.intervalsInSteps.some(i => i % oct === 10 || i % oct === 11)) return '6/4';

    return `${bassOffset}`; // generic
  }
}
