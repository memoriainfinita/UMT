/**
 * Species counterpoint validation and canon/imitation detection.
 */
import { Note } from './note';
import { parseNoteToStep12TET } from './utils';
import { EDO } from './tuning';

/**
 * A rule violation found during species counterpoint analysis.
 * @category Post-tonal
 */
export interface CounterpointIssue {
  /** `'Parallel 5th'`, `'Dissonance on Strong Beat'`, `'Melodic Tritone'`, `'Modal Finalis'`, `'Modal Ambitus'`… */
  type: string;
  /** Position where it happens, from 1 (a note of the cantus, or a slot in the species grid). */
  beat?: number;
  /** Readable description. */
  description: string;
}

// Motion type between two interval pairs (each note moving by a step)
function motionType(cf1: number, cf2: number, ct1: number, ct2: number): 'contrary' | 'oblique' | 'parallel' | 'similar' {
  const cfDir = Math.sign(cf2 - cf1);
  const ctDir = Math.sign(ct2 - ct1);
  if (cfDir === 0 && ctDir === 0) return 'oblique';
  if (cfDir === 0 || ctDir === 0) return 'oblique';
  if (cfDir !== ctDir) return 'contrary';
  if (cf2 - cf1 === ct2 - ct1) return 'parallel';
  return 'similar';
}

const PERFECT_CONSONANCES = new Set([0, 7, 12]); // unison, P5, P8 (steps)
const IMPERFECT_CONSONANCES = new Set([3, 4, 8, 9]); // m3, M3, m6, M6

/** 12-TET semitones from A4 of a note: its step in 12-TET, else the nearest semitone to its frequency. */
function semi(n: Note): number {
  const ts = n.tuningSystem;
  return ts instanceof EDO && ts.divisions === 12 ? n.stepsFromBase : Math.round(12 * Math.log2(n.frequency / 440));
}

// Pitch class (mod 12, steps from A4) of each mode's finalis on the white keys
const MODE_FINALIS: Record<string, number> = {
  dorian: 5, phrygian: 7, lydian: 8, mixolydian: 10,
  aeolian: 0, ionian: 3, locrian: 2,
};

/** `'dorian'` (finalis D) or a transposed mode with its finalis (`'G dorian'`). */
function parseMode(mode: string): { name: string; finalisPC: number } | null {
  const m = mode.trim().match(/^(?:([A-G][#b]*)\s+)?(\w+)$/);
  if (!m) return null;
  const name = m[2].toLowerCase();
  const white = MODE_FINALIS[name];
  if (white === undefined) return null;
  const finalisPC = m[1] ? ((parseNoteToStep12TET(m[1]) % 12) + 12) % 12 : white;
  return { name, finalisPC };
}

function modalChecks(mode: string, cf: Note[], counter: Note[], issues: CounterpointIssue[]): void {
  const parsed = parseMode(mode);
  if (!parsed) return;
  const { finalisPC } = parsed;

  // 1. Finalis: CF must start and end on the mode's finalis pitch class
  const pc = (n: Note) => ((semi(n) % 12) + 12) % 12;
  if (pc(cf[0]) !== finalisPC)
    issues.push({ type: 'Modal Finalis', description: `CF does not begin on the ${mode} finalis.` });
  if (pc(cf[cf.length - 1]) !== finalisPC)
    issues.push({ type: 'Modal Finalis', description: `CF does not end on the ${mode} finalis.` });

  // 2. Ambitus: counterpoint must stay within [-7, +15] semitones of the finalis note
  // (covers authentic range up to a 10th above and plagal range down to a 5th below)
  const finalisStep = semi(cf[cf.length - 1]);
  for (let i = 0; i < counter.length; i++) {
    const diff = semi(counter[i]) - finalisStep;
    if (diff < -7 || diff > 15)
      issues.push({ type: 'Modal Ambitus', beat: i + 1, description: `Beat ${i + 1}: note outside modal ambitus for ${mode}.` });
  }

  // 3. Melodic tritone: augmented 4th (6 semitones) in counterpoint motion is forbidden
  for (let i = 1; i < counter.length; i++) {
    if (Math.abs(semi(counter[i]) - semi(counter[i - 1])) === 6)
      issues.push({ type: 'Melodic Tritone', beat: i + 1, description: `Beat ${i + 1}: melodic tritone (A4) in counterpoint.` });
  }
}

/** Counterpoint notes per cantus firmus note, by species. */
const SLOTS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 1, 2: 2, 3: 4, 4: 2, 5: 4 };

/**
 * Checks counterpoint rules for a given species.
 * `cf` = cantus firmus notes; `counter` = counterpoint notes.
 * Notes should be in the same tuning system. Intervals are read in 12-TET semitones (notes
 * of other tunings at their nearest semitone).
 * @category Post-tonal
 */
export class Counterpoint {
  /**
   * Validates a counterpoint voice against a cantus firmus.
   *
   * The counterpoint is given on a grid of slots per cantus firmus note: 1 (1st species),
   * 2 (2nd), 4 (3rd), 2 (4th: slot 1 is the tied-over note, slot 2 the new one) and 4
   * (5th: a longer note repeats its pitch in the following slots; a tie is a repeated
   * pitch across the bar line).
   *
   * - Strong slots (the first of each measure) must be consonant, except a suspension in
   *   the 4th and 5th species: prepared (same pitch in the slot before, consonant there)
   *   and resolved down by step to a consonance.
   * - Weak slots: a dissonance must be a passing or neighbour note (approached and left by
   *   step); in the 4th species weak slots are consonant.
   * - Parallel 5ths and octaves between consecutive strong slots; hidden 5ths and octaves
   *   in the 1st species; unison only at the start and end.
   *
   * @param species - 1 | 2 | 3 | 4 | 5
   * @param cf - Cantus firmus notes (one per measure).
   * @param counter - Counterpoint notes on the slot grid above.
   * @param mode - Optional mode, on its white-key finalis (`"dorian"` = D) or transposed
   *   (`"G dorian"`): `dorian`, `phrygian`, `lydian`, `mixolydian`, `aeolian`, `ionian`, `locrian`.
   *   Enables modal checks: finalis (CF must start and end on it), ambitus (counterpoint
   *   within [-7, +15] semitones of the finalis), and melodic tritone detection.
   */
  static checkSpecies(
    species: 1 | 2 | 3 | 4 | 5,
    cf: Note[],
    counter: Note[],
    mode?: string
  ): CounterpointIssue[] {
    const issues: CounterpointIssue[] = [];
    if (cf.length === 0 || counter.length === 0) return issues;

    const slots = SLOTS[species];
    const ic = (k: number) => Math.abs(semi(cf[Math.floor(k / slots)]) - semi(counter[k])) % 12;
    const consonant = (k: number) => PERFECT_CONSONANCES.has(ic(k)) || IMPERFECT_CONSONANCES.has(ic(k));
    const step = (from: number, to: number) => semi(counter[to]) - semi(counter[from]);
    const isStep = (d: number) => d !== 0 && Math.abs(d) <= 2;
    const total = Math.min(counter.length, cf.length * slots);
    const len = Math.ceil(total / slots);

    // A dissonance that is a suspension: tied from a consonant preparation and resolved
    // down by step to a consonance
    const isSuspension = (k: number) =>
      k > 0 && k + 1 < total && step(k - 1, k) === 0 && consonant(k - 1)
      && (step(k, k + 1) === -1 || step(k, k + 1) === -2) && consonant(k + 1);

    for (let i = 0; i < len; i++) {
      const k = i * slots;
      const cfNote = cf[i];
      const ctNote = counter[k];
      const interval = ic(k);

      if (!consonant(k) && !((species === 4 || species === 5) && isSuspension(k))) {
        issues.push({ type: 'Dissonance on Strong Beat', beat: k + 1, description: `Beat ${k + 1}: interval ${interval} semitones is dissonant on a strong beat.` });
      }

      // Parallel 5ths and octaves between consecutive strong slots
      if (i > 0) {
        const prevCF = cf[i - 1];
        const prevCT = counter[k - slots];
        const prevInterval = Math.abs(semi(prevCF) - semi(prevCT)) % 12;
        const motion = motionType(semi(prevCF), semi(cfNote), semi(prevCT), semi(ctNote));

        if ((interval === 7 || interval === 0) && prevInterval === interval && motion === 'parallel') {
          const label = interval === 7 ? 'Parallel 5th' : 'Parallel Octave';
          issues.push({ type: label, beat: k + 1, description: `Beat ${k + 1}: ${label} detected.` });
        }

        // Hidden 5ths/octaves (similar motion into a perfect consonance) - 1st species only
        if (species === 1 && (interval === 7 || interval === 0) && motion === 'similar') {
          const label = interval === 7 ? 'Hidden 5th' : 'Hidden Octave';
          issues.push({ type: label, beat: k + 1, description: `Beat ${k + 1}: ${label} (similar motion into perfect consonance).` });
        }
      }

      // Unison not allowed except at beginning and end
      if (interval === 0 && i > 0 && i < len - 1) {
        issues.push({ type: 'Interior Unison', beat: k + 1, description: `Beat ${k + 1}: unison allowed only at start and end.` });
      }
    }

    // Weak slots
    for (let k = 0; k < total; k++) {
      if (k % slots === 0 || consonant(k)) continue;
      if (species === 4) {
        issues.push({ type: 'Dissonance', beat: k + 1, description: `Beat ${k + 1}: the weak beat of the 4th species must be consonant.` });
        continue;
      }
      // passing or neighbour note: approached and left by step (in the 5th species a held
      // note repeats its pitch, so the approach may be a repetition)
      const approached = k > 0 && (isStep(step(k - 1, k)) || (species === 5 && step(k - 1, k) === 0));
      const left = k + 1 < total && isStep(step(k, k + 1));
      if (!(approached && left) && !(species === 5 && isSuspension(k))) {
        issues.push({ type: 'Dissonance', beat: k + 1, description: `Beat ${k + 1}: dissonant interval ${ic(k)} is not a passing or neighbour note.` });
      }
    }

    if (mode) modalChecks(mode, cf, counter, issues);

    return issues;
  }
}

/**
 * Canon and imitation detection / generation tools.
 * @category Post-tonal
 */
export class Canon {
  /**
   * Detects imitative entries between voices.
   * Returns matches: which voice, at what beat offset, what transposition, whether inverted.
   */
  static detectImitation(voices: Note[][]): {
    /** Index of the imitating voice (the first voice is the model). */
    voice: number;
    /** Note index in that voice where the imitation starts. */
    offset: number;
    /** Steps from the model's first note to the imitation's first note. */
    transposition: number;
    /** The imitation moves by inverted intervals. */
    inversion: boolean;
  }[] {
    if (voices.length < 2) return [];
    const results: { voice: number; offset: number; transposition: number; inversion: boolean }[] = [];

    const ref = voices[0];
    const refIntervals = ref.slice(1).map((n, i) => n.stepsFromBase - ref[i].stepsFromBase);

    for (let v = 1; v < voices.length; v++) {
      const voice = voices[v];
      const voiceIntervals = voice.slice(1).map((n, i) => n.stepsFromBase - voice[i].stepsFromBase);

      // Try each offset
      for (let offset = 0; offset < voice.length; offset++) {
        const len = Math.min(refIntervals.length, voiceIntervals.length - offset);
        if (len < 2) continue;

        const matches = refIntervals.slice(0, len).every((iv, i) => iv === voiceIntervals[i + offset]);
        if (matches) {
          const transposition = voice[offset].stepsFromBase - ref[0].stepsFromBase;
          results.push({ voice: v, offset, transposition, inversion: false });
        }

        // Inverted
        const matchesInv = refIntervals.slice(0, len).every((iv, i) => -iv === voiceIntervals[i + offset]);
        if (matchesInv) {
          const transposition = voice[offset].stepsFromBase - ref[0].stepsFromBase;
          results.push({ voice: v, offset, transposition, inversion: true });
        }
      }
    }
    return results;
  }

  /**
   * Generates a two-voice canon from a theme.
   * @param theme - The theme notes.
   * @param interval - Transposition interval in steps for the follower voice.
   * @param delay - Entry delay in number of notes.
   * @param inversion - If true, the follower uses the melodic inversion.
   * @returns `[leader, follower]`, both `theme.length + delay` long: the follower opens with
   *   `delay` rests (`null`) and the leader ends with as many, so index i sounds together.
   */
  static generateCanon(theme: Note[], interval: number, delay: number, inversion = false): (Note | null)[][] {
    if (theme.length === 0) return [[], []];

    const leader = theme;
    let follower: Note[];
    if (inversion) {
      follower = [];
      let prevOrigStep = theme[0].stepsFromBase;
      let prevFolStep = theme[0].stepsFromBase + interval;
      follower.push(new (theme[0].constructor as new (ts: Note['tuningSystem'], step: number) => Note)(theme[0].tuningSystem, prevFolStep));
      for (let i = 1; i < theme.length; i++) {
        const diff = theme[i].stepsFromBase - prevOrigStep;
        prevFolStep -= diff; // mirror the interval
        follower.push(new (theme[i].constructor as new (ts: Note['tuningSystem'], step: number) => Note)(theme[i].tuningSystem, prevFolStep));
        prevOrigStep = theme[i].stepsFromBase;
      }
    } else {
      follower = theme.map(n => new (n.constructor as typeof Note)(n.tuningSystem, n.stepsFromBase + interval) as Note);
    }

    // Rests: the follower enters `delay` notes after the leader
    const rests: null[] = Array(Math.max(0, delay)).fill(null);
    return [[...leader, ...rests], [...rests, ...follower]];
  }
}
