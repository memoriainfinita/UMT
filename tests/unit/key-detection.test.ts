import { describe, it, expect } from 'vitest';
import { KeyDetection } from '../../lib/music-theory/key-detection';
import { parseNote } from '../../lib/music-theory/parser';
import { EDO } from '../../lib/music-theory/tuning';
import { Note } from '../../lib/music-theory/note';

const notes = (names: string[]) => names.map(n => parseNote(n));
const top = (r: { key: string }[]) => r[0]?.key;

describe('KeyDetection', () => {
  it('finds C major from its scale', () => {
    expect(top(KeyDetection.detect(notes(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'])))).toBe('C Major');
  });

  it('finds A minor from its tonic triad and leading tone', () => {
    expect(top(KeyDetection.detect(notes(['A3', 'C4', 'E4', 'G#4', 'A4', 'B4', 'D4'])))).toBe('A Minor');
  });

  it('weights each note by its duration', () => {
    const melody = notes(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);
    expect(top(KeyDetection.detect(melody))).toBe('C Major');
    // Same notes with A, C and E held long: A minor.
    expect(top(KeyDetection.detect(melody, [2, 0.5, 2, 0.5, 0.5, 4, 0.5]))).toBe('A Minor');
  });

  it('gives the same result with durations of 1 as without', () => {
    const melody = notes(['D4', 'F#4', 'A4', 'G4', 'E4', 'C#5']);
    expect(KeyDetection.detect(melody, melody.map(() => 1))).toEqual(KeyDetection.detect(melody));
  });

  it('detectFromHistogram takes weights indexed from C', () => {
    // G major triad, long: G B D
    const w = new Array(12).fill(0);
    w[7] = 4; w[11] = 2; w[2] = 2; w[0] = 1; w[9] = 1; w[4] = 1; w[6] = 1;
    expect(top(KeyDetection.detectFromHistogram(w))).toBe('G Major');
  });

  it('returns nothing for no notes or zero total weight', () => {
    expect(KeyDetection.detect([])).toEqual([]);
    expect(KeyDetection.detect(notes(['C4']), [0])).toEqual([]);
  });

  it('rejects mismatched, negative or non-finite durations', () => {
    expect(() => KeyDetection.detect(notes(['C4', 'E4']), [1])).toThrow(RangeError);
    expect(() => KeyDetection.detect(notes(['C4']), [-1])).toThrow(RangeError);
    expect(() => KeyDetection.detect(notes(['C4']), [NaN])).toThrow(RangeError);
    expect(() => KeyDetection.detectFromHistogram([1, 2, 3])).toThrow(RangeError);
  });

  it('maps notes in other tunings to the nearest 12-TET pitch class', () => {
    const edo24 = new EDO(24);
    // 24-EDO steps from A4 doubled from the C major scale: same key.
    const cMajor = [-18, -14, -10, -8, -4, 0, 4].map(s => new Note(edo24, s));
    expect(top(KeyDetection.detect(cMajor))).toBe('C Major');
  });
});
