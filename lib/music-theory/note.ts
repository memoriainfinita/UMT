import { TuningSystem, EDO } from './tuning';
import { Hertz } from './types';
import { Interval } from './interval';
import { get12TETName } from './utils';

/**
 * A single pitch in a given tuning system.
 *
 * Position is stored as `stepsFromBase`, an integer offset from A4 (step 0) within the tuning.
 * The same step number means different frequencies in different tuning systems.
 */
export class Note {
  /**
   * @param tuningSystem - The tuning system this note belongs to.
   * @param stepsFromBase - Steps from A4 (= 0). Can be negative (below A4) or positive (above).
   * @param _name - Optional explicit name. When provided, overrides the computed name from
   *   the tuning system. Used by the parser to preserve the original notation (e.g. "Db" vs "C#").
   */
  constructor(
    public tuningSystem: TuningSystem,
    public stepsFromBase: number,
    private _name?: string
  ) {}

  /** The note name using sharps by default. For flats use `getName({ preferFlats: true })`. */
  get name(): string {
    return this.getName();
  }

  /**
   * Returns the note name, optionally preferring flat accidentals over sharps.
   * If an explicit name was set at construction, it is returned as-is (no re-spelling).
   */
  getName(options?: { preferFlats?: boolean }): string {
    if (this._name) return this._name;
    if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) {
      return get12TETName(this.stepsFromBase, options?.preferFlats);
    }
    return this.tuningSystem.getNoteName(this.stepsFromBase);
  }

  /** Frequency of this note in Hz. */
  get frequency(): Hertz {
    return this.tuningSystem.getFrequency(this.stepsFromBase);
  }

  /** Interval from A4 to this note in cents. */
  get centsFromBase(): number {
    return this.tuningSystem.getInterval(this.stepsFromBase).cents;
  }

  /**
   * Step position within one period (0 to `octaveSteps - 1`).
   * Equivalent to pitch class in 12-TET (0 = A, 3 = C, etc.).
   */
  get pitchClass(): number {
    const os = this.tuningSystem.octaveSteps;
    return ((this.stepsFromBase % os) + os) % os;
  }

  /**
   * Octave number relative to A4.
   * A4–G#4 = octave 0, A5–G#5 = octave 1, A3–G#3 = octave −1.
   */
  get octave(): number {
    return Math.floor(this.stepsFromBase / this.tuningSystem.octaveSteps);
  }

  /** Return a new note transposed by the given number of steps in the same tuning system. */
  transpose(steps: number): Note {
    return new Note(this.tuningSystem, this.stepsFromBase + steps);
  }

  /**
   * Returns the interval from this note to `other`.
   * Works across different tuning systems by comparing frequencies.
   * @throws if either note's frequency is not a positive finite number.
   */
  getIntervalTo(other: Note): Interval {
    const freq1 = this.frequency;
    const freq2 = other.frequency;
    if (!isFinite(freq1) || freq1 <= 0) {
      throw new RangeError(`Note.getIntervalTo: source note has invalid frequency ${freq1}.`);
    }
    if (!isFinite(freq2) || freq2 <= 0) {
      throw new RangeError(`Note.getIntervalTo: target note has invalid frequency ${freq2}.`);
    }
    return Interval.fromCents(1200 * Math.log2(freq2 / freq1));
  }

  /**
   * Returns true if this note has the same pitch as `other`, within a tolerance.
   * @param toleranceCents - Maximum allowed frequency difference in cents (default: 1¢).
   */
  equals(other: Note, toleranceCents: number = 1): boolean {
    return this.getIntervalTo(other).equals(Interval.fromCents(0), toleranceCents);
  }
}
