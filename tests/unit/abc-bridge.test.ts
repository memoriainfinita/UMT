/**
 * Tests for lib/music-theory/abc-bridge.ts.
 */
import { describe, it, expect } from 'vitest';
import { ABCBridge } from '../../lib/music-theory/abc-bridge';
import { MusicStream, TimeSignature, Duration } from '../../lib/music-theory/rhythm';
import { parseNote } from '../../lib/music-theory/parser';

const n = (s: string) => parseNote(s);
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

describe('ABCBridge.wrapInHeaders key signature', () => {
  it('C major → K:C', () => {
    const abc = ABCBridge.wrapInHeaders('c', '', '4/4', 'C major');
    expect(abc).toContain('K:C');
  });

  it('G major → K:G', () => {
    const abc = ABCBridge.wrapInHeaders('g', '', '4/4', 'G major');
    expect(abc).toContain('K:G');
  });

  it('D minor → K:Dm', () => {
    const abc = ABCBridge.wrapInHeaders('d', '', '3/4', 'D minor');
    expect(abc).toContain('K:Dm');
  });

  it('E dorian → K:Edor', () => {
    const abc = ABCBridge.wrapInHeaders('e', '', '4/4', 'E dorian');
    expect(abc).toContain('K:Edor');
  });

  it('Bb major → K:Bb', () => {
    const abc = ABCBridge.wrapInHeaders('B', '', '4/4', 'Bb major');
    expect(abc).toContain('K:Bb');
  });
});

describe('ABCBridge.streamToABCWithChords', () => {
  it('returns string', () => {
    const stream = makeStream();
    expect(typeof ABCBridge.streamToABCWithChords(stream)).toBe('string');
  });

  it('includes chord annotations when provided', () => {
    const stream = makeStream();
    const result = ABCBridge.streamToABCWithChords(stream, ['C', 'Em', 'G']);
    expect(result).toContain('"C"');
    expect(result).toContain('"Em"');
  });

  it('no chord annotation without chordNames', () => {
    const stream = makeStream();
    expect(ABCBridge.streamToABCWithChords(stream)).not.toContain('"C"');
  });
});

describe('ABCBridge.tuplet', () => {
  it('returns string with tuplet marker', () => {
    const notes = [parseNote('C4'), parseNote('D4'), parseNote('E4')];
    const result = ABCBridge.tuplet(notes, 3, 2, 0.5);
    expect(result).toContain('(3:2:3');
  });

  it('contains all note pitches', () => {
    const notes = [parseNote('C4'), parseNote('E4'), parseNote('G4')];
    const result = ABCBridge.tuplet(notes, 3, 2, 0.5);
    expect(result).toBe('(3:2:3 C/2 E/2 G/2');
  });
});
