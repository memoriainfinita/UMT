import { describe, it, expect } from 'vitest';
import { FiguredBass } from '../../lib/music-theory/figured-bass';
import { parseNote } from '../../lib/music-theory/parser';

// ============================================================================
// FiguredBass.parse
// ============================================================================

describe('FiguredBass.parse', () => {
  it('empty string returns root position intervals [4,7]', () => {
    expect(FiguredBass.parse('').intervals).toEqual([4, 7]);
  });

  it('"6" returns [9]', () => {
    expect(FiguredBass.parse('6').intervals).toEqual([9]);
  });

  it('"6/4" returns [9,5]', () => {
    expect(FiguredBass.parse('6/4').intervals).toEqual([9, 5]);
  });

  it('"7" returns [10]', () => {
    expect(FiguredBass.parse('7').intervals).toEqual([10]);
  });

  it('"#6" applies sharp accidental', () => {
    expect(FiguredBass.parse('#6').intervals).toEqual([10]);
  });

  it('"b7" applies flat accidental', () => {
    expect(FiguredBass.parse('b7').intervals).toEqual([9]);
  });
});

// ============================================================================
// FiguredBass.realize — default (no key context)
// ============================================================================

describe('FiguredBass.realize (default key)', () => {
  it('empty figure builds root position triad', () => {
    const bass = parseNote('C4');
    const chord = FiguredBass.realize(bass, '');
    expect(chord.intervalsInSteps).toContain(4);
    expect(chord.intervalsInSteps).toContain(7);
  });

  it('"6" above E in C major → minor 6th (8 st = C natural)', () => {
    const bass = parseNote('E4');
    const chord = FiguredBass.realize(bass, '6', 'C major');
    expect(chord.intervalsInSteps).toContain(8);
  });
});

// ============================================================================
// FiguredBass.realize — diatonic key resolution
// ============================================================================

describe('FiguredBass.realize — diatonic resolution', () => {
  it('G major, bass=D, "7" → minor 7th (10 st), not major 7th (11 st)', () => {
    const bass = parseNote('D4');
    const chord = FiguredBass.realize(bass, '7', 'G major');
    expect(chord.intervalsInSteps).toContain(10); // C natural
    expect(chord.intervalsInSteps).not.toContain(11); // not C#
  });

  it('D minor, bass=D, "" (triad) → minor 3rd (3 st), not major (4 st)', () => {
    const bass = parseNote('D4');
    const chord = FiguredBass.realize(bass, '', 'D minor');
    expect(chord.intervalsInSteps).toContain(3);  // F natural
    expect(chord.intervalsInSteps).not.toContain(4); // not F#
  });

  it('C major, bass=C, "7" → major 7th (11 st)', () => {
    const bass = parseNote('C4');
    const chord = FiguredBass.realize(bass, '7', 'C major');
    expect(chord.intervalsInSteps).toContain(11); // B natural
  });

  it('G major, bass=G, "" (triad) → major 3rd (4 st) and perfect 5th (7 st)', () => {
    const bass = parseNote('G4');
    const chord = FiguredBass.realize(bass, '', 'G major');
    expect(chord.intervalsInSteps).toContain(4);
    expect(chord.intervalsInSteps).toContain(7);
  });

  it('explicit accidental overrides diatonic resolution', () => {
    // In G major "7" above D → C natural (10). With "#7" → C# (11).
    const bass = parseNote('D4');
    const chord = FiguredBass.realize(bass, '#7', 'G major');
    expect(chord.intervalsInSteps).toContain(11); // C#
  });

  it('chromatic bass (not in key) falls back to default semitones', () => {
    // F# is not in C major. "7" default = 10 (minor 7th).
    const bass = parseNote('F#4');
    const chord = FiguredBass.realize(bass, '7', 'C major');
    expect(chord.intervalsInSteps).toContain(10);
  });

  it('invalid key symbol falls back to default semitones', () => {
    const bass = parseNote('C4');
    const chord = FiguredBass.realize(bass, '7', 'X nonsense');
    expect(chord.intervalsInSteps).toContain(10); // default for "7"
  });
});

// ============================================================================
// FiguredBass.fromChord
// ============================================================================

describe('FiguredBass.fromChord', () => {
  it('root position returns empty string', () => {
    const bass = parseNote('C4');
    const chord = FiguredBass.realize(bass, '');
    expect(FiguredBass.fromChord(chord, bass)).toBe('');
  });
});

// ============================================================================
// FiguredBass.voices — SATB realization
// ============================================================================

describe('FiguredBass.voices', () => {
  // Soprano: C4–G5 (steps -9 to 10)
  // Alto:    G3–C5 (steps -14 to 3)
  // Tenor:   C3–G4 (steps -21 to -2)
  // Bass:    given (no range constraint)
  const S_MIN = -9, S_MAX = 10;
  const A_MIN = -14, A_MAX = 3;
  const T_MIN = -21, T_MAX = -2;

  it('returns exactly 4 notes ordered [S, A, T, B]', () => {
    const bass = parseNote('C3');
    const result = FiguredBass.voices(bass, '', 'C major');
    expect(result).toHaveLength(4);
  });

  it('bass voice (index 3) matches the given bass note', () => {
    const bass = parseNote('C3');
    const [, , , b] = FiguredBass.voices(bass, '', 'C major');
    expect(b.stepsFromBase).toBe(bass.stepsFromBase);
  });

  it('voices are non-crossing: S >= A >= T >= B in stepsFromBase', () => {
    const bass = parseNote('C3');
    const [s, a, t, b] = FiguredBass.voices(bass, '', 'C major');
    expect(s.stepsFromBase).toBeGreaterThanOrEqual(a.stepsFromBase);
    expect(a.stepsFromBase).toBeGreaterThanOrEqual(t.stepsFromBase);
    expect(t.stepsFromBase).toBeGreaterThanOrEqual(b.stepsFromBase);
  });

  it('soprano is within C4–G5', () => {
    const bass = parseNote('C3');
    const [s] = FiguredBass.voices(bass, '', 'C major');
    expect(s.stepsFromBase).toBeGreaterThanOrEqual(S_MIN);
    expect(s.stepsFromBase).toBeLessThanOrEqual(S_MAX);
  });

  it('alto is within G3–C5', () => {
    const bass = parseNote('C3');
    const [, a] = FiguredBass.voices(bass, '', 'C major');
    expect(a.stepsFromBase).toBeGreaterThanOrEqual(A_MIN);
    expect(a.stepsFromBase).toBeLessThanOrEqual(A_MAX);
  });

  it('tenor is within C3–G4', () => {
    const bass = parseNote('C3');
    const [, , t] = FiguredBass.voices(bass, '', 'C major');
    expect(t.stepsFromBase).toBeGreaterThanOrEqual(T_MIN);
    expect(t.stepsFromBase).toBeLessThanOrEqual(T_MAX);
  });

  it('S-A spacing is at most one octave', () => {
    const bass = parseNote('C3');
    const [s, a] = FiguredBass.voices(bass, '', 'C major');
    expect(s.stepsFromBase - a.stepsFromBase).toBeLessThanOrEqual(12);
  });

  it('A-T spacing is at most one octave', () => {
    const bass = parseNote('C3');
    const [, a, t] = FiguredBass.voices(bass, '', 'C major');
    expect(a.stepsFromBase - t.stepsFromBase).toBeLessThanOrEqual(12);
  });

  it('T-B spacing is at most a 12th (19 semitones)', () => {
    const bass = parseNote('C3');
    const [, , t, b] = FiguredBass.voices(bass, '', 'C major');
    expect(t.stepsFromBase - b.stepsFromBase).toBeLessThanOrEqual(19);
  });

  it('all chord pitch classes are represented across the 4 voices', () => {
    const bass = parseNote('C3');
    const [s, a, t, b] = FiguredBass.voices(bass, '', 'C major');
    const pcs = new Set([s, a, t, b].map(n => ((n.stepsFromBase % 12) + 12) % 12));
    // C major triad above C: pitch classes C=3, E=7, G=10 (in 12-TET with A=0)
    expect(pcs.has(3)).toBe(true);  // C
    expect(pcs.has(7)).toBe(true);  // E
    expect(pcs.has(10)).toBe(true); // G
  });

  it('root is doubled in a root-position triad', () => {
    const bass = parseNote('C3');
    const [s, a, t, b] = FiguredBass.voices(bass, '', 'C major');
    const bassPc = ((b.stepsFromBase % 12) + 12) % 12; // C = 3
    const allPcs = [s, a, t, b].map(n => ((n.stepsFromBase % 12) + 12) % 12);
    const rootCount = allPcs.filter(pc => pc === bassPc).length;
    expect(rootCount).toBeGreaterThanOrEqual(2);
  });

  it('works with a 7th chord (7/5/3 figure) — all 4 PCs present', () => {
    // G7 root position: bass=G3, figure=7/5/3 (explicit complete chord)
    const bass = parseNote('G3');
    const [s, a, t, b] = FiguredBass.voices(bass, '7/5/3', 'C major');
    const pcs = new Set([s, a, t, b].map(n => ((n.stepsFromBase % 12) + 12) % 12));
    // G7: G=10, B=2, D=5, F=8 (pitchClass from A=0)
    expect(pcs.has(10)).toBe(true); // G
    expect(pcs.has(2)).toBe(true);  // B
    expect(pcs.has(5)).toBe(true);  // D
    expect(pcs.has(8)).toBe(true);  // F
  });

  it('works with different bass notes and keys', () => {
    const bass = parseNote('G3');
    const [s, a, t, b] = FiguredBass.voices(bass, '', 'G major');
    expect([s, a, t, b]).toHaveLength(4);
    expect(t.stepsFromBase).toBeGreaterThanOrEqual(b.stepsFromBase);
  });
});
