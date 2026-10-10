/**
 * Tests for lib/music-theory/melody.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseNote } from '../../lib/music-theory/parser';
import { MelodyAnalysis } from '../../lib/music-theory/melody';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';

function notes(steps: number[]): Note[] {
  return steps.map(s => new Note(TET12, s));
}

describe('MelodyAnalysis.findMotifs', () => {
  const n = (names: string[]) => names.map(x => parseNote(x));

  it('counts non-overlapping occurrences, sorts by frequency, drops sub-motifs', () => {
    // motif C D E repeated three times, transposed
    const m = MelodyAnalysis.findMotifs(n(['C4', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'E5', 'F#5']));
    expect(m[0]).toEqual({ start: 0, length: 3, intervals: [2, 2], occurrences: 3 });
  });

  it('overlapping repetitions are not counted twice', () => {
    const m = MelodyAnalysis.findMotifs(n(['C4', 'D4', 'C4', 'D4', 'C4']), 3);
    const cdc = m.find(x => x.intervals.join() === '2,-2');
    expect(cdc?.occurrences ?? 1).toBe(1);
  });
});

describe('MelodyAnalysis.getContour', () => {
  it('ascending melody gives all "+"', () => {
    const melody = notes([-9, -7, -5, -4, -2]);
    expect(MelodyAnalysis.getContour(melody)).toEqual(['+', '+', '+', '+']);
  });

  it('descending melody gives all "-"', () => {
    const melody = notes([2, 0, -2, -4]);
    expect(MelodyAnalysis.getContour(melody)).toEqual(['-', '-', '-']);
  });

  it('repeated note gives "="', () => {
    const melody = notes([0, 0, 1]);
    expect(MelodyAnalysis.getContour(melody)).toEqual(['=', '+']);
  });
});

describe('MelodyAnalysis.getIntervalHistogram', () => {
  it('returns a Map', () => {
    const melody = notes([-9, -7, -5]);
    expect(MelodyAnalysis.getIntervalHistogram(melody)).toBeInstanceOf(Map);
  });

  it('correct interval counts', () => {
    const melody = notes([0, 2, 4]); // +2 twice
    const hist = MelodyAnalysis.getIntervalHistogram(melody);
    expect(hist.get(2)).toBe(2);
  });
});

describe('MelodyAnalysis.findMotifs', () => {
  it('returns array', () => {
    const melody = notes([-9, -7, -5, -4, -9, -7, -5, -4]);
    expect(Array.isArray(MelodyAnalysis.findMotifs(melody))).toBe(true);
  });

  it('finds repeating pattern', () => {
    const melody = notes([-9, -7, -5, 0, -9, -7, -5, 2]);
    const motifs = MelodyAnalysis.findMotifs(melody, 2);
    expect(motifs.length).toBeGreaterThan(0);
  });
});

describe('MelodyAnalysis.reduce', () => {
  it('returns shorter or equal length melody', () => {
    const melody = notes([-9, -7, -5, -4, -2, 0]);
    const durations = [1, 1, 2, 1, 1, 2];
    const reduced = MelodyAnalysis.reduce(melody, durations);
    expect(reduced.length).toBeLessThanOrEqual(melody.length);
  });

  it('keeps first and last notes', () => {
    const melody = notes([-9, -7, -5, -4, -2]);
    const durations = [1, 1, 1, 1, 1];
    const reduced = MelodyAnalysis.reduce(melody, durations);
    expect(reduced[0].stepsFromBase).toBe(-9);
    expect(reduced[reduced.length - 1].stepsFromBase).toBe(-2);
  });
});

describe('MelodyAnalysis.getContourReduction', () => {
  it('returns peaks and troughs', () => {
    // 0,4,1,5,2,0: peaks at 4(i=1) and 5(i=3); troughs at 1(i=2) and 2(i=4)
    // first and last always included
    const melody = notes([0, 4, 1, 5, 2, 0]);
    const reduced = MelodyAnalysis.getContourReduction(melody);
    expect(reduced.length).toBeLessThan(melody.length);
    expect(reduced[0].stepsFromBase).toBe(0);
    expect(reduced[reduced.length - 1].stepsFromBase).toBe(0);
  });

  it('handles 2-note melody', () => {
    const melody = notes([0, 5]);
    expect(MelodyAnalysis.getContourReduction(melody)).toHaveLength(2);
  });
});
