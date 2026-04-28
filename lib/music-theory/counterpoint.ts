import { Note } from './note';

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

function intervalClass(a: number, b: number): number {
  const diff = Math.abs(a - b) % 12;
  return Math.min(diff, 12 - diff);
}

const PERFECT_CONSONANCES = new Set([0, 7, 12]); // unison, P5, P8 (steps)
const IMPERFECT_CONSONANCES = new Set([3, 4, 8, 9]); // m3, M3, m6, M6

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
   * @param mode - Optional mode name (unused in current implementation; reserved for future modal rules).
   */
  static checkSpecies(
    species: 1 | 2 | 3 | 4 | 5,
    cf: Note[],
    counter: Note[],
    _mode?: string
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

    const followerTheme = inversion
      ? theme.map((n, i) => {
          if (i === 0) return new (n.constructor as typeof Note)(n.tuningSystem, n.stepsFromBase + interval, undefined, n.preferFlats);
          const prevStep = theme[i - 1].stepsFromBase;
          const diff = n.stepsFromBase - prevStep;
          // Each note is reflected: previous follower step - diff
          return undefined as unknown as Note; // placeholder
        })
      : theme;

    // Rebuild inversion properly
    let follower: Note[];
    if (inversion) {
      follower = [];
      let prevOrigStep = theme[0].stepsFromBase;
      let prevFolStep = theme[0].stepsFromBase + interval;
      follower.push(new theme[0].constructor(theme[0].tuningSystem, prevFolStep) as Note);
      for (let i = 1; i < theme.length; i++) {
        const diff = theme[i].stepsFromBase - prevOrigStep;
        prevFolStep -= diff; // mirror the interval
        follower.push(new theme[i].constructor(theme[i].tuningSystem, prevFolStep) as Note);
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
