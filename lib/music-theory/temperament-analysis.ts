/**
 * Temperament analysis and comparison tools.
 * Compares tuning systems against just intervals, finds wolf intervals,
 * and provides common comma definitions.
 */
import { TuningSystem, JustIntonation } from './tuning';

export interface ComparisonEntry {
  tuningName: string;
  intervalRatio: [number, number];
  tuningCents: number;
  justCents: number;
  errorCents: number;
}

export interface ComparisonTable {
  intervals: [number, number][];
  entries: ComparisonEntry[][];
}

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
        // Find the closest step in this tuning to the JI interval
        const approxSteps = Math.round(justCents / (1200 / tuning.octaveSteps));
        const tuningCents = tuning.getInterval(approxSteps).cents;
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
   * Detects wolf intervals in a tuning system:
   * intervals that deviate from their JI target by more than `threshold` cents.
   *
   * @param tuning - The tuning system to audit.
   * @param threshold - Error threshold in cents (default 25).
   * @returns Array of { interval (step count), errorCents }.
   */
  static detectWolfIntervals(
    tuning: TuningSystem,
    threshold = 25
  ): { interval: number; errorCents: number }[] {
    const wolves: { interval: number; errorCents: number }[] = [];
    const oct = tuning.octaveSteps;

    // Check all intervals within one octave
    for (let step = 1; step < oct; step++) {
      const tuningCents = tuning.getInterval(step).cents;
      // Approximate JI target: nearest multiple of 100 cents (12-TET reference)
      const justApprox = Math.round(tuningCents / 100) * 100;
      const error = Math.abs(tuningCents - justApprox);
      if (error > threshold) {
        wolves.push({ interval: step, errorCents: error });
      }
    }
    return wolves;
  }

  /**
   * Returns definitions of common musical commas.
   */
  static getCommas(): { name: string; ratio: [number, number]; cents: number }[] {
    return [
      { name: 'Syntonic comma',    ratio: [81, 80],              cents: 21.506 },
      { name: 'Pythagorean comma', ratio: [531441, 524288],      cents: 23.460 },
      { name: 'Schisma',           ratio: [32805, 32768],        cents: 1.954 },
      { name: 'Diesis (diminished)', ratio: [128, 125],          cents: 41.059 },
      { name: 'Diaschisma',        ratio: [2048, 2025],          cents: 19.553 },
      { name: 'Septimal comma',    ratio: [64, 63],              cents: 27.264 },
      { name: 'Mercator comma',    ratio: [19383245667680019, 19342813113834066795298816], cents: 3.615 },
    ];
  }

  /**
   * Finds unison vectors for a JustIntonation tuning:
   * small intervals that represent the comma pumps in the tuning.
   */
  static getUnisonVectors(tuning: JustIntonation): [number, number][] {
    const commas = this.getCommas();
    const result: [number, number][] = [];

    for (const comma of commas) {
      const commaCents = comma.cents;
      // Check if any step in the tuning approximates this comma
      for (let step = 1; step <= 2; step++) {
        const tuningCents = tuning.getInterval(step).cents;
        if (Math.abs(tuningCents - commaCents) < 10) {
          result.push(comma.ratio);
          break;
        }
      }
    }
    return result;
  }
}

/**
 * Maps a JI ratio to the closest step in an EDO.
 * @param jiRatio - [numerator, denominator] ratio.
 * @param edoSize - Number of steps per octave in the target EDO.
 */
export function mapJItoEDO(jiRatio: [number, number], edoSize: number): { step: number; errorCents: number } {
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
export function bestEDOFor(jiRatios: [number, number][], maxSize = 72): { size: number; totalError: number } {
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
