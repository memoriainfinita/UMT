import { describe, it, expect } from 'vitest';
import { Tonnetz } from '../../lib/music-theory/tonnetz';
import { parseNote, parseChordSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { EDO } from '../../lib/music-theory/tuning';

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
