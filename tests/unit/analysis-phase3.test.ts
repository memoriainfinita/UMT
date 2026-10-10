import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseRomanProgression, parseNote } from '../../lib/music-theory/parser';
import { NOTE_NAMES_12TET_FLAT } from '../../lib/music-theory/utils';
import { FiguredBass } from '../../lib/music-theory/figured-bass';
import { Schenker } from '../../lib/music-theory/schenker';
import { Counterpoint, Canon } from '../../lib/music-theory/counterpoint';
import { ToneRow } from '../../lib/music-theory/twelve-tone';
import { MetricModulation, RhythmAnalysis, TimeSignature } from '../../lib/music-theory/rhythm';
import { FormAnalyzer } from '../../lib/music-theory/form';
import { getProgression } from '../../lib/music-theory/progressions';
import { MelodyAnalysis } from '../../lib/music-theory/melody';
import { getUpperStructures } from '../../lib/music-theory/upper-structures';

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

describe('FiguredBass.realize completes abbreviations', () => {
  const iv = (bass: string, fig: string, key = 'C major') => FiguredBass.realize(parseNote(bass), fig, key).intervalsInSteps;
  it.each([
    ['E4', '6', [0, 3, 8]],        // E G C
    ['G4', '7', [0, 4, 7, 10]],    // G B D F
    ['B3', '6/5', [0, 3, 6, 8]],   // B D F G
    ['D4', '4/3', [0, 3, 5, 9]],   // D F G B
    ['F4', '4/2', [0, 2, 6, 9]],   // F G B D
    ['F4', '2', [0, 2, 6, 9]],
    ['G4', '6/4', [0, 5, 9]],      // G C E
  ])('%s %s', (bass, fig, expected) => {
    expect(iv(bass, fig)).toEqual(expected);
  });

  it('a bare accidental alters the third', () => {
    expect(iv('E4', '#', 'A minor')).toEqual([0, 4, 7]); // E G# B
  });

  it('parse still reads the figures as written', () => {
    expect(FiguredBass.parse('6').intervals).toEqual([9]);
    expect(FiguredBass.parse('#').intervals).toEqual([5]);
  });
});

describe('Schenker', () => {
  const notes = (names: string[]) => names.map(n => parseNote(n));

  it('finds an 8-line from C5 down to C4', () => {
    const r = Schenker.findUrlinie(notes(['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4']), 'C major');
    expect(r?.type).toBe('8-line');
    expect(r?.line.map(n => n.name)).toEqual(['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4']);
  });

  it('a 3-line with neighbour notes between', () => {
    const r = Schenker.findUrlinie(notes(['E4', 'F4', 'E4', 'D4', 'G4', 'C4']), 'C major');
    expect(r?.type).toBe('3-line');
    expect(r?.line.map(n => n.name)).toEqual(['E4', 'D4', 'C4']);
  });

  it('prolongation levels differ: foreground keeps C C7, middleground merges them', () => {
    const cs = ['C', 'C', 'C7', 'F', 'G7', 'C'].map(n => parseChordSymbol(n));
    expect(Schenker.prolongationLevel(cs, 'foreground').map(c => c.name)).toEqual(['C', 'C7', 'F', 'G7', 'C']);
    expect(Schenker.prolongationLevel(cs, 'middleground').map(c => c.name)).toEqual(['C', 'F', 'G7', 'C']);
    expect(Schenker.prolongationLevel(cs, 'background').map(c => c.name)).toEqual(['C', 'C', 'C7', 'G7', 'C']);
  });
});

describe('Counterpoint and Canon', () => {
  const n = (names: string[]) => names.map(x => parseNote(x));
  const types = (issues: { type: string }[]) => issues.map(i => i.type);

  it('2nd species: a passing dissonance is fine, a leaped one is not', () => {
    expect(types(Counterpoint.checkSpecies(2, n(['C4', 'A3']), n(['E4', 'D4', 'C4'])))).not.toContain('Dissonance');
    expect(types(Counterpoint.checkSpecies(2, n(['C4', 'A3']), n(['E4', 'B4', 'C4'])))).toContain('Dissonance');
  });

  it('4th species: a prepared suspension resolving down is fine; unprepared is not', () => {
    const cf = n(['C4', 'B3']);
    expect(types(Counterpoint.checkSpecies(4, cf, n(['E4', 'A4', 'A4', 'G4'])))).toEqual([]);
    expect(types(Counterpoint.checkSpecies(4, cf, n(['E4', 'G4', 'A4', 'G4'])))).toContain('Dissonance on Strong Beat');
  });

  it('modal finalis in any transposition', () => {
    const cf = n(['G3', 'A3', 'G3']);
    const ct = n(['D4', 'C4', 'D4']);
    expect(types(Counterpoint.checkSpecies(1, cf, ct, 'G dorian'))).not.toContain('Modal Finalis');
    expect(types(Counterpoint.checkSpecies(1, cf, ct, 'dorian'))).toContain('Modal Finalis');
  });

  it('generateCanon delays the follower with rests', () => {
    const [leader, follower] = Canon.generateCanon(n(['C4', 'D4', 'E4']), 7, 1);
    expect(leader.map(x => x?.name ?? null)).toEqual(['C4', 'D4', 'E4', null]);
    expect(follower.map(x => x?.stepsFromBase ?? null)).toEqual([null, -2, 0, 2]);
  });
});

describe('ToneRow', () => {
  const berg = [7, 10, 2, 6, 9, 0, 4, 8, 11, 1, 3, 5]; // Berg Violin Concerto: G Bb D F# A C E G# B C# D# F

  it('labels forms by their first pitch class; the row is P(row[0])', () => {
    const row = new ToneRow(berg);
    expect(row.P(7)).toEqual(berg);
    expect(row.R()).toEqual([...berg].reverse());
  });

  it('standard matrix: first row the row, first column its inversion, columns are I forms', () => {
    const row = new ToneRow(berg);
    const m = row.getMatrix();
    expect(m[0]).toEqual(berg);
    for (let j = 0; j < 12; j++) expect(m.map(r => r[j])).toEqual(row.I(m[0][j]));
  });

  it('isCombinatorial finds real hexachordal combinatoriality', () => {
    expect(new ToneRow([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).isCombinatorial()).toBe('P'); // P(6) opens with 6..11
    // first hexachord {0,1,2,3,4,6} inverts onto the second: I-combinatorial
    expect(new ToneRow([0, 1, 3, 2, 6, 4, 5, 7, 8, 9, 10, 11]).isCombinatorial()).toBe('I');
    // a Z hexachord (6-Z36) is not its own complement's transform: never combinatorial
    expect(new ToneRow([0, 1, 2, 3, 4, 7, 5, 6, 8, 9, 10, 11]).isCombinatorial()).toBe(null);
  });
});

describe('rhythm.ts fixes', () => {
  it('metric modulation uses the given tempo: dotted quarter = new beat at 120 → 80', () => {
    const four = new TimeSignature([4], 4);
    expect(MetricModulation.equivalence(four, four, 0.375).newTempo).toBeCloseTo(80);
    expect(MetricModulation.equivalence(four, new TimeSignature([6], 8), 0.125, 90).newTempo).toBeCloseTo(180);
  });

  it('strong beats follow the meter', () => {
    expect(RhythmAnalysis.strongBeats(new TimeSignature([4], 4))).toEqual([0, 2]);
    expect(RhythmAnalysis.strongBeats(new TimeSignature([3], 4))).toEqual([0]);
    expect(RhythmAnalysis.strongBeats(new TimeSignature([6], 8))).toEqual([0, 3]);
    expect(RhythmAnalysis.strongBeats(new TimeSignature([3, 2, 2], 8))).toEqual([0, 3, 5]);
    expect(RhythmAnalysis.detectSyncopation([0, 2], new TimeSignature([3], 4))).toBe(0.5);
  });

  it('hemiola: 2+2+2 accents over two bars of 3/4', () => {
    expect(RhythmAnalysis.detectHemiola([0, 2, 4], new TimeSignature([3], 4))).toBe(true);
    expect(RhythmAnalysis.detectHemiola([0, 3], new TimeSignature([3], 4))).toBe(false);
  });
});

describe('FormAnalyzer', () => {
  it('detects the twelve-bar blues from the key', () => {
    const blues = getProgression('blues-12', 'F major');
    expect(FormAnalyzer.analyzeHarmonic(blues, 'F major').type).toBe('blues-12');
    expect(FormAnalyzer.analyzeHarmonic([...blues, ...blues], 'F major').sections).toHaveLength(2);
    expect(FormAnalyzer.analyzeHarmonic(blues, 'C major').type).not.toBe('blues-12');
  });

  it('detectReprise reports maximal passages, not their sub-passages', () => {
    const A = parseRomanProgression('I V IV V', 'C major');
    const B = parseRomanProgression('vi ii V I', 'C major');
    expect(FormAnalyzer.detectReprise([...A, ...B, ...A])).toEqual([{ start: 0, length: 4 }]);
  });
});

describe('MelodyAnalysis.findMotifs', () => {
  const n = (names: string[]) => names.map(x => parseNote(x));

  it('counts non-overlapping occurrences, sorts by frequency, drops sub-motifs', () => {
    // motif C D E repeated three times, transposed
    const m = MelodyAnalysis.findMotifs(n(['C4', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'E5', 'F#5']));
    expect(m[0]).toEqual({ start: 0, length: 3, intervals: [2, 2], occurrences: 3 });
  });

  it('overlapping repetitions are not counted twice', () => {
    const m = MelodyAnalysis.findMotifs(n(['C4', 'D4', 'C4', 'D4', 'C4']), 3);
    const cdc = m.find(x => x.intervals.join() === '2,-2');
    expect(cdc?.occurrences ?? 1).toBe(1);
  });
});

describe('getUpperStructures', () => {
  it('only for dominants', () => {
    expect(getUpperStructures(parseChordSymbol('G7'))).toHaveLength(6);
    expect(getUpperStructures(parseChordSymbol('G13'))).toHaveLength(6);
    expect(getUpperStructures(parseChordSymbol('Cmaj7'))).toEqual([]);
    expect(getUpperStructures(parseChordSymbol('Dm7'))).toEqual([]);
  });
});
