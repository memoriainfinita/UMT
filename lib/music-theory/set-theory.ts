import { Note } from './note';

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
}
