import { TuningSystem, EDO, TET12 } from './tuning';
import { Note } from './note';
import { Chord } from './chord';
import { SCALE_PATTERNS, MODE_PARENT_FAMILY, MODE_BRIGHTNESS } from './dictionaries';
import { preferFlatsForKey, get12TETBaseName, spellByLetter, writtenRoot } from './utils';

/**
 * Characteristic analysis of a modal scale: brightness relative to Ionian,
 * degrees that differ from the parallel major, jazz avoid notes, and parent-family info.
 * @category Tonal harmony
 */
export interface ModalCharacteristics {
  /** Degrees (1-7) that differ from the major scale on the same root (12-TET heptatonic scales). */
  characteristicDegrees: number[];
  /** The same degrees with their alteration against major: dorian `['b3', 'b7']`, lydian `['#4']`. */
  characteristicIntervals: string[];
  /** From `MODE_BRIGHTNESS`: lydian 1, ionian 0 … locrian -5; 0 for a scale it does not list. */
  brightness: number;
  /** Degrees a semitone above a tone of the tonic triad (traditional jazz avoid notes): 4 in ionian. */
  avoidNotes: number[];
  /** Parent scale family (`'major'`, `'melodic minor'`…), when the mode belongs to one. */
  parentScaleName?: string;
  /** Degree of the parent scale the mode starts on, from 1 (dorian is 2). */
  parentModeDegree?: number;
}

/**
 * Suffix lookup for diatonic chord naming in 12-TET.
 * Keys are sorted, unique pitch-class interval sets (from root, mod 12) joined with commas.
 * Value is the suffix appended to the root name (empty for major triad).
 */
const TRIAD_SUFFIX_BY_PCS: Record<string, string> = {
  '0,4,7': '',
  '0,3,7': 'm',
  '0,3,6': 'dim',
  '0,4,8': 'aug',
  '0,2,7': 'sus2',
  '0,5,7': 'sus4',
};

const SEVENTH_SUFFIX_BY_PCS: Record<string, string> = {
  '0,4,7,11': 'maj7',
  '0,3,7,10': 'm7',
  '0,4,7,10': '7',
  '0,3,6,9': 'dim7',
  '0,3,6,10': 'm7b5',
  '0,3,7,11': 'mM7',
  '0,4,8,10': 'aug7',
  '0,4,8,11': 'augM7',
  '0,4,6,10': '7b5',
};

/**
 * A scale: a root pitch plus an ordered pattern of step intervals within a tuning system.
 *
 * `stepPattern` defines the intervals between consecutive degrees in tuning steps
 * (e.g. `[2, 2, 1, 2, 2, 2, 1]` for major in 12-TET). The pattern is relative -
 * the same pattern at a different `rootStep` gives the same scale type in a different key.
 * @category Tonal harmony
 */
export class Scale {
  /**
   * @param name - Human-readable scale name (e.g. "C Major", "D Dorian").
   * @param tuningSystem - The tuning system this scale operates in.
   * @param rootStep - Step offset of the root note from A4 (= 0).
   * @param stepPattern - Intervals between consecutive scale degrees, in tuning steps.
   *   Must be non-empty with all values > 0.
   * @param preferFlats - Optional flat/sharp preference for note naming in `getNotes()`.
   *   When provided, overrides the root-name heuristic. Set by `parseScaleSymbol` using
   *   `preferFlatsForKey(root, scaleType)` for mode-aware accuracy.
   */
  constructor(
    public name: string,
    public tuningSystem: TuningSystem,
    public rootStep: number,
    public readonly stepPattern: readonly number[],
    public readonly preferFlats?: boolean
  ) {
    if (stepPattern.length === 0) {
      throw new RangeError(`Scale "${name}": stepPattern must not be empty.`);
    }
    if (stepPattern.some(s => s <= 0)) {
      throw new RangeError(`Scale "${name}": all step values must be positive.`);
    }
  }

  /**
   * The same scale in another tuning: each degree goes to the step of `tuning` that stands for
   * the same 12-TET note (`TuningSystem.retuneStep`). Name and flat/sharp preference are kept.
   * @returns The scale in `tuning`, or `null` when one of its degrees stands for no 12-TET note
   *   or `tuning` has no step for it.
   */
  retune(tuning: TuningSystem): Scale | null {
    let position = this.rootStep;
    const steps = [this.rootStep, ...this.stepPattern.map(s => (position += s))];
    const tones = steps.map(s => this.tuningSystem.retuneStep(s, tuning));
    if (tones.some(t => t === null)) return null;
    const pattern = tones.slice(1).map((t, k) => t! - tones[k]!);
    if (pattern.some(p => p <= 0)) return null;
    return new Scale(this.name, tuning, tones[0]!, pattern, this.preferFlats);
  }

  /** This scale in 12-TET, when its tuning is another one and every degree stands for a 12-TET note. */
  private inTwelve(): Scale | null {
    if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) return null;
    return this.retune(TET12);
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
    // Another tuning: spelled as in 12-TET, sounding at this tuning's steps.
    const twelve = this.inTwelve();
    if (twelve) {
      return twelve.getNotes(octaves).map(n =>
        new Note(this.tuningSystem, TET12.retuneStep(n.stepsFromBase, this.tuningSystem)!, n.name));
    }
    const notes: Note[] = [];
    let currentStep = this.rootStep;

    // Use stored preferFlats if set (populated by parseScaleSymbol with mode-aware logic).
    // Fall back to root-name heuristic for directly constructed Scale instances.
    let pf: boolean;
    if (this.preferFlats !== undefined) {
      pf = this.preferFlats;
    } else if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) {
      const rootFlatName = new Note(this.tuningSystem, this.rootStep).getName({ preferFlats: true });
      pf = preferFlatsForKey(rootFlatName);
    } else {
      pf = false; // non-12-TET tunings have no flat/sharp preference
    }

    const is12TET = this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12;
    // Heptatonic 12-TET scales are spelled one letter per degree (F# major has E#, not F;
    // D harmonic minor has C#, not Db). Other scales fall back to the flat/sharp preference.
    const byLetter = is12TET && this.stepPattern.length === 7;
    // The written root (Cb, E#) comes from the scale name when it matches the root pitch.
    const rootLetter = (writtenRoot(this.name, this.rootStep) ?? get12TETBaseName(this.rootStep, pf))[0];

    const createNote = (step: number, degree: number): Note => {
      if (!is12TET) return new Note(this.tuningSystem, step);
      const spelled = byLetter ? spellByLetter(step, rootLetter, degree) : null;
      return new Note(this.tuningSystem, step, spelled ?? undefined, pf);
    };

    let degree = 0;
    notes.push(createNote(currentStep, degree));

    for (let o = 0; o < octaves; o++) {
      for (const step of this.stepPattern) {
        currentStep += step;
        notes.push(createNote(currentStep, ++degree));
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
   * Comparison is by pitch class - octave is ignored.
   */
  contains(step: number): boolean {
    const os = this.tuningSystem.octaveSteps;
    const pc = ((step % os) + os) % os;
    return this.getPitchClasses().includes(pc);
  }

  /**
   * Returns the 1-indexed scale degree of the given step, or `null` if not in the scale.
   * Comparison is by pitch class - octave is ignored.
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

    // Named as the mode of the family when known (C major, mode 2 → "D dorian"), else
    // "D (mode 2 of C major)". The root keeps the letter this scale gives it.
    const rootName = this.getNotes()[modeIndex].name.replace(/-?\d+$/, '');
    const type = this.getCanonicalType();
    const parent = type ? MODE_PARENT_FAMILY[type] : undefined;
    const modeName = parent
      ? parent.familyModes[(parent.degree - 1 + modeIndex) % parent.familyModes.length]
      : undefined;
    const name = modeName ? `${rootName} ${modeName}` : `${rootName} (mode ${degree} of ${this.name})`;
    return new Scale(name, this.tuningSystem, newRootStep, newPattern, this.preferFlats);
  }

  /**
   * Returns the diatonic chords built by stacking thirds on each scale degree.
   * - `'triad'` (default): three-note chord (root, 3rd, 5th).
   * - `'seventh'`: four-note chord (root, 3rd, 5th, 7th).
   *
   * Chord names are canonical (e.g. `Bm7b5`, `Caug`), in 12-TET and in any tuning where every
   * degree stands for a 12-TET note (`retune`); otherwise a structural label is used
   * (e.g. `"Step 3(0,5,11)"`).
   *
   * Scales with fewer than 5 notes may not support `'seventh'` on every degree.
   */
  getDiatonicChords(type: 'triad' | 'seventh' = 'triad'): Chord[] {
    const twelve = this.inTwelve();
    if (twelve) return twelve.getDiatonicChords(type).map(c => c.retune(this.tuningSystem)!);
    const len = this.stepPattern.length;
    const maxOffset = type === 'seventh' ? 6 : 4;
    const octavesNeeded = Math.ceil((len + maxOffset) / len);
    const notes = this.getNotes(octavesNeeded);
    const offsets = type === 'seventh' ? [0, 2, 4, 6] : [0, 2, 4];
    const is12TET = this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12;
    const os = this.tuningSystem.octaveSteps;

    const chords: Chord[] = [];
    for (let d = 0; d < len; d++) {
      const rootStep = notes[d].stepsFromBase;
      const intervals = offsets.map(o => notes[d + o].stepsFromBase - rootStep);
      const rootPf = notes[d].preferFlats;

      let chordName: string;
      if (is12TET) {
        const pcs = Array.from(new Set(intervals.map(i => ((i % os) + os) % os))).sort((a, b) => a - b);
        const key = pcs.join(',');
        const lookup = type === 'seventh' ? SEVENTH_SUFFIX_BY_PCS : TRIAD_SUFFIX_BY_PCS;
        const suffix = lookup[key];
        // Same letter as the scale degree (E#dim in F# major, not Fdim).
        const rootName = notes[d].name.replace(/-?\d+$/, '');
        chordName = suffix !== undefined ? `${rootName}${suffix}` : `${rootName}(${pcs.join(',')})`;
      } else {
        const rootName = new Note(this.tuningSystem, rootStep).getName();
        chordName = `${rootName}(${intervals.join(',')})`;
      }

      chords.push(new Chord(chordName, this.tuningSystem, rootStep, intervals, undefined, rootPf));
    }
    return chords;
  }

  /**
   * Returns the diatonic chord built on a single scale degree (1-indexed).
   * See `getDiatonicChords` for details on `type` and naming.
   */
  getChordOnDegree(degree: number, type: 'triad' | 'seventh' = 'triad'): Chord {
    const len = this.stepPattern.length;
    if (!Number.isInteger(degree) || degree < 1 || degree > len) {
      throw new RangeError(`Scale.getChordOnDegree: degree must be an integer between 1 and ${len}, got ${degree}.`);
    }
    return this.getDiatonicChords(type)[degree - 1];
  }

  /**
   * Identifies the canonical scale-type key (e.g. "dorian", "phrygian dominant") by
   * matching the scale's name first, then falling back to `SCALE_PATTERNS` pattern lookup.
   * Returns null if no match is found.
   */
  private getCanonicalType(): string | null {
    const match = this.name.match(/^[A-G][#b]*\s+(.*)$/i);
    if (match) {
      const typeRaw = match[1].trim().toLowerCase();
      if (SCALE_PATTERNS[typeRaw]) return typeRaw;
    }
    if (!(this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12)) {
      return this.inTwelve()?.getCanonicalType() ?? null;
    }
    const key = this.stepPattern.join(',');
    for (const [type, pat] of Object.entries(SCALE_PATTERNS)) {
      if (pat.join(',') === key) return type;
    }
    return null;
  }

  /**
   * Returns modal characteristics: brightness (relative to Ionian), the degrees that
   * differ from the parallel major, traditional jazz avoid notes, and parent-family info.
   *
   * `characteristicDegrees`/`characteristicIntervals` and `avoidNotes` are computed in 12-TET
   * and in any tuning where every degree stands for a 12-TET note; otherwise they are empty.
   * Brightness uses `MODE_BRIGHTNESS`; returns 0 if the mode is unknown.
   */
  getModalCharacteristics(): ModalCharacteristics {
    const twelve = this.inTwelve();
    if (twelve) return twelve.getModalCharacteristics();
    const type = this.getCanonicalType();
    const parent = type ? MODE_PARENT_FAMILY[type] : undefined;
    const brightness = type && MODE_BRIGHTNESS[type] !== undefined ? MODE_BRIGHTNESS[type] : 0;

    const characteristicDegrees: number[] = [];
    const characteristicIntervals: string[] = [];
    const avoidNotes: number[] = [];

    const is12TET = this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12;
    if (is12TET) {
      const os = this.tuningSystem.octaveSteps;
      const scalePcs = this.getPitchClasses();
      const rootPc = scalePcs[0];

      // Compare to parallel Ionian (7-note scales only - other lengths skip this comparison)
      if (scalePcs.length === 7) {
        const ionianIntervals = [0, 2, 4, 5, 7, 9, 11];
        for (let i = 0; i < 7; i++) {
          const rel = ((scalePcs[i] - rootPc) % os + os) % os;
          if (rel !== ionianIntervals[i]) {
            characteristicDegrees.push(i + 1);
            const diff = rel - ionianIntervals[i];
            const accidental = diff > 0 ? '#' : 'b';
            characteristicIntervals.push(`${accidental}${i + 1}`);
          }
        }
      }

      // Avoid notes: scale degrees exactly one semitone above a tonic-triad tone
      const triad = this.getChordOnDegree(1, 'triad');
      const triadPcs = new Set(triad.getPitchClasses());
      for (let i = 0; i < scalePcs.length; i++) {
        const pc = scalePcs[i];
        if (triadPcs.has(pc)) continue;
        const belowPc = ((pc - 1) % os + os) % os;
        if (triadPcs.has(belowPc)) avoidNotes.push(i + 1);
      }
    }

    return {
      characteristicDegrees,
      characteristicIntervals,
      brightness,
      avoidNotes,
      parentScaleName: parent?.family,
      parentModeDegree: parent?.degree,
    };
  }

  /**
   * Returns the parent scale of this mode (e.g. D Dorian → C major), or null if
   * this scale is not a recognized mode of a known family.
   */
  getParentScale(): Scale | null {
    const twelve = this.inTwelve();
    if (twelve) return twelve.getParentScale()?.retune(this.tuningSystem) ?? null;
    const type = this.getCanonicalType();
    if (!type) return null;
    const parent = MODE_PARENT_FAMILY[type];
    if (!parent) return null;
    const parentPattern12TET = SCALE_PATTERNS[parent.family];
    if (!parentPattern12TET) return null;

    const parentPattern = this.tuningSystem.getPatternFromStandard(parentPattern12TET);
    let stepShift = 0;
    for (let i = 0; i < parent.degree - 1; i++) stepShift += parentPattern[i];
    const parentRootStep = this.rootStep - stepShift;

    const is12TET = this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12;
    let rootName: string;
    let pf: boolean;
    if (is12TET) {
      const flatName = get12TETBaseName(parentRootStep, true);
      pf = preferFlatsForKey(flatName, parent.family);
      rootName = get12TETBaseName(parentRootStep, pf);
    } else {
      rootName = new Note(this.tuningSystem, parentRootStep).getName();
      pf = false;
    }
    return new Scale(`${rootName} ${parent.family}`, this.tuningSystem, parentRootStep, parentPattern, pf);
  }

  /**
   * Returns the relative mode within the same modal family (e.g. D Dorian → F Lydian).
   * Returns null if the target mode is in a different family or either mode is unknown.
   */
  getRelativeMode(targetModeName: string): Scale | null {
    const twelve = this.inTwelve();
    if (twelve) return twelve.getRelativeMode(targetModeName)?.retune(this.tuningSystem) ?? null;
    const parent = this.getParentScale();
    if (!parent) return null;
    const target = targetModeName.trim().toLowerCase();
    const targetParent = MODE_PARENT_FAMILY[target];
    const currentType = this.getCanonicalType();
    if (!currentType || !targetParent) return null;
    const currentParent = MODE_PARENT_FAMILY[currentType];
    if (!currentParent || currentParent.family !== targetParent.family) return null;

    const modeScale = parent.getMode(targetParent.degree);
    const is12TET = this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12;
    let rootName: string;
    let pf: boolean;
    if (is12TET) {
      const flatName = get12TETBaseName(modeScale.rootStep, true);
      pf = preferFlatsForKey(flatName, target);
      rootName = get12TETBaseName(modeScale.rootStep, pf);
    } else {
      rootName = new Note(this.tuningSystem, modeScale.rootStep).getName();
      pf = false;
    }
    return new Scale(`${rootName} ${target}`, this.tuningSystem, modeScale.rootStep, modeScale.stepPattern, pf);
  }

  /**
   * Returns a new scale with the same pattern transposed by the given number of steps.
   * Named with the new root and the same type ("C major" +2 → "D major"); the root takes
   * the spelling of the key with fewer accidentals.
   */
  transpose(steps: number): Scale {
    const newRoot = this.rootStep + steps;
    // Re-derive preferFlats for the new root - key signature changes with transposition.
    // Use get12TETBaseName for 12-TET (no octave number in the name); fall back to getNoteName.
    // The type is what follows the root in the name ("C dorian" → "dorian").
    const typeText = this.name.match(/^[A-G][#b]*\s+(.+)$/)?.[1];
    let newRootName: string;
    let newPf: boolean;
    if (this.tuningSystem instanceof EDO && this.tuningSystem.divisions === 12) {
      const flatBaseName = get12TETBaseName(newRoot, true);
      newPf = preferFlatsForKey(flatBaseName, typeText ?? 'major');
      newRootName = get12TETBaseName(newRoot, newPf);
    } else {
      newRootName = new Note(this.tuningSystem, newRoot).getName().replace(/-?\d+$/, '');
      newPf = false;
    }
    const name = typeText ? `${newRootName} ${typeText}` : `${newRootName} (${this.name})`;
    return new Scale(name, this.tuningSystem, newRoot, [...this.stepPattern], newPf);
  }
}
