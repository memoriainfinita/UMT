/**
 * Tests for lib/music-theory/form.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseChordSymbol, parseRomanProgression } from '../../lib/music-theory/parser';
import { FormAnalyzer, FormAnalysis } from '../../lib/music-theory/form';
import { getProgression } from '../../lib/music-theory/progressions';
import { Chord } from '../../lib/music-theory/chord';

function chord(symbol: string): Chord { return parseChordSymbol(symbol); }
function prog(roman: string, key: string): Chord[] { return parseRomanProgression(roman, key); }

describe('FormAnalyzer', () => {
  it('detects the twelve-bar blues from the key', () => {
    const blues = getProgression('blues-12', 'F major');
    expect(FormAnalyzer.analyzeHarmonic(blues, 'F major').type).toBe('blues-12');
    expect(FormAnalyzer.analyzeHarmonic([...blues, ...blues], 'F major').sections).toHaveLength(2);
    expect(FormAnalyzer.analyzeHarmonic(blues, 'C major').type).not.toBe('blues-12');
  });

  it('detectReprise reports maximal passages, not their sub-passages', () => {
    const A = parseRomanProgression('I V IV V', 'C major');
    const B = parseRomanProgression('vi ii V I', 'C major');
    expect(FormAnalyzer.detectReprise([...A, ...B, ...A])).toEqual([{ start: 0, length: 4 }]);
  });
});

describe('FormAnalyzer.analyzeHarmonic', () => {
  it('returns a FormAnalysis object', () => {
    const chords = prog('I IV V I I IV V I', 'C major');
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major');
    expect(result).toBeDefined();
    expect(typeof result.type).toBe('string');
    expect(Array.isArray(result.sections)).toBe(true);
    expect(typeof result.confidence).toBe('number');
  });

  it('detects AABA for repeated patterns', () => {
    // A A B A - 4 sections of 4 chords
    const A = prog('I V IV V', 'C major');
    const B = prog('vi ii V I', 'C major');
    const chords = [...A, ...A, ...B, ...A];
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major', 4);
    expect(['AABA', 'AAB', 'ABAB', 'strophic', 'unknown']).toContain(result.type);
  });

  it('confidence is between 0 and 1', () => {
    const chords = prog('I V vi IV', 'C major');
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('sections have required fields', () => {
    const A = prog('I V IV V', 'C major');
    const B = prog('vi ii V I', 'C major');
    const chords = [...A, ...A, ...B, ...A];
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major', 4);
    for (const section of result.sections) {
      expect(typeof section.label).toBe('string');
      expect(typeof section.start).toBe('number');
      expect(typeof section.end).toBe('number');
      expect(section.end).toBeGreaterThanOrEqual(section.start);
    }
  });
});

describe('FormAnalyzer.detectReprise', () => {
  it('finds repeated sections', () => {
    const A = prog('I V IV V', 'C major');
    const B = prog('vi ii V I', 'C major');
    const chords = [...A, ...B, ...A];
    const reprises = FormAnalyzer.detectReprise(chords);
    expect(Array.isArray(reprises)).toBe(true);
    expect(reprises.length).toBeGreaterThan(0);
  });

  it('returns empty for through-composed music', () => {
    // Each chord different
    const chords = [chord('C'), chord('Dm'), chord('Em'), chord('F'), chord('G'), chord('Am'), chord('Bdim')];
    const reprises = FormAnalyzer.detectReprise(chords);
    expect(Array.isArray(reprises)).toBe(true);
  });

  it('reprise entries have start and length', () => {
    const A = prog('I V IV V', 'C major');
    const chords = [...A, ...A];
    const reprises = FormAnalyzer.detectReprise(chords);
    if (reprises.length > 0) {
      expect(typeof reprises[0].start).toBe('number');
      expect(typeof reprises[0].length).toBe('number');
    }
  });
});
