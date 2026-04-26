/**
 * Xenharmonic / just intonation chord analysis tools.
 * Detects otonal/utonal chords, neutral triads, and essentially-just structures.
 */
import { Chord } from './chord';
import { Note } from './note';
import { JustIntonation } from './tuning';

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
   * Tests whether a chord's intervals correspond to an otonal (harmonic series) structure.
   * An otonal chord uses partials n, m, p, ... of a common fundamental.
   *
   * @param chord - The chord to test.
   * @param harmonicLimit - Maximum partial number to consider (default 7).
   */
  static detectOtonal(chord: Chord, harmonicLimit = 7): { isOtonal: boolean; harmonics: number[] } {
    const ts = chord.tuningSystem;
    const notes = chord.getNotes();
    if (notes.length === 0) return { isOtonal: false, harmonics: [] };

    const baseFreq = notes[0].frequency;
    const harmonics: number[] = [];

    for (const note of notes) {
      const ratio = note.frequency / baseFreq;
      // Try to find integer n/m within harmonicLimit such that n/m ≈ ratio
      let found = false;
      for (let n = 1; n <= harmonicLimit; n++) {
        if (Math.abs(ratio * 1 - n) < 0.05 || Math.abs(ratio - n) < 0.05) {
          harmonics.push(n);
          found = true;
          break;
        }
        for (let m = 1; m <= harmonicLimit; m++) {
          if (Math.abs(ratio - n / m) < 0.02) {
            harmonics.push(n);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) return { isOtonal: false, harmonics: [] };
    }

    return { isOtonal: harmonics.length === notes.length, harmonics };
  }

  /**
   * Tests whether a chord's intervals correspond to a utonal (subharmonic series) structure.
   * A utonal chord uses subpartials 1/n, 1/m, 1/p, ... of a common overtone.
   */
  static detectUtonal(chord: Chord, harmonicLimit = 7): { isUtonal: boolean; subharmonics: number[] } {
    const ts = chord.tuningSystem;
    const notes = chord.getNotes().reverse(); // flip: utonal starts from highest note
    if (notes.length === 0) return { isUtonal: false, subharmonics: [] };

    const topFreq = notes[0].frequency;
    const subharmonics: number[] = [];

    for (const note of notes) {
      const ratio = topFreq / note.frequency;
      let found = false;
      for (let n = 1; n <= harmonicLimit; n++) {
        if (Math.abs(ratio - n) < 0.05) {
          subharmonics.push(n);
          found = true;
          break;
        }
      }
      if (!found) return { isUtonal: false, subharmonics: [] };
    }

    return { isUtonal: subharmonics.length === notes.length, subharmonics };
  }

  /**
   * Returns the closest essentially-just chord name and ratios for a chord in a JI tuning.
   * Matches the chord's interval structure against common JI ratios.
   */
  static getEssentiallyJustChord(
    chord: Chord,
    _tuning: JustIntonation
  ): { name: string; ratios: [number, number][] } {
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
