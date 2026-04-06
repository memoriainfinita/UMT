import { Cents, Ratio } from './types';

export class Interval {
  constructor(public cents: Cents) {}

  static fromRatio(ratio: Ratio): Interval {
    const r = Array.isArray(ratio) ? ratio[0] / ratio[1] : ratio;
    return new Interval(1200 * Math.log2(r));
  }

  static fromCents(cents: Cents): Interval {
    return new Interval(cents);
  }

  get ratio(): number {
    return Math.pow(2, this.cents / 1200);
  }

  add(other: Interval): Interval {
    return new Interval(this.cents + other.cents);
  }

  subtract(other: Interval): Interval {
    return new Interval(this.cents - other.cents);
  }
  
  multiply(factor: number): Interval {
    return new Interval(this.cents * factor);
  }
}
