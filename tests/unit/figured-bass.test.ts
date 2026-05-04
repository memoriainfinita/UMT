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
