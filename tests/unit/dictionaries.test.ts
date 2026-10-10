/**
 * Tests for lib/music-theory/dictionaries.ts.
 * Greek modes and Messiaen's modes of limited transposition in SCALE_PATTERNS.
 */
import { describe, it, expect } from 'vitest';
import { parseScaleSymbol } from '../../lib/music-theory/parser';
import { SCALE_PATTERNS } from '../../lib/music-theory/dictionaries';

describe('SCALE_PATTERNS Greek modes', () => {
  it('greek-dorian is defined', () => {
    expect(SCALE_PATTERNS['greek-dorian']).toBeDefined();
  });

  it('greek-phrygian is defined', () => {
    expect(SCALE_PATTERNS['greek-phrygian']).toBeDefined();
  });

  it('greek-lydian is defined', () => {
    expect(SCALE_PATTERNS['greek-lydian']).toBeDefined();
  });

  it('all 8 greek modes are defined', () => {
    const modes = ['greek-dorian', 'greek-phrygian', 'greek-lydian', 'greek-mixolydian',
                   'greek-hypodorian', 'greek-hypophrygian', 'greek-hypolydian', 'greek-hypomixolydian'];
    expect(modes.every(m => SCALE_PATTERNS[m] !== undefined)).toBe(true);
  });

  it('greek-dorian parses as a scale', () => {
    const scale = parseScaleSymbol('C greek-dorian');
    expect(scale.getNotes(1)).toHaveLength(8);
  });
});

describe('Messiaen modes in SCALE_PATTERNS', () => {
  it('messiaen-4 is defined', () => {
    expect(SCALE_PATTERNS['messiaen-4']).toBeDefined();
  });

  it('messiaen-4 has 8 notes', () => {
    const scale = parseScaleSymbol('C messiaen-4');
    expect(scale.getNotes(1)).toHaveLength(9); // 8 intervals + root repeat
  });

  it('messiaen-5 is defined', () => {
    expect(SCALE_PATTERNS['messiaen-5']).toBeDefined();
  });

  it('messiaen-6 is defined', () => {
    expect(SCALE_PATTERNS['messiaen-6']).toBeDefined();
  });

  it('messiaen-7 is defined', () => {
    expect(SCALE_PATTERNS['messiaen-7']).toBeDefined();
  });

  it('messiaen-4 sums to 12 (one octave)', () => {
    const pattern = SCALE_PATTERNS['messiaen-4'];
    expect(pattern.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it('messiaen-7 sums to 12', () => {
    const pattern = SCALE_PATTERNS['messiaen-7'];
    expect(pattern.reduce((a, b) => a + b, 0)).toBe(12);
  });
});
