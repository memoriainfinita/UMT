/**
 * Tests for lib/music-theory/scale-finder.ts.
 */
import { describe, it, expect } from 'vitest';
import { findScalesForNotes } from '../../lib/music-theory/scale-finder';
import { parseNote } from '../../lib/music-theory/parser';

const find = (names: string[], options = {}) => findScalesForNotes(names.map(n => parseNote(n)), options);

describe('findScalesForNotes', () => {
  it('C E G Bb: C mixolydian first, its added notes spelled', () => {
    const [first] = find(['C4', 'E4', 'G4', 'Bb4']);
    expect(first.name).toBe('C mixolydian');
    expect(first.extra).toEqual(['D', 'F', 'A']);
    expect(first.rootIsTonic).toBe(true);
  });

  it('a triad: the smallest common scale on the tonic first, then the seven-note ones', () => {
    const names = find(['C4', 'E4', 'G4']).map(s => s.name);
    expect(names[0]).toBe('C pentatonic major');
    expect(names.slice(1, 4).sort()).toEqual(['C lydian', 'C major', 'C mixolydian']);
  });

  it('aliases are one result', () => {
    const major = find(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']).filter(s => s.root === 'C' && s.type === 'major');
    expect(major).toHaveLength(1);
    expect(major[0].aliases).toEqual(expect.arrayContaining(['ionian', 'greek-hypolydian']));
  });

  it('tonic option, tonicOnly and limit', () => {
    expect(find(['F4', 'A4', 'D5'], { tonic: 'D' })[0].name).toBe('D pentatonic minor');
    const onD = find(['F4', 'A4', 'D5'], { tonic: 'D', tonicOnly: true, limit: 5 });
    expect(onD).toHaveLength(5);
    expect(onD.every(s => s.root === 'D')).toBe(true);
  });

  it('roots keep the letters of the notes given', () => {
    expect(find(['Db4', 'F4', 'Ab4'])[0].root).toBe('Db');
    expect(find(['F#4', 'A#4', 'C#5'])[0].name).toBe('F# pentatonic major');
  });

  it('the chromatic scale is last; nothing for no notes', () => {
    const all = find(['C4', 'E4', 'G4']);
    expect(all[all.length - 1].type).toBe('chromatic');
    // on the tonic too: E G C B has E chromatic below every scale on another root
    const onE = find(['E3', 'G3', 'C4', 'B4']);
    expect(onE.slice(0, 2).map(s => s.name)).toEqual(['E phrygian', 'E minor']);
    expect(onE.findIndex(s => s.type === 'chromatic')).toBeGreaterThan(onE.findIndex(s => !s.rootIsTonic));
    expect(findScalesForNotes([])).toEqual([]);
  });
});
