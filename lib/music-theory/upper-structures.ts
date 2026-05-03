import { Chord } from './chord';
import { Note } from './note';
import { parseChordSymbol } from './parser';
import { preferFlatsForKey, NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP } from './utils';

export interface UpperStructure {
  triad: Chord;
  tensions: string[];
  overChord: Chord;
  label: string;
}

/**
 * Canonical upper-structure triads over a dominant 7th chord.
 * `offset` = semitones above the dominant root where the triad starts.
 * `tensions` = chord tones of the triad expressed as dominant extensions/alterations.
 * `label` = Roman numeral of the triad root relative to the dominant (e.g. `'bII'`).
 */
const UST_TABLE: { offset: number; tensions: string[]; label: string }[] = [
  { offset: 1,  tensions: ['b9', 'b13'],       label: 'bII'  }, // Ab over G7 → b9 3 b13 (altered)
  { offset: 2,  tensions: ['9', '#11', '13'],  label: 'II'   }, // A  over G7 → 9 #11 13 (Lydian dominant)
  { offset: 3,  tensions: ['#9', '5', 'b7'],   label: 'bIII' }, // Bb over G7 → #9 5 b7
  { offset: 8,  tensions: ['b13', '#9'],        label: 'bVI'  }, // Eb over G7 → b13 root #9 (super-altered)
  { offset: 9,  tensions: ['13', 'b9', 'M3'],  label: 'VI'   }, // E  over G7 → 13 b9 3
  { offset: 10, tensions: ['b7', '9', '11'],   label: 'bVII' }, // F  over G7 → b7 9 11 (suspended sound)
];

/**
 * Returns the six canonical upper-structure triads for a dominant 7th chord.
 * Returns [] for non-12-TET tunings or non-dominant chords.
 */
export function getUpperStructures(dominantChord: Chord): UpperStructure[] {
  const ts = dominantChord.tuningSystem;
  if (ts.octaveSteps !== 12) return [];

  return UST_TABLE.map(({ offset, tensions, label }) => {
    const triadRootStep = dominantChord.rootStep + offset;
    const rootPc = ((triadRootStep % 12) + 12) % 12;
    const triadPf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[rootPc], 'major');
    const rootName = triadPf ? NOTE_NAMES_12TET_FLAT[rootPc] : NOTE_NAMES_12TET_SHARP[rootPc];
    const triad = parseChordSymbol(rootName, ts);

    return {
      triad,
      tensions,
      overChord: dominantChord,
      label: `${label} UST`,
    };
  });
}
