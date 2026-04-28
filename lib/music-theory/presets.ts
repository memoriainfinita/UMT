import { EDO, JustIntonation, CentTuning, NonOctaveTuning, TuningSystem, TET12 } from './tuning';
import { Scale } from './scale';
import { Chord } from './chord';

// ── Equal Divisions of the Octave ────────────────────────────────────────────

/** 19-TET - good approximation of minor thirds and meantone; used in microtonalism. */
export const TET19 = new EDO(19);

/** 24-TET - quarter-tone tuning; common in Arabic and Turkish maqam music. */
export const TET24 = new EDO(24);

/** 31-TET - excellent meantone approximation; best EDO for pure major thirds. */
export const TET31 = new EDO(31);

/** 53-TET - closest standard EDO to 5-limit just intonation; scientific reference. */
export const TET53 = new EDO(53);

// ── Historical Temperaments ──────────────────────────────────────────────────

/**
 * Werckmeister III (Well Temperament, 1691).
 * Used by Bach and contemporaries. Each key has a slightly different character.
 * Values in cents from C, following Werckmeister's original specification.
 */
export const WerckmeisterIII = new CentTuning(
  'Werckmeister III',
  [0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18]
);

// ── Non-Octave Tunings ───────────────────────────────────────────────────────

/**
 * Bohlen-Pierce (ED3) - 13 equal steps to the tritave (ratio 3:1).
 * Developed independently by Heinz Bohlen (1972) and John Pierce (1984).
 */
export const BohlenPierce = new NonOctaveTuning('Bohlen-Pierce', 13, 3);

// ── Just Intonation ──────────────────────────────────────────────────────────

/**
 * Ptolemaic (Ptolemy's Intense Diatonic) - 5-limit JI diatonic scale.
 * The classic just intonation tuning for the 7-note major scale.
 * Ratios: 1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8.
 */
export const PtolemaicJI = new JustIntonation(
  'Ptolemaic Just Intonation',
  [[9, 8], [5, 4], [4, 3], [3, 2], [5, 3], [15, 8]]
);

/**
 * 5-Limit Just Intonation (Chromatic) - all 12 pitch classes tuned to pure 5-limit ratios.
 * The standard JI chromatic scale as used in classical JI analysis.
 */
export const FiveLimitJI = new JustIntonation(
  '5-Limit Just Intonation',
  [[16, 15], [9, 8], [6, 5], [5, 4], [4, 3], [45, 32], [3, 2], [8, 5], [5, 3], [9, 5], [15, 8]]
);

// ── 12-TET Convenience Factories ─────────────────────────────────────────────

/** Returns a major scale in 12-TET rooted at `rootStep` (steps from A4). */
export const MajorScale12TET = (rootStep: number) => new Scale('Major', TET12, rootStep, [2, 2, 1, 2, 2, 2, 1]);

/** Returns a natural minor scale in 12-TET rooted at `rootStep`. */
export const MinorScale12TET = (rootStep: number) => new Scale('Natural Minor', TET12, rootStep, [2, 1, 2, 2, 1, 2, 2]);

/** Returns a major triad in 12-TET rooted at `rootStep`. */
export const MajorTriad12TET = (rootStep: number) => new Chord('Major Triad', TET12, rootStep, [0, 4, 7]);

/** Returns a minor triad in 12-TET rooted at `rootStep`. */
export const MinorTriad12TET = (rootStep: number) => new Chord('Minor Triad', TET12, rootStep, [0, 3, 7]);

/** Returns a dominant 7th chord in 12-TET rooted at `rootStep`. */
export const Dominant7th12TET = (rootStep: number) => new Chord('Dominant 7th', TET12, rootStep, [0, 4, 7, 10]);

// ── 24-TET Convenience Factories ─────────────────────────────────────────────

/** Returns a neutral/Rast scale in 24-TET (approximates common maqam scales). */
export const NeutralScale24TET = (rootStep: number) => new Scale('Neutral Scale', TET24, rootStep, [3, 4, 3, 4, 3, 4, 3]);

/** Returns the Bayati maqam scale in 24-TET. Characteristic neutral 2nd above root. */
export const BayatiScale24TET = (rootStep: number) => new Scale('Bayati', TET24, rootStep, [3, 3, 4, 4, 2, 4, 4]);

/** Returns a neutral triad in 24-TET (neutral third = 350¢). */
export const NeutralTriad24TET = (rootStep: number) => new Chord('Neutral Triad', TET24, rootStep, [0, 7, 14]);

// ── 31-TET Convenience Factories ─────────────────────────────────────────────

/** Returns a quarter-comma meantone major scale in 31-TET. */
export const MeantoneMajor31TET = (rootStep: number) => new Scale('Meantone Major', TET31, rootStep, [5, 5, 3, 5, 5, 5, 3]);

// ── Bohlen-Pierce Convenience Factories ──────────────────────────────────────

/** Returns the BP Lambda chord (Dur triad) rooted at `rootStep`. Analogous to a major triad. */
export const BohlenPierceLambdaChord = (rootStep: number) => new Chord('BP Lambda (Dur)', BohlenPierce, rootStep, [0, 6, 10]);

/** Returns the BP Moll chord (Minor triad) rooted at `rootStep`. */
export const BohlenPierceMollChord = (rootStep: number) => new Chord('BP Moll (Minor)', BohlenPierce, rootStep, [0, 4, 10]);

/** Returns the full BP chromatic scale (13 equal steps per tritave). */
export const BohlenPierceChromaticScale = (rootStep: number) => new Scale('BP Chromatic', BohlenPierce, rootStep, Array(13).fill(1));

// ── Generic Factories (tuning-agnostic) ──────────────────────────────────────

/** Returns a major triad in any tuning system. Intervals mapped via `getStepFromStandard`. */
export const MajorTriad = (tuning: TuningSystem, rootStep: number) => new Chord('Major Triad', tuning, rootStep, [0, 4, 7].map(s => tuning.getStepFromStandard(s)));

/** Returns a minor triad in any tuning system. Intervals mapped via `getStepFromStandard`. */
export const MinorTriad = (tuning: TuningSystem, rootStep: number) => new Chord('Minor Triad', tuning, rootStep, [0, 3, 7].map(s => tuning.getStepFromStandard(s)));

/** Returns a chromatic scale spanning one full period of any tuning system. */
export const ChromaticScale = (tuning: TuningSystem, rootStep: number) => {
  const pattern = Array(tuning.octaveSteps).fill(1);
  return new Scale('Chromatic/Full', tuning, rootStep, pattern);
};

// ── Harmonic / Overtone Series Scales ────────────────────────────────────────

import { JustIntonation as _JI } from './tuning';

/**
 * Builds a JI scale from a segment of the harmonic series.
 * @param rootHz - Fundamental frequency in Hz.
 * @param fromHarmonic - First partial (e.g. 8).
 * @param toHarmonic - Last partial (e.g. 16).
 */
export function HarmonicSeries(rootHz: number, fromHarmonic: number, toHarmonic: number): Scale {
  const ratios: [number, number][] = [];
  for (let n = fromHarmonic; n <= toHarmonic; n++) {
    ratios.push([n, fromHarmonic]);
  }
  const tuning = new _JI(`Harmonic ${fromHarmonic}–${toHarmonic}`, ratios, rootHz);
  const pattern = Array(ratios.length - 1).fill(1);
  return new Scale(`Harmonic Series ${fromHarmonic}–${toHarmonic}`, tuning, 0, pattern);
}

/** Harmonic series partials 1–16 (full overtone scale). */
export const Harmonics1to16 = HarmonicSeries(440, 1, 16);

/** Harmonic series partials 8–16 (one-octave segment, upper harmonics). */
export const Harmonics8to16 = HarmonicSeries(440, 8, 16);

/** Harmonic series partials 16–32 (very high harmonics). */
export const Harmonics16to32 = HarmonicSeries(440, 16, 32);

