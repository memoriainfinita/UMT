import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { MusicStream } from './rhythm';
import {
  spellPitch, SpelledPitch, parseKey, signatureAlters, MeasureAccidentals,
  layoutMeasures, LaidEvent, TICKS_PER_WHOLE,
} from './notation-layout';

const ABC_ACCIDENTAL: Record<number, string> = { [-2]: '__', [-1]: '_', 0: '=', 1: '^', 2: '^^' };
const QUARTER = TICKS_PER_WHOLE / 4; // the unit length L:1/4

/** ABC letter with octave marks: C = C4 (middle C), c = C5, C, = C3, c' = C6. */
function abcLetter(p: SpelledPitch): string {
  return p.octave >= 5
    ? p.letter.toLowerCase() + "'".repeat(p.octave - 5)
    : p.letter + ','.repeat(4 - p.octave);
}

/** ABC length suffix for `ticks`, relative to L:1/4: '' a quarter, '2' a half, '/2' an eighth, '3/2' a dotted quarter. */
function abcLength(ticks: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(ticks, QUARTER);
  const num = ticks / g, den = QUARTER / g;
  if (den === 1) return num === 1 ? '' : `${num}`;
  return num === 1 ? `/${den}` : `${num}/${den}`;
}

/** A pitch with the accidental the measure needs (none when the signature or an earlier note says it). */
function abcPitch(p: SpelledPitch, acc: MeasureAccidentals): string {
  const alter = acc.mark(p);
  return (alter === null ? '' : ABC_ACCIDENTAL[alter] ?? '') + abcLetter(p);
}

function abcNotes(notes: Note[], acc: MeasureAccidentals): string {
  const pitches = notes.map(n => abcPitch(spellPitch(n), acc));
  return pitches.length === 1 ? pitches[0] : `[${pitches.join('')}]`;
}

function abcEvent(ev: LaidEvent, acc: MeasureAccidentals): string {
  const v = ev.value;
  const body = ev.notes.length === 0 ? 'z' : abcNotes(ev.notes, acc);
  return `${v.triplet ? '(3:2:1' : ''}${body}${abcLength(v.triplet ? v.base : v.ticks)}${ev.tie ? '-' : ''}`;
}

/** Options for writing a stream in ABC. */
export interface ABCStreamOptions {
  /** Key of the tune (default `'C major'`): accidentals are written against its signature. Use the same key in `wrapInHeaders`. */
  key?: string;
}

/**
 * Bridge between Universal Music Theory and ABC Notation.
 * Converts UMT objects to ABC strings for visual rendering. Lengths assume `L:1/4`, as
 * `wrapInHeaders` writes. Notes of other tunings are written at the nearest 12-TET pitch.
 */
export class ABCBridge {
  /**
   * Converts a single Note to ABC notation, with its accidental if it has one and no key or
   * measure context (see `streamToABC` for naturals against a signature).
   * C4 (middle C) → `C`, C5 → `c`, C3 → `C,`, Bb4 → `_B`.
   */
  static noteToABC(note: Note): string {
    const p = spellPitch(note);
    return (p.alter !== 0 ? ABC_ACCIDENTAL[p.alter] ?? '' : '') + abcLetter(p);
  }

  /**
   * Converts a chord (or array of notes) to an ABC chord string, with accidentals written
   * against the signature of `key`.
   */
  static chordToABC(chord: Chord | Note[], key = 'C major'): string {
    const notes = chord instanceof Chord ? chord.getNotes() : chord;
    const acc = new MeasureAccidentals(signatureAlters(parseKey(key).fifths));
    return `[${notes.map(n => abcPitch(spellPitch(n), acc)).join('')}]`;
  }

  /**
   * Converts a scale to an ABC sequence of quarter notes (one measure, no barlines), with
   * accidentals written against the signature of `key`.
   */
  static scaleToABC(scale: Scale, octaves: number = 1, key = 'C major'): string {
    const acc = new MeasureAccidentals(signatureAlters(parseKey(key).fifths));
    return scale.getNotes(octaves).map(n => abcPitch(spellPitch(n), acc)).join(' ');
  }

  /**
   * Converts a progression (array of note arrays) to ABC, one chord per measure.
   */
  static progressionToABC(progression: Note[][], key = 'C major'): string {
    const acc = new MeasureAccidentals(signatureAlters(parseKey(key).fifths));
    return progression.map(notes => {
      acc.reset();
      return `[${notes.map(n => abcPitch(spellPitch(n), acc)).join('')}]`;
    }).join(' | ') + ' |]';
  }

  /**
   * Converts a MusicStream to ABC notation (body only; see `wrapInHeaders`).
   * Barlines follow the stream's time signature; notes that cross one are tied, and lengths
   * with no single written value are split into tied values. Lengths count in quarter notes
   * (`L:1/4`) whatever the meter: in 6/8 an eighth is `/2`. Triplet notes are written `(3:2:1`.
   */
  static streamToABC(stream: MusicStream, options: ABCStreamOptions = {}): string {
    return ABCBridge.streamToABCWithChords(stream, undefined, options);
  }

  /**
   * Wraps ABC content in standard headers for rendering.
   * @param keySymbol - UMT key symbol (e.g. 'C major', 'G major', 'D minor').
   *   Automatically converted to ABC K: field (e.g. 'C', 'G', 'Dm').
   */
  static wrapInHeaders(
    content: string,
    title = '',
    meter = '4/4',
    keySymbol = 'C major'
  ): string {
    const abcKey = umt2ABCKey(keySymbol);
    return `X:1\nT:${title.replace(/\s*[\r\n]+\s*/g, ' ')}\nM:${meter}\nL:1/4\nK:${abcKey}\n${content}`;
  }

  /**
   * Converts a MusicStream to ABC notation with optional chord symbols above the staff.
   * @param chordNames - Optional chord names aligned to `stream.events`; each is written
   *   above the first note of its event.
   */
  static streamToABCWithChords(stream: MusicStream, chordNames?: string[], options: ABCStreamOptions = {}): string {
    const den = stream.timeSignature.denominator;
    const names = new Map<number, string>();
    stream.events.forEach((e, i) => {
      const name = chordNames?.[i];
      if (name) names.set(Math.round((e.time / den) * TICKS_PER_WHOLE), name.replace(/"/g, ''));
    });

    const acc = new MeasureAccidentals(signatureAlters(parseKey(options.key ?? 'C major').fifths));
    let cursor = 0;
    const measures = layoutMeasures(stream).map(measure => {
      acc.reset();
      return measure.map(ev => {
        const name = !ev.tiedFrom ? names.get(cursor) : undefined;
        cursor += ev.value.ticks;
        return (name ? `"${name}"` : '') + abcEvent(ev, acc);
      }).join(' ');
    });
    return measures.join(' | ') + ' |]';
  }

  /**
   * Generates an ABC tuplet string.
   * @param notes - Notes within the tuplet.
   * @param p - How many notes in the tuplet (e.g. 3 for triplet).
   * @param q - Normal note value they fit into (e.g. 2 for triplet).
   * @param duration - Written length of each note in quarter notes (0.5 = an eighth).
   */
  static tuplet(notes: Note[], p: number, q: number, duration: number): string {
    const length = abcLength(Math.round(duration * QUARTER));
    const noteStrs = notes.map(n => ABCBridge.noteToABC(n) + length);
    return `(${p}:${q}:${notes.length} ${noteStrs.join(' ')}`;
  }
}

const ABC_MODE: Record<string, string> = {
  major: '', ionian: '', minor: 'm', aeolian: 'm', dorian: 'dor', phrygian: 'phr', lydian: 'lyd', mixolydian: 'mix', locrian: 'loc',
};

/** Converts a UMT key symbol to an ABC K: field value. */
function umt2ABCKey(keySymbol: string): string {
  const { tonic, mode } = parseKey(keySymbol);
  return tonic + ABC_MODE[mode];
}
