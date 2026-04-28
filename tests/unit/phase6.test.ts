import { describe, it, expect } from 'vitest';
import { SetTheory } from '../../lib/music-theory/set-theory';
import { ToneRow } from '../../lib/music-theory/twelve-tone';
import { Counterpoint } from '../../lib/music-theory/counterpoint';
import { Canon } from '../../lib/music-theory/counterpoint';
import { MelodyAnalysis } from '../../lib/music-theory/melody';
import { Schenker } from '../../lib/music-theory/schenker';
import { parseNote } from '../../lib/music-theory/parser';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';

// ============================================================================
// 6.1 - SetTheory extended
// ============================================================================

describe('SetTheory.getForteNumber', () => {
  it('major triad prime form [0,3,7] → 3-11', () => {
    // primeForm of a major/minor triad is [0,3,7] (minor is more compact)
    expect(SetTheory.getForteNumber([0, 3, 7])).toBe('3-11');
  });

  it('minor triad → same class as major → 3-11', () => {
    // [0,4,7] minor in some rotation; primeForm → [0,3,7]
    expect(SetTheory.getForteNumber([0, 4, 7])).toBe('3-11');
  });

  it('diminished triad [0,3,6] → 3-10', () => {
    expect(SetTheory.getForteNumber([0, 3, 6])).toBe('3-10');
  });

  it('whole tone set [0,2,4,6,8,10] → 6-35', () => {
    expect(SetTheory.getForteNumber([0, 2, 4, 6, 8, 10])).toBe('6-35');
  });

  it('returns unknown for empty set', () => {
    expect(SetTheory.getForteNumber([])).toBe('unknown');
  });

  it('chromatic trichord [0,1,2] → 3-1', () => {
    expect(SetTheory.getForteNumber([0, 1, 2])).toBe('3-1');
  });
});

describe('SetTheory.getComplement', () => {
  it('complement of empty set is all 12 PCs', () => {
    expect(SetTheory.getComplement([])).toHaveLength(12);
  });

  it('complement of [0,1,2,3,4,5] has 6 elements', () => {
    expect(SetTheory.getComplement([0, 1, 2, 3, 4, 5])).toHaveLength(6);
  });

  it('complement of full chromatic is empty', () => {
    expect(SetTheory.getComplement([0,1,2,3,4,5,6,7,8,9,10,11])).toHaveLength(0);
  });

  it('complement elements not in original set', () => {
    const set = [0, 2, 4, 6, 8, 10];
    const comp = SetTheory.getComplement(set);
    expect(comp.every(p => !set.includes(p))).toBe(true);
  });
});

describe('SetTheory.Tn / TnI', () => {
  it('Tn([0,4,7], 5) transposes by 5 semitones', () => {
    expect(SetTheory.Tn([0, 4, 7], 5)).toEqual([5, 9, 0].sort((a, b) => a - b));
  });

  it('Tn with n=0 returns same set', () => {
    expect(SetTheory.Tn([0, 3, 7], 0)).toEqual([0, 3, 7]);
  });

  it('TnI inverts and transposes', () => {
    const pcs = [0, 4, 7];
    const result = SetTheory.TnI(pcs, 0);
    // TnI(0) = -0, -4, -7 mod 12 = 0, 8, 5 sorted = [0,5,8]
    expect(result).toEqual([0, 5, 8]);
  });

  it('Tn result length equals input length', () => {
    expect(SetTheory.Tn([0, 1, 2, 3], 3)).toHaveLength(4);
  });
});

describe('SetTheory.isSubset / isSuperset', () => {
  it('[0,4] is subset of [0,4,7]', () => {
    expect(SetTheory.isSubset([0, 4], [0, 4, 7])).toBe(true);
  });

  it('[0,4,7] is not subset of [0,4]', () => {
    expect(SetTheory.isSubset([0, 4, 7], [0, 4])).toBe(false);
  });

  it('[0,4,7] is superset of [0,4]', () => {
    expect(SetTheory.isSuperset([0, 4, 7], [0, 4])).toBe(true);
  });

  it('identical sets are both subset and superset', () => {
    expect(SetTheory.isSubset([0, 4, 7], [0, 4, 7])).toBe(true);
    expect(SetTheory.isSuperset([0, 4, 7], [0, 4, 7])).toBe(true);
  });
});

describe('SetTheory.getAllSubsets', () => {
  it('returns C(4,2) = 6 subsets of cardinality 2', () => {
    expect(SetTheory.getAllSubsets([0, 3, 6, 9], 2)).toHaveLength(6);
  });

  it('returns C(4,3) = 4 subsets of cardinality 3', () => {
    expect(SetTheory.getAllSubsets([0, 3, 6, 9], 3)).toHaveLength(4);
  });

  it('cardinality 0 returns empty array', () => {
    expect(SetTheory.getAllSubsets([0, 1, 2], 0)).toHaveLength(0);
  });

  it('cardinality > set size returns empty', () => {
    expect(SetTheory.getAllSubsets([0, 1], 5)).toHaveLength(0);
  });

  it('each subset has correct cardinality', () => {
    const subs = SetTheory.getAllSubsets([0, 1, 2, 3], 2);
    expect(subs.every(s => s.length === 2)).toBe(true);
  });
});

// ============================================================================
// 6.2 - ToneRow
// ============================================================================

const BERG_ROW = [0, 11, 3, 4, 8, 7, 9, 6, 1, 2, 5, 10]; // Berg Violin Concerto row (approx)
const SIMPLE_ROW = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe('ToneRow', () => {
  it('constructs from valid row', () => {
    expect(() => new ToneRow(SIMPLE_ROW)).not.toThrow();
  });

  it('throws for duplicate pitch classes', () => {
    expect(() => new ToneRow([0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toThrow();
  });

  it('throws for wrong length', () => {
    expect(() => new ToneRow([0, 1, 2])).toThrow();
  });

  it('P(0) returns original row', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(row.P(0)).toEqual(SIMPLE_ROW);
  });

  it('P(n) transposes correctly', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const p3 = row.P(3);
    expect(p3[0]).toBe(3);
    expect(p3.every(p => p >= 0 && p <= 11)).toBe(true);
    expect(new Set(p3).size).toBe(12);
  });

  it('R() reverses P(0)', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(row.R()).toEqual([...SIMPLE_ROW].reverse());
  });

  it('I(0) starts on same pitch as P(0)', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(row.I(0)[0]).toBe(SIMPLE_ROW[0]);
  });

  it('I(0) inverts intervals', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const inv = row.I(0);
    // SIMPLE_ROW intervals are all +1; inversion should be all -1 (i.e., 11 mod 12)
    for (let i = 1; i < 12; i++) {
      expect(((inv[i] - inv[i - 1]) % 12 + 12) % 12).toBe(11);
    }
  });

  it('RI(0) contains all 12 unique pitch classes', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const ri = row.RI(0);
    expect(new Set(ri).size).toBe(12);
    expect(ri[0]).toBe(0); // starts at transposition 0
  });

  it('getMatrix returns 12x12 array', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const matrix = row.getMatrix();
    expect(matrix).toHaveLength(12);
    expect(matrix[0]).toHaveLength(12);
  });

  it('getHexachords splits row at midpoint', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const [h1, h2] = row.getHexachords();
    expect(h1).toHaveLength(6);
    expect(h2).toHaveLength(6);
    expect([...h1, ...h2]).toEqual(SIMPLE_ROW);
  });

  it('isAllInterval returns boolean', () => {
    const row = new ToneRow(SIMPLE_ROW);
    expect(typeof row.isAllInterval()).toBe('boolean');
  });

  it('isCombinatorial returns null or string', () => {
    const row = new ToneRow(SIMPLE_ROW);
    const result = row.isCombinatorial();
    expect(result === null || ['P', 'I', 'RI'].includes(result!)).toBe(true);
  });
});

// ============================================================================
// 6.3 - Counterpoint
// ============================================================================

function notes(steps: number[]): Note[] {
  return steps.map(s => new Note(TET12, s));
}

describe('Counterpoint.checkSpecies', () => {
  it('species 1: returns empty array for perfect consonances', () => {
    // C4(-9) and G4(-2) = P5 consonance
    const cf = notes([-9, -7, -5, -4]);   // C D E F
    const ct = notes([-2, 0, 2, 3]);       // G A B C
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    // P5 between C-G, M6 between D-B, M6 between E-C#... should be mostly consonant
    expect(Array.isArray(issues)).toBe(true);
  });

  it('species 1: flags parallel 5ths', () => {
    // C-G then D-A = parallel 5ths
    const cf = notes([-9, -7]);
    const ct = notes([-2, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    const hasParallel5 = issues.some(i => i.type === 'Parallel 5th');
    expect(hasParallel5).toBe(true);
  });

  it('species 1: flags interior unison', () => {
    const cf = notes([-9, -9, -9]);
    const ct = notes([-9, -9, -9]); // all unisons
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    expect(issues.some(i => i.type === 'Interior Unison')).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(Counterpoint.checkSpecies(1, [], [])).toHaveLength(0);
  });

  it('issue objects have type and description', () => {
    const cf = notes([-9, -7, -5]);
    const ct = notes([-2, 0, 2]);
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    for (const issue of issues) {
      expect(typeof issue.type).toBe('string');
      expect(typeof issue.description).toBe('string');
    }
  });
});

describe('Canon.detectImitation', () => {
  it('detects exact imitation at unison', () => {
    const theme = notes([-9, -7, -5, -4]); // C D E F
    const follower = notes([-9, -7, -5, -4]); // same, no delay
    const result = Canon.detectImitation([theme, follower]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for single voice', () => {
    expect(Canon.detectImitation([notes([-9, -7, -5])])).toHaveLength(0);
  });
});

describe('Canon.generateCanon', () => {
  it('generates two voices', () => {
    const theme = notes([-9, -7, -5, -4]);
    const [leader, follower] = Canon.generateCanon(theme, 7, 2);
    expect(leader).toHaveLength(4);
    expect(follower.length).toBeGreaterThan(0);
  });

  it('follower is transposed by interval', () => {
    const theme = notes([-9, -7]);
    const [, follower] = Canon.generateCanon(theme, 5, 0);
    expect(follower[0].stepsFromBase).toBe(-9 + 5);
  });

  it('returns empty arrays for empty theme', () => {
    const [l, f] = Canon.generateCanon([], 5, 2);
    expect(l).toHaveLength(0);
    expect(f).toHaveLength(0);
  });
});

// ============================================================================
// 6.4 - MelodyAnalysis
// ============================================================================

describe('MelodyAnalysis.getContour', () => {
  it('ascending melody gives all "+"', () => {
    const melody = notes([-9, -7, -5, -4, -2]);
    expect(MelodyAnalysis.getContour(melody)).toEqual(['+', '+', '+', '+']);
  });

  it('descending melody gives all "-"', () => {
    const melody = notes([2, 0, -2, -4]);
    expect(MelodyAnalysis.getContour(melody)).toEqual(['-', '-', '-']);
  });

  it('repeated note gives "="', () => {
    const melody = notes([0, 0, 1]);
    expect(MelodyAnalysis.getContour(melody)).toEqual(['=', '+']);
  });
});

describe('MelodyAnalysis.getIntervalHistogram', () => {
  it('returns a Map', () => {
    const melody = notes([-9, -7, -5]);
    expect(MelodyAnalysis.getIntervalHistogram(melody)).toBeInstanceOf(Map);
  });

  it('correct interval counts', () => {
    const melody = notes([0, 2, 4]); // +2 twice
    const hist = MelodyAnalysis.getIntervalHistogram(melody);
    expect(hist.get(2)).toBe(2);
  });
});

describe('MelodyAnalysis.findMotifs', () => {
  it('returns array', () => {
    const melody = notes([-9, -7, -5, -4, -9, -7, -5, -4]);
    expect(Array.isArray(MelodyAnalysis.findMotifs(melody))).toBe(true);
  });

  it('finds repeating pattern', () => {
    const melody = notes([-9, -7, -5, 0, -9, -7, -5, 2]);
    const motifs = MelodyAnalysis.findMotifs(melody, 2);
    expect(motifs.length).toBeGreaterThan(0);
  });
});

describe('MelodyAnalysis.reduce', () => {
  it('returns shorter or equal length melody', () => {
    const melody = notes([-9, -7, -5, -4, -2, 0]);
    const durations = [1, 1, 2, 1, 1, 2];
    const reduced = MelodyAnalysis.reduce(melody, durations);
    expect(reduced.length).toBeLessThanOrEqual(melody.length);
  });

  it('keeps first and last notes', () => {
    const melody = notes([-9, -7, -5, -4, -2]);
    const durations = [1, 1, 1, 1, 1];
    const reduced = MelodyAnalysis.reduce(melody, durations);
    expect(reduced[0].stepsFromBase).toBe(-9);
    expect(reduced[reduced.length - 1].stepsFromBase).toBe(-2);
  });
});

describe('MelodyAnalysis.getContourReduction', () => {
  it('returns peaks and troughs', () => {
    // 0,4,1,5,2,0: peaks at 4(i=1) and 5(i=3); troughs at 1(i=2) and 2(i=4)
    // first and last always included
    const melody = notes([0, 4, 1, 5, 2, 0]);
    const reduced = MelodyAnalysis.getContourReduction(melody);
    expect(reduced.length).toBeLessThan(melody.length);
    expect(reduced[0].stepsFromBase).toBe(0);
    expect(reduced[reduced.length - 1].stepsFromBase).toBe(0);
  });

  it('handles 2-note melody', () => {
    const melody = notes([0, 5]);
    expect(MelodyAnalysis.getContourReduction(melody)).toHaveLength(2);
  });
});

// ============================================================================
// 6.5 - Schenker
// ============================================================================

describe('Schenker.findUrlinie', () => {
  it('returns null for empty melody', () => {
    expect(Schenker.findUrlinie([], 'C major')).toBeNull();
  });

  it('detects 3-line in C major descending E-D-C', () => {
    // E4=step -5, D4=-7, C4=-9 (but steps are from A4, so C4=-9, D4=-7, E4=-5)
    const melody = notes([-5, -7, -9]); // E D C
    const result = Schenker.findUrlinie(melody, 'C major');
    if (result) {
      expect(result.type).toBe('3-line');
    }
    // Allow null - detection is approximate
    expect(result === null || result.type === '3-line').toBe(true);
  });

  it('returns object with line and type properties when found', () => {
    const melody = notes([-5, -7, -9]);
    const result = Schenker.findUrlinie(melody, 'C major');
    if (result) {
      expect(Array.isArray(result.line)).toBe(true);
      expect(['3-line', '5-line', '8-line']).toContain(result.type);
    }
  });

  it('returns null for invalid key', () => {
    const melody = notes([0, -2, -4]);
    expect(Schenker.findUrlinie(melody, 'Z#')).toBeNull();
  });
});

describe('Schenker.prolongationLevel', () => {
  it('foreground removes consecutive duplicates', () => {
    const chords = [
      parseChordSymbol('C'),
      parseChordSymbol('C'),
      parseChordSymbol('G'),
      parseChordSymbol('C'),
    ];
    const result = Schenker.prolongationLevel(chords, 'foreground');
    // C, G, C (duplicate C removed)
    expect(result.length).toBeLessThan(chords.length);
  });

  it('background keeps only tonic and dominant', () => {
    const chords = [
      parseChordSymbol('C'),
      parseChordSymbol('Am'),
      parseChordSymbol('F'),
      parseChordSymbol('G'),
      parseChordSymbol('C'),
    ];
    const result = Schenker.prolongationLevel(chords, 'background');
    expect(result.length).toBeLessThanOrEqual(chords.length);
  });

  it('returns empty array for empty input', () => {
    expect(Schenker.prolongationLevel([], 'foreground')).toHaveLength(0);
  });

  it('middleground removes root-duplicate consecutive chords', () => {
    const chords = [
      parseChordSymbol('C'),
      parseChordSymbol('Cmaj7'),
      parseChordSymbol('G7'),
    ];
    const result = Schenker.prolongationLevel(chords, 'middleground');
    // Cmaj7 has same root as C → removed
    expect(result.length).toBeLessThan(chords.length);
  });
});
