/**
 * Spelling in 12-TET: pitches named by the key they sound in, and chord tones named by
 * their interval above the root. Pitch is not enough to name a note: G# and Ab are the
 * same key on a piano but different notes in E major and in C minor.
 */
import { Chord } from './chord';
import { parseScaleSymbol, parseChordSymbol } from './parser';
import { spellByLetter, get12TETName } from './utils';
import { EDO } from './tuning';

const pc12 = (step: number) => ((step % 12) + 12) % 12;
const baseName = (name: string) => name.replace(/-?\d+$/, '');

/**
 * Letter offset above the tonic for each semitone, after the harmonic chromatic scale:
 * b2, 2, b3, 3, 4, #4, 5, b6, 6, b7, 7 (a minor key's raised 3rd, 6th and 7th are #3,
 * #6, #7 against its own b3, b6, b7). Notes of the key's own scale keep the scale's letters.
 */
const CHROMATIC_LETTER_OFFSET = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

type KeyLetters = { tonicLetter: string; tonicPc: number; scaleOffsets: Map<number, number> };

function keyLetters(keySymbol: string): KeyLetters | null {
  try {
    const notes = parseScaleSymbol(keySymbol).getNotes().slice(0, 7);
    if (notes.length !== 7) return null;
    const tonicPc = pc12(notes[0].stepsFromBase);
    // semitones above the tonic → letter offset, as the scale spells each degree
    const scaleOffsets = new Map(notes.map((n, degree) => [pc12(n.stepsFromBase - tonicPc), degree]));
    return { tonicLetter: notes[0].name[0], tonicPc, scaleOffsets };
  } catch { return null; }
}

/**
 * Names a 12-TET step (A4 = 0) as it is written in `keySymbol` ("E major", "C minor",
 * "D dorian"). Scale notes take the scale's letters (G# in E major, E# in F# major);
 * the rest follow the harmonic chromatic scale (in C major: Db, Eb, F#, Ab, Bb; in A
 * minor: Bb, C#, D#, F#, G#). An unknown key falls back to flats.
 * @returns Name with octave; the octave follows the letter (B#3 is the pitch of C4).
 */
export function spellPitchInKey(stepsFromA4: number, keySymbol: string): string {
  const key = keyLetters(keySymbol);
  if (!key) return get12TETName(stepsFromA4, true);
  const fromTonic = pc12(stepsFromA4 - key.tonicPc);
  const offset = key.scaleOffsets.get(fromTonic) ?? CHROMATIC_LETTER_OFFSET[fromTonic];
  return spellByLetter(stepsFromA4, key.tonicLetter, offset) ?? get12TETName(stepsFromA4, true);
}

/**
 * Letter offset of a chord tone above the root, from its interval and the rest of the
 * chord: 6 semitones is b5 without a perfect fifth and #11 with one; 8 is #5 or b13;
 * 3 is #9 when the chord has a major third; 9 is the bb7 of a diminished seventh.
 */
function chordToneOffset(semitones: number, pcs: Set<number>): number {
  switch (semitones) {
    case 0: return 0;
    case 1: case 2: return 1;
    case 3: return pcs.has(4) ? 1 : 2;
    case 4: return 2;
    case 5: return 3;
    case 6: return pcs.has(7) ? 3 : 4;
    case 7: return 4;
    case 8: return pcs.has(7) ? 5 : 4;
    case 9: return pcs.has(3) && pcs.has(6) && !pcs.has(10) && !pcs.has(11) ? 6 : 5;
    default: return 6;   // 10, 11: the seventh
  }
}

/**
 * Names the chord's notes by their interval above the root, from the root as written in
 * `rootName` (default: the chord's own name). Cm7b5 is C Eb Gb Bb, C7#11 has F#, Bdim7
 * has Ab. Same order and octaves as `chord.getNotes()` (slash bass first). Other
 * tunings: the names `getNotes()` gives.
 */
export function spellChord(chord: Chord, rootName?: string): string[] {
  const notes = chord.getNotes();
  const ts = chord.tuningSystem;
  if (!(ts instanceof EDO && ts.divisions === 12)) return notes.map(n => n.name);
  const letter = (rootName ?? chord.name)[0]?.toUpperCase();
  const pcs = new Set(chord.intervalsInSteps.map(pc12));
  const toneByPc = new Map<number, number>();   // pitch class above the root → letter offset
  for (const s of pcs) toneByPc.set(s, chordToneOffset(s, pcs));
  return notes.map(n => {
    const above = pc12(n.stepsFromBase - chord.rootStep);
    const offset = toneByPc.get(above) ?? chordToneOffset(above, pcs);
    return spellByLetter(n.stepsFromBase, letter, offset) ?? n.name;
  });
}

/**
 * Renames a chord as it is written in `keySymbol`: the root by the key (`spellPitchInKey`),
 * a slash bass by its interval in the chord, or by the key when it is not a chord tone.
 * Ab7 in A major is G#7; F#m7b5 in C major stays F#m7b5; C/E in E major stays C/E.
 * Returns the chord unchanged when the key is unknown or the tuning is not 12-TET.
 */
export function spellChordInKey(chord: Chord, keySymbol: string): Chord {
  const ts = chord.tuningSystem;
  if (!(ts instanceof EDO && ts.divisions === 12) || !keyLetters(keySymbol)) return chord;
  const [main, slash] = chord.name.split('/');
  const suffix = main.replace(/^[A-G][#b]*/, '');
  const root = baseName(spellPitchInKey(chord.rootStep, keySymbol));
  let bass = '';
  if (slash !== undefined && chord.bassStep !== undefined) {
    const above = pc12(chord.bassStep - chord.rootStep);
    const pcs = new Set(chord.intervalsInSteps.map(pc12));
    const asTone = pcs.has(above) ? spellByLetter(chord.bassStep, root[0], chordToneOffset(above, pcs)) : null;
    bass = '/' + baseName(asTone ?? spellPitchInKey(chord.bassStep, keySymbol));
  }
  try { return parseChordSymbol(root + suffix + bass, ts); } catch { return chord; }
}
