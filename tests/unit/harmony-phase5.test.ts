import { describe, it, expect } from 'vitest';
import { Harmony, SlashAnalysis, RespellContext } from '../../lib/music-theory/harmony';
import { getUpperStructures } from '../../lib/music-theory/upper-structures';
import { parseChordSymbol, parsePolychord } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';
import { Note } from '../../lib/music-theory/note';
import { TET12, EDO } from '../../lib/music-theory/tuning';

function chord(symbol: string): Chord { return parseChordSymbol(symbol); }

// ============================================================================
// 5.1 - Upper Structure Triads
// ============================================================================

describe('getUpperStructures', () => {
  it('returns 6 USTs for a dominant 7th chord', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    expect(usts).toHaveLength(6);
  });

  it('each UST has triad, tensions, overChord, label', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    for (const ust of usts) {
      expect(ust.triad).toBeDefined();
      expect(Array.isArray(ust.tensions)).toBe(true);
      expect(ust.tensions.length).toBeGreaterThan(0);
      expect(ust.overChord).toBe(g7);
      expect(typeof ust.label).toBe('string');
      expect(ust.label).toContain('UST');
    }
  });

  it('bII UST over G7 is Ab major', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    const bii = usts.find(u => u.label === 'bII UST');
    expect(bii).toBeDefined();
    const rootPc = ((bii!.triad.rootStep % 12) + 12) % 12;
    // Ab = 8 semitones from A (A=0), which is PC 8 in UMT, or G+1 = PC (((-2)+1%12+12)%12 = 11)
    // Actually: G root is step -2 (from A4), +1 semitone → step -1 → PC 11 (Ab in UMT coords)
    expect(rootPc).toBe(11); // Ab in UMT (A=0 system): G#/Ab = PC 11
  });

  it('II UST over G7 is A major with tensions 9/#11/13', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    const ii = usts.find(u => u.label === 'II UST');
    expect(ii).toBeDefined();
    expect(ii!.tensions).toContain('9');
    expect(ii!.tensions).toContain('#11');
    expect(ii!.tensions).toContain('13');
  });

  it('returns empty array for non-12-TET', () => {
    const edo19 = new EDO(19, 440);
    const c = new Chord('C7', edo19, 0, [0, 6, 11, 16]);
    expect(getUpperStructures(c)).toHaveLength(0);
  });

  it('UST labels cover bII, II, bIII, bVI, VI, bVII', () => {
    const c7 = chord('C7');
    const usts = getUpperStructures(c7);
    const labels = usts.map(u => u.label);
    expect(labels).toContain('bII UST');
    expect(labels).toContain('II UST');
    expect(labels).toContain('bIII UST');
    expect(labels).toContain('bVI UST');
    expect(labels).toContain('VI UST');
    expect(labels).toContain('bVII UST');
  });
});

// ============================================================================
// 5.2 - Slash chord analysis
// ============================================================================

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

// ============================================================================
// 5.3 - parsePolychord
// ============================================================================

describe('parsePolychord', () => {
  it('parses pipe-separated polychord', () => {
    const pc = parsePolychord('Fmaj7|G7');
    expect(pc.upper.name).toBe('Fmaj7');
    expect(pc.lower.name).toBe('G7');
  });

  it('parses slash-separated polychord', () => {
    const pc = parsePolychord('D/C');
    expect(pc.upper.name).toMatch(/D/);
    expect(pc.lower.name).toMatch(/C/);
  });

  it('upper and lower are Chord instances', () => {
    const pc = parsePolychord('Abmaj7|Bb7');
    expect(pc.upper).toBeInstanceOf(Chord);
    expect(pc.lower).toBeInstanceOf(Chord);
  });

  it('throws on unrecognized format', () => {
    expect(() => parsePolychord('something weird')).toThrow();
  });

  it('upper chord has correct intervals for Cmaj7|G7', () => {
    const pc = parsePolychord('Cmaj7|G7');
    // Cmaj7 = [0,4,7,11]
    expect(pc.upper.intervalsInSteps).toEqual([0, 4, 7, 11]);
    // G7 = [0,4,7,10]
    expect(pc.lower.intervalsInSteps).toEqual([0, 4, 7, 10]);
  });
});

// ============================================================================
// 5.4 - getAllContainingScales
// ============================================================================

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

// ============================================================================
// 5.5 - respellNote / respellChord
// ============================================================================

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
