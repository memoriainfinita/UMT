import { TuningSystem } from './tuning';
import { Interval } from './interval';

export class ScalaTuning extends TuningSystem {
  cents: number[]; // 0 is always 0 cents (implied root)
  octaveSteps: number;

  constructor(name: string, cents: number[], baseFrequency = 440) {
    super(name, baseFrequency);
    this.octaveSteps = cents.length;
    this.cents = [0, ...cents]; // Add the root
  }

  getFrequency(stepsFromBase: number): number {
    const octaves = Math.floor(stepsFromBase / this.octaveSteps);
    let degree = stepsFromBase % this.octaveSteps;
    if (degree < 0) degree += this.octaveSteps;

    const octaveCents = this.cents[this.cents.length - 1]; // Usually the last note is the octave (e.g., 1200)
    const totalCents = (octaves * octaveCents) + this.cents[degree];

    return this.baseFrequency * Math.pow(2, totalCents / 1200);
  }

  getInterval(steps: number): Interval {
    const octaves = Math.floor(steps / this.octaveSteps);
    let degree = steps % this.octaveSteps;
    if (degree < 0) degree += this.octaveSteps;

    const octaveCents = this.cents[this.cents.length - 1];
    const totalCents = (octaves * octaveCents) + this.cents[degree];
    return Interval.fromCents(totalCents);
  }

  getNoteName(stepsFromBase: number): string {
    return `Step ${stepsFromBase}`;
  }

  getStepFromStandard(standardSteps: number): number {
    // A rough approximation for UI compatibility
    return Math.round(standardSteps * (this.octaveSteps / 12));
  }
}

/**
 * Parses a Scala (.scl) file format string and returns a ScalaTuning object.
 */
export function parseScala(sclText: string, baseFrequency = 440): ScalaTuning {
  const lines = sclText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('!'));
  if (lines.length < 2) throw new Error("Invalid Scala file");

  const name = lines[0];
  const numNotes = parseInt(lines[1], 10);
  if (isNaN(numNotes) || numNotes <= 0) {
    throw new Error(`parseScala: expected a positive note count on line 2, got "${lines[1]}".`);
  }
  const cents: number[] = [];

  for (let i = 0; i < numNotes; i++) {
    const rawLine = lines[2 + i];
    if (!rawLine) break;
    const val = rawLine.split(/\s/)[0]; // strip inline comments (e.g. "3/2 perfect fifth")

    if (val.includes('.')) {
      // It's a cents value
      cents.push(parseFloat(val));
    } else if (val.includes('/')) {
      // It's a ratio
      const [num, den] = val.split('/').map(Number);
      cents.push(1200 * Math.log2(num / den));
    } else {
      // It's an integer ratio (e.g., "2" means "2/1")
      cents.push(1200 * Math.log2(parseInt(val, 10)));
    }
  }

  return new ScalaTuning(name, cents, baseFrequency);
}
