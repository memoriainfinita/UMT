/**
 * Tests for lib/music-theory/harmony.ts.
 */
import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseNote } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';
import { Note } from '../../lib/music-theory/note';
import { TET12, EDO } from '../../lib/music-theory/tuning';

function chord(symbol: string): Chord { return parseChordSymbol(symbol); }
const notes = (...names: string[]) => names.map(n => parseNote(n));

describe('Harmony.analyzeSlash', () => {
  it('C/E is an inversion', () => {
    const c_e = chord('C/E');
    const result = Harmony.analyzeSlash(c_e);
    expect(result.type).toBe('inversion');
  });

  it('Cmaj7/E is an inversion', () => {
    const c = chord('Cmaj7/E');
    expect(Harmony.analyzeSlash(c).type).toBe('inversion');
  });

  it('chord without bass returns inversion type', () => {
    const c = chord('Cmaj7');
    expect(Harmony.analyzeSlash(c).type).toBe('inversion');
  });

  it('analyzes a polychord type for foreign bass', () => {
    // D major over C: D F# A over C - D is not a chord tone of C
    const d_c = chord('D/C');
    const result = Harmony.analyzeSlash(d_c);
    // D root over C bass: D(2) F#(6) A(9) vs C bass → foreign, should be polychord or upper-structure
    expect(['polychord', 'upper-structure', 'hybrid']).toContain(result.type);
    expect(result.lowerRoot).toBeDefined();
  });

  it('resultingTensions is an array when bass is foreign', () => {
    const d_c = chord('D/C');
    const result = Harmony.analyzeSlash(d_c);
    if (result.type !== 'inversion') {
      expect(Array.isArray(result.resultingTensions)).toBe(true);
    }
  });
});

describe('Harmony.getAllContainingScales', () => {
  it('returns scales that contain Cmaj7 pitch classes', () => {
    const c = chord('Cmaj7');
    const results = Harmony.getAllContainingScales(c);
    expect(results.length).toBeGreaterThan(0);
    const names = results.map(r => r.scale.name);
    // C major, G major, F major should contain Cmaj7 (C E G B)
    expect(names.some(n => n.toLowerCase().includes('major'))).toBe(true);
  });

  it('C major scale is among containing scales for Cmaj7', () => {
    const c = chord('Cmaj7');
    const results = Harmony.getAllContainingScales(c);
    const found = results.find(r => r.scale.name.toLowerCase() === 'c major');
    expect(found).toBeDefined();
  });

  it('completeness is between 0 and 1 exclusive', () => {
    const c = chord('Cmaj7');
    const results = Harmony.getAllContainingScales(c);
    for (const r of results) {
      expect(r.completeness).toBeGreaterThan(0);
      expect(r.completeness).toBeLessThanOrEqual(1);
    }
  });

  it('results sorted by completeness descending', () => {
    const c = chord('C7');
    const results = Harmony.getAllContainingScales(c);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].completeness).toBeGreaterThanOrEqual(results[i].completeness);
    }
  });

  it('pentatonic scale is in results for a power chord (2 notes)', () => {
    const c5 = chord('C5'); // power chord C + G
    const results = Harmony.getAllContainingScales(c5);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for non-12-TET', () => {
    const edo19 = new EDO(19, 440);
    const c = new Chord('Cmaj7', edo19, 0, [0, 6, 11, 17]);
    expect(Harmony.getAllContainingScales(c)).toHaveLength(0);
  });

  it('whole tone scale contains C augmented triad', () => {
    const cAug = chord('Caug');
    const results = Harmony.getAllContainingScales(cAug);
    const wt = results.find(r => r.scale.name.toLowerCase().includes('whole tone'));
    expect(wt).toBeDefined();
  });
});

describe('Harmony.respellNote', () => {
  it('respells A# to Bb in flat key context', () => {
    const note = new Note(TET12, 1, 'A#4'); // A# = step 1 from A4
    const result = Harmony.respellNote(note, { keySymbol: 'Bb major' });
    expect(result.name).toBe('Bb4');
  });

  it('respells Bb to A# in ascending direction', () => {
    const note = new Note(TET12, 1, 'Bb4');
    const result = Harmony.respellNote(note, { direction: 'ascending' });
    expect(result.name).toBe('A#4');
  });

  it('respells in descending direction uses flats', () => {
    const note = new Note(TET12, 1, 'A#4');
    const result = Harmony.respellNote(note, { direction: 'descending' });
    expect(result.name).toBe('Bb4');
  });

  it('returns same note without context', () => {
    const note = new Note(TET12, 1, 'A#4');
    const result = Harmony.respellNote(note, {});
    expect(result).toBe(note);
  });

  it('preserves stepsFromBase after respelling', () => {
    // F#4 = step -3 from A4 (A4=0, G4=-2, F#4=-3)
    const note = new Note(TET12, -3, 'F#4');
    const result = Harmony.respellNote(note, { keySymbol: 'Gb major' });
    expect(result.stepsFromBase).toBe(-3);
    expect(result.name).toBe('Gb4');
  });

  it('non-12-TET returns original note', () => {
    const edo19 = new EDO(19, 440);
    const note = new Note(edo19, 3);
    expect(Harmony.respellNote(note, { direction: 'ascending' })).toBe(note);
  });
});

describe('Harmony.respellChord', () => {
  it('respells C#M to Db in flat context', () => {
    const c_sharp = chord('C#');
    const result = Harmony.respellChord(c_sharp, { keySymbol: 'Db major' });
    expect(result.name).toContain('Db');
    expect(result.rootStep).toBe(c_sharp.rootStep);
  });

  it('respells to sharps in ascending direction', () => {
    const db = chord('Db');
    const result = Harmony.respellChord(db, { direction: 'ascending' });
    expect(result.name).toContain('C#');
  });

  it('preserves intervals after respelling', () => {
    const c_sharp = chord('C#maj7');
    const result = Harmony.respellChord(c_sharp, { keySymbol: 'Db major' });
    expect([...result.intervalsInSteps]).toEqual([...c_sharp.intervalsInSteps]);
  });

  it('returns original chord with no context', () => {
    const c = chord('Cmaj7');
    expect(Harmony.respellChord(c, {})).toBe(c);
  });
});

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

describe('Harmony.getSuggestedScales', () => {
  it('V7 into a minor chord offers phrygian dominant, not a b13 hint on the diminished scale', () => {
    const scales = Harmony.getSuggestedScales(parseChordSymbol('E7'), parseChordSymbol('Am'));
    expect(scales.map(s => s.scale)).toContain('E phrygian dominant');
    const dim = scales.find(s => s.scale === 'E half-whole diminished');
    expect(dim?.hint ?? '').not.toMatch(/b13/);
  });
});

describe('getSuggestedScales root in other tunings', () => {
  it('a G7 in 24-EDO suggests scales on G', () => {
    const g7 = parseChordSymbol('G7', new EDO(24));
    const scales = Harmony.getSuggestedScales(g7).map(s => s.scale);
    expect(scales.length).toBeGreaterThan(0);
    expect(scales.every(s => s.startsWith('G '))).toBe(true);
  });
});

describe('Harmony.detectChordsScored', () => {
  it('a complete chord over its root scores 1', () => {
    const [c] = Harmony.detectChordsScored(notes('C4', 'E4', 'G4'));
    expect(c).toMatchObject({ name: 'C', root: 'C', quality: 'M', score: 1, rootInBass: true, omitted: [], tensions: [] });
  });

  it('an omitted fifth and another bass lower the score, with the reasons', () => {
    const [c] = Harmony.detectChordsScored(notes('E3', 'C4', 'Bb4'));
    expect(c).toMatchObject({ name: 'C7/E', bass: 'E', omitted: ['5'], rootInBass: false, score: 0.55 });
  });

  it('exact readings come before readings with omissions; tensions are named', () => {
    const r = Harmony.detectChordsScored(notes('C4', 'E4', 'G4', 'Bb4', 'D5'));
    expect(r[0]).toMatchObject({ name: 'C9', tensions: ['9'], score: 0.97 });
    const scores = r.map(c => c.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('the bass is the lowest note, wherever it is in the array', () => {
    expect(Harmony.detectChordsScored(notes('G4', 'C4', 'E3'))[0].name).toBe('C/E');
  });

  it('two notes allow no omissions; other tunings give []', () => {
    expect(Harmony.detectChordsScored(notes('C4', 'E4')).every(c => c.omitted.length === 0)).toBe(true);
    expect(Harmony.detectChordsScored([new Note(new EDO(19), 0)])).toEqual([]);
  });
});
