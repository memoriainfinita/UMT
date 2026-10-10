/**
 * Spelling in 12-TET: pitches named by the key they sound in, and chord tones named by
 * their interval above the root. Pitch is not enough to name a note: G# and Ab are the
 * same key on a piano but different notes in E major and in C minor.
 */
import { Chord } from './chord';
import { parseScaleSymbol, parseChordSymbol } from './parser';
import { spellByLetter, get12TETName, chordToneOffset } from './utils';
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
    // A minor key's raised 6th and 7th belong to it (melodic / harmonic minor): they keep
    // their letter even when it needs a double sharp (F## in G# minor)
    if (/\b(minor|aeolian)\b/i.test(keySymbol) && !/harmonic|melodic/i.test(keySymbol)) {
      scaleOffsets.set(9, 5);
      scaleOffsets.set(11, 6);
    }
    return { tonicLetter: notes[0].name[0], tonicPc, scaleOffsets };
  } catch { return null; }
}

/** Accidentals a key-note root must save before it gives up its letter (G in G# minor, not F##). */
const KEY_LETTER_MARGIN = 2;

const accidentalCount = (name: string) => (baseName(name).match(/[#b]/g) ?? []).length;

/** True when `stepsFromA4` is one of the key's own notes (scale, or raised 6th / 7th in minor). */
function inKey(stepsFromA4: number, key: KeyLetters): boolean {
  return key.scaleOffsets.has(pc12(stepsFromA4 - key.tonicPc));
}

/**
 * Names a 12-TET step (A4 = 0) as it is written in `keySymbol` ("E major", "C minor",
 * "D dorian"). The key's notes take the scale's letters (G# in E major, E# in F# major,
 * F## in G# minor). The rest follow the harmonic chromatic scale (in C major: Db, Eb,
 * F#, Ab, Bb; in A minor: Bb, C#, D#, F#, G#), unless that needs a double accidental and
 * the neighbouring letter needs fewer (A natural in Db major, not Bbb). An unknown key
 * falls back to flats.
 * @returns Name with octave; the octave follows the letter (B#3 is the pitch of C4).
 */
export function spellPitchInKey(stepsFromA4: number, keySymbol: string): string {
  const key = keyLetters(keySymbol);
  if (!key) return get12TETName(stepsFromA4, true);
  const fromTonic = pc12(stepsFromA4 - key.tonicPc);
  const own = key.scaleOffsets.get(fromTonic);
  if (own !== undefined) return spellByLetter(stepsFromA4, key.tonicLetter, own) ?? get12TETName(stepsFromA4, true);
  const offset = CHROMATIC_LETTER_OFFSET[fromTonic];
  const chosen = spellByLetter(stepsFromA4, key.tonicLetter, offset);
  if (chosen && accidentalCount(chosen) < 2) return chosen;
  // the other letter the pitch can take: one above or one below
  const other = [offset + 1, offset + 6].map(o => spellByLetter(stepsFromA4, key.tonicLetter, o % 7))
    .filter((n): n is string => n !== null)
    .sort((a, b) => accidentalCount(a) - accidentalCount(b))[0];
  return [chosen, other].filter((n): n is string => n !== null)
    .sort((a, b) => accidentalCount(a) - accidentalCount(b))[0] ?? get12TETName(stepsFromA4, true);
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
 * Renames a chord as it is written in `keySymbol`. A root that is a note of the key takes
 * the key's letter (Ab7 in A major is G#7) unless the other letter saves 3 or more
 * accidentals (a G major chord in G# minor is G, not F## A## C###); a chord made only of
 * key notes always keeps it (F##dim7 in G# minor). A chromatic root takes whichever of its two
 * letters leaves fewer accidentals across the chord tones, the root's counted twice (C in
 * F# major, not B# with D## F##); on a tie, the key's spelling (`spellPitchInKey`). A slash bass is named by
 * its interval in the chord, or by the key when it is not a chord tone.
 * Returns the chord unchanged when the key is unknown or the tuning is not 12-TET.
 */
export function spellChordInKey(chord: Chord, keySymbol: string): Chord {
  const ts = chord.tuningSystem;
  const key = keyLetters(keySymbol);
  if (!(ts instanceof EDO && ts.divisions === 12) || !key) return chord;
  const [main, slash] = chord.name.split('/');
  const suffix = main.replace(/^[A-G][#b]*/, '');
  const keyRoot = baseName(spellPitchInKey(chord.rootStep, keySymbol));
  let root = keyRoot;
  // accidentals across the chord, the root's counted twice: it is the name read first
  const cost = (r: string) => spellChord(chord, r).reduce((n, t) => n + accidentalCount(t), 0) + accidentalCount(r);
  // a root that is a note of the key keeps its letter unless the other saves 3 or more
  const margin = inKey(chord.rootStep, key) ? KEY_LETTER_MARGIN : 0;
  const letterIdx = 'CDEFGAB'.indexOf(keyRoot[0]);
  const alternatives = [1, 6].map(o => spellByLetter(chord.rootStep, 'CDEFGAB'[letterIdx], o))
    .filter((n): n is string => n !== null && accidentalCount(n) <= 2).map(baseName);
  // a chord made only of key notes (F##°7 in G# minor) is spelled as the key spells it
  const pcs = new Set(chord.intervalsInSteps.map(pc12));
  const writable = chord.intervalsInSteps.every(i => spellByLetter(chord.rootStep + i, keyRoot[0], chordToneOffset(pc12(i), pcs)) !== null);
  const diatonic = writable && chord.intervalsInSteps.every(i => inKey(chord.rootStep + i, key));
  if (!diatonic) for (const alt of alternatives) if (cost(alt) + margin < cost(root)) root = alt;
  let bass = '';
  if (slash !== undefined && chord.bassStep !== undefined) {
    const above = pc12(chord.bassStep - chord.rootStep);
    const pcs = new Set(chord.intervalsInSteps.map(pc12));
    const asTone = pcs.has(above) ? spellByLetter(chord.bassStep, root[0], chordToneOffset(above, pcs)) : null;
    bass = '/' + baseName(asTone ?? spellPitchInKey(chord.bassStep, keySymbol));
  }
  try { return parseChordSymbol(root + suffix + bass, ts); } catch { return chord; }
}
