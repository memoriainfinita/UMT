import { describe, it, expect } from 'vitest';
import { CircleOfFifths } from '../../lib/music-theory/circle';
import { WerckmeisterIII, HarmonicSeries, Harmonics1to16, Harmonics8to16 } from '../../lib/music-theory/presets';
import { SetTheory } from '../../lib/music-theory/set-theory';
import { CLAVE_PATTERNS } from '../../lib/music-theory/clave-patterns';
import { RhythmAnalysis } from '../../lib/music-theory/rhythm';
import { MAQAMAT } from '../../lib/music-theory/maqamat';
import { RAGAS, SVARA_NAMES } from '../../lib/music-theory/ragas';
import { PROGRESSIONS, getProgression } from '../../lib/music-theory/progressions';
import { parseRomanProgression } from '../../lib/music-theory/parser';
import { TemperamentAnalysis } from '../../lib/music-theory/temperament-analysis';

describe('CircleOfFifths.getSignature: enharmonic keys as written', () => {
  it.each([
    ['C', 0, 0], ['G', 1, 0], ['F', 0, 1], ['F#', 6, 0], ['Gb', 0, 6], ['C#', 7, 0], ['Cb', 0, 7],
    ['Db', 0, 5], ['a', 0, 0], ['eb', 0, 6], ['d#', 6, 0], ['bb', 0, 5], ['a#', 7, 0], ['G#', 8, 0],
  ])('%s → %i sharps, %i flats', (key, sharps, flats) => {
    expect(CircleOfFifths.getSignature(key)).toEqual({ sharps, flats });
  });

  it('unknown keys have no accidentals', () => {
    expect(CircleOfFifths.getSignature('H')).toEqual({ sharps: 0, flats: 0 });
  });
});

describe('Werckmeister III', () => {
  it('keeps A4 at 440 Hz and C a Werckmeister minor third above A', () => {
    expect(WerckmeisterIII.getFrequency(0)).toBeCloseTo(440, 6);
    // The table is measured from C, where A is 888.27¢: A → C = 1200 − 888.27
    expect(WerckmeisterIII.getInterval(3).cents).toBeCloseTo(311.73, 2);
    expect(WerckmeisterIII.getInterval(12).cents).toBeCloseTo(1200, 6);
  });

  it('tempers the fifths C → G and G → D by a quarter comma', () => {
    const c = WerckmeisterIII.getInterval(3).cents;
    const g = WerckmeisterIII.getInterval(10).cents;
    const d = WerckmeisterIII.getInterval(5).cents + 1200;
    expect(g - c).toBeCloseTo(696.09, 2);
    expect(d - g).toBeCloseTo(696.09, 2);
  });
});

describe('HarmonicSeries', () => {
  it('partials 1–16 sound at n × the fundamental', () => {
    const freqs = Harmonics1to16.getNotes().map(n => n.frequency);
    expect(freqs).toHaveLength(16);
    freqs.forEach((f, i) => expect(f).toBeCloseTo(440 * (i + 1), 6));
  });

  it('partials 8–16 fill one octave without a duplicated 2/1 class', () => {
    const notes = Harmonics8to16.getNotes();
    expect(notes).toHaveLength(9);
    notes.forEach((n, i) => expect(n.frequency).toBeCloseTo(440 * (8 + i) / 8, 6));
    expect(Harmonics8to16.tuningSystem.octaveSteps).toBe(8);
    // The next octave repeats the same classes: 2 × 9/8 × 440 = 990 Hz.
    expect(Harmonics8to16.getNotes(2)[9].frequency).toBeCloseTo(990, 6);
  });

  it('rejects an empty or invalid range', () => {
    expect(() => HarmonicSeries(440, 8, 8)).toThrow(RangeError);
    expect(() => HarmonicSeries(440, 0, 8)).toThrow(RangeError);
  });
});

describe('Forte table', () => {
  const allSets = Array.from({ length: 4096 }, (_, mask) =>
    Array.from({ length: 12 }, (_, pc) => pc).filter(pc => mask & (1 << pc)));
  const names = new Map<string, number[]>();
  for (const set of allSets.slice(1)) {
    const name = SetTheory.getForteNumber(set);
    if (!names.has(name)) names.set(name, SetTheory.primeForm(set));
  }

  it('names every non-empty set, 223 classes with the right count per cardinality', () => {
    expect(names.has('unknown')).toBe(false);
    expect(names.size).toBe(223);
    const perCard = [...names.keys()].reduce<Record<string, number>>((acc, n) => {
      const c = n.split('-')[0]; acc[c] = (acc[c] ?? 0) + 1; return acc;
    }, {});
    expect(perCard).toEqual({ 1: 1, 2: 6, 3: 12, 4: 29, 5: 38, 6: 50, 7: 38, 8: 29, 9: 12, 10: 6, 11: 1, 12: 1 });
  });

  it('labels complements n-k and (12-n)-k; Z hexachords pair with their Z partner', () => {
    for (const [name, prime] of names) {
      if (name === '12-1') continue; // complement is the empty set
      const card = Number(name.split('-')[0]);
      const comp = SetTheory.getForteNumber(SetTheory.getComplement(prime));
      if (card === 6 && name.includes('Z')) {
        // A Z hexachord's complement is its Z partner: another hexachord, same interval vector.
        expect(comp).not.toBe(name);
        expect(comp.startsWith('6-Z')).toBe(true);
        expect(SetTheory.intervalVector(SetTheory.getComplement(prime))).toEqual(SetTheory.intervalVector(prime));
      } else {
        expect(comp).toBe(`${12 - card}-${name.split('-')[1]}`);
      }
    }
  });

  it('uses uppercase Z', () => {
    expect(SetTheory.getForteNumber([0, 1, 4, 6])).toBe('4-Z15');
    expect(SetTheory.getZRelated([0, 1, 4, 6])).toEqual([[0, 1, 3, 7]]);
    expect(SetTheory.getForteNumber([0, 1, 2, 3, 5, 6])).toBe('6-Z3');
    expect(SetTheory.getZRelated([0, 1, 2, 3, 5, 6])).toEqual([[0, 1, 2, 3, 4, 7]]);
  });

  it('follows Rahn where Forte differs', () => {
    expect(SetTheory.primeForm([0, 1, 3, 7, 8])).toEqual([0, 1, 5, 6, 8]);
    expect(SetTheory.getForteNumber([0, 1, 5, 6, 8])).toBe('5-20');
  });

  it('names sets the old table missed or keyed wrongly', () => {
    expect(SetTheory.getForteNumber([0, 2, 4, 5, 7, 9, 11])).toBe('7-35');
    // the old table labeled [0,1,2,3,4,5,9], not a prime form, as 7-z18
    expect(SetTheory.getForteNumber([0, 1, 2, 3, 4, 5, 8])).toBe('7-3');
  });
});

describe('Clave patterns', () => {
  const onsets = (id: string) => CLAVE_PATTERNS[id].steps.flatMap((on, i) => (on ? [i] : []));

  it.each([
    ['son-3-2', [0, 3, 6, 10, 12]], ['son-2-3', [2, 4, 8, 11, 14]],
    ['rumba-3-2', [0, 3, 7, 10, 12]], ['rumba-2-3', [2, 4, 8, 11, 15]],
    ['bossa', [0, 3, 6, 10, 13]], ['tresillo', [0, 3, 6]], ['cinquillo', [0, 2, 3, 5, 6]], ['habanera', [0, 3, 4, 6]],
  ])('%s onsets', (id, expected) => {
    expect(onsets(id)).toEqual(expected);
  });

  it('2-3 claves are the 3-2 claves starting from the second half', () => {
    for (const kind of ['son', 'rumba']) {
      const threeTwo = CLAVE_PATTERNS[`${kind}-3-2`].steps;
      expect([...threeTwo.slice(8), ...threeTwo.slice(0, 8)]).toEqual([...CLAVE_PATTERNS[`${kind}-2-3`].steps]);
    }
  });

  it('detectClave and detectCinquillo recognise the stored patterns', () => {
    for (const id of ['son-3-2', 'son-2-3', 'rumba-3-2', 'rumba-2-3', 'bossa']) {
      expect(RhythmAnalysis.detectClave(CLAVE_PATTERNS[id].steps.map(Number))).toBe(id);
    }
    expect(RhythmAnalysis.detectCinquillo([1, 0, 1, 1, 0, 1, 1, 0])).toBe(true);
    expect(RhythmAnalysis.detectCinquillo([1, 0, 1, 1, 0, 1, 0, 1])).toBe(false);
  });
});

describe('Maqamat (maqamworld.com, ascending)', () => {
  it.each([
    ['rast', [0, 4, 7, 10, 14, 18, 21, 24]], ['bayati', [0, 3, 6, 10, 14, 16, 20, 24]],
    ['hijaz', [0, 2, 8, 10, 14, 16, 20, 24]], ['nahawand', [0, 4, 6, 10, 14, 16, 22, 24]],
    ['kurd', [0, 2, 6, 10, 14, 16, 20, 24]], ['saba', [0, 3, 6, 8, 14, 16, 20, 24]],
    ['sikah', [0, 3, 7, 11, 14, 17, 21, 24]], ['huzam', [0, 3, 7, 9, 15, 17, 21, 24]],
  ])('%s', (id, notes) => {
    expect(MAQAMAT[id].notes).toEqual(notes);
  });

  it('each scale starts with its first jins', () => {
    for (const m of Object.values(MAQAMAT)) {
      const first = m.ajnas[0].intervals.reduce<number[]>((acc, i) => [...acc, acc[acc.length - 1] + i], [0]);
      expect(m.notes.slice(0, first.length)).toEqual(first);
    }
  });

  it('keeps gharsa as a deprecated alias of character', () => {
    expect(MAQAMAT.rast.gharsa).toBe(MAQAMAT.rast.character);
  });
});

describe('Ragas (Wikipedia infoboxes)', () => {
  it.each([
    ['yaman', 3, 7], ['bhairav', 6, 2], ['bhairavi', 4, 1], ['malkauns', 4, 1], ['darbari-kanada', 2, 5],
    ['kafi', 5, 2], ['khamaj', 3, 7], ['todi', 6, 3], ['desh', 2, 5], ['puriya-dhanashree', 5, 2],
  ])('%s: vadi %i, samvadi %i', (id, vadi, samvadi) => {
    expect([RAGAS[id].vadi, RAGAS[id].samvadi]).toEqual([vadi, samvadi]);
  });

  it('vadi and samvadi are notes of the raga', () => {
    // svara number → the semitone positions that svara can take
    const svara: Record<number, number[]> = { 1: [0], 2: [1, 2], 3: [3, 4], 4: [5, 6], 5: [7], 6: [8, 9], 7: [10, 11] };
    for (const r of Object.values(RAGAS)) {
      const notes = new Set([...r.aroha, ...r.avaroha].map(s => s % 12));
      for (const n of [r.vadi, r.samvadi]) expect(svara[n].some(s => notes.has(s))).toBe(true);
    }
  });

  it('Desh ascends without Ga and Dha; Puriya Dhanashree uses komal Dha and tivra Ma only', () => {
    expect(RAGAS.desh.aroha).toEqual([0, 2, 5, 7, 11, 12]);
    expect(RAGAS.desh.avaroha).toContain(10);
    const pd = [...RAGAS['puriya-dhanashree'].aroha, ...RAGAS['puriya-dhanashree'].avaroha];
    expect(pd).toContain(8);
    expect(pd).not.toContain(9);
    expect(pd).not.toContain(5);
    expect(SVARA_NAMES[RAGAS.yaman.vadi]).toBe('Ga');
  });
});

describe('Progressions', () => {
  const names = (id: string, key: string) => getProgression(id, key).map(c => c.name).join(' ');

  it('every progression parses in its default key or C major', () => {
    for (const [id, p] of Object.entries(PROGRESSIONS)) {
      expect(() => getProgression(id, p.defaultKey ?? 'C major')).not.toThrow();
    }
  });

  it('12-bar blues uses dominant sevenths on I and IV', () => {
    expect(names('blues-12', 'C major')).toBe('C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7');
  });

  it('jazz blues and Bird blues are distinct and as written', () => {
    expect(names('blues-jazz', 'F major')).toBe('F7 Bb7 F7 Cm7 F7 Bb7 Bdim7 F7 D7 Gm7 C7 F7 D7 Gm7 C7');
    expect(names('bird-blues', 'F major'))
      .toBe('Fmaj7 Em7b5 A7 Dm7 G7 Cm7 F7 Bb7 Bbm7 Eb7 Am7 D7 Abm7 Db7 Gm7 C7 Fmaj7 D7 Gm7 C7');
  });

  it('Coltrane changes and Giant Steps move by major thirds', () => {
    expect(names('coltrane-changes', 'C major')).toBe('Dm7 Eb7 Abmaj7 B7 Emaj7 G7 Cmaj7');
    expect(names('giant-steps-cycle', 'B major')).toBe('Bmaj7 D7 Gmaj7 A#7 D#maj7');
  });

  it('rhythm changes bar 5 goes I to I7', () => {
    expect(names('rhythm-changes', 'Bb major').split(' ').slice(8, 12)).toEqual(['Bbmaj7', 'Bb7', 'Ebmaj7', 'Ebm7']);
  });

  it('dom gives an explicit dominant; lower case is rejected', () => {
    expect(parseRomanProgression('Idom7 IVdom9 I7', 'C major').map(c => c.name)).toEqual(['C7', 'F9', 'Cmaj7']);
    expect(() => parseRomanProgression('idom7', 'C major')).toThrow();
  });
});

describe('Commas', () => {
  it('keeps the published cents and gives exact ratio text', () => {
    const commas = Object.fromEntries(TemperamentAnalysis.getCommas().map(c => [c.name, c]));
    expect(commas['Syntonic comma'].cents).toBe(21.506);
    expect(commas['Pythagorean comma'].cents).toBe(23.46);
    expect(commas['Mercator comma'].cents).toBe(3.615);
    expect(commas['Mercator comma'].ratioText).toBe('3^53/2^84');
    expect(commas['Schisma'].ratioText).toBe('32805/32768');
  });
});
