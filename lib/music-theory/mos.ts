/**
 * MOS (Moment of Symmetry) scales - generated scales with exactly two step sizes.
 * Used in xenharmonic / microtonal theory to find well-formed scales in arbitrary EDOs.
 */

export class MOS {
  /**
   * Generates a MOS scale by stacking a generator interval within a period.
   *
   * @param generator - Generator size in steps within the period.
   * @param period - Period size in steps (usually octave = 12 in 12-TET, or EDO divisions).
   * @param size - Number of notes desired.
   * @returns Array of step offsets from 0 (the tonic), sorted ascending.
   */
  static generate(generator: number, period: number, size: number): number[] {
    if (size <= 0 || period <= 0) return [];
    const pcs = new Set<number>();
    let pos = 0;
    for (let i = 0; i < size; i++) {
      pcs.add(((pos % period) + period) % period);
      pos += generator;
    }
    return Array.from(pcs).sort((a, b) => a - b);
  }

  /**
   * Tests whether a set of steps is a MOS (moment of symmetry) scale by Myhill's property:
   * every generic interval (spanning k scale steps, k = 1 … n−1, around the period) comes
   * in exactly two sizes. Two step sizes alone are not enough: LLssLLL (0 2 4 5 6 8 10 in
   * 12) has them and is not a MOS.
   *
   * @param scale - Step offsets within one period (0 included).
   * @param period - Period in steps (default 12: one 12-TET octave).
   * @returns true if the scale is a MOS (well-formed scale).
   */
  static isMOS(scale: number[], period = 12): boolean {
    const s = [...new Set(scale.map(x => ((x % period) + period) % period))].sort((a, b) => a - b);
    const n = s.length;
    if (n < 2) return false;
    for (let k = 1; k < n; k++) {
      const sizes = new Set(s.map((x, i) => (s[(i + k) % n] - x + period) % period || period));
      if (sizes.size !== 2) return false;
    }
    return true;
  }

  /**
   * Returns the MOS family - all MOS scales for a given generator and period up to maxSize.
   * Each entry is a MOS scale (sorted step array).
   */
  static getMOSFamily(generator: number, period: number, maxSize: number): number[][] {
    const result: number[][] = [];
    for (let size = 2; size <= maxSize; size++) {
      const scale = this.generate(generator, period, size);
      if (this.isMOS(scale, period)) {
        result.push(scale);
      }
    }
    return result;
  }
}

/**
 * Comma pump detection in just intonation progressions.
 *
 * Each root motion is measured as the JI interval of its size in steps (a motion of 7
 * steps is the tuning's 7th class, 3/2 in 5-limit JI), so a progression that returns to
 * its root by just intervals adds up to the comma it drifted by: C Am Dm G C → 81/80.
 */
import { Chord } from './chord';
import { JustIntonation } from './tuning';

/** Comma pump detection: pitch drift of a just-intonation progression. */
export class CommaPump {
  /**
   * Detects if a chord progression drifts in pitch due to JI comma accumulation.
   *
   * Returns the total drift in cents and the likely comma type.
   * A drift near 0 means the progression is comma-free ("pumpless").
   * A drift near a known comma value identifies the pump type.
   *
   * @param chords - The progression (all chords should share the same JI tuning).
   * @param tuning - The JI tuning context.
   */
  static detect(
    chords: Chord[],
    tuning: JustIntonation
  ): {
    /** Absolute drift after the progression, in cents; 0 for a progression without drift. */
    drift: number;
    /** The comma the drift matches (within 3 cents, 5 for septimal), if any. */
    commaType?: 'syntonic' | 'pythagorean' | 'septimal';
  } {
    if (chords.length < 2) return { drift: 0 };

    // Sum up the pitch drift: consecutive root intervals
    let totalCents = 0;
    for (let i = 1; i < chords.length; i++) {
      const diff = chords[i].rootStep - chords[i - 1].rootStep;
      totalCents += tuning.getInterval(diff).cents;
    }

    // Return to root: add the final interval back to start
    const loopCents = totalCents + tuning.getInterval(chords[0].rootStep - chords[chords.length - 1].rootStep).cents;
    const drift = Math.abs(loopCents);

    // Known commas in cents
    const SYNTONIC = 21.5; // 81/80
    const PYTHAGOREAN = 23.5; // 531441/524288
    const SEPTIMAL = 35.7; // 64/63

    let commaType: 'syntonic' | 'pythagorean' | 'septimal' | undefined;
    if (Math.abs(drift - SYNTONIC) < 3) commaType = 'syntonic';
    else if (Math.abs(drift - PYTHAGOREAN) < 3) commaType = 'pythagorean';
    else if (Math.abs(drift - SEPTIMAL) < 5) commaType = 'septimal';

    return { drift, commaType };
  }
}
