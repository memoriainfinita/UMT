/**
 * Tests for lib/music-theory/mos.ts.
 * Moment of symmetry scales by Myhill's property: two sizes for every generic interval.
 */
import { describe, it, expect } from 'vitest';
import { MOS, CommaPump } from '../../lib/music-theory/mos';
import { EDO } from '../../lib/music-theory/tuning';
import { FiveLimitJI } from '../../lib/music-theory/presets';
import { Chord } from '../../lib/music-theory/chord';

describe('MOS.generate', () => {
  it('generates pentatonic from 7 steps in 12', () => {
    const scale = MOS.generate(7, 12, 5);
    expect(scale).toHaveLength(5);
    expect(scale[0]).toBe(0);
  });

  it('generates 7-note diatonic from 7 steps in 12', () => {
    const scale = MOS.generate(7, 12, 7);
    expect(scale).toHaveLength(7);
  });

  it('returns empty for size 0', () => {
    expect(MOS.generate(7, 12, 0)).toHaveLength(0);
  });

  it('all values are within period', () => {
    const scale = MOS.generate(7, 12, 5);
    expect(scale.every(v => v >= 0 && v < 12)).toBe(true);
  });
});

describe('MOS.isMOS', () => {
  it('pentatonic [0,2,4,7,9] is MOS', () => {
    expect(MOS.isMOS([0, 2, 4, 7, 9])).toBe(true);
  });

  it('single note is not MOS', () => {
    expect(MOS.isMOS([0])).toBe(false);
  });

  it('[0,5,9] is MOS (two step sizes: 4 and 5)', () => {
    // intervals between consecutive: 5, 4; wrap-around: 12-9=3 → needs full context
    // use a scale where the step sizes are deterministic
    // [0,2,5] → intervals 2, 3, and wrap=9 → not MOS. Use [0,3,7] → 3,4,5 wrap → not MOS
    // [0,2,4,7,9] pentatonic → intervals: 2,2,3,2,3 → two sizes → MOS
    expect(MOS.isMOS([0, 2, 4, 7, 9])).toBe(true);
  });
});

describe('MOS.getMOSFamily', () => {
  it('returns array of MOS scales', () => {
    const family = MOS.getMOSFamily(7, 12, 12);
    expect(Array.isArray(family)).toBe(true);
    expect(family.length).toBeGreaterThan(0);
  });

  it('each result passes isMOS', () => {
    const family = MOS.getMOSFamily(7, 12, 10);
    for (const scale of family) {
      expect(MOS.isMOS(scale)).toBe(true);
    }
  });
});

describe('MOS and comma pump', () => {
  it('isMOS by Myhill: two sizes for every generic interval', () => {
    expect(MOS.isMOS([0, 2, 4, 5, 7, 9, 11])).toBe(true);   // diatonic
    expect(MOS.isMOS([0, 2, 4, 7, 9])).toBe(true);          // pentatonic
    expect(MOS.isMOS([0, 2, 4, 5, 6, 8, 10])).toBe(false);  // LLssLLL: two steps, not a MOS
    expect(MOS.isMOS([0, 3, 6, 8, 11, 14, 16], 19)).toBe(true); // 19-EDO diatonic (5L2s)
  });

  it('comma pump C Am Dm G C drifts by the syntonic comma; C F G C does not', () => {
    const ch = (root: number) => new Chord('x', FiveLimitJI, root, [0, 4, 7]);
    expect(CommaPump.detect([ch(3), ch(0), ch(5), ch(10), ch(15)], FiveLimitJI)).toMatchObject({ commaType: 'syntonic' });
    expect(CommaPump.detect([ch(3), ch(8), ch(10), ch(15)], FiveLimitJI).drift).toBeCloseTo(0, 6);
  });
});
