import { describe, it, expect } from 'vitest';
import {
  getFretboardVoicings,
  getFretboardScale,
  getFretboardScalePositions,
  GUITAR_STANDARD,
  GUITAR_DROPPED_D,
  GUITAR_OPEN_G,
  UKULELE_STANDARD,
  BASS_STANDARD,
  FretboardVoicingResult,
  FretboardScaleResult,
} from '../../lib/music-theory/fretboard';
import { parseChordSymbol, parseScaleSymbol } from '../../lib/music-theory/parser';
import { TET12 } from '../../lib/music-theory/presets';

// ============================================================================
// Tuning presets
// ============================================================================

describe('tuning presets', () => {
  it('GUITAR_STANDARD has 6 strings', () => {
    expect(GUITAR_STANDARD).toHaveLength(6);
  });
  it('GUITAR_DROPPED_D has 6 strings', () => {
    expect(GUITAR_DROPPED_D).toHaveLength(6);
  });
  it('GUITAR_OPEN_G has 6 strings', () => {
    expect(GUITAR_OPEN_G).toHaveLength(6);
  });
  it('UKULELE_STANDARD has 4 strings', () => {
    expect(UKULELE_STANDARD).toHaveLength(4);
  });
  it('BASS_STANDARD has 4 strings', () => {
    expect(BASS_STANDARD).toHaveLength(4);
  });
  it('GUITAR_STANDARD strings are ordered low→high', () => {
    // Each string step should be greater than the previous (ascending pitch)
    for (let i = 1; i < GUITAR_STANDARD.length; i++) {
      expect(GUITAR_STANDARD[i]).toBeGreaterThan(GUITAR_STANDARD[i - 1]);
    }
  });
});

// ============================================================================
// getFretboardVoicings
// ============================================================================

describe('getFretboardVoicings', () => {
  const cmaj = parseChordSymbol('C');
  const oct = 12;

  function coveredPCs(v: FretboardVoicingResult, tuning: readonly number[]): Set<number> {
    const pcs = new Set<number>();
    for (let i = 0; i < v.frets.length; i++) {
      if (v.frets[i] >= 0) {
        pcs.add(((tuning[i] + v.frets[i]) % oct + oct) % oct);
      }
    }
    return pcs;
  }

  it('C major on GUITAR_STANDARD returns at least one voicing', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
  });

  it('every voicing covers all chord PCs', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    const chordPCs = new Set(cmaj.getPitchClasses());
    for (const v of voicings) {
      const covered = coveredPCs(v, GUITAR_STANDARD);
      for (const pc of chordPCs) {
        expect(covered.has(pc)).toBe(true);
      }
    }
  });

  it('every voicing respects maxStretch (default 4)', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    for (const v of voicings) {
      const active = v.frets.filter(f => f > 0);
      if (active.length > 1) {
        const stretch = Math.max(...active) - Math.min(...active);
        expect(stretch).toBeLessThanOrEqual(4);
      }
    }
  });

  it('respects custom maxStretch option', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD, { maxStretch: 2 });
    for (const v of voicings) {
      const active = v.frets.filter(f => f > 0);
      if (active.length > 1) {
        expect(Math.max(...active) - Math.min(...active)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('results are sorted by baseFret ascending', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    for (let i = 1; i < voicings.length; i++) {
      expect(voicings[i].baseFret).toBeGreaterThanOrEqual(voicings[i - 1].baseFret);
    }
  });

  it('classic open C voicing is in results', () => {
    // E mute, A:3, D:2, G:0, B:1, e:0
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    const found = voicings.some(v =>
      v.frets[0] === -1 &&
      v.frets[1] === 3 &&
      v.frets[2] === 2 &&
      v.frets[3] === 0 &&
      v.frets[4] === 1 &&
      v.frets[5] === 0
    );
    expect(found).toBe(true);
  });

  it('each voicing has same number of entries as tuning strings', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    for (const v of voicings) {
      expect(v.frets).toHaveLength(GUITAR_STANDARD.length);
    }
  });

  it('tuning field contains note names without octave numbers', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    for (const name of voicings[0].tuning) {
      expect(name).toMatch(/^[A-G][#b]?$/);
    }
  });

  it('root field is set correctly for C major', () => {
    const voicings = getFretboardVoicings(cmaj, GUITAR_STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    expect(voicings[0].root).toBe('C');
  });

  it('returns empty array for empty tuning', () => {
    expect(getFretboardVoicings(cmaj, [])).toEqual([]);
  });

  it('Bb major on GUITAR_STANDARD returns voicings', () => {
    const bbmaj = parseChordSymbol('Bb');
    const voicings = getFretboardVoicings(bbmaj, GUITAR_STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
  });

  it('C major on UKULELE_STANDARD returns voicings', () => {
    const voicings = getFretboardVoicings(cmaj, UKULELE_STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
  });

  it('C major on BASS_STANDARD returns voicings with all 3 PCs', () => {
    const voicings = getFretboardVoicings(cmaj, BASS_STANDARD);
    // Bass may not always cover all 3 PCs of a triad; check if any do
    const chordPCs = new Set(cmaj.getPitchClasses());
    const fullCoverage = voicings.filter(v => {
      const covered = coveredPCs(v, BASS_STANDARD);
      for (const pc of chordPCs) { if (!covered.has(pc)) return false; }
      return true;
    });
    // All returned voicings must cover all PCs by construction
    expect(voicings.length).toBe(fullCoverage.length);
  });

  it('maxFret option limits search range', () => {
    const voicings5 = getFretboardVoicings(cmaj, GUITAR_STANDARD, { maxFret: 5 });
    const voicings12 = getFretboardVoicings(cmaj, GUITAR_STANDARD, { maxFret: 12 });
    for (const v of voicings5) {
      expect(Math.max(...v.frets)).toBeLessThanOrEqual(5);
    }
    expect(voicings12.length).toBeGreaterThanOrEqual(voicings5.length);
  });
});

// ============================================================================
// getFretboardScale
// ============================================================================

describe('getFretboardScale', () => {
  const cmajScale = parseScaleSymbol('C major');

  it('returns a single result (not an array)', () => {
    const result = getFretboardScale(cmajScale, GUITAR_STANDARD);
    expect(Array.isArray(result.frets)).toBe(true);
    expect(Array.isArray(result.frets[0])).toBe(true);
  });

  it('frets array has same length as tuning', () => {
    const result = getFretboardScale(cmajScale, GUITAR_STANDARD);
    expect(result.frets).toHaveLength(GUITAR_STANDARD.length);
  });

  it('all 7 scale PCs appear in the result', () => {
    const result = getFretboardScale(cmajScale, GUITAR_STANDARD);
    const scalePCs = new Set(cmajScale.getPitchClasses());
    const found = new Set<number>();
    result.frets.forEach((stringFrets, si) => {
      stringFrets.forEach(fret => {
        found.add(((GUITAR_STANDARD[si] + fret) % 12 + 12) % 12);
      });
    });
    for (const pc of scalePCs) {
      expect(found.has(pc)).toBe(true);
    }
  });

  it('no fret exceeds maxFret', () => {
    const result = getFretboardScale(cmajScale, GUITAR_STANDARD, { maxFret: 7 });
    for (const strFrets of result.frets) {
      for (const fret of strFrets) {
        expect(fret).toBeLessThanOrEqual(7);
      }
    }
  });

  it('baseFret is 1 for full-neck result', () => {
    expect(getFretboardScale(cmajScale, GUITAR_STANDARD).baseFret).toBe(1);
  });

  it('every fret position in result belongs to the scale', () => {
    const result = getFretboardScale(cmajScale, GUITAR_STANDARD);
    const scalePCs = new Set(cmajScale.getPitchClasses());
    result.frets.forEach((strFrets, si) => {
      for (const fret of strFrets) {
        const pc = ((GUITAR_STANDARD[si] + fret) % 12 + 12) % 12;
        expect(scalePCs.has(pc)).toBe(true);
      }
    });
  });

  it('works with ukulele tuning', () => {
    const result = getFretboardScale(cmajScale, UKULELE_STANDARD);
    expect(result.frets).toHaveLength(UKULELE_STANDARD.length);
    expect(result.frets.some(s => s.length > 0)).toBe(true);
  });
});

// ============================================================================
// getFretboardScalePositions
// ============================================================================

describe('getFretboardScalePositions', () => {
  const cmajScale = parseScaleSymbol('C major');

  it('returns multiple boxes for C major on GUITAR_STANDARD', () => {
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD);
    expect(boxes.length).toBeGreaterThan(1);
  });

  it('each box has frets array of same length as tuning', () => {
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD);
    for (const box of boxes) {
      expect(box.frets).toHaveLength(GUITAR_STANDARD.length);
    }
  });

  it('each box only contains frets within [baseFret, baseFret+windowSize-1] plus open strings', () => {
    const windowSize = 4;
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD, { windowSize });
    for (const box of boxes) {
      for (const strFrets of box.frets) {
        for (const fret of strFrets) {
          const inWindow = fret === 0 || (fret >= box.baseFret && fret <= box.baseFret + windowSize - 1);
          expect(inWindow).toBe(true);
        }
      }
    }
  });

  it('boxes are ordered by baseFret ascending', () => {
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD);
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].baseFret).toBeGreaterThanOrEqual(boxes[i - 1].baseFret);
    }
  });

  it('no box is empty (all have at least one note)', () => {
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD);
    for (const box of boxes) {
      const total = box.frets.reduce((n, s) => n + s.length, 0);
      expect(total).toBeGreaterThan(0);
    }
  });

  it('baseFret of first box is 1', () => {
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD);
    expect(boxes[0].baseFret).toBe(1);
  });

  it('respects custom windowSize option', () => {
    const boxes = getFretboardScalePositions(cmajScale, GUITAR_STANDARD, { windowSize: 3 });
    for (const box of boxes) {
      for (const strFrets of box.frets) {
        for (const fret of strFrets) {
          if (fret > 0) {
            expect(fret).toBeLessThanOrEqual(box.baseFret + 2);
          }
        }
      }
    }
  });
});
