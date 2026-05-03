import { describe, it, expect } from 'vitest';
import { parseChordSymbol } from '../../lib/music-theory/parser';

function ivs(symbol: string): number[] {
  return parseChordSymbol(symbol).intervalsInSteps;
}

describe('compositional chord parser', () => {

  describe('dictionary still takes priority', () => {
    it('m7b5 → dict [0,3,6,10]', () => expect(ivs('Cm7b5')).toEqual([0,3,6,10]));
    it('maj9 → dict [0,4,7,11,14]', () => expect(ivs('Cmaj9')).toEqual([0,4,7,11,14]));
    it('9#11 → dict [0,4,7,10,14,18]', () => expect(ivs('C9#11')).toEqual([0,4,7,10,14,18]));
    it('dim7 → dict [0,3,6,9] (bb7, not compositional)', () => expect(ivs('Cdim7')).toEqual([0,3,6,9]));
  });

  describe('major quality', () => {
    it('M7 → maj7 = [0,4,7,11]', () => expect(ivs('CM7')).toEqual([0,4,7,11]));
    it('maj9 via compositional fallback matches dict', () => expect(ivs('Cmaj9')).toEqual([0,4,7,11,14]));
    it('maj11 → [0,4,7,11,14,17]', () => expect(ivs('Cmaj11')).toEqual([0,4,7,11,14,17]));
    it('maj13 → [0,4,7,11,14,21]', () => expect(ivs('Cmaj13')).toEqual([0,4,7,11,14,21]));
    it('maj13#11 → [0,4,7,11,14,18,21]', () => expect(ivs('Cmaj13#11')).toEqual([0,4,7,11,14,18,21]));
  });

  describe('minor quality', () => {
    it('mM9 → minor-major 9th [0,3,7,11,14]', () => expect(ivs('CmM9')).toEqual([0,3,7,11,14]));
    it('mM11 → [0,3,7,11,14,17]', () => expect(ivs('CmM11')).toEqual([0,3,7,11,14,17]));
    it('m9b5 → half-dim with 9th [0,3,6,10,14]', () => expect(ivs('Cm9b5')).toEqual([0,3,6,10,14]));
    it('m11b5 → dict [0,3,6,10,14,17]', () => expect(ivs('Cm11b5')).toEqual([0,3,6,10,14,17]));
    it('m13 → dict [0,3,7,10,14,21]', () => expect(ivs('Cm13')).toEqual([0,3,7,10,14,21]));
  });

  describe('augmented quality', () => {
    it('augM9 → aug triad + maj7 + 9 [0,4,8,11,14]', () => expect(ivs('CaugM9')).toEqual([0,4,8,11,14]));
    it('aug9 → dict [0,4,8,10,14]', () => expect(ivs('Caug9')).toEqual([0,4,8,10,14]));
  });

  describe('altered extensions', () => {
    it('13b9 → [0,4,7,10,13,21]', () => expect(ivs('C13b9')).toEqual([0,4,7,10,13,21]));
    it('13#11 → dict [0,4,7,10,14,18,21]', () => expect(ivs('C13#11')).toEqual([0,4,7,10,14,18,21]));
    it('13b9#11 → [0,4,7,10,13,18,21]', () => expect(ivs('C13b9#11')).toEqual([0,4,7,10,13,18,21]));
    it('7b9#11b13 → [0,4,7,10,13,18,20]', () => expect(ivs('C7b9#11b13')).toEqual([0,4,7,10,13,18,20]));
    it('7b9#9 → dict [0,4,7,10,13,15]', () => expect(ivs('C7b9#9')).toEqual([0,4,7,10,13,15]));
  });

  describe('alteration order is irrelevant', () => {
    it('7b9#11 == 7#11b9', () => expect(ivs('C7b9#11')).toEqual(ivs('C7#11b9')));
    it('13b9#11b13 == 13#11b9b13', () => expect(ivs('C13b9#11b13')).toEqual(ivs('C13#11b9b13')));
    it('9b5#9 == 9#9b5', () => expect(ivs('C9b5#9')).toEqual(ivs('C9#9b5')));
  });

  describe('spaces in suffix', () => {
    it('C 7 → same as C7', () => expect(ivs('C 7')).toEqual(ivs('C7')));
    it('C7 b9 → same as C7b9', () => expect(ivs('C7 b9')).toEqual(ivs('C7b9')));
    it('Ab 7b9 #11 → same as Ab7b9#11', () => expect(ivs('Ab 7b9 #11')).toEqual(ivs('Ab7b9#11')));
  });

  describe('unknown suffix still throws', () => {
    it('throws for completely unknown suffix', () => {
      expect(() => parseChordSymbol('Cxyz')).toThrow();
    });
    it('throws for partial match', () => {
      expect(() => parseChordSymbol('C7zz')).toThrow();
    });
  });
});
