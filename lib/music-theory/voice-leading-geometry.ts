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

export interface OPTICResult {
  /** O: octave equivalence - pitch classes only */
  O: number[];
  /** P: permutation-normal form (sorted) */
  P: number[];
  /** T: transposition - zero-centred (subtract min) */
  T: number[];
  /** I: inversion equivalence - prime form */
  I: number[];
  /** C: cardinality - number of distinct pitch classes */
  C: number;
}

/**
 * Computes OPTIC equivalence classes for a chord expressed as pitch classes (mod 12).
 *
 * @param pcs - Array of pitch class integers (0–11).
 */
export function OPTIC(pcs: number[]): OPTICResult {
  const oct = 12;

  // O: reduce to pitch classes
  const O = [...new Set(pcs.map(p => ((p % oct) + oct) % oct))].sort((a, b) => a - b);

  // P: sorted (permutation normal form)
  const P = [...O];

  // T: transposed so first = 0
  const T = P.map(p => (p - P[0] + oct) % oct);

  // I: inversion equivalence (prime form - choose more compact of T and its inversion)
  const inv = T.map(p => (oct - p) % oct).sort((a, b) => a - b);
  const invZeroed = inv.map(p => (p - inv[0] + oct) % oct);
  let I: number[] = T;
  for (let i = 0; i < T.length; i++) {
    if (invZeroed[i] < T[i]) { I = invZeroed; break; }
    if (T[i] < invZeroed[i]) break;
  }

  // C: distinct pitch class count
  const C = O.length;

  return { O, P, T, I, C };
}

export class VoiceLeadingGeometry {
  /**
   * Computes OPTIC equivalence for a chord.
   */
  static OPTIC(chord: number[]): OPTICResult {
    return OPTIC(chord);
  }

  /**
   * Finds the most efficient voice leading between two chords.
   * Minimises total displacement (sum of absolute interval distances for each voice).
   *
   * Returns all minimal-cost voice-leading paths and the total distance in semitones.
   *
   * @param a - Source chord.
   * @param b - Target chord.
   */
  static efficientVoiceLeading(a: Chord, b: Chord): { paths: Note[][]; totalDistance: number } {
    const aNotes = a.getNotes();
    const bNotes = b.getNotes();
    const oct = a.tuningSystem.octaveSteps;

    if (aNotes.length === 0 || bNotes.length === 0) {
      return { paths: [], totalDistance: 0 };
    }

    // Build all permutations of bNotes and find minimum total displacement
    const permutations = getPermutations(bNotes);
    let bestDistance = Infinity;
    let bestPaths: Note[][] = [];

    for (const perm of permutations) {
      let totalDist = 0;
      for (let i = 0; i < Math.min(aNotes.length, perm.length); i++) {
        const diff = Math.abs(aNotes[i].stepsFromBase - perm[i].stepsFromBase);
        totalDist += Math.min(diff, oct - diff);
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
  if (arr.length > 5) return [arr]; // cap at 5 voices to avoid exponential blowup
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}
