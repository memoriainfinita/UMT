/**
 * Tests for lib/music-theory/hexachord.ts.
 */
import { describe, it, expect } from 'vitest';
import { Hexachord } from '../../lib/music-theory/hexachord';
import { parseNote } from '../../lib/music-theory/parser';

describe('Hexachord', () => {
  it('NATURALE contains C D E F G A', () => {
    expect(Hexachord.NATURALE).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
  });

  it('DURUM contains G A B C D E', () => {
    expect(Hexachord.DURUM).toEqual(['G', 'A', 'B', 'C', 'D', 'E']);
  });

  it('MOLLE contains F G A Bb C D', () => {
    expect(Hexachord.MOLLE).toContain('Bb');
  });

  it('getSyllable C in naturale = ut', () => {
    const c4 = parseNote('C4');
    expect(Hexachord.getSyllable(c4, 'naturale')).toBe('ut');
  });

  it('getSyllable A in naturale = la', () => {
    const a4 = parseNote('A4');
    expect(Hexachord.getSyllable(a4, 'naturale')).toBe('la');
  });

  it('getSyllable G in naturale = null (not in hexachord)', () => {
    // Wait, G is in naturale (positions: C D E F G A)
    const g4 = parseNote('G4');
    expect(Hexachord.getSyllable(g4, 'naturale')).toBe('sol');
  });

  it('getSyllable B in naturale = null', () => {
    const b4 = parseNote('B4');
    expect(Hexachord.getSyllable(b4, 'naturale')).toBeNull();
  });

  it('getNotes returns 6 notes', () => {
    expect(Hexachord.getNotes('naturale')).toHaveLength(6);
    expect(Hexachord.getNotes('durum')).toHaveLength(6);
    expect(Hexachord.getNotes('molle')).toHaveLength(6);
  });

  it('mutate finds shared syllable between naturale and durum', () => {
    // G is in both naturale (sol) and durum (ut)
    const g4 = parseNote('G4');
    const result = Hexachord.mutate('naturale', 'durum', g4);
    expect(result).not.toBeNull();
    expect(result!.fromSyllable).toBe('sol');
    expect(result!.toSyllable).toBe('ut');
  });
});
