import { TuningSystem } from './tuning';
import { Note } from './note';
import { get12TETBaseName } from './utils';

export class Chord {
  constructor(
    public name: string,
    public tuningSystem: TuningSystem,
    public rootStep: number,
    public intervalsInSteps: number[], // e.g., [0, 4, 7] for major triad in 12-TET
    public bassStep?: number // For slash chords (e.g., C/E)
  ) {}

  getNotes(): Note[] {
    const notes = this.intervalsInSteps.map(step => 
      new Note(this.tuningSystem, this.rootStep + step)
    );

    // If it's a slash chord, prepend the bass note an octave lower (or at the exact step)
    if (this.bassStep !== undefined) {
      // Ensure bass note is lower than the root
      let actualBassStep = this.bassStep;
      while (actualBassStep >= this.rootStep) {
        actualBassStep -= this.tuningSystem.octaveSteps;
      }
      notes.unshift(new Note(this.tuningSystem, actualBassStep));
    }

    return notes;
  }

  transpose(steps: number): Chord {
    return new Chord(
      `${this.name} (Transposed)`, 
      this.tuningSystem, 
      this.rootStep + steps, 
      this.intervalsInSteps,
      this.bassStep !== undefined ? this.bassStep + steps : undefined
    );
  }

  /**
   * Returns the notes of the chord in a specific inversion.
   * @param inversion 0 = root position, 1 = 1st inversion, 2 = 2nd inversion, etc.
   */
  getInversion(inversion: number): Note[] {
    const notes = this.getNotes();

    if (inversion === 0) return notes;

    const len = notes.length;
    const actualInversion = inversion % len;
    const octaveShifts = Math.floor(inversion / len);

    return notes.map((note, i) => {
      let octavesToShift = octaveShifts;
      if (i < actualInversion) {
        octavesToShift += 1; // Shift notes below the inversion point up an octave
      }
      return note.transpose(octavesToShift * this.tuningSystem.octaveSteps);
    }).sort((a, b) => a.stepsFromBase - b.stepsFromBase);
  }

  /**
   * Returns a specific voicing of the chord.
   */
  getVoicing(type: 'close' | 'drop2' | 'drop3' | 'rootless' | 'open' | 'quartal'): Note[] {
    const notes = this.getNotes();
    if (type === 'close') return notes;

    if (type === 'rootless') {
      // Remove the root note (assuming it's the first note if no bass, or we filter by modulo)
      return notes.filter(n => 
        (n.stepsFromBase % this.tuningSystem.octaveSteps + this.tuningSystem.octaveSteps) % this.tuningSystem.octaveSteps 
        !== (this.rootStep % this.tuningSystem.octaveSteps + this.tuningSystem.octaveSteps) % this.tuningSystem.octaveSteps
      );
    }

    if (type === 'drop2') {
      if (notes.length < 4) return notes; // Drop 2 usually requires at least 7th chords
      const sorted = [...notes].sort((a, b) => a.frequency - b.frequency);
      const dropNote = sorted.splice(sorted.length - 2, 1)[0];
      sorted.unshift(dropNote.transpose(-this.tuningSystem.octaveSteps));
      return sorted;
    }

    if (type === 'drop3') {
      if (notes.length < 4) return notes; // Drop 3 requires at least 4 notes
      const sorted = [...notes].sort((a, b) => a.frequency - b.frequency);
      const dropNote = sorted.splice(sorted.length - 3, 1)[0];
      sorted.unshift(dropNote.transpose(-this.tuningSystem.octaveSteps));
      return sorted;
    }

    if (type === 'quartal') {
      // Heuristic for quartal voicings: sort notes by their position in the circle of fourths.
      // NOTE: multiplier 5 (perfect fourth in 12-TET) is 12-TET specific and produces
      // approximate results in other tuning systems.
      const sorted = [...notes].sort((a, b) => {
        const aFourths = ((a.stepsFromBase * 5) % this.tuningSystem.octaveSteps + this.tuningSystem.octaveSteps) % this.tuningSystem.octaveSteps;
        const bFourths = ((b.stepsFromBase * 5) % this.tuningSystem.octaveSteps + this.tuningSystem.octaveSteps) % this.tuningSystem.octaveSteps;
        return aFourths - bFourths;
      });
      
      // Assign octaves to make them strictly ascend
      let currentStep = sorted[0].stepsFromBase;
      return sorted.map((n, i) => {
        if (i === 0) return n;
        let nextStep = n.stepsFromBase;
        // Force the next note to be higher
        while (nextStep <= currentStep) {
          nextStep += this.tuningSystem.octaveSteps;
        }
        currentStep = nextStep;
        return new Note(this.tuningSystem, nextStep);
      });
    }

    if (type === 'open') {
      // Spread notes out: move every other note (except bass) up an octave
      return notes.map((n, i) => {
        if (i > 0 && i % 2 === 1) {
          return n.transpose(this.tuningSystem.octaveSteps);
        }
        return n;
      }).sort((a, b) => a.frequency - b.frequency);
    }

    return notes;
  }

  /**
   * Returns the tritone substitution of this chord.
   * Typically applied to dominant 7th chords (e.g., G7 -> Db7).
   * NOTE: Only meaningful in 12-TET (tritone = 6 semitones). Returns null for other tuning systems.
   */
  getTritoneSubstitution(): Chord | null {
    if (this.tuningSystem.octaveSteps !== 12) return null;
    // Transpose root by 6 semitones (tritone)
    const tritoneRootStep = this.rootStep + 6;
    
    // Create new name. E.g., if G7, new name is Db7.
    // We prefer flats for tritone subs usually (e.g., Db7 instead of C#7)
    const newRootName = get12TETBaseName(tritoneRootStep, true);
    
    // Extract the suffix from the current name (e.g., "G7b9" -> "7b9")
    const match = this.name.match(/^[A-G][#b]*(.*)$/);
    const suffix = match ? match[1] : '';
    
    return new Chord(
      `${newRootName}${suffix}`,
      this.tuningSystem,
      tritoneRootStep,
      this.intervalsInSteps
    );
  }

  /**
   * Voice Leading: Finds the inversion/voicing of this chord that requires the minimum total 

   * movement (in cents) from the current set of notes.
   */
  static smoothTransition(currentNotes: Note[], targetChord: Chord): Note[] {
    if (currentNotes.length === 0) return targetChord.getNotes();

    let bestNotes = targetChord.getNotes();
    let minDistance = Infinity;

    // Check root position + inversions, across 3 octaves (-1, 0, 1)
    for (let oct = -1; oct <= 1; oct++) {
      const transposedChord = targetChord.transpose(oct * targetChord.tuningSystem.octaveSteps);
      
      for (let inv = 0; inv < targetChord.intervalsInSteps.length; inv++) {
        const candidateNotes = transposedChord.getInversion(inv);
        
        let distance = 0;
        const currentFreqs = currentNotes.map(n => n.frequency).sort((a, b) => a - b);
        const candFreqs = candidateNotes.map(n => n.frequency).sort((a, b) => a - b);
        
        const len = Math.min(currentFreqs.length, candFreqs.length);
        for (let i = 0; i < len; i++) {
          // Distance in cents
          distance += Math.abs(1200 * Math.log2(candFreqs[i] / currentFreqs[i]));
        }
        
        // Penalize if the lengths are different to prefer closer matches
        distance += Math.abs(currentFreqs.length - candFreqs.length) * 1200;

        if (distance < minDistance) {
          minDistance = distance;
          bestNotes = candidateNotes;
        }
      }
    }
    return bestNotes;
  }
}
