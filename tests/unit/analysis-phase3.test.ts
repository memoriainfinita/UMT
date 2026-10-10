import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseRomanProgression } from '../../lib/music-theory/parser';
import { NOTE_NAMES_12TET_FLAT } from '../../lib/music-theory/utils';

const pcSet = (pcs: number[]) => [...new Set(pcs)].sort((a, b) => a - b).join(',');

describe('analyzeProgression numerals read back with parseRomanProgression', () => {
  const qualities = ['', 'm', 'dim', 'aug', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'sus4'];
  for (const key of ['C major', 'A minor', 'Eb major', 'F# minor']) {
    it(key, () => {
      const failures: string[] = [];
      for (const root of NOTE_NAMES_12TET_FLAT) {
        for (const q of qualities) {
          const chord = parseChordSymbol(root + q);
          const { roman } = Harmony.analyzeProgression([chord], key).analysis[0];
          let back = '';
          try { back = pcSet(parseRomanProgression(roman, key)[0].getPitchClasses()); } catch { back = 'error'; }
          if (back !== pcSet(chord.getPitchClasses())) failures.push(`${root}${q} → ${roman}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
});

describe('analyzeProgression spelling option', () => {
  const romans = (names: string[], key: string, spelling?: 'key' | 'written') =>
    Harmony.analyzeProgression(names.map(n => parseChordSymbol(n)), key, { spelling }).analysis.map(a => a.roman);

  it('key spelling (default) reads chromatic roots as the key writes them', () => {
    expect(romans(['Gb', 'C#'], 'C major')).toEqual(['#IV', 'bII']);
  });

  it('written spelling keeps the letter of the name', () => {
    expect(romans(['Gb', 'C#', 'D#m', 'A#m', 'Bbdim', 'Ebdim'], 'C major', 'written'))
      .toEqual(['bV', '#I', '#ii', '#vi', 'bvii°', 'biii°']);
    expect(romans(['Ab', 'Eb', 'Ebm', 'Db', 'Gb'], 'A minor', 'written'))
      .toEqual(['bI', 'bV', 'bv', 'bIV', 'bVII']);
  });

  it('written spelling leaves diatonic chords as they are', () => {
    expect(romans(['C', 'Dm7', 'G7', 'F#m7b5'], 'G major', 'written')).toEqual(['IV', 'vm7', 'I7', 'viiø7']);
  });
});
