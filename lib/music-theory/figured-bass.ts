/**
 * Figured Bass (basso continuo) realization tools.
 * Supports standard figured bass numerals with accidentals.
 */
import { Note } from './note';
import { Chord } from './chord';
import { parseScaleSymbol } from './parser';
import { EDO } from './tuning';

// Default semitone offsets per figure numeral (when no accidental)
const FIGURE_DEFAULT_SEMITONES: Record<number, number> = {
  2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 10, 8: 12, 9: 14,
};

/** Accidental of a figured-bass figure: sharp, flat or natural. */
export type FigureAccidental = '#' | 'b' | 'n';
type FigurePart = { num: number; acc: FigureAccidental | undefined };

function applyAccidental(semitones: number, acc: FigureAccidental | undefined): number {
  if (acc === '#') return semitones + 1;
  if (acc === 'b') return semitones - 1;
  return semitones;
}

/**
 * Figures left implicit by continuo convention, by the written numbers: `6` is 6/3,
 * `7` is 7/5/3, `6/5` is 6/5/3, `4/3` is 6/4/3, `2` and `4/2` are 6/4/2, `9` is 9/5/3.
 */
const IMPLIED_FIGURES: Record<string, number[]> = {
  '': [3, 5], '3': [5], '5': [3], '3,5': [], '6': [3], '3,6': [], '4,6': [], '7': [3, 5],
  '3,7': [5], '5,7': [3], '5,6': [3], '3,4': [6], '2': [4, 6], '2,4': [6], '2,4,6': [], '9': [3, 5],
};

/** Figured bass: parsing figures, realizing them over a bass note, and four-voice (SATB) realization. */
export class FiguredBass {
  /**
   * Reads a figure string into {num, acc} parts as written (`'6/4'`, `'#6'`, `'b7'`). A bare
   * accidental (`'#'`, `'b'`, `'n'`) is the third with that accidental. Empty → no parts.
   */
  private static parseFigureParts(symbol: string): FigurePart[] {
    const results: FigurePart[] = [];
    for (const part of symbol.split('/').map(p => p.trim()).filter(Boolean)) {
      const m = part.match(/^([#bn]?)(\d*)$/);
      if (!m || (m[1] === '' && m[2] === '')) continue;
      results.push({ num: m[2] === '' ? 3 : parseInt(m[2], 10), acc: (m[1] as FigureAccidental) || undefined });
    }
    return results;
  }

  /** Written parts plus the figures the abbreviation leaves implicit (`'6'` → 6 and 3). */
  private static completeFigures(parts: FigurePart[]): FigurePart[] {
    const key = [...new Set(parts.map(p => p.num))].sort((a, b) => a - b).join(',');
    const implied = IMPLIED_FIGURES[key] ?? [];
    return [...parts, ...implied.map(num => ({ num, acc: undefined }))];
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
   * Parses a figured bass symbol into interval offsets and accidentals, as written
   * (no key, no implied figures: `'6'` → [9]). A plain triad (`''`, `'5'`, `'3'`, `'5/3'`)
   * gives [4, 7].
   *
   * Supported formats: `'6'`, `'6/4'`, `'7'`, `'6/5'`, `'4/3'`, `'4/2'`,
   * `'9'`, `'#6'`, `'b7'`, `'6/4/2'`, `'#'` (raised third), empty string (= root position triad).
   *
   * @returns Object with `intervals` (semitone offsets above bass) and
   *   `accidentals` (Map from interval index to accidental).
   */
  static parse(symbol: string): {
    /** Semitones above the bass, one per figure. */
    intervals: number[];
    /** Accidental of each figure that has one, keyed by its index in `intervals`. */
    accidentals: Map<number, FigureAccidental>;
  } {
    const written = this.parseFigureParts(symbol);
    const plainTriad = written.every(p => (p.num === 3 || p.num === 5) && p.acc === undefined);
    const parts = plainTriad ? this.completeFigures(written).sort((a, b) => a.num - b.num) : written;
    const accidentals = new Map<number, FigureAccidental>();
    const intervals = parts.map(({ num, acc }, i) => {
      if (acc) accidentals.set(i, acc);
      return applyAccidental(FIGURE_DEFAULT_SEMITONES[num] ?? (num - 1), acc);
    });
    return { intervals, accidentals };
  }

  /**
   * Realizes a figured bass symbol above a bass note, returning a Chord.
   *
   * Abbreviations are completed as in continuo practice: `6` is 6/3, `7` is 7/5/3, `6/5` is
   * 6/5/3, `4/3` is 6/4/3, `2` and `4/2` are 6/4/2. A bare accidental alters the third.
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
   * @param _voices - Reserved. For full SATB voicing use {@link FiguredBass.voices}.
   */
  static realize(bassNote: Note, figures: string, keySymbol = 'C major', _voices = 4): Chord {
    const ts = bassNote.tuningSystem;
    const parts = this.completeFigures(this.parseFigureParts(figures)).sort((a, b) => a.num - b.num);
    const diatonicPCs = this.getDiatonicPCs(keySymbol);
    // 12-TET pitch class of the bass (nearest semitone in other tunings)
    const bassSemis = ts instanceof EDO && ts.divisions === 12
      ? bassNote.stepsFromBase
      : Math.round(12 * Math.log2(bassNote.frequency / 440));
    const bassPcC0 = ((bassSemis + 9) % 12 + 12) % 12;

    const intervals = parts.map(({ num, acc }) => {
      const defaultSemitones = FIGURE_DEFAULT_SEMITONES[num] ?? (num - 1);
      // An explicit accidental alters the diatonic note (#6 in D minor over F: D#)
      const diatonic = diatonicPCs ? this.diatonicOffset(num, bassPcC0, diatonicPCs) : defaultSemitones;
      if (acc === '#' || acc === 'b') return diatonicPCs ? applyAccidental(diatonic, acc) : applyAccidental(defaultSemitones, acc);
      return diatonic;
    });

    const name = `${bassNote.getName()}-${figures || '5/3'}`;
    return new Chord(name, ts, bassNote.stepsFromBase, [0, ...intervals.map(i => ts.getStepFromStandard(i))]);
  }

  /**
   * Realizes a figured bass symbol as a 4-voice SATB voicing.
   *
   * Returns `[soprano, alto, tenor, bass]` as an array of 4 `Note` objects.
   * The bass voice is the given `bassNote`. The upper voices (T, A, S) are placed
   * within classical vocal ranges using standard doubling and spacing rules:
   * - Soprano: C4–G5, Alto: G3–C5, Tenor: C3–G4
   * - S-A and A-T: max one octave apart; T-B: max a 12th (19 semitones)
   * - No voice crossing
   * - Triads: root doubled; 7th chords: all 4 pitch classes represented
   *
   * @param bassNote - The bass note (basso continuo).
   * @param figures - The figured bass symbol (e.g. `''`, `'6'`, `'6/4'`, `'7'`).
   * @param keySymbol - Key context for diatonic resolution (default `'C major'`).
   * @returns `[soprano, alto, tenor, bass]`
   */
  static voices(bassNote: Note, figures: string, keySymbol = 'C major'): Note[] {
    const ts = bassNote.tuningSystem;
    const oct = ts.octaveSteps;
    const chord = this.realize(bassNote, figures, keySymbol);
    const bassStep = bassNote.stepsFromBase;
    const bassPc = ((bassStep % oct) + oct) % oct;

    // Collect unique pitch classes in the chord
    const intervals = chord.intervalsInSteps.filter(i => i !== 0);
    const allPcs = [bassPc, ...intervals.map(i => ((bassPc + i) % oct + oct) % oct)];
    const uniquePcs = [...new Set(allPcs)];

    // Build the pool of 3 PCs for the upper voices (T, A, S).
    // Bass already covers bassPc, so upper voices need to cover the remaining PCs.
    // Triads (≤3 unique PCs): bass + 2 others → one upper voice doubles the bass PC.
    // 7th chords (4 PCs): bass covers 1 → remaining 3 go to T/A/S, no doubling needed.
    // 5+ PCs: omit 5th first, then further prune to 3.
    let upperPcs: number[];
    if (uniquePcs.length <= 3) {
      upperPcs = uniquePcs; // includes bassPc (one upper voice will double it)
    } else {
      const remaining = uniquePcs.filter(pc => pc !== bassPc);
      if (remaining.length <= 3) {
        upperPcs = remaining;
      } else {
        const fifth = ((bassPc + ts.getStepFromStandard(7)) % oct + oct) % oct;
        upperPcs = remaining.filter(pc => pc !== fifth).slice(0, 3);
      }
    }

    // Vocal ranges, in 12-TET semitones from A4 mapped to this tuning's steps
    // (C4 = -9, G5 = 10, G3 = -14, C5 = 3, C3 = -21, G4 = -2)
    const st = (semitones: number) => ts.getStepFromStandard(semitones);
    const T_MIN = st(-21), T_MAX = st(-2);
    const A_MIN = st(-14), A_MAX = st(3);
    const S_MIN = st(-9),  S_MAX = st(10);

    // Returns all steps in [min, max] whose pitch class equals pc
    const stepsInRange = (pc: number, min: number, max: number): number[] => {
      const out: number[] = [];
      const kMin = Math.ceil((min - pc) / oct);
      const kMax = Math.floor((max - pc) / oct);
      for (let k = kMin; k <= kMax; k++) out.push(pc + oct * k);
      return out;
    };

    // Generate all permutations of upperPcs to assign to [T, A, S]
    const perms = (arr: number[]): number[][] => {
      if (arr.length <= 1) return [arr.slice()];
      return arr.flatMap((v, i) =>
        perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [v, ...p])
      );
    };

    let best: Note[] | null = null;
    let bestScore = Infinity;

    for (const [tPc, aPc, sPc] of perms(upperPcs)) {
      for (const tStep of stepsInRange(tPc, T_MIN, T_MAX)) {
        if (tStep < bassStep) continue;               // tenor above bass
        if (tStep - bassStep > st(19)) continue;          // T-B max 12th

        for (const aStep of stepsInRange(aPc, A_MIN, A_MAX)) {
          if (aStep < tStep) continue;                // alto above tenor
          if (aStep - tStep > st(12)) continue;           // A-T max octave

          for (const sStep of stepsInRange(sPc, S_MIN, S_MAX)) {
            if (sStep < aStep) continue;              // soprano above alto
            if (sStep - aStep > st(12)) continue;         // S-A max octave

            // Score: prefer moderate total span and voices near middle of ranges
            const tMid = (T_MIN + T_MAX) / 2;
            const aMid = (A_MIN + A_MAX) / 2;
            const sMid = (S_MIN + S_MAX) / 2;
            const score = Math.abs(tStep - tMid) + Math.abs(aStep - aMid) + Math.abs(sStep - sMid);

            if (score < bestScore) {
              bestScore = score;
              best = [
                new Note(ts, sStep),
                new Note(ts, aStep),
                new Note(ts, tStep),
                bassNote,
              ];
            }
          }
        }
      }
    }

    // Fallback: duplicate bass note in all voices (should never trigger for valid 12-TET input)
    return best ?? [bassNote, bassNote, bassNote, bassNote];
  }

  /**
   * Derives the figured bass symbol from a chord and its bass note.
   * Returns the standard abbreviation by the chord member in the bass: triads `''`, `'6'`,
   * `'6/4'`; seventh chords `'7'`, `'6/5'`, `'4/3'`, `'4/2'`. A bass that is no root, third,
   * fifth or seventh returns its offset in steps above the root.
   */
  static fromChord(chord: Chord, bassNote: Note): string {
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;
    const pc = (step: number) => ((step % oct) + oct) % oct;
    const bassOffset = pc(bassNote.stepsFromBase - chord.rootStep);

    // Chord members as offsets above the root, read from the chord's own intervals
    const pcs = new Set(chord.intervalsInSteps.map(pc));
    const member = (semitones: number[]) => semitones.map(s => ts.getStepFromStandard(s)).find(s => pcs.has(s));
    const third = member([4, 3]);
    const fifth = member([7, 6, 8]);
    // A diminished seventh is the 6th above the root (C Eb Gb Bbb)
    const isDim7 = [3, 6, 9].every(s => pcs.has(ts.getStepFromStandard(s)));
    const seventh = member([10, 11]) ?? (isDim7 ? ts.getStepFromStandard(9) : undefined);
    const isSeventh = seventh !== undefined;

    if (bassOffset === 0) return isSeventh ? '7' : '';
    if (bassOffset === third) return isSeventh ? '6/5' : '6';
    if (bassOffset === fifth) return isSeventh ? '4/3' : '6/4';
    if (bassOffset === seventh) return '4/2';
    return `${bassOffset}`; // generic
  }
}
