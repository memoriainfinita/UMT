/**
 * Tests for lib/music-theory/upper-structures.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseChordSymbol } from '../../lib/music-theory/parser';
import { getUpperStructures } from '../../lib/music-theory/upper-structures';
import { Chord } from '../../lib/music-theory/chord';
import { EDO } from '../../lib/music-theory/tuning';

function chord(symbol: string): Chord { return parseChordSymbol(symbol); }

describe('getUpperStructures', () => {
  it('only for dominants', () => {
    expect(getUpperStructures(parseChordSymbol('G7'))).toHaveLength(6);
    expect(getUpperStructures(parseChordSymbol('G13'))).toHaveLength(6);
    expect(getUpperStructures(parseChordSymbol('Cmaj7'))).toEqual([]);
    expect(getUpperStructures(parseChordSymbol('Dm7'))).toEqual([]);
  });
});

describe('getUpperStructures', () => {
  it('returns 6 USTs for a dominant 7th chord', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    expect(usts).toHaveLength(6);
  });

  it('each UST has triad, tensions, overChord, label', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    for (const ust of usts) {
      expect(ust.triad).toBeDefined();
      expect(Array.isArray(ust.tensions)).toBe(true);
      expect(ust.tensions.length).toBeGreaterThan(0);
      expect(ust.overChord).toBe(g7);
      expect(typeof ust.label).toBe('string');
      expect(ust.label).toContain('UST');
    }
  });

  it('bII UST over G7 is Ab major', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    const bii = usts.find(u => u.label === 'bII UST');
    expect(bii).toBeDefined();
    const rootPc = ((bii!.triad.rootStep % 12) + 12) % 12;
    // Ab = 8 semitones from A (A=0), which is PC 8 in UMT, or G+1 = PC (((-2)+1%12+12)%12 = 11)
    // Actually: G root is step -2 (from A4), +1 semitone → step -1 → PC 11 (Ab in UMT coords)
    expect(rootPc).toBe(11); // Ab in UMT (A=0 system): G#/Ab = PC 11
  });

  it('II UST over G7 is A major with tensions 9/#11/13', () => {
    const g7 = chord('G7');
    const usts = getUpperStructures(g7);
    const ii = usts.find(u => u.label === 'II UST');
    expect(ii).toBeDefined();
    expect(ii!.tensions).toContain('9');
    expect(ii!.tensions).toContain('#11');
    expect(ii!.tensions).toContain('13');
  });

  it('another tuning gets the 12-TET triads, retuned (A7 in 19-EDO)', () => {
    const edo19 = new EDO(19, 440);
    const a7 = new Chord('A7', edo19, 0, [0, 6, 11, 16]);
    const usts = getUpperStructures(a7);
    expect(usts.map(u => u.triad.name)).toEqual(getUpperStructures(parseChordSymbol('A7')).map(u => u.triad.name));
    expect(usts.every(u => u.triad.tuningSystem === edo19)).toBe(true);
  });

  it('UST labels cover bII, II, bIII, bVI, VI, bVII', () => {
    const c7 = chord('C7');
    const usts = getUpperStructures(c7);
    const labels = usts.map(u => u.label);
    expect(labels).toContain('bII UST');
    expect(labels).toContain('II UST');
    expect(labels).toContain('bIII UST');
    expect(labels).toContain('bVI UST');
    expect(labels).toContain('VI UST');
    expect(labels).toContain('bVII UST');
  });
});
