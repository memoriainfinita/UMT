/**
 * Tests for lib/music-theory/set-theory.ts.
 * Set classes after Forte (1973) and Rahn (1980); the Forte table is checked against Wikipedia, "List of set classes".
 */
import { describe, it, expect } from 'vitest';
import { SetTheory } from '../../lib/music-theory/set-theory';

describe('SetTheory.getForteNumber', () => {
  it('major triad prime form [0,3,7] → 3-11', () => {
    // primeForm of a major/minor triad is [0,3,7] (minor is more compact)
    expect(SetTheory.getForteNumber([0, 3, 7])).toBe('3-11');
  });

  it('minor triad → same class as major → 3-11', () => {
    // [0,4,7] minor in some rotation; primeForm → [0,3,7]
    expect(SetTheory.getForteNumber([0, 4, 7])).toBe('3-11');
  });

  it('diminished triad [0,3,6] → 3-10', () => {
    expect(SetTheory.getForteNumber([0, 3, 6])).toBe('3-10');
  });

  it('whole tone set [0,2,4,6,8,10] → 6-35', () => {
    expect(SetTheory.getForteNumber([0, 2, 4, 6, 8, 10])).toBe('6-35');
  });

  it('returns unknown for empty set', () => {
    expect(SetTheory.getForteNumber([])).toBe('unknown');
  });

  it('chromatic trichord [0,1,2] → 3-1', () => {
    expect(SetTheory.getForteNumber([0, 1, 2])).toBe('3-1');
  });
});

describe('SetTheory.getComplement', () => {
  it('complement of empty set is all 12 PCs', () => {
    expect(SetTheory.getComplement([])).toHaveLength(12);
  });

  it('complement of [0,1,2,3,4,5] has 6 elements', () => {
    expect(SetTheory.getComplement([0, 1, 2, 3, 4, 5])).toHaveLength(6);
  });

  it('complement of full chromatic is empty', () => {
    expect(SetTheory.getComplement([0,1,2,3,4,5,6,7,8,9,10,11])).toHaveLength(0);
  });

  it('complement elements not in original set', () => {
    const set = [0, 2, 4, 6, 8, 10];
    const comp = SetTheory.getComplement(set);
    expect(comp.every(p => !set.includes(p))).toBe(true);
  });
});

describe('SetTheory.Tn / TnI', () => {
  it('Tn([0,4,7], 5) transposes by 5 semitones', () => {
    expect(SetTheory.Tn([0, 4, 7], 5)).toEqual([5, 9, 0].sort((a, b) => a - b));
  });

  it('Tn with n=0 returns same set', () => {
    expect(SetTheory.Tn([0, 3, 7], 0)).toEqual([0, 3, 7]);
  });

  it('TnI inverts and transposes', () => {
    const pcs = [0, 4, 7];
    const result = SetTheory.TnI(pcs, 0);
    // TnI(0) = -0, -4, -7 mod 12 = 0, 8, 5 sorted = [0,5,8]
    expect(result).toEqual([0, 5, 8]);
  });

  it('Tn result length equals input length', () => {
    expect(SetTheory.Tn([0, 1, 2, 3], 3)).toHaveLength(4);
  });
});

describe('SetTheory.isSubset / isSuperset', () => {
  it('[0,4] is subset of [0,4,7]', () => {
    expect(SetTheory.isSubset([0, 4], [0, 4, 7])).toBe(true);
  });

  it('[0,4,7] is not subset of [0,4]', () => {
    expect(SetTheory.isSubset([0, 4, 7], [0, 4])).toBe(false);
  });

  it('[0,4,7] is superset of [0,4]', () => {
    expect(SetTheory.isSuperset([0, 4, 7], [0, 4])).toBe(true);
  });

  it('identical sets are both subset and superset', () => {
    expect(SetTheory.isSubset([0, 4, 7], [0, 4, 7])).toBe(true);
    expect(SetTheory.isSuperset([0, 4, 7], [0, 4, 7])).toBe(true);
  });
});

describe('SetTheory.getAllSubsets', () => {
  it('returns C(4,2) = 6 subsets of cardinality 2', () => {
    expect(SetTheory.getAllSubsets([0, 3, 6, 9], 2)).toHaveLength(6);
  });

  it('returns C(4,3) = 4 subsets of cardinality 3', () => {
    expect(SetTheory.getAllSubsets([0, 3, 6, 9], 3)).toHaveLength(4);
  });

  it('cardinality 0 returns empty array', () => {
    expect(SetTheory.getAllSubsets([0, 1, 2], 0)).toHaveLength(0);
  });

  it('cardinality > set size returns empty', () => {
    expect(SetTheory.getAllSubsets([0, 1], 5)).toHaveLength(0);
  });

  it('each subset has correct cardinality', () => {
    const subs = SetTheory.getAllSubsets([0, 1, 2, 3], 2);
    expect(subs.every(s => s.length === 2)).toBe(true);
  });
});

describe('SetTheory.getZRelated', () => {
  it('4-Z15 [0,1,4,6] returns 4-Z29 [0,1,3,7]', () => {
    const result = SetTheory.getZRelated([0, 1, 4, 6]);
    expect(result).toContainEqual([0, 1, 3, 7]);
    expect(result).toHaveLength(1);
  });

  it('4-Z29 [0,1,3,7] returns 4-Z15 [0,1,4,6]', () => {
    const result = SetTheory.getZRelated([0, 1, 3, 7]);
    expect(result).toContainEqual([0, 1, 4, 6]);
    expect(result).toHaveLength(1);
  });

  it('5-Z17 [0,1,3,4,8] returns 5-Z37 [0,3,4,5,8]', () => {
    const result = SetTheory.getZRelated([0, 1, 3, 4, 8]);
    expect(result).toContainEqual([0, 3, 4, 5, 8]);
  });

  it('5-Z18 [0,1,4,5,7] returns 5-Z38 [0,1,2,5,8]', () => {
    const result = SetTheory.getZRelated([0, 1, 4, 5, 7]);
    expect(result).toContainEqual([0, 1, 2, 5, 8]);
  });

  it('non-Z set returns empty array', () => {
    expect(SetTheory.getZRelated([0, 1, 2])).toHaveLength(0);
  });

  it('empty input returns empty array', () => {
    expect(SetTheory.getZRelated([])).toHaveLength(0);
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
