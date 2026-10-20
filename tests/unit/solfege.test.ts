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

  it('the tonic of the key in either case', () => {
    expect(Solfege.movableDo(parseNote('E4'), 'c major')).toBe('mi');
    expect(Solfege.movableDo(parseNote('F#4'), 'f# major')).toBe('do');
    expect(Solfege.movableDo(parseNote('A4'), 'a minor')).toBe('la');
    expect(Solfege.fromSolfege('sol', 'g major').name).toBe('D5');
  });
});

describe('Solfege.movableDo with syllables: ti', () => {
  const ti = { syllables: 'ti' } as const;
  const sing = (notes: string[], key: string) => notes.map(n => Solfege.movableDo(parseNote(n), key, ti));

  it('diatonic: ti on the seventh', () => {
    expect(sing(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], 'C major')).toEqual(['do', 're', 'mi', 'fa', 'sol', 'la', 'ti']);
    expect(sing(['E#4', 'F#4'], 'F# major')).toEqual(['ti', 'do']);
  });

  it('raised and lowered degrees by the written letter', () => {
    expect(sing(['C#4', 'D#4', 'F#4', 'G#4', 'A#4'], 'C major')).toEqual(['di', 'ri', 'fi', 'si', 'li']);
    expect(sing(['Db4', 'Eb4', 'Gb4', 'Ab4', 'Bb4'], 'C major')).toEqual(['ra', 'me', 'se', 'le', 'te']);
  });

  it('la-based minor and modes', () => {
    expect(sing(['A4', 'B4', 'C5', 'G#4', 'F#4'], 'A minor')).toEqual(['la', 'ti', 'do', 'si', 'fi']);
    expect(sing(['D4', 'B4', 'Bb4'], 'D dorian')).toEqual(['re', 'ti', 'te']);
  });

  it('an alteration without a syllable is ?', () => {
    expect(sing(['Cb4', 'E#4', 'Fb4', 'B#4', 'C##4'], 'C major')).toEqual(['?', '?', '?', '?', '?']);
  });

  it('the default stays Latin and diatonic', () => {
    expect(Solfege.movableDo(parseNote('B4'), 'C major')).toBe('si');
    expect(Solfege.movableDo(parseNote('Bb4'), 'C major')).toBe('?');
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

  it('movable do: ti and the chromatic syllables', () => {
    const pc = (s: string, opts = {}) => ((Solfege.fromSolfege(s, 'C major', 'movable', opts).stepsFromBase % 12) + 12) % 12;
    expect(pc('ti')).toBe(2); // B
    expect(pc('si')).toBe(2); // B: Latin seventh
    expect(pc('si', { syllables: 'ti' })).toBe(11); // G#: raised fifth
    expect(['di', 'ri', 'fi', 'li', 'ra', 'me', 'se', 'le', 'te'].map(s => pc(s))).toEqual([4, 6, 9, 1, 4, 6, 9, 11, 1]);
  });

  it('throws for unknown syllable', () => {
    expect(() => Solfege.fromSolfege('xy', 'C major')).toThrow();
  });
});
