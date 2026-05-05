/**
 * Fretboard voicing and scale position generation for any fretted instrument.
 * All tunings are expressed as steps from A4 = 0 (UMT coordinate system).
 */
import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';

// ============================================================================
// Tuning presets (steps from A4 = 0, low→high)
// ============================================================================

/** Standard guitar tuning: E2 A2 D3 G3 B3 E4 */
export const GUITAR_STANDARD = [-29, -24, -19, -14, -10, -5] as const;
/** Guitar drop D tuning: D2 A2 D3 G3 B3 E4 */
export const GUITAR_DROPPED_D = [-31, -24, -19, -14, -10, -5] as const;
/** Guitar open G tuning: D2 G2 D3 G3 B3 D4 */
export const GUITAR_OPEN_G = [-31, -26, -19, -14, -10, -7] as const;
/** Standard ukulele tuning (reentrant): G4 C4 E4 A4 */
export const UKULELE_STANDARD = [-2, -9, -5, 0] as const;
/** Standard 4-string bass tuning: E1 A1 D2 G2 */
export const BASS_STANDARD = [-41, -36, -31, -26] as const;

// ============================================================================
// Types
// ============================================================================

/** Options for voicing and scale position generation. */
export type FretboardVoicingOptions = {
  /** Highest fret to search. Default: 12. */
  maxFret?: number;
  /** Maximum fret span (stretch) in a single voicing. Default: 4. */
  maxStretch?: number;
  /** Fret window size for {@link getFretboardScalePositions}. Default: 4. */
  windowSize?: number;
};

/**
 * A single chord voicing for a fretted instrument.
 * Compatible with notae's `FretboardChord` — spread with `name` to render directly.
 *
 * @example
 * const voicings = getFretboardVoicings(chord, GUITAR_STANDARD);
 * renderFretboard({ name: chord.name, ...voicings[0] });
 */
export type FretboardVoicingResult = {
  /** One fret per string, low→high. -1 = mute (×), 0 = open (○), N = fret N. */
  frets: number[];
  /** Absolute fret of the first displayed fret. 1 in open position or when lowest fret is 1. */
  baseFret: number;
  /** Open-string note names, low→high (e.g. `['E','A','D','G','B','E']`). */
  tuning: string[];
  /** Root note name (e.g. `'C'`, `'F#'`). */
  root: string;
};

/**
 * Scale notes mapped to fretboard positions.
 * Compatible with notae's `FretboardChord` — spread with `name` to render directly.
 *
 * @example
 * const map = getFretboardScale(scale, GUITAR_STANDARD);
 * renderFretboard({ name: scale.name, ...map });
 */
export type FretboardScaleResult = {
  /** Per string: all fret positions where a scale note appears. Empty array = no scale notes on this string. */
  frets: number[][];
  /** 1 for a full-neck map, or the starting fret for a position box. */
  baseFret: number;
  /** Open-string note names, low→high. */
  tuning: string[];
  /** Root note name. */
  root: string;
};

// ============================================================================
// Internal helpers
// ============================================================================

function toNoteNames(tuning: readonly number[], ts: Chord['tuningSystem']): string[] {
  return tuning.map(step => {
    const name = new Note(ts, step).getName();
    // Strip trailing octave number: "E4" → "E", "Bb3" → "Bb", "A#2" → "A#"
    return name.replace(/\d+$/, '') || name;
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates all valid chord voicings for a fretted instrument using backtracking.
 *
 * Each voicing covers all pitch classes of the chord. Results are sorted by
 * position (lowest fret first), then by stretch, then by number of muted strings.
 *
 * @param chord - The chord to voice.
 * @param tuning - Open string steps from A4, low→high. Use the exported presets
 *   (`GUITAR_STANDARD`, `UKULELE_STANDARD`, etc.) or supply a custom array.
 * @param options - Search constraints: `maxFret` (default 12), `maxStretch` (default 4).
 * @returns Array of voicings sorted by playability. Empty if no valid voicing exists.
 */
export function getFretboardVoicings(
  chord: Chord,
  tuning: readonly number[],
  options?: FretboardVoicingOptions
): FretboardVoicingResult[] {
  if (tuning.length === 0) return [];

  const maxFret    = options?.maxFret    ?? 12;
  const maxStretch = options?.maxStretch ?? 4;
  const ts  = chord.tuningSystem;
  const oct = ts.octaveSteps;
  const chordPCs = new Set(chord.getPitchClasses());
  const tuningNames = toNoteNames(tuning, ts);
  const root = new Note(ts, chord.rootStep)
    .getName({ preferFlats: chord.preferFlats })
    .replace(/\d+$/, '');

  // Per string: valid fret positions (matches a chord PC) + -1 (mute)
  const stringOptions: number[][] = Array.from(tuning, openStep => {
    const opts: number[] = [-1];
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = ((openStep + fret) % oct + oct) % oct;
      if (chordPCs.has(pc)) opts.push(fret);
    }
    return opts;
  });

  const results: FretboardVoicingResult[] = [];

  // Backtrack string by string, pruning when the fret window exceeds maxStretch.
  // lo/hi track the current [min, max] of non-open frets (-1 = none yet).
  function backtrack(si: number, current: number[], lo: number, hi: number): void {
    if (si === tuning.length) {
      // Validate: all chord PCs must be covered
      const covered = new Set<number>();
      for (let i = 0; i < current.length; i++) {
        if (current[i] >= 0) {
          covered.add(((tuning[i] + current[i]) % oct + oct) % oct);
        }
      }
      for (const pc of chordPCs) {
        if (!covered.has(pc)) return;
      }
      const nonOpen = current.filter(f => f > 0);
      const baseFret = nonOpen.length > 0 ? Math.min(...nonOpen) : 1;
      results.push({ frets: [...current], baseFret, tuning: tuningNames, root });
      return;
    }

    for (const fret of stringOptions[si]) {
      if (fret > 0) {
        const newLo = lo < 0 ? fret : Math.min(lo, fret);
        const newHi = hi < 0 ? fret : Math.max(hi, fret);
        if (newHi - newLo > maxStretch) continue;
        current.push(fret);
        backtrack(si + 1, current, newLo, newHi);
        current.pop();
      } else {
        // open (0) or mute (-1): do not affect the fret window
        current.push(fret);
        backtrack(si + 1, current, lo, hi);
        current.pop();
      }
    }
  }

  backtrack(0, [], -1, -1);

  results.sort((a, b) => {
    const baseDiff = a.baseFret - b.baseFret;
    if (baseDiff !== 0) return baseDiff;
    const aFrets = a.frets.filter(f => f > 0);
    const bFrets = b.frets.filter(f => f > 0);
    const aStr = aFrets.length > 1 ? Math.max(...aFrets) - Math.min(...aFrets) : 0;
    const bStr = bFrets.length > 1 ? Math.max(...bFrets) - Math.min(...bFrets) : 0;
    if (aStr !== bStr) return aStr - bStr;
    return a.frets.filter(f => f < 0).length - b.frets.filter(f => f < 0).length;
  });

  return results;
}

/**
 * Maps all scale note positions across the full neck.
 * Each string entry is an array of fret numbers (0–`maxFret`) where a scale note appears.
 *
 * @param scale - The scale to map.
 * @param tuning - Open string steps from A4, low→high.
 * @param options - `maxFret` controls how far up the neck to scan (default 12).
 * @returns A single result with all scale positions across the neck.
 */
export function getFretboardScale(
  scale: Scale,
  tuning: readonly number[],
  options?: FretboardVoicingOptions
): FretboardScaleResult {
  const maxFret = options?.maxFret ?? 12;
  const ts  = scale.tuningSystem;
  const oct = ts.octaveSteps;
  const scalePCs = new Set(scale.getPitchClasses());
  const tuningNames = toNoteNames(tuning, ts);
  const root = new Note(ts, scale.rootStep)
    .getName({ preferFlats: scale.preferFlats })
    .replace(/\d+$/, '');

  const frets: number[][] = Array.from(tuning, openStep => {
    const positions: number[] = [];
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = ((openStep + fret) % oct + oct) % oct;
      if (scalePCs.has(pc)) positions.push(fret);
    }
    return positions;
  });

  return { frets, baseFret: 1, tuning: tuningNames, root };
}

/**
 * Returns scale position "boxes" — windows of adjacent frets covering the scale.
 * Each box is a `FretboardScaleResult` limited to a `windowSize`-fret span, plus open strings.
 * Useful for CAGED-style position practice on any instrument.
 *
 * @param scale - The scale to map.
 * @param tuning - Open string steps from A4, low→high.
 * @param options - `maxFret` (default 12), `windowSize` (default 4).
 * @returns Array of position boxes ordered by starting fret, each with at least one note.
 */
export function getFretboardScalePositions(
  scale: Scale,
  tuning: readonly number[],
  options?: FretboardVoicingOptions
): FretboardScaleResult[] {
  const maxFret    = options?.maxFret    ?? 12;
  const windowSize = options?.windowSize ?? 4;
  const ts  = scale.tuningSystem;
  const oct = ts.octaveSteps;
  const scalePCs = new Set(scale.getPitchClasses());
  const tuningNames = toNoteNames(tuning, ts);
  const root = new Note(ts, scale.rootStep)
    .getName({ preferFlats: scale.preferFlats })
    .replace(/\d+$/, '');

  const boxes: FretboardScaleResult[] = [];

  for (let pos = 1; pos <= maxFret - windowSize + 1; pos++) {
    const frets: number[][] = Array.from(tuning, openStep => {
      const positions: number[] = [];
      // Open string: include if its PC is in the scale
      const openPc = ((openStep % oct) + oct) % oct;
      if (scalePCs.has(openPc)) positions.push(0);
      // Frets within this window
      for (let fret = pos; fret <= pos + windowSize - 1; fret++) {
        const pc = ((openStep + fret) % oct + oct) % oct;
        if (scalePCs.has(pc)) positions.push(fret);
      }
      return positions;
    });

    const total = frets.reduce((n, s) => n + s.length, 0);
    if (total === 0) continue;

    boxes.push({ frets, baseFret: pos, tuning: tuningNames, root });
  }

  return boxes;
}
