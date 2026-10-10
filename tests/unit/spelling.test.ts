import { describe, it, expect } from 'vitest';
import { spellPitchInKey, spellChord, spellChordInKey } from '../../lib/music-theory/spelling';
import { parseChordSymbol, parseNote } from '../../lib/music-theory/parser';
import { EDO } from '../../lib/music-theory/tuning';

const step = (name: string) => parseNote(name).stepsFromBase;
const inKey = (names: string[], key: string) => names.map(n => spellPitchInKey(step(n), key));

describe('spellPitchInKey', () => {
  it('scale notes take the scale letters', () => {
    expect(inKey(['Ab4', 'Db5', 'Eb5'], 'E major')).toEqual(['G#4', 'C#5', 'D#5']);
    expect(inKey(['F5'], 'F# major')).toEqual(['E#5']);   // octave follows the letter
    expect(inKey(['G#4', 'D#4'], 'C minor')).toEqual(['Ab4', 'Eb4']);
  });

  it('chromatic notes follow the harmonic chromatic scale in major', () => {
    expect(inKey(['C#4', 'D#4', 'Gb4', 'G#4', 'A#4'], 'C major')).toEqual(['Db4', 'Eb4', 'F#4', 'Ab4', 'Bb4']);
  });

  it('a minor key raises its 3rd, 6th and 7th', () => {
    expect(inKey(['Bb4', 'Db5', 'Eb5', 'Gb5', 'Ab5'], 'A minor')).toEqual(['Bb4', 'C#5', 'D#5', 'F#5', 'G#5']);
    expect(inKey(['G4'], 'G# minor')).toEqual(['F##4']);   // leading tone of G# minor
  });

  it('a chromatic note avoids a double accidental when the other letter needs fewer', () => {
    expect(inKey(['A4'], 'Db major')).toEqual(['A4']);     // not Bbb
    expect(inKey(['D4'], 'Db major')).toEqual(['D4']);     // not Ebb
    expect(inKey(['E4'], 'Db major')).toEqual(['Fb4']);    // b3, a single flat: kept
  });

  it('modes keep their own scale letters', () => {
    expect(inKey(['Gb4'], 'C lydian')).toEqual(['F#4']);
    expect(inKey(['F#4'], 'C locrian')).toEqual(['Gb4']);
  });

  it('an unknown key falls back to flats', () => {
    expect(inKey(['G#4'], 'nonsense')).toEqual(['Ab4']);
  });
});

describe('spellChord', () => {
  const names = (s: string) => spellChord(parseChordSymbol(s));

  it('names each tone by its interval above the root', () => {
    expect(names('Cm7b5')).toEqual(['C4', 'Eb4', 'Gb4', 'Bb4']);
    expect(names('C7#11')).toContain('F#5');
    expect(names('Bdim7')).toEqual(['B4', 'D5', 'F5', 'Ab5']);
    expect(names('Caug')).toEqual(['C4', 'E4', 'G#4']);
    expect(names('C7#9')).toContain('D#5');
    expect(names('E7')).toEqual(['E4', 'G#4', 'B4', 'D5']);
  });

  it('a slash bass keeps its interval name and goes first', () => {
    expect(names('C/E')).toEqual(['E3', 'C4', 'E4', 'G4']);
  });

  it('another tuning keeps getNotes names', () => {
    const c = parseChordSymbol('C', new EDO(24));
    expect(spellChord(c)).toEqual(c.getNotes().map(n => n.name));
  });
});

describe('spellChordInKey', () => {
  const inKeyName = (s: string, key: string) => spellChordInKey(parseChordSymbol(s), key).name;

  it('respells the root by the key', () => {
    expect(inKeyName('Ab7', 'A major')).toBe('G#7');
    expect(inKeyName('Gbm7b5', 'C major')).toBe('F#m7b5');
    expect(inKeyName('G#', 'C major')).toBe('Ab');
    expect(inKeyName('Abdim7', 'A minor')).toBe('G#dim7');
  });

  it('a chromatic root takes the letter that leaves fewer accidentals in the chord', () => {
    expect(inKeyName('C', 'F# major')).toBe('C');          // not B# D## F##
    expect(inKeyName('Db7', 'C major')).toBe('Db7');       // tie: the key's spelling
    expect(inKeyName('Eb', 'C major')).toBe('Eb');
  });

  it('a key-note root keeps its letter unless the other saves 3 or more accidentals', () => {
    expect(inKeyName('Gbm', 'Db major')).toBe('Gbm');        // borrowed iv: Gb Bbb Db
    expect(inKeyName('G', 'G# minor')).toBe('G');            // not F## A## C###
    expect(inKeyName('Ebmaj7', 'D# minor')).toBe('Ebmaj7');  // not D# F## A# C##
  });

  it('a chord made only of key notes is spelled as the key spells it', () => {
    expect(inKeyName('Gdim7', 'G# minor')).toBe('F##dim7');  // vii°7
    expect(inKeyName('Cdim7', 'C major')).toBe('Cdim7');
  });

  it('a slash bass follows the chord, or the key when it is not a chord tone', () => {
    expect(inKeyName('Ab/C', 'E major')).toBe('G#/B#');
    expect(inKeyName('C/E', 'E major')).toBe('C/E');
    expect(inKeyName('C/Bb', 'C major')).toBe('C/Bb');
  });

  it('keeps the chord type and pitches', () => {
    const before = parseChordSymbol('Ebm7');
    const after = spellChordInKey(before, 'D# minor');
    expect(after.name).toBe('D#m7');
    expect(after.intervalsInSteps).toEqual(before.intervalsInSteps);
  });

  it('an unknown key leaves the chord as it was', () => {
    expect(inKeyName('Ab7', 'nonsense')).toBe('Ab7');
  });
});
