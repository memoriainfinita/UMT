import { describe, it, expect } from 'vitest';
import { streamToMusicXML, chordToMusicXML, scaleToMusicXML } from '../../lib/music-theory/musicxml-bridge';
import { streamToLilyPond, chordToLilyPond, scaleToLilyPond } from '../../lib/music-theory/lilypond-bridge';
import { ABCBridge } from '../../lib/music-theory/abc-bridge';
import { MusicStream, TimeSignature, Duration } from '../../lib/music-theory/rhythm';
import { parseChordSymbol, parseScaleSymbol, parseNote } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';

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

// ============================================================================
// 10.1 — MusicXML bridge
// ============================================================================

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

// ============================================================================
// 10.2 — LilyPond bridge
// ============================================================================

describe('streamToLilyPond', () => {
  it('returns a string', () => {
    expect(typeof streamToLilyPond(makeStream())).toBe('string');
  });

  it('contains LilyPond version', () => {
    expect(streamToLilyPond(makeStream())).toContain('\\version');
  });

  it('contains relative block', () => {
    expect(streamToLilyPond(makeStream())).toContain('\\relative');
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

// ============================================================================
// 10.3 — ABC bridge improvements
// ============================================================================

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
    expect(result).toContain('c');
    expect(result).toContain('e');
    expect(result).toContain('g');
  });
});
