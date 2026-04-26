import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { MusicStream } from './rhythm';

/** Converts a beat duration to an ABC notation suffix. Assumes header `L:1/4`. */
function beatsToABCDuration(beats: number): string {
  if (beats === 1)     return '';
  if (beats === 2)     return '2';
  if (beats === 3)     return '3';
  if (beats === 4)     return '4';
  if (beats === 0.5)   return '/2';
  if (beats === 0.25)  return '/4';
  if (beats === 0.125) return '/8';
  if (beats === 1.5)   return '3/2';
  if (beats === 0.75)  return '3/4';
  if (beats === 0.375) return '3/8';
  // Generic fallback: express as reduced fraction of quarter notes
  const num = Math.round(beats * 8);
  const den = 8;
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(num, den);
  return g === den ? `${num / g}` : `${num / g}/${den / g}`;
}

/**
 * Bridge between Universal Music Theory and ABC Notation.
 * Converts UMT objects to ABC strings for visual rendering.
 */
export class ABCBridge {
  /**
   * Converts a single Note to ABC notation.
   * Maps 12-TET steps to ABC characters.
   * A4 (step 0) -> A
   * C4 (step -9) -> C
   * C5 (step 3) -> c
   */
  static noteToABC(note: Note): string {
    // Use the note's own name to preserve sharp/flat preference; getName() defaults to sharps.
    const name = note.getName();
    const match = name.match(/^([A-G])([#b]*)(\d+)$/);
    if (!match) throw new Error(`ABCBridge.noteToABC: note "${name}" cannot be represented in ABC notation. ABCBridge only supports 12-TET notes.`);

    const base = match[1];
    const accidental = match[2];
    const octave = parseInt(match[3], 10);

    // ABC Accidentals: # -> ^, b -> _
    let abcAccidental = '';
    if (accidental === '#') abcAccidental = '^';
    else if (accidental === 'b') abcAccidental = '_';
    else if (accidental === '##') abcAccidental = '^^';
    else if (accidental === 'bb') abcAccidental = '__';

    // ABC Octaves:
    // C, = C2
    // C = C3
    // c = C4
    // c' = C5
    // c'' = C6
    let abcPitch = '';
    if (octave === 2) abcPitch = base + ',';
    else if (octave === 3) abcPitch = base;
    else if (octave === 4) abcPitch = base.toLowerCase();
    else if (octave === 5) abcPitch = base.toLowerCase() + "'";
    else if (octave === 6) abcPitch = base.toLowerCase() + "''";
    else if (octave < 2) abcPitch = base + ','.repeat(3 - octave);
    else abcPitch = base.toLowerCase() + "'".repeat(octave - 4);

    return `${abcAccidental}${abcPitch}`;
  }

  /**
   * Converts an array of notes (a chord) to an ABC chord string.
   */
  static chordToABC(chord: Chord | Note[]): string {
    const notes = chord instanceof Chord ? chord.getNotes() : chord;
    const abcNotes = notes.map(n => this.noteToABC(n));
    return `[${abcNotes.join('')}]`;
  }

  /**
   * Converts a scale to an ABC sequence.
   */
  static scaleToABC(scale: Scale, octaves: number = 1): string {
    const notes = scale.getNotes(octaves);
    return notes.map(n => this.noteToABC(n)).join(' ');
  }

  /**
   * Converts a progression (array of note arrays) to ABC measures.
   */
  static progressionToABC(progression: Note[][]): string {
    return progression.map(notes => this.chordToABC(notes)).join(' | ') + ' |]';
  }

  /**
   * Converts a MusicStream to an ABC notation string.
   * Barlines are placed according to stream.timeSignature.totalBeats.
   */
  static streamToABC(stream: MusicStream): string {
    let abcString = '';
    let currentMeasureBeats = 0;

    for (const event of stream.events) {
      // Very basic duration mapping (assuming L:1/4)
      // 1 beat = 1/4 note = "1" in ABC (or just the note)
      // 0.5 beat = 1/8 note = "/2"
      // 2 beats = 1/2 note = "2"
      const durationStr = beatsToABCDuration(event.duration);

      const abcNotes = event.notes.map((n: Note) => this.noteToABC(n));
      const chordStr = abcNotes.length > 1 ? `[${abcNotes.join('')}]` : abcNotes[0];
      
      abcString += `${chordStr}${durationStr} `;
      
      currentMeasureBeats += event.duration;
      if (currentMeasureBeats >= stream.timeSignature.totalBeats) {
        abcString += '| ';
        currentMeasureBeats = 0;
      }
    }

    return abcString.trim() + (abcString.endsWith('| ') ? ']' : ' |]');
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
    return `X:1\nT:${title}\nM:${meter}\nL:1/4\nK:${abcKey}\n${content}`;
  }

  /**
   * Converts a MusicStream to ABC notation with optional chord symbols above the staff.
   * @param chordNames - Optional array of chord name strings aligned to stream events.
   */
  static streamToABCWithChords(stream: MusicStream, chordNames?: string[]): string {
    let abcString = '';
    let currentMeasureBeats = 0;
    const totalBeats = stream.timeSignature.totalBeats;

    for (let i = 0; i < stream.events.length; i++) {
      const event = stream.events[i];
      const durationStr = beatsToABCDuration(event.duration);
      const chordAnnotation = chordNames?.[i] ? `"${chordNames[i]}"` : '';

      const abcNotes = event.notes.map((n: Note) => ABCBridge.noteToABC(n));
      const noteStr = abcNotes.length > 1 ? `[${abcNotes.join('')}]` : (abcNotes[0] ?? 'z');
      abcString += `${chordAnnotation}${noteStr}${durationStr} `;

      currentMeasureBeats += event.duration;
      if (currentMeasureBeats >= totalBeats) {
        abcString += '| ';
        currentMeasureBeats = 0;
      }
    }
    return abcString.trim() + (abcString.endsWith('| ') ? ']' : ' |]');
  }

  /**
   * Generates an ABC tuplet string.
   * @param notes - Notes within the tuplet.
   * @param p - How many notes in the tuplet (e.g. 3 for triplet).
   * @param q - Normal note value they fit into (e.g. 2 for triplet).
   * @param duration - Duration of each note in beats.
   */
  static tuplet(notes: Note[], p: number, q: number, duration: number): string {
    const noteStrs = notes.map(n => ABCBridge.noteToABC(n) + beatsToABCDuration(duration));
    return `(${p}:${q}:${notes.length} ${noteStrs.join(' ')}`;
  }
}

/** Converts a UMT key symbol to an ABC K: field value. */
function umt2ABCKey(keySymbol: string): string {
  const m = keySymbol.match(/^([A-G][#b]*)\s*(.*)?$/i);
  if (!m) return 'C';
  const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const mode = (m[2] ?? '').toLowerCase().trim();
  if (mode === 'minor' || mode === 'aeolian' || mode === 'natural minor') return `${root}m`;
  if (mode === 'dorian') return `${root}dor`;
  if (mode === 'phrygian') return `${root}phr`;
  if (mode === 'lydian') return `${root}lyd`;
  if (mode === 'mixolydian') return `${root}mix`;
  if (mode === 'locrian') return `${root}loc`;
  return root; // major (default)
}
