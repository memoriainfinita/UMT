import { describe, it, expect } from 'vitest';
import { CircleOfFifths } from '../../lib/music-theory/circle';

describe('CircleOfFifths.getPosition', () => {
  it('returns 0 for C major', () => {
    expect(CircleOfFifths.getPosition('C')).toBe(0);
  });
  it('returns 1 for G major', () => {
    expect(CircleOfFifths.getPosition('G')).toBe(1);
  });
  it('returns 2 for D major', () => {
    expect(CircleOfFifths.getPosition('D')).toBe(2);
  });
  it('returns 11 for F major', () => {
    expect(CircleOfFifths.getPosition('F')).toBe(11);
  });
  it('returns 0 for a minor', () => {
    expect(CircleOfFifths.getPosition('a')).toBe(0);
  });
  it('returns 3 for f# minor', () => {
    expect(CircleOfFifths.getPosition('f#')).toBe(3);
  });
  it('normalizes enharmonic Gb to F# position', () => {
    expect(CircleOfFifths.getPosition('Gb')).toBe(CircleOfFifths.getPosition('F#'));
  });
  it('returns -1 for unknown key', () => {
    expect(CircleOfFifths.getPosition('X')).toBe(-1);
  });
});

describe('CircleOfFifths.navigate', () => {
  it('1 step clockwise from C is G', () => {
    expect(CircleOfFifths.navigate('C', 1)).toBe('G');
  });
  it('1 step counter-clockwise from C is F', () => {
    expect(CircleOfFifths.navigate('C', -1)).toBe('F');
  });
  it('2 steps clockwise from C is D', () => {
    expect(CircleOfFifths.navigate('C', 2)).toBe('D');
  });
  it('wraps around: 12 steps returns same key', () => {
    expect(CircleOfFifths.navigate('G', 12)).toBe('G');
  });
  it('wraps around: -12 steps returns same key', () => {
    expect(CircleOfFifths.navigate('D', -12)).toBe('D');
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.navigate('a', 1)).toBe('e');
  });
  it('returns empty string for unknown key', () => {
    expect(CircleOfFifths.navigate('X', 1)).toBe('');
  });
});

describe('CircleOfFifths.getDistance', () => {
  it('C to G is 1', () => {
    expect(CircleOfFifths.getDistance('C', 'G')).toBe(1);
  });
  it('C to F is 1', () => {
    expect(CircleOfFifths.getDistance('C', 'F')).toBe(1);
  });
  it('C to D is 2', () => {
    expect(CircleOfFifths.getDistance('C', 'D')).toBe(2);
  });
  it('C to F# is 6 (tritone — max distance)', () => {
    expect(CircleOfFifths.getDistance('C', 'F#')).toBe(6);
  });
  it('is symmetric: G to C equals C to G', () => {
    expect(CircleOfFifths.getDistance('G', 'C')).toBe(1);
  });
  it('same key returns 0', () => {
    expect(CircleOfFifths.getDistance('C', 'C')).toBe(0);
  });
  it('returns -1 for mixed modes', () => {
    expect(CircleOfFifths.getDistance('C', 'a')).toBe(-1);
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.getDistance('a', 'e')).toBe(1);
  });
});

describe('CircleOfFifths.getParallel', () => {
  it('C major → c minor', () => {
    expect(CircleOfFifths.getParallel('C')).toBe('c');
  });
  it('a minor → A major', () => {
    expect(CircleOfFifths.getParallel('a')).toBe('A');
  });
  it('F# major → f# minor', () => {
    expect(CircleOfFifths.getParallel('F#')).toBe('f#');
  });
  it('Bb major → bb minor', () => {
    expect(CircleOfFifths.getParallel('Bb')).toBe('bb');
  });
  it('f# minor → F# major', () => {
    expect(CircleOfFifths.getParallel('f#')).toBe('F#');
  });
  it('double application returns original', () => {
    expect(CircleOfFifths.getParallel(CircleOfFifths.getParallel('D'))).toBe('D');
  });
});

describe('CircleOfFifths.getNeighbors', () => {
  it('radius 1 from C returns G and F', () => {
    expect(CircleOfFifths.getNeighbors('C')).toEqual(['G', 'F']);
  });
  it('radius 2 from C returns G, F, D, Bb', () => {
    expect(CircleOfFifths.getNeighbors('C', 2)).toEqual(['G', 'F', 'D', 'Bb']);
  });
  it('does not include the key itself', () => {
    expect(CircleOfFifths.getNeighbors('C')).not.toContain('C');
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.getNeighbors('a')).toEqual(['e', 'd']);
  });
  it('radius 0 returns empty array', () => {
    expect(CircleOfFifths.getNeighbors('C', 0)).toEqual([]);
  });
});

describe('CircleOfFifths.getRelatedKeys', () => {
  it('returns 6 entries for C major', () => {
    expect(CircleOfFifths.getRelatedKeys('C')).toHaveLength(6);
  });
  it('includes relative minor with distance 0', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'a', relationship: 'relative', distance: 0 });
  });
  it('includes parallel minor with distance 0', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'c', relationship: 'parallel', distance: 0 });
  });
  it('includes dominant with distance 1', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'G', relationship: 'dominant', distance: 1 });
  });
  it('includes subdominant with distance 1', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'F', relationship: 'subdominant', distance: 1 });
  });
  it('includes two neighbors at distance 2', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    const neighbors = related.filter(r => r.relationship === 'neighbor');
    expect(neighbors).toHaveLength(2);
    expect(neighbors.every(n => n.distance === 2)).toBe(true);
  });
  it('is sorted by distance ascending', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    for (let i = 1; i < related.length; i++) {
      expect(related[i].distance).toBeGreaterThanOrEqual(related[i - 1].distance);
    }
  });
  it('works for minor keys', () => {
    const related = CircleOfFifths.getRelatedKeys('a');
    expect(related).toContainEqual({ key: 'C', relationship: 'relative', distance: 0 });
    expect(related).toContainEqual({ key: 'A', relationship: 'parallel', distance: 0 });
  });
});
