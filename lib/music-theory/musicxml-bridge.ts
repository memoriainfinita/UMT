/**
 * MusicXML export bridge.
 * Generates MusicXML 4.0-compatible strings from UMT objects: key and time signatures,
 * dots, triplets, and ties across barlines. Notes of other tunings keep their exact pitch
 * as a decimal `<alter>` (a quarter-tone sharp is 0.5).
 */
import { Chord } from './chord';
import { Scale } from './scale';
import { MusicStream, Duration } from './rhythm';
import {
  spellPitch, parseKey, signatureAlters, MeasureAccidentals,
  layoutMeasures, LaidEvent, TICKS_PER_WHOLE,
} from './notation-layout';

/** Optional metadata fields for MusicXML score headers. */
export interface MusicXMLMetadata {
  /** Work title. */
  title?: string;
  /** Composer credit. */
  composer?: string;
  /** Name of the part (default `'Music'`). */
  partName?: string;
}

/** Options for writing a stream in MusicXML. */
export interface MusicXMLOptions {
  /** Key of the music (e.g. `'D major'`, `'E dorian'`): sets `<key>` and the written accidentals. Default `'C major'`. */
  key?: string;
}

const TYPE_BY_TICKS: Record<number, string> = {
  384: 'whole', 192: 'half', 96: 'quarter', 48: 'eighth', 24: '16th', 12: '32nd', 6: '64th', 3: '128th',
};
const ACCIDENTAL_NAME: Record<number, string> = { [-2]: 'flat-flat', [-1]: 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp' };

/** Escapes text for XML content and attributes. */
function xmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function noteXML(ev: LaidEvent, unit: number, acc: MeasureAccidentals): string {
  const v = ev.value;
  const ties = [ev.tiedFrom && 'stop', ev.tie && 'start'].filter(Boolean) as string[];
  const after = [
    `<duration>${v.ticks / unit}</duration>`,
    ...ties.map(t => `<tie type="${t}"/>`),
    `<type>${TYPE_BY_TICKS[v.base]}</type>`,
    ...Array.from({ length: v.dots }, () => '<dot/>'),
  ];
  const modification = v.triplet
    ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>'
    : '';
  const notations = ties.length ? `<notations>${ties.map(t => `<tied type="${t}"/>`).join('')}</notations>` : '';

  if (ev.notes.length === 0) {
    return `        <note><rest/>${after.join('')}${modification}</note>\n`;
  }
  return ev.notes.map((n, i) => {
    const p = spellPitch(n);
    const alter = p.alter + p.cents / 100;
    const alterXML = alter !== 0 ? `<alter>${Math.round(alter * 100) / 100}</alter>` : '';
    // the written accidental, for pitches of the 12-TET spelling
    const shown = p.cents === 0 ? acc.mark(p) : null;
    const accidental = shown !== null && ACCIDENTAL_NAME[shown] ? `<accidental>${ACCIDENTAL_NAME[shown]}</accidental>` : '';
    return `        <note>${i > 0 ? '<chord/>' : ''}<pitch><step>${p.letter}</step>${alterXML}<octave>${p.octave}</octave></pitch>`
      + `${after.join('')}${accidental}${modification}${notations}</note>\n`;
  }).join('');
}

function xmlHeader(meta: MusicXMLMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${xmlText(meta.title ?? '')}</work-title></work>
  <identification><creator type="composer">${xmlText(meta.composer ?? '')}</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>${xmlText(meta.partName ?? 'Music')}</part-name></score-part>
  </part-list>`;
}

/**
 * Converts a MusicStream to a MusicXML string. Gaps between events become rests; notes
 * that cross a barline, or have no single written value, are split into tied values.
 * `<divisions>` is the fewest per quarter note that count every value whole.
 */
export function streamToMusicXML(stream: MusicStream, metadata: MusicXMLMetadata = {}, options: MusicXMLOptions = {}): string {
  const ts = stream.timeSignature;
  const key = parseKey(options.key ?? 'C major');
  const measures = layoutMeasures(stream);

  // ticks per division: the largest that divides a quarter and every value
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const quarter = TICKS_PER_WHOLE / 4;
  const unit = measures.flat().reduce((g, ev) => gcd(g, ev.value.ticks), quarter);

  const attributes = `      <attributes>
        <divisions>${quarter / unit}</divisions>
        <key><fifths>${key.fifths}</fifths><mode>${key.mode}</mode></key>
        <time><beats>${ts.numerators.join('+')}</beats><beat-type>${ts.denominator}</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>\n`;

  const acc = new MeasureAccidentals(signatureAlters(key.fifths));
  const body = (measures.length ? measures : [[]]).map((m, i) => {
    acc.reset();
    const notes = m.map(ev => noteXML(ev, unit, acc)).join('');
    return `    <measure number="${i + 1}">\n${i === 0 ? attributes : ''}${notes}    </measure>\n`;
  }).join('');

  return `${xmlHeader(metadata)}\n  <part id="P1">\n${body}  </part>\n</score-partwise>`;
}

/** Converts a single Chord to a one-measure MusicXML snippet (a whole-note chord in 4/4). */
export function chordToMusicXML(chord: Chord, metadata: MusicXMLMetadata = {}): string {
  const stream = new MusicStream();
  stream.addEvent(chord.getNotes(), Duration.Whole);
  return streamToMusicXML(stream, { title: chord.name, ...metadata });
}

/** Converts a Scale to ascending MusicXML quarter notes in 4/4. */
export function scaleToMusicXML(scale: Scale, octaves = 1, metadata: MusicXMLMetadata = {}): string {
  const stream = new MusicStream();
  for (const n of scale.getNotes(octaves)) stream.addEvent([n], Duration.Quarter);
  return streamToMusicXML(stream, { title: scale.name, ...metadata });
}
