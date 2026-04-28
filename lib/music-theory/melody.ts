import { Note } from './note';

export interface Motif {
  start: number;
  length: number;
  intervals: number[];
}

/**
 * Melodic analysis tools.
 */
export class MelodyAnalysis {
  /**
   * Returns the contour of a melody as a sequence of direction symbols.
   * `'+'` = ascending, `'-'` = descending, `'='` = repeated pitch.
   */
  static getContour(notes: Note[]): ('+' | '-' | '=')[] {
    const result: ('+' | '-' | '=')[] = [];
    for (let i = 1; i < notes.length; i++) {
      const diff = notes[i].stepsFromBase - notes[i - 1].stepsFromBase;
      result.push(diff > 0 ? '+' : diff < 0 ? '-' : '=');
    }
    return result;
  }

  /**
   * Returns a histogram of interval classes between consecutive notes.
   * Keys are interval sizes in steps (signed); values are occurrence counts.
   */
  static getIntervalHistogram(notes: Note[]): Map<number, number> {
    const map = new Map<number, number>();
    for (let i = 1; i < notes.length; i++) {
      const iv = notes[i].stepsFromBase - notes[i - 1].stepsFromBase;
      map.set(iv, (map.get(iv) ?? 0) + 1);
    }
    return map;
  }

  /**
   * Finds recurring interval patterns (motifs) in a melody.
   * Returns motifs sorted by frequency of occurrence.
   * @param notes - Melody notes.
   * @param minLength - Minimum motif length in notes (default 3).
   */
  static findMotifs(notes: Note[], minLength = 3): Motif[] {
    if (notes.length < minLength) return [];

    const intervals = notes.slice(1).map((n, i) => n.stepsFromBase - notes[i].stepsFromBase);
    const found = new Map<string, { count: number; first: number; len: number }>();

    for (let len = minLength - 1; len <= Math.min(intervals.length, 8); len++) {
      for (let i = 0; i <= intervals.length - len; i++) {
        const pattern = intervals.slice(i, i + len);
        const key = pattern.join(',');
        if (!found.has(key)) {
          found.set(key, { count: 0, first: i, len });
        }
        found.get(key)!.count++;
      }
    }

    // Return only patterns that appear more than once
    const results: Motif[] = [];
    for (const [key, { count, first, len }] of found) {
      if (count > 1) {
        results.push({ start: first, length: len + 1, intervals: key.split(',').map(Number) });
      }
    }
    return results.sort((a, b) => b.intervals.length - a.intervals.length);
  }

  /**
   * Reduces a melody using durational weight - keeps structurally important notes.
   * Uses a simple approach: notes with longer durations are more likely to be kept.
   * @param notes - Melody notes.
   * @param durations - Duration of each note (arbitrary units). Must match notes length.
   * @returns Reduced note array (roughly half the original length).
   */
  static reduce(notes: Note[], durations: number[]): Note[] {
    if (notes.length <= 2) return [...notes];
    const len = Math.min(notes.length, durations.length);
    const indexed = Array.from({ length: len }, (_, i) => ({ note: notes[i], dur: durations[i], i }));
    // Keep first and last; sort middle by duration descending; keep top half
    const middle = indexed.slice(1, len - 1).sort((a, b) => b.dur - a.dur);
    const keepCount = Math.max(1, Math.floor(middle.length / 2));
    const kept = new Set<number>([0, len - 1, ...middle.slice(0, keepCount).map(x => x.i)]);
    return indexed.filter(x => kept.has(x.i)).sort((a, b) => a.i - b.i).map(x => x.note);
  }

  /**
   * Returns the contour reduction of a melody: only local peaks and troughs.
   * The first and last notes are always included.
   */
  static getContourReduction(notes: Note[]): Note[] {
    if (notes.length <= 2) return [...notes];
    const result: Note[] = [notes[0]];
    for (let i = 1; i < notes.length - 1; i++) {
      const prev = notes[i - 1].stepsFromBase;
      const curr = notes[i].stepsFromBase;
      const next = notes[i + 1].stepsFromBase;
      // Local peak or trough
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        result.push(notes[i]);
      }
    }
    result.push(notes[notes.length - 1]);
    return result;
  }
}
