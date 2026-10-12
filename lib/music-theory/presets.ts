import { EDO, JustIntonation, CentTuning, NonOctaveTuning, TuningSystem, TET12 } from './tuning';
import { Scale } from './scale';
import { Chord } from './chord';

// ── Equal Divisions of the Octave ────────────────────────────────────────────

/**
 * 19-TET - good approximation of minor thirds and meantone; used in microtonalism.
 * @category Core
 */
export const TET19 = new EDO(19);

/**
 * 24-TET - quarter-tone tuning; common in Arabic and Turkish maqam music.
 * @category Core
 */
export const TET24 = new EDO(24);

/**
 * 31-TET - excellent meantone approximation; best EDO for pure major thirds.
 * @category Core
 */
export const TET31 = new EDO(31);

/**
 * 53-TET - closest standard EDO to 5-limit just intonation; scientific reference.
 * @category Core
 */
export const TET53 = new EDO(53);

// ── Historical Temperaments ──────────────────────────────────────────────────

/** Cents measured from C, re-measured from A (step 0 = A4): the tuning keeps its own A as reference. */
const centsFromA = (centsFromC: number[]): number[] =>
  centsFromC.map((_, k) => {
    const c = centsFromC[(k + 9) % 12] - centsFromC[9];
    return Math.round((c < 0 ? c + 1200 : c) * 1000) / 1000;
  });

/**
 * Werckmeister III (Well Temperament, 1691).
 * Used by Bach and contemporaries. Each key has a slightly different character.
 * Werckmeister's values are in cents from C; step 0 is A4 (A → C = 311.73¢).
 * @category Core
 */
export const WerckmeisterIII = new CentTuning(
  'Werckmeister III',
  centsFromA([0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18])
);

// ── Non-Octave Tunings ───────────────────────────────────────────────────────

/**
 * Bohlen-Pierce (ED3) - 13 equal steps to the tritave (ratio 3:1).
 * Developed independently by Heinz Bohlen (1972) and John Pierce (1984).
 * @category Core
 */
export const BohlenPierce = new NonOctaveTuning('Bohlen-Pierce', 13, 3);

// ── Just Intonation ──────────────────────────────────────────────────────────

/**
 * Ptolemaic (Ptolemy's Intense Diatonic) - 5-limit JI diatonic scale.
 * The classic just intonation tuning for the 7-note major scale.
 * Ratios: 1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8.
 * @category Core
 */
export const PtolemaicJI = new JustIntonation(
  'Ptolemaic Just Intonation',
  [[9, 8], [5, 4], [4, 3], [3, 2], [5, 3], [15, 8]]
);

/**
 * 5-Limit Just Intonation (Chromatic) - all 12 pitch classes tuned to pure 5-limit ratios.
 * The standard JI chromatic scale as used in classical JI analysis.
 * @category Core
 */
export const FiveLimitJI = new JustIntonation(
  '5-Limit Just Intonation',
  [[16, 15], [9, 8], [6, 5], [5, 4], [4, 3], [45, 32], [3, 2], [8, 5], [5, 3], [9, 5], [15, 8]]
);

// ── 12-TET Convenience Factories ─────────────────────────────────────────────

/**
 * Returns a major scale in 12-TET rooted at `rootStep` (steps from A4).
 * @category Core
 */
export const MajorScale12TET = (rootStep: number) => new Scale('Major', TET12, rootStep, [2, 2, 1, 2, 2, 2, 1]);

/**
 * Returns a natural minor scale in 12-TET rooted at `rootStep`.
 * @category Core
 */
export const MinorScale12TET = (rootStep: number) => new Scale('Natural Minor', TET12, rootStep, [2, 1, 2, 2, 1, 2, 2]);

/**
 * Returns a major triad in 12-TET rooted at `rootStep`.
 * @category Core
 */
export const MajorTriad12TET = (rootStep: number) => new Chord('Major Triad', TET12, rootStep, [0, 4, 7]);

/**
 * Returns a minor triad in 12-TET rooted at `rootStep`.
 * @category Core
 */
export const MinorTriad12TET = (rootStep: number) => new Chord('Minor Triad', TET12, rootStep, [0, 3, 7]);

/**
 * Returns a dominant 7th chord in 12-TET rooted at `rootStep`.
 * @category Core
 */
export const Dominant7th12TET = (rootStep: number) => new Chord('Dominant 7th', TET12, rootStep, [0, 4, 7, 10]);

// ── 24-TET Convenience Factories ─────────────────────────────────────────────

/**
 * Returns a neutral/Rast scale in 24-TET (approximates common maqam scales).
 * @category Core
 */
export const NeutralScale24TET = (rootStep: number) => new Scale('Neutral Scale', TET24, rootStep, [3, 4, 3, 4, 3, 4, 3]);

/**
 * Returns the Bayati maqam scale in 24-TET. Characteristic neutral 2nd above root.
 * @category Core
 */
export const BayatiScale24TET = (rootStep: number) => new Scale('Bayati', TET24, rootStep, [3, 3, 4, 4, 2, 4, 4]);

/**
 * Returns a neutral triad in 24-TET (neutral third = 350¢).
 * @category Core
 */
export const NeutralTriad24TET = (rootStep: number) => new Chord('Neutral Triad', TET24, rootStep, [0, 7, 14]);

// ── 31-TET Convenience Factories ─────────────────────────────────────────────

/**
 * Returns a quarter-comma meantone major scale in 31-TET.
 * @category Core
 */
export const MeantoneMajor31TET = (rootStep: number) => new Scale('Meantone Major', TET31, rootStep, [5, 5, 3, 5, 5, 5, 3]);

// ── Bohlen-Pierce Convenience Factories ──────────────────────────────────────

/**
 * Returns the BP Lambda chord (Dur triad) rooted at `rootStep`. Analogous to a major triad.
 * @category Core
 */
export const BohlenPierceLambdaChord = (rootStep: number) => new Chord('BP Lambda (Dur)', BohlenPierce, rootStep, [0, 6, 10]);

/**
 * Returns the BP Moll chord (Minor triad) rooted at `rootStep`.
 * @category Core
 */
export const BohlenPierceMollChord = (rootStep: number) => new Chord('BP Moll (Minor)', BohlenPierce, rootStep, [0, 4, 10]);

/**
 * Returns the full BP chromatic scale (13 equal steps per tritave).
 * @category Core
 */
export const BohlenPierceChromaticScale = (rootStep: number) => new Scale('BP Chromatic', BohlenPierce, rootStep, Array(13).fill(1));

// ── Generic Factories (tuning-agnostic) ──────────────────────────────────────

/**
 * Returns a major triad in any tuning system. Intervals mapped via `getStepFromStandard`.
 * @category Core
 */
export const MajorTriad = (tuning: TuningSystem, rootStep: number) => new Chord('Major Triad', tuning, rootStep, [0, 4, 7].map(s => tuning.getStepFromStandard(s)));

/**
 * Returns a minor triad in any tuning system. Intervals mapped via `getStepFromStandard`.
 * @category Core
 */
export const MinorTriad = (tuning: TuningSystem, rootStep: number) => new Chord('Minor Triad', tuning, rootStep, [0, 3, 7].map(s => tuning.getStepFromStandard(s)));

/**
 * Returns a chromatic scale spanning one full period of any tuning system.
 * @category Core
 */
export const ChromaticScale = (tuning: TuningSystem, rootStep: number) => {
  const pattern = Array(tuning.octaveSteps).fill(1);
  return new Scale('Chromatic/Full', tuning, rootStep, pattern);
};

// ── Harmonic / Overtone Series Scales ────────────────────────────────────────

/**
 * Builds a scale from a segment of the harmonic series. The tuning is octave-repeating JI whose
 * pitch classes are the partials reduced to one octave; the scale climbs through the partials,
 * so a segment wider than an octave (1–16) spans several octaves.
 * @param rootHz - Frequency of the first partial in Hz (scale step 0).
 * @param fromHarmonic - First partial (e.g. 8).
 * @param toHarmonic - Last partial (e.g. 16).
 * @category Core
 */
export function HarmonicSeries(rootHz: number, fromHarmonic: number, toHarmonic: number): Scale {
  if (!Number.isInteger(fromHarmonic) || !Number.isInteger(toHarmonic) || fromHarmonic < 1 || toHarmonic <= fromHarmonic) {
    throw new RangeError(`HarmonicSeries: invalid partial range ${fromHarmonic}–${toHarmonic}`);
  }
  // Each partial n as (octave, ratio n / (from · 2^octave) in [1, 2)).
  const partials = [];
  for (let n = fromHarmonic; n <= toHarmonic; n++) {
    const octave = Math.floor(Math.log2(n / fromHarmonic) + 1e-9);
    partials.push({ octave, num: n, den: fromHarmonic * 2 ** octave });
  }
  const classes = [...new Map(partials.map(p => [p.num / p.den, p])).values()]
    .sort((a, b) => a.num / a.den - b.num / b.den);
  const classIndex = (p: { num: number, den: number }) => classes.findIndex(c => c.num / c.den === p.num / p.den);
  const tuning = new JustIntonation(`Harmonic ${fromHarmonic}–${toHarmonic}`, classes.map(c => [c.num, c.den] as [number, number]), rootHz);
  const steps = partials.map(p => p.octave * classes.length + classIndex(p));
  const pattern = steps.slice(1).map((s, i) => s - steps[i]);
  return new Scale(`Harmonic Series ${fromHarmonic}–${toHarmonic}`, tuning, 0, pattern);
}

/**
 * Harmonic series partials 1–16 (full overtone scale).
 * @category Core
 */
export const Harmonics1to16 = HarmonicSeries(440, 1, 16);

/**
 * Harmonic series partials 8–16 (one-octave segment, upper harmonics).
 * @category Core
 */
export const Harmonics8to16 = HarmonicSeries(440, 8, 16);

/**
 * Harmonic series partials 16–32 (very high harmonics).
 * @category Core
 */
export const Harmonics16to32 = HarmonicSeries(440, 16, 32);

