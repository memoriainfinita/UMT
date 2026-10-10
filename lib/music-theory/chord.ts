import { TuningSystem, EDO } from './tuning';
import { Note } from './note';
import { get12TETBaseName, preferFlatsForKey, spellByLetter, chordToneOffset, writtenRoot } from './utils';

// m2 (1), m3 (3), m7 (10) are always flat-side intervals in tonal context regardless of key.
// d5/A4 (6) and m6/A5 (8) are genuinely ambiguous - defer to chord-level preference.
function intervalPreferFlats(intervalInSteps: number, chordPf: boolean): boolean {
  const i = ((intervalInSteps % 12) + 12) % 12;
  if (i === 1 || i === 3 || i === 10) return true;
  return chordPf;
}

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
   * @param preferFlats - Optional flat/sharp preference for note naming in `getNotes()`.
   *   When provided, overrides the root-name heuristic. Set by `parseChordSymbol` and
   *   PLR transforms for context-aware accidental spelling.
   */
  constructor(
    public name: string,
    public tuningSystem: TuningSystem,
    public rootStep: number,
    public readonly intervalsInSteps: readonly number[],
    public bassStep?: number,
    public readonly preferFlats?: boolean
  ) {
    if (intervalsInSteps.length === 0 || intervalsInSteps[0] !== 0) {
      throw new RangeError(`Chord "${name}": intervalsInSteps must start with 0 (the root).`);
    }
  }

  /**
   * Returns the notes of the chord in root position. In 12-TET each tone is named by its
   * interval above the written root (D#m → D# F# A#; Cm7b5 → C Eb Gb Bb; C7#11 has F#).
   * For slash chords, the bass note is prepended below the root.
   */
  getNotes(): Note[] {
    // Use stored preferFlats if set (populated by parseChordSymbol / NeoRiemannian).
    // Fall back to root-name heuristic for directly constructed Chord instances.
    const is12TET = this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12;
    let chordPf: boolean;
    if (this.preferFlats !== undefined) {
      chordPf = this.preferFlats;
    } else if (is12TET) {
      const rootFlatName = new Note(this.tuningSystem, this.rootStep).getName({ preferFlats: true });
      chordPf = preferFlatsForKey(rootFlatName);
    } else {
      chordPf = false; // other tunings have no letter names ("Step N")
    }
    // Each tone is named by its interval above the written root: D#m is D# F# A#,
    // C7#9 has D#, Edim7 is E G Bb Db. The root letter comes from the name when it
    // matches the root pitch (Cb, E#), else from the flat/sharp preference.
    const [mainName, slashName] = this.name.split('/');
    const rootLetter = (writtenRoot(mainName, this.rootStep) ?? get12TETBaseName(this.rootStep, chordPf))[0];
    const pcs = new Set(this.intervalsInSteps.map(i => ((i % 12) + 12) % 12));

    const fallback = (step: number, intervalFromRoot: number): Note =>
      new Note(this.tuningSystem, step, undefined, intervalPreferFlats(intervalFromRoot, chordPf));
    const createNote = (step: number, intervalFromRoot: number): Note => {
      if (!is12TET) return new Note(this.tuningSystem, step);
      const spelled = spellByLetter(step, rootLetter, chordToneOffset(intervalFromRoot, pcs));
      return spelled ? new Note(this.tuningSystem, step, spelled) : fallback(step, intervalFromRoot);
    };

    const notes = this.intervalsInSteps.map(interval =>
      createNote(this.rootStep + interval, interval)
    );

    if (this.bassStep !== undefined) {
      let actualBassStep = this.bassStep;
      while (actualBassStep >= this.rootStep) {
        actualBassStep -= this.tuningSystem.octaveSteps;
      }
      const above = actualBassStep - this.rootStep;
      // A bass outside the chord keeps the letter it is written with (C/Bb, not C/A#)
      const written = is12TET && !pcs.has(((above % 12) + 12) % 12) && slashName !== undefined
        ? writtenRoot(slashName.trim(), actualBassStep) : null;
      const spelledBass = written ? spellByLetter(actualBassStep, written[0], 0) : null;
      notes.unshift(spelledBass ? new Note(this.tuningSystem, actualBassStep, spelledBass) : createNote(actualBassStep, above));
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
   * Comparison is by pitch class - octave is ignored.
   */
  contains(step: number): boolean {
    const os = this.tuningSystem.octaveSteps;
    const pc = ((step % os) + os) % os;
    return this.getPitchClasses().includes(pc);
  }

  /**
   * Returns a new chord transposed by the given number of steps. The name follows: the
   * root takes the spelling of the key with fewer accidentals, and a slash bass keeps
   * its letter distance from the root (C/E +2 → D/F#; C/Bb +2 → D/C).
   * By whole octaves the chord keeps its name.
   */
  transpose(steps: number): Chord {
    const newRoot = this.rootStep + steps;
    const newBass = this.bassStep !== undefined ? this.bassStep + steps : undefined;
    const os = this.tuningSystem.octaveSteps;
    if (steps % os === 0) {
      return new Chord(this.name, this.tuningSystem, newRoot, [...this.intervalsInSteps], newBass, this.preferFlats);
    }
    const [main, slash] = this.name.split('/');
    const suffix = main.match(/^[A-G][#b]*(.*)$/)?.[1] ?? '';
    let newRootName: string;
    let newPf: boolean;
    let bassName = '';
    if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) {
      const flatBaseName = get12TETBaseName(newRoot, true);
      newPf = preferFlatsForKey(flatBaseName);
      newRootName = get12TETBaseName(newRoot, newPf);
      if (slash !== undefined && newBass !== undefined) {
        const oldRoot = writtenRoot(main, this.rootStep);
        const oldBass = writtenRoot(slash.trim(), this.bassStep!);
        const letters = 'CDEFGAB';
        const distance = oldRoot && oldBass
          ? (letters.indexOf(oldBass[0]) - letters.indexOf(oldRoot[0]) + 7) % 7
          : null;
        const spelled = distance !== null ? spellByLetter(newBass, newRootName[0], distance) : null;
        bassName = '/' + (spelled ? spelled.replace(/-?\d+$/, '') : get12TETBaseName(newBass, newPf));
      }
    } else {
      newRootName = new Note(this.tuningSystem, newRoot).getName().replace(/-?\d+$/, '');
      newPf = false;
      if (slash !== undefined && newBass !== undefined) {
        bassName = '/' + new Note(this.tuningSystem, newBass).getName().replace(/-?\d+$/, '');
      }
    }
    return new Chord(
      `${newRootName}${suffix}${bassName}`,
      this.tuningSystem,
      newRoot,
      [...this.intervalsInSteps],
      newBass,
      newPf
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
   * - `close` - notes in root position, as compact as possible (default stack).
   * - `drop2` - second note from the top dropped one octave (requires ≥ 4 voices).
   * - `drop3` - third note from the top dropped one octave (requires ≥ 4 voices).
   * - `rootless` - root note omitted (common in jazz piano comping).
   * - `open` - every other upper voice raised an octave (wider spacing).
   * - `quartal` - notes stacked by fourths (approximate; 12-TET–optimised).
   */
  getVoicing(type: 'close' | 'drop2' | 'drop3' | 'rootless' | 'open' | 'quartal'): Note[] {
    const notes = this.getNotes();
    if (type === 'close') return notes;

    if (type === 'rootless') {
      // Drop the root and its octave doublings from the chord tones; a slash bass stays
      const os = this.tuningSystem.octaveSteps;
      const pc = (s: number) => ((s % os) + os) % os;
      const hasBass = this.bassStep !== undefined;
      return notes.filter((n, i) => (hasBass && i === 0) || pc(n.stepsFromBase) !== pc(this.rootStep));
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
      
      // Assign octaves to make them strictly ascend, preserving each note's flat/sharp preference.
      let currentStep = sorted[0].stepsFromBase;
      return sorted.map((n, i) => {
        if (i === 0) return n;
        let nextStep = n.stepsFromBase;
        // Force the next note to be higher
        while (nextStep <= currentStep) {
          nextStep += this.tuningSystem.octaveSteps;
        }
        currentStep = nextStep;
        return n.transpose(nextStep - n.stepsFromBase);
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
    // Determine canonical enharmonic for the tritone root via circle of fifths.
    // Tritone subs conventionally prefer flats (Db7 over C#7), but we verify against the key.
    const newRootFlatName = get12TETBaseName(tritoneRootStep, true);
    const newPf = preferFlatsForKey(newRootFlatName);
    const newRootName = get12TETBaseName(tritoneRootStep, newPf);
    const match = this.name.match(/^[A-G][#b]*(.*)$/);
    const suffix = match ? match[1] : '';
    return new Chord(
      `${newRootName}${suffix}`,
      this.tuningSystem,
      tritoneRootStep,
      this.intervalsInSteps,
      undefined,
      newPf
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

/**
 * Chord quality from its intervals (12-TET): `'maj7'`, `'m7'`, `'7'`, `'dim7'`, `'m7b5'`,
 * `'mM7'`, `'aug7'`, `'augM7'`, `'aug'`, `'dim'`, `'sus2'`, `'sus4'`, `'m'`, `'M'`, or `''`
 * when none fits or the tuning is not 12 steps per octave.
 */
export function chordQualityFromIntervals(chord: Chord, oct: number = chord.tuningSystem.octaveSteps): string {
  if (oct !== 12) return '';
  const pcs = chord.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
  const has = (n: number) => pcs.includes(n);
  if (has(4) && has(7) && has(11)) return 'maj7';
  if (has(3) && has(7) && has(10)) return 'm7';
  if (has(4) && has(7) && has(10)) return '7';
  if (has(3) && has(6) && has(9)) return 'dim7';
  if (has(3) && has(6) && has(10)) return 'm7b5';
  if (has(3) && has(7) && has(11)) return 'mM7';
  if (has(4) && has(8) && has(10)) return 'aug7';
  if (has(4) && has(8) && has(11)) return 'augM7';
  if (has(4) && has(8)) return 'aug';
  if (has(3) && has(6)) return 'dim';
  if (has(2) && has(7)) return 'sus2';
  if (has(5) && has(7)) return 'sus4';
  if (has(3) && has(7)) return 'm';
  if (has(4) && has(7)) return 'M';
  return '';
}
