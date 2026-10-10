/**
 * Tests for lib/music-theory/voicing.ts.
 * Close and open position by the upper voices (soprano to tenor within an octave); drop 2,
 * drop 3 and drop 2+4 as close voicings with voices dropped an octave.
 */
import { describe, it, expect } from 'vitest';
import { analyzeVoicing } from '../../lib/music-theory/voicing';
import { parseChordSymbol, parseNote } from '../../lib/music-theory/parser';

const v = (names: string[], chord?: string) => analyzeVoicing(names.map(n => parseNote(n)), chord ? parseChordSymbol(chord) : undefined)!;

describe('analyzeVoicing', () => {
  it('root position, close, complete triad with the root doubled (SATB)', () => {
    const r = v(['C3', 'C4', 'E4', 'G4'], 'C');
    expect(r.inversion).toBe(0);
    expect(r.position).toBe('close');
    expect(r.doubled).toEqual(['R']);
    expect(r.omitted).toEqual([]);
    expect(r.voices.map(x => x.degree)).toEqual(['R', 'R', '3', '5']);
  });

  it('open position: soprano and tenor more than an octave apart', () => {
    expect(v(['C3', 'G3', 'E4', 'C5'], 'C').position).toBe('open');
  });

  it('inversions by the bass', () => {
    expect(v(['E3', 'G3', 'C4'], 'C').inversion).toBe(1);
    expect(v(['G3', 'C4', 'E4'], 'C').inversion).toBe(2);
    expect(v(['Bb2', 'C4', 'E4', 'G4'], 'C7').inversion).toBe(3);
    expect(v(['D3', 'C4', 'E4', 'G4'], 'Cadd9').inversion).toBeNull();
  });

  it('drop 2, drop 3 and drop 2+4 of Cmaj7', () => {
    // close B4 G4 E4 C4 (top down): drop the 2nd (G), the 3rd (E), the 2nd and 4th (G, C)
    expect(v(['G3', 'C4', 'E4', 'B4'], 'Cmaj7').drop).toBe('drop 2');
    expect(v(['E3', 'C4', 'G4', 'B4'], 'Cmaj7').drop).toBe('drop 3');
    expect(v(['C3', 'G3', 'E4', 'B4'], 'Cmaj7').drop).toBe('drop 2+4');
    expect(v(['C4', 'E4', 'G4', 'B4'], 'Cmaj7').drop).toBeNull();
  });

  it('omitted fifth, added note, and a ninth named as such', () => {
    const r = v(['C3', 'E3', 'Bb3', 'D4'], 'C9');
    expect(r.omitted).toEqual(['5']);
    expect(r.voices.map(x => x.degree)).toEqual(['R', '3', 'b7', '9']);
    expect(v(['C4', 'E4', 'G4', 'F#5'], 'C').added).toEqual(['F#5']);
  });

  it('a diminished seventh has a bb7; without a chord the first detected reading is used', () => {
    expect(v(['B3', 'D4', 'F4', 'Ab4'], 'Bdim7').voices.map(x => x.degree)).toEqual(['R', 'b3', 'b5', 'bb7']);
    const r = analyzeVoicing(['E3', 'G3', 'C4'].map(n => parseNote(n)))!;
    expect(r.chord).toBe('C/E');
    expect(r.inversion).toBe(1);
    expect(analyzeVoicing([])).toBeNull();
  });
});
