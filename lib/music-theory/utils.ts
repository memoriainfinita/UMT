export const NOTE_NAMES_12TET_SHARP = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
export const NOTE_NAMES_12TET_FLAT = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

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

export function usesFlats(rootName: string): boolean {
  const base = rootName.replace(/\d+$/, '');
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'd', 'g', 'c', 'f', 'bb', 'eb', 'ab'];
  return flatKeys.includes(base);
}

export function getIntervalName(stepsFromRoot: number, is12TET: boolean = true): string {
  if (!is12TET) return `Step ${stepsFromRoot}`;
  
  const normalized = ((stepsFromRoot % 12) + 12) % 12;
  const names = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7'];
  
  let name = names[normalized];
  if (stepsFromRoot >= 12) {
    // Add octave indicators or extensions (9, 11, 13)
    if (normalized === 2) name = 'M9';
    if (normalized === 5) name = 'P11';
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
export function freqToMidi(freq: number, baseA4: number = 440): number {
  return Math.round(69 + 12 * Math.log2(freq / baseA4));
}

/**
 * Converts a frequency to the closest valid MIDI note and the pitch bend offset in cents.
 * Useful for microtonal playback via standard MIDI.
 */
export function freqToMidiPitchBend(freq: number, baseA4: number = 440): { note: number; centsOffset: number } {
  const exactMidi = 69 + 12 * Math.log2(freq / baseA4);
  const note = Math.round(exactMidi);
  const centsOffset = (exactMidi - note) * 100;
  return { note, centsOffset };
}

/**
 * Converts a MIDI note number (0-127) to frequency in Hz.
 */
export function midiToFreq(midi: number, baseA4: number = 440): number {
  return baseA4 * Math.pow(2, (midi - 69) / 12);
}
