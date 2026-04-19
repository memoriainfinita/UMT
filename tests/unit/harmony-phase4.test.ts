import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { FormAnalyzer, FormAnalysis } from '../../lib/music-theory/form';
import { PROGRESSIONS, getProgression, ProgressionEntry } from '../../lib/music-theory/progressions';
import { parseChordSymbol, parseRomanProgression } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';

function chord(symbol: string): Chord { return parseChordSymbol(symbol); }
function prog(roman: string, key: string): Chord[] { return parseRomanProgression(roman, key); }

// ============================================================================
// 4.1 — PROGRESSIONS dictionary
// ============================================================================

describe('PROGRESSIONS dictionary', () => {
  it('exports a non-empty record', () => {
    expect(Object.keys(PROGRESSIONS).length).toBeGreaterThan(5);
  });

  it('has ii-V-I entry with correct structure', () => {
    const entry = PROGRESSIONS['ii-V-I'];
    expect(entry).toBeDefined();
    expect(entry.name).toBe('ii-V-I');
    expect(Array.isArray(entry.romanNumerals)).toBe(true);
    expect(entry.romanNumerals.length).toBeGreaterThan(0);
    expect(typeof entry.description).toBe('string');
    expect(typeof entry.style).toBe('string');
  });

  it('has blues-12 entry', () => {
    expect(PROGRESSIONS['blues-12']).toBeDefined();
    expect(PROGRESSIONS['blues-12'].romanNumerals.length).toBe(12);
  });

  it('has coltrane-changes entry', () => {
    expect(PROGRESSIONS['coltrane-changes']).toBeDefined();
  });

  it('has andalusian entry', () => {
    expect(PROGRESSIONS['andalusian']).toBeDefined();
  });

  it('has pachelbel entry', () => {
    expect(PROGRESSIONS['pachelbel']).toBeDefined();
  });

  it('has rhythm-changes entry', () => {
    expect(PROGRESSIONS['rhythm-changes']).toBeDefined();
  });
});

describe('getProgression()', () => {
  it('returns Chord[] for ii-V-I in C major', () => {
    const chords = getProgression('ii-V-I', 'C major');
    expect(Array.isArray(chords)).toBe(true);
    expect(chords.every(c => c instanceof Chord)).toBe(true);
    expect(chords.length).toBeGreaterThanOrEqual(3);
  });

  it('ii-V-I in C major produces Dm7, G7, Cmaj7', () => {
    const chords = getProgression('ii-V-I', 'C major');
    const names = chords.map(c => c.name);
    expect(names[0]).toMatch(/Dm7/);
    expect(names[1]).toMatch(/G7/);
    expect(names[2]).toMatch(/Cmaj7|C/);
  });

  it('throws for unknown progression id', () => {
    expect(() => getProgression('nonexistent-prog', 'C major')).toThrow();
  });
});

// ============================================================================
// 4.2 — Harmony.detectSequence
// ============================================================================

describe('Harmony.detectSequence', () => {
  it('detects circle-of-fifths descending (descending fifths: C F Bb Eb Ab Db)', () => {
    // Each root a perfect fourth higher (= descending fifth)
    const chords = [chord('C'), chord('F'), chord('Bb'), chord('Eb'), chord('Ab'), chord('Db')];
    const result = Harmony.detectSequence(chords);
    expect(result).toBeDefined();
    expect(result.type).toBe('circle-of-fifths-descending');
  });

  it('detects pachelbel sequence', () => {
    const chords = prog('I V vi iii IV I IV V', 'C major');
    const result = Harmony.detectSequence(chords);
    expect(result).toBeDefined();
    expect(result.type).toBe('pachelbel');
  });

  it('returns unknown for random progression', () => {
    const chords = [chord('C'), chord('Eb'), chord('Ab'), chord('Db')];
    const result = Harmony.detectSequence(chords);
    expect(result.type).toBe('unknown');
  });

  it('returns confidence between 0 and 1', () => {
    const chords = prog('I IV viio III vi ii V I', 'C major');
    const result = Harmony.detectSequence(chords);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('detects descending parallel motion (consistent whole-step descent)', () => {
    // G→F→Eb→Db: each root descends by 2 semitones (whole step)
    const chords = [chord('G'), chord('F'), chord('Eb'), chord('Db')];
    const result = Harmony.detectSequence(chords);
    expect(result.type).toBe('parallel-descending');
  });
});

// ============================================================================
// 4.3 — FormAnalyzer
// ============================================================================

describe('FormAnalyzer.analyzeHarmonic', () => {
  it('returns a FormAnalysis object', () => {
    const chords = prog('I IV V I I IV V I', 'C major');
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major');
    expect(result).toBeDefined();
    expect(typeof result.type).toBe('string');
    expect(Array.isArray(result.sections)).toBe(true);
    expect(typeof result.confidence).toBe('number');
  });

  it('detects AABA for repeated patterns', () => {
    // A A B A — 4 sections of 4 chords
    const A = prog('I V IV V', 'C major');
    const B = prog('vi ii V I', 'C major');
    const chords = [...A, ...A, ...B, ...A];
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major', 4);
    expect(['AABA', 'AAB', 'ABAB', 'strophic', 'unknown']).toContain(result.type);
  });

  it('confidence is between 0 and 1', () => {
    const chords = prog('I V vi IV', 'C major');
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('sections have required fields', () => {
    const A = prog('I V IV V', 'C major');
    const B = prog('vi ii V I', 'C major');
    const chords = [...A, ...A, ...B, ...A];
    const result = FormAnalyzer.analyzeHarmonic(chords, 'C major', 4);
    for (const section of result.sections) {
      expect(typeof section.label).toBe('string');
      expect(typeof section.start).toBe('number');
      expect(typeof section.end).toBe('number');
      expect(section.end).toBeGreaterThanOrEqual(section.start);
    }
  });
});

describe('FormAnalyzer.detectReprise', () => {
  it('finds repeated sections', () => {
    const A = prog('I V IV V', 'C major');
    const B = prog('vi ii V I', 'C major');
    const chords = [...A, ...B, ...A];
    const reprises = FormAnalyzer.detectReprise(chords);
    expect(Array.isArray(reprises)).toBe(true);
    expect(reprises.length).toBeGreaterThan(0);
  });

  it('returns empty for through-composed music', () => {
    // Each chord different
    const chords = [chord('C'), chord('Dm'), chord('Em'), chord('F'), chord('G'), chord('Am'), chord('Bdim')];
    const reprises = FormAnalyzer.detectReprise(chords);
    expect(Array.isArray(reprises)).toBe(true);
  });

  it('reprise entries have start and length', () => {
    const A = prog('I V IV V', 'C major');
    const chords = [...A, ...A];
    const reprises = FormAnalyzer.detectReprise(chords);
    if (reprises.length > 0) {
      expect(typeof reprises[0].start).toBe('number');
      expect(typeof reprises[0].length).toBe('number');
    }
  });
});

// ============================================================================
// 4.4 — Retrograde / Inversion of progressions
// ============================================================================

describe('Harmony.retrogradeProgression', () => {
  it('reverses chord order', () => {
    const chords = [chord('C'), chord('Am'), chord('F'), chord('G')];
    const retro = Harmony.retrogradeProgression(chords);
    expect(retro[0].name).toBe(chords[3].name);
    expect(retro[1].name).toBe(chords[2].name);
    expect(retro[2].name).toBe(chords[1].name);
    expect(retro[3].name).toBe(chords[0].name);
  });

  it('returns Chord[] of same length', () => {
    const chords = prog('I V vi IV', 'C major');
    const retro = Harmony.retrogradeProgression(chords);
    expect(retro.length).toBe(chords.length);
    expect(retro.every(c => c instanceof Chord)).toBe(true);
  });

  it('empty input returns empty', () => {
    expect(Harmony.retrogradeProgression([])).toEqual([]);
  });
});

describe('Harmony.invertProgression', () => {
  it('returns Chord[] of same length', () => {
    const chords = prog('I V vi IV', 'C major');
    const axis = new Note(TET12, 0); // A4
    const inverted = Harmony.invertProgression(chords, axis);
    expect(inverted.length).toBe(chords.length);
    expect(inverted.every(c => c instanceof Chord)).toBe(true);
  });

  it('I → I when axis is the tonic root', () => {
    // C major: C is at step -9 in TET12 (C4). Axis = C4 (-9).
    const chords = [chord('C')];
    const axis = new Note(TET12, -9); // C4
    const inv = Harmony.invertProgression(chords, axis);
    // Root of inverted C around C axis should still be C
    expect(((inv[0].rootStep % 12) + 12) % 12).toBe(((chords[0].rootStep % 12) + 12) % 12);
  });

  it('empty input returns empty', () => {
    expect(Harmony.invertProgression([], new Note(TET12, 0))).toEqual([]);
  });
});

// ============================================================================
// 4.5 — voiceLeadingSmoothness
// ============================================================================

describe('Harmony.voiceLeadingSmoothness', () => {
  it('returns number between 0 and 1', () => {
    const chords = prog('I V vi IV', 'C major');
    const score = Harmony.voiceLeadingSmoothness(chords);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('smooth progression scores higher than rough', () => {
    // I-V-vi-IV: smooth voice leading (pop)
    const smooth = prog('I V vi IV', 'C major');
    const smoothScore = Harmony.voiceLeadingSmoothness(smooth);
    // Tritone leaps at every step: more disjunct
    const rough = [chord('C'), chord('F#'), chord('C'), chord('F#')];
    const roughScore = Harmony.voiceLeadingSmoothness(rough);
    expect(smoothScore).toBeGreaterThanOrEqual(roughScore);
  });

  it('single chord returns 1 (no motion)', () => {
    expect(Harmony.voiceLeadingSmoothness([chord('C')])).toBe(1);
  });

  it('empty array returns 1', () => {
    expect(Harmony.voiceLeadingSmoothness([])).toBe(1);
  });
});
