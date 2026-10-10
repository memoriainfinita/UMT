import { describe, it, expect } from 'vitest';
import { Tonnetz } from '../../lib/music-theory/tonnetz';
import { parseNote, parseChordSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { EDO, JustIntonation } from '../../lib/music-theory/tuning';
import { MOS, CommaPump } from '../../lib/music-theory/mos';
import { FiveLimitJI } from '../../lib/music-theory/presets';
import { Chord } from '../../lib/music-theory/chord';
import { Xen } from '../../lib/music-theory/xen';

describe('Tonnetz', () => {
  it('every pitch class once in x 0..3, y 0..2, with pc = 7x + 4y', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 12; s++) {
      const { x, y } = Tonnetz.getPosition(new Note(new EDO(12), s));
      expect(((7 * x + 4 * y) % 12)).toBe(s);
      seen.add(`${x},${y}`);
    }
    expect(seen.size).toBe(12);
    const c = Tonnetz.getPosition(parseNote('C4'));
    expect([c.x, c.y]).toEqual([1, 2]);
  });

  it('neighbors sit next to the note', () => {
    const a = Tonnetz.getPosition(parseNote('A4'));
    const ns = Tonnetz.neighbors(parseNote('A4'));
    expect(ns.map(n => Math.abs(n.x - a.x) + Math.abs(n.y - a.y))).toEqual([1, 1, 1, 1, 2, 2]);
    expect(ns.map(n => n.note.stepsFromBase)).toEqual([7, -7, 4, -4, 3, -3]);
  });

  it('pathBetween C and Am: common tones are one position, G moves one step to a tone of Am', () => {
    const path = Tonnetz.pathBetween(parseChordSymbol('C'), parseChordSymbol('Am'));
    expect(path.map(p => p.note.stepsFromBase)).toEqual([-9, -5, -2, -9]); // C4, E4, G4 → C4 (down a fifth)
    expect(Math.abs(path[3].x - path[2].x) + Math.abs(path[3].y - path[2].y)).toBe(1);
  });

  it('other tunings use the nearest 12-TET pitch class', () => {
    const e24 = new Note(new EDO(24), 14); // 700 cents above A = E
    expect([Tonnetz.getPosition(e24).x, Tonnetz.getPosition(e24).y]).toEqual([1, 0]);
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
