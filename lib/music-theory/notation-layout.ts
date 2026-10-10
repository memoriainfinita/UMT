/**
 * Shared ground for the notation exporters (ABC, LilyPond, MusicXML): how a note is spelled,
 * key signatures, and a MusicStream cut into measures of writable note values.
 */
import { Note } from './note';
import { MusicStream } from './rhythm';
import { get12TETName } from './utils';

/** A pitch as written on a staff: letter, alteration in semitones, scientific octave. */
export interface SpelledPitch {
  letter: string;
  alter: number;
  octave: number;
  /** Cents above (+) or below (−) the 12-TET pitch of that spelling: 0 in 12-TET. */
  cents: number;
}

const LETTER_SEMITONES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

function parseSpelling(name: string): { letter: string; alter: number; octave: number } | null {
  const m = name.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/);
  if (!m) return null;
  const acc = m[2] ?? '';
  return { letter: m[1], alter: acc.startsWith('#') ? acc.length : -acc.length, octave: parseInt(m[3], 10) };
}

/**
 * Spells a note for a staff. A name with letter and octave (12-TET, or JI with 12 named
 * classes) keeps its spelling; other tunings take the nearest 12-TET pitch, named with the
 * note's flat preference. `cents` is the distance to that 12-TET pitch, measured from A4 of
 * the note's own tuning.
 */
export function spellPitch(note: Note): SpelledPitch {
  const centsFromA4 = note.centsFromBase;
  const named = parseSpelling(note.name)
    ?? parseSpelling(get12TETName(Math.round(centsFromA4 / 100), note.preferFlats))!;
  const semitones = LETTER_SEMITONES[named.letter] + named.alter + 12 * (named.octave - 4);
  const cents = Math.round((centsFromA4 - 100 * semitones) * 100) / 100;
  return { ...named, cents: cents === 0 ? 0 : cents };
}

// Position on the line of fifths (C = 0)
const LETTER_FIFTHS: Record<string, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
// Fifths a mode's signature lies below the major key on the same root
const MODE_SHIFT: Record<string, number> = {
  lydian: -1, major: 0, ionian: 0, mixolydian: 1, dorian: 2, minor: 3, aeolian: 3, phrygian: 4, locrian: 5,
};

/** A key as the exporters read it: tonic, mode, and signature in fifths (+ sharps, − flats). */
export interface KeySpec {
  tonic: string;
  mode: string;
  fifths: number;
}

/**
 * Reads a key symbol: `'D major'`, `'B minor'`, `'E dorian'`, `'Dm'`, `'Bb'`, or a lower-case
 * letter for minor (`'f#'`, the CircleOfFifths convention). Harmonic and melodic minor take
 * the minor signature.
 * @throws RangeError for an unknown mode or a malformed tonic.
 */
export function parseKey(key: string): KeySpec {
  const m = key.trim().match(/^([A-Ga-g])(#{1,2}|b{1,2})?\s*(.*)$/);
  if (!m) throw new RangeError(`Unknown key "${key}".`);
  const [, letter, acc = '', rest] = m;
  let mode = rest.trim().toLowerCase();
  if (mode === '') mode = letter === letter.toLowerCase() ? 'minor' : 'major';
  else if (mode === 'm' || mode.endsWith('minor')) mode = 'minor';
  if (!(mode in MODE_SHIFT)) throw new RangeError(`Unknown mode "${rest.trim()}" in key "${key}".`);
  const tonic = letter.toUpperCase() + acc;
  const fifths = LETTER_FIFTHS[letter.toUpperCase()] + (acc.startsWith('#') ? 7 : -7) * acc.length - MODE_SHIFT[mode];
  return { tonic, mode, fifths };
}

/** Alteration of each letter in a signature of `fifths` (+ sharps, − flats). */
export function signatureAlters(fifths: number): Record<string, number> {
  const alters: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  for (let i = 0; i < fifths; i++) alters['FCGDAEB'[i % 7]]++;
  for (let i = 0; i < -fifths; i++) alters['BEADGCF'[i % 7]]--;
  return alters;
}

/**
 * Which notes need a written accidental within a measure. An accidental holds for the rest
 * of the measure; since ABC readers differ on whether it covers other octaves, a note is
 * marked whenever either reading would get it wrong.
 */
export class MeasureAccidentals {
  private byPitch = new Map<string, number>();
  private byLetter = new Map<string, number>();

  constructor(private signature: Record<string, number>) {}

  /** The alteration to write before this pitch, or null when the staff already says it. */
  mark(p: SpelledPitch): number | null {
    const key = p.letter + p.octave;
    const inForce = this.byPitch.get(key) ?? this.signature[p.letter];
    const inForceLetter = this.byLetter.get(p.letter) ?? this.signature[p.letter];
    if (inForce === p.alter && inForceLetter === p.alter) return null;
    this.byPitch.set(key, p.alter);
    this.byLetter.set(p.letter, p.alter);
    return p.alter;
  }

  /** Starts a new measure. */
  reset(): void {
    this.byPitch.clear();
    this.byLetter.clear();
  }
}

/** Ticks in a whole note: 2^7 · 3, so dotted values down to 128ths and triplets are whole numbers. */
export const TICKS_PER_WHOLE = 384;

/** A writable note value. */
export interface NoteValue {
  ticks: number;
  /** Ticks of the plain written value (384 whole … 3 a 128th); a triplet note is written as this. */
  base: number;
  dots: number;
  /** Plays 2/3 of `base` (one note of a 3:2 triplet). */
  triplet: boolean;
}

// Plain values with up to two dots, largest first
const DYADIC: NoteValue[] = [384, 192, 96, 48, 24, 12, 6, 3]
  .flatMap(base => [0, 1, 2].map(dots => ({ ticks: base * (2 - 1 / 2 ** dots), base, dots, triplet: false })))
  .filter(v => Number.isInteger(v.ticks))
  .sort((a, b) => b.ticks - a.ticks);

/**
 * Splits a length in ticks into note values to be tied: plain and dotted values, and triplet
 * notes for what those cannot write.
 * @throws RangeError when no such values add up to it.
 */
export function splitTicks(ticks: number): NoteValue[] {
  const values: NoteValue[] = [];
  let rest = ticks;
  while (rest > 0) {
    if (rest % 3 === 0) {
      const v = DYADIC.find(d => d.ticks <= rest)!;
      values.push(v);
      rest -= v.ticks;
    } else {
      // a triplet note plays a power of two in ticks: 256 (a half) … 4 (a 64th)
      let t = 256;
      while (t > rest) t /= 2;
      if (t < 4) throw new RangeError(`A length of ${ticks}/${TICKS_PER_WHOLE} of a whole note cannot be written.`);
      values.push({ ticks: t, base: (t * 3) / 2, dots: 0, triplet: true });
      rest -= t;
    }
  }
  return values;
}

/** One written note, chord, or rest (no notes) of a measure. */
export interface LaidEvent {
  notes: Note[];
  value: NoteValue;
  /** Tied to the next written event (same notes). */
  tie: boolean;
  /** Tied from the previous written event. */
  tiedFrom: boolean;
}

function toTicks(beats: number, denominator: number, what: string): number {
  const exact = (beats / denominator) * TICKS_PER_WHOLE;
  const ticks = Math.round(exact);
  if (Math.abs(exact - ticks) > 1e-6) {
    throw new RangeError(`${what} of ${beats} beats in /${denominator} cannot be written (binary values, dots and triplets only).`);
  }
  return ticks;
}

/**
 * Cuts a stream into measures. Events are taken in time order as one voice: gaps become
 * rests, events that start together with the same length merge into a chord, and a note
 * that crosses a barline or has no single written value is split into tied values. The
 * last measure may be incomplete.
 * @throws RangeError for overlapping events, or lengths or meters that cannot be written.
 */
export function layoutMeasures(stream: MusicStream): LaidEvent[][] {
  const ts = stream.timeSignature;
  const measureTicks = toTicks(ts.totalBeats, ts.denominator, 'A measure');

  // events as [start, length, notes], merged when they start together with the same length
  const spans: { start: number; length: number; notes: Note[] }[] = [];
  const sorted = [...stream.events].sort((a, b) => a.time - b.time);
  for (const e of sorted) {
    const start = toTicks(e.time, ts.denominator, 'An onset');
    const length = toTicks(e.duration, ts.denominator, 'A duration');
    const last = spans[spans.length - 1];
    if (last && last.start === start && last.length === length) {
      last.notes = [...last.notes, ...e.notes];
      continue;
    }
    if (last && start < last.start + last.length) {
      throw new RangeError('Overlapping events: the exporters write a single voice.');
    }
    if (length > 0) spans.push({ start, length, notes: e.notes });
  }

  const measures: LaidEvent[][] = [];
  let cursor = 0;
  const place = (notes: Note[], length: number) => {
    const pieces: NoteValue[] = [];
    let left = length;
    while (left > 0) {
      const room = measureTicks - (cursor % measureTicks);
      const take = Math.min(room, left);
      for (const v of splitTicks(take)) {
        pieces.push(v);
        const index = Math.floor(cursor / measureTicks);
        (measures[index] ??= []).push({ notes, value: v, tie: false, tiedFrom: false });
        cursor += v.ticks;
      }
      left -= take;
    }
    if (notes.length > 0 && pieces.length > 1) {
      // tie the pieces just placed, across measures
      const placed = measures.flat().slice(-pieces.length);
      placed.forEach((ev, i) => {
        ev.tie = i < placed.length - 1;
        ev.tiedFrom = i > 0;
      });
    }
  };

  for (const span of spans) {
    if (span.start > cursor) place([], span.start - cursor);
    place(span.notes, span.length);
  }
  return measures;
}
