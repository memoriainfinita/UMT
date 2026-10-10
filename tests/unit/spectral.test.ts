/**
 * Tests for lib/music-theory/spectral.ts.
 * Plomp-Levelt roughness; sensory consonance after Sethares (partials with amplitude rolloff).
 */
import { describe, it, expect } from 'vitest';
import { Spectral } from '../../lib/music-theory/spectral';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { EDO } from '../../lib/music-theory/tuning';
import { Chord } from '../../lib/music-theory/chord';

function chord(s: string) { return parseChordSymbol(s); }

describe('Spectral.overtoneSeries', () => {
  it('returns 16 harmonics by default', () => {
    expect(Spectral.overtoneSeries(440)).toHaveLength(16);
  });

  it('first harmonic equals fundamental', () => {
    expect(Spectral.overtoneSeries(440)[0]).toBe(440);
  });

  it('second harmonic is 2× fundamental', () => {
    expect(Spectral.overtoneSeries(440)[1]).toBe(880);
  });

  it('custom count', () => {
    expect(Spectral.overtoneSeries(220, 8)).toHaveLength(8);
  });
});

describe('Spectral.beatFrequency', () => {
  it('returns absolute difference', () => {
    expect(Spectral.beatFrequency(440, 442)).toBeCloseTo(2);
  });

  it('is symmetric', () => {
    expect(Spectral.beatFrequency(440, 442)).toBe(Spectral.beatFrequency(442, 440));
  });
});

describe('Spectral.roughnessPlompLevelt', () => {
  it('returns a non-negative number', () => {
    const r = Spectral.roughnessPlompLevelt([440, 660]);
    expect(r).toBeGreaterThanOrEqual(0);
  });

  it('unison (same freq) has low roughness', () => {
    const r = Spectral.roughnessPlompLevelt([440, 440]);
    expect(r).toBeLessThan(0.01);
  });
});

describe('Spectral.sensoryConsonance', () => {
  it('returns value between 0 and 1', () => {
    const val = Spectral.sensoryConsonance(chord('C'));
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1);
  });
});

describe('Spectral.combinationTones', () => {
  it('returns sum and difference arrays', () => {
    const { sum, difference } = Spectral.combinationTones(440, 550);
    expect(Array.isArray(sum)).toBe(true);
    expect(Array.isArray(difference)).toBe(true);
  });

  it('difference tone = f2 - f1', () => {
    const { difference } = Spectral.combinationTones(440, 550, 1);
    expect(difference).toContain(110);
  });
});

describe('Spectral.sensoryConsonance with partials', () => {
  const dyad = (semis: number) => new Chord('d', new EDO(12), -9, [0, semis]);
  it('orders intervals as the ear does: octave, fifth, major third above tritone and minor second', () => {
    const c = (s: number) => Spectral.sensoryConsonance(dyad(s));
    expect(c(12)).toBeGreaterThan(c(7));
    expect(c(7)).toBeGreaterThan(c(6));
    expect(c(4)).toBeGreaterThan(c(6));
    expect(c(6)).toBeGreaterThan(c(1));
  });
});
