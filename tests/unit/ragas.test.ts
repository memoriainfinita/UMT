/**
 * Tests for lib/music-theory/ragas.ts.
 * Raga scales checked against the Wikipedia raga infoboxes.
 */
import { describe, it, expect } from 'vitest';
import { RAGAS, SVARA_NAMES } from '../../lib/music-theory/ragas';

describe('RAGAS', () => {
  it('exports at least 10 ragas', () => {
    expect(Object.keys(RAGAS).length).toBeGreaterThanOrEqual(10);
  });

  it('each raga has required fields', () => {
    for (const [, raga] of Object.entries(RAGAS)) {
      expect(typeof raga.name).toBe('string');
      expect(Array.isArray(raga.aroha)).toBe(true);
      expect(Array.isArray(raga.avaroha)).toBe(true);
      expect(typeof raga.vadi).toBe('number');
      expect(typeof raga.samvadi).toBe('number');
      expect(typeof raga.thaat).toBe('string');
      expect(typeof raga.description).toBe('string');
    }
  });

  it('yaman uses sharp Ma (6 semitones)', () => {
    expect(RAGAS['yaman'].aroha).toContain(6); // tivra Ma
  });

  it('malkauns is pentatonic', () => {
    expect(RAGAS['malkauns'].aroha.length).toBeLessThanOrEqual(7);
  });

  it('aroha starts at 0 (tonic)', () => {
    for (const [, raga] of Object.entries(RAGAS)) {
      expect(raga.aroha[0]).toBe(0);
    }
  });

  it('aroha ends at 12 (octave)', () => {
    for (const [, raga] of Object.entries(RAGAS)) {
      expect(raga.aroha[raga.aroha.length - 1]).toBe(12);
    }
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
