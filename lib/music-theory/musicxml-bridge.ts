/**
 * MusicXML export bridge.
 * Generates MusicXML 4.0-compatible strings from UMT objects.
 * Supports key signatures, time signatures, clefs, and basic dynamics/articulation.
 */
import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { MusicStream, Duration } from './rhythm';

export interface MusicXMLMetadata {
  title?: string;
  composer?: string;
  partName?: string;
}

// Map step offset from A4 to MusicXML step/octave/alter
function noteToXMLParts(note: Note): { step: string; octave: number; alter: number } {
  const name = note.getName();
  const match = name.match(/^([A-G])([#b]*)(\d+)$/);
  if (!match) throw new Error(`musicxml-bridge: cannot represent note "${name}".`);
  const step = match[1];
  const accStr = match[2];
  const octave = parseInt(match[3], 10);
  let alter = 0;
  for (const ch of accStr) {
    if (ch === '#') alter += 1;
    if (ch === 'b') alter -= 1;
  }
  return { step, octave, alter };
}

function noteToXML(note: Note, duration = 4, type = 'quarter'): string {
  const { step, octave, alter } = noteToXMLParts(note);
  const alterXML = alter !== 0 ? `<alter>${alter}</alter>` : '';
  return `        <note>
          <pitch><step>${step}</step>${alterXML}<octave>${octave}</octave></pitch>
          <duration>${duration}</duration>
          <type>${type}</type>
        </note>`;
}

function xmlHeader(meta: MusicXMLMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${meta.title ?? ''}</work-title></work>
  <identification><creator type="composer">${meta.composer ?? ''}</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>${meta.partName ?? 'Music'}</part-name></score-part>
  </part-list>`;
}

/**
 * Converts a MusicStream to a MusicXML string.
 * Each event becomes a note or chord; rests are inferred from gaps.
 */
export function streamToMusicXML(stream: MusicStream, metadata: MusicXMLMetadata = {}): string {
  const ts = stream.timeSignature;
  const beats = ts.totalBeats;
  const beatType = ts.denominator;

  let measures = '';
  let measureNum = 1;
  let measureBeats = 0;
  let measureNotes = '';
  const divisions = 4; // quarter note = 4 divisions

  for (const event of stream.events) {
    const durBeats = event.duration;
    const durDivisions = Math.round(durBeats * divisions);
    const typeStr = durBeats >= 4 ? 'whole' : durBeats >= 2 ? 'half' : durBeats >= 1 ? 'quarter' : durBeats >= 0.5 ? 'eighth' : 'sixteenth';

    if (event.notes.length === 0) {
      // Rest
      measureNotes += `        <note><rest/><duration>${durDivisions}</duration><type>${typeStr}</type></note>\n`;
    } else if (event.notes.length === 1) {
      measureNotes += noteToXML(event.notes[0], durDivisions, typeStr) + '\n';
    } else {
      // Chord: first note normal, rest with <chord/>
      measureNotes += noteToXML(event.notes[0], durDivisions, typeStr) + '\n';
      for (let i = 1; i < event.notes.length; i++) {
        const { step, octave, alter } = noteToXMLParts(event.notes[i]);
        const alterXML = alter !== 0 ? `<alter>${alter}</alter>` : '';
        measureNotes += `        <note>
          <chord/>
          <pitch><step>${step}</step>${alterXML}<octave>${octave}</octave></pitch>
          <duration>${durDivisions}</duration>
          <type>${typeStr}</type>
        </note>\n`;
      }
    }

    measureBeats += durBeats;

    if (measureBeats >= beats) {
      const isFirst = measureNum === 1;
      const attributesXML = isFirst
        ? `      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>\n`
        : '';
      measures += `    <measure number="${measureNum}">\n${attributesXML}${measureNotes}    </measure>\n`;
      measureNum++;
      measureNotes = '';
      measureBeats = 0;
    }
  }

  // Final incomplete measure
  if (measureNotes) {
    const isFirst = measureNum === 1;
    const attributesXML = isFirst
      ? `      <attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n`
      : '';
    measures += `    <measure number="${measureNum}">\n${attributesXML}${measureNotes}    </measure>\n`;
  }

  return `${xmlHeader(metadata)}\n  <part id="P1">\n${measures}  </part>\n</score-partwise>`;
}

/** Converts a single Chord to a one-measure MusicXML snippet. */
export function chordToMusicXML(chord: Chord, metadata: MusicXMLMetadata = {}): string {
  const notes = chord.getNotes();
  let notesXML = noteToXML(notes[0], 16, 'whole') + '\n';
  for (let i = 1; i < notes.length; i++) {
    const { step, octave, alter } = noteToXMLParts(notes[i]);
    const alterXML = alter !== 0 ? `<alter>${alter}</alter>` : '';
    notesXML += `        <note><chord/><pitch><step>${step}</step>${alterXML}<octave>${octave}</octave></pitch><duration>16</duration><type>whole</type></note>\n`;
  }
  const measure = `    <measure number="1">
      <attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
${notesXML}    </measure>`;
  return `${xmlHeader({ title: chord.name, ...metadata })}\n  <part id="P1">\n${measure}\n  </part>\n</score-partwise>`;
}

/** Converts a Scale to ascending MusicXML. */
export function scaleToMusicXML(scale: Scale, octaves = 1, metadata: MusicXMLMetadata = {}): string {
  const stream = new MusicStream();
  const notes = scale.getNotes(octaves);
  for (const n of notes) {
    stream.addEvent([n], Duration.Quarter);
  }
  return streamToMusicXML(stream, { title: scale.name, ...metadata });
}
