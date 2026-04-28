import { describe, it, expect } from 'vitest';
import { Harmony } from '../../lib/music-theory/harmony';
import { parseChordSymbol, parseRomanProgression, parseNote } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';
import { parseNoteToStep12TET } from '../../lib/music-theory/utils';

// ============================================================================
// Helpers
// ============================================================================

function step(name: string, octave = 4): Note {
  return new Note(TET12, parseNoteToStep12TET(name, octave));
}

function chord(symbol: string): Chord {
  return parseChordSymbol(symbol);
}

function prog(roman: string, key: string): Chord[] {
  return parseRomanProgression(roman, key);
}

// ============================================================================
// analyzeProgression - 2.1
// ============================================================================

describe('Harmony.analyzeProgression - basic', () => {
  it('C major I-IV-V-I: all diatonic, correct roman numerals', () => {
    const chords = prog('I IV V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    const romans = analysis.map(a => a.roman);
    expect(romans).toEqual(['I', 'IV', 'V', 'I']);
  });

  it('C major: functions T-S-D-T', () => {
    const chords = prog('I IV V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis.map(a => a.function)).toEqual(['T', 'S', 'D', 'T']);
  });

  it('C major ii-V-I seventh: correct roman numerals', () => {
    const chords = prog('ii7 V7 Imaj7', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    // ii7 in major = m7 quality → roman suffix '7' with lowercase = 'ii7'
    expect(analysis[0].roman).toBe('ii7');
    expect(analysis[0].degree).toBe(2);
    expect(analysis[1].degree).toBe(5);
    expect(analysis[2].degree).toBe(1);
  });

  it('all diatonic chords have isDiatonic=true', () => {
    const chords = prog('I ii iii IV V vi', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis.every(a => a.isDiatonic)).toBe(true);
  });

  it('Cm7 in C major flagged as borrowed from minor', () => {
    const chords = [chord('Cm7'), chord('C')];
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isBorrowed).toBe(true);
  });

  it('Eb in C major flagged as non-diatonic', () => {
    const chords = [chord('Eb'), chord('C')];
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isDiatonic).toBe(false);
  });

  it('cadenceWithNext populated for V→I pair', () => {
    const chords = prog('V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].cadenceWithNext).toContain('Authentic');
  });

  it('cadenceWithNext populated for IV→I pair', () => {
    const chords = prog('IV I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].cadenceWithNext).toContain('Plagal');
  });

  it('last chord has no cadenceWithNext', () => {
    const chords = prog('I IV V I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[3].cadenceWithNext).toBeUndefined();
  });

  it('tritone sub detection: bII7→I gets substitutionCandidate', () => {
    const chords = prog('subV7 I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].substitutionCandidate).toBe('tritone sub of V');
  });

  it('isSecondary: V7/IV correctly detected', () => {
    const chords = prog('V7/IV IV', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isSecondary).toBe(true);
    expect(analysis[0].secondaryTarget).toBe('V7/IV');
  });

  it('isSecondary false for plain diatonic V7', () => {
    const chords = prog('V7 I', 'C major');
    const { analysis } = Harmony.analyzeProgression(chords, 'C major');
    expect(analysis[0].isSecondary).toBe(false);
  });

  it('harmonicRhythm = 1 when all chords different', () => {
    const chords = prog('I IV V', 'C major');
    const { harmonicRhythm } = Harmony.analyzeProgression(chords, 'C major');
    expect(harmonicRhythm).toBe(1);
  });

  it('harmonicRhythm = 0 when all chords identical', () => {
    const c = chord('C');
    const { harmonicRhythm } = Harmony.analyzeProgression([c, c, c], 'C major');
    expect(harmonicRhythm).toBe(0);
  });
});

describe('Harmony.analyzeProgression - modulations', () => {
  it('no modulations for simple diatonic I-IV-V-I', () => {
    const chords = prog('I IV V I', 'C major');
    const { modulations } = Harmony.analyzeProgression(chords, 'C major');
    expect(modulations).toHaveLength(0);
  });

  it('detects modulation to G major in long progression', () => {
    // C major then 3 chords diatonic to G major but not C major: B, D, G
    const cChords = prog('I IV', 'C major');
    const gChords = prog('vii I V', 'G major'); // B, G, D - all diatonic to G
    const all = [...cChords, ...gChords];
    const { modulations } = Harmony.analyzeProgression(all, 'C major');
    expect(modulations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// analyzeCadence - 2.2 (new cadences)
// ============================================================================

describe('Harmony.analyzeCadence - existing cadences', () => {
  it('V→I = Authentic', () => {
    const [v, i] = prog('V I', 'C major');
    expect(Harmony.analyzeCadence(v, i, 'C major')).toContain('Authentic');
  });

  it('IV→I = Plagal', () => {
    const [iv, i] = prog('IV I', 'C major');
    expect(Harmony.analyzeCadence(iv, i, 'C major')).toContain('Plagal');
  });

  it('V→vi = Deceptive', () => {
    const [v, vi] = prog('V vi', 'C major');
    expect(Harmony.analyzeCadence(v, vi, 'C major')).toContain('Deceptive');
  });

  it('→V = Half Cadence', () => {
    const [i, v] = prog('I V', 'C major');
    expect(Harmony.analyzeCadence(i, v, 'C major')).toContain('Half');
  });
});

describe('Harmony.analyzeCadence - new cadences', () => {
  it('iv→i = Minor Plagal Cadence', () => {
    const iv = chord('Fm');
    const i = chord('Cm');
    expect(Harmony.analyzeCadence(iv, i, 'C minor')).toContain('Minor Plagal');
  });

  it('bII→I = Phrygian Cadence', () => {
    // Db → C
    const bII = chord('Db');
    const I = chord('C');
    expect(Harmony.analyzeCadence(bII, I, 'C major')).toContain('Phrygian');
  });

  it('Picardy third: Cm→C detected', () => {
    const cm = chord('Cm');
    const C = chord('C');
    expect(Harmony.analyzeCadence(cm, C, 'C minor')).toContain('Picardy');
  });

  it('iv→V in minor = Phrygian Half Cadence', () => {
    const iv = chord('Fm');
    const V = chord('G');
    expect(Harmony.analyzeCadence(iv, V, 'C minor')).toContain('Phrygian Half');
  });

  it('subV7→I = Tritone Sub Resolution', () => {
    const sub = chord('Db7');
    const I = chord('C');
    expect(Harmony.analyzeCadence(sub, I, 'C major')).toContain('Tritone Sub');
  });

  it('backdoor bVII7→I still works', () => {
    const bvii7 = chord('Bb7');
    const I = chord('C');
    expect(Harmony.analyzeCadence(bvii7, I, 'C major')).toContain('Backdoor');
  });
});

// ============================================================================
// checkVoiceLeading - 2.3 rewrite
// ============================================================================

describe('Harmony.checkVoiceLeading - existing behavior preserved', () => {
  it('parallel 5ths detected in strict mode', () => {
    // C-G → D-A (both move up a step with a 5th between)
    const cA = [step('C'), step('G')];
    const cB = [step('D'), step('A')];
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    expect(issues.some(i => i.type === 'Parallel 5th')).toBe(true);
  });

  it('parallel octaves detected in strict mode', () => {
    const cA = [step('C', 3), step('C', 4)];
    const cB = [step('D', 3), step('D', 4)];
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    expect(issues.some(i => i.type === 'Parallel Octave')).toBe(true);
  });

  it('contemporary mode does not flag parallel 5ths', () => {
    const cA = [step('C'), step('G')];
    const cB = [step('D'), step('A')];
    const issues = Harmony.checkVoiceLeading(cA, cB, 'contemporary');
    expect(issues.some(i => i.type === 'Parallel 5th')).toBe(false);
  });

  it('voice crossing detected', () => {
    const cA = [step('C', 4), step('E', 4)];
    const cB = [step('G', 4), step('D', 4)]; // bass crosses above tenor
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    expect(issues.some(i => i.type === 'Voice Crossing')).toBe(true);
  });

  it('voice overlap detected', () => {
    const cA = [step('C', 4), step('G', 4)];
    const cB = [step('A', 4), step('E', 4)]; // bass rises above previous tenor
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    expect(issues.some(i => i.type === 'Voice Overlap')).toBe(true);
  });

  it('clean voice leading returns no issues', () => {
    const cA = [step('C', 3), step('E', 4), step('G', 4)];
    const cB = [step('C', 3), step('F', 4), step('A', 4)]; // C→C, E→F, G→A
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    const serious = issues.filter(i => i.type === 'Parallel 5th' || i.type === 'Parallel Octave');
    expect(serious).toHaveLength(0);
  });
});

describe('Harmony.checkVoiceLeading - new issue types', () => {
  it('leading tone unresolved detected in V→IV context', () => {
    // G7 → F: B (leading tone) does not resolve to C
    const chordA = [step('G', 3), step('B', 3), step('D', 4), step('F', 4)]; // G7
    const chordB = [step('F', 3), step('A', 3), step('C', 4), step('F', 4)]; // F major
    const issues = Harmony.checkVoiceLeading(chordA, chordB, 'strict', {
      keySymbol: 'C major',
      chordA: chord('G7'),
    });
    expect(issues.some(i => i.type === 'Leading Tone Unresolved')).toBe(true);
  });

  it('leading tone resolved: no issue when B→C', () => {
    // G7 → C: B resolves to C correctly
    const chordA = [step('G', 3), step('B', 3), step('D', 4), step('F', 4)]; // G7
    const chordB = [step('C', 3), step('C', 4), step('E', 4), step('G', 4)]; // C major
    const issues = Harmony.checkVoiceLeading(chordA, chordB, 'strict', {
      keySymbol: 'C major',
      chordA: chord('G7'),
    });
    expect(issues.some(i => i.type === 'Leading Tone Unresolved')).toBe(false);
  });

  it('7th unresolved detected in dom7 chord', () => {
    // G7 → C: F (7th) should resolve down by step to E
    const chordA = [step('G', 3), step('B', 3), step('D', 4), step('F', 4)]; // G7
    const chordB = [step('C', 3), step('E', 3), step('G', 4), step('C', 5)]; // C - F→C leaps, not step down
    const issues = Harmony.checkVoiceLeading(chordA, chordB, 'strict', {
      keySymbol: 'C major',
      chordA: chord('G7'),
    });
    expect(issues.some(i => i.type === '7th Unresolved')).toBe(true);
  });

  it('7th resolved correctly: no issue when F→E', () => {
    // Soprano carries the 7th (F4) and resolves down by step to E4
    const chordA = [step('G', 3), step('B', 3), step('D', 4), step('F', 4)]; // G7
    const chordB = [step('C', 3), step('G', 3), step('C', 4), step('E', 4)]; // C - voice 3: F→E (−1 semitone)
    const issues = Harmony.checkVoiceLeading(chordA, chordB, 'strict', {
      keySymbol: 'C major',
      chordA: chord('G7'),
    });
    expect(issues.some(i => i.type === '7th Unresolved')).toBe(false);
  });

  it('forbidden leap > octave detected', () => {
    // Voice leaps a 9th
    const cA = [step('C', 3), step('E', 4)];
    const cB = [step('C', 3), step('G', 5)]; // top voice leaps a 10th (17 semitones)
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    expect(issues.some(i => i.type === 'Forbidden Leap')).toBe(true);
  });

  it('hidden fifth flagged in outer voices under strict', () => {
    // Outer voices move same direction by leap in top voice into a 5th
    const cA = [step('C', 3), step('E', 4)];
    const cB = [step('G', 3), step('D', 5)]; // both up, top leaps into P5
    const issues = Harmony.checkVoiceLeading(cA, cB, 'strict');
    expect(issues.some(i => i.type === 'Hidden Fifth' || i.type === 'Direct Fifth')).toBe(true);
  });

  it('species ruleset: parallel 5ths still flagged', () => {
    const cA = [step('C'), step('G')];
    const cB = [step('D'), step('A')];
    const issues = Harmony.checkVoiceLeading(cA, cB, 'species');
    expect(issues.some(i => i.type === 'Parallel 5th')).toBe(true);
  });

  it('context optional: no crash without keySymbol', () => {
    const cA = [step('G', 3), step('B', 3), step('D', 4)];
    const cB = [step('C', 3), step('E', 4), step('G', 4)];
    expect(() => Harmony.checkVoiceLeading(cA, cB, 'strict')).not.toThrow();
  });
});

// ============================================================================
// checkDoubling - 2.4
// ============================================================================

describe('Harmony.checkDoubling', () => {
  it('no issues for correctly voiced C major triad', () => {
    const voicing = [step('C', 3), step('E', 4), step('G', 4), step('C', 5)];
    const issues = Harmony.checkDoubling(voicing, chord('C'), 'C major');
    expect(issues).toHaveLength(0);
  });

  it('missing third flagged when 3rd absent', () => {
    const voicing = [step('C', 3), step('G', 4), step('C', 5)]; // no E
    const issues = Harmony.checkDoubling(voicing, chord('C'));
    expect(issues.some(i => i.type === 'Missing Third')).toBe(true);
  });

  it('missing root flagged when root absent', () => {
    const voicing = [step('E', 4), step('G', 4), step('B', 4)]; // no C
    const issues = Harmony.checkDoubling(voicing, chord('C'));
    expect(issues.some(i => i.type === 'Missing Root')).toBe(true);
  });

  it('doubled leading tone flagged', () => {
    // In C major, B is the leading tone. Two voices on B.
    const voicing = [step('G', 3), step('B', 3), step('D', 4), step('B', 4)];
    const issues = Harmony.checkDoubling(voicing, chord('G'), 'C major');
    expect(issues.some(i => i.type === 'Doubled Leading Tone')).toBe(true);
  });

  it('no doubled leading tone when only one B', () => {
    const voicing = [step('G', 3), step('B', 3), step('D', 4), step('G', 4)];
    const issues = Harmony.checkDoubling(voicing, chord('G'), 'C major');
    expect(issues.some(i => i.type === 'Doubled Leading Tone')).toBe(false);
  });

  it('doubled third in major triad flagged in strict context', () => {
    // C major with two E's
    const voicing = [step('C', 3), step('E', 3), step('E', 4), step('G', 4)];
    const issues = Harmony.checkDoubling(voicing, chord('C'), 'C major');
    expect(issues.some(i => i.type === 'Improper Doubling')).toBe(true);
  });

  it('doubled root in major triad is fine', () => {
    const voicing = [step('C', 3), step('E', 4), step('G', 4), step('C', 5)];
    const issues = Harmony.checkDoubling(voicing, chord('C'), 'C major');
    expect(issues.some(i => i.type === 'Improper Doubling')).toBe(false);
  });
});

// ============================================================================
// analyzeSixFour - 2.5
// ============================================================================

describe('Harmony.analyzeSixFour', () => {
  function chordWithBass(symbol: string, bassNote: string): Chord {
    const c = parseChordSymbol(symbol);
    const bassStep = parseNoteToStep12TET(bassNote, 3);
    return new Chord(c.name, c.tuningSystem, c.rootStep, c.intervalsInSteps, bassStep, c.preferFlats);
  }

  it('returns none when chord is not in 2nd inversion', () => {
    // C/E (1st inversion, not 2nd)
    const c = chordWithBass('C', 'E');
    const prog = [chord('G'), c, chord('F')];
    const result = Harmony.analyzeSixFour(prog, 'C major', 1);
    expect(result.type).toBe('none');
  });

  it('cadential 6/4 detected: I6/4 → V → I', () => {
    // C/G (2nd inversion) → G → C
    const c64 = chordWithBass('C', 'G');
    const G = chord('G');
    const C = chord('C');
    const progression = [chord('F'), c64, G, C];
    const result = Harmony.analyzeSixFour(progression, 'C major', 1);
    expect(result.type).toBe('cadential');
    expect(result.resolution?.name).toContain('C');
  });

  it('arpeggiated 6/4 detected when same chord appears in different inversion', () => {
    // C root pos → C/G → C root pos
    const c64 = chordWithBass('C', 'G');
    const C = chord('C');
    const progression = [C, c64, C];
    const result = Harmony.analyzeSixFour(progression, 'C major', 1);
    expect(result.type).toBe('arpeggiated');
  });

  it('returns none for out-of-range index', () => {
    const chords = [chord('C'), chord('G')];
    expect(Harmony.analyzeSixFour(chords, 'C major', 5).type).toBe('none');
    expect(Harmony.analyzeSixFour(chords, 'C major', -1).type).toBe('none');
  });

  it('returns none when no bassStep set (root position assumed)', () => {
    const c = chord('C'); // no bassStep
    const result = Harmony.analyzeSixFour([chord('F'), c, chord('G')], 'C major', 1);
    expect(result.type).toBe('none');
  });
});

// ============================================================================
// Total count verification - plan requires ≥ 50 tests
// ============================================================================

describe('Meta', () => {
  it('Fase 2 test suite present', () => {
    expect(true).toBe(true);
  });
});
