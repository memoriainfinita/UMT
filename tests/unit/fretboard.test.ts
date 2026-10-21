/**
 * Tests for lib/music-theory/fretboard.ts.
 */
import { describe, it, expect } from 'vitest';
import { getFretboardVoicings, getFretboardScale, getFretboardScalePositions, getFretboardScaleShapes, GUITAR_STANDARD, GUITAR_DROPPED_D, GUITAR_OPEN_G, UKULELE_STANDARD, BASS_STANDARD, BANJO_OPEN_G, FretboardVoicingResult } from '../../lib/music-theory/fretboard';
import { parseChordSymbol, parseScaleSymbol } from '../../lib/music-theory/parser';
import { Scale } from '../../lib/music-theory/scale';

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
  it('BANJO_OPEN_G has 5 strings', () => {
    expect(BANJO_OPEN_G).toHaveLength(5);
  });
  it('BANJO_OPEN_G drone (index 0) is G4 = -2', () => {
    expect(BANJO_OPEN_G[0]).toBe(-2);
  });
});

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

describe('stringOffset', () => {
  const banjoOffset = [5, 0, 0, 0, 0];
  const gmaj = parseChordSymbol('G');
  const gmajScale = parseScaleSymbol('G major');
  const oct = 12;

  it('getFretboardVoicings: drone open fret equals offset (5)', () => {
    const voicings = getFretboardVoicings(gmaj, BANJO_OPEN_G, { stringOffset: banjoOffset });
    expect(voicings.length).toBeGreaterThan(0);
    // Any voicing where drone is played open must have frets[0] === 5
    const withOpenDrone = voicings.filter(v => {
      const droneInternal = v.frets[0] - 5; // remove offset
      return droneInternal === 0;
    });
    for (const v of withOpenDrone) {
      expect(v.frets[0]).toBe(5);
    }
  });

  it('getFretboardVoicings: all chord PCs covered with offset', () => {
    const voicings = getFretboardVoicings(gmaj, BANJO_OPEN_G, { stringOffset: banjoOffset });
    const chordPCs = new Set(gmaj.getPitchClasses());
    for (const v of voicings) {
      const covered = new Set<number>();
      for (let i = 0; i < v.frets.length; i++) {
        const internalFret = v.frets[i] - (banjoOffset[i] ?? 0);
        if (internalFret >= 0) {
          covered.add(((BANJO_OPEN_G[i] + internalFret) % oct + oct) % oct);
        }
      }
      for (const pc of chordPCs) {
        expect(covered.has(pc)).toBe(true);
      }
    }
  });

  it('getFretboardVoicings: stringOffset echoed in result', () => {
    const voicings = getFretboardVoicings(gmaj, BANJO_OPEN_G, { stringOffset: banjoOffset });
    expect(voicings.length).toBeGreaterThan(0);
    expect(voicings[0].stringOffset).toEqual(banjoOffset);
  });

  it('getFretboardVoicings: no stringOffset in result when not supplied', () => {
    const voicings = getFretboardVoicings(gmaj, GUITAR_STANDARD);
    expect(voicings.length).toBeGreaterThan(0);
    expect(voicings[0].stringOffset).toBeUndefined();
  });

  it('getFretboardScale: drone positions start at offset (5)', () => {
    const result = getFretboardScale(gmajScale, BANJO_OPEN_G, { stringOffset: banjoOffset });
    // All drone frets must be >= 5
    for (const fret of result.frets[0]) {
      expect(fret).toBeGreaterThanOrEqual(5);
    }
  });

  it('getFretboardScale: all fret positions belong to the scale', () => {
    const result = getFretboardScale(gmajScale, BANJO_OPEN_G, { stringOffset: banjoOffset });
    const scalePCs = new Set(gmajScale.getPitchClasses());
    result.frets.forEach((strFrets, i) => {
      const off = banjoOffset[i] ?? 0;
      for (const fret of strFrets) {
        const pc = ((BANJO_OPEN_G[i] + (fret - off)) % oct + oct) % oct;
        expect(scalePCs.has(pc)).toBe(true);
      }
    });
  });

  it('getFretboardScale: stringOffset echoed in result', () => {
    const result = getFretboardScale(gmajScale, BANJO_OPEN_G, { stringOffset: banjoOffset });
    expect(result.stringOffset).toEqual(banjoOffset);
  });

  it('getFretboardScalePositions: drone positions start at offset (5)', () => {
    const boxes = getFretboardScalePositions(gmajScale, BANJO_OPEN_G, { stringOffset: banjoOffset });
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      for (const fret of box.frets[0]) {
        expect(fret).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('getFretboardScalePositions: stringOffset echoed in result', () => {
    const boxes = getFretboardScalePositions(gmajScale, BANJO_OPEN_G, { stringOffset: banjoOffset });
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes[0].stringOffset).toEqual(banjoOffset);
  });
});

describe('scale degrees and the written root on the fretboard', () => {
  it('every note carries its scale degree', () => {
    const map = getFretboardScale(parseScaleSymbol('G major'), GUITAR_STANDARD);
    expect(map.degrees.map(d => d.length)).toEqual(map.frets.map(f => f.length));
    // low E string: E(6) F#(7) G(1) A(2) at frets 0 2 3 5
    expect(map.frets[0].slice(0, 4)).toEqual([0, 2, 3, 5]);
    expect(map.degrees[0].slice(0, 4)).toEqual([6, 7, 1, 2]);
    const box = getFretboardScalePositions(parseScaleSymbol('G major'), GUITAR_STANDARD)[0];
    expect(box.degrees.map(d => d.length)).toEqual(box.frets.map(f => f.length));
  });

  it('the root is the written letter of the scale, whatever its flat preference', () => {
    const scale = parseScaleSymbol('F# lydian');
    const flats = new Scale('F# lydian', scale.tuningSystem, scale.rootStep, scale.stepPattern, true);
    expect(getFretboardScale(flats, GUITAR_STANDARD).root).toBe('F#');
    expect(getFretboardScaleShapes(flats, GUITAR_STANDARD, { system: 'caged' })[0].root).toBe('F#');
  });
});

describe('getFretboardScaleShapes - CAGED', () => {
  const caged = (sym: string, tuning: readonly number[] = GUITAR_STANDARD) =>
    getFretboardScaleShapes(parseScaleSymbol(sym), tuning, { system: 'caged' });

  it('five named shapes that climb the neck from the E shape', () => {
    const g = caged('G major');
    expect(g.map(s => s.name)).toEqual(['E shape', 'D shape', 'C shape', 'A shape', 'G shape']);
    expect(g.map(s => s.startDegree)).toEqual([1, 2, 3, 5, 6]);
    // G major, E shape: the barre at fret 3 (frets 2 to 5)
    expect(g[0].frets).toEqual([[2, 3, 5], [2, 3, 5], [2, 4, 5], [2, 4, 5], [3, 5], [2, 3, 5]]);
    // G shape in open position
    expect(g[4].frets).toEqual([[0, 2, 3], [0, 2, 3], [0, 2], [0, 2], [0, 1, 3], [0, 2, 3]]);
  });

  it('every shape holds every degree once per pitch, within a stretch of four frets', () => {
    for (const sym of ['C major', 'E major', 'F# lydian', 'Bb major', 'D dorian', 'C# minor', 'G mixolydian']) {
      for (const s of caged(sym)) {
        expect(new Set(s.degrees.flat()).size, `${sym} ${s.name}`).toBe(7);
        const pitches = s.frets.flatMap((fs, i) => fs.map(f => GUITAR_STANDARD[i] + f));
        expect(new Set(pitches).size, `${sym} ${s.name}`).toBe(pitches.length);
        expect(s.span, `${sym} ${s.name}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('a minor tonic triad gives the minor shapes', () => {
    expect(caged('A minor').map(s => s.name)).toEqual(['Em shape', 'Dm shape', 'Cm shape', 'Am shape', 'Gm shape']);
  });

  it('only the 6-string guitar in standard tuning, and scales that hold their pentatonic', () => {
    expect(caged('C major', BASS_STANDARD)).toEqual([]);
    expect(caged('C major', GUITAR_DROPPED_D)).toEqual([]);
    expect(caged('A harmonic minor')).toEqual([]);
    // transposed standard tuning (a semitone down) still works
    expect(caged('C major', GUITAR_STANDARD.map(t => t - 1))).toHaveLength(5);
  });
});

describe('getFretboardScaleShapes - three notes per string', () => {
  const nps = (sym: string, tuning: readonly number[] = GUITAR_STANDARD) =>
    getFretboardScaleShapes(parseScaleSymbol(sym), tuning, { system: '3nps' });

  it('one pattern per degree, three consecutive notes on each string', () => {
    const g = nps('G major');
    expect(g).toHaveLength(7);
    expect(g.map(s => s.name)).toEqual(['Pattern 1', 'Pattern 2', 'Pattern 3', 'Pattern 4', 'Pattern 5', 'Pattern 6', 'Pattern 7']);
    expect(g.every(s => s.frets.every(f => f.length === 3))).toBe(true);
    // pattern 1 of G major: G A B on the low E string, frets 3 5 7
    expect(g[0].frets[0]).toEqual([3, 5, 7]);
    expect(g[0].degrees.flat()).toEqual([1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4]);
  });

  it('any tuning and string count; the span shows what a hand can reach', () => {
    expect(nps('C major', BASS_STANDARD)).toHaveLength(7);
    expect(nps('C major', GUITAR_DROPPED_D)).toHaveLength(7);
    expect(Math.max(...nps('G major').map(s => s.span))).toBeLessThanOrEqual(6);
    expect(nps('C major', UKULELE_STANDARD).every(s => s.span > 6)).toBe(true);
  });
});
