import { TuningSystem, EDO } from './tuning';
import { Note } from './note';
import { get12TETBaseName, usesFlats } from './utils';

/**
 * A chord: a root pitch plus a set of intervals defining the chord quality, within a tuning system.
 *
 * `intervalsInSteps` contains the offset in tuning steps from the root for each chord tone,
 * including the root itself (offset 0) as the first element.
 * Example: `[0, 4, 7]` = major triad in 12-TET (root, major third, perfect fifth).
 */
export class Chord {
  /**
   * @param name - Human-readable chord name (e.g. "Cmaj7", "Bb7", "G/B").
   * @param tuningSystem - The tuning system this chord operates in.
   * @param rootStep - Step offset of the root from A4 (= 0).
   * @param intervalsInSteps - Intervals from the root for each chord tone, in tuning steps.
   *   Must include 0 (the root) as the first element.
   * @param bassStep - Optional bass note step for slash chords (e.g. C/E). If provided and
   *   higher than the root, it is automatically moved an octave down.
   */
  constructor(
    public name: string,
    public tuningSystem: TuningSystem,
    public rootStep: number,
    public readonly intervalsInSteps: readonly number[],
    public bassStep?: number
  ) {}

  /**
   * Returns the notes of the chord in root position, with accidental spelling
   * matching the chord root (e.g. Bb chords use flat note names).
   * For slash chords, the bass note is prepended below the root.
   */
  getNotes(): Note[] {
    // Determine accidental preference from the root name (flat spelling).
    const rootFlatName = new Note(this.tuningSystem, this.rootStep).getName({ preferFlats: true });
    const preferFlats = usesFlats(rootFlatName);

    const createNote = (step: number) => {
      const n = new Note(this.tuningSystem, step);
      if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) {
        return new Note(this.tuningSystem, step, n.getName({ preferFlats }));
      }
      return n;
    };

    const notes = this.intervalsInSteps.map(interval =>
      createNote(this.rootStep + interval)
    );

    if (this.bassStep !== undefined) {
      let actualBassStep = this.bassStep;
      while (actualBassStep >= this.rootStep) {
        actualBassStep -= this.tuningSystem.octaveSteps;
      }
      notes.unshift(createNote(actualBassStep));
    }

    return notes;
  }

  /**
   * Returns the pitch classes of all chord tones as step offsets within one period
   * (0 to `octaveSteps - 1`). Does not include the bass note of slash chords.
   */
  getPitchClasses(): number[] {
    const os = this.tuningSystem.octaveSteps;
    return this.intervalsInSteps.map(interval => {
      const step = this.rootStep + interval;
      return ((step % os) + os) % os;
    });
  }

  /**
   * Returns true if the given step (or its pitch class) is a tone of this chord.
   * Comparison is by pitch class — octave is ignored.
   */
  contains(step: number): boolean {
    const os = this.tuningSystem.octaveSteps;
    const pc = ((step % os) + os) % os;
    return this.getPitchClasses().includes(pc);
  }

  /**
   * Returns a new chord transposed by the given number of steps.
   * The name is updated to reflect the new root note.
   */
  transpose(steps: number): Chord {
    const newRoot = this.rootStep + steps;
    const newRootName = new Note(this.tuningSystem, newRoot).getName({ preferFlats: usesFlats(new Note(this.tuningSystem, newRoot).getName({ preferFlats: true })) });
    const match = this.name.match(/^[A-G][#b]*(.*)/);
    const suffix = match ? match[1] : '';
    return new Chord(
      `${newRootName}${suffix}`,
      this.tuningSystem,
      newRoot,
      [...this.intervalsInSteps],
      this.bassStep !== undefined ? this.bassStep + steps : undefined
    );
  }

  /**
   * Returns the notes of the chord in a specific inversion.
   * @param inversion - 0 = root position, 1 = 1st inversion, 2 = 2nd inversion, etc.
   *   Values ≥ `notes.length` wrap around (modulo). Slash chord bass notes participate
   *   in the inversion logic and may not stay at the bottom.
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
   * - `close` — notes in root position, as compact as possible (default stack).
   * - `drop2` — second note from the top dropped one octave (requires ≥ 4 voices).
   * - `drop3` — third note from the top dropped one octave (requires ≥ 4 voices).
   * - `rootless` — root note omitted (common in jazz piano comping).
   * - `open` — every other upper voice raised an octave (wider spacing).
   * - `quartal` — notes stacked by fourths (approximate; 12-TET–optimised).
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
