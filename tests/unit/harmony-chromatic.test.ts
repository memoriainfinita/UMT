/**
 * Tests for lib/music-theory/harmony.ts (chromatic).
 */
import { describe, it, expect } from 'vitest';
import { Harmony, BorrowedChord, PivotChord } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseRomanProgression } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';
import { TET12, EDO } from '../../lib/music-theory/tuning';
import { Note } from '../../lib/music-theory/note';
import { get12TETBaseName } from '../../lib/music-theory/utils';

function chord(symbol: string): Chord {
  return parseChordSymbol(symbol);
}
function prog(roman: string, key: string): Chord[] {
  return parseRomanProgression(roman, key);
}

describe('Harmony.getBorrowedChords - shape', () => {
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

describe('Harmony.getBorrowedChords - C major borrowed chords', () => {
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

  it('function field maps bVII to S (minor subdominant family)', () => {
    const results = Harmony.getBorrowedChords('C major');
    const bVII = results.find(b => b.chord.name.startsWith('Bb') && b.sourceMode === 'mixolydian');
    expect(bVII).toBeDefined();
    expect(bVII!.function).toBe('S');
  });
});

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

  it('type: seventh - returns seventh chord pivots for C→G major', () => {
    const pivots = Harmony.findPivotChords('C major', 'G major', 'seventh');
    const am7 = pivots.find(p => p.chord.name === 'Am7');
    expect(am7).toBeDefined();
  });
});

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

describe('Harmony.retrogradeProgression', () => {
  it('reverses chord order', () => {
    const chords = [chord('C'), chord('Am'), chord('F'), chord('G')];
    const retro = Harmony.retrogradeProgression(chords);
    expect(retro[0].name).toBe(chords[3].name);
    expect(retro[1].name).toBe(chords[2].name);
    expect(retro[2].name).toBe(chords[1].name);
    expect(retro[3].name).toBe(chords[0].name);
  });

  it('returns Chord[] of same length', () => {
    const chords = prog('I V vi IV', 'C major');
    const retro = Harmony.retrogradeProgression(chords);
    expect(retro.length).toBe(chords.length);
    expect(retro.every(c => c instanceof Chord)).toBe(true);
  });

  it('empty input returns empty', () => {
    expect(Harmony.retrogradeProgression([])).toEqual([]);
  });
});

describe('Harmony.invertProgression', () => {
  it('returns Chord[] of same length', () => {
    const chords = prog('I V vi IV', 'C major');
    const axis = new Note(TET12, 0); // A4
    const inverted = Harmony.invertProgression(chords, axis);
    expect(inverted.length).toBe(chords.length);
    expect(inverted.every(c => c instanceof Chord)).toBe(true);
  });

  it('I → I when axis is the tonic root', () => {
    // C major: C is at step -9 in TET12 (C4). Axis = C4 (-9).
    const chords = [chord('C')];
    const axis = new Note(TET12, -9); // C4
    const inv = Harmony.invertProgression(chords, axis);
    // Root of inverted C around C axis should still be C
    expect(((inv[0].rootStep % 12) + 12) % 12).toBe(((chords[0].rootStep % 12) + 12) % 12);
  });

  it('empty input returns empty', () => {
    expect(Harmony.invertProgression([], new Note(TET12, 0))).toEqual([]);
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
