import { EDO, JustIntonation, CentTuning, NonOctaveTuning, TuningSystem } from './tuning';
import { Scale } from './scale';
import { Chord } from './chord';

// TET12 is defined in tuning.ts — re-exported via index.ts.

// Quarter-tone 24-TET
export const TET24 = new EDO(24);

// 31-TET (good approximation of meantone temperament)
export const TET31 = new EDO(31);

// Werckmeister III (Well Temperament)
export const WerckmeisterIII = new CentTuning(
  'Werckmeister III',
  [0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18]
);

// Bohlen-Pierce (ED3) - 13 steps to the tritave (ratio 3:1)
export const BohlenPierce = new NonOctaveTuning('Bohlen-Pierce', 13, 3);

// Ptolemaic Intense Diatonic Scale (Just Intonation)
export const PtolemaicJI = new JustIntonation(
  'Ptolemaic Just Intonation',
  [
    [1, 1],
    [9, 8],
    [5, 4],
    [4, 3],
    [3, 2],
    [5, 3],
    [15, 8]
  ]
);

// 5-Limit Just Intonation (Chromatic)
export const FiveLimitJI = new JustIntonation(
  '5-Limit Just Intonation',
  [
    [1, 1],
    [16, 15],
    [9, 8],
    [6, 5],
    [5, 4],
    [4, 3],
    [45, 32],
    [3, 2],
    [8, 5],
    [5, 3],
    [9, 5],
    [15, 8]
  ]
);

// Common Scales in 12-TET
export const MajorScale12TET = (rootStep: number) => new Scale('Major', TET12, rootStep, [2, 2, 1, 2, 2, 2, 1]);
export const MinorScale12TET = (rootStep: number) => new Scale('Natural Minor', TET12, rootStep, [2, 1, 2, 2, 1, 2, 2]);

// Common Chords in 12-TET
export const MajorTriad12TET = (rootStep: number) => new Chord('Major Triad', TET12, rootStep, [0, 4, 7]);
export const MinorTriad12TET = (rootStep: number) => new Chord('Minor Triad', TET12, rootStep, [0, 3, 7]);
export const Dominant7th12TET = (rootStep: number) => new Chord('Dominant 7th', TET12, rootStep, [0, 4, 7, 10]);

// Scales in 24-TET
export const NeutralScale24TET = (rootStep: number) => new Scale('Neutral Scale', TET24, rootStep, [3, 4, 3, 4, 3, 4, 3]); // Approximates some maqams
export const BayatiScale24TET = (rootStep: number) => new Scale('Bayati', TET24, rootStep, [3, 3, 4, 4, 2, 4, 4]);

// Chords in 24-TET
export const NeutralTriad24TET = (rootStep: number) => new Chord('Neutral Triad', TET24, rootStep, [0, 7, 14]);

// Scales in 31-TET
export const MeantoneMajor31TET = (rootStep: number) => new Scale('Meantone Major', TET31, rootStep, [5, 5, 3, 5, 5, 5, 3]);

// Bohlen-Pierce specific structures
export const BohlenPierceLambdaChord = (rootStep: number) => new Chord('BP Lambda (Dur)', BohlenPierce, rootStep, [0, 6, 10]);
export const BohlenPierceMollChord = (rootStep: number) => new Chord('BP Moll (Minor)', BohlenPierce, rootStep, [0, 4, 10]);
export const BohlenPierceChromaticScale = (rootStep: number) => new Scale('BP Chromatic', BohlenPierce, rootStep, Array(13).fill(1));

// Generic structures
export const MajorTriad = (tuning: TuningSystem, rootStep: number) => new Chord('Major Triad', tuning, rootStep, [0, 4, 7]);
export const ChromaticScale = (tuning: TuningSystem, rootStep: number) => {
  const pattern = Array(tuning.octaveSteps).fill(1);
  return new Scale('Chromatic/Full', tuning, rootStep, pattern);
};

