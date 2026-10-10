import { describe, it, expect } from 'vitest';
import { ABCBridge } from '../../lib/music-theory/abc-bridge';
import { streamToLilyPond, chordToLilyPond } from '../../lib/music-theory/lilypond-bridge';
import { streamToMusicXML } from '../../lib/music-theory/musicxml-bridge';
import { parseKey, splitTicks, layoutMeasures } from '../../lib/music-theory/notation-layout';
import { MusicStream, TimeSignature, Duration } from '../../lib/music-theory/rhythm';
import { parseNote, parseChordSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { EDO } from '../../lib/music-theory/tuning';

const n = (s: string) => parseNote(s);
function stream(ts: TimeSignature, events: [string[], Duration][]): MusicStream {
  const s = new MusicStream(ts);
  for (const [notes, d] of events) s.addEvent(notes.map(n), d);
  return s;
}
const q = Duration.Quarter, h = Duration.Half, e = Duration.Eighth, w = Duration.Whole;
const dq = new Duration(1 / 4, 1);
const sixEight = new TimeSignature([6], 8);

describe('notation layout', () => {
  it('parseKey: signatures of modes and minor keys', () => {
    expect(parseKey('D major').fifths).toBe(2);
    expect(parseKey('E dorian').fifths).toBe(2);
    expect(parseKey('f#').fifths).toBe(3);
    expect(parseKey('Bb minor').fifths).toBe(-5);
    expect(parseKey('Dm')).toEqual({ tonic: 'D', mode: 'minor', fifths: -1 });
    expect(() => parseKey('C blues')).toThrow(RangeError);
  });

  it('splitTicks: dotted values, ties and triplets', () => {
    expect(splitTicks(144).map(v => [v.base, v.dots])).toEqual([[96, 1]]);
    expect(splitTicks(240).map(v => v.ticks)).toEqual([192, 48]); // 5/8: half + eighth
    expect(splitTicks(32)).toEqual([{ ticks: 32, base: 48, dots: 0, triplet: true }]);
    expect(() => splitTicks(1)).toThrow(RangeError);
  });

  it('gaps become rests; overlapping events throw', () => {
    const s = new MusicStream();
    s.addEventAt(1, [n('C4')], q);
    expect(layoutMeasures(s)[0].map(ev => ev.notes.length)).toEqual([0, 1]);
    s.addEventAt(1.5, [n('D4')], q);
    expect(() => layoutMeasures(s)).toThrow(RangeError);
  });
});

describe('ABC export', () => {
  it('C4 is C, C5 is c, C3 is C, (middle C is upper case)', () => {
    expect(ABCBridge.noteToABC(n('C4'))).toBe('C');
    expect(ABCBridge.noteToABC(n('C5'))).toBe('c');
    expect(ABCBridge.noteToABC(n('C6'))).toBe("c'");
    expect(ABCBridge.noteToABC(n('C3'))).toBe('C,');
    expect(ABCBridge.noteToABC(n('Bb4'))).toBe('_B');
  });

  it('writes naturals against the key and within the measure', () => {
    const s = stream(TimeSignature.Common, [[['F#4'], q], [['F4'], q], [['F4'], q], [['F#4'], q], [['F4'], w]]);
    expect(ABCBridge.streamToABC(s, { key: 'D major' })).toBe('F =F F ^F | =F4 |]');
    expect(ABCBridge.streamToABC(s)).toBe('^F =F F ^F | F4 |]');
  });

  it('6/8: lengths in quarters, barline after six eighths', () => {
    const s = stream(sixEight, [[['C4'], dq], [['D4'], e], [['E4'], e], [['F4'], e], [['G4'], w]]);
    expect(ABCBridge.streamToABC(s)).toBe('C3/2 D/2 E/2 F/2 | G3- | G |]');
  });

  it('ties a note across the barline', () => {
    const s = stream(TimeSignature.Common, [[['C4'], h], [['E4', 'G4'], w]]);
    expect(ABCBridge.streamToABC(s)).toBe('C2 [EG]2- | [EG]2 |]');
  });

  it('chord names sit on the first note of their event', () => {
    const s = stream(TimeSignature.Common, [[['C4'], dq], [['D4'], dq], [['E4'], h]]);
    expect(ABCBridge.streamToABCWithChords(s, ['C', 'Dm', 'Em'])).toBe('"C"C3/2 "Dm"D3/2 "Em"E- | E |]');
  });

  it('wrapInHeaders keeps the title on one line', () => {
    expect(ABCBridge.wrapInHeaders('C', 'A\nB')).toContain('T:A B\n');
  });
});

describe('LilyPond export', () => {
  it('absolute pitches, no \\relative', () => {
    const lp = streamToLilyPond(stream(TimeSignature.Common, [[['C4'], q], [['C5'], q], [['Bb3'], h]]));
    expect(lp).not.toContain('\\relative');
    expect(lp).toContain("c'4 c''4 bes2 |");
  });

  it('additive meter, key, escaped title', () => {
    const s = stream(new TimeSignature([3, 2, 2], 8), [[['D4'], dq]]);
    const lp = streamToLilyPond(s, { title: 'Say "hi" \\o' }, { key: 'D major' });
    expect(lp).toContain('\\time 3,2,2 7/8');
    expect(lp).toContain('\\key d \\major');
    expect(lp).toContain('title = "Say \\"hi\\" \\\\o"');
    expect(lp).toContain("d'4.");
  });

  it('lengths are not rounded down: 5/8 is a tied half and eighth', () => {
    const lp = streamToLilyPond(stream(TimeSignature.Common, [[['C4'], new Duration(5 / 8)]]));
    expect(lp).toContain("c'2~ c'8");
  });

  it('triplets', () => {
    const t = Duration.Eighth.tuplet(3, 2);
    const lp = streamToLilyPond(stream(TimeSignature.Common, [[['C4'], t], [['D4'], t], [['E4'], t]]));
    expect(lp).toContain("\\tuplet 3/2 { c'8 } \\tuplet 3/2 { d'8 }");
  });

  it('chord snippet', () => {
    expect(chordToLilyPond(parseChordSymbol('C'))).toContain("<c' e' g'>1 |");
  });
});

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
