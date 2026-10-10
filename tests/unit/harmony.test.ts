import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseNote } from '../../lib/music-theory/parser';
import { get12TETBaseName } from '../../lib/music-theory/utils';

const notes = (...names: string[]) => names.map(n => parseNote(n));

describe('Harmony.detectChords', () => {
  it('names a major triad without a suffix', () => {
    expect(Harmony.detectChords(notes('C4', 'E4', 'G4'))[0]).toBe('C');
  });

  it('names an inverted major triad as a slash chord', () => {
    expect(Harmony.detectChords(notes('E3', 'G3', 'C4'))).toContain('C/E');
  });

  it('never returns the M suffix', () => {
    const names = Harmony.detectChords(notes('F3', 'A3', 'C4', 'F4'));
    expect(names.some(n => /^[A-G][#b]?M(\/|$)/.test(n))).toBe(false);
  });
});

describe('Harmony.analyzeCadence', () => {
  it('V → VI in a minor key is deceptive', () => {
    const cad = Harmony.analyzeCadence(parseChordSymbol('E'), parseChordSymbol('F'), 'A minor');
    expect(cad).toContain('Deceptive');
  });

  it('V → vi in a major key stays deceptive', () => {
    const cad = Harmony.analyzeCadence(parseChordSymbol('G'), parseChordSymbol('Am'), 'C major');
    expect(cad).toContain('Deceptive');
  });
});

describe('Harmony.getSuggestedScales', () => {
  it('V7 into a minor chord offers phrygian dominant, not a b13 hint on the diminished scale', () => {
    const scales = Harmony.getSuggestedScales(parseChordSymbol('E7'), parseChordSymbol('Am'));
    expect(scales.map(s => s.scale)).toContain('E phrygian dominant');
    const dim = scales.find(s => s.scale === 'E half-whole diminished');
    expect(dim?.hint ?? '').not.toMatch(/b13/);
  });
});

describe('Harmony.getNegativeHarmony', () => {
  it('sets the root to the root of the chord it names', () => {
    // C major triad in C: axis between E and Eb → C minor triad
    const neg = Harmony.getNegativeHarmony(parseChordSymbol('C'), 'C major');
    expect(neg.name).toBe('Cm');
    expect(get12TETBaseName(neg.rootStep)).toBe('C');
  });

  it('a lowest note that is not the root becomes the bass', () => {
    // C E G A in C → G Eb C Bb; lowest is Bb3, the chord is C minor seventh
    const neg = Harmony.getNegativeHarmony(parseChordSymbol('C6'), 'C major');
    expect(neg.name).toBe('Cm7/Bb');
    expect(get12TETBaseName(neg.rootStep)).toBe('C');
    expect(get12TETBaseName(neg.getNotes()[0].stepsFromBase, true)).toBe('Bb');
  });

  it('keeps every reflected pitch class', () => {
    const neg = Harmony.getNegativeHarmony(parseChordSymbol('G7'), 'C major');
    // G B D F → C Ab F D
    expect(new Set(neg.getNotes().map(n => ((n.stepsFromBase % 12) + 12) % 12)))
      .toEqual(new Set([3, 11, 8, 5]));
    const pc = (s: number) => ((s % 12) + 12) % 12;
    expect(pc(neg.rootStep)).toBe(pc(parseChordSymbol(neg.name).rootStep));
  });
});
