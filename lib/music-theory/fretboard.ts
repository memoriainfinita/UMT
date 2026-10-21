/**
 * Fretboard voicing and scale position generation for any fretted instrument.
 * All tunings are expressed as steps from A4 = 0 (UMT coordinate system).
 */
import { Note } from './note';
import { Chord } from './chord';
import { Scale } from './scale';
import { writtenRoot } from './utils';

// ============================================================================
// Tuning presets (steps from A4 = 0, low→high)
// ============================================================================

/**
 * Standard guitar tuning: E2 A2 D3 G3 B3 E4
 * @category Core
 */
export const GUITAR_STANDARD = [-29, -24, -19, -14, -10, -5] as const;
/**
 * Guitar drop D tuning: D2 A2 D3 G3 B3 E4
 * @category Core
 */
export const GUITAR_DROPPED_D = [-31, -24, -19, -14, -10, -5] as const;
/**
 * Guitar open G tuning: D2 G2 D3 G3 B3 D4
 * @category Core
 */
export const GUITAR_OPEN_G = [-31, -26, -19, -14, -10, -7] as const;
/**
 * Standard ukulele tuning (reentrant): G4 C4 E4 A4
 * @category Core
 */
export const UKULELE_STANDARD = [-2, -9, -5, 0] as const;
/**
 * Standard 4-string bass tuning: E1 A1 D2 G2
 * @category Core
 */
export const BASS_STANDARD = [-41, -36, -31, -26] as const;
/**
 * 5-string banjo open G tuning (drone first): G4 D3 G3 B3 D4
 * @category Core
 */
export const BANJO_OPEN_G = [-2, -19, -14, -10, -7] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Options for voicing and scale position generation.
 * @category Core
 */
export type FretboardVoicingOptions = {
  /** Highest fret to search. Default: 12. */
  maxFret?: number;
  /** Maximum fret span (stretch) in a single voicing. Default: 4. */
  maxStretch?: number;
  /** Fret window size for {@link getFretboardScalePositions}. Default: 4. */
  windowSize?: number;
  /**
   * Per-string fret offset: the physical fret number where each string's nut sits.
   * 0 (default) for normal strings. Use 5 for the 5-string banjo drone (index 0 with
   * `BANJO_OPEN_G`). When provided, output fret values are shifted by this amount so
   * they match absolute fret positions on the instrument.
   * @example
   * getFretboardVoicings(chord, BANJO_OPEN_G, { stringOffset: [5, 0, 0, 0, 0] })
   */
  stringOffset?: number[];
};

/**
 * A single chord voicing for a fretted instrument.
 * Compatible with notae's `FretboardChord` — spread with `name` to render directly.
 *
 * @example
 * const voicings = getFretboardVoicings(chord, GUITAR_STANDARD);
 * renderFretboard({ name: chord.name, ...voicings[0] });
 * @category Core
 */
export type FretboardVoicingResult = {
  /** One fret per string, low→high. -1 = mute (×), stringOffset[i] = open (○), N = fret N. */
  frets: number[];
  /** Absolute fret of the first displayed fret. 1 in open position or when lowest fret is 1. */
  baseFret: number;
  /** Open-string note names, low→high (e.g. `['E','A','D','G','B','E']`). */
  tuning: string[];
  /** Root note name (e.g. `'C'`, `'F#'`). */
  root: string;
  /** Per-string fret offset, echoed from options. Present only when offset was supplied. */
  stringOffset?: number[];
};

/**
 * Scale notes mapped to fretboard positions.
 * Compatible with notae's `FretboardChord` — spread with `name` to render directly.
 *
 * @example
 * const map = getFretboardScale(scale, GUITAR_STANDARD);
 * renderFretboard({ name: scale.name, ...map });
 * @category Core
 */
export type FretboardScaleResult = {
  /** Per string: all fret positions where a scale note appears. Empty array = no scale notes on this string. */
  frets: number[][];
  /** 1 for a full-neck map, or the starting fret for a position box. */
  baseFret: number;
  /** Open-string note names, low→high. */
  tuning: string[];
  /** Root note name: the scale's written root when it names the root's pitch (F# lydian → `'F#'`). */
  root: string;
  /** Per string, parallel to `frets`: the scale degree of each note (1 = the root). */
  degrees: number[][];
  /** Per-string fret offset, echoed from options. Present only when offset was supplied. */
  stringOffset?: number[];
};

// ============================================================================
// Internal helpers
// ============================================================================

/** The scale's root name: its written letter when it names the root's pitch, else by `preferFlats`. */
function scaleRootName(scale: Scale): string {
  const written = scale.tuningSystem.octaveSteps === 12 ? writtenRoot(scale.name, scale.rootStep) : null;
  return written ?? new Note(scale.tuningSystem, scale.rootStep).getName({ preferFlats: scale.preferFlats }).replace(/\d+$/, '');
}

/** Scale degree (1 = root) of a pitch class, from the scale's pitch classes in order. */
function degreeOf(scalePcs: number[], pc: number): number {
  return scalePcs.indexOf(pc) + 1;
}

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
 * @param tuning - Open string steps from A4, low→high, in steps of the chord's tuning, one fret
 *   per step (a 31-EDO guitar has a fret per 31-EDO step). The exported presets
 *   (`GUITAR_STANDARD`, `UKULELE_STANDARD`, etc.) are 12-TET: to place a chord of another
 *   tuning on a 12-TET instrument, pass `chord.retune(TET12)`.
 * @param options - Search constraints: `maxFret` (default 12), `maxStretch` (default 4).
 * @returns Array of voicings sorted by playability. Empty if no valid voicing exists.
 * @category Core
 */
export function getFretboardVoicings(
  chord: Chord,
  tuning: readonly number[],
  options?: FretboardVoicingOptions
): FretboardVoicingResult[] {
  if (tuning.length === 0) return [];

  const maxFret    = options?.maxFret    ?? 12;
  const maxStretch = options?.maxStretch ?? 4;
  const offset     = options?.stringOffset;
  const ts  = chord.tuningSystem;
  const oct = ts.octaveSteps;
  const chordPCs = new Set(chord.getPitchClasses());
  const tuningNames = toNoteNames(tuning, ts);
  const root = new Note(ts, chord.rootStep)
    .getName({ preferFlats: chord.preferFlats })
    .replace(/\d+$/, '');

  // Per string: valid fret positions (matches a chord PC) + -1 (mute)
  // Internal frets are always string-relative (0 = open at string's own nut).
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
  // Stretch is measured in internal (string-relative) coordinates.
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
      // Apply per-string offset to output frets (muted strings stay -1).
      const absFrets = current.map((f, i) => f === -1 ? -1 : f + (offset?.[i] ?? 0));
      // baseFret = lowest fingered fret in absolute coords (frets above the string's open position).
      const fingered = absFrets.filter((f, i) => f !== -1 && f > (offset?.[i] ?? 0));
      const baseFret = fingered.length > 0 ? Math.min(...fingered) : 1;
      const result: FretboardVoicingResult = { frets: absFrets, baseFret, tuning: tuningNames, root };
      if (offset) result.stringOffset = offset;
      results.push(result);
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
    // Stretch in absolute coords, excluding open and muted strings.
    const aFrets = a.frets.filter((f, i) => f > (offset?.[i] ?? 0));
    const bFrets = b.frets.filter((f, i) => f > (offset?.[i] ?? 0));
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
 * @param tuning - Open string steps from A4, low→high, in steps of the scale's tuning (one fret per
 *   step). The exported presets are 12-TET: for a scale of another tuning on a 12-TET
 *   instrument, pass `scale.retune(TET12)`.
 * @param options - `maxFret` controls how far up the neck to scan (default 12).
 * @returns A single result with all scale positions across the neck.
 * @category Core
 */
export function getFretboardScale(
  scale: Scale,
  tuning: readonly number[],
  options?: FretboardVoicingOptions
): FretboardScaleResult {
  const maxFret = options?.maxFret ?? 12;
  const offset  = options?.stringOffset;
  const ts  = scale.tuningSystem;
  const oct = ts.octaveSteps;
  const pcList = scale.getPitchClasses();
  const scalePCs = new Set(pcList);
  const tuningNames = toNoteNames(tuning, ts);
  const root = scaleRootName(scale);

  const degrees: number[][] = [];
  const frets: number[][] = Array.from(tuning, (openStep, i) => {
    const off = offset?.[i] ?? 0;
    const positions: number[] = [];
    const degs: number[] = [];
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = ((openStep + fret) % oct + oct) % oct;
      if (scalePCs.has(pc)) { positions.push(fret + off); degs.push(degreeOf(pcList, pc)); }
    }
    degrees.push(degs);
    return positions;
  });

  const result: FretboardScaleResult = { frets, baseFret: 1, tuning: tuningNames, root, degrees };
  if (offset) result.stringOffset = offset;
  return result;
}

/**
 * Returns scale position "boxes" — windows of adjacent frets covering the scale.
 * Each box is a `FretboardScaleResult` limited to a `windowSize`-fret span, plus open strings.
 * These are fret windows, one per starting fret, not taught positions: for CAGED shapes and
 * three-notes-per-string patterns use {@link getFretboardScaleShapes}.
 *
 * @param scale - The scale to map.
 * @param tuning - Open string steps from A4, low→high, in steps of the scale's tuning (one fret per
 *   step). The exported presets are 12-TET: for a scale of another tuning on a 12-TET
 *   instrument, pass `scale.retune(TET12)`.
 * @param options - `maxFret` (default 12), `windowSize` (default 4).
 * @returns Array of position boxes ordered by starting fret, each with at least one note.
 * @category Core
 */
export function getFretboardScalePositions(
  scale: Scale,
  tuning: readonly number[],
  options?: FretboardVoicingOptions
): FretboardScaleResult[] {
  const maxFret    = options?.maxFret    ?? 12;
  const windowSize = options?.windowSize ?? 4;
  const offset     = options?.stringOffset;
  const ts  = scale.tuningSystem;
  const oct = ts.octaveSteps;
  const pcList = scale.getPitchClasses();
  const scalePCs = new Set(pcList);
  const tuningNames = toNoteNames(tuning, ts);
  const root = scaleRootName(scale);

  const boxes: FretboardScaleResult[] = [];

  for (let pos = 1; pos <= maxFret - windowSize + 1; pos++) {
    const degrees: number[][] = [];
    const frets: number[][] = Array.from(tuning, (openStep, i) => {
      const off = offset?.[i] ?? 0;
      const positions: number[] = [];
      const degs: number[] = [];
      // Open position: internal fret 0, output fret = off (may be >0 for offset strings)
      const openPc = ((openStep % oct) + oct) % oct;
      if (scalePCs.has(openPc)) { positions.push(off); degs.push(degreeOf(pcList, openPc)); }
      // Frets within this window (internal coords), output shifted by off
      for (let fret = pos; fret <= pos + windowSize - 1; fret++) {
        const pc = ((openStep + fret) % oct + oct) % oct;
        if (scalePCs.has(pc)) { positions.push(fret + off); degs.push(degreeOf(pcList, pc)); }
      }
      degrees.push(degs);
      return positions;
    });

    const total = frets.reduce((n, s) => n + s.length, 0);
    if (total === 0) continue;

    const box: FretboardScaleResult = { frets, baseFret: pos, tuning: tuningNames, root, degrees };
    if (offset) box.stringOffset = offset;
    boxes.push(box);
  }

  return boxes;
}

/**
 * Options for {@link getFretboardScaleShapes}.
 * @category Core
 */
export type FretboardShapeOptions = {
  /**
   * `'3nps'`: three notes per string, one pattern per scale degree (any tuning and string
   * count). `'caged'`: the five CAGED shapes (6-string guitar in standard tuning only).
   */
  system: '3nps' | 'caged';
  /** Per-string fret offset, as in {@link FretboardVoicingOptions}. */
  stringOffset?: number[];
};

/**
 * A named scale position: a CAGED shape or a three-notes-per-string pattern.
 * @category Core
 */
export type FretboardScaleShape = FretboardScaleResult & {
  /** `'E shape'` … `'G shape'` (`'Em shape'` … for a minor tonic triad), or `'Pattern 1'` … for 3nps. */
  name: string;
  /** Scale degree the shape starts from on the lowest string (1 = the root). */
  startDegree: number;
  /** Frets from the lowest to the highest note of the shape: how far the hand stretches. */
  span: number;
};

// Standard guitar tuning as semitones between adjacent strings (E A D G B E)
const STANDARD_GUITAR_INTERVALS = [5, 5, 5, 4, 5];

/**
 * The frets of a shape whose notes are given as absolute steps, string by string; null when a
 * note lies below a string's nut.
 */
function shapeFromPitches(
  scale: Scale, tuning: readonly number[], pitches: number[][], name: string, startDegree: number,
  offset: number[] | undefined,
): FretboardScaleShape | null {
  const oct = scale.tuningSystem.octaveSteps;
  const pcList = scale.getPitchClasses();
  const frets = pitches.map((ps, i) => ps.map(p => p - tuning[i]));
  if (frets.some(fs => fs.some(f => f < 0))) return null;
  const all = frets.flat();
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const shape: FretboardScaleShape = {
    frets: frets.map((fs, i) => fs.map(f => f + (offset?.[i] ?? 0))),
    baseFret: Math.max(1, lo),
    tuning: toNoteNames(tuning, scale.tuningSystem),
    root: scaleRootName(scale),
    degrees: pitches.map(ps => ps.map(p => degreeOf(pcList, ((p % oct) + oct) % oct))),
    name,
    startDegree,
    span: hi - lo,
  };
  if (offset) shape.stringOffset = offset;
  return shape;
}

/** The lowest step at or above `from` whose pitch class is in `pcs`. */
function nextPitch(from: number, pcs: Set<number>, oct: number): number {
  let p = from;
  while (!pcs.has(((p % oct) + oct) % oct)) p++;
  return p;
}

/**
 * Notes per string from a start: `perString` consecutive scale notes on each string, each string
 * going on from the next scale note above the last one of the string below. When a note would
 * lie below a string's nut the whole pattern starts an octave up (E major's E shape at fret 12,
 * not 0); when it still would, as on a reentrant ukulele, that string moves up an octave.
 */
function consecutivePitches(tuning: readonly number[], pcs: Set<number>, oct: number, start: number, perString: number): number[][] {
  const build = (from: number, wrap: boolean): number[][] => {
    const pitches: number[][] = [];
    let p = from;
    tuning.forEach((open, i) => {
      if (i > 0) p = nextPitch(p + 1, pcs, oct);
      if (wrap) while (p < open) p += oct;
      const ps: number[] = [p];
      for (let k = 1; k < perString; k++) { p = nextPitch(p + 1, pcs, oct); ps.push(p); }
      pitches.push(ps);
    });
    return pitches;
  };
  const fits = (pitches: number[][]) => pitches.every((ps, i) => ps.every(p => p >= tuning[i]));
  const here = build(start, false);
  if (fits(here)) return here;
  const up = build(start + oct, false);
  return fits(up) ? up : build(start, true);
}

/**
 * Named scale positions on a fretted instrument, with the degree of every note.
 *
 * - `'3nps'`: three notes per string, one pattern per degree of the scale (seven for a
 *   seven-note scale). Pattern k starts on degree k at its lowest fret on the lowest string;
 *   each string goes on with the next three notes of the scale. Works for any tuning and number
 *   of strings; `span` tells how far a pattern stretches (a reentrant tuning, like the
 *   ukulele's, gives patterns too wide to play).
 * - `'caged'`: the five CAGED shapes, in the order they climb the neck: E, D, C, A, G (Em, Dm,
 *   Cm, Am, Gm when the tonic triad is minor). Each is a two-notes-per-string box of the major
 *   (or minor) pentatonic starting on degree 1, 2, 3, 5 or 6 on the lowest string, with the
 *   other notes of the scale placed within the box's frets. Defined for the 6-string guitar in
 *   standard tuning (E A D G B E, or the same intervals transposed) and for scales that hold the
 *   major pentatonic (1 2 3 5 6) or the minor pentatonic (1 b3 4 5 b7) on their tonic, in
 *   12-TET: the major scale and its modes, the pentatonics, blues. Anything else gives `[]`
 *   (harmonic minor lacks the b7).
 *
 * Sources: CAGED and three-notes-per-string as taught for guitar (Learn Jazz Standards,
 * "CAGED System Scales"; Guitar Masterclass, "Three Notes per String Scales").
 *
 * @param scale - The scale to place.
 * @param tuning - Open string steps from A4, low→high, in steps of the scale's tuning.
 * @param options - `system` (required) and `stringOffset`.
 * @returns The shapes, each a {@link FretboardScaleResult} with `name`, `startDegree` and `span`.
 * @category Core
 */
export function getFretboardScaleShapes(
  scale: Scale,
  tuning: readonly number[],
  options: FretboardShapeOptions,
): FretboardScaleShape[] {
  const oct = scale.tuningSystem.octaveSteps;
  const pcList = scale.getPitchClasses();
  const pcs = new Set(pcList);
  const offset = options.stringOffset;
  if (tuning.length === 0) return [];
  const lowest = tuning[0];
  const lowestFretOf = (pc: number) => ((pc - lowest) % oct + oct) % oct;

  if (options.system === '3nps') {
    return pcList
      .map((pc, k) => {
        const pitches = consecutivePitches(tuning, pcs, oct, lowest + lowestFretOf(pc), 3);
        return shapeFromPitches(scale, tuning, pitches, `Pattern ${k + 1}`, k + 1, offset);
      })
      .filter((s): s is FretboardScaleShape => s !== null);
  }

  // CAGED: 6-string guitar in standard tuning, 12-TET, a major or minor tonic triad
  if (oct !== 12 || tuning.length !== 6) return [];
  if (tuning.slice(1).some((t, i) => t - tuning[i] !== STANDARD_GUITAR_INTERVALS[i])) return [];
  const rootPc = pcList[0];
  const has = (semis: number) => pcs.has((rootPc + semis) % 12);
  // The shapes are pentatonic boxes: the scale must hold the major or minor pentatonic
  const major = [0, 2, 4, 7, 9].every(has);
  const minor = !major && [0, 3, 5, 7, 10].every(has);
  if (!major && !minor) return [];
  const pentatonic = (major ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]).map(s => (rootPc + s) % 12);
  const pentaPcs = new Set(pentatonic);
  const names = ['E', 'D', 'C', 'A', 'G'].map(n => `${n}${major ? '' : 'm'} shape`);

  return pentatonic.map((pc, k) => {
    // The pentatonic box: two notes per string from this degree on the lowest string
    const box = consecutivePitches(tuning, pentaPcs, 12, lowest + lowestFretOf(pc), 2);
    const boxFrets = box.flatMap((ps, i) => ps.map(p => p - tuning[i]));
    const lo = Math.min(...boxFrets);
    const hi = Math.max(...boxFrets);
    // Every scale note from the box's lowest to its highest, on the string of the box note
    // below it, or on the next string when it would fall past the box's frets
    const pitches: number[][] = box.map(ps => [...ps]);
    const first = box[0][0];
    const last = box[5][1];
    for (let p = nextPitch(lowest + lo, pcs, 12); p <= tuning[5] + hi; p = nextPitch(p + 1, pcs, 12)) {
      if (pentaPcs.has(((p % 12) + 12) % 12) && p >= first && p <= last) continue; // a box note already
      let s = 0;
      while (s < 5 && box[s + 1][0] <= p) s++;
      if (p - tuning[s] > hi && s < 5 && p - tuning[s + 1] >= lo) s++;
      const fret = p - tuning[s];
      if (fret < lo || fret > hi) continue;
      pitches[s].push(p);
    }
    pitches.forEach(ps => ps.sort((a, b) => a - b));
    const degree = pcList.indexOf(pc) + 1;
    return shapeFromPitches(scale, tuning, pitches, names[k], degree, offset);
  }).filter((s): s is FretboardScaleShape => s !== null);
}
