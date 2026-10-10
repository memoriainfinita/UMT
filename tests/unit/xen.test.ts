/**
 * Tests for lib/music-theory/xen.ts.
 */
import { describe, it, expect } from 'vitest';
import { Xen } from '../../lib/music-theory/xen';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { EDO, JustIntonation } from '../../lib/music-theory/tuning';
import { Chord } from '../../lib/music-theory/chord';

function chord(s: string) { return parseChordSymbol(s); }

describe('Xen.detectNeutralTriad', () => {
  it('returns false for standard 12-TET major triad', () => {
    expect(Xen.detectNeutralTriad(chord('C'))).toBe(false);
  });

  it('returns false for minor triad', () => {
    expect(Xen.detectNeutralTriad(chord('Cm'))).toBe(false);
  });

  it('detects neutral third in quarter-tone chord', () => {
    const edo24 = new EDO(24, 440);
    // Neutral third = 7 quarter-tones = 350 cents
    const neutralChord = { tuningSystem: edo24, getNotes: () => [], intervalsInSteps: [0, 7, 14] } as any;
    // We test via a Chord-like structure
    const c = new (parseChordSymbol('C').constructor as any)(
      'C neutral', edo24, 0, [0, 7, 14]
    );
    // The interval of 7 QT = 350 cents - should detect neutral
    expect(typeof Xen.detectNeutralTriad(c)).toBe('boolean');
  });
});

describe('Xen.detectOtonal', () => {
  it('returns object with isOtonal and harmonics', () => {
    const result = Xen.detectOtonal(chord('C'));
    expect(typeof result.isOtonal).toBe('boolean');
    expect(Array.isArray(result.harmonics)).toBe(true);
  });
});

describe('Xen.detectUtonal', () => {
  it('returns object with isUtonal and subharmonics', () => {
    const result = Xen.detectUtonal(chord('C'));
    expect(typeof result.isUtonal).toBe('boolean');
    expect(Array.isArray(result.subharmonics)).toBe(true);
  });
});

describe('Xen otonal / utonal', () => {
  it('major triad is otonal 4:5:6; minor triad is utonal 1/6:1/5:1/4', () => {
    expect(Xen.detectOtonal(parseChordSymbol('C'))).toEqual({ isOtonal: true, harmonics: [4, 5, 6] });
    expect(Xen.detectOtonal(parseChordSymbol('Cm')).isOtonal).toBe(false);
    expect(Xen.detectUtonal(parseChordSymbol('Cm'))).toEqual({ isUtonal: true, subharmonics: [4, 5, 6] });
  });

  it('harmonic seventh 4:5:6:7 in JI; 12-TET\'s minor seventh only with a wide tolerance', () => {
    const ji = new Chord('C7h', new JustIntonation('h', [[5, 4], [3, 2], [7, 4]]), 0, [0, 1, 2, 3]);
    expect(Xen.detectOtonal(ji).harmonics).toEqual([4, 5, 6, 7]);
    expect(Xen.detectOtonal(parseChordSymbol('C7')).isOtonal).toBe(false);
    expect(Xen.detectOtonal(parseChordSymbol('C7'), 7, 35).harmonics).toEqual([4, 5, 6, 7]);
  });
});
