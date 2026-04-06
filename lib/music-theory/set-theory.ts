import { Note } from './note';

export class SetTheory {
  /**
   * Extracts unique pitch classes from an array of notes (assuming 12-TET).
   * Returns integers 0-11 where 0 = A (the library's coordinate origin).
   * For standard set-theory notation (0 = C), use getPitchClassesC0.
   */
  static getPitchClasses(notes: Note[]): number[] {
    const pcs = notes.map(n => ((n.stepsFromBase % 12) + 12) % 12);
    return Array.from(new Set(pcs)).sort((a, b) => a - b);
  }

  /**
   * Like getPitchClasses, but normalized to C = 0 (standard set-theory convention).
   * C=0, C#=1, D=2, ..., B=11.
   */
  static getPitchClassesC0(notes: Note[]): number[] {
    // A=0 in our system, C is 3 semitones above A, so shift by +3 to align C to 0.
    const pcs = notes.map(n => ((n.stepsFromBase + 3) % 12 + 12) % 12);
    return Array.from(new Set(pcs)).sort((a, b) => a - b);
  }

  /**
   * Calculates the Normal Form of a pitch class set.
   * The most compact arrangement of the set.
   */
  static normalForm(pcs: number[]): number[] {
    if (pcs.length === 0) return [];
    if (pcs.length === 1) return [pcs[0]];

    // Ensure sorted unique
    const sorted = Array.from(new Set(pcs.map(p => ((p % 12) + 12) % 12))).sort((a, b) => a - b);

    let bestRotation = sorted;
    let minSpan = 12;

    for (let i = 0; i < sorted.length; i++) {
      const rotation = [...sorted.slice(i), ...sorted.slice(0, i).map(p => p + 12)];
      const span = rotation[rotation.length - 1] - rotation[0];

      if (span < minSpan) {
        minSpan = span;
        bestRotation = rotation;
      } else if (span === minSpan) {
        // Tie breaker: pack to the left (check intervals from the bottom up)
        for (let j = rotation.length - 2; j > 0; j--) {
          const spanA = bestRotation[j] - bestRotation[0];
          const spanB = rotation[j] - rotation[0];
          if (spanB < spanA) {
            bestRotation = rotation;
            break;
          } else if (spanA < spanB) {
            break;
          }
        }
      }
    }
    return bestRotation.map(p => p % 12);
  }

  /**
   * Calculates the Prime Form of a pitch class set.
   * The standard representative of a set class (transpositionally and inversionally equivalent).
   */
  static primeForm(pcs: number[]): number[] {
    if (pcs.length === 0) return [];
    const normal = this.normalForm(pcs);
    const inverted = this.normalForm(pcs.map(p => (12 - p) % 12));

    const zeroedNormal = normal.map(p => (p - normal[0] + 12) % 12);
    const zeroedInverted = inverted.map(p => (p - inverted[0] + 12) % 12);

    // Compare lexicographically
    for (let i = 0; i < zeroedNormal.length; i++) {
      if (zeroedNormal[i] < zeroedInverted[i]) return zeroedNormal;
      if (zeroedInverted[i] < zeroedNormal[i]) return zeroedInverted;
    }
    return zeroedNormal;
  }

  /**
   * Calculates the Interval Vector of a pitch class set.
   * A 6-digit array counting the occurrences of interval classes 1 through 6.
   */
  static intervalVector(pcs: number[]): number[] {
    const vector = [0, 0, 0, 0, 0, 0];
    const uniquePcs = Array.from(new Set(pcs.map(p => ((p % 12) + 12) % 12)));
    
    for (let i = 0; i < uniquePcs.length; i++) {
      for (let j = i + 1; j < uniquePcs.length; j++) {
        let diff = Math.abs(uniquePcs[i] - uniquePcs[j]) % 12;
        if (diff > 6) diff = 12 - diff;
        if (diff > 0 && diff <= 6) {
          vector[diff - 1]++;
        }
      }
    }
    return vector;
  }
}
