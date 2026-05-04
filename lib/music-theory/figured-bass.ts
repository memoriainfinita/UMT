/**
 * Figured Bass (basso continuo) realization tools.
 * Supports standard figured bass numerals with accidentals.
 */
import { Note } from './note';
import { Chord } from './chord';
import { parseScaleSymbol } from './parser';

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
  /** Parses figure string into raw {num, acc} parts (reused by parse and realize). */
  private static parseFigureParts(symbol: string): { num: number; acc: '#' | 'b' | 'n' | undefined }[] {
    if (symbol === '' || symbol === '5' || symbol === '5/3' || symbol === '3') {
      return [{ num: 3, acc: undefined }, { num: 5, acc: undefined }];
    }
    const results: { num: number; acc: '#' | 'b' | 'n' | undefined }[] = [];
    for (const part of symbol.split('/').filter(Boolean)) {
      const m = part.trim().match(/^([#bn]?)(\d+)$/);
      if (!m) continue;
      results.push({ num: parseInt(m[2], 10), acc: (m[1] as '#' | 'b' | 'n') || undefined });
    }
    return results;
  }

  /**
   * Returns the 7 diatonic pitch classes (C=0) for a key symbol, or null if unparseable.
   * C=0, D=2, E=4, F=5, G=7, A=9, B=11.
   */
  private static getDiatonicPCs(keySymbol: string): number[] | null {
    try {
      const scale = parseScaleSymbol(keySymbol);
      let step = scale.rootStep;
      const pcs: number[] = [((step + 9) % 12 + 12) % 12];
      for (let i = 0; i < scale.stepPattern.length - 1; i++) {
        step += scale.stepPattern[i];
        pcs.push(((step + 9) % 12 + 12) % 12);
      }
      return pcs;
    } catch {
      return null;
    }
  }

  /**
   * Returns the semitone offset for a diatonic figure numeral above a bass PC.
   * Counts `num` diatonic steps upward within the scale and returns the chromatic distance.
   * Handles numerals > 7 (compound intervals) via octave displacement.
   */
  private static diatonicOffset(num: number, bassPcC0: number, diatonicPCs: number[]): number {
    const bassIndex = diatonicPCs.indexOf(bassPcC0);
    if (bassIndex === -1) return FIGURE_DEFAULT_SEMITONES[num] ?? (num - 1);
    const octaveOffset = Math.floor((num - 1) / diatonicPCs.length) * 12;
    const degreeOffset = (num - 1) % diatonicPCs.length;
    const targetPc = diatonicPCs[(bassIndex + degreeOffset) % diatonicPCs.length];
    const diff = (targetPc - bassPcC0 + 12) % 12;
    return diff + octaveOffset;
  }


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
   * When `keySymbol` is provided, numerals without explicit accidentals are resolved
   * diatonically: the interval is adjusted to the nearest scale degree in the key.
   * If the bass note is not in the key, falls back to `FIGURE_DEFAULT_SEMITONES`.
   * Explicit accidentals (e.g. `'#6'`, `'b7'`) always override diatonic resolution.
   *
   * @param bassNote - The bass note.
   * @param figures - The figured bass symbol (e.g., `'6'`, `'6/4'`, `'7'`, `''`).
   * @param keySymbol - Key context for diatonic resolution (e.g. `'G major'`, `'D minor'`).
   *   If the key cannot be parsed or the bass note is chromatic, falls back to equal-tempered defaults.
   * @param _voices - Number of voices (reserved; doubling not yet implemented).
   */
  static realize(bassNote: Note, figures: string, keySymbol = 'C major', _voices = 4): Chord {
    const ts = bassNote.tuningSystem;
    const parts = this.parseFigureParts(figures);
    const diatonicPCs = this.getDiatonicPCs(keySymbol);
    const bassPcC0 = ((bassNote.stepsFromBase + 9) % 12 + 12) % 12;

    const intervals = parts.map(({ num, acc }) => {
      const defaultSemitones = FIGURE_DEFAULT_SEMITONES[num] ?? (num - 1);
      if (acc !== undefined) return applyAccidental(defaultSemitones, acc);
      if (diatonicPCs) return this.diatonicOffset(num, bassPcC0, diatonicPCs);
      return defaultSemitones;
    });

    const name = `${bassNote.getName()}-${figures || '5/3'}`;
    return new Chord(name, ts, bassNote.stepsFromBase, [0, ...intervals]);
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
