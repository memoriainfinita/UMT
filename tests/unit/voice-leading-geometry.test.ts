/**
 * Tests for lib/music-theory/voice-leading-geometry.ts.
 * OPTIC equivalences and voice-leading distance after Dmitri Tymoczko, "A Geometry of Music" (2011).
 */
import { describe, it, expect } from 'vitest';
import { VoiceLeadingGeometry, OPTIC } from '../../lib/music-theory/voice-leading-geometry';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { TET12 } from '../../lib/music-theory/tuning';

function chord(s: string) { return parseChordSymbol(s); }

describe('OPTIC', () => {
  it('returns O, P, T, I, C fields', () => {
    const result = OPTIC([0, 4, 7]);
    expect(result).toHaveProperty('O');
    expect(result).toHaveProperty('P');
    expect(result).toHaveProperty('T');
    expect(result).toHaveProperty('I');
    expect(result).toHaveProperty('C');
  });

  it('O keeps voice order, P sorts', () => {
    const result = OPTIC([7, 0, 4]);
    expect(result.O).toEqual([7, 0, 4]);
    expect(result.P).toEqual([0, 4, 7]);
  });

  it('T starts from 0', () => {
    const result = OPTIC([3, 7, 10]);
    expect(result.T[0]).toBe(0);
  });

  it('C is the prime form; cardinality counts distinct pitch classes', () => {
    expect(OPTIC([0, 4, 7]).C).toEqual([0, 3, 7]);
    expect(OPTIC([0, 4, 7]).cardinality).toBe(3);
    expect(OPTIC([0, 0, 4]).cardinality).toBe(2);
  });

  it('doublings stay until C', () => {
    expect(OPTIC([0, 0, 7]).O).toEqual([0, 0, 7]);
    expect(OPTIC([0, 0, 7]).C).toEqual([0, 5]);
  });

  it('I is the inversion class: major and minor triads meet', () => {
    expect(OPTIC([0, 4, 7]).T).toEqual([0, 4, 7]);
    expect(OPTIC([0, 4, 7]).I).toEqual([0, 3, 7]);
    expect(OPTIC([9, 0, 4]).I).toEqual([0, 3, 7]);
  });
});

describe('VoiceLeadingGeometry.efficientVoiceLeading', () => {
  it('returns paths and totalDistance', () => {
    const result = VoiceLeadingGeometry.efficientVoiceLeading(chord('C'), chord('G'));
    expect(typeof result.totalDistance).toBe('number');
    expect(Array.isArray(result.paths)).toBe(true);
  });

  it('identity (same chord) has distance 0', () => {
    const c = chord('C');
    expect(VoiceLeadingGeometry.efficientVoiceLeading(c, c).totalDistance).toBe(0);
  });

  it('distance is an interval class, never negative, across octaves', () => {
    const c4 = parseChordSymbol('C', TET12, 4);
    const c6 = parseChordSymbol('C', TET12, 6);
    expect(VoiceLeadingGeometry.efficientVoiceLeading(c4, c6).totalDistance).toBe(0);
    expect(VoiceLeadingGeometry.chordGraphDistance(chord('C'), chord('Am'))).toBe(2);
  });

  it('chordGraphDistance is non-negative', () => {
    expect(VoiceLeadingGeometry.chordGraphDistance(chord('C'), chord('Am'))).toBeGreaterThanOrEqual(0);
  });
});
