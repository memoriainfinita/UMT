/**
 * Schenkerian analysis tools - pedagogical simplification.
 *
 * NOTE: Authentic Schenkerian analysis requires musicological judgement.
 * This module provides algorithmic scaffolding only; results are approximate.
 */
import { Note } from './note';
import { Chord } from './chord';
import { parseScaleSymbol } from './parser';

/** The detected Urlinie (fundamental melodic line) and its type (3-, 5-, or 8-line). */
export interface UrlinieResult {
  /** The notes of the line, from the head tone down to the tonic. */
  line: Note[];
  /** Which degree the line descends from: ^3, ^5 or ^8. */
  type: '3-line' | '5-line' | '8-line';
}

/** Basic Schenkerian reduction (approximate): Urlinie, Ursatz and structural levels of a progression. */
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

    const degreeSteps = scale.getNotes(1).slice(0, -1).map(n => n.stepsFromBase - scale.rootStep);
    const size = degreeSteps.length;
    const oct = scale.tuningSystem.octaveSteps;

    // Each note's place on the scale counting octaves (tonic = 0, ^2 = 1 … ^8 = size),
    // so that ^8 is told apart from ^1; null for notes outside the scale.
    const position = (note: Note): number | null => {
      const rel = note.stepsFromBase - scale.rootStep;
      const d = degreeSteps.findIndex(s => (((rel - s) % oct) + oct) % oct === 0);
      return d === -1 ? null : Math.round((rel - degreeSteps[d]) / oct) * size + d;
    };
    const positions = melody.map(position);

    // The line ends on the last tonic of the melody
    let lastTonic = -1;
    positions.forEach((p, i) => { if (p !== null && ((p % size) + size) % size === 0) lastTonic = i; });
    if (lastTonic < 0) return null;
    const finalPos = positions[lastTonic]!;

    // A stepwise descent from ^N down to that tonic, its notes in order (others between)
    const checkLine = (n: 3 | 5 | 8): UrlinieResult | null => {
      const line: Note[] = [];
      let expected = finalPos + n - 1;
      for (let i = 0; i < lastTonic && expected > finalPos; i++) {
        if (positions[i] === expected) { line.push(melody[i]); expected--; }
      }
      if (expected !== finalPos) return null;
      line.push(melody[lastTonic]);
      return { line, type: `${n}-line` as UrlinieResult['type'] };
    };

    // The longest line found: an 8-line also contains a 3-line
    return checkLine(8) ?? checkLine(5) ?? checkLine(3);
  }

  /**
   * Identifies an Ursatz (basic structure) from a progression and melody.
   * Returns the bass arpeggiation (I-V-I) and Urlinie notes, or null.
   */
  static getUrsatz(
    progression: Chord[],
    melody: Note[],
    keySymbol: string
  ): {
    /** Roots of the bass arpeggiation I-V-I found in the progression (two or three notes). */
    bass: Note[];
    /** The Urlinie (see `findUrlinie`). */
    melody: Note[];
  } | null {
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
   * - `'background'`: only tonic and dominant (the first chord is taken as the tonic).
   * - `'middleground'`: merges consecutive chords on the same root (C C7 → C).
   * - `'foreground'`: merges consecutive identical chords (same pitch classes).
   */
  static prolongationLevel(
    chords: Chord[],
    level: 'foreground' | 'middleground' | 'background'
  ): Chord[] {
    if (chords.length === 0) return [];
    const oct = chords[0].tuningSystem.octaveSteps;

    if (level === 'foreground') {
      const content = (c: Chord) => [...new Set(c.getPitchClasses())].sort((a, b) => a - b).join(',');
      return chords.filter((c, i) => i === 0 || content(c) !== content(chords[i - 1]));
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
    const dominantPc = (tonicPc + chords[0].tuningSystem.getStepFromStandard(7)) % oct;

    return chords.filter(c => {
      const root = ((c.rootStep % oct) + oct) % oct;
      return root === tonicPc || root === dominantPc;
    });
  }
}
