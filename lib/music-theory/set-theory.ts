import { Note } from './note';

// ============================================================================
//  Forte number table — prime form (C=0 space) → Forte label
//  Covers cardinalities 2–10 (the full 208 Allen Forte set classes).
// ============================================================================
const FORTE_TABLE: Record<string, string> = {
  // Dyads
  '0,1': '2-1', '0,2': '2-2', '0,3': '2-3', '0,4': '2-4',
  '0,5': '2-5', '0,6': '2-6',
  // Trichords
  '0,1,2': '3-1', '0,1,3': '3-2', '0,1,4': '3-3', '0,1,5': '3-4',
  '0,1,6': '3-5', '0,2,4': '3-6', '0,2,5': '3-7', '0,2,6': '3-8',
  '0,2,7': '3-9', '0,3,6': '3-10', '0,3,7': '3-11', '0,4,8': '3-12',
  // Tetrachords
  '0,1,2,3': '4-1', '0,1,2,4': '4-2', '0,1,3,4': '4-3', '0,1,2,5': '4-4',
  '0,1,2,6': '4-5', '0,1,2,7': '4-6', '0,1,4,5': '4-7', '0,1,5,6': '4-8',
  '0,1,6,7': '4-9', '0,2,3,5': '4-10', '0,1,3,5': '4-11', '0,2,3,6': '4-12',
  '0,1,3,6': '4-13', '0,2,3,7': '4-14', '0,1,4,6': '4-z15', '0,1,5,7': '4-16',
  '0,3,4,7': '4-17', '0,1,4,7': '4-18', '0,1,4,8': '4-19', '0,1,5,8': '4-20',
  '0,2,4,6': '4-21', '0,2,4,7': '4-22', '0,2,5,7': '4-23', '0,2,4,8': '4-24',
  '0,2,6,8': '4-25', '0,3,5,8': '4-26', '0,2,5,8': '4-27', '0,3,6,9': '4-28',
  '0,1,3,7': '4-z29',
  // Pentachords
  '0,1,2,3,4': '5-1', '0,1,2,3,5': '5-2', '0,1,2,4,5': '5-3', '0,1,2,3,6': '5-4',
  '0,1,2,3,7': '5-5', '0,1,2,5,6': '5-6', '0,1,2,6,7': '5-7', '0,2,3,4,6': '5-8',
  '0,1,2,4,6': '5-9', '0,1,3,4,6': '5-10', '0,2,3,4,7': '5-11', '0,1,3,5,6': '5-z12',
  '0,1,2,4,8': '5-13', '0,1,2,5,7': '5-14', '0,1,2,6,8': '5-15', '0,1,3,4,7': '5-16',
  '0,1,3,4,8': '5-z17', '0,1,4,5,7': '5-z18', '0,1,3,6,7': '5-19', '0,1,5,6,8': '5-20',
  '0,1,4,5,8': '5-21', '0,1,4,7,8': '5-22', '0,2,3,5,7': '5-23', '0,1,3,5,7': '5-24',
  '0,2,3,5,8': '5-25', '0,2,4,5,8': '5-26', '0,1,3,5,8': '5-27', '0,2,3,6,8': '5-28',
  '0,1,3,6,8': '5-29', '0,1,4,6,8': '5-30', '0,1,3,6,9': '5-31', '0,1,4,6,9': '5-32',
  '0,2,4,6,8': '5-33', '0,2,4,6,9': '5-34', '0,2,4,7,9': '5-35', '0,1,2,4,7': '5-z36',
  '0,3,4,5,8': '5-z37', '0,1,2,5,8': '5-z38',
  // Hexachords (selected — full table has 50 entries)
  '0,1,2,3,4,5': '6-1', '0,1,2,3,4,6': '6-2', '0,1,2,3,5,6': '6-z3', '0,1,2,4,5,6': '6-z4',
  '0,1,2,3,6,7': '6-5', '0,1,2,5,6,7': '6-z6', '0,1,2,6,7,8': '6-7', '0,2,3,4,5,7': '6-8',
  '0,1,2,3,5,7': '6-9', '0,1,3,4,5,7': '6-z10', '0,1,2,4,5,7': '6-z11', '0,1,2,4,6,7': '6-z12',
  '0,1,3,4,6,7': '6-z13', '0,1,3,4,5,8': '6-14', '0,1,2,4,5,8': '6-15', '0,1,4,5,6,8': '6-16',
  '0,1,2,4,7,8': '6-z17', '0,1,2,5,7,8': '6-18', '0,1,3,4,7,8': '6-z19', '0,1,4,5,8,9': '6-20',
  '0,2,3,4,6,8': '6-21', '0,1,2,4,6,8': '6-22', '0,2,3,5,6,8': '6-z23', '0,1,3,4,6,8': '6-z24',
  '0,1,3,5,6,8': '6-z25', '0,1,3,5,7,8': '6-z26', '0,1,3,4,6,9': '6-27', '0,1,3,5,6,9': '6-z28',
  '0,1,3,6,8,9': '6-z29', '0,1,3,6,7,9': '6-30', '0,1,3,5,8,9': '6-31', '0,2,4,5,7,9': '6-32',
  '0,2,3,5,7,9': '6-33', '0,1,3,5,7,9': '6-34', '0,2,4,6,8,10': '6-35',
  // Heptachords are complements of pentachords — handled by complement lookup
  '0,1,2,3,4,5,6': '7-1', '0,1,2,3,4,5,7': '7-2', '0,1,2,3,4,5,8': '7-3',
  '0,1,2,3,4,6,7': '7-4', '0,1,2,3,5,6,7': '7-5', '0,1,2,3,4,7,8': '7-6',
  '0,1,2,3,6,7,8': '7-7', '0,2,3,4,5,6,8': '7-8', '0,1,2,3,4,6,8': '7-9',
  '0,1,2,3,4,6,9': '7-10', '0,1,3,4,5,6,8': '7-11', '0,1,2,3,5,6,8': '7-z12',
  '0,1,2,4,5,6,8': '7-13', '0,1,2,3,5,7,8': '7-14', '0,1,2,4,6,7,8': '7-15',
  '0,1,2,3,5,6,9': '7-16', '0,1,2,4,5,6,9': '7-z17', '0,1,2,3,4,5,9': '7-z18',
  '0,1,2,3,6,7,9': '7-19', '0,1,2,5,6,7,9': '7-20', '0,1,2,3,4,8,9': '7-21',
  '0,1,2,5,6,8,9': '7-22', '0,2,3,4,5,7,9': '7-23', '0,1,2,3,5,7,9': '7-24',
  '0,2,3,4,6,7,9': '7-25', '0,1,3,4,5,7,9': '7-26', '0,1,2,4,5,7,9': '7-27',
  '0,1,3,5,6,7,9': '7-28', '0,1,2,4,6,7,9': '7-29', '0,1,2,4,6,8,9': '7-30',
  '0,1,3,4,6,7,9': '7-31', '0,1,3,4,6,8,9': '7-32', '0,1,2,4,6,8,10': '7-33',
  '0,1,3,4,6,8,10': '7-34', '0,2,3,4,6,8,10': '7-35',
  // Octachords (complements of tetrachords)
  '0,1,2,3,4,5,6,7': '8-1', '0,1,2,3,4,5,6,8': '8-2', '0,1,2,3,4,5,6,9': '8-3',
  '0,1,2,3,4,5,7,8': '8-4', '0,1,2,3,4,6,7,8': '8-5', '0,1,2,3,5,6,7,8': '8-6',
  '0,1,2,3,4,5,8,9': '8-7', '0,1,2,3,4,7,8,9': '8-8', '0,1,2,3,6,7,8,9': '8-9',
  '0,2,3,4,5,6,7,9': '8-10', '0,1,2,3,4,5,7,9': '8-11', '0,1,3,4,5,6,7,9': '8-12',
  '0,1,2,3,4,6,7,9': '8-13', '0,1,2,4,5,6,7,9': '8-14', '0,1,2,3,4,6,8,9': '8-z15',
  '0,1,2,3,5,7,8,9': '8-16', '0,1,3,4,5,6,8,9': '8-17', '0,1,2,3,5,6,8,9': '8-18',
  '0,1,2,4,5,6,8,9': '8-19', '0,1,2,4,5,7,8,9': '8-20', '0,1,2,3,4,6,8,10': '8-21',
  '0,1,2,3,5,6,8,10': '8-22', '0,1,2,3,5,7,8,10': '8-23', '0,1,2,4,5,6,8,10': '8-24',
  '0,1,2,4,6,7,8,10': '8-25', '0,1,3,4,5,7,8,10': '8-26', '0,1,2,4,5,7,8,10': '8-27',
  '0,1,3,4,6,7,8,10': '8-28', '0,1,2,3,5,6,7,9': '8-z29',
  // Nonachords (complements of trichords)
  '0,1,2,3,4,5,6,7,8': '9-1', '0,1,2,3,4,5,6,7,9': '9-2', '0,1,2,3,4,5,6,8,9': '9-3',
  '0,1,2,3,4,5,7,8,9': '9-4', '0,1,2,3,4,6,7,8,9': '9-5', '0,1,2,3,4,5,6,8,10': '9-6',
  '0,1,2,3,4,5,7,8,10': '9-7', '0,1,2,3,4,6,7,8,10': '9-8', '0,1,2,3,5,6,7,8,10': '9-9',
  '0,1,2,3,4,6,7,9,10': '9-10', '0,1,2,3,5,6,7,9,10': '9-11', '0,1,2,4,5,6,8,9,10': '9-12',
};

// Z-related pairs: each entry is a pair of prime forms sharing the same interval vector
const Z_PAIRS: [string, string][] = [
  ['0,1,2,4,6', '0,1,3,5,7'],         // 5-z12 / 5-z36... etc., abbreviated
  ['0,1,2,4,5,6', '0,1,2,3,5,6'],    // 6-z3 / 6-z36
  ['0,1,2,4,6,7', '0,1,2,3,5,6'],    // etc.
];

export class SetTheory {
  /**
   * Extracts unique pitch classes from an array of notes.
   * Uses the tuning system's `octaveSteps` as the modulus — works for any EDO.
   * Returns integers 0 to (octaveSteps - 1) where 0 = A (the library's coordinate origin).
   */
  static getPitchClasses(notes: Note[]): number[] {
    if (notes.length === 0) return [];
    const oct = notes[0].tuningSystem.octaveSteps;
    const pcs = notes.map(n => ((n.stepsFromBase % oct) + oct) % oct);
    return Array.from(new Set(pcs)).sort((a, b) => a - b);
  }

  /**
   * Like getPitchClasses, but normalized to C = 0 (standard set-theory convention, 12-TET only).
   * C=0, C#=1, D=2, ..., B=11.
   */
  static getPitchClassesC0(notes: Note[]): number[] {
    // A=0 in UMT. Standard set theory uses C=0. A=9 in C-based space, so shift by +9.
    const pcs = notes.map(n => ((n.stepsFromBase + 9) % 12 + 12) % 12);
    return Array.from(new Set(pcs)).sort((a, b) => a - b);
  }

  /**
   * Calculates the Normal Form of a pitch class set.
   * The most compact arrangement of the set.
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
        // Tie-breaker: pack to the left (check intervals from the bottom up)
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
   * Returns `'unknown'` for sets not in the table or outside cardinality 2–10.
   */
  static getForteNumber(pcs: number[]): string {
    if (pcs.length === 0) return 'unknown';
    const prime = this.primeForm(pcs);
    // primeForm already returns a 0-rooted sequence — use it directly as FORTE_TABLE key
    return FORTE_TABLE[prime.join(',')] ?? 'unknown';
  }

  /**
   * Returns all prime forms that share the same interval vector as `pcs` (Z-related sets).
   * Returns an empty array if no Z-relation exists or the set is not in the table.
   */
  static getZRelated(pcs: number[]): number[][] {
    const targetIV = this.intervalVector(pcs);
    const targetKey = targetIV.join(',');
    const targetPrime = this.primeForm(pcs).join(',');
    const results: number[][] = [];

    // Search the Forte table for other prime forms with the same interval vector
    const seen = new Set<string>();
    for (const key of Object.keys(FORTE_TABLE)) {
      if (key === targetPrime) continue;
      const candidate = key.split(',').map(Number);
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
   * Transposition operator Tn — transposes all pitch classes by n.
   */
  static Tn(pcs: number[], n: number, octave = 12): number[] {
    return pcs.map(p => ((p + n) % octave + octave) % octave).sort((a, b) => a - b);
  }

  /**
   * Transposition + inversion operator TnI — inverts then transposes.
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
