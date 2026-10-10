/**
 * Tests for lib/music-theory/musicxml-bridge.ts.
 */
import { describe, it, expect } from 'vitest';
import { streamToMusicXML, chordToMusicXML, scaleToMusicXML } from '../../lib/music-theory/musicxml-bridge';
import { MusicStream, TimeSignature, Duration } from '../../lib/music-theory/rhythm';
import { parseNote, parseChordSymbol, parseScaleSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { EDO } from '../../lib/music-theory/tuning';

function stream(ts: TimeSignature, events: [string[], Duration][]): MusicStream {
  const s = new MusicStream(ts);
  for (const [notes, d] of events) s.addEvent(notes.map(n), d);
  return s;
}
const q = Duration.Quarter, h = Duration.Half, e = Duration.Eighth, w = Duration.Whole;
const dq = new Duration(1 / 4, 1);
const sixEight = new TimeSignature([6], 8);
function makeStream(): MusicStream {
  const stream = new MusicStream(TimeSignature.Common, 120);
  const c4 = parseNote('C4');
  const e4 = parseNote('E4');
  const g4 = parseNote('G4');
  stream.addEvent([c4], Duration.Quarter);
  stream.addEvent([e4], Duration.Quarter);
  stream.addEvent([g4], Duration.Half);
  return stream;
}
const n = (s: string) => parseNote(s);

describe('MusicXML export', () => {
  it('key signature from the key option', () => {
    const xml = streamToMusicXML(stream(TimeSignature.Common, [[['D4'], w]]), {}, { key: 'D major' });
    expect(xml).toContain('<fifths>2</fifths><mode>major</mode>');
  });

  it('6/8 with dots: divisions per quarter, <dot/>', () => {
    const xml = streamToMusicXML(stream(sixEight, [[['C4'], dq], [['D4'], e], [['E4'], e], [['F4'], e]]));
    expect(xml).toContain('<divisions>2</divisions>');
    expect(xml).toContain('<beats>6</beats><beat-type>8</beat-type>');
    expect(xml).toContain('<duration>3</duration><type>quarter</type><dot/>');
  });

  it('ties across the barline', () => {
    const xml = streamToMusicXML(stream(TimeSignature.Common, [[['C4'], h], [['E4'], w]]));
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tied type="stop"/>');
    expect((xml.match(/<measure /g) ?? []).length).toBe(2);
  });

  it('accidentals against the key, escaped text', () => {
    const s = stream(TimeSignature.Common, [[['F4'], q], [['F#4'], q]]);
    const xml = streamToMusicXML(s, { title: 'R&B <1>' }, { key: 'D major' });
    expect(xml).toContain('<work-title>R&amp;B &lt;1&gt;</work-title>');
    expect(xml).toContain('<accidental>natural</accidental>');
    expect(xml).toContain("<accidental>sharp</accidental>"); // F# after the natural in the same measure
  });

  it('other tunings keep their exact pitch as a decimal alter', () => {
    const s = new MusicStream();
    s.addEvent([new Note(new EDO(24), 1)], q); // A4 + 50 cents
    expect(streamToMusicXML(s)).toContain('<step>A</step><alter>0.5</alter><octave>4</octave>');
  });
});

describe('streamToMusicXML', () => {
  it('returns a string', () => {
    expect(typeof streamToMusicXML(makeStream())).toBe('string');
  });

  it('contains XML declaration', () => {
    expect(streamToMusicXML(makeStream())).toContain('<?xml');
  });

  it('contains score-partwise root', () => {
    expect(streamToMusicXML(makeStream())).toContain('score-partwise');
  });

  it('contains part element', () => {
    expect(streamToMusicXML(makeStream())).toContain('<part id="P1">');
  });

  it('contains at least one measure', () => {
    expect(streamToMusicXML(makeStream())).toContain('<measure');
  });

  it('title metadata appears in output', () => {
    const xml = streamToMusicXML(makeStream(), { title: 'Test Piece' });
    expect(xml).toContain('Test Piece');
  });

  it('contains pitch elements', () => {
    expect(streamToMusicXML(makeStream())).toContain('<pitch>');
  });
});

describe('chordToMusicXML', () => {
  it('returns valid XML string', () => {
    const xml = chordToMusicXML(parseChordSymbol('Cmaj7'));
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<note>');
  });

  it('contains correct step for C chord', () => {
    const xml = chordToMusicXML(parseChordSymbol('C'));
    expect(xml).toContain('<step>C</step>');
  });

  it('includes chord name in title', () => {
    expect(chordToMusicXML(parseChordSymbol('Am7'))).toContain('Am7');
  });
});

describe('scaleToMusicXML', () => {
  it('returns XML string', () => {
    const xml = scaleToMusicXML(parseScaleSymbol('C major'));
    expect(xml).toContain('<?xml');
  });

  it('contains multiple notes', () => {
    const xml = scaleToMusicXML(parseScaleSymbol('C major'));
    const noteCount = (xml.match(/<note>/g) ?? []).length;
    expect(noteCount).toBeGreaterThanOrEqual(7);
  });
});
