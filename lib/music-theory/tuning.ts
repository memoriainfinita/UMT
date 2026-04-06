import { Interval } from './interval';
import { Hertz } from './types';

export abstract class TuningSystem {
  constructor(
    public name: string,
    public baseFrequency: Hertz = 440 // Default A4 = 440Hz
  ) {}

  // Get the frequency of a note given its steps from the base frequency
  abstract getFrequency(steps: number): Hertz;
  
  // Get the interval from the base note
  abstract getInterval(steps: number): Interval;

  // Number of steps that make up a period (usually an octave, 2:1)
  abstract get octaveSteps(): number;

  // Formats the step into a human-readable note name
  getNoteName(step: number): string {
    return `Step ${step}`;
  }

  // Converts a standard 12-TET step (where 0 = A4) to the equivalent step in this tuning
  getStepFromStandard(standardStep: number): number {
    return standardStep;
  }
}

// Equal Division of the Octave (e.g., 12-TET, 24-TET, 31-TET)
export class EDO extends TuningSystem {
  constructor(public divisions: number, baseFrequency: Hertz = 440) {
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

  getStepFromStandard(standardStep: number): number {
    return Math.round((standardStep * this.divisions) / 12);
  }
}

// Just Intonation based on a set of ratios within an octave
export class JustIntonation extends TuningSystem {
  public intervals: Interval[];

  constructor(name: string, ratios: (number | [number, number])[], baseFrequency: Hertz = 440) {
    super(name, baseFrequency);
    this.intervals = ratios.map(r => Interval.fromRatio(r));
    if (this.intervals.length === 0 || this.intervals[0].cents !== 0) {
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
}

// Custom Tuning based on exact cents (e.g., historical temperaments like Werckmeister)
export class CentTuning extends TuningSystem {
  constructor(name: string, public cents: number[], baseFrequency: Hertz = 440) {
    super(name, baseFrequency);
    if (this.cents[0] !== 0) this.cents.unshift(0);
  }

  getInterval(steps: number): Interval {
    const octave = Math.floor(steps / this.cents.length);
    const degree = ((steps % this.cents.length) + this.cents.length) % this.cents.length;
    // Octave is always 1200 cents (2:1), regardless of the last value in the array.
    // Historical temperaments define pitch classes within the octave, not the octave itself.
    return new Interval(this.cents[degree] + octave * 1200);
  }

  getFrequency(steps: number): Hertz {
    return this.baseFrequency * this.getInterval(steps).ratio;
  }

  get octaveSteps(): number {
    return this.cents.length;
  }
}

// Non-octave tuning (e.g., Bohlen-Pierce which repeats at 3:1 ratio instead of 2:1)
export class NonOctaveTuning extends TuningSystem {
  constructor(
    name: string, 
    public stepsPerPeriod: number, 
    public periodRatio: number, // e.g., 3 for tritave
    baseFrequency: Hertz = 440
  ) {
    super(name, baseFrequency);
  }

  getInterval(steps: number): Interval {
    const periodCents = 1200 * Math.log2(this.periodRatio);
    return new Interval((steps * periodCents) / this.stepsPerPeriod);
  }

  getFrequency(steps: number): Hertz {
    return this.baseFrequency * this.getInterval(steps).ratio;
  }

  get octaveSteps(): number {
    return this.stepsPerPeriod; // Steps per period (not necessarily an octave)
  }
}
