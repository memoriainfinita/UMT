/**
 * Temperament analysis and comparison tools.
 * Compares tuning systems against just intervals, finds wolf intervals,
 * and provides common comma definitions.
 */
import { TuningSystem, JustIntonation } from './tuning';

/** A single row in a temperament comparison: one tuning vs. one JI interval. */
export interface ComparisonEntry {
  /** Name of the tuning compared. */
  tuningName: string;
  /** The just interval, as `[numerator, denominator]`. */
  intervalRatio: [number, number];
  /** Size of the tuning's closest interval, in cents. */
  tuningCents: number;
  /** Size of the just interval, in cents. */
  justCents: number;
  /** Absolute difference between the two, in cents. */
  errorCents: number;
}

/** Full comparison matrix across tuning systems and JI reference intervals. */
export interface ComparisonTable {
  /** The just intervals compared, as ratios. */
  intervals: [number, number][];
  /** One row per tuning, one entry per interval, in the order of `intervals`. */
  entries: ComparisonEntry[][];
}

/** The step of `tuning` whose interval above step 0 is closest to `cents` (steps assumed ascending). */
function closestStep(tuning: TuningSystem, cents: number): number {
  let s = 0;
  const dir = cents >= 0 ? 1 : -1;
  for (let guard = 0; guard < 100000; guard++) {
    const next = s + dir;
    if (Math.abs(tuning.getInterval(next).cents - cents) >= Math.abs(tuning.getInterval(s).cents - cents)) break;
    s = next;
  }
  return s;
}

/** Static methods for comparing tuning systems against JI, detecting wolf intervals, and finding optimal EDOs. */
export class TemperamentAnalysis {
  /**
   * Compares multiple tuning systems against JI reference intervals.
   * Returns a comparison table with cent errors for each interval in each tuning.
   *
   * @param tunings - Array of tuning systems to compare.
   * @param intervals - JI ratios to compare (e.g., [[3,2], [5,4]] = P5 and M3).
   */
  static compare(tunings: TuningSystem[], intervals: [number, number][]): ComparisonTable {
    const entries: ComparisonEntry[][] = tunings.map(tuning => {
      return intervals.map(([num, den]) => {
        const justCents = 1200 * Math.log2(num / den);
        // The closest step of this tuning to the JI interval, found by walking its steps
        // (works for EDOs, JI, cent tables and non-octave tunings alike)
        const tuningCents = tuning.getInterval(closestStep(tuning, justCents)).cents;
        return {
          tuningName: tuning.name,
          intervalRatio: [num, den] as [number, number],
          tuningCents,
          justCents,
          errorCents: Math.abs(tuningCents - justCents),
        };
      });
    });
    return { intervals, entries };
  }

  /**
   * Detects wolf intervals: single instances of an interval that stand out from the other
   * intervals of the same number of steps. For each step count k, the typical size (median
   * over all starting degrees) is taken as meant to be the nearest consonance (6/5, 5/4,
   * 4/3, 3/2, 8/5, 5/3) when within `threshold` of it; an instance more than `threshold`
   * away from that consonance is a wolf (Pythagorean tuning's G#–Eb fifth). Equal
   * temperaments have none.
   *
   * @param tuning - The tuning system to audit.
   * @param threshold - Error threshold in cents (default 20: Pythagorean tuning's wolf fifth
   *   is a Pythagorean comma, 23.5¢, short).
   * @returns Array of { interval (step count), from (starting step), errorCents (from the consonance) }.
   */
  static detectWolfIntervals(
    tuning: TuningSystem,
    threshold = 20
  ): {
    /** Size of the interval in steps of the tuning. */
    interval: number;
    /** Step the out-of-tune interval starts on. */
    from: number;
    /** Distance from the just consonance it stands for, in cents. */
    errorCents: number;
  }[] {
    const wolves: { interval: number; from: number; errorCents: number }[] = [];
    const period = tuning.octaveSteps;
    const consonances = [[6, 5], [5, 4], [4, 3], [3, 2], [8, 5], [5, 3]].map(([n, d]) => 1200 * Math.log2(n / d));
    const cents = (s: number) => tuning.getInterval(s).cents;

    for (let k = 1; k < period; k++) {
      const sizes = Array.from({ length: period }, (_, i) => cents(i + k) - cents(i));
      const median = [...sizes].sort((a, b) => a - b)[Math.floor(period / 2)];
      const target = consonances.reduce((best, c) => (Math.abs(c - median) < Math.abs(best - median) ? c : best));
      if (Math.abs(target - median) > threshold) continue; // this step count is not a consonance
      sizes.forEach((size, from) => {
        const error = Math.abs(size - target);
        if (error > threshold) wolves.push({ interval: k, from, errorCents: error });
      });
    }
    return wolves;
  }

  /**
   * Returns definitions of common musical commas, with cents to three decimals.
   * `ratioText` is exact. The Mercator comma (3^53/2^84) is beyond Number precision:
   * its `ratio` is the nearest doubles and its cents are computed from the exponents.
   */
  static getCommas(): {
    /** `'Syntonic comma'`, `'Pythagorean comma'`, `'Schisma'`… */
    name: string;
    /** As `[numerator, denominator]` (may lose precision for very large ratios; see `ratioText`). */
    ratio: [number, number];
    /** Exact ratio as text: `'81/80'`. */
    ratioText: string;
    /** Size in cents, to three decimals. */
    cents: number;
  }[] {
    const round3 = (c: number) => Math.round(c * 1000) / 1000;
    const comma = (name: string, n: number, d: number) =>
      ({ name, ratio: [n, d] as [number, number], ratioText: `${n}/${d}`, cents: round3(1200 * Math.log2(n / d)) });
    return [
      comma('Syntonic comma', 81, 80),
      comma('Pythagorean comma', 531441, 524288),
      comma('Schisma', 32805, 32768),
      comma('Diesis (diminished)', 128, 125),
      comma('Diaschisma', 2048, 2025),
      comma('Septimal comma', 64, 63),
      { name: 'Mercator comma', ratio: [3 ** 53, 2 ** 84], ratioText: '3^53/2^84', cents: round3(1200 * (53 * Math.log2(3) - 84)) },
    ];
  }

  /**
   * Finds unison vectors for a JustIntonation tuning: the known commas by which two sizes
   * of the same interval (same number of steps, different starting notes) differ. In 5-limit
   * JI the fifths 3/2 and 40/27, or the whole tones 9/8 and 10/9, differ by 81/80.
   */
  static getUnisonVectors(tuning: JustIntonation): [number, number][] {
    const commas = this.getCommas();
    const n = tuning.octaveSteps;
    const cents = (s: number) => tuning.getInterval(s).cents;
    // differences between sizes of the same k-step interval
    const gaps = new Set<number>();
    for (let k = 1; k < n; k++) {
      const sizes = Array.from({ length: n }, (_, i) => cents(i + k) - cents(i));
      for (const a of sizes) for (const b of sizes) if (a > b) gaps.add(a - b);
    }
    return commas
      .filter(c => [...gaps].some(g => Math.abs(g - c.cents) < 0.5))
      .map(c => c.ratio);
  }
}

/**
 * Maps a JI ratio to the closest step in an EDO.
 * @param jiRatio - [numerator, denominator] ratio.
 * @param edoSize - Number of steps per octave in the target EDO.
 */
export function mapJItoEDO(jiRatio: [number, number], edoSize: number): {
  /** Closest step of the EDO. */
  step: number;
  /** Absolute distance from the just interval, in cents. */
  errorCents: number;
} {
  const justCents = 1200 * Math.log2(jiRatio[0] / jiRatio[1]);
  const stepSize = 1200 / edoSize;
  const step = Math.round(justCents / stepSize);
  const tuningCents = step * stepSize;
  return { step, errorCents: Math.abs(tuningCents - justCents) };
}

/**
 * Finds the smallest EDO that approximates all given JI ratios within a cent threshold.
 * @param jiRatios - Array of [numerator, denominator] ratios.
 * @param maxSize - Maximum EDO size to search (default 72).
 */
export function bestEDOFor(jiRatios: [number, number][], maxSize = 72): {
  /** Number of equal divisions of the octave. */
  size: number;
  /** Sum of the absolute errors of all the ratios, in cents. */
  totalError: number;
} {
  let bestSize = 12;
  let bestError = Infinity;

  for (let size = 5; size <= maxSize; size++) {
    const totalError = jiRatios.reduce((sum, ratio) => {
      const { errorCents } = mapJItoEDO(ratio, size);
      return sum + errorCents;
    }, 0);

    if (totalError < bestError) {
      bestError = totalError;
      bestSize = size;
    }
  }
  return { size: bestSize, totalError: bestError };
}
