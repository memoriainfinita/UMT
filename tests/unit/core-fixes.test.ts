import { describe, it, expect } from 'vitest';
import { CentTuning, TET12 } from '../../lib/music-theory/tuning';
import { Chord } from '../../lib/music-theory/chord';
import { parseChordSymbol, parseNote } from '../../lib/music-theory/parser';
import { getEnharmonics, freqToMidi, preferFlatsForKey } from '../../lib/music-theory/utils';

describe('core fixes (audit 2026-10, phase 1)', () => {
  it('CentTuning does not change the array it is given', () => {
    const cents = [100, 200];
    const t = new CentTuning('t', cents);
    expect(cents).toEqual([100, 200]);
    expect(t.cents).toEqual([0, 100, 200]);
  });

  it('Note.scientificOctave follows the written name; octave still counts from A4', () => {
    expect(parseNote('C4').scientificOctave).toBe(4);
    expect(parseNote('C4').octave).toBe(-1);
    expect(parseNote('B#3').scientificOctave).toBe(3);
    expect(parseNote('A4').scientificOctave).toBe(4);
  });

  it('a Chord must start at the root', () => {
    expect(() => new Chord('x', TET12, 0, [4, 7])).toThrow(/start with 0/);
  });

  it('rootless keeps a slash bass and drops the root', () => {
    const names = parseChordSymbol('Cmaj7/E').getVoicing('rootless').map(n => n.name);
    expect(names).toEqual(['E3', 'E4', 'G4', 'B4']);
    expect(parseChordSymbol('Cmaj7').getVoicing('rootless').map(n => n.name)).toEqual(['E4', 'G4', 'B4']);
  });

  it('getEnharmonics covers every note with ##/bb', () => {
    expect(getEnharmonics('C#')).toEqual(['Db', 'B##']);
    expect(getEnharmonics('D')).toEqual(['C##', 'Ebb']);
    expect(getEnharmonics('G#')).toEqual(['Ab']);
    expect(getEnharmonics('C4')).toEqual(['B#3', 'Dbb4']);
    expect(getEnharmonics('x')).toEqual([]);
  });

  it('freqToMidi clamps to 0-127', () => {
    expect(freqToMidi(440)).toBe(69);
    expect(freqToMidi(1)).toBe(0);
    expect(freqToMidi(100000)).toBe(127);
  });

  it('modes of harmonic and melodic minor take the parent minor key', () => {
    expect(preferFlatsForKey('E', 'phrygian dominant')).toBe(false);   // A minor
    expect(preferFlatsForKey('G', 'lydian dominant')).toBe(true);      // D minor
    expect(preferFlatsForKey('B', 'altered')).toBe(true);              // C minor
    expect(preferFlatsForKey('G#', 'altered')).toBe(false);            // A minor
    expect(preferFlatsForKey('A#', 'minor')).toBe(false);
  });
});
