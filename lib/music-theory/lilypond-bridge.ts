/**
 * LilyPond export bridge.
 * Generates LilyPond syntax strings from UMT objects, with pitches in absolute mode
 * (c' = middle C). Notes of other tunings are written at the nearest 12-TET pitch.
 * Compatible with LilyPond 2.24+.
 */
import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { MusicStream, Duration } from './rhythm';
import { spellPitch, parseKey, layoutMeasures, LaidEvent, TICKS_PER_WHOLE } from './notation-layout';

/** Optional metadata fields for LilyPond header block. */
export interface LPMetadata {
  title?: string;
  composer?: string;
  opus?: string;
}

/** Options for writing a stream in LilyPond. */
export interface LPOptions {
  /** Key of the music (e.g. `'D major'`, `'E dorian'`): sets `\key`. Default: none (C major). */
  key?: string;
}

const LP_ACCIDENTAL: Record<number, string> = { [-2]: 'eses', [-1]: 'es', 0: '', 1: 'is', 2: 'isis' };

/** Pitch in absolute mode: c' = C4, c = C3, c, = C2, c'' = C5. */
function noteToLP(note: Note): string {
  const p = spellPitch(note);
  const marks = p.octave >= 3 ? "'".repeat(p.octave - 3) : ','.repeat(3 - p.octave);
  return `${p.letter.toLowerCase()}${LP_ACCIDENTAL[p.alter] ?? ''}${marks}`;
}

function lpEvent(ev: LaidEvent): string {
  const v = ev.value;
  const length = `${TICKS_PER_WHOLE / v.base}${'.'.repeat(v.dots)}`;
  const body = ev.notes.length === 0 ? 'r'
    : ev.notes.length === 1 ? noteToLP(ev.notes[0])
    : `<${ev.notes.map(noteToLP).join(' ')}>`;
  const written = `${body}${length}${ev.tie ? '~' : ''}`;
  return v.triplet ? `\\tuplet 3/2 { ${written} }` : written;
}

/** A LilyPond string literal. */
function lpString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function lpHeader(meta: LPMetadata): string {
  return `\\version "2.24.0"

\\header {
  title = ${lpString(meta.title ?? '')}
  composer = ${lpString(meta.composer ?? '')}
  opus = ${lpString(meta.opus ?? '')}
}

`;
}

/**
 * Converts a MusicStream to a LilyPond string. Measures end in bar checks (`|`); notes that
 * cross a barline, or have no single written value, are split into tied values. An additive
 * meter is written `\time 3,2,2 7/8`.
 */
export function streamToLilyPond(stream: MusicStream, metadata: LPMetadata = {}, options: LPOptions = {}): string {
  const ts = stream.timeSignature;
  const time = ts.numerators.length > 1
    ? `\\time ${ts.numerators.join(',')} ${ts.totalBeats}/${ts.denominator}`
    : `\\time ${ts.totalBeats}/${ts.denominator}`;
  const lines = [time];
  if (options.key) {
    const { tonic, mode } = parseKey(options.key);
    const lpTonic = tonic[0].toLowerCase() + tonic.slice(1).replace(/#/g, 'is').replace(/b/g, 'es');
    lines.push(`\\key ${lpTonic} \\${mode === 'ionian' ? 'major' : mode === 'aeolian' ? 'minor' : mode}`);
  }
  const measures = layoutMeasures(stream);
  const barTicks = (ts.totalBeats / ts.denominator) * TICKS_PER_WHOLE;
  measures.forEach(m => {
    const full = m.reduce((sum, ev) => sum + ev.value.ticks, 0) === barTicks;
    lines.push(m.map(lpEvent).join(' ') + (full ? ' |' : ''));
  });
  return `${lpHeader(metadata)}{\n  ${lines.join('\n  ')}\n}\n`;
}

/** Converts a Chord to a LilyPond snippet (one whole-note chord in 4/4). */
export function chordToLilyPond(chord: Chord, metadata: LPMetadata = {}): string {
  const stream = new MusicStream();
  stream.addEvent(chord.getNotes(), Duration.Whole);
  return streamToLilyPond(stream, { title: chord.name, ...metadata });
}

/** Converts a Scale to an ascending LilyPond sequence of quarter notes in 4/4. */
export function scaleToLilyPond(scale: Scale, metadata: LPMetadata = {}): string {
  const stream = new MusicStream();
  for (const n of scale.getNotes(1)) stream.addEvent([n], Duration.Quarter);
  return streamToLilyPond(stream, { title: scale.name, ...metadata });
}
