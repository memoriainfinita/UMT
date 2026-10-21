import { Chord } from './chord';
import { parseRomanProgression } from './parser';
import { TuningSystem, TET12 } from './tuning';

/**
 * A named chord progression of `PROGRESSIONS`.
 * @category Tonal harmony
 */
export interface ProgressionEntry {
  /** Its id in `PROGRESSIONS`: `'ii-V-I'`, `'blues-12'`. */
  name: string;
  /** Roman numerals, read with `parseRomanProgression` in the key given to `getProgression`. */
  romanNumerals: string[];
  /** What it is and where it is used. */
  description: string;
  /**
   * `'jazz'`, `'pop'`, `'blues'`, `'classical'`, `'flamenco'`, `'folk'`; `'cadence'` and
   * `'mixture'` for the examples of a cadence or of modal mixture.
   */
  style: string;
  /** Key it is usually played in, when there is one (`'Bb major'` for the jazz blues). */
  defaultKey?: string;
  /** The mode its numerals are written in, for the examples that need one (`'minor'` for the Picardy third). */
  mode?: 'major' | 'minor';
  /** The cadence its last two chords make, as `Harmony.analyzeCadence` names it. */
  cadence?: string;
  /** Where the example comes from. */
  source?: string;
}

const CADENCES_SOURCE = 'First-Year Music Theory (Minnesota State), "Cadences"; musictheory.net, "Cadences"';
const MIXTURE_SOURCE = 'Open Music Theory, "Modal Mixture"';

/**
 * Named progressions by id: ii-V-I, twelve-bar blues, rhythm changes, Coltrane changes, Andalusian cadence…, and examples of each cadence and of modal mixture (`style` `'cadence'` and `'mixture'`, with `mode`, `cadence` and `source`). Build one with `getProgression(id, key)`.
 * @category Tonal harmony
 */
export const PROGRESSIONS: Record<string, ProgressionEntry> = {
  'ii-V-I': {
    name: 'ii-V-I',
    romanNumerals: ['iim7', 'V7', 'Imaj7'],
    description: 'The cornerstone of jazz harmony. Subdominant → dominant → tonic resolution.',
    style: 'jazz',
  },
  'ii-V-i': {
    name: 'ii-V-i',
    romanNumerals: ['iim7b5', 'V7', 'im'],
    description: 'Minor key ii-V-i. Half-diminished ii, dominant V, minor tonic.',
    style: 'jazz',
  },
  'I-V-vi-IV': {
    name: 'I-V-vi-IV',
    romanNumerals: ['I', 'V', 'vi', 'IV'],
    description: 'Ubiquitous pop/rock progression (axis progression).',
    style: 'pop',
  },
  'I-vi-IV-V': {
    name: 'I-vi-IV-V',
    romanNumerals: ['I', 'vi', 'IV', 'V'],
    description: "50s progression. Backbone of doo-wop and classic rock'n'roll.",
    style: 'pop',
  },
  'I-IV-V': {
    name: 'I-IV-V',
    romanNumerals: ['I', 'IV', 'V'],
    description: '3-chord foundation of blues, country, and folk.',
    style: 'folk',
  },
  'blues-12': {
    name: 'blues-12',
    romanNumerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    description: '12-bar blues. Dominant sevenths on I, IV and V, with V in the turnaround.',
    style: 'blues',
  },
  'blues-minor': {
    name: 'blues-minor',
    romanNumerals: ['i7', 'i7', 'i7', 'i7', 'iv7', 'iv7', 'i7', 'i7', 'V7', 'iv7', 'i7', 'V7'],
    description: '12-bar minor blues.',
    style: 'blues',
  },
  'blues-jazz': {
    name: 'blues-jazz',
    romanNumerals: ['I7', 'IV7', 'I7', 'v7 I7', 'IV7', '#iv°7', 'I7', 'VI7', 'ii7', 'V7', 'I7 VI7', 'ii7 V7'],
    description: 'Jazz blues. ii-V into IV in bar 4, #iv°7 in bar 6, VI7 leading to the ii-V turnaround.',
    style: 'jazz',
    defaultKey: 'Bb major',
  },
  'rhythm-changes': {
    name: 'rhythm-changes',
    romanNumerals: ['Imaj7', 'vi7', 'ii7', 'V7', 'Imaj7', 'vi7', 'ii7', 'V7',
                    'Imaj7', 'I7', 'IVmaj7', 'iv7', 'Imaj7', 'V7', 'Imaj7', 'V7'],
    description: "Rhythm changes A section (from Gershwin's I Got Rhythm).",
    style: 'jazz',
    defaultKey: 'Bb major',
  },
  'coltrane-changes': {
    name: 'coltrane-changes',
    romanNumerals: ['ii7', 'bIII7', 'bVImaj7', 'VII7', 'IIImaj7', 'V7', 'Imaj7'],
    description: 'Coltrane changes - a ii-V-I passing through tonics a major third apart (I, bVI, III), each reached by its dominant. Used in Countdown.',
    style: 'jazz',
  },
  'andalusian': {
    name: 'andalusian',
    romanNumerals: ['i', 'VII', 'VI', 'V'],
    description: 'Andalusian cadence. Descending minor tetrachord with Phrygian flavour.',
    style: 'flamenco',
  },
  'pachelbel': {
    name: 'pachelbel',
    romanNumerals: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    description: "Pachelbel's Canon progression. Ubiquitous in baroque and pop.",
    style: 'classical',
  },
  'turnaround-jazz': {
    name: 'turnaround-jazz',
    romanNumerals: ['Imaj7', 'vi7', 'ii7', 'V7'],
    description: 'Standard jazz turnaround. I-vi-ii-V cycle.',
    style: 'jazz',
  },
  'backdoor-ii-V': {
    name: 'backdoor-ii-V',
    romanNumerals: ['iv7', 'bVII7', 'Imaj7'],
    description: 'Backdoor ii-V-I. bVII7 resolves up a whole step to I.',
    style: 'jazz',
  },
  'bird-blues': {
    name: 'bird-blues',
    romanNumerals: ['Imaj7', 'viiø7 III7', 'vi7 II7', 'v7 I7', 'IV7', 'iv7 bVII7', 'iii7 VI7', 'biii7 bVI7', 'ii7', 'V7', 'Imaj7 VI7', 'ii7 V7'],
    description: "Bird blues (Parker's Blues for Alice). Chains of ii-V descending from bar 2 to bar 8.",
    style: 'jazz',
    defaultKey: 'F major',
  },
  'giant-steps-cycle': {
    name: 'giant-steps-cycle',
    romanNumerals: ['Imaj7 bIII7', 'bVImaj7 VII7', 'IIImaj7'],
    description: "Opening of Giant Steps (bars 1-3): tonics B, G and Eb a major third apart, each reached by its dominant. In B major the roots are spelled with sharps (A#7, D#maj7).",
    style: 'jazz',
    defaultKey: 'B major',
  },
  'authentic-cadence': {
    name: 'authentic-cadence',
    romanNumerals: ['I', 'IV', 'V7', 'I'],
    description: 'Authentic cadence: the dominant, with its leading tone, resolves to the tonic.',
    style: 'cadence', mode: 'major', cadence: 'Authentic Cadence (V -> I)', source: CADENCES_SOURCE,
  },
  'plagal-cadence': {
    name: 'plagal-cadence',
    romanNumerals: ['I', 'IV', 'I'],
    description: 'Plagal ("Amen") cadence: the subdominant moves to the tonic.',
    style: 'cadence', mode: 'major', cadence: 'Plagal Cadence (IV -> I)', source: CADENCES_SOURCE,
  },
  'deceptive-cadence': {
    name: 'deceptive-cadence',
    romanNumerals: ['I', 'IV', 'V7', 'vi'],
    description: 'Deceptive cadence: the dominant moves to vi instead of the tonic.',
    style: 'cadence', mode: 'major', cadence: 'Deceptive Cadence (V -> vi)', source: CADENCES_SOURCE,
  },
  'half-cadence': {
    name: 'half-cadence',
    romanNumerals: ['I', 'vi', 'IV', 'V'],
    description: 'Half cadence: the phrase stops on the dominant.',
    style: 'cadence', mode: 'major', cadence: 'Half Cadence (-> V)', source: CADENCES_SOURCE,
  },
  'phrygian-half-cadence': {
    name: 'phrygian-half-cadence',
    romanNumerals: ['i', 'iv63', 'V'],
    description: 'Phrygian half cadence, in minor: iv in first inversion to V, the bass falling a semitone (F → E in A minor).',
    style: 'cadence', mode: 'minor', cadence: 'Phrygian Half Cadence (iv -> V)', source: CADENCES_SOURCE,
  },
  'minor-plagal-cadence': {
    name: 'minor-plagal-cadence',
    romanNumerals: ['I', 'IV', 'iv', 'I'],
    description: 'Minor plagal cadence: the minor iv, borrowed from the parallel minor, moves to the major tonic.',
    style: 'cadence', mode: 'major', cadence: 'Minor Plagal Cadence (iv -> i)', source: `${CADENCES_SOURCE}; ${MIXTURE_SOURCE}`,
  },
  'bVI-bVII-I': {
    name: 'bVI-bVII-I',
    romanNumerals: ['I', 'bVI', 'bVII', 'I'],
    description: 'bVI and bVII, borrowed from the parallel minor, rising to the major tonic.',
    style: 'mixture', mode: 'major', source: MIXTURE_SOURCE,
  },
  'picardy-third': {
    name: 'picardy-third',
    romanNumerals: ['i', 'iv', 'V7', 'I'],
    description: 'Picardy third: a minor-key phrase ends on the major tonic.',
    style: 'mixture', mode: 'minor', cadence: 'Authentic Cadence (V -> I)', source: MIXTURE_SOURCE,
  },
};

/**
 * Returns a realized Chord[] for the named progression in the given key.
 * A bar with two chords ("ii7 V7") gives both, in order.
 * @category Tonal harmony
 */
export function getProgression(id: string, keySymbol: string, tuning: TuningSystem = TET12): Chord[] {
  const entry = PROGRESSIONS[id];
  if (!entry) throw new Error(`Unknown progression: "${id}"`);
  // Flatten compound tokens ("ii7 V7" → "ii7", "V7") and realize individually
  const tokens = entry.romanNumerals.flatMap(rn => rn.trim().split(/\s+/));
  const roman = tokens.join(' ');
  return parseRomanProgression(roman, keySymbol, tuning);
}
