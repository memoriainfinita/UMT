import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { get12TETName } from './utils';
import { MusicStream } from './stream';

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
    // We use get12TETName to get the closest standard note name
    const name = get12TETName(note.stepsFromBase, true); // Prefer flats for ABC or we can parse both
    const match = name.match(/^([A-G])([#b]*)(\d+)$/);
    if (!match) return 'C'; // Fallback

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
   * Currently assumes 4/4 time and maps durations to ABC lengths.
   */
  static streamToABC(stream: MusicStream): string {
    let abcString = '';
    let currentMeasureBeats = 0;

    for (const event of stream.events) {
      // Very basic duration mapping (assuming L:1/4)
      // 1 beat = 1/4 note = "1" in ABC (or just the note)
      // 0.5 beat = 1/8 note = "/2"
      // 2 beats = 1/2 note = "2"
      let durationStr = '';
      if (event.duration === 0.5) durationStr = '/2';
      else if (event.duration === 0.25) durationStr = '/4';
      else if (event.duration === 2) durationStr = '2';
      else if (event.duration === 4) durationStr = '4';
      else if (event.duration !== 1) durationStr = event.duration.toString();

      const abcNotes = event.notes.map((n: Note) => this.noteToABC(n));
      const chordStr = abcNotes.length > 1 ? `[${abcNotes.join('')}]` : abcNotes[0];
      
      abcString += `${chordStr}${durationStr} `;
      
      currentMeasureBeats += event.duration;
      if (currentMeasureBeats >= 4) {
        abcString += '| ';
        currentMeasureBeats = 0;
      }
    }

    return abcString.trim() + (abcString.endsWith('| ') ? ']' : ' |]');
  }

  /**
   * Wraps ABC content in standard headers for rendering.
   */
  static wrapInHeaders(content: string, title: string = '', meter: string = '4/4', key: string = 'C'): string {
    return `X:1
T:${title}
M:${meter}
L:1/4
K:${key}
${content}`;
  }
}
