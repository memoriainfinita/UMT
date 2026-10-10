/**
 * Tests for lib/music-theory/temperament-analysis.ts.
 */
import { describe, it, expect } from 'vitest';
import { TemperamentAnalysis, mapJItoEDO, bestEDOFor } from '../../lib/music-theory/temperament-analysis';
import { TET12, EDO, CentTuning } from '../../lib/music-theory/tuning';
import { FiveLimitJI, PtolemaicJI } from '../../lib/music-theory/presets';

describe('TemperamentAnalysis.compare', () => {
  it('returns a comparison table', () => {
    const table = TemperamentAnalysis.compare([TET12], [[3, 2], [5, 4]]);
    expect(table.intervals).toHaveLength(2);
    expect(table.entries).toHaveLength(1);
    expect(table.entries[0]).toHaveLength(2);
  });

  it('errorCents is non-negative', () => {
    const table = TemperamentAnalysis.compare([TET12], [[3, 2]]);
    expect(table.entries[0][0].errorCents).toBeGreaterThanOrEqual(0);
  });
});

describe('TemperamentAnalysis.getCommas', () => {
  it('returns at least 5 commas', () => {
    expect(TemperamentAnalysis.getCommas().length).toBeGreaterThanOrEqual(5);
  });

  it('syntonic comma is ~21.5 cents', () => {
    const syntonic = TemperamentAnalysis.getCommas().find(c => c.name.includes('Syntonic'));
    expect(syntonic).toBeDefined();
    expect(syntonic!.cents).toBeCloseTo(21.5, 0);
  });
});

describe('mapJItoEDO', () => {
  it('perfect fifth [3,2] maps to step 7 in 12-TET', () => {
    expect(mapJItoEDO([3, 2], 12).step).toBe(7);
  });

  it('error is less than 2 cents for P5 in 12-TET', () => {
    expect(mapJItoEDO([3, 2], 12).errorCents).toBeLessThan(2);
  });
});

describe('bestEDOFor', () => {
  it('returns an EDO size between 5 and 72', () => {
    const result = bestEDOFor([[3, 2], [5, 4], [6, 5]]);
    expect(result.size).toBeGreaterThanOrEqual(5);
    expect(result.size).toBeLessThanOrEqual(72);
  });

  it('returns totalError as a number', () => {
    expect(typeof bestEDOFor([[3, 2]]).totalError).toBe('number');
  });
});

describe('Commas', () => {
  it('keeps the published cents and gives exact ratio text', () => {
    const commas = Object.fromEntries(TemperamentAnalysis.getCommas().map(c => [c.name, c]));
    expect(commas['Syntonic comma'].cents).toBe(21.506);
    expect(commas['Pythagorean comma'].cents).toBe(23.46);
    expect(commas['Mercator comma'].cents).toBe(3.615);
    expect(commas['Mercator comma'].ratioText).toBe('3^53/2^84');
    expect(commas['Schisma'].ratioText).toBe('32805/32768');
  });
});

describe('TemperamentAnalysis', () => {
  const pythagorean = new CentTuning('Pythagorean', [0, 90.225, 203.91, 294.135, 407.82, 498.045, 611.73, 701.955, 792.18, 905.865, 996.09, 1109.775]);

  it('equal temperaments have no wolves; Pythagorean has its wolf fifth', () => {
    expect(TemperamentAnalysis.detectWolfIntervals(new EDO(19))).toEqual([]);
    expect(TemperamentAnalysis.detectWolfIntervals(new EDO(12))).toEqual([]);
    const wolfFifths = TemperamentAnalysis.detectWolfIntervals(pythagorean).filter(w => w.interval === 7);
    expect(wolfFifths).toHaveLength(1);
    // the table runs Ab…F#: the wolf is F# (step 6) → Db, 678.5¢, a Pythagorean comma short
    expect(wolfFifths[0].from).toBe(6);
    expect(wolfFifths[0].errorCents).toBeCloseTo(23.46, 1);
  });

  it('compare finds the closest step in JI and non-12 tunings', () => {
    const t = TemperamentAnalysis.compare([new EDO(19), FiveLimitJI], [[3, 2], [5, 4]]);
    expect(t.entries[0][0].tuningCents).toBeCloseTo(1200 * 11 / 19, 6);
    expect(t.entries[1][0].errorCents).toBeCloseTo(0, 6);
    expect(t.entries[1][1].errorCents).toBeCloseTo(0, 6);
  });

  it('unison vectors: commas by which two sizes of one interval differ', () => {
    // 5-limit JI: fifths 3/2 and 40/27 (D–A), whole tones 9/8 and 10/9 → 81/80
    const vs = TemperamentAnalysis.getUnisonVectors(FiveLimitJI).map(r => r.join('/'));
    expect(vs).toContain('81/80');
    expect(TemperamentAnalysis.getUnisonVectors(PtolemaicJI).map(r => r.join('/'))).toContain('81/80');
  });
});
