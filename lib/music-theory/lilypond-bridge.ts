/**
 * LilyPond export bridge.
 * Generates LilyPond syntax strings from UMT objects.
 * Compatible with LilyPond 2.24+.
 */
import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { MusicStream } from './rhythm';

export interface LPMetadata {
  title?: string;
  composer?: string;
  opus?: string;
}

// Convert a note's step offset to LilyPond pitch string
function noteToLP(note: Note): string {
  const name = note.getName();
  const match = name.match(/^([A-G])([#b]*)(\d+)$/);
  if (!match) throw new Error(`lilypond-bridge: cannot represent note "${name}".`);

  const base = match[1].toLowerCase();
  const accStr = match[2];
  const octave = parseInt(match[3], 10);

  // LilyPond accidentals: # -> is, ## -> isis, b -> es, bb -> eses
  const accMap: Record<string, string> = { '#': 'is', '##': 'isis', 'b': 'es', 'bb': 'eses' };
  const acc = accMap[accStr] ?? '';

  // LilyPond octave marks: c' = C4, c'' = C5, c = C3, c, = C2
  const baseOctave = 3; // c without mark = C3 in LilyPond
  let octMark = '';
  if (octave > baseOctave) octMark = "'".repeat(octave - baseOctave);
  else if (octave < baseOctave) octMark = ','.repeat(baseOctave - octave);

  return `${base}${acc}${octMark}`;
}

function durationToLP(beats: number): string {
  if (beats >= 4) return '1';
  if (beats >= 3) return '2.';
  if (beats >= 2) return '2';
  if (beats >= 1.5) return '4.';
  if (beats >= 1) return '4';
  if (beats >= 0.75) return '8.';
  if (beats >= 0.5) return '8';
  if (beats >= 0.25) return '16';
  return '32';
}

function lpHeader(meta: LPMetadata): string {
  return `\\version "2.24.0"

\\header {
  title = "${meta.title ?? ''}"
  composer = "${meta.composer ?? ''}"
  opus = "${meta.opus ?? ''}"
}

`;
}

/** Converts a MusicStream to a LilyPond string. */
export function streamToLilyPond(stream: MusicStream, metadata: LPMetadata = {}): string {
  const ts = stream.timeSignature;
  let notes = '';

  for (const event of stream.events) {
    const dur = durationToLP(event.duration);
    if (event.notes.length === 0) {
      notes += `r${dur} `;
    } else if (event.notes.length === 1) {
      notes += `${noteToLP(event.notes[0])}${dur} `;
    } else {
      const chordNotes = event.notes.map(noteToLP).join(' ');
      notes += `<${chordNotes}>${dur} `;
    }
  }

  const tsStr = `\\time ${ts.numerators.join('+')}/${ts.denominator}`;
  return `${lpHeader(metadata)}\\relative {
  ${tsStr}
  ${notes.trim()}
}
`;
}

/** Converts a Chord to a LilyPond snippet (whole note chord). */
export function chordToLilyPond(chord: Chord, metadata: LPMetadata = {}): string {
  const notes = chord.getNotes();
  const lpNotes = notes.map(noteToLP).join(' ');
  return `${lpHeader({ title: chord.name, ...metadata })}\\relative {
  <${lpNotes}>1
}
`;
}

/** Converts a Scale to an ascending LilyPond sequence. */
export function scaleToLilyPond(scale: Scale, metadata: LPMetadata = {}): string {
  const notes = scale.getNotes(1);
  const lpNotes = notes.map(n => `${noteToLP(n)}4`).join(' ');
  return `${lpHeader({ title: scale.name, ...metadata })}\\relative {
  ${lpNotes}
}
`;
}
