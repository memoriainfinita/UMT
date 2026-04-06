import { Interval } from './interval';
import { Hertz, Ratio } from './types';
import { get12TETName } from './utils';

/**
 * Abstract base class for all tuning systems.
 *
 * The coordinate system is **steps from A4 = 0**. A4 is the reference pitch (default 440 Hz).
 * Steps can be negative (below A4) or positive (above A4), and span multiple octaves.
 *
 * All concrete subclasses must implement `getFrequency`, `getInterval`, and `octaveSteps`.
 */
export abstract class TuningSystem {
  constructor(
    public name: string,
    /** Reference frequency for step 0 (A4). Default: 440 Hz. */
    public baseFrequency: Hertz = 440
  ) {}

  /** Returns the frequency in Hz for a given step offset from A4. */
  abstract getFrequency(steps: number): Hertz;

  /** Returns the `Interval` from A4 to the given step. */
  abstract getInterval(steps: number): Interval;

  /**
   * Number of steps that constitute one period (usually one octave, 2:1).
   * For non-octave tunings (e.g. Bohlen-Pierce) this is steps per tritave.
   */
  abstract get octaveSteps(): number;

  /**
   * Returns a human-readable note name for the given step.
   * Subclasses should override this when meaningful names are available.
   * Default: `"Step N"`.
   */
  getNoteName(step: number): string {
    return `Step ${step}`;
  }

  /**
   * Converts a standard 12-TET step (A4 = 0) to the nearest equivalent step in this tuning.
   *
   * **Contract:** the default implementation is the identity function, which is only correct
   * when this tuning has exactly 12 steps per octave (same grid as 12-TET).
   * Subclasses with a different step count MUST override this method.
   */
  getStepFromStandard(standardStep: number): number {
    return standardStep;
  }
}

/**
 * Equal Division of the Octave — divides the octave into `divisions` equal steps.
 * Examples: 12-TET (standard), 24-TET (quarter-tone), 31-TET, 53-TET.
 */
export class EDO extends TuningSystem {
  /**
   * @param divisions - Number of equal steps per octave. Must be a positive integer.
   */
  constructor(public divisions: number, baseFrequency: Hertz = 440) {
    if (!Number.isInteger(divisions) || divisions <= 0) {
      throw new RangeError(`EDO: divisions must be a positive integer, got ${divisions}.`);
    }
    super(`${divisions}-TET`, baseFrequency);
  }

  getInterval(steps: number): Interval {
    return Interval.fromCents((steps * 1200) / this.divisions);
  }

  getFrequency(steps: number): Hertz {
    return this.baseFrequency * this.getInterval(steps).ratio;
  }

  get octaveSteps(): number {
    return this.divisions;
  }

  /** Maps a 12-TET step to the nearest step in this EDO via linear scaling. */
  getStepFromStandard(standardStep: number): number {
    return Math.round((standardStep * this.divisions) / 12);
  }

  /**
   * Returns a note name for the given step.
   * For 12-TET, uses standard note names (e.g. "C#4", "Bb3").
   * For other EDOs, falls back to `"Step N"`.
   */
  getNoteName(step: number): string {
    if (this.divisions === 12) return get12TETName(step);
    return `Step ${step}`;
  }
}

/**
 * Just Intonation — pitch classes defined by exact frequency ratios within one octave.
 * The octave (2:1) is implied and not included in the ratios array.
 *
 * Example: 5-limit JI major scale
 * ```ts
 * new JustIntonation('5-limit Major', [[9,8],[5,4],[4,3],[3,2],[5,3],[15,8]])
 * ```
 */
export class JustIntonation extends TuningSystem {
  /** Resolved interval objects including the implicit unison at index 0. */
  public intervals: Interval[];

  /**
   * @param ratios - Frequency ratios for the pitch classes above the tonic (unison excluded).
   *   At least one ratio is required. The unison (1:1) is prepended automatically if absent.
   */
  constructor(name: string, ratios: Ratio[], baseFrequency: Hertz = 440) {
    if (ratios.length === 0) {
      throw new RangeError(`JustIntonation "${name}": ratios array must not be empty.`);
    }
    super(name, baseFrequency);
    this.intervals = ratios.map(r => Interval.fromRatio(r));
    if (this.intervals[0].cents !== 0) {
      this.intervals.unshift(Interval.fromRatio(1));
    }
  }

  getInterval(steps: number): Interval {
    const octave = Math.floor(steps / this.intervals.length);
    const degree = ((steps % this.intervals.length) + this.intervals.length) % this.intervals.length;
    return new Interval(this.intervals[degree].cents + octave * 1200);
  }

  getFrequency(steps: number): Hertz {
    return this.baseFrequency * this.getInterval(steps).ratio;
  }

  get octaveSteps(): number {
    return this.intervals.length;
  }

  /**
   * Maps a 12-TET step to this JI tuning's nearest step index by cents proximity.
   * For 12-pitch-class JI the mapping is exact (identity).
   * For other sizes, each 12-TET semitone maps to the JI pitch class closest in cents
   * (100¢ per semitone approximation). If the JI scale lacks a chromatic pitch class
   * (e.g. a diatonic 7-note scale), adjacent semitones may collapse to the same step.
   */
  getStepFromStandard(standardStep: number): number {
    if (this.intervals.length === 12) return standardStep;

    const octaves = Math.floor(standardStep / 12);
    const pc12 = ((standardStep % 12) + 12) % 12;
    const targetCents = pc12 * 100;

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.intervals.length; i++) {
      const dist = Math.abs(this.intervals[i].cents - targetCents);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx + octaves * this.intervals.length;
  }
}

/**
 * Cent-based tuning — pitch classes defined by exact cent offsets within one octave.
 * Intended for historical temperaments (Werckmeister, Kirnberger, meantone, etc.)
 * and any tuning system defined by cent deviations from equal temperament.
 *
 * The octave is always treated as exactly 1200 cents (2:1), regardless of the last
 * value in the array. Historical temperaments define pitch classes, not the octave itself.
 *
 * Example: Werckmeister III (approximate)
 * ```ts
 * new CentTuning('Werckmeister III', [90, 192, 294, 390, 498, 588, 696, 792, 888, 996, 1092])
 * ```
 */
export class CentTuning extends TuningSystem {
  /**
   * @param cents - Cent values for each pitch class above the tonic (unison excluded).
   *   The unison (0¢) is prepended automatically if absent.
   *   At least one value is required.
   */
  constructor(name: string, public cents: number[], baseFrequency: Hertz = 440) {
    if (cents.length === 0) {
      throw new RangeError(`CentTuning "${name}": cents array must not be empty.`);
    }
    super(name, baseFrequency);
    if (this.cents[0] !== 0) this.cents.unshift(0);
  }

  getInterval(steps: number): Interval {
    const octave = Math.floor(steps / this.cents.length);
    const degree = ((steps % this.cents.length) + this.cents.length) % this.cents.length;
    return new Interval(this.cents[degree] + octave * 1200);
  }

  getFrequency(steps: number): Hertz {
    return this.baseFrequency * this.getInterval(steps).ratio;
  }

  get octaveSteps(): number {
    return this.cents.length;
  }

  /**
   * Maps a 12-TET step to this tuning's nearest step index.
   * Only correct when this tuning has exactly 12 pitch classes per octave.
   * For other sizes the mapping is approximate.
   */
  getStepFromStandard(standardStep: number): number {
    if (this.cents.length === 12) return standardStep;
    return Math.round((standardStep * this.cents.length) / 12);
  }
}

/**
 * Non-octave tuning — the period of repetition is not the octave (2:1) but an arbitrary ratio.
 * The canonical example is Bohlen-Pierce, which repeats at the tritave (3:1) with 13 equal steps.
 *
 * Example: Bohlen-Pierce
 * ```ts
 * new NonOctaveTuning('Bohlen-Pierce', 13, 3)
 * ```
 */
export class NonOctaveTuning extends TuningSystem {
  /**
   * @param stepsPerPeriod - Number of equal steps per period. Must be a positive integer.
   * @param periodRatio - The frequency ratio of one period (e.g. `3` for tritave). Must be > 1.
   */
  constructor(
    name: string,
    public stepsPerPeriod: number,
    public periodRatio: number,
    baseFrequency: Hertz = 440
  ) {
    if (!Number.isInteger(stepsPerPeriod) || stepsPerPeriod <= 0) {
      throw new RangeError(`NonOctaveTuning "${name}": stepsPerPeriod must be a positive integer, got ${stepsPerPeriod}.`);
    }
    if (periodRatio <= 1) {
      throw new RangeError(`NonOctaveTuning "${name}": periodRatio must be > 1, got ${periodRatio}.`);
    }
    super(name, baseFrequency);
  }

  getInterval(steps: number): Interval {
    const periodCents = 1200 * Math.log2(this.periodRatio);
    return new Interval((steps * periodCents) / this.stepsPerPeriod);
  }

  getFrequency(steps: number): Hertz {
    return this.baseFrequency * this.getInterval(steps).ratio;
  }

  /** Steps per period (not an octave — the period is `periodRatio : 1`). */
  get octaveSteps(): number {
    return this.stepsPerPeriod;
  }

  /**
   * Maps a 12-TET step to the nearest step in this non-octave tuning.
   *
   * Note: this is a proportional approximation and has limited musical meaning,
   * since the tuning's period is not the octave. Chord/scale formulas derived
   * from 12-TET will not translate correctly to non-octave tunings.
   */
  getStepFromStandard(standardStep: number): number {
    return Math.round((standardStep * this.stepsPerPeriod) / 12);
  }
}

/** Standard 12-TET singleton — used as the default tuning throughout the library. */
export const TET12 = new EDO(12);
