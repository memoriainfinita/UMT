/**
 * Tests for lib/music-theory/chord.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { TET12 } from '../../lib/music-theory/tuning';
import { Chord } from '../../lib/music-theory/chord';

describe('chord note spelling', () => {
  it('C7: b7 = Bb not A#', () => {
    const names = parseChordSymbol('C7').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('Bb');
    expect(names).not.toContain('A#');
  });
  it('Cm: m3 = Eb not D#', () => {
    const names = parseChordSymbol('Cm').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('Eb');
    expect(names).not.toContain('D#');
  });
  it('Caug: A5 = G# not Ab', () => {
    const names = parseChordSymbol('Caug').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('G#');
    expect(names).not.toContain('Ab');
  });
  it('Cmaj7#11: #11 = F# not Gb', () => {
    const names = parseChordSymbol('Cmaj7#11').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('F#');
    expect(names).not.toContain('Gb');
  });
  it('G7: b7 = F natural', () => {
    const names = parseChordSymbol('G7').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('F');
  });
  it('Bbm: m3 = Db not C#', () => {
    const names = parseChordSymbol('Bbm').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('Db');
    expect(names).not.toContain('C#');
  });
  it('A#maj7: explicit # root uses sharps, root is A# not Bb', () => {
    const names = parseChordSymbol('A#maj7').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names[0]).toBe('A#');
    expect(names).not.toContain('Bb');
  });
  it('A#m: explicit # root uses sharps (A# C# E#)', () => {
    const names = parseChordSymbol('A#m').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names[0]).toBe('A#');
    expect(names).not.toContain('Bb');
  });
});

describe('chord notes named by interval above the written root', () => {
  const names = (s: string) => parseChordSymbol(s).getNotes().map(n => n.name.replace(/-?\d+$/, ''));
  it('D#m is D# F# A#', () => expect(names('D#m')).toEqual(['D#', 'F#', 'A#']));
  it('C7#9 has D# (#9), not Eb', () => expect(names('C7#9')).toEqual(['C', 'E', 'G', 'Bb', 'D#']));
  it('Edim7 is E G Bb Db', () => expect(names('Edim7')).toEqual(['E', 'G', 'Bb', 'Db']));
  it('Cm7b5 is C Eb Gb Bb', () => expect(names('Cm7b5')).toEqual(['C', 'Eb', 'Gb', 'Bb']));
  it('Cb keeps its letter: Cb Eb Gb', () => expect(names('Cb')).toEqual(['Cb', 'Eb', 'Gb']));
  it('a slash bass outside the chord keeps its letter: C/Bb', () => expect(names('C/Bb')[0]).toBe('Bb'));
  it('a slash bass in the chord is named as the chord tone: Ab/C', () => expect(names('Ab/C')).toEqual(['C', 'Ab', 'C', 'Eb']));
  it('inversions keep the letters', () => {
    const inv = parseChordSymbol('D#m').getInversion(1).map(n => n.name);
    expect(inv).toEqual(['F#4', 'A#4', 'D#5']);
  });
});

describe('core fixes (audit 2026-10, phase 1)', () => {
  it('a Chord must start at the root', () => {
    expect(() => new Chord('x', TET12, 0, [4, 7])).toThrow(/start with 0/);
  });

  it('rootless keeps a slash bass and drops the root', () => {
    const names = parseChordSymbol('Cmaj7/E').getVoicing('rootless').map(n => n.name);
    expect(names).toEqual(['E3', 'E4', 'G4', 'B4']);
    expect(parseChordSymbol('Cmaj7').getVoicing('rootless').map(n => n.name)).toEqual(['E4', 'G4', 'B4']);
  });
});

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
