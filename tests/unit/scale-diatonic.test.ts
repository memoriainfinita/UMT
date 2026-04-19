import { describe, it, expect } from 'vitest';
import { parseScaleSymbol } from '../../lib/music-theory/parser';
import { EDO } from '../../lib/music-theory/tuning';

const names = (chords: { name: string }[]) => chords.map(c => c.name);

describe('Scale.getDiatonicChords — triads', () => {
  it('C major → C, Dm, Em, F, G, Am, Bdim', () => {
    const scale = parseScaleSymbol('C major');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  });

  it('A minor → Am, Bdim, C, Dm, Em, F, G', () => {
    const scale = parseScaleSymbol('A minor');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });

  it('D dorian → Dm, Em, F, G, Am, Bdim, C', () => {
    const scale = parseScaleSymbol('D dorian');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'C']);
  });

  it('E phrygian → Em, F, G, Am, Bdim, C, Dm', () => {
    const scale = parseScaleSymbol('E phrygian');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['Em', 'F', 'G', 'Am', 'Bdim', 'C', 'Dm']);
  });

  it('F lydian → F, G, Am, Bdim, C, Dm, Em', () => {
    const scale = parseScaleSymbol('F lydian');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['F', 'G', 'Am', 'Bdim', 'C', 'Dm', 'Em']);
  });

  it('G mixolydian → G, Am, Bdim, C, Dm, Em, F', () => {
    const scale = parseScaleSymbol('G mixolydian');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['G', 'Am', 'Bdim', 'C', 'Dm', 'Em', 'F']);
  });

  it('B locrian → Bdim, C, Dm, Em, F, G, Am', () => {
    const scale = parseScaleSymbol('B locrian');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['Bdim', 'C', 'Dm', 'Em', 'F', 'G', 'Am']);
  });

  it('Bb major uses flats → Bb, Cm, Dm, Eb, F, Gm, Adim', () => {
    const scale = parseScaleSymbol('Bb major');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim']);
  });

  it('D major uses sharps → D, Em, F#m, G, A, Bm, C#dim', () => {
    const scale = parseScaleSymbol('D major');
    expect(names(scale.getDiatonicChords('triad'))).toEqual(['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim']);
  });

  it('harmonic minor on A has augmented III and diminished vii°', () => {
    const scale = parseScaleSymbol('A harmonic minor');
    const chords = scale.getDiatonicChords('triad');
    // A, B°, Caug, Dm, E, F, G#°
    expect(chords[0].name).toBe('Am');
    expect(chords[1].name).toBe('Bdim');
    expect(chords[2].name).toBe('Caug');
    expect(chords[3].name).toBe('Dm');
    expect(chords[4].name).toBe('E');
    expect(chords[5].name).toBe('F');
    expect(chords[6].name).toBe('G#dim');
  });
});

describe('Scale.getDiatonicChords — sevenths', () => {
  it('C major → Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5', () => {
    const scale = parseScaleSymbol('C major');
    expect(names(scale.getDiatonicChords('seventh'))).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
  });

  it('A minor → Am7, Bm7b5, Cmaj7, Dm7, Em7, Fmaj7, G7', () => {
    const scale = parseScaleSymbol('A minor');
    expect(names(scale.getDiatonicChords('seventh'))).toEqual(['Am7', 'Bm7b5', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7']);
  });

  it('D dorian sevenths — V is m7, IV is dominant 7', () => {
    const scale = parseScaleSymbol('D dorian');
    const chords = names(scale.getDiatonicChords('seventh'));
    expect(chords[0]).toBe('Dm7');
    expect(chords[3]).toBe('G7');    // IV7 — characteristic of Dorian
    expect(chords[4]).toBe('Am7');   // v m7
    expect(chords[6]).toBe('Cmaj7');
  });

  it('G mixolydian sevenths — I is dominant 7', () => {
    const scale = parseScaleSymbol('G mixolydian');
    const chords = names(scale.getDiatonicChords('seventh'));
    expect(chords[0]).toBe('G7');   // I7 — characteristic of Mixolydian
    expect(chords[3]).toBe('Cmaj7');
  });

  it('defaults to triads when no type argument', () => {
    const scale = parseScaleSymbol('C major');
    expect(names(scale.getDiatonicChords())).toEqual(names(scale.getDiatonicChords('triad')));
  });
});

describe('Scale.getChordOnDegree', () => {
  it('C major degree 1 → C', () => {
    const scale = parseScaleSymbol('C major');
    expect(scale.getChordOnDegree(1).name).toBe('C');
  });

  it('C major degree 5 → G', () => {
    const scale = parseScaleSymbol('C major');
    expect(scale.getChordOnDegree(5).name).toBe('G');
  });

  it('C major degree 5 seventh → G7', () => {
    const scale = parseScaleSymbol('C major');
    expect(scale.getChordOnDegree(5, 'seventh').name).toBe('G7');
  });

  it('D dorian degree 4 → G (IV7 = G7 if seventh)', () => {
    const scale = parseScaleSymbol('D dorian');
    expect(scale.getChordOnDegree(4).name).toBe('G');
    expect(scale.getChordOnDegree(4, 'seventh').name).toBe('G7');
  });

  it('degree 7 in C major → Bdim (or Bm7b5 for seventh)', () => {
    const scale = parseScaleSymbol('C major');
    expect(scale.getChordOnDegree(7).name).toBe('Bdim');
    expect(scale.getChordOnDegree(7, 'seventh').name).toBe('Bm7b5');
  });

  it('throws on degree 0', () => {
    const scale = parseScaleSymbol('C major');
    expect(() => scale.getChordOnDegree(0)).toThrow();
  });

  it('throws on degree > scale length', () => {
    const scale = parseScaleSymbol('C major');
    expect(() => scale.getChordOnDegree(8)).toThrow();
  });

  it('throws on non-integer degree', () => {
    const scale = parseScaleSymbol('C major');
    expect(() => scale.getChordOnDegree(2.5)).toThrow();
  });
});

describe('Scale.getDiatonicChords — non-12-TET', () => {
  it('returns Chord objects with structural intervals in 19-EDO', () => {
    const TET19 = new EDO(19);
    const scale = parseScaleSymbol('C major', TET19);
    const chords = scale.getDiatonicChords('triad');
    expect(chords.length).toBe(7);
    // Each chord should have 3 intervals (root + 3rd + 5th)
    for (const c of chords) {
      expect(c.intervalsInSteps.length).toBe(3);
      expect(c.intervalsInSteps[0]).toBe(0);
    }
  });
});
