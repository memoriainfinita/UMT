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
