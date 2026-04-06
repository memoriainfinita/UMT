import { Note } from './note';
import { get12TETBaseName } from './utils';

/**
 * Key Detection Module
 * Implements the Krumhansl-Schmuckler key-finding algorithm.
 */
export class KeyDetection {
  // Statistical profiles of pitch class distributions in major and minor keys
  static majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  static minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  /**
   * Detects the most likely key based on an array of notes.
   * @returns Array of possible keys sorted by confidence (Pearson correlation coefficient).
   */
  static detect(notes: Note[]): { key: string, confidence: number }[] {
    if (notes.length === 0) return [];

    // 1. Build pitch class histogram
    const histogram = new Array(12).fill(0);
    for (const note of notes) {
      const pc = ((note.stepsFromBase % 12) + 12) % 12;
      histogram[pc] += 1;
    }

    // 2. Calculate correlations
    const results: { key: string, confidence: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const noteName = get12TETBaseName(i);

      // Major
      const rMaj = this.pearsonCorrelation(histogram, this.shiftProfile(this.majorProfile, i));
      results.push({ key: `${noteName} Major`, confidence: rMaj });

      // Minor
      const rMin = this.pearsonCorrelation(histogram, this.shiftProfile(this.minorProfile, i));
      results.push({ key: `${noteName} Minor`, confidence: rMin });
    }

    // Sort by confidence descending
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private static shiftProfile(profile: number[], shift: number): number[] {
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
