/**
 * Tests for lib/music-theory/tuning.ts.
 * Tuning systems: Werckmeister III, harmonic series, Bohlen-Pierce, and the 12-TET step mapping.
 */
import { describe, it, expect } from 'vitest';
import { CentTuning, EDO } from '../../lib/music-theory/tuning';
import { HarmonicSeries, Harmonics1to16, Harmonics8to16, WerckmeisterIII, FiveLimitJI, BohlenPierce, PtolemaicJI } from '../../lib/music-theory/presets';
import { parseScaleSymbol } from '../../lib/music-theory/parser';
import { parseScala } from '../../lib/music-theory/scala';

describe('core fixes (audit 2026-10, phase 1)', () => {
  it('CentTuning does not change the array it is given', () => {
    const cents = [100, 200];
    const t = new CentTuning('t', cents);
    expect(cents).toEqual([100, 200]);
    expect(t.cents).toEqual([0, 100, 200]);
  });
});

describe('HarmonicSeries presets', () => {
  it('HarmonicSeries() returns a Scale', () => {
    const s = HarmonicSeries(440, 4, 8);
    expect(s).toBeDefined();
    expect(s.name).toContain('Harmonic');
  });

  it('Harmonics1to16 is defined', () => {
    expect(Harmonics1to16).toBeDefined();
  });

  it('Harmonics8to16 is defined', () => {
    expect(Harmonics8to16).toBeDefined();
  });
});

describe('Werckmeister III', () => {
  it('keeps A4 at 440 Hz and C a Werckmeister minor third above A', () => {
    expect(WerckmeisterIII.getFrequency(0)).toBeCloseTo(440, 6);
    // The table is measured from C, where A is 888.27¢: A → C = 1200 − 888.27
    expect(WerckmeisterIII.getInterval(3).cents).toBeCloseTo(311.73, 2);
    expect(WerckmeisterIII.getInterval(12).cents).toBeCloseTo(1200, 6);
  });

  it('tempers the fifths C → G and G → D by a quarter comma', () => {
    const c = WerckmeisterIII.getInterval(3).cents;
    const g = WerckmeisterIII.getInterval(10).cents;
    const d = WerckmeisterIII.getInterval(5).cents + 1200;
    expect(g - c).toBeCloseTo(696.09, 2);
    expect(d - g).toBeCloseTo(696.09, 2);
  });
});

describe('HarmonicSeries', () => {
  it('partials 1–16 sound at n × the fundamental', () => {
    const freqs = Harmonics1to16.getNotes().map(n => n.frequency);
    expect(freqs).toHaveLength(16);
    freqs.forEach((f, i) => expect(f).toBeCloseTo(440 * (i + 1), 6));
  });

  it('partials 8–16 fill one octave without a duplicated 2/1 class', () => {
    const notes = Harmonics8to16.getNotes();
    expect(notes).toHaveLength(9);
    notes.forEach((n, i) => expect(n.frequency).toBeCloseTo(440 * (8 + i) / 8, 6));
    expect(Harmonics8to16.tuningSystem.octaveSteps).toBe(8);
    // The next octave repeats the same classes: 2 × 9/8 × 440 = 990 Hz.
    expect(Harmonics8to16.getNotes(2)[9].frequency).toBeCloseTo(990, 6);
  });

  it('rejects an empty or invalid range', () => {
    expect(() => HarmonicSeries(440, 8, 8)).toThrow(RangeError);
    expect(() => HarmonicSeries(440, 0, 8)).toThrow(RangeError);
  });
});

describe('getStepFromStandard: nearest step in cents for every tuning', () => {
  it('Bohlen-Pierce maps a fifth to step 5 (731.6¢), not 8', () => {
    expect(BohlenPierce.getStepFromStandard(7)).toBe(5);
    expect(BohlenPierce.getStepFromStandard(19)).toBe(13); // tritave 3:1 ≈ 1902¢ ≈ 19 semitones
  });

  it('an unequal cent table and a Scala tuning pick the nearest pitch', () => {
    const seven = new CentTuning('7 unequal', [0, 200, 350, 500, 700, 900, 1050]);
    expect(seven.getStepFromStandard(4)).toBe(2);  // 400¢ → 350¢
    expect(seven.getStepFromStandard(3)).toBe(2);  // 300¢ → 350¢
    expect(seven.getStepFromStandard(-1)).toBe(-1); // −100¢ → 1050 − 1200 = −150¢
    const scl = parseScala('pent\n5\n200.0\n400.0\n700.0\n900.0\n2/1\n');
    expect(scl.getStepFromStandard(7)).toBe(3);
    expect(scl.getStepFromStandard(12)).toBe(5);
  });

  it('12-step tunings stay one to one', () => {
    expect(FiveLimitJI.getStepFromStandard(6)).toBe(6);
    expect(new EDO(24).getStepFromStandard(7)).toBe(14);
  });
});

describe('getPatternFromStandard: scale patterns keep their span', () => {
  const span = (p: number[]) => p.reduce((a, b) => a + b, 0);
  it('22-EDO major spans 22 steps; 19-EDO major spans 19', () => {
    expect(span(new EDO(22).getPatternFromStandard([2, 2, 1, 2, 2, 2, 1]))).toBe(22);
    expect(new EDO(19).getPatternFromStandard([2, 2, 1, 2, 2, 2, 1])).toEqual([3, 3, 2, 3, 3, 3, 2]);
  });

  it('A major in 7-note Ptolemaic JI (on A) is one step per degree', () => {
    expect(parseScaleSymbol('A major', PtolemaicJI).stepPattern).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('C major is refused in Ptolemaic JI on A: it has C#, not C', () => {
    expect(() => parseScaleSymbol('C major', PtolemaicJI)).toThrow(RangeError);
  });
});
