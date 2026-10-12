/**
 * Post-tonal set theory: normal/prime form, interval vector, Forte catalogue, and Z-relations.
 */
import { Note } from './note';
import { EDO } from './tuning';

// ============================================================================
//  Forte number table - prime form (C=0 space) → Forte label
//  All 223 set classes of cardinality 1–12 (Forte 1973), with Rahn's prime forms,
//  which differ from Forte's own in a few classes (5-20: Rahn [0,1,5,6,8], Forte [0,1,3,7,8]).
//  Source: Wikipedia "List of set classes"; checked by tests against primeForm.
// ============================================================================
const FORTE_TABLE: Record<string, string> = {
  '0': '1-1',
  '0,1': '2-1', '0,2': '2-2', '0,3': '2-3', '0,4': '2-4', '0,5': '2-5', '0,6': '2-6',
  '0,1,2': '3-1', '0,1,3': '3-2', '0,1,4': '3-3', '0,1,5': '3-4', '0,1,6': '3-5', '0,2,4': '3-6',
  '0,2,5': '3-7', '0,2,6': '3-8', '0,2,7': '3-9', '0,3,6': '3-10', '0,3,7': '3-11', '0,4,8': '3-12',
  '0,1,2,3': '4-1', '0,1,2,4': '4-2', '0,1,3,4': '4-3', '0,1,2,5': '4-4', '0,1,2,6': '4-5', '0,1,2,7': '4-6',
  '0,1,4,5': '4-7', '0,1,5,6': '4-8', '0,1,6,7': '4-9', '0,2,3,5': '4-10', '0,1,3,5': '4-11', '0,2,3,6': '4-12',
  '0,1,3,6': '4-13', '0,2,3,7': '4-14', '0,1,4,6': '4-Z15', '0,1,5,7': '4-16', '0,3,4,7': '4-17', '0,1,4,7': '4-18',
  '0,1,4,8': '4-19', '0,1,5,8': '4-20', '0,2,4,6': '4-21', '0,2,4,7': '4-22', '0,2,5,7': '4-23', '0,2,4,8': '4-24',
  '0,2,6,8': '4-25', '0,3,5,8': '4-26', '0,2,5,8': '4-27', '0,3,6,9': '4-28', '0,1,3,7': '4-Z29',
  '0,1,2,3,4': '5-1', '0,1,2,3,5': '5-2', '0,1,2,4,5': '5-3', '0,1,2,3,6': '5-4',
  '0,1,2,3,7': '5-5', '0,1,2,5,6': '5-6', '0,1,2,6,7': '5-7', '0,2,3,4,6': '5-8',
  '0,1,2,4,6': '5-9', '0,1,3,4,6': '5-10', '0,2,3,4,7': '5-11', '0,1,3,5,6': '5-Z12',
  '0,1,2,4,8': '5-13', '0,1,2,5,7': '5-14', '0,1,2,6,8': '5-15', '0,1,3,4,7': '5-16',
  '0,1,3,4,8': '5-Z17', '0,1,4,5,7': '5-Z18', '0,1,3,6,7': '5-19', '0,1,5,6,8': '5-20',
  '0,1,4,5,8': '5-21', '0,1,4,7,8': '5-22', '0,2,3,5,7': '5-23', '0,1,3,5,7': '5-24',
  '0,2,3,5,8': '5-25', '0,2,4,5,8': '5-26', '0,1,3,5,8': '5-27', '0,2,3,6,8': '5-28',
  '0,1,3,6,8': '5-29', '0,1,4,6,8': '5-30', '0,1,3,6,9': '5-31', '0,1,4,6,9': '5-32',
  '0,2,4,6,8': '5-33', '0,2,4,6,9': '5-34', '0,2,4,7,9': '5-35', '0,1,2,4,7': '5-Z36',
  '0,3,4,5,8': '5-Z37', '0,1,2,5,8': '5-Z38',
  '0,1,2,3,4,5': '6-1', '0,1,2,3,4,6': '6-2', '0,1,2,3,5,6': '6-Z3', '0,1,2,4,5,6': '6-Z4',
  '0,1,2,3,6,7': '6-5', '0,1,2,5,6,7': '6-Z6', '0,1,2,6,7,8': '6-7', '0,2,3,4,5,7': '6-8',
  '0,1,2,3,5,7': '6-9', '0,1,3,4,5,7': '6-Z10', '0,1,2,4,5,7': '6-Z11', '0,1,2,4,6,7': '6-Z12',
  '0,1,3,4,6,7': '6-Z13', '0,1,3,4,5,8': '6-14', '0,1,2,4,5,8': '6-15', '0,1,4,5,6,8': '6-16',
  '0,1,2,4,7,8': '6-Z17', '0,1,2,5,7,8': '6-18', '0,1,3,4,7,8': '6-Z19', '0,1,4,5,8,9': '6-20',
  '0,2,3,4,6,8': '6-21', '0,1,2,4,6,8': '6-22', '0,2,3,5,6,8': '6-Z23', '0,1,3,4,6,8': '6-Z24',
  '0,1,3,5,6,8': '6-Z25', '0,1,3,5,7,8': '6-Z26', '0,1,3,4,6,9': '6-27', '0,1,3,5,6,9': '6-Z28',
  '0,2,3,6,7,9': '6-Z29', '0,1,3,6,7,9': '6-30', '0,1,4,5,7,9': '6-31', '0,2,4,5,7,9': '6-32',
  '0,2,3,5,7,9': '6-33', '0,1,3,5,7,9': '6-34', '0,2,4,6,8,10': '6-35', '0,1,2,3,4,7': '6-Z36',
  '0,1,2,3,4,8': '6-Z37', '0,1,2,3,7,8': '6-Z38', '0,2,3,4,5,8': '6-Z39', '0,1,2,3,5,8': '6-Z40',
  '0,1,2,3,6,8': '6-Z41', '0,1,2,3,6,9': '6-Z42', '0,1,2,5,6,8': '6-Z43', '0,1,2,5,6,9': '6-Z44',
  '0,2,3,4,6,9': '6-Z45', '0,1,2,4,6,9': '6-Z46', '0,1,2,4,7,9': '6-Z47', '0,1,2,5,7,9': '6-Z48',
  '0,1,3,4,7,9': '6-Z49', '0,1,4,6,7,9': '6-Z50',
  '0,1,2,3,4,5,6': '7-1', '0,1,2,3,4,5,7': '7-2', '0,1,2,3,4,5,8': '7-3', '0,1,2,3,4,6,7': '7-4',
  '0,1,2,3,5,6,7': '7-5', '0,1,2,3,4,7,8': '7-6', '0,1,2,3,6,7,8': '7-7', '0,2,3,4,5,6,8': '7-8',
  '0,1,2,3,4,6,8': '7-9', '0,1,2,3,4,6,9': '7-10', '0,1,3,4,5,6,8': '7-11', '0,1,2,3,4,7,9': '7-Z12',
  '0,1,2,4,5,6,8': '7-13', '0,1,2,3,5,7,8': '7-14', '0,1,2,4,6,7,8': '7-15', '0,1,2,3,5,6,9': '7-16',
  '0,1,2,4,5,6,9': '7-Z17', '0,1,4,5,6,7,9': '7-Z18', '0,1,2,3,6,7,9': '7-19', '0,1,2,5,6,7,9': '7-20',
  '0,1,2,4,5,8,9': '7-21', '0,1,2,5,6,8,9': '7-22', '0,2,3,4,5,7,9': '7-23', '0,1,2,3,5,7,9': '7-24',
  '0,2,3,4,6,7,9': '7-25', '0,1,3,4,5,7,9': '7-26', '0,1,2,4,5,7,9': '7-27', '0,1,3,5,6,7,9': '7-28',
  '0,1,2,4,6,7,9': '7-29', '0,1,2,4,6,8,9': '7-30', '0,1,3,4,6,7,9': '7-31', '0,1,3,4,6,8,9': '7-32',
  '0,1,2,4,6,8,10': '7-33', '0,1,3,4,6,8,10': '7-34', '0,1,3,5,6,8,10': '7-35', '0,1,2,3,5,6,8': '7-Z36',
  '0,1,3,4,5,7,8': '7-Z37', '0,1,2,4,5,7,8': '7-Z38',
  '0,1,2,3,4,5,6,7': '8-1', '0,1,2,3,4,5,6,8': '8-2', '0,1,2,3,4,5,6,9': '8-3',
  '0,1,2,3,4,5,7,8': '8-4', '0,1,2,3,4,6,7,8': '8-5', '0,1,2,3,5,6,7,8': '8-6',
  '0,1,2,3,4,5,8,9': '8-7', '0,1,2,3,4,7,8,9': '8-8', '0,1,2,3,6,7,8,9': '8-9',
  '0,2,3,4,5,6,7,9': '8-10', '0,1,2,3,4,5,7,9': '8-11', '0,1,3,4,5,6,7,9': '8-12',
  '0,1,2,3,4,6,7,9': '8-13', '0,1,2,4,5,6,7,9': '8-14', '0,1,2,3,4,6,8,9': '8-Z15',
  '0,1,2,3,5,7,8,9': '8-16', '0,1,3,4,5,6,8,9': '8-17', '0,1,2,3,5,6,8,9': '8-18',
  '0,1,2,4,5,6,8,9': '8-19', '0,1,2,4,5,7,8,9': '8-20', '0,1,2,3,4,6,8,10': '8-21',
  '0,1,2,3,5,6,8,10': '8-22', '0,1,2,3,5,7,8,10': '8-23', '0,1,2,4,5,6,8,10': '8-24',
  '0,1,2,4,6,7,8,10': '8-25', '0,1,3,4,5,7,8,10': '8-26', '0,1,2,4,5,7,8,10': '8-27',
  '0,1,3,4,6,7,9,10': '8-28', '0,1,2,3,5,6,7,9': '8-Z29',
  '0,1,2,3,4,5,6,7,8': '9-1', '0,1,2,3,4,5,6,7,9': '9-2', '0,1,2,3,4,5,6,8,9': '9-3',
  '0,1,2,3,4,5,7,8,9': '9-4', '0,1,2,3,4,6,7,8,9': '9-5', '0,1,2,3,4,5,6,8,10': '9-6',
  '0,1,2,3,4,5,7,8,10': '9-7', '0,1,2,3,4,6,7,8,10': '9-8', '0,1,2,3,5,6,7,8,10': '9-9',
  '0,1,2,3,4,6,7,9,10': '9-10', '0,1,2,3,5,6,7,9,10': '9-11', '0,1,2,4,5,6,8,9,10': '9-12',
  '0,1,2,3,4,5,6,7,8,9': '10-1', '0,1,2,3,4,5,6,7,8,10': '10-2', '0,1,2,3,4,5,6,7,9,10': '10-3',
  '0,1,2,3,4,5,6,8,9,10': '10-4', '0,1,2,3,4,5,7,8,9,10': '10-5', '0,1,2,3,4,6,7,8,9,10': '10-6',
  '0,1,2,3,4,5,6,7,8,9,10': '11-1',
  '0,1,2,3,4,5,6,7,8,9,10,11': '12-1',
};

/**
 * Allen Forte set-class analysis for any pitch-class collection.
 * @category Post-tonal
 */
export class SetTheory {
  /**
   * Extracts unique pitch classes from an array of notes.
   * Uses the tuning system's `octaveSteps` as the modulus - works for any EDO.
   * Returns integers 0 to (octaveSteps - 1) where 0 = A (the library's coordinate origin).
   */
  static getPitchClasses(notes: Note[]): number[] {
    if (notes.length === 0) return [];
    const oct = notes[0].tuningSystem.octaveSteps;
    const pcs = notes.map(n => ((n.stepsFromBase % oct) + oct) % oct);
    return Array.from(new Set(pcs)).sort((a, b) => a - b);
  }

  /**
   * Like getPitchClasses, but as 12-TET pitch classes from C = 0 (standard set-theory convention).
   * C=0, C#=1, D=2, ..., B=11. Notes in other tunings count for the nearest 12-TET pitch class.
   */
  static getPitchClassesC0(notes: Note[]): number[] {
    // A=0 in UMT. Standard set theory uses C=0. A=9 in C-based space, so shift by +9.
    const semitones = (n: Note) => n.tuningSystem instanceof EDO && n.tuningSystem.divisions === 12
      ? n.stepsFromBase
      : Math.round(12 * Math.log2(n.frequency / 440));
    const pcs = notes.map(n => ((semitones(n) + 9) % 12 + 12) % 12);
    return Array.from(new Set(pcs)).sort((a, b) => a - b);
  }

  /**
   * Calculates the Normal Form of a pitch class set.
   * The most compact arrangement of the set. Ties in span are broken as in Rahn (1980):
   * the rotation whose second-to-last note is closest to the first wins, then the third-to-last…
   * (Forte compares from the bottom instead; the two differ in a few set classes).
   * @param pcs - Array of pitch class integers.
   * @param octave - Steps per octave (default 12). Pass `tuningSystem.octaveSteps` for non-12-TET.
   */
  static normalForm(pcs: number[], octave = 12): number[] {
    if (pcs.length === 0) return [];
    if (pcs.length === 1) return [pcs[0]];

    const sorted = Array.from(new Set(pcs.map(p => ((p % octave) + octave) % octave))).sort((a, b) => a - b);

    let bestRotation = sorted;
    let minSpan = octave;

    for (let i = 0; i < sorted.length; i++) {
      const rotation = [...sorted.slice(i), ...sorted.slice(0, i).map(p => p + octave)];
      const span = rotation[rotation.length - 1] - rotation[0];

      if (span < minSpan) {
        minSpan = span;
        bestRotation = rotation;
      } else if (span === minSpan) {
        // Tie-breaker (Rahn): compare spans from the first note to each note, from the top down
        for (let j = rotation.length - 2; j > 0; j--) {
          const spanA = bestRotation[j] - bestRotation[0];
          const spanB = rotation[j] - rotation[0];
          if (spanB < spanA) { bestRotation = rotation; break; }
          else if (spanA < spanB) { break; }
        }
      }
    }
    return bestRotation.map(p => p % octave);
  }

  /**
   * Calculates the Prime Form of a pitch class set.
   * The standard representative of a set class (transpositionally and inversionally equivalent).
   * @param pcs - Array of pitch class integers.
   * @param octave - Steps per octave (default 12).
   */
  static primeForm(pcs: number[], octave = 12): number[] {
    if (pcs.length === 0) return [];
    const normal = this.normalForm(pcs, octave);
    const inverted = this.normalForm(pcs.map(p => (octave - p) % octave), octave);

    const zeroedNormal = normal.map(p => (p - normal[0] + octave) % octave);
    const zeroedInverted = inverted.map(p => (p - inverted[0] + octave) % octave);

    for (let i = 0; i < zeroedNormal.length; i++) {
      if (zeroedNormal[i] < zeroedInverted[i]) return zeroedNormal;
      if (zeroedInverted[i] < zeroedNormal[i]) return zeroedInverted;
    }
    return zeroedNormal;
  }

  /**
   * Calculates the Interval Vector of a pitch class set.
   * Returns an array of length `floor(octave / 2)` counting interval class occurrences.
   * @param pcs - Array of pitch class integers.
   * @param octave - Steps per octave (default 12).
   */
  static intervalVector(pcs: number[], octave = 12): number[] {
    const half = Math.floor(octave / 2);
    const vector = new Array(half).fill(0);
    const uniquePcs = Array.from(new Set(pcs.map(p => ((p % octave) + octave) % octave)));

    for (let i = 0; i < uniquePcs.length; i++) {
      for (let j = i + 1; j < uniquePcs.length; j++) {
        let diff = Math.abs(uniquePcs[i] - uniquePcs[j]) % octave;
        if (diff > half) diff = octave - diff;
        if (diff > 0 && diff <= half) {
          vector[diff - 1]++;
        }
      }
    }
    return vector;
  }

  /**
   * Returns the Allen Forte set-class number for a pitch class set.
   * Uses C=0 convention (same as standard set theory literature).
   * Covers every set class of 1–12 pitch classes; returns `'unknown'` for the empty set.
   */
  static getForteNumber(pcs: number[]): string {
    if (pcs.length === 0) return 'unknown';
    const prime = this.primeForm(pcs);
    // primeForm already returns a 0-rooted sequence - use it directly as FORTE_TABLE key
    return FORTE_TABLE[prime.join(',')] ?? 'unknown';
  }

  /**
   * Returns all prime forms that share the same interval vector as `pcs` (Z-related sets).
   * Z-related sets have identical interval vectors but are not related by transposition or inversion.
   * Returns an empty array if no Z-relation exists or the set is not in the Forte table.
   *
   * @param pcs - Pitch classes in C=0 space (0–11).
   * @returns Array of prime forms (each an array of pitch classes in C=0 space) that are Z-related to `pcs`.
   */
  static getZRelated(pcs: number[]): number[][] {
    if (pcs.length === 0) return [];
    const targetIV = this.intervalVector(pcs);
    const targetKey = targetIV.join(',');
    const targetPrime = this.primeForm(pcs).join(',');
    const results: number[][] = [];

    // Search the Forte table for other prime forms with the same interval vector
    const seen = new Set<string>();
    for (const key of Object.keys(FORTE_TABLE)) {
      if (key === targetPrime) continue;
      const candidate = key.split(',').map(Number);
      if (candidate.length !== targetPrime.split(',').length) continue;
      const iv = this.intervalVector(candidate).join(',');
      if (iv === targetKey && !seen.has(key)) {
        seen.add(key);
        results.push(candidate);
      }
    }
    return results;
  }

  /**
   * Returns the complement of a pitch class set (all PCs not in the set).
   * @param pcs - Pitch class integers.
   * @param octave - Octave modulus (default 12).
   */
  static getComplement(pcs: number[], octave = 12): number[] {
    const set = new Set(pcs.map(p => ((p % octave) + octave) % octave));
    return Array.from({ length: octave }, (_, i) => i).filter(i => !set.has(i));
  }

  /**
   * Transposition operator Tn - transposes all pitch classes by n.
   */
  static Tn(pcs: number[], n: number, octave = 12): number[] {
    return pcs.map(p => ((p + n) % octave + octave) % octave).sort((a, b) => a - b);
  }

  /**
   * Transposition + inversion operator TnI - inverts then transposes.
   */
  static TnI(pcs: number[], n: number, octave = 12): number[] {
    return pcs.map(p => ((n - p) % octave + octave) % octave).sort((a, b) => a - b);
  }

  /**
   * Returns true if `a` is a subset of `b` (every PC in `a` is also in `b`).
   */
  static isSubset(a: number[], b: number[], octave = 12): boolean {
    const bSet = new Set(b.map(p => ((p % octave) + octave) % octave));
    return a.every(p => bSet.has(((p % octave) + octave) % octave));
  }

  /**
   * Returns true if `a` is a superset of `b` (every PC in `b` is also in `a`).
   */
  static isSuperset(a: number[], b: number[], octave = 12): boolean {
    return this.isSubset(b, a, octave);
  }

  /**
   * Returns all subsets of `pcs` with the given cardinality.
   */
  static getAllSubsets(pcs: number[], cardinality: number): number[][] {
    const unique = Array.from(new Set(pcs));
    if (cardinality > unique.length || cardinality <= 0) return [];
    const results: number[][] = [];

    const combine = (start: number, current: number[]) => {
      if (current.length === cardinality) { results.push([...current]); return; }
      for (let i = start; i < unique.length; i++) {
        current.push(unique[i]);
        combine(i + 1, current);
        current.pop();
      }
    };
    combine(0, []);
    return results;
  }
}
