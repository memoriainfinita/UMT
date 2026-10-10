/**
 * Tests for lib/music-theory/substitution.ts.
 */
import { describe, it, expect } from 'vitest';
import { getSubstitutions, SubstitutionOption } from '../../lib/music-theory/substitution';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';

function chord(symbol: string): Chord {
  return parseChordSymbol(symbol);
}

describe('getSubstitutions', () => {
  it('returns SubstitutionOption[] with type and explanation', () => {
    const opts = getSubstitutions(chord('G7'), 'C major');
    expect(opts.length).toBeGreaterThan(0);
    const first = opts[0];
    expect(first).toHaveProperty('chord');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('explanation');
    expect(first.chord).toBeInstanceOf(Chord);
    expect(typeof first.explanation).toBe('string');
  });

  it('G7 in C major: tritone sub is Db7', () => {
    const opts = getSubstitutions(chord('G7'), 'C major');
    const tritone = opts.find(o => o.type === 'tritone');
    expect(tritone).toBeDefined();
    expect(tritone!.chord.name).toBe('Db7');
  });

  it('G7 in C major: sus4 substitution is Gsus4', () => {
    const opts = getSubstitutions(chord('G7'), 'C major');
    const sus = opts.find(o => o.type === 'sus4');
    expect(sus).toBeDefined();
    expect(sus!.chord.name).toBe('Gsus4');
  });

  it('Cmaj7 in C major: diatonic sub includes Em or Em7', () => {
    const opts = getSubstitutions(chord('Cmaj7'), 'C major');
    const diatonic = opts.filter(o => o.type === 'diatonic');
    const names = diatonic.map(o => o.chord.name);
    expect(names.some(n => n.startsWith('Em'))).toBe(true);
  });

  it('Cmaj7 in C major: diatonic sub includes Am or Am7', () => {
    const opts = getSubstitutions(chord('Cmaj7'), 'C major');
    const diatonic = opts.filter(o => o.type === 'diatonic');
    const names = diatonic.map(o => o.chord.name);
    expect(names.some(n => n.startsWith('Am'))).toBe(true);
  });

  it('G7 in C major: deceptive sub is Am or Am7', () => {
    const opts = getSubstitutions(chord('G7'), 'C major');
    const deceptive = opts.find(o => o.type === 'deceptive');
    expect(deceptive).toBeDefined();
    expect(deceptive!.chord.name).toMatch(/^Am/);
  });

  const names = (symbol: string, key: string, type?: string) =>
    getSubstitutions(chord(symbol), key).filter(o => !type || o.type === type).map(o => o.chord.name);

  it('ii takes IV, and the minor subdominant family', () => {
    expect(names('Dm7', 'C major', 'diatonic')).toEqual(['Fmaj7']);
    expect(names('Dm7', 'C major', 'modal')).toEqual(['Fm7', 'Bb7', 'Dm7b5']);
  });

  it('iv borrowed in major takes the rest of its family and IV', () => {
    expect(names('Fm', 'C major')).toEqual(['Bb7', 'Dm7b5', 'F']);
  });

  it('V7 takes viiø7, and back', () => {
    expect(names('G7', 'C major', 'diatonic')).toEqual(['Bm7b5']);
    expect(names('Bm7b5', 'C major', 'diatonic')).toEqual(['G7']);
  });

  it('minor keys: i takes III and VI with the key spelling', () => {
    expect(names('Am', 'A minor', 'diatonic')).toEqual(['C', 'F']);
    expect(names('Am', 'A minor', 'modal')).toEqual([]);
  });

  it('sharp keys keep letter spelling: IV in F# major takes G#m7', () => {
    expect(names('Bmaj7', 'F# major', 'diatonic')).toEqual(['G#m7']);
    expect(names('Bmaj7', 'F# major', 'modal')).toContain('E7');   // bVII7 of F#
  });

  it('a chromatic chord gets no diatonic substitute', () => {
    expect(names('Eb', 'C major', 'diatonic')).toEqual([]);
  });
});
