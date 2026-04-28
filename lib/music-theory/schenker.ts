/**
 * Schenkerian analysis tools - pedagogical simplification.
 *
 * NOTE: Authentic Schenkerian analysis requires musicological judgement.
 * This module provides algorithmic scaffolding only; results are approximate.
 */
import { Note } from './note';
import { Chord } from './chord';
import { parseScaleSymbol } from './parser';

export interface UrlinieResult {
  line: Note[];
  type: '3-line' | '5-line' | '8-line';
}

export class Schenker {
  /**
   * Attempts to identify an Urlinie (fundamental melodic line) in a melody.
   *
   * Looks for a descending stepwise line ending on the tonic that covers
   * a 3rd (^3-^2-^1), 5th (^5-^4-^3-^2-^1), or octave (^8-^7-...-^1).
   *
   * Returns null if no clear Urlinie is detected.
   *
   * @param melody - Melody notes (12-TET).
   * @param keySymbol - Key, e.g. `'C major'`.
   */
  static findUrlinie(melody: Note[], keySymbol: string): UrlinieResult | null {
    if (melody.length < 2) return null;

    let scale;
    try { scale = parseScaleSymbol(keySymbol); } catch { return null; }

    const scaleDegreeSteps = scale.getNotes(1).map(n => n.stepsFromBase);
    const tonicStep = scaleDegreeSteps[0];
    const oct = scale.tuningSystem.octaveSteps;

    // Compute scale degree for each melody note (1-indexed, 0 = not in scale)
    const degree = (note: Note): number => {
      const pc = ((note.stepsFromBase % oct) + oct) % oct;
      const tonicPc = ((tonicStep % oct) + oct) % oct;
      const idx = scaleDegreeSteps.findIndex(s => ((s % oct) + oct) % oct === pc);
      return idx + 1; // 1-indexed
    };

    const degrees = melody.map(degree);

    // Try to find descending stepwise line ending on ^1
    const lastTonic = degrees.lastIndexOf(1);
    if (lastTonic < 0) return null;

    // Check for 3-line: find ^3 somewhere before tonic
    const checkLine = (startDeg: number): UrlinieResult | null => {
      const startIdx = degrees.indexOf(startDeg);
      if (startIdx < 0 || startIdx >= lastTonic) return null;

      // Collect the structural notes: startDeg, ..., 2, 1 descending
      const line: Note[] = [];
      let expectedDeg = startDeg;
      for (let i = startIdx; i <= lastTonic; i++) {
        if (degrees[i] === expectedDeg) {
          line.push(melody[i]);
          expectedDeg--;
          if (expectedDeg < 1) break;
        }
      }
      if (line[line.length - 1] && degree(line[line.length - 1]) === 1) {
        const type = startDeg === 3 ? '3-line' : startDeg === 5 ? '5-line' : '8-line';
        return { line, type };
      }
      return null;
    };

    return checkLine(3) ?? checkLine(5) ?? checkLine(8) ?? null;
  }

  /**
   * Identifies an Ursatz (basic structure) from a progression and melody.
   * Returns the bass arpeggiation (I-V-I) and Urlinie notes, or null.
   */
  static getUrsatz(
    progression: Chord[],
    melody: Note[],
    keySymbol: string
  ): { bass: Note[]; melody: Note[] } | null {
    const urlinie = this.findUrlinie(melody, keySymbol);
    if (!urlinie) return null;

    let scale;
    try { scale = parseScaleSymbol(keySymbol); } catch { return null; }
    const oct = scale.tuningSystem.octaveSteps;
    const scaleNotes = scale.getNotes(1);
    const tonicPc = ((scaleNotes[0].stepsFromBase % oct) + oct) % oct;
    const dominantPc = ((scaleNotes[4].stepsFromBase % oct) + oct) % oct;

    // Bass arpeggiation: find I, V, I in progression
    const bass: Note[] = [];
    for (const chord of progression) {
      const rootPc = ((chord.rootStep % oct) + oct) % oct;
      if (bass.length === 0 && rootPc === tonicPc) {
        bass.push(new Note(chord.tuningSystem, chord.rootStep));
      } else if (bass.length === 1 && rootPc === dominantPc) {
        bass.push(new Note(chord.tuningSystem, chord.rootStep));
      } else if (bass.length === 2 && rootPc === tonicPc) {
        bass.push(new Note(chord.tuningSystem, chord.rootStep));
        break;
      }
    }

    if (bass.length < 2) return null;

    return { bass, melody: urlinie.line };
  }

  /**
   * Reduces a chord progression to a simplified structural level.
   *
   * - `'background'`: only tonic and dominant.
   * - `'middleground'`: removes repeated roots; keeps harmonic function changes.
   * - `'foreground'`: removes consecutive identical chords.
   */
  static prolongationLevel(
    chords: Chord[],
    level: 'foreground' | 'middleground' | 'background'
  ): Chord[] {
    if (chords.length === 0) return [];
    const oct = chords[0].tuningSystem.octaveSteps;

    if (level === 'foreground') {
      // Remove consecutive duplicates
      return chords.filter((c, i) =>
        i === 0 || ((c.rootStep % oct + oct) % oct) !== ((chords[i - 1].rootStep % oct + oct) % oct)
      );
    }

    if (level === 'middleground') {
      const result: Chord[] = [];
      let lastRoot = -1;
      for (const c of chords) {
        const root = (c.rootStep % oct + oct) % oct;
        if (root !== lastRoot) { result.push(c); lastRoot = root; }
      }
      return result;
    }

    // Background: keep only tonic and dominant
    // Determine tonic and dominant PCs from first chord (assumed tonic)
    const tonicPc = ((chords[0].rootStep % oct) + oct) % oct;
    const dominantPc = (tonicPc + oct * 7 / 12) % oct; // approximation

    return chords.filter(c => {
      const root = ((c.rootStep % oct) + oct) % oct;
      return root === tonicPc || Math.abs(root - dominantPc) <= 1;
    });
  }
}
