/**
 * Tests for lib/music-theory/rhythmic-cycles.ts.
 * Talas from Wikipedia "Tala (music)" and "Rupak Tala"; flamenco compás from Wikipedia
 * "Flamenco"; aksak meters from Wikipedia "Aksak".
 */
import { describe, it, expect } from 'vitest';
import { RHYTHMIC_CYCLES, cycleCounts, cycleStrokes, cycleTimeSignature } from '../../lib/music-theory/rhythmic-cycles';

const accentsAt = (id: string) => cycleStrokes(RHYTHMIC_CYCLES[id]).flatMap((s, i) => (s === 'beat' ? [] : [i]));

describe('RHYTHMIC_CYCLES', () => {
  it('groups add up to the beats; talas have one sign per vibhag', () => {
    for (const [id, c] of Object.entries(RHYTHMIC_CYCLES)) {
      expect(c.groups.reduce((a, b) => a + b, 0), id).toBe(c.beats);
      if (c.vibhag) expect(c.vibhag.length, id).toBe(c.groups.length);
    }
  });

  it('Teental: sam, tali, khali, tali on beats 1, 5, 9, 13', () => {
    const s = cycleStrokes(RHYTHMIC_CYCLES.teental);
    expect([s[0], s[4], s[8], s[12]]).toEqual(['sam', 'tali', 'khali', 'tali']);
  });

  it('Ektal: X 0 2 0 3 4 over six vibhags of two', () => {
    const s = cycleStrokes(RHYTHMIC_CYCLES.ektal);
    expect([0, 2, 4, 6, 8, 10].map(i => s[i])).toEqual(['sam', 'khali', 'tali', 'khali', 'tali', 'tali']);
  });

  it('Bulerías counted from 12, accents on 12 3 6 8 10', () => {
    expect(cycleCounts(RHYTHMIC_CYCLES.bulerias).slice(0, 3)).toEqual([12, 1, 2]);
    expect(accentsAt('bulerias')).toEqual([0, 3, 6, 8, 10]);
  });

  it('Soleá accents on 3 6 8 10 12; seguiriya on 12 2 4 7 10', () => {
    expect(accentsAt('solea')).toEqual([2, 5, 7, 9, 11]);
    const seguiriya = accentsAt('seguiriya');
    expect(cycleCounts(RHYTHMIC_CYCLES.seguiriya).filter((_, i) => seguiriya.includes(i))).toEqual([12, 2, 4, 7, 10]);
  });

  it('aksak: Račenica 2+2+3/8, accents on the cells', () => {
    expect(cycleTimeSignature(RHYTHMIC_CYCLES.racenica).toString()).toBe('2+2+3/8');
    expect(accentsAt('racenica')).toEqual([0, 2, 4]);
    expect(RHYTHMIC_CYCLES.gankino.groups).toEqual([2, 2, 3, 2, 2]);
  });
});
