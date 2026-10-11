/**
 * Tests for lib/music-theory/neo-riemannian.ts.
 * P, L and R act on major and minor triads (Cohn, "Introduction to Neo-Riemannian Theory",
 * Journal of Music Theory 42/2, 1998; Wikipedia, "Neo-Riemannian theory").
 */
import { describe, it, expect } from 'vitest';
import { NeoRiemannian } from '../../lib/music-theory/neo-riemannian';
import { parseChordSymbol } from '../../lib/music-theory/parser';

const name = (c: ReturnType<typeof NeoRiemannian.P>) => c?.name ?? null;

describe('NeoRiemannian P, L, R', () => {
  it('C major: P → Cm, L → Em, R → Am', () => {
    const c = parseChordSymbol('C');
    expect(name(NeoRiemannian.P(c))).toBe('Cm');
    expect(name(NeoRiemannian.L(c))).toBe('Em');
    expect(name(NeoRiemannian.R(c))).toBe('Am');
  });

  it('A minor: P → A, L → F, R → C', () => {
    const am = parseChordSymbol('Am');
    expect(name(NeoRiemannian.P(am))).toBe('A');
    expect(name(NeoRiemannian.L(am))).toBe('F');
    expect(name(NeoRiemannian.R(am))).toBe('C');
  });

  it('each transformation is an involution', () => {
    for (const sym of ['C', 'Am', 'F#', 'Ebm']) {
      const c = parseChordSymbol(sym);
      for (const t of ['P', 'L', 'R'] as const) {
        const back = NeoRiemannian[t](NeoRiemannian[t](c)!)!;
        expect(back.getPitchClasses().sort(), `${t}(${t}(${sym}))`).toEqual(c.getPitchClasses().sort());
      }
    }
  });

  it('an inverted triad is still a triad', () => {
    expect(NeoRiemannian.getTriadType(parseChordSymbol('C/E'))).toMatchObject({ isMajor: true });
  });

  it('a chord that is not a major or minor triad gives null (reported from MODUS)', () => {
    for (const sym of ['G7', 'Cmaj7', 'Cadd9', 'C7#9', 'C6', 'Cm7', 'Cdim', 'Caug', 'Csus4', 'C5']) {
      const c = parseChordSymbol(sym);
      expect(NeoRiemannian.getTriadType(c), sym).toBeNull();
      expect(NeoRiemannian.P(c), sym).toBeNull();
    }
  });
});
