import { TuningSystem } from './tuning';
import { Hertz } from './types';
import { Interval } from './interval';
import { get12TETName } from './utils';

export class Note {
  constructor(
    public tuningSystem: TuningSystem,
    public stepsFromBase: number,
    private _name?: string
  ) {}

  get name(): string {
    return this.getName();
  }

  getName(options?: { preferFlats?: boolean }): string {
    if (this._name) return this._name;
    if (this.tuningSystem.name === '12-TET') {
      return get12TETName(this.stepsFromBase, options?.preferFlats);
    }
    return this.tuningSystem.getNoteName(this.stepsFromBase);
  }

  get frequency(): Hertz {
    return this.tuningSystem.getFrequency(this.stepsFromBase);
  }
  
  get centsFromBase(): number {
    return this.tuningSystem.getInterval(this.stepsFromBase).cents;
  }

  transpose(steps: number): Note {
    return new Note(this.tuningSystem, this.stepsFromBase + steps);
  }

  getIntervalTo(other: Note): Interval {
    const freq1 = this.frequency;
    const freq2 = other.frequency;
    if (freq1 <= 0 || freq2 <= 0) return Interval.fromCents(0);
    const centsDiff = 1200 * Math.log2(freq2 / freq1);
    return Interval.fromCents(centsDiff);
  }
}
