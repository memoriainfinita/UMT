/**
 * Tests for lib/music-theory/parser.ts (roman).
 */
import { describe, it, expect } from 'vitest';
import { parseRomanProgression } from '../../lib/music-theory/parser';
import { getProgression } from '../../lib/music-theory/progressions';
import { EDO } from '../../lib/music-theory/tuning';

const names = (p: string, key: string) => parseRomanProgression(p, key).map(c => c.name);
const pcs = (p: string, key: string) => parseRomanProgression(p, key).map(c => c.intervalsInSteps.map(i => ((i % 12) + 12) % 12));

describe('parseRomanProgression - quality from the key', () => {
  it('names keep the quality: ii V I in C is Dm G C', () => {
    expect(names('ii V I', 'C major')).toEqual(['Dm', 'G', 'C']);
  });
  it('vii is Bdim and vii7 Bm7b5 in C major', () => {
    expect(names('vii vii7', 'C major')).toEqual(['Bdim', 'Bm7b5']);
    expect(pcs('vii7', 'C major')[0]).toEqual([0, 3, 6, 10]);
  });
  it('upper-case 7 is a dominant (jazz): ii7 V7 I7 IV7 Imaj7 is Dm7 G7 C7 F7 Cmaj7', () => {
    expect(names('ii7 V7 I7 IV7 Imaj7 Idom7', 'C major')).toEqual(['Dm7', 'G7', 'C7', 'F7', 'Cmaj7', 'C7']);
  });
  it('a third that is not the key gives the plain chord of the case', () => {
    expect(names('II II7 iv iv7', 'C major')).toEqual(['D', 'D7', 'Fm', 'Fm7']);
  });
  it('suffixes are chord types; lower case adds the minor third', () => {
    expect(names('ii9 V7b9 viiø7 vii°7 I6/9', 'C major')).toEqual(['Dm9', 'G7b9', 'Bm7b5', 'Bdim7', 'C6/9']);
  });
  it('an unknown suffix throws', () => {
    expect(() => parseRomanProgression('Vxyz', 'C major')).toThrow(/unknown chord type/);
  });
});

describe('parseRomanProgression - accidentals and minor keys', () => {
  it('accidentals move the key degree: bVII in C is Bb, bII in E is F', () => {
    expect(names('bVII', 'C major')).toEqual(['Bb']);
    expect(names('bII bVI', 'E major')).toEqual(['F', 'C']);
  });
  it('in minor, VII and VI are the natural degrees: andalusian in A minor', () => {
    expect(names('i VII VI V', 'A minor')).toEqual(['Am', 'G', 'F', 'E']);
    expect(names('bVII', 'A minor')).toEqual(['Gb']);
  });
  it('the leading-tone chord of a minor key stands on the raised seventh', () => {
    expect(names('vii° vii°7 V7 vii', 'A minor')).toEqual(['G#dim', 'G#dim7', 'E7', 'Gm']);
  });
  it('sharp keys keep their letters: V/vi in F# major', () => {
    expect(names('vii V/vi', 'F# major')).toEqual(['E#dim', 'A#']);
  });
});

describe('parseRomanProgression - applied chords and substitutes', () => {
  it('V7/ii, vii°7/V, V/bVI in C', () => {
    expect(names('V7/ii vii°7/V V/bVI', 'C major')).toEqual(['A7', 'F#dim7', 'Eb']);
  });
  it('tritone substitutes are spelled a diminished fifth above', () => {
    expect(names('subV7 subV7/ii', 'C major')).toEqual(['Db7', 'Eb7']);
  });
  it('other tunings map the chord by its 12-TET intervals', () => {
    const c = parseRomanProgression('V7/ii', 'C major', new EDO(24))[0];
    expect(c.intervalsInSteps).toEqual([0, 8, 14, 20]);
  });
});

describe('getProgression - andalusian in A minor', () => {
  it('is Am G F E', () => {
    expect(getProgression('andalusian', 'A minor').map(c => c.name)).toEqual(['Am', 'G', 'F', 'E']);
  });
});
