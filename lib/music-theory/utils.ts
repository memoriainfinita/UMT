import { Hertz, MidiNote } from './types';

export const NOTE_NAMES_12TET_SHARP = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
export const NOTE_NAMES_12TET_FLAT = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

const NOTE_REGEX = /^([A-G])([#b]*)/;

/**
 * Converts a standard note name (e.g., "C#", "Bb") + octave to steps from A4 in 12-TET.
 * A4 = 0. C4 = -9.
 */
export function parseNoteToStep12TET(noteName: string, octave: number = 4): number {
  const baseNotes: Record<string, number> = { 'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2 };
  const match = noteName.match(NOTE_REGEX);
  if (!match) throw new Error(`Invalid note name: ${noteName}`);
  const [, note, accidentals] = match;
  let step = baseNotes[note];
  for (const acc of accidentals) {
    if (acc === '#') step += 1;
    if (acc === 'b') step -= 1;
  }
  step += (octave - 4) * 12;
  return step;
}

export function get12TETName(stepsFromA4: number, preferFlats: boolean = false): string {
  const normalizedStep = ((stepsFromA4 % 12) + 12) % 12;
  const octave = Math.floor((stepsFromA4 + 9) / 12) + 4; // A4 is step 0. C4 is step -9.
  const names = preferFlats ? NOTE_NAMES_12TET_FLAT : NOTE_NAMES_12TET_SHARP;
  return `${names[normalizedStep]}${octave}`;
}

/** Returns just the note letter+accidental without octave number (e.g. "C#", "Bb"). */
export function get12TETBaseName(stepsFromA4: number, preferFlats: boolean = false): string {
  const normalizedStep = ((stepsFromA4 % 12) + 12) % 12;
  const names = preferFlats ? NOTE_NAMES_12TET_FLAT : NOTE_NAMES_12TET_SHARP;
  return names[normalizedStep];
}

export function getEnharmonics(noteName: string): string[] {
  const enharmonicsMap: Record<string, string[]> = {
    'C#': ['Db', 'Bx'], 'Db': ['C#'],
    'D#': ['Eb'], 'Eb': ['D#'],
    'F#': ['Gb', 'Ex'], 'Gb': ['F#'],
    'G#': ['Ab'], 'Ab': ['G#'],
    'A#': ['Bb'], 'Bb': ['A#'],
    'E': ['Fb', 'Dx'], 'F': ['E#'],
    'B': ['Cb', 'Ax'], 'C': ['B#']
  };
  const match = noteName.match(/^([A-G][#b]*)(.*)$/);
  if (!match) return [];
  const base = match[1];
  const rest = match[2];
  return (enharmonicsMap[base] || []).map(enh => enh + rest);
}

/** Major key roots that use flat accidentals (circle of fifths, flat side). */
const FLAT_MAJOR_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);
/** Minor key roots that use flat accidentals (circle of fifths, flat side). */
const FLAT_MINOR_ROOTS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']);

/**
 * Semitones from a mode root to its parent Ionian (major) scale root.
 * Used to compute the parent key and determine flat/sharp preference via the circle of fifths.
 */
const MAJOR_MODE_PARENT_OFFSET: Record<string, number> = {
  'major': 0, 'ionian': 0, 'bebop major': 0, 'blues major': 0, 'harmonic major': 0,
  'dorian': 2, 'dorian b2': 2, 'bebop dorian': 2,
  'phrygian': 4,
  'lydian': 5, 'lydian augmented': 5, 'lydian dominant': 5,
  'mixolydian': 7, 'mixolydian b6': 7, 'bebop dominant': 7,
  'aeolian': 9, 'natural minor': 9,
  'locrian': 11, 'locrian #2': 11, 'altered': 11, 'super locrian': 11,
};

/**
 * Scale types in the minor family (natural/harmonic/melodic minor and their modes).
 * For these, flat/sharp preference is determined by the root as a minor key root.
 */
const MINOR_FAMILY = new Set([
  'minor', 'harmonic minor', 'melodic minor', 'jazz minor',
  'phrygian dominant', 'ionian #5', 'dorian #4', 'locrian #6', 'lydian #2', 'super locrian bb7',
]);

/**
 * Returns true if the given key should use flat accidentals for note naming.
 *
 * Uses circle-of-fifths logic extended to common church modes and minor-family scales.
 * For major-family modes, the parent Ionian key is computed and looked up in the circle.
 * For minor-family scales, the root is looked up directly as a minor key.
 * Falls back to checking the root's own accidental for unknown scale types.
 *
 * @param rootName - Root note name (e.g. 'D', 'Bb', 'F#'). Octave digits are stripped.
 * @param scaleType - Scale or mode type (e.g. 'major', 'dorian', 'harmonic minor'). Default: 'major'.
 */
export function preferFlatsForKey(rootName: string, scaleType: string = 'major'): boolean {
  const base = rootName.replace(/\d+$/, '');
  const type = scaleType.toLowerCase().trim();

  // Major-mode family: compute parent major key pitch class, then look up in flat set.
  const majorOffset = MAJOR_MODE_PARENT_OFFSET[type];
  if (majorOffset !== undefined) {
    const rootPC = ((parseNoteToStep12TET(
      base.charAt(0).toUpperCase() + base.slice(1), 4
    ) % 12) + 12) % 12;
    const parentPC = ((rootPC - majorOffset) % 12 + 12) % 12;
    return FLAT_MAJOR_ROOTS.has(NOTE_NAMES_12TET_FLAT[parentPC]);
  }

  // Minor-family scales: look up root directly as a minor key root.
  if (MINOR_FAMILY.has(type)) {
    const normalized = base.charAt(0).toUpperCase() + base.slice(1);
    return FLAT_MINOR_ROOTS.has(normalized);
  }

  // Fallback: check root's own accidental (covers custom/unknown scale types).
  return /[A-G]b/.test(base);
}

/**
 * @deprecated Use `preferFlatsForKey(rootName, scaleType)` instead.
 * This alias only considers the root note without scale-type context,
 * which gives incorrect results for modes and minor-family scales.
 */
export function usesFlats(rootName: string): boolean {
  return preferFlatsForKey(rootName);
}

export function getIntervalName(stepsFromRoot: number, is12TET: boolean = true): string {
  if (!is12TET) return `Step ${stepsFromRoot}`;
  
  const normalized = ((stepsFromRoot % 12) + 12) % 12;
  const names = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7'];
  
  let name = names[normalized];
  if (stepsFromRoot >= 12) {
    if (normalized === 1) name = 'm9';
    if (normalized === 2) name = 'M9';
    if (normalized === 5) name = 'P11';
    if (normalized === 6) name = 'A11';
    if (normalized === 9) name = 'M13';
  }
  return name;
}

export function getSemanticIntervalName(cents: number): string {
  // Try to match standard 12-TET intervals if close enough (within 10 cents)
  const standardIntervals = [
    { cents: 0, name: 'Unison (P1)' },
    { cents: 100, name: 'Minor 2nd (m2)' },
    { cents: 200, name: 'Major 2nd (M2)' },
    { cents: 300, name: 'Minor 3rd (m3)' },
    { cents: 400, name: 'Major 3rd (M3)' },
    { cents: 500, name: 'Perfect 4th (P4)' },
    { cents: 600, name: 'Tritone (d5/A4)' },
    { cents: 700, name: 'Perfect 5th (P5)' },
    { cents: 800, name: 'Minor 6th (m6)' },
    { cents: 900, name: 'Major 6th (M6)' },
    { cents: 1000, name: 'Minor 7th (m7)' },
    { cents: 1100, name: 'Major 7th (M7)' },
    { cents: 1200, name: 'Octave (P8)' }
  ];

  const normalizedCents = ((cents % 1200) + 1200) % 1200;
  
  for (const interval of standardIntervals) {
    if (Math.abs(normalizedCents - interval.cents) <= 10) {
      let name = interval.name;
      if (cents >= 1200 && cents < 2400) {
        if (interval.cents === 200) name = 'Major 9th (M9)';
        if (interval.cents === 500) name = 'Perfect 11th (P11)';
        if (interval.cents === 900) name = 'Major 13th (M13)';
      }
      return name;
    }
  }
  
  return `${cents.toFixed(2)} cents`;
}

/**
 * Converts a frequency in Hz to the nearest MIDI note number (0-127).
 * MIDI note 69 is A4 (default 440Hz).
 */
export function freqToMidi(freq: Hertz, baseA4: Hertz = 440): MidiNote {
  return Math.round(69 + 12 * Math.log2(freq / baseA4));
}

/**
 * Converts a frequency to the closest valid MIDI note and the pitch bend offset in cents.
 * Useful for microtonal playback via standard MIDI.
 */
export function freqToMidiPitchBend(freq: Hertz, baseA4: Hertz = 440): { note: MidiNote; centsOffset: number } {
  const exactMidi = 69 + 12 * Math.log2(freq / baseA4);
  const note = Math.round(exactMidi);
  const centsOffset = (exactMidi - note) * 100;
  return { note, centsOffset };
}

/**
 * Converts a MIDI note number (0-127) to frequency in Hz.
 */
export function midiToFreq(midi: MidiNote, baseA4: Hertz = 440): Hertz {
  return baseA4 * Math.pow(2, (midi - 69) / 12);
}
