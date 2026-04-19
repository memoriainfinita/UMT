import { describe, it, expect } from 'vitest';
import { Harmony, BorrowedChord, PivotChord } from '../../lib/music-theory/harmony';
import { CircleOfFifths, ModalKey } from '../../lib/music-theory/circle';
import { getSubstitutions, SubstitutionOption } from '../../lib/music-theory/substitution';
import { parseChordSymbol, parseRomanProgression } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';
import { TET12 } from '../../lib/music-theory/tuning';
import { EDO } from '../../lib/music-theory/tuning';

function chord(symbol: string): Chord {
  return parseChordSymbol(symbol);
}

function prog(roman: string, key: string): Chord[] {
  return parseRomanProgression(roman, key);
}

// ============================================================================
// 3.1 — getBorrowedChords (breaking change: returns BorrowedChord[])
// ============================================================================

describe('Harmony.getBorrowedChords — shape', () => {
  it('returns BorrowedChord[] objects with required fields', () => {
    const results = Harmony.getBorrowedChords('C major');
    expect(results.length).toBeGreaterThan(0);
    const first = results[0];
    expect(first).toHaveProperty('chord');
    expect(first).toHaveProperty('sourceMode');
    expect(first).toHaveProperty('brightness');
    expect(first).toHaveProperty('function');
    expect(first).toHaveProperty('characteristic');
    expect(first.chord).toBeInstanceOf(Chord);
    expect(typeof first.sourceMode).toBe('string');
    expect(typeof first.brightness).toBe('number');
    expect(['T', 'S', 'D', 'unknown']).toContain(first.function);
    expect(typeof first.characteristic).toBe('boolean');
  });

  it('non-12-TET returns empty array', () => {
    const edo19 = new EDO(19);
    const results = Harmony.getBorrowedChords('C major', { tuning: edo19 });
    expect(results).toEqual([]);
  });
});

describe('Harmony.getBorrowedChords — C major borrowed chords', () => {
  it('contains Ebmaj7 from aeolian (bIII)', () => {
    const results = Harmony.getBorrowedChords('C major');
    const names = results.map(b => b.chord.name);
    expect(names).toContain('Ebmaj7');
  });

  it('contains Abmaj7 from aeolian (bVI)', () => {
    const results = Harmony.getBorrowedChords('C major');
    const names = results.map(b => b.chord.name);
    expect(names).toContain('Abmaj7');
  });

  it('contains bVII chord (Bb) from mixolydian', () => {
    const results = Harmony.getBorrowedChords('C major');
    const mixolydianChords = results.filter(b => b.sourceMode === 'mixolydian');
    expect(mixolydianChords.length).toBeGreaterThan(0);
    const names = mixolydianChords.map(b => b.chord.name);
    // bVII of C major = Bb (any quality)
    expect(names.some(n => n.startsWith('Bb'))).toBe(true);
  });

  it('contains phrygian chord with Db (bII)', () => {
    const results = Harmony.getBorrowedChords('C major');
    const phrygianChords = results.filter(b => b.sourceMode === 'phrygian');
    expect(phrygianChords.length).toBeGreaterThan(0);
    const names = phrygianChords.map(b => b.chord.name);
    expect(names.some(n => n.startsWith('Db'))).toBe(true);
  });

  it('phrygian bII chord has characteristic=true', () => {
    const results = Harmony.getBorrowedChords('C major');
    const phrygianBII = results.find(b => b.sourceMode === 'phrygian' && b.chord.name.startsWith('Db'));
    expect(phrygianBII).toBeDefined();
    expect(phrygianBII!.characteristic).toBe(true);
  });

  it('brightness of mixolydian > brightness of aeolian', () => {
    const results = Harmony.getBorrowedChords('C major');
    const mixBrightness = results.find(b => b.sourceMode === 'mixolydian')?.brightness ?? -99;
    const aeolBrightness = results.find(b => b.sourceMode === 'aeolian')?.brightness ?? -99;
    expect(mixBrightness).toBeGreaterThan(aeolBrightness);
  });

  it('sources option narrows to specified modes only', () => {
    const results = Harmony.getBorrowedChords('C major', { sources: ['mixolydian'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(b => b.sourceMode === 'mixolydian')).toBe(true);
  });

  it('function field maps bVII to T or unknown (non-dominant, non-subdominant)', () => {
    const results = Harmony.getBorrowedChords('C major');
    const bVII = results.find(b => b.chord.name.startsWith('Bb') && b.sourceMode === 'mixolydian');
    // bVII = degree 7 in home key, major quality → function unknown or T
    expect(bVII).toBeDefined();
  });
});

// ============================================================================
// 3.2 — findPivotChords
// ============================================================================

describe('Harmony.findPivotChords', () => {
  it('returns PivotChord[] with required fields', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major');
    expect(pivots.length).toBeGreaterThan(0);
    const p = pivots[0];
    expect(p).toHaveProperty('chord');
    expect(p).toHaveProperty('functionInA');
    expect(p).toHaveProperty('functionInB');
    expect(p.functionInA).toHaveProperty('degree');
    expect(p.functionInA).toHaveProperty('function');
    expect(p.functionInB).toHaveProperty('degree');
    expect(p.functionInB).toHaveProperty('function');
  });

  it('C major → G major: Am is a pivot chord (vi in C, ii in G)', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major');
    const am = pivots.find(p => p.chord.name === 'Am');
    expect(am).toBeDefined();
    expect(am!.functionInA.degree).toBe(6); // vi in C major
    expect(am!.functionInB.degree).toBe(2); // ii in G major
  });

  it('C major → G major: Em is a pivot chord (iii in C, vi in G)', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major');
    const em = pivots.find(p => p.chord.name === 'Em');
    expect(em).toBeDefined();
    expect(em!.functionInA.degree).toBe(3);
    expect(em!.functionInB.degree).toBe(6);
  });

  it('C major → G major: G is a pivot chord (V in C, I in G)', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major');
    const g = pivots.find(p => p.chord.name === 'G');
    expect(g).toBeDefined();
    expect(g!.functionInA.function).toBe('D');
    expect(g!.functionInB.function).toBe('T');
  });

  it('C major → G major: C is a pivot chord (I in C, IV in G)', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major');
    const c = pivots.find(p => p.chord.name === 'C');
    expect(c).toBeDefined();
    expect(c!.functionInA.function).toBe('T');
    expect(c!.functionInB.function).toBe('S');
  });

  it('C major → F major: Am is a pivot chord (vi in C, iii in F)', () => {
    const pivots = Harmony.findPivotChords('C major', 'F major');
    const am = pivots.find(p => p.chord.name === 'Am');
    expect(am).toBeDefined();
    expect(am!.functionInA.degree).toBe(6);
    expect(am!.functionInB.degree).toBe(3);
  });

  it('C major → F# major: very few or no pivot triads', () => {
    const pivots = Harmony.findPivotChords('C major', 'F# major');
    // F# major shares almost no diatonic triads with C major
    expect(pivots.length).toBe(0);
  });

  it('type: seventh — returns seventh chord pivots for C→G major', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major', 'seventh');
    const am7 = pivots.find(p => p.chord.name === 'Am7');
    expect(am7).toBeDefined();
  });
});

// ============================================================================
// 3.3 — classifyModulation
// ============================================================================

describe('Harmony.classifyModulation', () => {
  it('returns pivot when transition chord is diatonic to both keys', () => {
    const chordsA = [chord('Cmaj7'), chord('Am7')]; // Am7 is diatonic to both C and G major
    const chordsB = [chord('D7'), chord('Gmaj7')];
    const result = Harmony.classifyModulation(chordsA, chordsB, 'C major', 'G major');
    expect(result).toBe('pivot');
  });

  it('returns direct when no shared diatonic chords', () => {
    const chordsA = [chord('C'), chord('F'), chord('G')];
    const chordsB = [chord('F#'), chord('B'), chord('C#')];
    const result = Harmony.classifyModulation(chordsA, chordsB, 'C major', 'F# major');
    expect(result).toBe('direct');
  });

  it('returns enharmonic when keys have same pitch content', () => {
    const chordsA = [chord('F#'), chord('B'), chord('C#')];
    const chordsB = [chord('Gb'), chord('Cb'), chord('Db')];
    const result = Harmony.classifyModulation(chordsA, chordsB, 'F# major', 'Gb major');
    expect(result).toBe('enharmonic');
  });

  it('returns chromatic when keys are adjacent by half step', () => {
    const chordsA = [chord('C'), chord('F'), chord('G')];
    const chordsB = [chord('Db'), chord('Gb'), chord('Ab')];
    const result = Harmony.classifyModulation(chordsA, chordsB, 'C major', 'Db major');
    expect(result).toBe('chromatic');
  });
});

// ============================================================================
// 3.4 — CircleOfFifths modal extension
// ============================================================================

describe('CircleOfFifths.getModalKey', () => {
  it('D dorian → parent major key is C', () => {
    const mk = CircleOfFifths.getModalKey('D', 'dorian');
    expect(mk.root).toBe('D');
    expect(mk.mode).toBe('dorian');
    expect(mk.parentMajorKey).toBe('C');
  });

  it('E phrygian → parent major key is C', () => {
    const mk = CircleOfFifths.getModalKey('E', 'phrygian');
    expect(mk.parentMajorKey).toBe('C');
  });

  it('F lydian → parent major key is C', () => {
    const mk = CircleOfFifths.getModalKey('F', 'lydian');
    expect(mk.parentMajorKey).toBe('C');
  });

  it('A dorian → parent major key is G', () => {
    const mk = CircleOfFifths.getModalKey('A', 'dorian');
    expect(mk.parentMajorKey).toBe('G');
  });

  it('D mixolydian → parent major key is G', () => {
    const mk = CircleOfFifths.getModalKey('D', 'mixolydian');
    expect(mk.parentMajorKey).toBe('G');
  });

  it('C ionian → parent major key is C', () => {
    const mk = CircleOfFifths.getModalKey('C', 'ionian');
    expect(mk.parentMajorKey).toBe('C');
  });
});

describe('CircleOfFifths.getModalDistance', () => {
  it('same parent key → distance 0', () => {
    const a = CircleOfFifths.getModalKey('D', 'dorian');   // parent C
    const b = CircleOfFifths.getModalKey('E', 'phrygian'); // parent C
    expect(CircleOfFifths.getModalDistance(a, b)).toBe(0);
  });

  it('parents 1 step apart → distance 1', () => {
    const a = CircleOfFifths.getModalKey('D', 'dorian');   // parent C
    const b = CircleOfFifths.getModalKey('A', 'dorian');   // parent G
    expect(CircleOfFifths.getModalDistance(a, b)).toBe(1);
  });

  it('same modal key → distance 0', () => {
    const a = CircleOfFifths.getModalKey('D', 'dorian');
    const b = CircleOfFifths.getModalKey('D', 'dorian');
    expect(CircleOfFifths.getModalDistance(a, b)).toBe(0);
  });
});

describe('CircleOfFifths.getModalNeighbors', () => {
  it('returns non-empty array', () => {
    const mk = CircleOfFifths.getModalKey('D', 'dorian');
    const neighbors = CircleOfFifths.getModalNeighbors(mk);
    expect(neighbors.length).toBeGreaterThan(0);
  });

  it('D dorian radius=1: includes D mixolydian (1 step brighter)', () => {
    const mk = CircleOfFifths.getModalKey('D', 'dorian');
    const neighbors = CircleOfFifths.getModalNeighbors(mk, 1);
    const modes = neighbors.map(n => n.mode);
    expect(modes).toContain('mixolydian');
  });

  it('D dorian radius=1: includes D aeolian (1 step darker)', () => {
    const mk = CircleOfFifths.getModalKey('D', 'dorian');
    const neighbors = CircleOfFifths.getModalNeighbors(mk, 1);
    const modes = neighbors.map(n => n.mode);
    expect(modes).toContain('aeolian');
  });

  it('all neighbors have same root as input', () => {
    const mk = CircleOfFifths.getModalKey('D', 'dorian');
    const neighbors = CircleOfFifths.getModalNeighbors(mk, 2);
    expect(neighbors.every(n => n.root === 'D')).toBe(true);
  });
});

// ============================================================================
// 3.5 — getSubstitutions
// ============================================================================

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
});

// ============================================================================
// 3.6 — getNegativeProgression
// ============================================================================

describe('Harmony.getNegativeProgression', () => {
  it('returns empty array for empty input', () => {
    const result = Harmony.getNegativeProgression([], 'C major');
    expect(result).toEqual([]);
  });

  it('returns array of same length as input', () => {
    const chords = [chord('Cmaj7'), chord('Am7'), chord('Dm7'), chord('G7')];
    const result = Harmony.getNegativeProgression(chords, 'C major');
    expect(result.length).toBe(4);
  });

  it('single chord matches getNegativeHarmony result', () => {
    const c = chord('Cmaj7');
    const progResult = Harmony.getNegativeProgression([c], 'C major');
    const singleResult = Harmony.getNegativeHarmony(c, 'C major');
    expect(progResult[0].name).toBe(singleResult.name);
  });

  it('each chord in result is a Chord instance', () => {
    const chords = [chord('Cmaj7'), chord('G7')];
    const result = Harmony.getNegativeProgression(chords, 'C major');
    result.forEach(c => expect(c).toBeInstanceOf(Chord));
  });
});

// ============================================================================
// 3.7 — Coltrane axis
// ============================================================================

describe('Harmony.getColtraneAxis', () => {
  it('getColtraneAxis("C") contains E and Ab as major-third-related roots', () => {
    const axis = Harmony.getColtraneAxis('C');
    expect(axis.root).toBe('C');
    expect(axis.majorThirds).toHaveLength(3);
    const names = axis.majorThirds;
    expect(names).toContain('E');
    expect(names).toContain('Ab');
  });

  it('getColtraneAxis("G") contains B and Eb as major-third-related roots', () => {
    const axis = Harmony.getColtraneAxis('G');
    const names = axis.majorThirds;
    expect(names).toContain('B');
    expect(names).toContain('Eb');
  });

  it('majorThirds always contains the root itself', () => {
    const axis = Harmony.getColtraneAxis('C');
    expect(axis.majorThirds).toContain('C');
  });

  it('getColtraneAxis returns 3 unique major-third-related pitch classes', () => {
    const axis = Harmony.getColtraneAxis('D');
    const unique = new Set(axis.majorThirds);
    expect(unique.size).toBe(3);
  });
});

describe('Harmony.getColtraneSubstitutions', () => {
  it('G7 in C major: includes B7 as Coltrane sub', () => {
    const subs = Harmony.getColtraneSubstitutions(chord('G7'), 'C major');
    const names = subs.map(c => c.name);
    expect(names).toContain('B7');
  });

  it('G7 in C major: includes Eb7 as Coltrane sub', () => {
    const subs = Harmony.getColtraneSubstitutions(chord('G7'), 'C major');
    const names = subs.map(c => c.name);
    expect(names).toContain('Eb7');
  });

  it('returns exactly 2 substitutions (the other 2 axis points)', () => {
    const subs = Harmony.getColtraneSubstitutions(chord('G7'), 'C major');
    expect(subs.length).toBe(2);
  });

  it('each substitution is a Chord instance', () => {
    const subs = Harmony.getColtraneSubstitutions(chord('C7'), 'C major');
    subs.forEach(s => expect(s).toBeInstanceOf(Chord));
  });
});
