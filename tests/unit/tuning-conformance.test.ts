/**
 * Conformance across tunings: the same material analysed in another tuning gives the
 * 12-TET answer or the function's documented "nothing found" value. It never throws on
 * valid input and never gives a different answer.
 *
 * - 12-note tunings (Werckmeister III, 5-limit just intonation) are 12 chromatic notes in
 *   other sizes: every answer equals the 12-TET one.
 * - In any octave tuning, a step is a named note when it is the tuning's image of a 12-TET
 *   note (the step `getStepFromStandard` gives for it) within a quarter tone; other steps keep
 *   `"Step n"`. 24-EDO holds 12-TET exactly; 19- and 31-EDO are meantone tunings, whose
 *   images of the 12 notes are the notes of a meantone chromatic scale (Barbour, "Tuning and
 *   Temperament", 1951, ch. 3).
 * - The parser refuses a symbol whose notes the tuning does not have within a quarter tone,
 *   instead of turning them into other notes.
 */
import { describe, it, expect } from 'vitest';
import { parseChordSymbol, parseScaleSymbol, parseRomanProgression } from '../../lib/music-theory/parser';
import { Harmony } from '../../lib/music-theory/harmony';
import { KeyDetection } from '../../lib/music-theory/key-detection';
import { NeoRiemannian } from '../../lib/music-theory/neo-riemannian';
import { analyzeVoicing } from '../../lib/music-theory/voicing';
import { findScalesForNotes } from '../../lib/music-theory/scale-finder';
import { getSubstitutions } from '../../lib/music-theory/substitution';
import { getUpperStructures } from '../../lib/music-theory/upper-structures';
import { spellChordInKey } from '../../lib/music-theory/spelling';
import { Note } from '../../lib/music-theory/note';
import { Solfege } from '../../lib/music-theory/solfege';
import { FiguredBass } from '../../lib/music-theory/figured-bass';
import { Tonnetz } from '../../lib/music-theory/tonnetz';
import { SetTheory } from '../../lib/music-theory/set-theory';
import { Counterpoint } from '../../lib/music-theory/counterpoint';
import { getFretboardVoicings, GUITAR_STANDARD } from '../../lib/music-theory/fretboard';
import { TET12 } from '../../lib/music-theory/tuning';
import { TuningSystem } from '../../lib/music-theory/tuning';
import {
  TET19, TET24, TET31, TET53, WerckmeisterIII, FiveLimitJI, PtolemaicJI, BohlenPierce,
} from '../../lib/music-theory/presets';

interface Material {
  key: string;
  progression: string[];
  dominant: string;
  triad: string;
  minorTriad: string;
  slash: string;
  scale: string;
  enharmonic?: string;
  /** A modulation: chords in the key, chords in `toKey`. */
  modulation?: { from: string[]; to: string[]; toKey: string };
  /** I6/4 V7 I. */
  sixFour: string[];
  /** A slash chord over a bass outside it. */
  polychord: string;
  /** A descending-fifths sequence. */
  sequence: string[];
  /** A chord to respell in `respellKey`, and the key. */
  respell?: { chord: string; key: string };
  /** First species: cantus firmus and counterpoint, with parallel fifths. */
  species: { cf: string[]; counter: string[] };
}

// Ptolemy's intense diatonic has seven notes, A B C# D E F# G#: its material is in A major.
const IN_C: Material = {
  key: 'C major', progression: ['Dm7', 'G7', 'Cmaj7'], dominant: 'G7', triad: 'C', minorTriad: 'Am', slash: 'C/E',
  scale: 'D dorian', enharmonic: 'Gb7',
  modulation: { from: ['C', 'F', 'G7', 'C'], to: ['Am', 'D7', 'G'], toKey: 'G major' },
  sixFour: ['C/G', 'G7', 'C'], polychord: 'D/C', sequence: ['Am', 'Dm', 'G', 'C'],
  respell: { chord: 'A#', key: 'F major' },
  species: { cf: ['C4', 'D4', 'E4'], counter: ['G4', 'A4', 'C5'] },
};
const IN_A: Material = {
  key: 'A major', progression: ['Bm7', 'E7', 'Amaj7'], dominant: 'E7', triad: 'A', minorTriad: 'F#m', slash: 'A/C#',
  scale: 'B dorian',
  sixFour: ['A/E', 'E7', 'A'], polychord: 'E/D', sequence: ['F#m', 'Bm', 'E', 'A'],
  species: { cf: ['A4', 'B4', 'C#5'], counter: ['E5', 'F#5', 'A5'] },
};

const NOTHING = 'nothing';
type Result = unknown;

/** Runs the battery; each entry is the answer, or NOTHING when it is the documented "nothing found" value. */
function battery(t: TuningSystem, m: Material): Record<string, Result> {
  const entries = batteryEntries(t, m);
  return Object.fromEntries(Object.entries(entries).map(([k, f]) => {
    try { return [k, f()]; } catch (e) { return [k, `THROWS ${(e as Error).message}`]; }
  }));
}

function batteryEntries(t: TuningSystem, m: Material): Record<string, () => Result> {
  const chord = (s: string) => parseChordSymbol(s, t);
  // a note by name, in this tuning: the root of the power chord on it
  const noteIn = (name: string) => {
    const [, letter, octave] = name.match(/^([A-G][#b]*)(\d)$/)!;
    return parseChordSymbol(letter + '5', t, Number(octave)).getNotes()[0];
  };
  const names = (notes: Note[]) => notes.map(n => /^Step -?\d+$/.test(n.name) ? NOTHING : n.name);
  const analysis = () => Harmony.analyzeProgression(m.progression.map(chord), m.key).analysis;
  return {
    'chord notes': () => names(chord(m.progression[1]).getNotes()),
    'scale notes': () => names(parseScaleSymbol(m.scale, t).getNotes()),
    'roman numerals': () => analysis().map(a => a.roman),
    'functions': () => analysis().map(a => a.function),
    'cadences': () => analysis().map(a => a.cadenceWithNext ?? null),
    'roman to chords': () => parseRomanProgression(analysis().map(a => a.roman).join(' '), m.key, t).map(c => c.name),
    'diatonic sevenths': () => parseScaleSymbol(m.key, t).getDiatonicChords('seventh').map(c => c.name),
    'key detection': () => KeyDetection.detect(parseScaleSymbol(m.key, t).getNotes())[0].key,
    'detectChords': () => { const d = Harmony.detectChords(chord(m.triad).getNotes()); return d[0] === 'Unknown Chord' ? NOTHING : d; },
    'analyzeVoicing': () => { const v = analyzeVoicing(chord(m.slash).getNotes()); return v ? [v.chord, v.inversion] : NOTHING; },
    'findScalesForNotes': () => { const r = findScalesForNotes(parseScaleSymbol(m.scale, t).getNotes(), { limit: 3 }); return r.length ? r.map(s => s.name) : NOTHING; },
    'getSuggestedScales': () => { const r = Harmony.getSuggestedScales(chord(m.dominant)); return r.length ? r.map(s => s.scale) : NOTHING; },
    'negative harmony': () => { const n = Harmony.getNegativeHarmony(chord(m.dominant), m.key).name; return n.startsWith('Negative of') ? NOTHING : n; },
    'tritone substitution': () => chord(m.dominant).getTritoneSubstitution()?.name ?? NOTHING,
    'P L R': () => {
      const r = [NeoRiemannian.P, NeoRiemannian.L, NeoRiemannian.R].flatMap(f => [f.call(NeoRiemannian, chord(m.triad)), f.call(NeoRiemannian, chord(m.minorTriad))]);
      return r.every(c => c === null) ? NOTHING : r.map(c => c?.name ?? NOTHING);
    },
    'substitutions': () => { const r = getSubstitutions(chord(m.dominant), m.key); return r.length ? r.map(s => s.chord.name) : NOTHING; },
    'upper structures': () => { const r = getUpperStructures(chord(m.dominant)); return r.length ? r.map(u => u.triad.name) : NOTHING; },
    'borrowed chords': () => { const r = Harmony.getBorrowedChords(m.key, { tuning: t }); return r.length ? r.map(b => b.chord.name) : NOTHING; },
    'spellChordInKey': () => m.enharmonic ? spellChordInKey(chord(m.enharmonic), m.key).name : NOTHING,
    'classifyModulation': () => m.modulation
      ? Harmony.classifyModulation(m.modulation.from.map(chord), m.modulation.to.map(chord), m.key, m.modulation.toKey)
      : NOTHING,
    'analyzeSixFour': () => { const r = Harmony.analyzeSixFour(m.sixFour.map(chord), m.key, 0); return r.type === 'none' ? NOTHING : [r.type, r.resolution?.name ?? null]; },
    'analyzeSlash': () => { const r = Harmony.analyzeSlash(chord(m.polychord)); return [r.type, r.upperStructure?.name ?? null, r.lowerChord?.name ?? null]; },
    'detectSequence': () => { const r = Harmony.detectSequence(m.sequence.map(chord)); return r.type === 'unknown' ? NOTHING : r.type; },
    'getAllContainingScales': () => { const r = Harmony.getAllContainingScales(chord(m.dominant)); return r.length ? r.map(x => x.scale.name) : NOTHING; },
    'respellChord': () => m.respell ? Harmony.respellChord(chord(m.respell.chord), { keySymbol: m.respell.key }).name : NOTHING,
    'negative progression': () => {
      const r = Harmony.getNegativeProgression(m.progression.map(chord), m.key).map(c => c.name);
      return r.every(n => n.startsWith('Negative of')) ? NOTHING : r.map(n => n.startsWith('Negative of') ? NOTHING : n);
    },
    'Coltrane substitutions': () => { const r = Harmony.getColtraneSubstitutions(chord(m.progression[2]), m.key); return r.length ? r.map(c => c.name) : NOTHING; },
    'analyzeCadence': () => { const r = Harmony.analyzeCadence(chord(m.dominant), chord(m.triad), m.key); return r || NOTHING; },
    'fixed do': () => chord(m.dominant).getNotes().map(n => Solfege.fixedDo(n)),
    'movable do': () => chord(m.dominant).getNotes().map(n => { const r = Solfege.movableDo(n, m.key); return r === '?' ? NOTHING : r; }),
    'movable do (ti)': () => chord(m.dominant).getNotes().map(n => { const r = Solfege.movableDo(n, m.key, { syllables: 'ti' }); return r === '?' ? NOTHING : r; }),
    'figured bass': () => FiguredBass.realize(chord(m.slash).getNotes()[0], '6', m.key).name,
    'figures of a chord': () => FiguredBass.fromChord(chord(m.slash), chord(m.slash).getNotes()[0]),
    'Tonnetz path': () => Tonnetz.pathBetween(chord(m.triad), chord(m.minorTriad)).map(p => [p.x, p.y]),
    'set classes': () => { const pcs = SetTheory.getPitchClassesC0(chord(m.dominant).getNotes()); return [pcs, SetTheory.getForteNumber(pcs)]; },
    'transpose a whole tone': () => chord(m.triad).transpose(t.getStepFromStandard(2) - t.getStepFromStandard(0)).name,
    'counterpoint': () => Counterpoint.checkSpecies(1, m.species.cf.map(n => noteIn(n)), m.species.counter.map(n => noteIn(n))).map(i => i.type),
  };
}

/** Lists from which a tuning leaves out the chords it cannot hold. */
const PARTIAL = new Set(['substitutions', 'upper structures', 'borrowed chords', 'getAllContainingScales', 'Coltrane substitutions']);

/** Same answer, or nothing; arrays of note names compare note by note. */
function conforms(actual: Result, reference: Result, key = ''): boolean {
  if (actual === NOTHING) return true;
  if (PARTIAL.has(key) && Array.isArray(actual) && Array.isArray(reference)) {
    let i = 0;
    for (const r of reference) if (i < actual.length && actual[i] === r) i++;
    return i === actual.length;
  }
  if (Array.isArray(actual) && Array.isArray(reference) && actual.length === reference.length) {
    return actual.every((a, i) => a === NOTHING || JSON.stringify(a) === JSON.stringify(reference[i]));
  }
  return JSON.stringify(actual) === JSON.stringify(reference);
}

const REF_C = battery(TET12, IN_C);
const REF_A = battery(TET12, IN_A);

describe('12-note tunings give the 12-TET answers', () => {
  for (const t of [WerckmeisterIII, FiveLimitJI]) {
    const result = battery(t, IN_C);
    for (const [k, v] of Object.entries(REF_C)) {
      it(`${t.name}: ${k}`, () => expect(result[k]).toEqual(v));
    }
  }
});

describe('other octave tunings give the 12-TET answer or nothing', () => {
  for (const [t, m, ref] of [[TET19, IN_C, REF_C], [TET24, IN_C, REF_C], [TET31, IN_C, REF_C], [TET53, IN_C, REF_C], [PtolemaicJI, IN_A, REF_A]] as const) {
    const result = battery(t, m);
    for (const [k, v] of Object.entries(ref)) {
      it(`${t.name}: ${k}`, () => {
        expect(conforms(result[k], v, k), `${JSON.stringify(result[k])} vs 12-TET ${JSON.stringify(v)}`).toBe(true);
      });
    }
  }

  describe('24-EDO holds 12-TET exactly: every answer equals it', () => {
    const result = battery(TET24, IN_C);
    for (const [k, v] of Object.entries(REF_C)) it(k, () => expect(result[k]).toEqual(v));
  });
});

describe('note names', () => {
  it('a 12-note tuning names its steps like 12-TET', () => {
    for (const t of [WerckmeisterIII, FiveLimitJI]) {
      for (let s = -12; s <= 12; s++) expect(new Note(t, s).name).toBe(new Note(TET12, s).name);
    }
  });

  it('31-EDO names the images of the 12 notes and leaves the other steps as steps', () => {
    expect(new Note(TET31, -23).name).toBe('C4');
    expect(new Note(TET31, 0).name).toBe('A4');
    expect(new Note(TET31, -22).name).toBe('Step -22');
  });

  it('24-EDO names its semitone steps; quarter tones stay steps', () => {
    expect(new Note(TET24, 2).name).toBe('A#4');
    expect(new Note(TET24, 1).name).toBe('Step 1');
  });

  it('a tuning that does not repeat at the octave keeps steps', () => {
    expect(new Note(BohlenPierce, 1).name).toBe('Step 1');
  });
});

describe('the parser refuses notes a tuning does not have', () => {
  it("C is not in Ptolemy's A major diatonic", () => {
    expect(() => parseChordSymbol('C', PtolemaicJI)).toThrow(RangeError);
    expect(() => parseScaleSymbol('C major', PtolemaicJI)).toThrow(RangeError);
  });

  it('the notes it has parse', () => {
    expect(parseChordSymbol('A', PtolemaicJI).getNotes().map(n => n.name)).toEqual(['A4', 'C#5', 'E5']);
  });
});

describe('retune', () => {
  it('a chord keeps its notes across tunings', () => {
    const c31 = parseChordSymbol('Cmaj7/E', TET31);
    const back = c31.retune(TET12)!;
    expect(back.getNotes().map(n => n.name)).toEqual(parseChordSymbol('Cmaj7/E').getNotes().map(n => n.name));
    expect(back.retune(TET31)!.getNotes().map(n => n.stepsFromBase)).toEqual(c31.getNotes().map(n => n.stepsFromBase));
  });

  it('null when a note has no counterpart', () => {
    expect(parseChordSymbol('C').retune(PtolemaicJI)).toBeNull();
    expect(new Note(TET24, 1).retune(TET12)).toBeNull();
    expect(parseScaleSymbol('C major', TET31).retune(TET12)!.getNotes().map(n => n.name))
      .toEqual(parseScaleSymbol('C major').getNotes().map(n => n.name));
  });

  it('a chord of another tuning goes on a 12-TET guitar through 12-TET', () => {
    const c31 = parseChordSymbol('C', TET31);
    expect(getFretboardVoicings(c31.retune(TET12)!, GUITAR_STANDARD)).toEqual(getFretboardVoicings(parseChordSymbol('C'), GUITAR_STANDARD));
  });
});
