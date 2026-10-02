import { describe, it, expect } from 'vitest';
import { parseScaleSymbol } from '../../lib/music-theory/parser';
import { spellByLetter } from '../../lib/music-theory/utils';

const names = (symbol: string) => parseScaleSymbol(symbol).getNotes().map(n => n.name);
const chords = (symbol: string) => parseScaleSymbol(symbol).getDiatonicChords().map(c => c.name);

describe('heptatonic scales are spelled one letter per degree', () => {
  it('F# major uses E#', () => {
    expect(names('F# major')).toEqual(['F#4', 'G#4', 'A#4', 'B4', 'C#5', 'D#5', 'E#5', 'F#5']);
  });

  it('C# major uses E# and B#', () => {
    expect(names('C# major')).toEqual(['C#4', 'D#4', 'E#4', 'F#4', 'G#4', 'A#4', 'B#4', 'C#5']);
  });

  it('Gb major and Eb minor use Cb', () => {
    expect(names('Gb major')).toContain('Cb5');
    expect(names('Eb minor')).toContain('Cb5');
  });

  it('Cb major keeps its written root', () => {
    expect(names('Cb major')).toEqual(['Cb4', 'Db4', 'Eb4', 'Fb4', 'Gb4', 'Ab4', 'Bb4', 'Cb5']);
  });

  it('harmonic minor raises the 7th by letter (C# in D, F## in G#)', () => {
    expect(names('D harmonic minor')[6]).toBe('C#5');
    expect(names('G# harmonic minor')[6]).toBe('F##5');
  });

  it('natural keys are unchanged', () => {
    expect(names('C major')).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
    expect(names('F major')).toContain('Bb4');
  });

  it('diatonic chord roots follow the scale letters', () => {
    expect(chords('F# major')).toEqual(['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim']);
    expect(chords('D harmonic minor')[6]).toBe('C#dim');
  });

  it('non-heptatonic scales keep the flat/sharp preference', () => {
    expect(names('C pentatonic major')).toEqual(['C4', 'D4', 'E4', 'G4', 'A4', 'C5']);
  });
});

describe('spellByLetter', () => {
  it('names the step on the requested letter, octave by letter', () => {
    expect(spellByLetter(-4, 'E', 0)).toBe('E#4');   // F4 pitch
    expect(spellByLetter(-9, 'B', 0)).toBe('B#3');   // C4 pitch
    expect(spellByLetter(2, 'C', 0)).toBe('Cb5');    // B4 pitch
  });

  it('returns null beyond double accidentals', () => {
    expect(spellByLetter(-6, 'C', 0)).toBeNull();    // Eb as C###
  });
});
