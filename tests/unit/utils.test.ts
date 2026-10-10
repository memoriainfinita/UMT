/**
 * Tests for lib/music-theory/utils.ts.
 */
import { describe, it, expect } from 'vitest';
import { getEnharmonics, freqToMidi } from '../../lib/music-theory/utils';

describe('core fixes (audit 2026-10, phase 1)', () => {
  it('getEnharmonics covers every note with ##/bb', () => {
    expect(getEnharmonics('C#')).toEqual(['Db', 'B##']);
    expect(getEnharmonics('D')).toEqual(['C##', 'Ebb']);
    expect(getEnharmonics('G#')).toEqual(['Ab']);
    expect(getEnharmonics('C4')).toEqual(['B#3', 'Dbb4']);
    expect(getEnharmonics('x')).toEqual([]);
  });

  it('freqToMidi clamps to 0-127', () => {
    expect(freqToMidi(440)).toBe(69);
    expect(freqToMidi(1)).toBe(0);
    expect(freqToMidi(100000)).toBe(127);
  });
});
