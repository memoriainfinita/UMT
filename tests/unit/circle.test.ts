import { describe, it, expect } from 'vitest';
import { CircleOfFifths } from '../../lib/music-theory/circle';

describe('CircleOfFifths.getPosition', () => {
  it('returns 0 for C major', () => {
    expect(CircleOfFifths.getPosition('C')).toBe(0);
  });
  it('returns 1 for G major', () => {
    expect(CircleOfFifths.getPosition('G')).toBe(1);
  });
  it('returns 2 for D major', () => {
    expect(CircleOfFifths.getPosition('D')).toBe(2);
  });
  it('returns 11 for F major', () => {
    expect(CircleOfFifths.getPosition('F')).toBe(11);
  });
  it('returns 0 for a minor', () => {
    expect(CircleOfFifths.getPosition('a')).toBe(0);
  });
  it('returns 3 for f# minor', () => {
    expect(CircleOfFifths.getPosition('f#')).toBe(3);
  });
  it('normalizes enharmonic Gb to F# position', () => {
    expect(CircleOfFifths.getPosition('Gb')).toBe(CircleOfFifths.getPosition('F#'));
  });
  it('returns -1 for unknown key', () => {
    expect(CircleOfFifths.getPosition('X')).toBe(-1);
  });
});

describe('CircleOfFifths.navigate', () => {
  it('1 step clockwise from C is G', () => {
    expect(CircleOfFifths.navigate('C', 1)).toBe('G');
  });
  it('1 step counter-clockwise from C is F', () => {
    expect(CircleOfFifths.navigate('C', -1)).toBe('F');
  });
  it('2 steps clockwise from C is D', () => {
    expect(CircleOfFifths.navigate('C', 2)).toBe('D');
  });
  it('wraps around: 12 steps returns same key', () => {
    expect(CircleOfFifths.navigate('G', 12)).toBe('G');
  });
  it('wraps around: -12 steps returns same key', () => {
    expect(CircleOfFifths.navigate('D', -12)).toBe('D');
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.navigate('a', 1)).toBe('e');
  });
  it('returns empty string for unknown key', () => {
    expect(CircleOfFifths.navigate('X', 1)).toBe('');
  });
});
