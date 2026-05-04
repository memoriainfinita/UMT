import { describe, it, expect } from 'vitest';
import {
  translateSymbol,
  SOLFEGE_ROOTS,
  QUALITY_ALIASES_ES,
  QUALITY_ALIASES_FR,
  QUALITY_ALIASES_IT,
} from '../../lib/music-theory/aliases';
import { parseChordSymbol, parseScaleSymbol } from '../../lib/music-theory/parser';

// ── translateSymbol mechanics ─────────────────────────────────────────────────

describe('translateSymbol', () => {

  describe('basic substitution', () => {
    it('replaces a single alias', () => {
      expect(translateSymbol('Do', { Do: 'C' })).toBe('C');
    });

    it('replaces alias within a longer string', () => {
      expect(translateSymbol('Dom7', { Do: 'C' })).toBe('Cm7');
    });

    it('passes through characters with no alias', () => {
      expect(translateSymbol('C#m7', {})).toBe('C#m7');
    });

    it('is case-sensitive', () => {
      expect(translateSymbol('do', { Do: 'C' })).toBe('do');
      expect(translateSymbol('Do', { Do: 'C' })).toBe('C');
    });
  });

  describe('longest match wins', () => {
    it('prefers Sol over Si when both share no prefix', () => {
      expect(translateSymbol('Sol', { Sol: 'G', Si: 'B' })).toBe('G');
    });

    it('prefers longer key when shorter key is a prefix', () => {
      // 'disminuido' should win over 'dis' if both are present
      expect(translateSymbol('disminuido', { dis: 'X', disminuido: 'dim' })).toBe('dim');
    });
  });

  describe('multiple aliases in one string', () => {
    it('translates root and quality in a chord symbol', () => {
      expect(translateSymbol('Do mayor', { Do: 'C', mayor: 'major' })).toBe('C major');
    });

    it('translates root with accidental', () => {
      // Sib: Si→B, b passes through → Bb
      expect(translateSymbol('Sib', { Si: 'B' })).toBe('Bb');
    });

    it('handles scale symbol with space', () => {
      expect(translateSymbol('Re menor', { Re: 'D', menor: 'minor' })).toBe('D minor');
    });
  });

  describe('empty aliases map', () => {
    it('returns input unchanged', () => {
      expect(translateSymbol('Cmaj7', {})).toBe('Cmaj7');
    });
  });
});

// ── SOLFEGE_ROOTS map ─────────────────────────────────────────────────────────

describe('SOLFEGE_ROOTS', () => {
  it('maps all 7 solfège notes to English', () => {
    expect(SOLFEGE_ROOTS['Do']).toBe('C');
    expect(SOLFEGE_ROOTS['Re']).toBe('D');
    expect(SOLFEGE_ROOTS['Mi']).toBe('E');
    expect(SOLFEGE_ROOTS['Fa']).toBe('F');
    expect(SOLFEGE_ROOTS['Sol']).toBe('G');
    expect(SOLFEGE_ROOTS['La']).toBe('A');
    expect(SOLFEGE_ROOTS['Si']).toBe('B');
  });
});

// ── QUALITY_ALIASES_ES ────────────────────────────────────────────────────────

describe('QUALITY_ALIASES_ES', () => {
  it('maps mayor → major', () => expect(QUALITY_ALIASES_ES['mayor']).toBe('major'));
  it('maps menor → minor', () => expect(QUALITY_ALIASES_ES['menor']).toBe('minor'));
  it('maps disminuido → dim', () => expect(QUALITY_ALIASES_ES['disminuido']).toBe('dim'));
  it('maps aumentado → aug', () => expect(QUALITY_ALIASES_ES['aumentado']).toBe('aug'));
  it('maps dominante → 7', () => expect(QUALITY_ALIASES_ES['dominante']).toBe('7'));
  it('maps semidisminuido → m7b5', () => expect(QUALITY_ALIASES_ES['semidisminuido']).toBe('m7b5'));
});

// ── QUALITY_ALIASES_FR ────────────────────────────────────────────────────────

describe('QUALITY_ALIASES_FR', () => {
  it('maps majeur → major', () => expect(QUALITY_ALIASES_FR['majeur']).toBe('major'));
  it('maps mineur → minor', () => expect(QUALITY_ALIASES_FR['mineur']).toBe('minor'));
  it('maps diminué → dim', () => expect(QUALITY_ALIASES_FR['diminué']).toBe('dim'));
  it('maps augmenté → aug', () => expect(QUALITY_ALIASES_FR['augmenté']).toBe('aug'));
});

// ── QUALITY_ALIASES_IT ────────────────────────────────────────────────────────

describe('QUALITY_ALIASES_IT', () => {
  it('maps maggiore → major', () => expect(QUALITY_ALIASES_IT['maggiore']).toBe('major'));
  it('maps minore → minor', () => expect(QUALITY_ALIASES_IT['minore']).toBe('minor'));
  it('maps diminuito → dim', () => expect(QUALITY_ALIASES_IT['diminuito']).toBe('dim'));
  it('maps aumentato → aug', () => expect(QUALITY_ALIASES_IT['aumentato']).toBe('aug'));
});

// ── Integration: translateSymbol + parseChordSymbol ───────────────────────────

describe('integration with parseChordSymbol', () => {
  const aliases = { ...SOLFEGE_ROOTS, ...QUALITY_ALIASES_ES };

  it('parses solfège chord: Dom → Cm', () => {
    const chord = parseChordSymbol(translateSymbol('Dom', aliases));
    expect(chord.name).toBe('Cm');
  });

  it('parses solfège chord: Sol7 → G7', () => {
    const chord = parseChordSymbol(translateSymbol('Sol7', aliases));
    expect(chord.name).toBe('G7');
  });

  it('parses solfège chord with accidental: Sib mayor → Bb major', () => {
    const chord = parseChordSymbol(translateSymbol('Sib mayor', aliases));
    expect(chord.name).toBe('Bb major');
  });

  it('parses Re menor → Dm', () => {
    const chord = parseChordSymbol(translateSymbol('Re menor', aliases));
    expect(chord.name).toBe('D minor');
  });

  it('parses Fa# mayor → F#', () => {
    const chord = parseChordSymbol(translateSymbol('Fa# mayor', aliases));
    expect(chord.name).toBe('F# major');
  });
});

// ── Integration: translateSymbol + parseScaleSymbol ──────────────────────────

describe('integration with parseScaleSymbol', () => {
  const aliases = { ...SOLFEGE_ROOTS, ...QUALITY_ALIASES_ES };

  it('parses Do mayor → C major scale', () => {
    const scale = parseScaleSymbol(translateSymbol('Do mayor', aliases));
    expect(scale.stepPattern).toEqual([2, 2, 1, 2, 2, 2, 1]);
  });

  it('parses La menor → A minor scale', () => {
    const scale = parseScaleSymbol(translateSymbol('La menor', aliases));
    expect(scale.stepPattern).toEqual([2, 1, 2, 2, 1, 2, 2]);
  });

  it('parses Re dorian via partial alias map (only solfège)', () => {
    const scale = parseScaleSymbol(translateSymbol('Re dorian', SOLFEGE_ROOTS));
    expect(scale.stepPattern).toEqual([2, 1, 2, 2, 2, 1, 2]);
  });
});
