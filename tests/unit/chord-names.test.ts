/**
 * Tests for lib/music-theory/chord-names.ts.
 */
import { describe, it, expect } from 'vitest';
import { formatChordSymbol, chordLongName, localizeNoteName, scaleName, cadenceName, substitutionTypeName } from '../../lib/music-theory/chord-names';
import { SCALE_PATTERNS } from '../../lib/music-theory/dictionaries';
import { findScalesForNotes } from '../../lib/music-theory/scale-finder';
import { Harmony } from '../../lib/music-theory/harmony';
import { getSubstitutions } from '../../lib/music-theory/substitution';
import { parseChordSymbol, parseNote } from '../../lib/music-theory/parser';

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

describe('scaleName', () => {
  it('root in solfège in Spanish, letters in English', () => {
    expect(scaleName('D dorian', 'es')).toBe('Re dórico');
    expect(scaleName('F# lydian dominant', 'es')).toBe('Fa# lidio dominante');
    expect(scaleName('A harmonic minor', 'es')).toBe('La menor armónica');
    expect(scaleName('Bb major', 'es', { roots: 'letters' })).toBe('Bb mayor');
    expect(scaleName('D dorian')).toBe('D dorian');
    expect(scaleName('A harmonic minor', 'en', { roots: 'solfege' })).toBe('La harmonic minor');
  });
  it('without a root (sourceMode, borrowedFrom)', () => {
    expect(scaleName('harmonic minor', 'es')).toBe('menor armónica');
    expect(scaleName('mixolydian', 'es')).toBe('mixolidio');
  });
  it('every SCALE_PATTERNS scale has a Spanish name, except proper names', () => {
    const kept = ['hirajoshi', 'kumoi', 'pelog', 'in', 'iwato', 'yo', 'freygish', 'blues'];
    const missing = Object.keys(SCALE_PATTERNS).filter(k => !kept.includes(k) && scaleName(k, 'es') === k);
    expect(missing).toEqual([]);
  });
  it('the scales of findScalesForNotes, getSuggestedScales and getBorrowedChords', () => {
    const found = findScalesForNotes(['C4', 'E4', 'G4', 'B4'].map(n => parseNote(n)), { limit: 3 });
    for (const f of found) expect(scaleName(f.name, 'es')).not.toMatch(/major|minor|ionian|lydian/);
    const suggested = Harmony.getSuggestedScales(parseChordSymbol('G7')).map(s => scaleName(s.scale, 'es'));
    expect(suggested).toEqual(['Sol mixolidio', 'Sol lidio dominante', 'Sol alterada']);
    const modes = new Set(Harmony.getBorrowedChords('C major').map(b => scaleName(b.sourceMode, 'es')));
    expect([...modes]).toContain('eólico');
  });
});

describe('cadenceName', () => {
  it('long form keeps the numerals; short gives the name alone', () => {
    expect(cadenceName('Deceptive Cadence (V -> vi)', 'es')).toBe('Cadencia rota (V -> vi)');
    expect(cadenceName('Deceptive Cadence (V -> vi)', 'es', { short: true })).toBe('Rota');
    expect(cadenceName('Authentic Cadence (V -> I)', 'en', { short: true })).toBe('Authentic');
    expect(cadenceName('Half Cadence (-> V)', 'es')).toBe('Semicadencia (-> V)');
    expect(cadenceName('No standard cadence', 'es')).toBe('Sin cadencia');
    expect(cadenceName('Something else', 'es')).toBe('Something else');
  });
  it('every cadence analyzeCadence returns is named in Spanish', () => {
    const pairs: [string, string, string][] = [
      ['G7', 'C', 'C major'], ['F', 'C', 'C major'], ['Fm', 'Cm', 'C minor'], ['G7', 'Am', 'C major'],
      ['Db', 'C', 'C major'], ['Bb7', 'C', 'C major'], ['C', 'G', 'C major'], ['Cm', 'C', 'C minor'],
      ['Db7', 'C', 'C major'], ['Dm', 'Em', 'C major'], ['Fm/Ab', 'G', 'C minor'],
    ];
    for (const [a, b, key] of pairs) {
      const cad = Harmony.analyzeCadence(parseChordSymbol(a), parseChordSymbol(b), key);
      expect(cadenceName(cad, 'es'), cad).not.toBe(cad);
    }
  });
});

describe('substitutionTypeName', () => {
  it('every getSubstitutions type', () => {
    expect(substitutionTypeName('tritone', 'es')).toBe('tritonal');
    expect(substitutionTypeName('chromatic-mediant')).toBe('chromatic mediant');
    expect(substitutionTypeName('chromatic-mediant', 'es')).toBe('mediante cromática');
    const types = new Set(['G7', 'C', 'Dm7'].flatMap(s => getSubstitutions(parseChordSymbol(s), 'C major').map(o => o.type)));
    for (const t of types) expect(substitutionTypeName(t, 'es')).toBeTruthy();
  });
});
