import { describe, it, expect } from 'vitest';
import { parseChordSymbol } from '../../lib/music-theory/parser';

describe('chord note spelling', () => {
  it('C7: b7 = Bb not A#', () => {
    const names = parseChordSymbol('C7').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('Bb');
    expect(names).not.toContain('A#');
  });
  it('Cm: m3 = Eb not D#', () => {
    const names = parseChordSymbol('Cm').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('Eb');
    expect(names).not.toContain('D#');
  });
  it('Caug: A5 = G# not Ab', () => {
    const names = parseChordSymbol('Caug').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('G#');
    expect(names).not.toContain('Ab');
  });
  it('Cmaj7#11: #11 = F# not Gb', () => {
    const names = parseChordSymbol('Cmaj7#11').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('F#');
    expect(names).not.toContain('Gb');
  });
  it('G7: b7 = F natural', () => {
    const names = parseChordSymbol('G7').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('F');
  });
  it('Bbm: m3 = Db not C#', () => {
    const names = parseChordSymbol('Bbm').getNotes().map(n => n.name.replace(/\d/, ''));
    expect(names).toContain('Db');
    expect(names).not.toContain('C#');
  });
});
