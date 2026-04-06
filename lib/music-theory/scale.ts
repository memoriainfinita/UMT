import { TuningSystem, EDO } from './tuning';
import { Note } from './note';
import { usesFlats } from './utils';

/**
 * A scale: a root pitch plus an ordered pattern of step intervals within a tuning system.
 *
 * `stepPattern` defines the intervals between consecutive degrees in tuning steps
 * (e.g. `[2, 2, 1, 2, 2, 2, 1]` for major in 12-TET). The pattern is relative —
 * the same pattern at a different `rootStep` gives the same scale type in a different key.
 */
export class Scale {
  /**
   * @param name - Human-readable scale name (e.g. "C Major", "D Dorian").
   * @param tuningSystem - The tuning system this scale operates in.
   * @param rootStep - Step offset of the root note from A4 (= 0).
   * @param stepPattern - Intervals between consecutive scale degrees, in tuning steps.
   *   Must be non-empty with all values > 0.
   */
  constructor(
    public name: string,
    public tuningSystem: TuningSystem,
    public rootStep: number,
    public readonly stepPattern: readonly number[]
  ) {
    if (stepPattern.length === 0) {
      throw new RangeError(`Scale "${name}": stepPattern must not be empty.`);
    }
    if (stepPattern.some(s => s <= 0)) {
      throw new RangeError(`Scale "${name}": all step values must be positive.`);
    }
  }

  /**
   * Returns the notes of the scale across the given number of octaves.
   *
   * The result always includes one extra note at the end: the root repeated one period
   * above the last octave (e.g. 8 notes for a 7-note scale over 1 octave).
   * This matches standard notation and is useful for display.
   *
   * @param octaves - Number of octaves to span (default: 1).
   */
  getNotes(octaves: number = 1): Note[] {
    const notes: Note[] = [];
    let currentStep = this.rootStep;

    // Use the flat spelling of the root to determine whether the scale prefers flats.
    // Using sharp spelling would cause Bb-rooted scales to incorrectly use sharps.
    const rootFlatName = new Note(this.tuningSystem, this.rootStep).getName({ preferFlats: true });
    const preferFlats = usesFlats(rootFlatName);

    const createNote = (step: number) => {
      const n = new Note(this.tuningSystem, step);
      if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) {
        return new Note(this.tuningSystem, step, n.getName({ preferFlats }));
      }
      return n;
    };

    notes.push(createNote(currentStep));

    for (let o = 0; o < octaves; o++) {
      for (const step of this.stepPattern) {
        currentStep += step;
        notes.push(createNote(currentStep));
      }
    }

    return notes;
  }

  /**
   * Returns the pitch classes of the scale degrees as step offsets within one period
   * (0 to `octaveSteps - 1`), starting from the root pitch class.
   *
   * Does not include the repeated octave note. A 7-note scale returns 7 pitch classes.
   */
  getPitchClasses(): number[] {
    const os = this.tuningSystem.octaveSteps;
    const classes: number[] = [];
    let current = ((this.rootStep % os) + os) % os;
    classes.push(current);
    for (let i = 0; i < this.stepPattern.length - 1; i++) {
      current = ((current + this.stepPattern[i]) % os + os) % os;
      classes.push(current);
    }
    return classes;
  }

  /**
   * Returns true if the given step (or its pitch class) belongs to this scale.
   * Comparison is by pitch class — octave is ignored.
   */
  contains(step: number): boolean {
    const os = this.tuningSystem.octaveSteps;
    const pc = ((step % os) + os) % os;
    return this.getPitchClasses().includes(pc);
  }

  /**
   * Returns the 1-indexed scale degree of the given step, or `null` if not in the scale.
   * Comparison is by pitch class — octave is ignored.
   */
  getDegree(step: number): number | null {
    const os = this.tuningSystem.octaveSteps;
    const pc = ((step % os) + os) % os;
    const index = this.getPitchClasses().indexOf(pc);
    return index === -1 ? null : index + 1;
  }

  /**
   * Derives a mode from the current scale by rotating its step pattern.
   * @param degree - 1-indexed mode degree (e.g. 2 for Dorian if current scale is Major). Must be an integer.
   */
  getMode(degree: number): Scale {
    if (!Number.isInteger(degree) || degree < 1 || degree > this.stepPattern.length) {
      throw new RangeError(`Scale.getMode: degree must be an integer between 1 and ${this.stepPattern.length}, got ${degree}.`);
    }

    const modeIndex = degree - 1;
    const newPattern = [
      ...this.stepPattern.slice(modeIndex),
      ...this.stepPattern.slice(0, modeIndex)
    ];

    let newRootStep = this.rootStep;
    for (let i = 0; i < modeIndex; i++) {
      newRootStep += this.stepPattern[i];
    }

    return new Scale(`${this.name} (Mode ${degree})`, this.tuningSystem, newRootStep, newPattern);
  }

  /**
   * Returns a new scale with the same pattern transposed by the given number of steps.
   * The name is updated to reflect the new root note.
   */
  transpose(steps: number): Scale {
    const newRoot = this.rootStep + steps;
    const newRootName = new Note(this.tuningSystem, newRoot).name;
    return new Scale(`${this.name} → ${newRootName}`, this.tuningSystem, newRoot, [...this.stepPattern]);
  }
}
