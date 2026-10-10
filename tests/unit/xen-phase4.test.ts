import { describe, it, expect } from 'vitest';
import { Tonnetz } from '../../lib/music-theory/tonnetz';
import { parseNote, parseChordSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { EDO, JustIntonation, CentTuning } from '../../lib/music-theory/tuning';
import { TemperamentAnalysis } from '../../lib/music-theory/temperament-analysis';
import { MOS, CommaPump } from '../../lib/music-theory/mos';
import { FiveLimitJI, PtolemaicJI, BohlenPierce } from '../../lib/music-theory/presets';
import { Chord } from '../../lib/music-theory/chord';
import { Xen } from '../../lib/music-theory/xen';
import { parseScala } from '../../lib/music-theory/scala';
import { Spectral } from '../../lib/music-theory/spectral';
import { Harmony } from '../../lib/music-theory/harmony';
import { FiguredBass } from '../../lib/music-theory/figured-bass';
import { Counterpoint } from '../../lib/music-theory/counterpoint';

describe('Tonnetz', () => {
  it('every pitch class once in x 0..3, y 0..2, with pc = 7x + 4y', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 12; s++) {
      const { x, y } = Tonnetz.getPosition(new Note(new EDO(12), s));
      expect(((7 * x + 4 * y) % 12)).toBe(s);
      seen.add(`${x},${y}`);
    }
    expect(seen.size).toBe(12);
    const c = Tonnetz.getPosition(parseNote('C4'));
    expect([c.x, c.y]).toEqual([1, 2]);
  });

  it('neighbors sit next to the note', () => {
    const a = Tonnetz.getPosition(parseNote('A4'));
    const ns = Tonnetz.neighbors(parseNote('A4'));
    expect(ns.map(n => Math.abs(n.x - a.x) + Math.abs(n.y - a.y))).toEqual([1, 1, 1, 1, 2, 2]);
    expect(ns.map(n => n.note.stepsFromBase)).toEqual([7, -7, 4, -4, 3, -3]);
  });

  it('pathBetween C and Am: common tones are one position, G moves one step to a tone of Am', () => {
    const path = Tonnetz.pathBetween(parseChordSymbol('C'), parseChordSymbol('Am'));
    expect(path.map(p => p.note.stepsFromBase)).toEqual([-9, -5, -2, -9]); // C4, E4, G4 → C4 (down a fifth)
    expect(Math.abs(path[3].x - path[2].x) + Math.abs(path[3].y - path[2].y)).toBe(1);
  });

  it('other tunings use the nearest 12-TET pitch class', () => {
    const e24 = new Note(new EDO(24), 14); // 700 cents above A = E
    expect([Tonnetz.getPosition(e24).x, Tonnetz.getPosition(e24).y]).toEqual([1, 0]);
  });
});

describe('MOS and comma pump', () => {
  it('isMOS by Myhill: two sizes for every generic interval', () => {
    expect(MOS.isMOS([0, 2, 4, 5, 7, 9, 11])).toBe(true);   // diatonic
    expect(MOS.isMOS([0, 2, 4, 7, 9])).toBe(true);          // pentatonic
    expect(MOS.isMOS([0, 2, 4, 5, 6, 8, 10])).toBe(false);  // LLssLLL: two steps, not a MOS
    expect(MOS.isMOS([0, 3, 6, 8, 11, 14, 16], 19)).toBe(true); // 19-EDO diatonic (5L2s)
  });

  it('comma pump C Am Dm G C drifts by the syntonic comma; C F G C does not', () => {
    const ch = (root: number) => new Chord('x', FiveLimitJI, root, [0, 4, 7]);
    expect(CommaPump.detect([ch(3), ch(0), ch(5), ch(10), ch(15)], FiveLimitJI)).toMatchObject({ commaType: 'syntonic' });
    expect(CommaPump.detect([ch(3), ch(8), ch(10), ch(15)], FiveLimitJI).drift).toBeCloseTo(0, 6);
  });
});

describe('Xen otonal / utonal', () => {
  it('major triad is otonal 4:5:6; minor triad is utonal 1/6:1/5:1/4', () => {
    expect(Xen.detectOtonal(parseChordSymbol('C'))).toEqual({ isOtonal: true, harmonics: [4, 5, 6] });
    expect(Xen.detectOtonal(parseChordSymbol('Cm')).isOtonal).toBe(false);
    expect(Xen.detectUtonal(parseChordSymbol('Cm'))).toEqual({ isUtonal: true, subharmonics: [4, 5, 6] });
  });

  it('harmonic seventh 4:5:6:7 in JI; 12-TET\'s minor seventh only with a wide tolerance', () => {
    const ji = new Chord('C7h', new JustIntonation('h', [[5, 4], [3, 2], [7, 4]]), 0, [0, 1, 2, 3]);
    expect(Xen.detectOtonal(ji).harmonics).toEqual([4, 5, 6, 7]);
    expect(Xen.detectOtonal(parseChordSymbol('C7')).isOtonal).toBe(false);
    expect(Xen.detectOtonal(parseChordSymbol('C7'), 7, 35).harmonics).toEqual([4, 5, 6, 7]);
  });
});

describe('TemperamentAnalysis', () => {
  const pythagorean = new CentTuning('Pythagorean', [0, 90.225, 203.91, 294.135, 407.82, 498.045, 611.73, 701.955, 792.18, 905.865, 996.09, 1109.775]);

  it('equal temperaments have no wolves; Pythagorean has its wolf fifth', () => {
    expect(TemperamentAnalysis.detectWolfIntervals(new EDO(19))).toEqual([]);
    expect(TemperamentAnalysis.detectWolfIntervals(new EDO(12))).toEqual([]);
    const wolfFifths = TemperamentAnalysis.detectWolfIntervals(pythagorean).filter(w => w.interval === 7);
    expect(wolfFifths).toHaveLength(1);
    // the table runs Ab…F#: the wolf is F# (step 6) → Db, 678.5¢, a Pythagorean comma short
    expect(wolfFifths[0].from).toBe(6);
    expect(wolfFifths[0].errorCents).toBeCloseTo(23.46, 1);
  });

  it('compare finds the closest step in JI and non-12 tunings', () => {
    const t = TemperamentAnalysis.compare([new EDO(19), FiveLimitJI], [[3, 2], [5, 4]]);
    expect(t.entries[0][0].tuningCents).toBeCloseTo(1200 * 11 / 19, 6);
    expect(t.entries[1][0].errorCents).toBeCloseTo(0, 6);
    expect(t.entries[1][1].errorCents).toBeCloseTo(0, 6);
  });

  it('unison vectors: commas by which two sizes of one interval differ', () => {
    // 5-limit JI: fifths 3/2 and 40/27 (D–A), whole tones 9/8 and 10/9 → 81/80
    const vs = TemperamentAnalysis.getUnisonVectors(FiveLimitJI).map(r => r.join('/'));
    expect(vs).toContain('81/80');
    expect(TemperamentAnalysis.getUnisonVectors(PtolemaicJI).map(r => r.join('/'))).toContain('81/80');
  });
});

describe('parseScala', () => {
  it('an empty description line is the description', () => {
    const t = parseScala('! empty description\n\n2\n3/2\n2/1\n');
    expect(t.name).toBe('');
    expect(t.octaveSteps).toBe(2);
    expect(t.getInterval(1).cents).toBeCloseTo(701.955, 2);
  });

  it('fewer pitches than declared throws', () => {
    expect(() => parseScala('short\n3\n3/2\n2/1\n')).toThrow(/3 notes declared, 2 found/);
  });
});

describe('Spectral.sensoryConsonance with partials', () => {
  const dyad = (semis: number) => new Chord('d', new EDO(12), -9, [0, semis]);
  it('orders intervals as the ear does: octave, fifth, major third above tritone and minor second', () => {
    const c = (s: number) => Spectral.sensoryConsonance(dyad(s));
    expect(c(12)).toBeGreaterThan(c(7));
    expect(c(7)).toBeGreaterThan(c(6));
    expect(c(4)).toBeGreaterThan(c(6));
    expect(c(6)).toBeGreaterThan(c(1));
  });
});

describe('getStepFromStandard: nearest step in cents for every tuning', () => {
  it('Bohlen-Pierce maps a fifth to step 5 (731.6¢), not 8', () => {
    expect(BohlenPierce.getStepFromStandard(7)).toBe(5);
    expect(BohlenPierce.getStepFromStandard(19)).toBe(13); // tritave 3:1 ≈ 1902¢ ≈ 19 semitones
  });

  it('an unequal cent table and a Scala tuning pick the nearest pitch', () => {
    const seven = new CentTuning('7 unequal', [0, 200, 350, 500, 700, 900, 1050]);
    expect(seven.getStepFromStandard(4)).toBe(2);  // 400¢ → 350¢
    expect(seven.getStepFromStandard(3)).toBe(2);  // 300¢ → 350¢
    expect(seven.getStepFromStandard(-1)).toBe(-1); // −100¢ → 1050 − 1200 = −150¢
    const scl = parseScala('pent\n5\n200.0\n400.0\n700.0\n900.0\n2/1\n');
    expect(scl.getStepFromStandard(7)).toBe(3);
    expect(scl.getStepFromStandard(12)).toBe(5);
  });

  it('12-step tunings stay one to one', () => {
    expect(FiveLimitJI.getStepFromStandard(6)).toBe(6);
    expect(new EDO(24).getStepFromStandard(7)).toBe(14);
  });
});

describe('getSuggestedScales root in other tunings', () => {
  it('a G7 in 24-EDO suggests scales on G', () => {
    const g7 = parseChordSymbol('G7', new EDO(24));
    const scales = Harmony.getSuggestedScales(g7).map(s => s.scale);
    expect(scales.length).toBeGreaterThan(0);
    expect(scales.every(s => s.startsWith('G '))).toBe(true);
  });
});

describe('12-TET assumptions removed from figured bass and counterpoint', () => {
  const e24 = new EDO(24);
  it('FiguredBass.realize and voices in 24-EDO give the same notes as in 12-TET', () => {
    const c12 = FiguredBass.realize(parseNote('E4'), '6', 'C major');
    const c24 = FiguredBass.realize(new Note(e24, -10), '6', 'C major'); // E4 = -5 semitones = -10 quarter tones
    expect(c24.intervalsInSteps).toEqual(c12.intervalsInSteps.map(i => i * 2));
    const v = FiguredBass.voices(new Note(e24, -34), '', 'C major'); // C3
    expect(v.map(n => Math.abs(n.stepsFromBase % 2))).toEqual([0, 0, 0, 0]); // whole semitones
  });

  it('checkSpecies reads intervals in semitones in 24-EDO', () => {
    const q = (semis: number[]) => semis.map(s => new Note(e24, s * 2));
    const issues = Counterpoint.checkSpecies(1, q([-9, -7, -9]), q([-5, -4, -2])); // C D C against E F G
    expect(issues.filter(i => i.type.includes('Dissonance'))).toEqual([]);
  });
});
