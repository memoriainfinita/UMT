import { Chord } from './chord';
import { parseRomanProgression } from './parser';
import { TuningSystem, TET12 } from './tuning';

export interface ProgressionEntry {
  name: string;
  romanNumerals: string[];
  description: string;
  style: string;
  defaultKey?: string;
}

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
    description: 'Minor key ii-V-i. Half-diminished ii leads to altered dominant.',
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
    description: '12-bar blues. Standard I7-IV7-V7 form with turnaround.',
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
    romanNumerals: ['Imaj7', 'IV7', 'Imaj7', 'Imaj7', 'IV7', 'IV7', 'Imaj7', 'vi7', 'ii7', 'V7', 'Imaj7', 'ii7 V7'],
    description: 'Jazz blues (Bird blues variant). Richer substitutions.',
    style: 'jazz',
    defaultKey: 'Bb major',
  },
  'rhythm-changes': {
    name: 'rhythm-changes',
    romanNumerals: ['Imaj7', 'vi7', 'ii7', 'V7', 'Imaj7', 'vi7', 'ii7', 'V7',
                    'Imaj7', 'I7', 'IVmaj7', 'IVm7', 'Imaj7', 'V7', 'Imaj7', 'V7'],
    description: "Rhythm changes A section (from Gershwin's I Got Rhythm).",
    style: 'jazz',
    defaultKey: 'Bb major',
  },
  'coltrane-changes': {
    name: 'coltrane-changes',
    romanNumerals: ['Imaj7', 'bIIImaj7', 'bVImaj7', 'Imaj7'],
    description: "Coltrane changes - tonic substitution by major thirds (tritone sub cycle). Used in Giant Steps.",
    style: 'jazz',
  },
  'andalusian': {
    name: 'andalusian',
    romanNumerals: ['i', 'bVII', 'bVI', 'V'],
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
    description: 'Backdoor ii-V-I. bVII7 resolves to I by half-step above.',
    style: 'jazz',
  },
  'bird-blues': {
    name: 'bird-blues',
    romanNumerals: ['Imaj7', 'IV7', 'Imaj7', 'iim7b5 V7alt', 'IV7', 'iv7', 'Imaj7', 'vi7', 'iim7b5', 'V7alt', 'Imaj7', 'ii7 V7'],
    description: "Parker blues (Bird blues). Extended substitutions throughout.",
    style: 'jazz',
    defaultKey: 'F major',
  },
  'giant-steps-cycle': {
    name: 'giant-steps-cycle',
    romanNumerals: ['Imaj7', 'V7', 'bIIImaj7', 'bVII7', 'bVImaj7', 'bIII7', 'bVImaj7'],
    description: "Giant Steps tonal cycle. Three tonal centers a major third apart.",
    style: 'jazz',
    defaultKey: 'B major',
  },
};

/**
 * Returns a realized Chord[] for the named progression in the given key.
 * Progressions with compound roman numerals (e.g. "ii7 V7") use only the first token.
 */
export function getProgression(id: string, keySymbol: string, tuning: TuningSystem = TET12): Chord[] {
  const entry = PROGRESSIONS[id];
  if (!entry) throw new Error(`Unknown progression: "${id}"`);
  // Flatten compound tokens ("ii7 V7" → "ii7", "V7") and realize individually
  const tokens = entry.romanNumerals.flatMap(rn => rn.trim().split(/\s+/));
  const roman = tokens.join(' ');
  return parseRomanProgression(roman, keySymbol, tuning);
}
