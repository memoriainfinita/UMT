/**
 * Tests for lib/music-theory/chord-names.ts.
 */
import { describe, it, expect } from 'vitest';
import { formatChordSymbol, chordLongName, localizeNoteName } from '../../lib/music-theory/chord-names';
import { parseChordSymbol } from '../../lib/music-theory/parser';

describe('formatChordSymbol', () => {
  it('Cmaj7 / CΔ7 / CM7', () => {
    expect(formatChordSymbol('Cmaj7')).toBe('Cmaj7');
    expect(formatChordSymbol('Cmaj7', { style: 'symbols' })).toBe('CΔ7');
    expect(formatChordSymbol('Cmaj7', { style: 'short' })).toBe('CM7');
    expect(formatChordSymbol(parseChordSymbol('Ebmaj9'), { style: 'short' })).toBe('EbM9');
  });

  it('jazz symbols for minor, half-diminished, diminished, augmented', () => {
    const sym = (s: string) => formatChordSymbol(s, { style: 'symbols' });
    expect(sym('Cm7')).toBe('C-7');
    expect(sym('Cm')).toBe('C-');
    expect(sym('Cm7b5')).toBe('Cø7');
    expect(sym('Cdim7')).toBe('C°7');
    expect(sym('Cdim')).toBe('C°');
    expect(sym('Caug')).toBe('C+');
    expect(sym('CmM7')).toBe('C-Δ7');
    expect(sym('C7/E')).toBe('C7/E');
    expect(sym('C7#9')).toBe('C7#9');
  });

  it('roots and bass in solfège', () => {
    expect(formatChordSymbol('F#m7b5', { style: 'symbols', roots: 'solfege' })).toBe('Fa#ø7');
    expect(formatChordSymbol('Bbmaj7/D', { roots: 'solfege' })).toBe('Sibmaj7/Re');
  });
});

describe('chordLongName', () => {
  it('English and Spanish', () => {
    expect(chordLongName('Cmaj7')).toBe('C major seventh');
    expect(chordLongName('Cmaj7', 'es')).toBe('Do séptima mayor');
    expect(chordLongName('G7', 'es')).toBe('Sol séptima');
    expect(chordLongName('F#m', 'es')).toBe('Fa sostenido menor');
    expect(chordLongName('Bbm7b5')).toBe('B flat half-diminished seventh');
    expect(chordLongName('Bdim7', 'es')).toBe('Si séptima disminuida');
  });

  it('slash bass; other qualities keep their symbol', () => {
    expect(chordLongName('C/E')).toBe('C major over E');
    expect(chordLongName('C/E', 'es')).toBe('Do mayor con bajo en Mi');
    expect(chordLongName('C7#9', 'es')).toBe('Do 7#9');
  });
});

describe('localizeNoteName', () => {
  it('short and long, with octave', () => {
    expect(localizeNoteName('Bb3', 'es')).toBe('Sib3');
    expect(localizeNoteName('Bb3', 'es', true)).toBe('Si bemol 3');
    expect(localizeNoteName('F##', 'en', true)).toBe('F double sharp');
    expect(() => localizeNoteName('H', 'es')).toThrow(RangeError);
  });
});
