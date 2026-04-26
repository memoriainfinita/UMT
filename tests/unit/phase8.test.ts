import { describe, it, expect } from 'vitest';
import { FiguredBass } from '../../lib/music-theory/figured-bass';
import { RAGAS } from '../../lib/music-theory/ragas';
import { MAQAMAT } from '../../lib/music-theory/maqamat';
import { Solfege } from '../../lib/music-theory/solfege';
import { Hexachord } from '../../lib/music-theory/hexachord';
import { parseNote, parseScaleSymbol, parseChordSymbol } from '../../lib/music-theory/parser';
import { Note } from '../../lib/music-theory/note';
import { TET12 } from '../../lib/music-theory/tuning';
import { SCALE_PATTERNS } from '../../lib/music-theory/dictionaries';

// ============================================================================
// 8.1 — FiguredBass
// ============================================================================

describe('FiguredBass.parse', () => {
  it('empty symbol = root position', () => {
    const result = FiguredBass.parse('');
    expect(result.intervals).toEqual([4, 7]);
  });

  it('6 = first inversion', () => {
    const result = FiguredBass.parse('6');
    expect(result.intervals).toContain(9); // M6 = 9 semitones
  });

  it('6/4 = second inversion', () => {
    const result = FiguredBass.parse('6/4');
    expect(result.intervals).toContain(9);
    expect(result.intervals).toContain(5);
  });

  it('7 = seventh chord', () => {
    const result = FiguredBass.parse('7');
    expect(result.intervals).toContain(10); // minor 7th
  });

  it('#6 adds sharp accidental', () => {
    const result = FiguredBass.parse('#6');
    expect(result.accidentals.get(0)).toBe('#');
  });

  it('returns intervals as array', () => {
    expect(Array.isArray(FiguredBass.parse('6/5').intervals)).toBe(true);
  });
});

describe('FiguredBass.realize', () => {
  it('returns a Chord', () => {
    const bassNote = parseNote('C4');
    const chord = FiguredBass.realize(bassNote, '');
    expect(chord).toBeDefined();
    expect(Array.isArray(chord.intervalsInSteps)).toBe(true);
  });

  it('root position chord includes bass as first interval', () => {
    const bassNote = parseNote('C4');
    const chord = FiguredBass.realize(bassNote, '');
    expect(chord.intervalsInSteps[0]).toBe(0); // bass = root
  });

  it('sixth chord has 6th interval', () => {
    const bassNote = parseNote('E4');
    const chord = FiguredBass.realize(bassNote, '6');
    expect(chord.intervalsInSteps.length).toBeGreaterThan(1);
  });
});

describe('FiguredBass.fromChord', () => {
  it('root position returns empty string', () => {
    const c = parseChordSymbol('C');
    const bassNote = parseNote('C4');
    expect(FiguredBass.fromChord(c, bassNote)).toBe('');
  });
});

// ============================================================================
// 8.2 — Greek scales in dictionary
// ============================================================================

describe('SCALE_PATTERNS Greek modes', () => {
  it('greek-dorian is defined', () => {
    expect(SCALE_PATTERNS['greek-dorian']).toBeDefined();
  });

  it('greek-phrygian is defined', () => {
    expect(SCALE_PATTERNS['greek-phrygian']).toBeDefined();
  });

  it('greek-lydian is defined', () => {
    expect(SCALE_PATTERNS['greek-lydian']).toBeDefined();
  });

  it('all 8 greek modes are defined', () => {
    const modes = ['greek-dorian', 'greek-phrygian', 'greek-lydian', 'greek-mixolydian',
                   'greek-hypodorian', 'greek-hypophrygian', 'greek-hypolydian', 'greek-hypomixolydian'];
    expect(modes.every(m => SCALE_PATTERNS[m] !== undefined)).toBe(true);
  });

  it('greek-dorian parses as a scale', () => {
    const scale = parseScaleSymbol('C greek-dorian');
    expect(scale.getNotes(1)).toHaveLength(8);
  });
});

// ============================================================================
// 8.3 — Hexachords
// ============================================================================

describe('Hexachord', () => {
  it('NATURALE contains C D E F G A', () => {
    expect(Hexachord.NATURALE).toEqual(['C', 'D', 'E', 'F', 'G', 'A']);
  });

  it('DURUM contains G A B C D E', () => {
    expect(Hexachord.DURUM).toEqual(['G', 'A', 'B', 'C', 'D', 'E']);
  });

  it('MOLLE contains F G A Bb C D', () => {
    expect(Hexachord.MOLLE).toContain('Bb');
  });

  it('getSyllable C in naturale = ut', () => {
    const c4 = parseNote('C4');
    expect(Hexachord.getSyllable(c4, 'naturale')).toBe('ut');
  });

  it('getSyllable A in naturale = la', () => {
    const a4 = parseNote('A4');
    expect(Hexachord.getSyllable(a4, 'naturale')).toBe('la');
  });

  it('getSyllable G in naturale = null (not in hexachord)', () => {
    // Wait, G is in naturale (positions: C D E F G A)
    const g4 = parseNote('G4');
    expect(Hexachord.getSyllable(g4, 'naturale')).toBe('sol');
  });

  it('getSyllable B in naturale = null', () => {
    const b4 = parseNote('B4');
    expect(Hexachord.getSyllable(b4, 'naturale')).toBeNull();
  });

  it('getNotes returns 6 notes', () => {
    expect(Hexachord.getNotes('naturale')).toHaveLength(6);
    expect(Hexachord.getNotes('durum')).toHaveLength(6);
    expect(Hexachord.getNotes('molle')).toHaveLength(6);
  });

  it('mutate finds shared syllable between naturale and durum', () => {
    // G is in both naturale (sol) and durum (ut)
    const g4 = parseNote('G4');
    const result = Hexachord.mutate('naturale', 'durum', g4);
    expect(result).not.toBeNull();
    expect(result!.fromSyllable).toBe('sol');
    expect(result!.toSyllable).toBe('ut');
  });
});

// ============================================================================
// 8.4 — Ragas
// ============================================================================

describe('RAGAS', () => {
  it('exports at least 10 ragas', () => {
    expect(Object.keys(RAGAS).length).toBeGreaterThanOrEqual(10);
  });

  it('each raga has required fields', () => {
    for (const [, raga] of Object.entries(RAGAS)) {
      expect(typeof raga.name).toBe('string');
      expect(Array.isArray(raga.aroha)).toBe(true);
      expect(Array.isArray(raga.avaroha)).toBe(true);
      expect(typeof raga.vadi).toBe('number');
      expect(typeof raga.samvadi).toBe('number');
      expect(typeof raga.thaat).toBe('string');
      expect(typeof raga.description).toBe('string');
    }
  });

  it('yaman uses sharp Ma (6 semitones)', () => {
    expect(RAGAS['yaman'].aroha).toContain(6); // tivra Ma
  });

  it('malkauns is pentatonic', () => {
    expect(RAGAS['malkauns'].aroha.length).toBeLessThanOrEqual(7);
  });

  it('aroha starts at 0 (tonic)', () => {
    for (const [, raga] of Object.entries(RAGAS)) {
      expect(raga.aroha[0]).toBe(0);
    }
  });

  it('aroha ends at 12 (octave)', () => {
    for (const [, raga] of Object.entries(RAGAS)) {
      expect(raga.aroha[raga.aroha.length - 1]).toBe(12);
    }
  });
});

// ============================================================================
// 8.5 — Maqamat
// ============================================================================

describe('MAQAMAT', () => {
  it('exports at least 8 maqamat', () => {
    expect(Object.keys(MAQAMAT).length).toBeGreaterThanOrEqual(8);
  });

  it('each maqam has required fields', () => {
    for (const [, maqam] of Object.entries(MAQAMAT)) {
      expect(typeof maqam.name).toBe('string');
      expect(Array.isArray(maqam.ajnas)).toBe(true);
      expect(Array.isArray(maqam.notes)).toBe(true);
    }
  });

  it('rast starts on 0 and ends on 24 (octave in QT)', () => {
    const rast = MAQAMAT['rast'];
    expect(rast.notes[0]).toBe(0);
    expect(rast.notes[rast.notes.length - 1]).toBe(24);
  });

  it('each maqam notes array starts at 0', () => {
    for (const [, maqam] of Object.entries(MAQAMAT)) {
      expect(maqam.notes[0]).toBe(0);
    }
  });

  it('hijaz uses augmented 2nd (6 QT = 3 semitones)', () => {
    const hijaz = MAQAMAT['hijaz'];
    // Should contain 8 (= 4 semitones from 2 QT start) in notes
    expect(hijaz.notes).toContain(8);
  });
});

// ============================================================================
// 8.6 — Solfège
// ============================================================================

describe('Solfege.fixedDo', () => {
  it('C = do (PC 3 in UMT = A4=0)', () => {
    const c4 = parseNote('C4');
    expect(Solfege.fixedDo(c4)).toBe('do');
  });

  it('D = re', () => {
    const d4 = parseNote('D4');
    expect(Solfege.fixedDo(d4)).toBe('re');
  });

  it('A = la', () => {
    const a4 = parseNote('A4');
    expect(Solfege.fixedDo(a4)).toBe('la');
  });

  it('with preferFlats: Bb = sib', () => {
    const bb4 = new Note(TET12, 1, 'Bb4');
    expect(Solfege.fixedDo(bb4, true)).toBe('sib');
  });
});

describe('Solfege.movableDo', () => {
  it('tonic in C major = do', () => {
    const c4 = parseNote('C4');
    expect(Solfege.movableDo(c4, 'C major')).toBe('do');
  });

  it('G in C major = sol', () => {
    const g4 = parseNote('G4');
    expect(Solfege.movableDo(g4, 'C major')).toBe('sol');
  });

  it('chromatic note returns ?', () => {
    const cs4 = new Note(TET12, -8, 'C#4');
    expect(Solfege.movableDo(cs4, 'C major')).toBe('?');
  });

  it('tonic in G major = do', () => {
    const g4 = parseNote('G4');
    expect(Solfege.movableDo(g4, 'G major')).toBe('do');
  });
});

describe('Solfege.fromSolfege', () => {
  it('movable do in C major: do → C', () => {
    const note = Solfege.fromSolfege('do', 'C major', 'movable');
    // C = PC 3 in UMT
    expect(((note.stepsFromBase % 12) + 12) % 12).toBe(3);
  });

  it('movable sol in G major → D', () => {
    const note = Solfege.fromSolfege('sol', 'G major', 'movable');
    // Sol in G = D; D = PC 5 in UMT
    expect(((note.stepsFromBase % 12) + 12) % 12).toBe(5);
  });

  it('fixed do: do → C PC', () => {
    const note = Solfege.fromSolfege('do', 'C major', 'fixed');
    expect(((note.stepsFromBase % 12) + 12) % 12).toBe(3);
  });

  it('throws for unknown syllable', () => {
    expect(() => Solfege.fromSolfege('xy', 'C major')).toThrow();
  });
});
