/**
 * Tests for lib/music-theory/lilypond-bridge.ts.
 */
import { describe, it, expect } from 'vitest';
import { streamToLilyPond, chordToLilyPond, scaleToLilyPond } from '../../lib/music-theory/lilypond-bridge';
import { MusicStream, TimeSignature, Duration } from '../../lib/music-theory/rhythm';
import { parseNote, parseChordSymbol, parseScaleSymbol } from '../../lib/music-theory/parser';

function stream(ts: TimeSignature, events: [string[], Duration][]): MusicStream {
  const s = new MusicStream(ts);
  for (const [notes, d] of events) s.addEvent(notes.map(n), d);
  return s;
}
const q = Duration.Quarter, h = Duration.Half, e = Duration.Eighth, w = Duration.Whole;
const dq = new Duration(1 / 4, 1);
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

describe('streamToLilyPond', () => {
  it('returns a string', () => {
    expect(typeof streamToLilyPond(makeStream())).toBe('string');
  });

  it('contains LilyPond version', () => {
    expect(streamToLilyPond(makeStream())).toContain('\\version');
  });

  it('writes absolute pitches (no relative block)', () => {
    expect(streamToLilyPond(makeStream())).not.toContain('\\relative');
  });

  it('contains note names', () => {
    const lp = streamToLilyPond(makeStream());
    expect(lp).toMatch(/[a-g]['|,]?/);
  });

  it('metadata title appears in output', () => {
    const lp = streamToLilyPond(makeStream(), { title: 'My Piece' });
    expect(lp).toContain('My Piece');
  });

  it('contains time directive', () => {
    expect(streamToLilyPond(makeStream())).toContain('\\time');
  });
});

describe('chordToLilyPond', () => {
  it('returns string with chord brackets', () => {
    const lp = chordToLilyPond(parseChordSymbol('C'));
    expect(lp).toContain('<');
    expect(lp).toContain('>');
  });

  it('chord name appears in header', () => {
    expect(chordToLilyPond(parseChordSymbol('Dm7'))).toContain('Dm7');
  });
});

describe('scaleToLilyPond', () => {
  it('returns string', () => {
    expect(typeof scaleToLilyPond(parseScaleSymbol('G major'))).toBe('string');
  });

  it('contains quarter note durations', () => {
    expect(scaleToLilyPond(parseScaleSymbol('C major'))).toContain('4');
  });

  it('scale name in header', () => {
    expect(scaleToLilyPond(parseScaleSymbol('D dorian'))).toContain('D dorian');
  });
});
