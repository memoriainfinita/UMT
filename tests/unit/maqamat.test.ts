/**
 * Tests for lib/music-theory/maqamat.ts.
 * Maqam scales checked against maqamworld.com (ascending forms).
 */
import { describe, it, expect } from 'vitest';
import { MAQAMAT } from '../../lib/music-theory/maqamat';

describe('MAQAMAT', () => {
  it('exports at least 8 maqamat', () => {
    expect(Object.keys(MAQAMAT).length).toBeGreaterThanOrEqual(8);
  });

  it('each maqam has required fields', () => {
    for (const [, maqam] of Object.entries(MAQAMAT)) {
      expect(typeof maqam.name).toBe('string');
      expect(Array.isArray(maqam.ajnas)).toBe(true);
      expect(Array.isArray(maqam.notes)).toBe(true);
    }
  });

  it('rast starts on 0 and ends on 24 (octave in QT)', () => {
    const rast = MAQAMAT['rast'];
    expect(rast.notes[0]).toBe(0);
    expect(rast.notes[rast.notes.length - 1]).toBe(24);
  });

  it('each maqam notes array starts at 0', () => {
    for (const [, maqam] of Object.entries(MAQAMAT)) {
      expect(maqam.notes[0]).toBe(0);
    }
  });

  it('hijaz uses augmented 2nd (6 QT = 3 semitones)', () => {
    const hijaz = MAQAMAT['hijaz'];
    // Should contain 8 (= 4 semitones from 2 QT start) in notes
    expect(hijaz.notes).toContain(8);
  });
});

describe('Maqamat (maqamworld.com, ascending)', () => {
  it.each([
    ['rast', [0, 4, 7, 10, 14, 18, 21, 24]], ['bayati', [0, 3, 6, 10, 14, 16, 20, 24]],
    ['hijaz', [0, 2, 8, 10, 14, 16, 20, 24]], ['nahawand', [0, 4, 6, 10, 14, 16, 22, 24]],
    ['kurd', [0, 2, 6, 10, 14, 16, 20, 24]], ['saba', [0, 3, 6, 8, 14, 16, 20, 24]],
    ['sikah', [0, 3, 7, 11, 14, 17, 21, 24]], ['huzam', [0, 3, 7, 9, 15, 17, 21, 24]],
  ])('%s', (id, notes) => {
    expect(MAQAMAT[id].notes).toEqual(notes);
  });

  it('each scale starts with its first jins', () => {
    for (const m of Object.values(MAQAMAT)) {
      const first = m.ajnas[0].intervals.reduce<number[]>((acc, i) => [...acc, acc[acc.length - 1] + i], [0]);
      expect(m.notes.slice(0, first.length)).toEqual(first);
    }
  });

  it('keeps gharsa as a deprecated alias of character', () => {
    expect(MAQAMAT.rast.gharsa).toBe(MAQAMAT.rast.character);
  });
});
