import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseRomanProgression, parseNote } from '../../lib/music-theory/parser';
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

describe('harmony.ts analysis fixes', () => {
  const chords = (names: string[]) => names.map(n => parseChordSymbol(n));

  it('detectModulations picks the best-correlated key, not the first by pitch class', () => {
    const { modulations } = Harmony.analyzeProgression(chords(['G', 'D', 'G', 'C', 'F', 'C']), 'G major');
    expect(modulations.map(m => m.toKey)).toEqual(['C major']);
  });

  it('detectSequence: rising steps ascend; diatonic circle with a tritone', () => {
    expect(Harmony.detectSequence(chords(['D', 'E', 'F#', 'G#'])).type).toBe('parallel-ascending');
    expect(Harmony.detectSequence(chords(['D', 'C', 'Bb', 'Ab'])).type).toBe('parallel-descending');
    expect(Harmony.detectSequence(chords(['C', 'F', 'Bdim', 'Em', 'Am', 'Dm', 'G', 'C'])).type)
      .toBe('diatonic-circle-of-fifths-descending');
  });

  it('respellChord keeps extensions and slash bass', () => {
    expect(Harmony.respellChord(parseChordSymbol('C#9'), { direction: 'descending' }).name).toBe('Db9');
    expect(Harmony.respellChord(parseChordSymbol('C#/G#'), { direction: 'descending' }).name).toBe('Db/Ab');
    expect(Harmony.respellChord(parseChordSymbol('C9'), { keySymbol: 'C major' }).name).toBe('C9');
    expect(Harmony.respellChord(parseChordSymbol('C#m7'), { keySymbol: 'Db major' }).name).toBe('Dbm7');
  });

  it('respellNote in a key uses the key spelling', () => {
    expect(Harmony.respellNote(parseNote('F#4'), { keySymbol: 'Db major' }).name).toBe('Gb4');
    expect(Harmony.respellNote(parseNote('Gb4'), { keySymbol: 'C major' }).name).toBe('F#4');
  });

  it('voiceLeadingSmoothness counts every voice, not just the root', () => {
    const toRelative = Harmony.voiceLeadingSmoothness(chords(['C', 'Am']));
    const toTritone = Harmony.voiceLeadingSmoothness(chords(['C', 'F#']));
    expect(toRelative).toBeGreaterThan(toTritone);
    expect(Harmony.voiceLeadingSmoothness(chords(['C', 'C']))).toBe(1);
  });

  it('voice overlap is checked between adjacent voices only', () => {
    const a = ['C3', 'E3', 'G3', 'C4'].map(n => parseNote(n));
    const b = ['A3', 'C4', 'E4', 'G4'].map(n => parseNote(n));
    const overlaps = Harmony.checkVoiceLeading(a, b, 'contemporary').filter(i => i.type === 'Voice Overlap');
    expect(overlaps.every(o => o.voices[1] - o.voices[0] === 1)).toBe(true);
    expect(overlaps).toHaveLength(3);
  });
});
