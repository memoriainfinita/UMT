import { describe, it, expect } from 'vitest';
import { parseScaleSymbol } from '../../lib/music-theory/parser';

describe('Scale.getModalCharacteristics — brightness', () => {
  it('Lydian is brightest (+1)', () => {
    expect(parseScaleSymbol('F lydian').getModalCharacteristics().brightness).toBe(1);
  });
  it('Ionian = 0', () => {
    expect(parseScaleSymbol('C ionian').getModalCharacteristics().brightness).toBe(0);
  });
  it('Mixolydian = -1', () => {
    expect(parseScaleSymbol('G mixolydian').getModalCharacteristics().brightness).toBe(-1);
  });
  it('Dorian = -2', () => {
    expect(parseScaleSymbol('D dorian').getModalCharacteristics().brightness).toBe(-2);
  });
  it('Aeolian = -3', () => {
    expect(parseScaleSymbol('A aeolian').getModalCharacteristics().brightness).toBe(-3);
  });
  it('Phrygian = -4', () => {
    expect(parseScaleSymbol('E phrygian').getModalCharacteristics().brightness).toBe(-4);
  });
  it('Locrian = -5 (darkest)', () => {
    expect(parseScaleSymbol('B locrian').getModalCharacteristics().brightness).toBe(-5);
  });
});

describe('Scale.getModalCharacteristics — characteristic degrees (vs parallel Ionian)', () => {
  it('Ionian has none', () => {
    expect(parseScaleSymbol('C ionian').getModalCharacteristics().characteristicDegrees).toEqual([]);
  });
  it('Lydian: #4', () => {
    const c = parseScaleSymbol('C lydian').getModalCharacteristics();
    expect(c.characteristicDegrees).toEqual([4]);
    expect(c.characteristicIntervals).toEqual(['#4']);
  });
  it('Mixolydian: b7', () => {
    const c = parseScaleSymbol('C mixolydian').getModalCharacteristics();
    expect(c.characteristicDegrees).toEqual([7]);
    expect(c.characteristicIntervals).toEqual(['b7']);
  });
  it('Dorian: b3, b7', () => {
    const c = parseScaleSymbol('C dorian').getModalCharacteristics();
    expect(c.characteristicDegrees).toEqual([3, 7]);
    expect(c.characteristicIntervals).toEqual(['b3', 'b7']);
  });
  it('Phrygian: b2, b3, b6, b7', () => {
    const c = parseScaleSymbol('C phrygian').getModalCharacteristics();
    expect(c.characteristicDegrees).toEqual([2, 3, 6, 7]);
    expect(c.characteristicIntervals).toEqual(['b2', 'b3', 'b6', 'b7']);
  });
  it('Locrian: b2, b3, b5, b6, b7', () => {
    const c = parseScaleSymbol('C locrian').getModalCharacteristics();
    expect(c.characteristicDegrees).toEqual([2, 3, 5, 6, 7]);
    expect(c.characteristicIntervals).toEqual(['b2', 'b3', 'b5', 'b6', 'b7']);
  });
});

describe('Scale.getModalCharacteristics — avoid notes', () => {
  it('Ionian: [4] (4 above 3)', () => {
    expect(parseScaleSymbol('C ionian').getModalCharacteristics().avoidNotes).toEqual([4]);
  });
  it('Dorian: none', () => {
    expect(parseScaleSymbol('D dorian').getModalCharacteristics().avoidNotes).toEqual([]);
  });
  it('Phrygian: [2, 6]', () => {
    expect(parseScaleSymbol('E phrygian').getModalCharacteristics().avoidNotes).toEqual([2, 6]);
  });
  it('Lydian: none', () => {
    expect(parseScaleSymbol('F lydian').getModalCharacteristics().avoidNotes).toEqual([]);
  });
  it('Mixolydian: [4]', () => {
    expect(parseScaleSymbol('G mixolydian').getModalCharacteristics().avoidNotes).toEqual([4]);
  });
  it('Aeolian: [6] (b6 above 5)', () => {
    expect(parseScaleSymbol('A aeolian').getModalCharacteristics().avoidNotes).toEqual([6]);
  });
  it('Locrian: [2]', () => {
    expect(parseScaleSymbol('B locrian').getModalCharacteristics().avoidNotes).toEqual([2]);
  });
});

describe('Scale.getModalCharacteristics — parent scale', () => {
  it('D dorian → parent major, degree 2', () => {
    const c = parseScaleSymbol('D dorian').getModalCharacteristics();
    expect(c.parentScaleName).toBe('major');
    expect(c.parentModeDegree).toBe(2);
  });
  it('F lydian → parent major, degree 4', () => {
    const c = parseScaleSymbol('F lydian').getModalCharacteristics();
    expect(c.parentScaleName).toBe('major');
    expect(c.parentModeDegree).toBe(4);
  });
  it('E phrygian dominant → parent harmonic minor, degree 5', () => {
    const c = parseScaleSymbol('E phrygian dominant').getModalCharacteristics();
    expect(c.parentScaleName).toBe('harmonic minor');
    expect(c.parentModeDegree).toBe(5);
  });
  it('G lydian dominant → parent melodic minor, degree 4', () => {
    const c = parseScaleSymbol('G lydian dominant').getModalCharacteristics();
    expect(c.parentScaleName).toBe('melodic minor');
    expect(c.parentModeDegree).toBe(4);
  });
});

describe('Scale.getParentScale', () => {
  it('D dorian → C major', () => {
    const parent = parseScaleSymbol('D dorian').getParentScale();
    expect(parent).not.toBeNull();
    expect(parent!.name).toBe('C major');
    expect([...parent!.stepPattern]).toEqual([2, 2, 1, 2, 2, 2, 1]);
  });
  it('F lydian → C major', () => {
    const parent = parseScaleSymbol('F lydian').getParentScale();
    expect(parent!.name).toBe('C major');
  });
  it('G mixolydian → C major', () => {
    const parent = parseScaleSymbol('G mixolydian').getParentScale();
    expect(parent!.name).toBe('C major');
  });
  it('B locrian → C major', () => {
    const parent = parseScaleSymbol('B locrian').getParentScale();
    expect(parent!.name).toBe('C major');
  });
  it('A aeolian → C major', () => {
    const parent = parseScaleSymbol('A aeolian').getParentScale();
    expect(parent!.name).toBe('C major');
  });
  it('C ionian → C major (same scale)', () => {
    const parent = parseScaleSymbol('C ionian').getParentScale();
    expect(parent!.name).toBe('C major');
  });
  it('E phrygian dominant → A harmonic minor', () => {
    const parent = parseScaleSymbol('E phrygian dominant').getParentScale();
    expect(parent!.name).toBe('A harmonic minor');
  });
  it('Bb dorian → Ab major (flat spelling)', () => {
    const parent = parseScaleSymbol('Bb dorian').getParentScale();
    expect(parent!.name).toBe('Ab major');
  });
});

describe('Scale.getRelativeMode', () => {
  it('D dorian → relative lydian = F lydian', () => {
    const rel = parseScaleSymbol('D dorian').getRelativeMode('lydian');
    expect(rel!.name).toBe('F lydian');
  });
  it('D dorian → relative ionian = C ionian', () => {
    const rel = parseScaleSymbol('D dorian').getRelativeMode('ionian');
    expect(rel!.name).toBe('C ionian');
  });
  it('D dorian → relative aeolian = A aeolian', () => {
    const rel = parseScaleSymbol('D dorian').getRelativeMode('aeolian');
    expect(rel!.name).toBe('A aeolian');
  });
  it('C major → relative dorian = D dorian', () => {
    const rel = parseScaleSymbol('C major').getRelativeMode('dorian');
    expect(rel!.name).toBe('D dorian');
  });
  it('A aeolian → relative mixolydian = G mixolydian', () => {
    const rel = parseScaleSymbol('A aeolian').getRelativeMode('mixolydian');
    expect(rel!.name).toBe('G mixolydian');
  });
  it('returns null for cross-family modes (dorian → harmonic minor mode)', () => {
    const rel = parseScaleSymbol('D dorian').getRelativeMode('phrygian dominant');
    expect(rel).toBeNull();
  });
});
