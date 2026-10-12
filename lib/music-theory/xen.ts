/**
 * Xenharmonic / just intonation chord analysis tools.
 * Detects otonal/utonal chords, neutral triads, and essentially-just structures.
 */
import { Chord } from './chord';
import { JustIntonation } from './tuning';

/** Xenharmonic chord analysis: neutral triads, otonal/utonal detection, and essentially-just matching. */
export class Xen {
  /**
   * Detects whether a chord contains a neutral third (≈ 350 cents, midway between m3 and M3).
   * Indicates a non-12-TET structure typical of maqam music and neutral scales.
   */
  static detectNeutralTriad(chord: Chord): boolean {
    const ts = chord.tuningSystem;
    for (const interval of chord.intervalsInSteps) {
      const cents = ts.getInterval(interval).cents;
      const normalised = ((cents % 1200) + 1200) % 1200;
      // Neutral third is between 300 and 400 cents, but not close to 300 or 400
      if (normalised > 320 && normalised < 380) return true;
    }
    return false;
  }

  /**
   * Tests whether a chord is otonal: its notes are partials n₁ < n₂ < … of one fundamental,
   * none above `harmonicLimit` (4:5:6 major triad, 4:5:6:7 harmonic seventh).
   *
   * @param chord - The chord to test.
   * @param harmonicLimit - Highest partial number allowed (default 7).
   * @param toleranceCents - How far each note may be from its partial (default 15¢, enough
   *   for 12-TET's major third; 31¢ would admit its minor seventh as 7/4).
   * @returns The partial number of each note, lowest note first.
   */
  static detectOtonal(chord: Chord, harmonicLimit = 7, toleranceCents = 15): {
    /** Every note lies on a partial of one fundamental, within the limit and tolerance. */
    isOtonal: boolean;
    /** Partial number of each note, lowest note first (`[4, 5, 6]` for a major triad). */
    harmonics: number[];
  } {
    const freqs = chord.getNotes().map(n => n.frequency).sort((a, b) => a - b);
    const harmonics = harmonicNumbers(freqs, harmonicLimit, toleranceCents);
    return { isOtonal: harmonics !== null, harmonics: harmonics ?? [] };
  }

  /**
   * Tests whether a chord is utonal: its notes are subharmonics 1/n of one common overtone,
   * none below 1/`harmonicLimit` (1/6 : 1/5 : 1/4, the minor triad 10:12:15).
   *
   * @param chord - The chord to test.
   * @param harmonicLimit - Highest subharmonic number allowed (default 7).
   * @param toleranceCents - How far each note may be from its subharmonic (default 15¢).
   * @returns The subharmonic number of each note, highest note first.
   */
  static detectUtonal(chord: Chord, harmonicLimit = 7, toleranceCents = 15): {
    /** Every note lies on a subharmonic of one pitch, within the limit and tolerance. */
    isUtonal: boolean;
    /** Subharmonic number of each note, highest note first. */
    subharmonics: number[];
  } {
    // f = overtone / n, so the numbers n are proportional to 1 / f
    const inverse = chord.getNotes().map(n => 1 / n.frequency).sort((a, b) => a - b);
    const subharmonics = harmonicNumbers(inverse, harmonicLimit, toleranceCents);
    return { isUtonal: subharmonics !== null, subharmonics: subharmonics ?? [] };
  }

  /**
   * Returns the closest essentially-just chord (a tempered chord heard as a JI chord) and
   * its ratios: each interval of the chord, in its own tuning, goes to the nearest of a set
   * of simple 5- and 7-limit ratios.
   *
   * @param chord - The chord, in any tuning.
   * @param _tuning - Unused; kept for compatibility (the chord's own tuning is used).
   */
  static getEssentiallyJustChord(
    chord: Chord,
    _tuning?: JustIntonation
  ): {
    /** `'4:5:6 (JI major triad)'`, `'10:12:15 (JI minor triad)'`, `'4:5:6:7 (harmonic seventh chord)'` or `'Unknown JI chord'`. */
    name: string;
    /** The just ratio each interval of the chord is read as, as `[numerator, denominator]`. */
    ratios: [number, number][];
  } {
    const intervals = chord.intervalsInSteps;
    const ts = chord.tuningSystem;

    // Map each interval to nearest simple ratio
    const ratios: [number, number][] = intervals.map(step => {
      const cents = ts.getInterval(step).cents;
      const normalised = ((cents % 1200) + 1200) % 1200;

      // Common JI ratios within one octave
      const jiRatios: [number, number, number][] = [ // [num, den, cents]
        [1, 1, 0], [16, 15, 111.7], [9, 8, 203.9], [6, 5, 315.6],
        [5, 4, 386.3], [4, 3, 498.0], [7, 5, 582.5], [3, 2, 702.0],
        [8, 5, 813.7], [5, 3, 884.4], [16, 9, 996.1], [15, 8, 1088.3],
        [7, 4, 968.8], [7, 6, 266.9], [9, 7, 435.1],
      ];

      let best: [number, number] = [1, 1];
      let bestErr = Infinity;
      for (const [n, d, c] of jiRatios) {
        const err = Math.abs(normalised - c);
        if (err < bestErr) { bestErr = err; best = [n, d]; }
      }
      return best;
    });

    // Determine chord name from ratios
    const cents = ratios.map(([n, d]) => 1200 * Math.log2(n / d));
    const hasM3 = cents.some(c => Math.abs(c - 386.3) < 20);
    const hasM3pure = cents.some(c => Math.abs(c - 386.3) < 5);
    const hasm3 = cents.some(c => Math.abs(c - 315.6) < 20);
    const hasP5 = cents.some(c => Math.abs(c - 702.0) < 10);
    const hasm7 = cents.some(c => Math.abs(c - 968.8) < 20); // 7/4

    let name = 'Unknown JI chord';
    if (hasM3pure && hasP5 && hasm7) name = '4:5:6:7 (harmonic seventh chord)';
    else if (hasM3 && hasP5) name = '4:5:6 (JI major triad)';
    else if (hasm3 && hasP5) name = '10:12:15 (JI minor triad)';

    return { name, ratios };
  }
}

/**
 * Smallest whole numbers n₁ ≤ n₂ ≤ … ≤ limit proportional to `values` (ascending), each
 * within `toleranceCents`; null if there are none. Repeated notes share a number.
 */
function harmonicNumbers(values: number[], limit: number, toleranceCents: number): number[] | null {
  if (values.length === 0) return null;
  for (let base = 1; base <= limit; base++) {
    const ns = values.map(v => (v / values[0]) * base);
    const rounded = ns.map(Math.round);
    const ok = rounded.every((r, i) => r >= 1 && r <= limit && Math.abs(1200 * Math.log2(ns[i] / r)) <= toleranceCents);
    if (ok) return rounded;
  }
  return null;
}
