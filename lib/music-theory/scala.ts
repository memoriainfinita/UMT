import { TuningSystem } from './tuning';
import { Interval } from './interval';

/**
 * A tuning system loaded from a Scala (.scl) file.
 *
 * Pitches are stored as cent offsets from the root (step 0 = 0¢, always implied).
 * The last entry in the `.scl` file must be the period (typically 1200¢ = one octave);
 * this value is used to compute frequencies for steps outside the first period.
 *
 * Use `parseScala()` to construct from raw `.scl` text.
 * @category Microtonal / Xenharmonic
 */
export class ScalaTuning extends TuningSystem {
  /** Cent offsets from the root, with 0¢ prepended. Length = `octaveSteps + 1`. */
  cents: number[];
  /** Number of steps per period (= number of pitches in the `.scl` file, excluding the implied root). */
  octaveSteps: number;

  /**
   * @param name - Scale name (first non-comment line of the `.scl` file).
   * @param cents - Cent offsets for each pitch, **excluding** the implied 0¢ root but
   *   **including** the period as the last entry (e.g. `[…, 1200.0]`).
   * @param baseFrequency - Frequency of step 0 in Hz (default: 440 Hz = A4).
   */
  constructor(name: string, cents: number[], baseFrequency = 440) {
    super(name, baseFrequency);
    this.octaveSteps = cents.length;
    this.cents = [0, ...cents]; // Add the root
  }

  /** Frequency in Hz for the given step offset from the base pitch. */
  getFrequency(stepsFromBase: number): number {
    const octaves = Math.floor(stepsFromBase / this.octaveSteps);
    let degree = stepsFromBase % this.octaveSteps;
    if (degree < 0) degree += this.octaveSteps;

    const octaveCents = this.cents[this.cents.length - 1]; // Usually the last note is the octave (e.g., 1200)
    const totalCents = (octaves * octaveCents) + this.cents[degree];

    return this.baseFrequency * Math.pow(2, totalCents / 1200);
  }

  /** Interval from step 0 to the given step, in cents. */
  getInterval(steps: number): Interval {
    const octaves = Math.floor(steps / this.octaveSteps);
    let degree = steps % this.octaveSteps;
    if (degree < 0) degree += this.octaveSteps;

    const octaveCents = this.cents[this.cents.length - 1];
    const totalCents = (octaves * octaveCents) + this.cents[degree];
    return Interval.fromCents(totalCents);
  }

  /**
   * Returns a generic name for the given step (e.g. `"Step 3"`).
   * Scala files have no standard note names, so no enharmonic spelling is possible.
   */
  getNoteName(stepsFromBase: number): string {
    return `Step ${stepsFromBase}`;
  }

}

/**
 * Parses a Scala (.scl) file format string and returns a ScalaTuning object.
 * Following the Scala format: lines starting with `!` are comments; the first other line
 * is the description, which may be empty; then the number of notes; then one pitch per line.
 * @throws if the note count is missing, or there are fewer pitches than it says.
 * @category Microtonal / Xenharmonic
 */
export function parseScala(sclText: string, baseFrequency = 440): ScalaTuning {
  const all = sclText.split(/\r?\n/).map(l => l.trim()).filter(l => !l.startsWith('!'));
  if (all.length < 2) throw new Error("Invalid Scala file");

  // the description line is kept even when empty; after it, blank lines are skipped
  const name = all[0];
  const lines = [name, ...all.slice(1).filter(l => l.length > 0)];
  const numNotes = parseInt(lines[1] ?? '', 10);
  if (isNaN(numNotes) || numNotes <= 0) {
    throw new Error(`parseScala: expected a positive note count after the description, got "${lines[1]}".`);
  }
  if (lines.length - 2 < numNotes) {
    throw new Error(`parseScala: ${numNotes} notes declared, ${lines.length - 2} found.`);
  }
  const cents: number[] = [];

  for (let i = 0; i < numNotes; i++) {
    const rawLine = lines[2 + i];
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
