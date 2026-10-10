/**
 * Tests for lib/music-theory/twelve-tone.ts.
 */
import { describe, it, expect } from 'vitest';
import { ToneRow } from '../../lib/music-theory/twelve-tone';

const SIMPLE_ROW = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe('ToneRow', () => {
  const berg = [7, 10, 2, 6, 9, 0, 4, 8, 11, 1, 3, 5]; // Berg Violin Concerto: G Bb D F# A C E G# B C# D# F

  it('labels forms by their first pitch class; the row is P(row[0])', () => {
    const row = new ToneRow(berg);
    expect(row.P(7)).toEqual(berg);
    expect(row.R()).toEqual([...berg].reverse());
  });

  it('standard matrix: first row the row, first column its inversion, columns are I forms', () => {
    const row = new ToneRow(berg);
    const m = row.getMatrix();
    expect(m[0]).toEqual(berg);
    for (let j = 0; j < 12; j++) expect(m.map(r => r[j])).toEqual(row.I(m[0][j]));
  });

  it('isCombinatorial finds real hexachordal combinatoriality', () => {
    expect(new ToneRow([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).isCombinatorial()).toBe('P'); // P(6) opens with 6..11
    // first hexachord {0,1,2,3,4,6} inverts onto the second: I-combinatorial
    expect(new ToneRow([0, 1, 3, 2, 6, 4, 5, 7, 8, 9, 10, 11]).isCombinatorial()).toBe('I');
    // a Z hexachord (6-Z36) is not its own complement's transform: never combinatorial
    expect(new ToneRow([0, 1, 2, 3, 4, 7, 5, 6, 8, 9, 10, 11]).isCombinatorial()).toBe(null);
  });
});

describe('ToneRow', () => {
  it('constructs from valid row', () => {
    expect(() => new ToneRow(SIMPLE_ROW)).not.toThrow();
  });

  it('throws for duplicate pitch classes', () => {
    expect(() => new ToneRow([0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toThrow();
  });

  it('throws for wrong length', () => {
    expect(() => new ToneRow([0, 1, 2])).toThrow();
  });

  it('P(0) returns original row', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(row.P(0)).toEqual(SIMPLE_ROW);
  });

  it('P(n) transposes correctly', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const p3 = row.P(3);
    expect(p3[0]).toBe(3);
    expect(p3.every(p => p >= 0 && p <= 11)).toBe(true);
    expect(new Set(p3).size).toBe(12);
  });

  it('R() reverses P(0)', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(row.R()).toEqual([...SIMPLE_ROW].reverse());
  });

  it('I(0) starts on same pitch as P(0)', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(row.I(0)[0]).toBe(SIMPLE_ROW[0]);
  });

  it('I(0) inverts intervals', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const inv = row.I(0);
    // SIMPLE_ROW intervals are all +1; inversion should be all -1 (i.e., 11 mod 12)
    for (let i = 1; i < 12; i++) {
      expect(((inv[i] - inv[i - 1]) % 12 + 12) % 12).toBe(11);
    }
  });

  it('RI(0) contains all 12 unique pitch classes', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const ri = row.RI(0);
    expect(new Set(ri).size).toBe(12);
    expect(ri[0]).toBe(0); // starts at transposition 0
  });

  it('getMatrix returns 12x12 array', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const matrix = row.getMatrix();
    expect(matrix).toHaveLength(12);
    expect(matrix[0]).toHaveLength(12);
  });

  it('getHexachords splits row at midpoint', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const [h1, h2] = row.getHexachords();
    expect(h1).toHaveLength(6);
    expect(h2).toHaveLength(6);
    expect([...h1, ...h2]).toEqual(SIMPLE_ROW);
  });

  it('isAllInterval returns boolean', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(typeof row.isAllInterval()).toBe('boolean');
  });

  it('isCombinatorial returns null or string', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const result = row.isCombinatorial();
    expect(result === null || ['P', 'I', 'RI'].includes(result!)).toBe(true);
  });
});
