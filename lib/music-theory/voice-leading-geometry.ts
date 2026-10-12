/**
 * Tymoczko OPTIC voice-leading geometry.
 *
 * Reference: Dmitri Tymoczko, "A Geometry of Music" (2011).
 * The OPTIC equivalence classes model voice-leading space by quotienting
 * chord space under five operations: Octave shifts, Permutation, Transposition,
 * Inversion, and Cardinality change.
 *
 * NOTE: This is a pedagogical implementation of core OPTIC operations.
 * Full geometric analysis (orbifold visualization, etc.) requires dedicated tools.
 */
import { Chord } from './chord';
import { Note } from './note';
import { SetTheory } from './set-theory';

/**
 * A chord under the OPTIC equivalences, each one added to the previous (O, OP, OPT, OPTI,
 * OPTIC), in 12-TET pitch classes.
 * @category Microtonal / Xenharmonic
 */
export interface OPTICResult {
  /** O: octave equivalence - pitch classes in voice order, doublings kept */
  O: number[];
  /** OP: + permutation - pitch classes sorted, doublings kept */
  P: number[];
  /** OPT: + transposition - the most compact rotation (normal form), starting on 0 */
  T: number[];
  /** OPTI: + inversion - the more compact of T and its inversion's T */
  I: number[];
  /** OPTIC: + cardinality - doublings removed: the set class's prime form */
  C: number[];
  /** Number of distinct pitch classes */
  cardinality: number;
}

/** Most compact rotation of a sorted pitch-class multiset (Rahn), transposed to start on 0. */
function zeroedNormal(sorted: number[], oct: number): number[] {
  const n = sorted.length;
  let best: number[] = sorted;
  for (let i = 0; i < n; i++) {
    const rot = [...sorted.slice(i), ...sorted.slice(0, i).map(p => p + oct)];
    // compare spans from the first note to the last, then to the one before, …
    for (let j = n - 1; j > 0; j--) {
      const a = rot[j] - rot[0];
      const b = best[j] - best[0];
      if (a < b) { best = rot; break; }
      if (a > b) break;
    }
  }
  return best.map(p => p - best[0]);
}

/**
 * Computes the OPTIC equivalence classes of a chord given as pitches or pitch classes
 * (12-TET semitones), in voice order: (0, 4, 7) → T [0, 4, 7], I and C [0, 3, 7].
 *
 * @param pcs - Pitches or pitch classes, one per voice.
 * @category Microtonal / Xenharmonic
 */
export function OPTIC(pcs: number[]): OPTICResult {
  const oct = 12;
  const O = pcs.map(p => ((p % oct) + oct) % oct);
  const P = [...O].sort((a, b) => a - b);
  if (P.length === 0) return { O, P, T: [], I: [], C: [], cardinality: 0 };
  const T = zeroedNormal(P, oct);
  const inverted = zeroedNormal(P.map(p => (oct - p) % oct).sort((a, b) => a - b), oct);
  let I = T;
  for (let i = 0; i < T.length; i++) {
    if (inverted[i] < T[i]) { I = inverted; break; }
    if (T[i] < inverted[i]) break;
  }
  const C = SetTheory.primeForm(O, oct);
  return { O, P, T, I, C, cardinality: C.length };
}

/**
 * Voice-leading geometry (Tymoczko): OPTIC equivalence and minimal voice leadings between chords.
 * @category Microtonal / Xenharmonic
 */
export class VoiceLeadingGeometry {
  /**
   * Computes OPTIC equivalence for a chord.
   */
  static OPTIC(chord: number[]): OPTICResult {
    return OPTIC(chord);
  }

  /**
   * Finds the most efficient voice leading between two chords in pitch-class space: each
   * voice of `a` goes to a note of `b`, and the cost is the sum of the interval classes
   * moved (the shortest way, up or down, ignoring octaves). Up to 8 voices.
   *
   * Returns all minimal-cost assignments (notes of `b` in the order of `a`'s voices) and
   * the total distance in steps.
   * @throws RangeError for chords of more than 8 notes.
   *
   * @param a - Source chord.
   * @param b - Target chord.
   */
  static efficientVoiceLeading(a: Chord, b: Chord): {
    /** Every minimal assignment: notes of `b` in the order of `a`'s voices. */
    paths: Note[][];
    /** Sum of the interval classes moved, in steps. */
    totalDistance: number;
  } {
    const aNotes = a.getNotes();
    const bNotes = b.getNotes();
    const oct = a.tuningSystem.octaveSteps;

    if (aNotes.length === 0 || bNotes.length === 0) {
      return { paths: [], totalDistance: 0 };
    }

    if (bNotes.length > 8) throw new RangeError('efficientVoiceLeading: more than 8 voices');
    // Build all permutations of bNotes and find minimum total displacement
    const permutations = getPermutations(bNotes);
    let bestDistance = Infinity;
    let bestPaths: Note[][] = [];

    for (const perm of permutations) {
      let totalDist = 0;
      for (let i = 0; i < Math.min(aNotes.length, perm.length); i++) {
        const r = (((perm[i].stepsFromBase - aNotes[i].stepsFromBase) % oct) + oct) % oct;
        totalDist += Math.min(r, oct - r); // interval class: never negative, any octave
      }
      if (totalDist < bestDistance) {
        bestDistance = totalDist;
        bestPaths = [perm];
      } else if (totalDist === bestDistance) {
        bestPaths.push(perm);
      }
    }

    return { paths: bestPaths, totalDistance: bestDistance };
  }

  /**
   * Returns the voice-leading distance between two chords:
   * the minimum total semitone displacement across all voice assignments.
   */
  static chordGraphDistance(a: Chord, b: Chord): number {
    return this.efficientVoiceLeading(a, b).totalDistance;
  }
}

function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}
