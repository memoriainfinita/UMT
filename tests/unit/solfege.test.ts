/**
 * Tests for lib/music-theory/solfege.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseNote } from '../../lib/music-theory/parser';
import { Solfege } from '../../lib/music-theory/solfege';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';

describe('Solfege', () => {
  it('movable do: la-based minor and church modes', () => {
    expect(Solfege.movableDo(parseNote('A4'), 'A minor')).toBe('la');
    expect(Solfege.movableDo(parseNote('C5'), 'A minor')).toBe('do');
    expect(Solfege.movableDo(parseNote('D4'), 'D dorian')).toBe('re');
    expect(Solfege.movableDo(parseNote('G4'), 'G major')).toBe('do');
  });

  it('fromSolfege in octave 4', () => {
    expect(Solfege.fromSolfege('do', 'C major', 'fixed').name).toBe('C4');
    expect(Solfege.fromSolfege('si', 'C major', 'fixed').stepsFromBase).toBe(2); // B4
    expect(Solfege.fromSolfege('sol', 'C major').stepsFromBase).toBe(-2); // G4
    expect(Solfege.fromSolfege('la', 'A minor').stepsFromBase).toBe(0); // A4
    expect(Solfege.fromSolfege('do', 'A minor').stepsFromBase).toBe(3); // C5
  });
});

describe('Solfege.fixedDo', () => {
  it('C = do (PC 3 in UMT = A4=0)', () => {
    const c4 = parseNote('C4');
    expect(Solfege.fixedDo(c4)).toBe('do');
  });

  it('D = re', () => {
    const d4 = parseNote('D4');
    expect(Solfege.fixedDo(d4)).toBe('re');
  });

  it('A = la', () => {
    const a4 = parseNote('A4');
    expect(Solfege.fixedDo(a4)).toBe('la');
  });

  it('with preferFlats: Bb = sib', () => {
    const bb4 = new Note(TET12, 1, 'Bb4');
    expect(Solfege.fixedDo(bb4, true)).toBe('sib');
  });
});

describe('Solfege.movableDo', () => {
  it('tonic in C major = do', () => {
    const c4 = parseNote('C4');
    expect(Solfege.movableDo(c4, 'C major')).toBe('do');
  });

  it('G in C major = sol', () => {
    const g4 = parseNote('G4');
    expect(Solfege.movableDo(g4, 'C major')).toBe('sol');
  });

  it('chromatic note returns ?', () => {
    const cs4 = new Note(TET12, -8, 'C#4');
    expect(Solfege.movableDo(cs4, 'C major')).toBe('?');
  });

  it('tonic in G major = do', () => {
    const g4 = parseNote('G4');
    expect(Solfege.movableDo(g4, 'G major')).toBe('do');
  });
});

describe('Solfege.fromSolfege', () => {
  it('movable do in C major: do → C', () => {
    const note = Solfege.fromSolfege('do', 'C major', 'movable');
    // C = PC 3 in UMT
    expect(((note.stepsFromBase % 12) + 12) % 12).toBe(3);
  });

  it('movable sol in G major → D', () => {
    const note = Solfege.fromSolfege('sol', 'G major', 'movable');
    // Sol in G = D; D = PC 5 in UMT
    expect(((note.stepsFromBase % 12) + 12) % 12).toBe(5);
  });

  it('fixed do: do → C PC', () => {
    const note = Solfege.fromSolfege('do', 'C major', 'fixed');
    expect(((note.stepsFromBase % 12) + 12) % 12).toBe(3);
  });

  it('throws for unknown syllable', () => {
    expect(() => Solfege.fromSolfege('xy', 'C major')).toThrow();
  });
});
