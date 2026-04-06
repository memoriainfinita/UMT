import { Cents, Ratio } from './types';

export class Interval {
  /** Create an interval from a value in cents. Prefer `fromCents()` or `fromRatio()` for clarity. */
  constructor(public cents: Cents) {}

  /**
   * Create an interval from a frequency ratio.
   * @param ratio - Integer fraction `[numerator, denominator]` or decimal (e.g. `[3,2]` or `1.5` for a perfect fifth).
   * @throws if the ratio is zero, negative, or not finite.
   */
  static fromRatio(ratio: Ratio): Interval {
    const r = Array.isArray(ratio) ? ratio[0] / ratio[1] : ratio;
    if (!isFinite(r) || r <= 0) {
      throw new RangeError(`Interval.fromRatio: invalid ratio ${JSON.stringify(ratio)} — must be a positive finite number.`);
    }
    return new Interval(1200 * Math.log2(r));
  }

  /** Create an interval from a value in cents. */
  static fromCents(cents: Cents): Interval {
    return new Interval(cents);
  }

  /** The interval as a decimal frequency ratio (e.g. 1.5 for a perfect fifth). */
  get ratio(): number {
    return Math.pow(2, this.cents / 1200);
  }

  /** The interval in semitones (cents / 100). May be fractional for microtonal intervals. */
  get semitones(): number {
    return this.cents / 100;
  }

  /** Add two intervals (stack them). */
  add(other: Interval): Interval {
    return new Interval(this.cents + other.cents);
  }

  /** Subtract an interval (remove it from this one). */
  subtract(other: Interval): Interval {
    return new Interval(this.cents - other.cents);
  }

  /** Scale the interval by a numeric factor. */
  multiply(factor: number): Interval {
    return new Interval(this.cents * factor);
  }

  /** Divide the interval by a numeric factor. */
  divide(factor: number): Interval {
    if (factor === 0) throw new RangeError('Interval.divide: factor cannot be zero.');
    return new Interval(this.cents / factor);
  }

  /**
   * Return the descending (negative) form of this interval.
   * Useful for voice leading and downward transposition.
   */
  negate(): Interval {
    return new Interval(-this.cents);
  }

  /**
   * Reduce the interval to a single octave (0–1200 cents).
   * Useful for pitch-class equivalence and scale analysis.
   */
  inOctave(): Interval {
    return new Interval(((this.cents % 1200) + 1200) % 1200);
  }

  /**
   * Compare two intervals within a tolerance.
   * @param other - The interval to compare against.
   * @param toleranceCents - Maximum allowed difference in cents (default: 1¢).
   */
  equals(other: Interval, toleranceCents: number = 1): boolean {
    return Math.abs(this.cents - other.cents) <= toleranceCents;
  }
}
