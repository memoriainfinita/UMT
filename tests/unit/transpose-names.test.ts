import { describe, it, expect } from 'vitest';
import { parseChordSymbol, parseScaleSymbol } from '../../lib/music-theory/parser';

describe('Chord.transpose - names', () => {
  it('moves the slash bass with the root', () => {
    expect(parseChordSymbol('C/E').transpose(2).name).toBe('D/F#');
    expect(parseChordSymbol('C/Bb').transpose(2).name).toBe('D/C');
    expect(parseChordSymbol('Cmaj7/G').transpose(5).name).toBe('Fmaj7/C');
  });
  it('keeps the name by whole octaves', () => {
    expect(parseChordSymbol('D#m').transpose(12).name).toBe('D#m');
  });
});

describe('Scale.transpose and getMode - names', () => {
  it('transpose keeps the type: C major +2 is D major', () => {
    expect(parseScaleSymbol('C major').transpose(2).name).toBe('D major');
    expect(parseScaleSymbol('D dorian').transpose(1).name).toBe('Eb dorian');
  });
  it('getMode names the mode of the family', () => {
    expect(parseScaleSymbol('C major').getMode(2).name).toBe('D dorian');
    expect(parseScaleSymbol('A minor').getMode(3).name).toBe('C ionian');
    expect(parseScaleSymbol('A harmonic minor').getMode(5).name).toBe('E phrygian dominant');
    expect(parseScaleSymbol('F# major').getMode(7).name).toBe('E# locrian');
  });
  it('a scale outside the families says which mode it is', () => {
    expect(parseScaleSymbol('C pentatonic major').getMode(2).name).toBe('D (mode 2 of C pentatonic major)');
  });
});
