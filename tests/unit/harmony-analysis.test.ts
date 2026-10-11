/**
 * Tests for lib/music-theory/harmony.ts (analysis).
 */
import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseRomanProgression, parseNote } from '../../lib/music-theory/parser';
import { NOTE_NAMES_12TET_FLAT, parseNoteToStep12TET } from '../../lib/music-theory/utils';
import { Chord } from '../../lib/music-theory/chord';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';

const pcSet = (pcs: number[]) => [...new Set(pcs)].sort((a, b) => a - b).join(',');
function step(name: string, octave = 4): Note {
  return new Note(TET12, parseNoteToStep12TET(name, octave));
}
function chord(symbol: string): Chord {
  return parseChordSymbol(symbol);
}
function prog(roman: string, key: string): Chord[] {
  return parseRomanProgression(roman, key);
}
const notes = (...names: string[]) => names.map(n => parseNote(n));

describe('analyzeProgression: added notes and suspensions', () => {
  it('a chord with a third is not sus: added ninths, elevenths and sixths reduce to the triad', () => {
    const syms = ['Cadd9', 'C6/9', 'Cadd11', 'Cmadd9', 'Fm6', 'G9', 'G7sus4', 'Gsus4', 'Dsus2'];
    const romans = Harmony.analyzeProgression(syms.map(chord), 'C major').analysis.map(a => a.roman);
    expect(romans).toEqual(['I', 'I', 'I', 'im', 'ivm', 'V7', 'V7sus4', 'Vsus4', 'IIsus2']);
  });
});

describe('analyzeProgression numerals read back with parseRomanProgression', () => {
  const qualities = ['', 'm', 'dim', 'aug', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'sus2', 'sus4', '7sus4'];
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
  // one chord at a time: no progression context (modulations)
  const romans = (names: string[], key: string, spelling?: 'key' | 'written') =>
    names.map(n => Harmony.analyzeProgression([parseChordSymbol(n)], key, { spelling }).analysis[0].roman);

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
    const { modulations } = Harmony.analyzeProgression(chords(['G', 'D', 'G', 'C', 'F', 'C', 'F', 'G7', 'C']), 'G major');
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

describe('analyzeProgression after MODUS notes (modulation, local key, harmonic rhythm, Phrygian)', () => {
  const run = (names: string, key: string, options = {}) =>
    Harmony.analyzeProgression(names.split(' ').map(n => parseChordSymbol(n)), key, options);
  const mods = (r: ReturnType<typeof run>) => r.modulations.map(m => [m.atIndex, m.toKey, m.type]);

  it('modulates to the key confirmed by a cadence, at the first foreign chord', () => {
    expect(mods(run('C F G C Am D7 G Em Am D7 G', 'C major'))).toEqual([[5, 'G major', 'pivot']]);
    expect(mods(run('C F G7 C Eb Ab Bb7 Eb', 'C major'))).toEqual([[4, 'Eb major', 'direct']]);
    expect(mods(run('C F G C Am Dm E7 Am Dm E7 Am', 'C major'))).toEqual([[6, 'A minor', 'pivot']]);
  });

  it('a tonicization of fewer than three chords is not a modulation', () => {
    expect(mods(run('C Am Dm G7 C E7 Am D7 G', 'C major'))).toEqual([]);
  });

  it('numerals and cadences after a modulation are in the new key', () => {
    const r = run('C F G C Am D7 G Em', 'C major');
    expect(r.analysis.map(a => a.key)).toEqual(['C major', 'C major', 'C major', 'C major', 'C major', 'G major', 'G major', 'G major']);
    expect(r.analysis[5].roman).toBe('V7');
    expect(r.analysis[5].cadenceWithNext).toBe('Authentic Cadence (V -> I)');
  });

  it('harmonic rhythm per bar with durations', () => {
    const r = run('C F G7 C', 'C major', { durations: [4, 2, 2, 4] });
    expect(r.harmonicRhythmUnit).toBe('per-bar');
    expect(r.harmonicRhythm).toBe(1); // 3 changes in 3 bars
    expect(run('C F', 'C major').harmonicRhythmUnit).toBe('per-chord');
    expect(() => run('C F', 'C major', { durations: [4] })).toThrow(RangeError);
  });

  it('Phrygian half cadence needs the bass falling from the 6th to the 5th', () => {
    expect(run('Dm E7', 'A minor').analysis[0].cadenceWithNext).toBe('Half Cadence (-> V)');
    expect(run('Dm/F E7', 'A minor').analysis[0].cadenceWithNext).toBe('Phrygian Half Cadence (iv -> V)');
  });
});

describe('Harmony.analyzeProgression - basic', () => {
  it('C major I-IV-V-I: all diatonic, correct roman numerals', () => {
    const chords = prog('I IV V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    const romans = analysis.map(a => a.roman);
    expect(romans).toEqual(['I', 'IV', 'V', 'I']);
  });

  it('C major: functions T-S-D-T', () => {
    const chords = prog('I IV V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis.map(a => a.function)).toEqual(['T', 'S', 'D', 'T']);
  });

  it('C major ii-V-I seventh: correct roman numerals', () => {
    const chords = prog('ii7 V7 Imaj7', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    // ii7 in major = m7 quality → roman suffix '7' with lowercase = 'ii7'
    expect(analysis[0].roman).toBe('ii7');
    expect(analysis[0].degree).toBe(2);
    expect(analysis[1].degree).toBe(5);
    expect(analysis[2].degree).toBe(1);
  });

  it('all diatonic chords have isDiatonic=true', () => {
    const chords = prog('I ii iii IV V vi', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis.every(a => a.isDiatonic)).toBe(true);
  });

  it('Cm7 in C major flagged as borrowed from minor', () => {
    const chords = [chord('Cm7'), chord('C')];
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isBorrowed).toBe(true);
  });

  it('Eb in C major flagged as non-diatonic', () => {
    const chords = [chord('Eb'), chord('C')];
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isDiatonic).toBe(false);
  });

  it('cadenceWithNext populated for V→I pair', () => {
    const chords = prog('V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].cadenceWithNext).toContain('Authentic');
  });

  it('cadenceWithNext populated for IV→I pair', () => {
    const chords = prog('IV I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].cadenceWithNext).toContain('Plagal');
  });

  it('last chord has no cadenceWithNext', () => {
    const chords = prog('I IV V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[3].cadenceWithNext).toBeUndefined();
  });

  it('tritone sub detection: bII7→I gets substitutionCandidate', () => {
    const chords = prog('subV7 I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].substitutionCandidate).toBe('tritone sub of V');
  });

  it('isSecondary: V7/IV correctly detected', () => {
    const chords = prog('V7/IV IV', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isSecondary).toBe(true);
    expect(analysis[0].secondaryTarget).toBe('V7/IV');
  });

  it('secondaryTarget is lower case when the tonicized triad is minor', () => {
    const { analysis } = Harmony.analyzeProgression(prog('V7/ii ii V7/vi vi V7/iii iii', 'C major'), 'C major');
    expect(analysis[0].secondaryTarget).toBe('V7/ii');
    expect(analysis[2].secondaryTarget).toBe('V7/vi');
    expect(analysis[4].secondaryTarget).toBe('V7/iii');
  });

  it('secondaryTarget casing follows the minor key scale', () => {
    // A minor: V7/III (G7 → C) is major, V7/iv (A7 → Dm) is minor
    const { analysis } = Harmony.analyzeProgression([parseChordSymbol('G7'), parseChordSymbol('A7')], 'A minor');
    expect(analysis[0].secondaryTarget).toBe('V7/III');
    expect(analysis[1].secondaryTarget).toBe('V7/iv');
  });

  it('isSecondary false for plain diatonic V7', () => {
    const chords = prog('V7 I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isSecondary).toBe(false);
  });

  it('harmonicRhythm = 1 when all chords different', () => {
    const chords = prog('I IV V', 'C major');
    const { harmonicRhythm } = Harmony.analyzeProgression(chords, 'C major');
    expect(harmonicRhythm).toBe(1);
  });

  it('harmonicRhythm = 0 when all chords identical', () => {
    const c = chord('C');
    const { harmonicRhythm } = Harmony.analyzeProgression([c, c, c], 'C major');
    expect(harmonicRhythm).toBe(0);
  });
});

describe('Harmony.analyzeProgression - chromatic roots in minor', () => {
  const roman = (symbol: string, key: string) => Harmony.analyzeProgression([chord(symbol)], key).analysis[0];

  it('the leading-tone chord is vii°7, diatonic (harmonic minor), dominant, not bI', () => {
    const a = roman('G#dim7', 'A minor');
    expect(a.roman).toBe('vii°7');
    expect(a.degree).toBe(7);
    expect(a.function).toBe('D');
    expect(a.isDiatonic).toBe(true);
    expect(a.isBorrowed).toBe(false);
    expect(roman('Abdim7', 'A minor').roman).toBe('vii°7');   // same pitch, flat spelling
  });

  it('V and V7 with the raised leading tone are diatonic in minor', () => {
    for (const s of ['E', 'E7']) {
      const a = roman(s, 'A minor');
      expect(a.isDiatonic).toBe(true);
      expect(a.isBorrowed).toBe(false);
      expect(a.function).toBe('D');
    }
  });

  it('chords from melodic minor stay borrowed: IV major in minor', () => {
    const a = roman('D', 'A minor');
    expect(a.isDiatonic).toBe(false);
    expect(a.isBorrowed).toBe(true);
  });

  it('raised third and sixth read as #III and #vi', () => {
    expect(roman('F#dim', 'A minor').roman).toBe('#vi°');
    expect(roman('C#', 'A minor').roman).toBe('#III');
  });

  it('lowered degrees stay flat: Neapolitan in minor, borrowed chords in major', () => {
    expect(roman('Bb', 'A minor').roman).toBe('bII');
    expect(roman('Db', 'C major').roman).toBe('bII');
    expect(roman('Ab', 'C major').roman).toBe('bVI');
    expect(roman('Bb', 'C major').roman).toBe('bVII');
  });
});

describe('Harmony.analyzeProgression - functions', () => {
  const a = (symbol: string, key: string) => Harmony.analyzeProgression([chord(symbol)], key).analysis[0];

  it('secondary dominants are dominant whatever degree they sit on', () => {
    for (const s of ['D7', 'A7', 'E7', 'B7', 'C7']) {
      expect(a(s, 'C major').isSecondary).toBe(true);
      expect(a(s, 'C major').function).toBe('D');
    }
  });

  it('VII in minor is dominant; bVII in major is subdominant', () => {
    expect(a('G', 'A minor').function).toBe('D');
    expect(a('Bb', 'C major').function).toBe('S');
    expect(a('Bb7', 'C major').function).toBe('S');
  });

  it('secondary leading-tone chords: vii°7/V, vii°/ii, viiø7/V', () => {
    expect(a('F#dim7', 'C major')).toMatchObject({ isSecondary: true, secondaryTarget: 'vii°7/V', function: 'D' });
    expect(a('C#dim', 'C major')).toMatchObject({ isSecondary: true, secondaryTarget: 'vii°/ii', function: 'D' });
    expect(a('F#m7b5', 'C major')).toMatchObject({ isSecondary: true, secondaryTarget: 'viiø7/V' });
    expect(a('F#dim', 'A minor')).toMatchObject({ isSecondary: true, secondaryTarget: 'vii°/VII', function: 'D' });
  });

  it('diatonic diminished chords keep their own reading', () => {
    expect(a('Bdim', 'C major')).toMatchObject({ isSecondary: false, roman: 'vii°', function: 'D' });
    expect(a('Bdim', 'A minor')).toMatchObject({ isSecondary: false, roman: 'ii°', function: 'S' });
    expect(a('Bm7b5', 'A minor').isSecondary).toBe(false);
  });

  it('the tritone sub of V is dominant', () => {
    expect(a('Db7', 'C major')).toMatchObject({ function: 'D', substitutionCandidate: 'tritone sub of V' });
  });

  it('a secondary chord is not also reported as borrowed', () => {
    expect(a('D7', 'C major')).toMatchObject({ isSecondary: true, isBorrowed: false });
    expect(a('C7', 'C major')).toMatchObject({ isSecondary: true, isBorrowed: false });
    expect(a('Bb7', 'C major')).toMatchObject({ isSecondary: false, isBorrowed: true });
  });

  it('a diminished triad is not tonicized: A#dim in C is not vii°/vii', () => {
    expect(a('A#dim', 'C major').isSecondary).toBe(false);
  });
});

describe('Harmony.analyzeProgression - modulations', () => {
  it('no modulations for simple diatonic I-IV-V-I', () => {
    const chords = prog('I IV V I', 'C major');
    const { modulations } = Harmony.analyzeProgression(chords, 'C major');
    expect(modulations).toHaveLength(0);
  });

  it('detects modulation to G major in long progression', () => {
    // C major then 3 chords diatonic to G major but not C major: B, D, G
    const cChords = prog('I IV', 'C major');
    const gChords = prog('vii I V', 'G major'); // B, G, D - all diatonic to G
    const all = [...cChords, ...gChords];
    const { modulations } = Harmony.analyzeProgression(all, 'C major');
    expect(modulations.length).toBeGreaterThan(0);
  });
});

describe('Harmony.analyzeCadence - existing cadences', () => {
  it('V→I = Authentic', () => {
    const [v, i] = prog('V I', 'C major');
    expect(Harmony.analyzeCadence(v, i, 'C major')).toContain('Authentic');
  });

  it('IV→I = Plagal', () => {
    const [iv, i] = prog('IV I', 'C major');
    expect(Harmony.analyzeCadence(iv, i, 'C major')).toContain('Plagal');
  });

  it('V→vi = Deceptive', () => {
    const [v, vi] = prog('V vi', 'C major');
    expect(Harmony.analyzeCadence(v, vi, 'C major')).toContain('Deceptive');
  });

  it('→V = Half Cadence', () => {
    const [i, v] = prog('I V', 'C major');
    expect(Harmony.analyzeCadence(i, v, 'C major')).toContain('Half');
  });
});

describe('Harmony.analyzeCadence - new cadences', () => {
  it('iv→i = Minor Plagal Cadence', () => {
    const iv = chord('Fm');
    const i = chord('Cm');
    expect(Harmony.analyzeCadence(iv, i, 'C minor')).toContain('Minor Plagal');
  });

  it('bII→I = Phrygian Cadence', () => {
    // Db → C
    const bII = chord('Db');
    const I = chord('C');
    expect(Harmony.analyzeCadence(bII, I, 'C major')).toContain('Phrygian');
  });

  it('Picardy third: Cm→C detected', () => {
    const cm = chord('Cm');
    const C = chord('C');
    expect(Harmony.analyzeCadence(cm, C, 'C minor')).toContain('Picardy');
  });

  it('iv6→V in minor = Phrygian Half Cadence (bass Ab → G); iv in root position is a half cadence', () => {
    const V = chord('G');
    expect(Harmony.analyzeCadence(chord('Fm/Ab'), V, 'C minor')).toContain('Phrygian Half');
    expect(Harmony.analyzeCadence(chord('Fm'), V, 'C minor')).toBe('Half Cadence (-> V)');
  });

  it('subV7→I = Tritone Sub Resolution', () => {
    const sub = chord('Db7');
    const I = chord('C');
    expect(Harmony.analyzeCadence(sub, I, 'C major')).toContain('Tritone Sub');
  });

  it('backdoor bVII7→I still works', () => {
    const bvii7 = chord('Bb7');
    const I = chord('C');
    expect(Harmony.analyzeCadence(bvii7, I, 'C major')).toContain('Backdoor');
  });
});

describe('Harmony.analyzeProgression - numeral from the written letter', () => {
  const roman = (sym: string, key: string) => Harmony.analyzeProgression([parseChordSymbol(sym)], key).analysis[0];
  it('F#dim7 in C is #iv°7 (F#, as spelled in the key), not bv°7', () => {
    expect(roman('F#dim7', 'C major').roman).toBe('#iv°7');
  });
  it('Gbdim7 in C is respelled F# and reads the same', () => {
    expect(roman('Gbdim7', 'C major').roman).toBe('#iv°7');
  });
  it('D# major in E major is VII (D# is the seventh of the key)', () => {
    expect(roman('D#', 'E major').roman).toBe('VII');
  });
  it('lowered roots in E major: F is bII, C is bVI', () => {
    expect(roman('F', 'E major').roman).toBe('bII');
    expect(roman('C', 'E major').roman).toBe('bVI');
  });
});

describe('Harmony.detectSequence', () => {
  it('detects circle-of-fifths descending (descending fifths: C F Bb Eb Ab Db)', () => {
    // Each root a perfect fourth higher (= descending fifth)
    const chords = [chord('C'), chord('F'), chord('Bb'), chord('Eb'), chord('Ab'), chord('Db')];
    const result = Harmony.detectSequence(chords);
    expect(result).toBeDefined();
    expect(result.type).toBe('circle-of-fifths-descending');
  });

  it('detects pachelbel sequence', () => {
    const chords = prog('I V vi iii IV I IV V', 'C major');
    const result = Harmony.detectSequence(chords);
    expect(result).toBeDefined();
    expect(result.type).toBe('pachelbel');
  });

  it('returns unknown for random progression', () => {
    const chords = [chord('C'), chord('Eb'), chord('Ab'), chord('Db')];
    const result = Harmony.detectSequence(chords);
    expect(result.type).toBe('unknown');
  });

  it('returns confidence between 0 and 1', () => {
    const chords = prog('I IV viio III vi ii V I', 'C major');
    const result = Harmony.detectSequence(chords);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('detects descending parallel motion (consistent whole-step descent)', () => {
    // G→F→Eb→Db: each root descends by 2 semitones (whole step)
    const chords = [chord('G'), chord('F'), chord('Eb'), chord('Db')];
    const result = Harmony.detectSequence(chords);
    expect(result.type).toBe('parallel-descending');
  });
});

describe('Harmony.analyzeCadence', () => {
  it('V → VI in a minor key is deceptive', () => {
    const cad = Harmony.analyzeCadence(parseChordSymbol('E'), parseChordSymbol('F'), 'A minor');
    expect(cad).toContain('Deceptive');
  });

  it('V → vi in a major key stays deceptive', () => {
    const cad = Harmony.analyzeCadence(parseChordSymbol('G'), parseChordSymbol('Am'), 'C major');
    expect(cad).toContain('Deceptive');
  });
});
