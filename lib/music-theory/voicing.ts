/**
 * Voicing analysis: how the notes of a chord are laid out (inversion, close or open
 * position, drop voicings, doubled and omitted members).
 */
import { Note } from './note';
import { Chord, chordDegreeLabel } from './chord';
import { Harmony } from './harmony';
import { parseChordSymbol } from './parser';

/** One sounding note of a voicing, bottom to top. */
export interface VoicedNote {
  note: string;
  /** Chord member (`'R'`, `'3'`, `'b7'`, `'9'`…), or null for a note outside the chord. */
  degree: string | null;
}

/** Result of `analyzeVoicing`. */
export interface VoicingAnalysis {
  chord: string;
  /** Notes from the bass up. */
  voices: VoicedNote[];
  bass: string;
  bassDegree: string | null;
  /** 0 root position, 1 first (third in the bass), 2 second (fifth), 3 third (seventh); null for any other bass. */
  inversion: number | null;
  /** Upper voices (all but the bass) within an octave: `'close'`; wider: `'open'`. Null with fewer than three voices. */
  position: 'close' | 'open' | null;
  /** Four-voice jazz voicings derived from a close voicing by dropping voices an octave. */
  drop: 'drop 2' | 'drop 3' | 'drop 2+4' | null;
  /** Chord members that sound more than once. */
  doubled: string[];
  /** Chord members that do not sound. */
  omitted: string[];
  /** Sounding notes outside the chord. */
  added: string[];
  /** Semitones from the lowest to the highest note. */
  span: number;
}

/** Semitones from A4, by frequency (exact in 12-TET, nearest semitone elsewhere). */
const semi = (n: Note) => Math.round(12 * Math.log2(n.frequency / 440));
const pc = (s: number) => ((s % 12) + 12) % 12;

/** Which drop voicing a four-voice spread is, or null. */
function dropType(sorted: number[]): VoicingAnalysis['drop'] {
  if (sorted.length !== 4 || new Set(sorted.map(pc)).size !== 4) return null;
  if (sorted[3] - sorted[0] < 12) return null; // already close
  const options: [VoicingAnalysis['drop'], number[]][] = [['drop 2', [2]], ['drop 3', [3]], ['drop 2+4', [2, 4]]];
  for (const [name, fromTop] of options) {
    // the dropped voices are the lowest ones: raise them an octave and see whether a close
    // voicing results with them at the right places (counted from the top, 1 = top)
    const raised = sorted.map((s, i) => (i < fromTop.length ? s + 12 : s));
    const close = [...raised].sort((a, b) => a - b);
    if (close[3] - close[0] >= 12) continue;
    const places = raised.slice(0, fromTop.length).map(s => 4 - close.indexOf(s)).sort((a, b) => a - b);
    if (places.join() === fromTop.join()) return name;
  }
  return null;
}

/**
 * Analyzes how a chord is voiced: inversion, close or open position, drop 2 / drop 3 /
 * drop 2+4, and which members are doubled, omitted or added.
 * Notes may come in any order. Without `chord`, the first reading of
 * `Harmony.detectChords` is used. Other tunings are read by the nearest 12-TET semitone.
 * @returns null when no chord is given and none is detected.
 * @example
 * analyzeVoicing(['G3', 'C4', 'E4', 'B4'].map(n => parseNote(n)), parseChordSymbol('Cmaj7'))
 * // → inversion 2, drop 'drop 2' (from B G E C, G dropped), position 'close'
 */
export function analyzeVoicing(notes: Note[], chord?: Chord): VoicingAnalysis | null {
  if (notes.length === 0) return null;
  const sortedNotes = [...notes].sort((a, b) => a.frequency - b.frequency);
  if (!chord) {
    const name = Harmony.detectChords(sortedNotes)[0];
    if (!name || name === 'Unknown Chord') return null;
    chord = parseChordSymbol(name);
  }

  // chord members by pitch class, in semitones above the root
  const ts = chord.tuningSystem;
  const rootSemi = semi(new Note(ts, chord.rootStep));
  const formula = ts.octaveSteps === 12
    ? chord.intervalsInSteps
    : chord.intervalsInSteps.map(i => semi(new Note(ts, chord!.rootStep + i)) - rootSemi);
  const memberByPc = new Map<number, string>();
  for (const i of formula) if (!memberByPc.has(pc(i))) memberByPc.set(pc(i), chordDegreeLabel(i, formula));

  const semis = sortedNotes.map(semi);
  const voices = sortedNotes.map((n, k) => ({ note: n.name, degree: memberByPc.get(pc(semis[k] - rootSemi)) ?? null }));

  const counts = new Map<string, number>();
  for (const v of voices) if (v.degree) counts.set(v.degree, (counts.get(v.degree) ?? 0) + 1);
  const members = [...new Set(memberByPc.values())];

  const bassDegree = voices[0].degree;
  const INVERSION: Record<string, number> = { R: 0, b3: 1, '3': 1, b5: 2, '5': 2, '#5': 2, bb7: 3, b7: 3, '7': 3 };
  const upper = semis.slice(1);

  return {
    chord: chord.name,
    voices,
    bass: voices[0].note,
    bassDegree,
    inversion: bassDegree !== null && bassDegree in INVERSION ? INVERSION[bassDegree] : null,
    position: semis.length < 3 ? null : upper[upper.length - 1] - upper[0] < 12 ? 'close' : 'open',
    drop: dropType(semis),
    doubled: members.filter(m => (counts.get(m) ?? 0) > 1),
    omitted: members.filter(m => !counts.has(m)),
    added: voices.filter(v => v.degree === null).map(v => v.note),
    span: semis[semis.length - 1] - semis[0],
  };
}
