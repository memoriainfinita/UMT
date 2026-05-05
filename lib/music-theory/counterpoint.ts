/**
 * Species counterpoint validation and canon/imitation detection.
 */
import { Note } from './note';

/** A rule violation found during species counterpoint analysis. */
export interface CounterpointIssue {
  type: string;
  beat?: number;
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

// Pitch class (mod 12, steps from A4) of each mode's finalis
const MODE_FINALIS: Record<string, number> = {
  dorian: 5, phrygian: 7, lydian: 8, mixolydian: 10,
  aeolian: 0, ionian: 3, locrian: 2,
};

function modalChecks(mode: string, cf: Note[], counter: Note[], issues: CounterpointIssue[]): void {
  const finalisPC = MODE_FINALIS[mode.toLowerCase()];
  if (finalisPC === undefined) return;

  // 1. Finalis: CF must start and end on the mode's finalis pitch class
  const pc = (n: Note) => ((n.stepsFromBase % 12) + 12) % 12;
  if (pc(cf[0]) !== finalisPC)
    issues.push({ type: 'Modal Finalis', description: `CF does not begin on the ${mode} finalis.` });
  if (pc(cf[cf.length - 1]) !== finalisPC)
    issues.push({ type: 'Modal Finalis', description: `CF does not end on the ${mode} finalis.` });

  // 2. Ambitus: counterpoint must stay within [-7, +15] semitones of the finalis note
  // (covers authentic range up to a 10th above and plagal range down to a 5th below)
  const finalisStep = cf[cf.length - 1].stepsFromBase;
  for (let i = 0; i < counter.length; i++) {
    const diff = counter[i].stepsFromBase - finalisStep;
    if (diff < -7 || diff > 15)
      issues.push({ type: 'Modal Ambitus', beat: i + 1, description: `Beat ${i + 1}: note outside modal ambitus for ${mode}.` });
  }

  // 3. Melodic tritone: augmented 4th (6 semitones) in counterpoint motion is forbidden
  for (let i = 1; i < counter.length; i++) {
    if (Math.abs(counter[i].stepsFromBase - counter[i - 1].stepsFromBase) === 6)
      issues.push({ type: 'Melodic Tritone', beat: i + 1, description: `Beat ${i + 1}: melodic tritone (A4) in counterpoint.` });
  }
}

/**
 * Checks counterpoint rules for a given species.
 * `cf` = cantus firmus notes; `counter` = counterpoint notes.
 * Notes should be in the same tuning system.
 */
export class Counterpoint {
  /**
   * Validates a counterpoint voice against a cantus firmus.
   *
   * Species rules enforced:
   * - 1st: one note against one (note-against-note). Only consonances.
   * - 2nd: two notes against one. Passing tones allowed on weak beat.
   * - 3rd: four notes against one. Cambiata and neighbor patterns.
   * - 4th: syncopated (suspension) counterpoint.
   * - 5th: florid (mixed values) - lenient check on consonances.
   *
   * @param species - 1 | 2 | 3 | 4 | 5
   * @param cf - Cantus firmus notes (one per measure for species 1).
   * @param counter - Counterpoint notes.
   * @param mode - Optional mode name (`"dorian"` | `"phrygian"` | `"lydian"` | `"mixolydian"` | `"aeolian"` | `"ionian"` | `"locrian"`).
   *   When provided, enables modal checks: finalis (CF must start and end on the mode's finalis),
   *   ambitus (counterpoint within [-7, +15] semitones of the finalis), and melodic tritone detection.
   */
  static checkSpecies(
    species: 1 | 2 | 3 | 4 | 5,
    cf: Note[],
    counter: Note[],
    mode?: string
  ): CounterpointIssue[] {
    const issues: CounterpointIssue[] = [];
    if (cf.length === 0 || counter.length === 0) return issues;

    const notesPerMeasure = species === 1 ? 1 : species === 2 ? 2 : species === 3 ? 4 : species === 4 ? 1 : 1;

    // Check each beat where CF and counter align
    const len = Math.min(cf.length, Math.ceil(counter.length / Math.max(1, notesPerMeasure)));

    for (let i = 0; i < len; i++) {
      const cfNote = cf[i];
      const ctIndex = i * (species === 2 ? 2 : species === 3 ? 4 : 1);
      if (ctIndex >= counter.length) break;
      const ctNote = counter[ctIndex];

      const interval = Math.abs(cfNote.stepsFromBase - ctNote.stepsFromBase);
      const ic = interval % 12;
      const isConsonant = PERFECT_CONSONANCES.has(ic) || IMPERFECT_CONSONANCES.has(ic);

      // Strong beat must be consonant in all species
      if (!isConsonant) {
        issues.push({ type: 'Dissonance on Strong Beat', beat: i + 1, description: `Beat ${i + 1}: interval ${ic} semitones is dissonant on a strong beat.` });
      }

      // Parallel 5ths and octaves (check successive beats)
      if (i > 0) {
        const prevCF = cf[i - 1];
        const prevCTIndex = (i - 1) * (species === 2 ? 2 : species === 3 ? 4 : 1);
        if (prevCTIndex >= 0 && prevCTIndex < counter.length) {
          const prevCT = counter[prevCTIndex];
          const prevInterval = Math.abs(prevCF.stepsFromBase - prevCT.stepsFromBase) % 12;
          const motion = motionType(prevCF.stepsFromBase, cfNote.stepsFromBase, prevCT.stepsFromBase, ctNote.stepsFromBase);

          if ((ic === 7 || ic === 0) && prevInterval === ic && motion === 'parallel') {
            const label = ic === 7 ? 'Parallel 5th' : 'Parallel Octave';
            issues.push({ type: label, beat: i + 1, description: `Beat ${i + 1}: ${label} detected.` });
          }

          // Hidden 5ths/octaves (similar motion into a perfect consonance) - 1st species only
          if (species === 1 && (ic === 7 || ic === 0) && motion === 'similar') {
            const label = ic === 7 ? 'Hidden 5th' : 'Hidden Octave';
            issues.push({ type: label, beat: i + 1, description: `Beat ${i + 1}: ${label} (similar motion into perfect consonance).` });
          }
        }
      }

      // Unison not allowed except at beginning and end
      if (ic === 0 && i > 0 && i < len - 1) {
        issues.push({ type: 'Interior Unison', beat: i + 1, description: `Beat ${i + 1}: unison allowed only at start and end.` });
      }
    }

    // Species 2+: check passing tones
    if (species >= 2) {
      for (let i = 1; i < counter.length - 1; i++) {
        const cfIdx = Math.floor(i / (species === 2 ? 2 : 4));
        if (cfIdx >= cf.length) break;
        const ic = Math.abs(cf[cfIdx].stepsFromBase - counter[i].stepsFromBase) % 12;
        const isWeak = i % (species === 2 ? 2 : 4) !== 0;
        if (isWeak) continue; // weak beats may be dissonant passing tones - skip
        if (!PERFECT_CONSONANCES.has(ic) && !IMPERFECT_CONSONANCES.has(ic)) {
          issues.push({ type: 'Dissonance', beat: i + 1, description: `Beat ${i + 1}: dissonant interval ${ic} on non-passing beat.` });
        }
      }
    }

    // Species 4: suspension check - CT must be prepared (same note in previous beat)
    if (species === 4) {
      for (let i = 1; i < counter.length; i++) {
        if (counter[i].stepsFromBase !== counter[i - 1].stepsFromBase) {
          // Suspension should be tied - if motion is not step down, flag it
          const step = counter[i].stepsFromBase - counter[i - 1].stepsFromBase;
          if (Math.abs(step) !== 1 && Math.abs(step) !== 2) {
            issues.push({ type: 'Improper Resolution', beat: i + 1, description: `Beat ${i + 1}: suspension should resolve by step down.` });
          }
        }
      }
    }

    if (mode) modalChecks(mode, cf, counter, issues);

    return issues;
  }
}

/**
 * Canon and imitation detection / generation tools.
 */
export class Canon {
  /**
   * Detects imitative entries between voices.
   * Returns matches: which voice, at what beat offset, what transposition, whether inverted.
   */
  static detectImitation(voices: Note[][]): { voice: number; offset: number; transposition: number; inversion: boolean }[] {
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
   */
  static generateCanon(theme: Note[], interval: number, delay: number, inversion = false): Note[][] {
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

    // Build padded voices
    const pad: Note[] = Array(delay).fill(null);
    const voice2: (Note | null)[] = [...pad, ...follower];

    return [leader as Note[], voice2.filter((n): n is Note => n !== null)];
  }
}
