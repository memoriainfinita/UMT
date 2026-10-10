import { Note } from './note';
import { EDO } from './tuning';
import { preferFlatsForKey, NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP } from './utils';

/** A pair of key profiles: weights of the 12 pitch classes above the tonic, major and minor. */
export interface KeyProfile {
  major: readonly number[];
  minor: readonly number[];
  source: string;
}

/**
 * Key profiles for correlation key finding, as listed by Craig Sapp for Humdrum's `keycor`
 * (extras.humdrum.org/man/keycor). Index 0 is the tonic.
 */
export const KEY_PROFILES = {
  krumhansl: {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
    source: 'Krumhansl and Kessler probe-tone ratings (Krumhansl, Cognitive Foundations of Musical Pitch, 1990)',
  },
  aarden: {
    major: [17.7661, 0.145624, 14.9265, 0.160186, 19.8049, 11.3587, 0.291248, 22.062, 0.145624, 8.15494, 0.232998, 4.95122],
    minor: [18.2648, 0.737619, 14.0499, 16.8599, 0.702494, 14.4362, 0.702494, 18.6161, 4.56621, 1.93186, 7.37619, 1.75623],
    source: 'Aarden-Essen continuity profiles (Aarden, Dynamic Melodic Expectancy, 2003)',
  },
  bellman: {
    major: [16.80, 0.86, 12.95, 1.41, 13.49, 11.93, 1.25, 20.28, 1.80, 8.04, 0.62, 10.57],
    minor: [18.16, 0.69, 12.99, 13.34, 1.07, 11.15, 1.38, 21.07, 7.49, 1.53, 0.92, 10.21],
    source: 'Bellman-Budge chord-based profiles (Bellman, CMMR 2005)',
  },
  temperley: {
    major: [0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400],
    minor: [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330],
    source: 'Temperley-Kostka-Payne chord-based profiles (Temperley, Music and Probability, 2007)',
  },
  simple: {
    major: [2, 0, 1, 0, 1, 1, 0, 2, 0, 1, 0, 1],
    minor: [2, 0, 1, 1, 0, 1, 0, 2, 1, 0, 0.5, 0.5],
    source: 'Simple weights (Sapp, Key-Profile Comparisons in Key-Finding by Correlation, ICMPC 2008)',
  },
} as const satisfies Record<string, KeyProfile>;

/** Name of a preset in `KEY_PROFILES`. */
export type KeyProfileName = keyof typeof KEY_PROFILES;

/** Options for key detection. */
export interface KeyDetectionOptions {
  /** Key profile to correlate with (default `'krumhansl'`), or a custom pair. */
  profile?: KeyProfileName | KeyProfile;
}

/**
 * Key Detection Module
 * Implements correlation key finding (Krumhansl-Schmuckler) with a choice of key profiles.
 */
export class KeyDetection {
  // Statistical profiles of pitch class distributions in major and minor keys
  // Krumhansl-Kessler, the default (KEY_PROFILES.krumhansl)
  static readonly majorProfile = [...KEY_PROFILES.krumhansl.major];
  static readonly minorProfile = [...KEY_PROFILES.krumhansl.minor];

  /**
   * Detects the most likely key based on an array of notes.
   * Each note counts once, or by its duration when `durations` is given (as in the original
   * Krumhansl-Schmuckler algorithm). Notes outside 12-TET count for the nearest 12-TET pitch class.
   * @param notes - The notes to analyse.
   * @param durations - Optional duration of each note, in any unit (only proportions matter).
   * @param options - `profile`: which key profile to correlate with (default Krumhansl-Kessler).
   * @returns Array of possible keys sorted by confidence (Pearson correlation coefficient).
   * @throws RangeError if `durations` does not match `notes` in length, or holds a negative or non-finite value.
   */
  static detect(notes: Note[], durations?: readonly number[], options: KeyDetectionOptions = {}): { key: string, confidence: number }[] {
    if (durations !== undefined && durations.length !== notes.length) {
      throw new RangeError(`KeyDetection.detect: ${notes.length} notes but ${durations.length} durations`);
    }
    const histogram = new Array(12).fill(0);
    notes.forEach((note, i) => {
      histogram[this.pitchClass(note)] += durations ? durations[i] : 1;
    });
    return this.detectFromHistogram(histogram, options);
  }

  /**
   * Detects the most likely key from a pitch class histogram (index 0 = C, 1 = C#/Db, … 11 = B),
   * e.g. total durations per pitch class accumulated over a piece.
   * @param weights - 12 non-negative weights.
   * @param options - `profile`: which key profile to correlate with (default Krumhansl-Kessler).
   * @returns Array of possible keys sorted by confidence; empty when all weights are 0.
   * @throws RangeError if there are not 12 weights, or one is negative or non-finite.
   */
  static detectFromHistogram(weights: readonly number[], options: KeyDetectionOptions = {}): { key: string, confidence: number }[] {
    if (weights.length !== 12) {
      throw new RangeError(`KeyDetection.detectFromHistogram: expected 12 weights, got ${weights.length}`);
    }
    if (weights.some(w => !Number.isFinite(w) || w < 0)) {
      throw new RangeError('KeyDetection: weights and durations must be finite and non-negative');
    }
    if (weights.every(w => w === 0)) return [];
    const profile = typeof options.profile === 'object' ? options.profile : KEY_PROFILES[options.profile ?? 'krumhansl'];
    if (!profile || profile.major.length !== 12 || profile.minor.length !== 12) {
      throw new RangeError('KeyDetection: a key profile needs 12 major and 12 minor weights');
    }

    // Profiles and note names are indexed from A (0 = A, 3 = C).
    const histogram = weights.map((_, j) => weights[(j + 9) % 12]);
    const results: { key: string, confidence: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const flatName = NOTE_NAMES_12TET_FLAT[i];
      // Choose canonical spelling (sharp or flat) based on circle-of-fifths key signature.
      const majorPf = preferFlatsForKey(flatName, 'major');
      const minorPf = preferFlatsForKey(flatName, 'minor');
      const majorName = majorPf ? flatName : NOTE_NAMES_12TET_SHARP[i];
      const minorName = minorPf ? flatName : NOTE_NAMES_12TET_SHARP[i];

      const rMaj = this.pearsonCorrelation(histogram, this.shiftProfile(profile.major, i));
      results.push({ key: `${majorName} Major`, confidence: rMaj });

      const rMin = this.pearsonCorrelation(histogram, this.shiftProfile(profile.minor, i));
      results.push({ key: `${minorName} Minor`, confidence: rMin });
    }

    // Sort by confidence descending
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /** 12-TET pitch class (0 = C); other tunings round the note's frequency to the nearest semitone. */
  private static pitchClass(note: Note): number {
    const semitonesFromA4 = note.tuningSystem instanceof EDO && note.tuningSystem.divisions === 12
      ? note.stepsFromBase
      : Math.round(12 * Math.log2(note.frequency / 440));
    return (((semitonesFromA4 + 9) % 12) + 12) % 12;
  }

  private static shiftProfile(profile: readonly number[], shift: number): number[] {
    return [...profile.slice(12 - shift), ...profile.slice(0, 12 - shift)];
  }

  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }
}
