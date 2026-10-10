/**
 * Melodic analysis: contour, interval histograms, motif detection, and durational reduction.
 */
import { Note } from './note';

/** A recurring interval pattern detected within a melody. */
export interface Motif {
  /** Index of the first note of the first occurrence. */
  start: number;
  /** Length in notes. */
  length: number;
  /** Intervals between consecutive notes, in steps. */
  intervals: number[];
  /** Occurrences that do not overlap one another. */
  occurrences: number;
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
   * Finds recurring interval patterns (motifs) in a melody, up to 9 notes long.
   * Occurrences are counted without overlap (in C D C D C, C-D-C occurs once). A pattern
   * that only recurs inside a longer motif, as often as it, is left out.
   * Sorted by number of occurrences, then by length (longest first).
   * @param notes - Melody notes.
   * @param minLength - Minimum motif length in notes (default 3).
   */
  static findMotifs(notes: Note[], minLength = 3): Motif[] {
    if (notes.length < minLength) return [];

    const intervals = notes.slice(1).map((n, i) => n.stepsFromBase - notes[i].stepsFromBase);
    const found = new Map<string, { count: number; first: number; len: number; lastEnd: number }>();

    for (let len = Math.max(1, minLength - 1); len <= Math.min(intervals.length, 8); len++) {
      for (let i = 0; i <= intervals.length - len; i++) {
        const key = intervals.slice(i, i + len).join(',');
        const entry = found.get(key);
        if (!entry) {
          found.set(key, { count: 1, first: i, len, lastEnd: i + len });
        } else if (i > entry.lastEnd) {
          // a new occurrence only after the last note of the previous one (no shared notes)
          entry.count++;
          entry.lastEnd = i + len;
        }
      }
    }

    const repeated = [...found].filter(([, e]) => e.count > 1);
    const results: Motif[] = repeated
      .filter(([key, e]) => !repeated.some(([other, o]) =>
        o.len > e.len && o.count >= e.count && `,${other},`.includes(`,${key},`)))
      .map(([key, e]) => ({ start: e.first, length: e.len + 1, intervals: key.split(',').map(Number), occurrences: e.count }));
    return results.sort((a, b) => b.occurrences - a.occurrences || b.length - a.length);
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
