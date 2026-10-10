import { describe, it, expect } from 'vitest';
import { getIntervalName, getIntervalBetween, getSemanticIntervalName } from '../../lib/music-theory/utils';

describe('getIntervalName', () => {
  it('simple intervals by their usual number; the tritone defaults to d5', () => {
    expect([0, 1, 3, 4, 5, 6, 7, 8, 11].map(s => getIntervalName(s))).toEqual(['P1', 'm2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M7']);
  });
  it('the letter distance tells A4 from d5 and A5 from m6', () => {
    expect(getIntervalName(6, true, 3)).toBe('A4');
    expect(getIntervalName(6, true, 4)).toBe('d5');
    expect(getIntervalName(8, true, 4)).toBe('A5');
    expect(getIntervalName(9, true, 6)).toBe('d7');
  });
  it('compound intervals at any size', () => {
    expect([12, 13, 15, 16, 17, 18, 21, 24, 28].map(s => getIntervalName(s))).toEqual(['P8', 'm9', 'm10', 'M10', 'P11', 'd12', 'M13', 'P15', 'M17']);
    expect(getIntervalName(18, true, 10)).toBe('A11');
  });
  it('a letter distance that cannot make the interval gives a step label', () => {
    expect(getIntervalName(6, true, 1)).toBe('Step 6');
  });
});

describe('getIntervalBetween', () => {
  it('reads the quality from the letters', () => {
    expect(getIntervalBetween('C4', 'F#4')).toBe('A4');
    expect(getIntervalBetween('C4', 'Gb4')).toBe('d5');
    expect(getIntervalBetween('E4', 'Db5')).toBe('d7');
    expect(getIntervalBetween('C4', 'E5')).toBe('M10');
    expect(getIntervalBetween('B3', 'C4')).toBe('m2');
  });
  it('is measured from the lower note', () => {
    expect(getIntervalBetween('G4', 'C4')).toBe('P5');
  });
  it('enharmonic unisons and seconds differ', () => {
    expect(getIntervalBetween('C4', 'B#3')).toBe('d2');
    expect(getIntervalBetween('C4', 'C#4')).toBe('A1');
  });
});

describe('getSemanticIntervalName', () => {
  it('simple and compound intervals', () => {
    expect(getSemanticIntervalName(400)).toBe('Major 3rd (M3)');
    expect(getSemanticIntervalName(1200)).toBe('Octave (P8)');
    expect(getSemanticIntervalName(1600)).toBe('Major 10th (M10)');
    expect(getSemanticIntervalName(1800)).toBe('Augmented 11th (A11)');
    expect(getSemanticIntervalName(2400)).toBe('Perfect 15th (P15)');
    expect(getSemanticIntervalName(3700)).toBe('Minor 23rd (m23)');
  });
  it('tritone names both spellings; far from 12-TET gives cents', () => {
    expect(getSemanticIntervalName(600)).toBe('Tritone (A4/d5)');
    expect(getSemanticIntervalName(350)).toBe('350.00 cents');
  });
});
