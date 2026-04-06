import { TuningSystem } from './tuning';
import { Note } from './note';
import { usesFlats } from './utils';

export class Scale {
  constructor(
    public name: string,
    public tuningSystem: TuningSystem,
    public rootStep: number,
    public stepPattern: number[] // e.g., [2, 2, 1, 2, 2, 2, 1] for major in 12-TET
  ) {}

  getNotes(octaves: number = 1): Note[] {
    const notes: Note[] = [];
    let currentStep = this.rootStep;
    
    // Determine if this scale should prefer flats based on its root
    const rootNote = new Note(this.tuningSystem, this.rootStep);
    const preferFlats = usesFlats(rootNote.name);
    
    // Helper to create a note with the correct name formatting
    const createNote = (step: number) => {
      const n = new Note(this.tuningSystem, step);
      if (this.tuningSystem.name === '12-TET') {
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
   * Derives a mode from the current scale by rotating its step pattern.
   * @param degree 1-indexed mode degree (e.g., 2 for Dorian if current is Major)
   */
  getMode(degree: number): Scale {
    if (degree < 1 || degree > this.stepPattern.length) {
      throw new Error(`Invalid mode degree: ${degree}. Must be between 1 and ${this.stepPattern.length}`);
    }

    const modeIndex = degree - 1;
    
    // Rotate the step pattern
    const newPattern = [
      ...this.stepPattern.slice(modeIndex),
      ...this.stepPattern.slice(0, modeIndex)
    ];
    
    // Calculate the new root step by adding the steps up to the mode index
    let newRootStep = this.rootStep;
    for (let i = 0; i < modeIndex; i++) {
      newRootStep += this.stepPattern[i];
    }
    
    return new Scale(`${this.name} (Mode ${degree})`, this.tuningSystem, newRootStep, newPattern);
  }

  transpose(steps: number): Scale {
    return new Scale(`${this.name} (Transposed)`, this.tuningSystem, this.rootStep + steps, this.stepPattern);
  }
}
