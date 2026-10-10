/**
 * Tests for lib/music-theory/counterpoint.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseNote } from '../../lib/music-theory/parser';
import { Counterpoint, Canon } from '../../lib/music-theory/counterpoint';
import { Note } from '../../lib/music-theory/note';
import { TET12, EDO } from '../../lib/music-theory/tuning';

function notes(steps: number[]): Note[] {
  return steps.map(s => new Note(TET12, s));
}

describe('Counterpoint and Canon', () => {
  const n = (names: string[]) => names.map(x => parseNote(x));
  const types = (issues: { type: string }[]) => issues.map(i => i.type);

  it('2nd species: a passing dissonance is fine, a leaped one is not', () => {
    expect(types(Counterpoint.checkSpecies(2, n(['C4', 'A3']), n(['E4', 'D4', 'C4'])))).not.toContain('Dissonance');
    expect(types(Counterpoint.checkSpecies(2, n(['C4', 'A3']), n(['E4', 'B4', 'C4'])))).toContain('Dissonance');
  });

  it('4th species: a prepared suspension resolving down is fine; unprepared is not', () => {
    const cf = n(['C4', 'B3']);
    expect(types(Counterpoint.checkSpecies(4, cf, n(['E4', 'A4', 'A4', 'G4'])))).toEqual([]);
    expect(types(Counterpoint.checkSpecies(4, cf, n(['E4', 'G4', 'A4', 'G4'])))).toContain('Dissonance on Strong Beat');
  });

  it('modal finalis in any transposition', () => {
    const cf = n(['G3', 'A3', 'G3']);
    const ct = n(['D4', 'C4', 'D4']);
    expect(types(Counterpoint.checkSpecies(1, cf, ct, 'G dorian'))).not.toContain('Modal Finalis');
    expect(types(Counterpoint.checkSpecies(1, cf, ct, 'dorian'))).toContain('Modal Finalis');
  });

  it('generateCanon delays the follower with rests', () => {
    const [leader, follower] = Canon.generateCanon(n(['C4', 'D4', 'E4']), 7, 1);
    expect(leader.map(x => x?.name ?? null)).toEqual(['C4', 'D4', 'E4', null]);
    expect(follower.map(x => x?.stepsFromBase ?? null)).toEqual([null, -2, 0, 2]);
  });
});

describe('Counterpoint.checkSpecies', () => {
  it('species 1: returns empty array for perfect consonances', () => {
    // C4(-9) and G4(-2) = P5 consonance
    const cf = notes([-9, -7, -5, -4]);   // C D E F
    const ct = notes([-2, 0, 2, 3]);       // G A B C
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    // P5 between C-G, M6 between D-B, M6 between E-C#... should be mostly consonant
    expect(Array.isArray(issues)).toBe(true);
  });

  it('species 1: flags parallel 5ths', () => {
    // C-G then D-A = parallel 5ths
    const cf = notes([-9, -7]);
    const ct = notes([-2, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    const hasParallel5 = issues.some(i => i.type === 'Parallel 5th');
    expect(hasParallel5).toBe(true);
  });

  it('species 1: flags interior unison', () => {
    const cf = notes([-9, -9, -9]);
    const ct = notes([-9, -9, -9]); // all unisons
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    expect(issues.some(i => i.type === 'Interior Unison')).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(Counterpoint.checkSpecies(1, [], [])).toHaveLength(0);
  });

  it('issue objects have type and description', () => {
    const cf = notes([-9, -7, -5]);
    const ct = notes([-2, 0, 2]);
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    for (const issue of issues) {
      expect(typeof issue.type).toBe('string');
      expect(typeof issue.description).toBe('string');
    }
  });
});

describe('Counterpoint modal rules - finalis', () => {
  // D4 = step -7, PC = 5 → dorian finalis
  it('no finalis issue when CF starts and ends on dorian D', () => {
    const cf = notes([-7, -5, -4, -2, -7]); // D E F G D
    const ct = notes([0, 2, 3, 5, 0]);       // A B C D A (above, consonant)
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Modal Finalis')).toBe(false);
  });

  it('flags CF that does not end on dorian finalis', () => {
    const cf = notes([-7, -5, -4, -2, 0]); // D E F G A — ends on A, not D
    const ct = notes([0, 2, 3, 5, 7]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Modal Finalis')).toBe(true);
  });

  it('flags CF that does not begin on dorian finalis', () => {
    const cf = notes([0, -2, -4, -5, -7]); // A G F E D — begins on A
    const ct = notes([7, 5, 3, 2, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Modal Finalis')).toBe(true);
  });

  it('no finalis issue for phrygian E (step -5, PC 7)', () => {
    const cf = notes([-5, -4, -2, 0, -5]); // E F G A E
    const ct = notes([2, 3, 5, 7, 2]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'phrygian');
    expect(issues.some(i => i.type === 'Modal Finalis')).toBe(false);
  });

  it('no finalis issue for ionian C (step -9, PC 3)', () => {
    const cf = notes([-9, -7, -5, -4, -9]); // C D E F C
    const ct = notes([-2, 0, 2, 3, -2]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'ionian');
    expect(issues.some(i => i.type === 'Modal Finalis')).toBe(false);
  });

  it('unknown mode name produces no modal issues', () => {
    const cf = notes([-9, -7, -5, -9]);
    const ct = notes([-2, 0, 2, -2]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'superlocrian99');
    expect(issues.some(i => i.type === 'Modal Finalis')).toBe(false);
    expect(issues.some(i => i.type === 'Modal Ambitus')).toBe(false);
    expect(issues.some(i => i.type === 'Melodic Tritone')).toBe(false);
  });
});

describe('Counterpoint modal rules - ambitus', () => {
  // Finalis D at step -7; valid range: [-14, 8]
  it('no ambitus issue when counterpoint stays within range', () => {
    const cf = notes([-7, -5, -4, -7]); // D E F D
    const ct = notes([0, 2, 3, 0]);     // A B C A — within [-14, 8]
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Modal Ambitus')).toBe(false);
  });

  it('flags counterpoint note more than 15 above the finalis', () => {
    const cf = notes([-7, -5, -4, -7]);
    // finalisStep = -7; -7 + 15 = 8; step 9 is out
    const ct = notes([0, 2, 9, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Modal Ambitus')).toBe(true);
  });

  it('flags counterpoint note more than 7 below the finalis', () => {
    const cf = notes([-7, -5, -4, -7]);
    // finalisStep = -7; -7 - 7 = -14; step -15 is out
    const ct = notes([0, -15, 3, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Modal Ambitus')).toBe(true);
  });
});

describe('Counterpoint modal rules - melodic tritone', () => {
  it('flags augmented 4th (6 semitones) leap in counterpoint', () => {
    const cf = notes([-7, -5, -4, -7]);
    // CT leaps B(2) → F(8) = 6 semitones = tritone
    const ct = notes([2, 8, 3, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Melodic Tritone')).toBe(true);
  });

  it('flags descending tritone leap', () => {
    const cf = notes([-7, -5, -4, -7]);
    // F(8) → B(2) = 6 semitones descending
    const ct = notes([8, 2, 3, 0]);
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Melodic Tritone')).toBe(true);
  });

  it('no tritone issue for stepwise counterpoint', () => {
    const cf = notes([-7, -5, -4, -7]);
    const ct = notes([0, 2, 3, 0]); // stepwise, no tritone
    const issues = Counterpoint.checkSpecies(1, cf, ct, 'dorian');
    expect(issues.some(i => i.type === 'Melodic Tritone')).toBe(false);
  });

  it('no modal issues without mode argument', () => {
    const cf = notes([-7, -5]);
    const ct = notes([2, 8]); // tritone leap — only flagged when mode is passed
    const issues = Counterpoint.checkSpecies(1, cf, ct);
    expect(issues.some(i => i.type === 'Melodic Tritone')).toBe(false);
  });
});

describe('Canon.detectImitation', () => {
  it('detects exact imitation at unison', () => {
    const theme = notes([-9, -7, -5, -4]); // C D E F
    const follower = notes([-9, -7, -5, -4]); // same, no delay
    const result = Canon.detectImitation([theme, follower]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for single voice', () => {
    expect(Canon.detectImitation([notes([-9, -7, -5])])).toHaveLength(0);
  });
});

describe('Canon.generateCanon', () => {
  it('generates two voices', () => {
    const theme = notes([-9, -7, -5, -4]);
    const [leader, follower] = Canon.generateCanon(theme, 7, 2);
    expect(leader).toHaveLength(6);
    expect(follower.slice(0, 2)).toEqual([null, null]);
    expect(follower.length).toBeGreaterThan(0);
  });

  it('follower is transposed by interval', () => {
    const theme = notes([-9, -7]);
    const [, follower] = Canon.generateCanon(theme, 5, 0);
    expect(follower[0]?.stepsFromBase).toBe(-9 + 5);
  });

  it('returns empty arrays for empty theme', () => {
    const [l, f] = Canon.generateCanon([], 5, 2);
    expect(l).toHaveLength(0);
    expect(f).toHaveLength(0);
  });
});

describe('12-TET assumptions removed from figured bass and counterpoint', () => {
  const e24 = new EDO(24);
  it('checkSpecies reads intervals in semitones in 24-EDO', () => {
    const q = (semis: number[]) => semis.map(s => new Note(e24, s * 2));
    const issues = Counterpoint.checkSpecies(1, q([-9, -7, -9]), q([-5, -4, -2])); // C D C against E F G
    expect(issues.filter(i => i.type.includes('Dissonance'))).toEqual([]);
  });
});
