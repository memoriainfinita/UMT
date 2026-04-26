import { describe, it, expect } from 'vitest';
import { RhythmTransform, RhythmAnalysis, Polymeter, MetricModulation, Isorhythm, TimeSignature } from '../../lib/music-theory/rhythm';
import { CLAVE_PATTERNS } from '../../lib/music-theory/clave-patterns';

// ============================================================================
// 7.1 — RhythmTransform
// ============================================================================

describe('RhythmTransform.augmentation', () => {
  it('doubles durations by default', () => {
    expect(RhythmTransform.augmentation([1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('uses custom factor', () => {
    expect(RhythmTransform.augmentation([1, 2], 3)).toEqual([3, 6]);
  });

  it('returns empty for empty input', () => {
    expect(RhythmTransform.augmentation([])).toEqual([]);
  });
});

describe('RhythmTransform.diminution', () => {
  it('halves durations by default', () => {
    expect(RhythmTransform.diminution([2, 4, 6])).toEqual([1, 2, 3]);
  });

  it('uses custom factor', () => {
    expect(RhythmTransform.diminution([9, 6, 3], 3)).toEqual([3, 2, 1]);
  });
});

describe('RhythmTransform.retrograde', () => {
  it('reverses the array', () => {
    expect(RhythmTransform.retrograde([1, 2, 3, 4])).toEqual([4, 3, 2, 1]);
  });

  it('retrograde of retrograde returns original', () => {
    const d = [1, 2, 3, 1];
    expect(RhythmTransform.retrograde(RhythmTransform.retrograde(d))).toEqual(d);
  });
});

describe('RhythmTransform.retrogradeInversion', () => {
  it('returns an array of same length', () => {
    expect(RhythmTransform.retrogradeInversion([1, 2, 3])).toHaveLength(3);
  });

  it('all values are non-negative', () => {
    const result = RhythmTransform.retrogradeInversion([1, 2, 3, 4]);
    expect(result.every(v => v >= 0)).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(RhythmTransform.retrogradeInversion([])).toEqual([]);
  });
});

// ============================================================================
// 7.2 — RhythmAnalysis
// ============================================================================

describe('RhythmAnalysis.detectSyncopation', () => {
  it('returns 0 for all strong-beat onsets', () => {
    const ts = new TimeSignature([4], 4);
    const pattern = [0, 2, 4, 6]; // beats 1, 3, 5, 7 (strong if 0-indexed even)
    const sync = RhythmAnalysis.detectSyncopation(pattern, ts);
    expect(sync).toBe(0);
  });

  it('returns 1 for all weak-beat onsets', () => {
    const ts = new TimeSignature([4], 4);
    const pattern = [1, 3, 5, 7]; // all odd = weak
    const sync = RhythmAnalysis.detectSyncopation(pattern, ts);
    expect(sync).toBe(1);
  });

  it('returns 0.5 for half strong, half weak', () => {
    const ts = new TimeSignature([4], 4);
    const pattern = [0, 1, 4, 5];
    const sync = RhythmAnalysis.detectSyncopation(pattern, ts);
    expect(sync).toBe(0.5);
  });

  it('returns 0 for empty pattern', () => {
    const ts = new TimeSignature([4], 4);
    expect(RhythmAnalysis.detectSyncopation([], ts)).toBe(0);
  });
});

describe('RhythmAnalysis.detectTresillo', () => {
  it('recognizes tresillo pattern', () => {
    const tresillo = [1, 0, 0, 1, 0, 0, 1, 0];
    expect(RhythmAnalysis.detectTresillo(tresillo)).toBe(true);
  });

  it('rejects non-tresillo pattern', () => {
    expect(RhythmAnalysis.detectTresillo([1, 0, 1, 0, 1, 0, 1, 0])).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(RhythmAnalysis.detectTresillo([1, 0, 0, 1])).toBe(false);
  });
});

describe('RhythmAnalysis.detectCinquillo', () => {
  it('recognizes cinquillo pattern', () => {
    const cinquillo = [1, 0, 1, 1, 0, 1, 0, 1];
    expect(RhythmAnalysis.detectCinquillo(cinquillo)).toBe(true);
  });

  it('rejects non-cinquillo', () => {
    expect(RhythmAnalysis.detectCinquillo([1, 0, 0, 1, 0, 0, 1, 0])).toBe(false);
  });
});

describe('RhythmAnalysis.detectClave', () => {
  it('identifies son clave 3-2', () => {
    const pattern = [1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0];
    expect(RhythmAnalysis.detectClave(pattern)).toBe('son-3-2');
  });

  it('identifies bossa nova', () => {
    const pattern = [1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0];
    expect(RhythmAnalysis.detectClave(pattern)).toBe('bossa');
  });

  it('returns none for unknown pattern', () => {
    const pattern = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];
    expect(RhythmAnalysis.detectClave(pattern)).toBe('none');
  });

  it('returns none for wrong length', () => {
    expect(RhythmAnalysis.detectClave([1, 0, 1])).toBe('none');
  });
});

// ============================================================================
// 7.3 — Clave pattern presets
// ============================================================================

describe('CLAVE_PATTERNS', () => {
  it('exports at least 8 patterns', () => {
    expect(Object.keys(CLAVE_PATTERNS).length).toBeGreaterThanOrEqual(8);
  });

  it('each pattern has name, steps, description', () => {
    for (const [, pattern] of Object.entries(CLAVE_PATTERNS)) {
      expect(typeof pattern.name).toBe('string');
      expect(Array.isArray(pattern.steps)).toBe(true);
      expect(pattern.steps.length).toBeGreaterThan(0);
      expect(typeof pattern.description).toBe('string');
    }
  });

  it('son-3-2 has 16 steps', () => {
    expect(CLAVE_PATTERNS['son-3-2'].steps).toHaveLength(16);
  });

  it('tresillo has 8 steps', () => {
    expect(CLAVE_PATTERNS['tresillo'].steps).toHaveLength(8);
  });

  it('son-3-2 matches detectClave result', () => {
    const steps = CLAVE_PATTERNS['son-3-2'].steps.map(Number);
    expect(RhythmAnalysis.detectClave(steps)).toBe('son-3-2');
  });

  it('bossa nova steps match detectClave', () => {
    const steps = CLAVE_PATTERNS['bossa'].steps.map(Number);
    expect(RhythmAnalysis.detectClave(steps)).toBe('bossa');
  });
});

// ============================================================================
// 7.4 — Polymeter
// ============================================================================

describe('Polymeter', () => {
  it('creates with multiple meters', () => {
    const pm = new Polymeter([TimeSignature.Common, TimeSignature.Waltz], 12);
    expect(pm).toBeDefined();
  });

  it('getCyclePosition returns array with one entry per meter', () => {
    const pm = new Polymeter([TimeSignature.Common, TimeSignature.Waltz], 12);
    const pos = pm.getCyclePosition(5);
    expect(pos).toHaveLength(2);
  });

  it('positionInMeter is within bounds', () => {
    const pm = new Polymeter([new TimeSignature([4], 4), new TimeSignature([3], 4)], 12);
    const pos = pm.getCyclePosition(7);
    expect(pos[0].positionInMeter).toBeLessThan(4);
    expect(pos[1].positionInMeter).toBeLessThan(3);
  });

  it('beat 0 position is 0 for all meters', () => {
    const pm = new Polymeter([TimeSignature.Common, TimeSignature.Waltz], 12);
    const pos = pm.getCyclePosition(0);
    expect(pos.every(p => p.positionInMeter === 0)).toBe(true);
  });
});

// ============================================================================
// 7.5 — MetricModulation
// ============================================================================

describe('MetricModulation.calculate', () => {
  it('dotted quarter = quarter → tempo × 3/2', () => {
    // fromTempo=120, old dotted quarter (3/8 of whole) maps to new quarter (1/4 of whole)
    // new tempo = 120 * (3/8) / (1/4) = 120 * 1.5 = 180
    const newTempo = MetricModulation.calculate(120, 3/8, 1/4);
    expect(newTempo).toBeCloseTo(180);
  });

  it('quarter = eighth → half tempo', () => {
    const newTempo = MetricModulation.calculate(120, 1/4, 1/2);
    expect(newTempo).toBeCloseTo(60);
  });

  it('same duration → same tempo', () => {
    expect(MetricModulation.calculate(100, 1/4, 1/4)).toBeCloseTo(100);
  });
});

describe('MetricModulation.equivalence', () => {
  it('returns newTempo as a number', () => {
    const result = MetricModulation.equivalence(
      new TimeSignature([4], 4),
      new TimeSignature([3], 4),
      0.25
    );
    expect(typeof result.newTempo).toBe('number');
    expect(result.newTempo).toBeGreaterThan(0);
  });
});

// ============================================================================
// 7.6 — Isorhythm
// ============================================================================

describe('Isorhythm', () => {
  it('generates events within totalBeats', () => {
    const iso = new Isorhythm([1, 2, 1], [60, 62, 64, 65]);
    const events = iso.generate(8);
    const total = events.reduce((sum, e) => sum + e.duration, 0);
    expect(total).toBeLessThanOrEqual(8);
  });

  it('cycles talea and color independently', () => {
    const iso = new Isorhythm([1, 2], [60, 62, 64]); // talea len=2, color len=3
    const events = iso.generate(20);
    expect(events.length).toBeGreaterThan(0);
    // Notes should cycle through color: 60,62,64,60,62,64...
    expect(events[0].note).toBe(60);
    expect(events[1].note).toBe(62);
    expect(events[2].note).toBe(64);
    expect(events[3].note).toBe(60); // wraps
  });

  it('returns empty for empty talea', () => {
    const iso = new Isorhythm([], [60, 62]);
    expect(iso.generate(8)).toHaveLength(0);
  });

  it('returns empty for totalBeats=0', () => {
    const iso = new Isorhythm([1, 2], [60, 62]);
    expect(iso.generate(0)).toHaveLength(0);
  });
});
