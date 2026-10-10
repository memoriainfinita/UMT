/**
 * Tests for lib/music-theory/notation-layout.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseKey, splitTicks, layoutMeasures } from '../../lib/music-theory/notation-layout';
import { MusicStream, Duration } from '../../lib/music-theory/rhythm';
import { parseNote } from '../../lib/music-theory/parser';

const n = (s: string) => parseNote(s);
const q = Duration.Quarter, h = Duration.Half, e = Duration.Eighth, w = Duration.Whole;

describe('notation layout', () => {
  it('parseKey: signatures of modes and minor keys', () => {
    expect(parseKey('D major').fifths).toBe(2);
    expect(parseKey('E dorian').fifths).toBe(2);
    expect(parseKey('f#').fifths).toBe(3);
    expect(parseKey('Bb minor').fifths).toBe(-5);
    expect(parseKey('Dm')).toEqual({ tonic: 'D', mode: 'minor', fifths: -1 });
    expect(() => parseKey('C blues')).toThrow(RangeError);
  });

  it('splitTicks: dotted values, ties and triplets', () => {
    expect(splitTicks(144).map(v => [v.base, v.dots])).toEqual([[96, 1]]);
    expect(splitTicks(240).map(v => v.ticks)).toEqual([192, 48]); // 5/8: half + eighth
    expect(splitTicks(32)).toEqual([{ ticks: 32, base: 48, dots: 0, triplet: true }]);
    expect(() => splitTicks(1)).toThrow(RangeError);
  });

  it('gaps become rests; overlapping events throw', () => {
    const s = new MusicStream();
    s.addEventAt(1, [n('C4')], q);
    expect(layoutMeasures(s)[0].map(ev => ev.notes.length)).toEqual([0, 1]);
    s.addEventAt(1.5, [n('D4')], q);
    expect(() => layoutMeasures(s)).toThrow(RangeError);
  });
});
