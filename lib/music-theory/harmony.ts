/**
 * Harmonic analysis: voice leading, chord functions, modulation detection,
 * negative harmony, Coltrane axis, and slash chord analysis.
 */
import { Chord, chordQualityFromIntervals, chordDegreeLabel } from './chord';
import { spellChordInKey, spellPitchInKey } from './spelling';
import { parseScaleSymbol, parseChordSymbol } from './parser';
import { get12TETBaseName, parseNoteToStep12TET, preferFlatsForKey, writtenRoot, NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP } from './utils';
import { CHORD_FORMULAS, SCALE_PATTERNS, MODE_BRIGHTNESS } from './dictionaries';
import { Note } from './note';
import { Scale } from './scale';
import { KeyDetection } from './key-detection';
import { TuningSystem, TET12, EDO } from './tuning';

/** Whether a tuning is 12-TET itself. */
const isTwelveTET = (ts: TuningSystem): boolean => ts instanceof EDO && ts.divisions === 12;

/** The chords in 12-TET, when every note of every chord stands for a 12-TET note. */
function chordsInTwelve(chords: Chord[]): Chord[] | null {
  const mapped = chords.map(c => c.retune(TET12));
  return mapped.some(c => c === null) ? null : mapped as Chord[];
}

/** The notes in 12-TET, when they are in another tuning and each stands for a 12-TET note. */
function notesInTwelve(notes: Note[]): Note[] | null {
  const mapped = notes.map(n => n.retune(TET12));
  return mapped.some(n => n === null) ? null : mapped as Note[];
}

// ============================================================================
//  Module constants
// ============================================================================

const EXTENDED_MODE_BRIGHTNESS: Record<string, number> = {
  ...MODE_BRIGHTNESS,
  'harmonic major':  -1,
  'melodic minor':   -2,
  'harmonic minor':  -3,
};

// Characteristic pitch offsets (semitones from home tonic) for each parallel mode: the
// degrees that set it apart from its reference scale (major modes against Ionian, minor
// modes against Aeolian; Aeolian against Dorian). A borrowed chord is "characteristic"
// if it contains one of them. Source: Berklee Online, "Modes" (Take Note).
const MODE_CHARACTERISTIC_PC: Record<string, number[]> = {
  'lydian':          [6],         // #4
  'mixolydian':      [10],        // b7
  'dorian':          [9],         // natural 6 in minor context
  'aeolian':         [8],         // b6
  'minor':           [8],
  'phrygian':        [1],         // b2
  'locrian':         [1, 6],      // b2, b5
  'harmonic minor':  [11],        // raised 7
  'melodic minor':   [9, 11],     // raised 6 and 7
  'harmonic major':  [8],         // b6
};

// ============================================================================
//  Types
// ============================================================================

/**
 * Category of a voice-leading problem detected between two chords.
 * @category Tonal harmony
 */
export type VoiceLeadingIssueType =
  | 'Parallel 5th' | 'Parallel Octave' | 'Voice Crossing' | 'Voice Overlap'
  | 'Leading Tone Unresolved' | '7th Unresolved' | 'Forbidden Leap'
  | 'Hidden Fifth' | 'Hidden Octave' | 'Direct Fifth' | 'Direct Octave'
  | 'False Relation' | 'Doubled Leading Tone'
  | 'Missing Third' | 'Missing Root' | 'Missing Fifth'
  | 'Improper 6/4 Usage';

/**
 * A specific voice-leading problem detected between two voices.
 * @category Tonal harmony
 */
export interface VoiceLeadingIssue {
  /** What the problem is. */
  type: VoiceLeadingIssueType;
  /** Indices of the voices involved, as ordered in the arrays passed in (0 = first note). */
  voices: number[];
  /** Readable description, with voices numbered from 1 (`'Parallel 5ths (Voices 1 and 3)'`). */
  message: string;
}

/**
 * A doubling or spacing problem detected in a chord voicing.
 * @category Tonal harmony
 */
export interface DoublingIssue {
  /** What the problem is. */
  type: 'Doubled Leading Tone' | 'Missing Third' | 'Missing Root' | 'Missing Fifth' | 'Improper Doubling';
  /** Indices of the voices involved in the voicing passed in; empty when a chord member is missing. */
  voices: number[];
  /** Readable description. */
  message: string;
}

/**
 * Full harmonic analysis of a chord within a key context.
 * Includes Roman numeral, function (T/S/D), modal borrowing, and cadence detection.
 * @category Tonal harmony
 */
export interface ChordAnalysis {
  /** The chord analyzed, as passed in. */
  chord: Chord;
  /**
   * Roman numeral in the local key, readable back with `parseRomanProgression`: `'ii7'`,
   * `'V7'`, `'bVImaj7'`, `'#iv°7'`, `'ivm'` (a minor chord the key does not hold).
   */
  roman: string;
  /** Scale degree of the root, 1-7, or -1 when the root cannot be placed on a degree. */
  degree: number;
  /** Tonic, subdominant or dominant function; secondary dominants and the tritone sub of V are `'D'`. */
  function: 'T' | 'S' | 'D' | 'unknown';
  /** Every note belongs to the local key (in natural minor, also V, V7, vii° and vii°7 with the raised seventh). */
  isDiatonic: boolean;
  /** The chord comes from a parallel mode (see `borrowedFrom`). Secondary dominants are not borrowed. */
  isBorrowed: boolean;
  /** Mode it is borrowed from: `'minor'`, `'dorian'`, `'phrygian'`, `'mixolydian'`, `'lydian'`, `'harmonic minor'`… */
  borrowedFrom?: string;
  /** A secondary dominant or leading-tone chord (see `secondaryTarget`). */
  isSecondary: boolean;
  /** The secondary function: `'V7/ii'`, `'V7/IV'`, `'vii°7/V'`. The target is cased by its triad in the key. */
  secondaryTarget?: string;
  /** Cadence formed with the next chord, read in the next chord's key: `'Authentic Cadence (V -> I)'`… (see `Harmony.analyzeCadence`). */
  cadenceWithNext?: string;
  /** `'tritone sub of V'` for a dominant seventh on bII. */
  substitutionCandidate?: string;
  /** The key this chord was read in: the home key, or the key of the last modulation. */
  key: string;
}

/**
 * A detected key change within a chord progression.
 * Includes the index where modulation occurs and the type (pivot, direct, etc.).
 * @category Tonal harmony
 */
export interface ModulationEvent {
  /** Index of the first chord read in the new key. */
  atIndex: number;
  /** Key before the change, as passed in or as a previous event's `toKey`. */
  fromKey: string;
  /** New key, as `'G major'` or `'C minor'`. */
  toKey: string;
  /**
   * `'pivot'` when the chord before `atIndex` belongs to both keys, otherwise `'direct'`.
   * `analyzeProgression` only gives these two; `Harmony.classifyModulation` also tells
   * `'enharmonic'`, `'chromatic'` and `'common-tone'`.
   */
  type: 'direct' | 'pivot' | 'enharmonic' | 'chromatic' | 'common-tone';
  /** The chord before `atIndex`, when it belongs to both keys. */
  pivotChord?: Chord;
}

/**
 * Analysis of a second-inversion (6/4) chord.
 * Classifies it as cadential, pedal, passing, or arpeggiated.
 * @category Tonal harmony
 */
export interface SixFourAnalysis {
  /** How the 6/4 chord is used; `'none'` when the chord is not in second inversion. */
  type: 'cadential' | 'pedal' | 'passing' | 'arpeggiated' | 'none';
  /** For a cadential 6/4, the chord it resolves to (the following V). */
  resolution?: Chord;
}

/**
 * One reading of a set of notes as a chord, with what ranks it (see `Harmony.detectChordsScored`).
 * @category Tonal harmony
 */
export interface ChordCandidate {
  /** Chord symbol, with a slash bass when the lowest note is not the root: `'C7'`, `'C7/E'`. */
  name: string;
  /** Root note name, without octave. */
  root: string;
  /** Lowest note name, without octave. */
  bass: string;
  /** Key of the formula in `CHORD_FORMULAS` (`'M'`, `'7'`, `'maj9'`…). */
  quality: string;
  /** 1 for a complete chord over its root; less for each omitted member, another bass, and each tension. */
  score: number;
  /** The lowest note is the root. */
  rootInBass: boolean;
  /** Formula members that do not sound (`'5'`; `'9'` and `'11'` in eleventh and thirteenth chords). */
  omitted: string[];
  /** Members above the octave: `'9'`, `'#11'`, `'b13'`… */
  tensions: string[];
}

/**
 * A chord borrowed from a parallel mode (modal mixture), from `Harmony.getBorrowedChords`.
 * @category Tonal harmony
 */
export interface BorrowedChord {
  /** The borrowed chord, spelled in the source mode. */
  chord: Chord;
  /** Mode it comes from, on the same tonic: `'aeolian'`, `'dorian'`, `'mixolydian'`, `'harmonic minor'`… */
  sourceMode: string;
  /** Brightness of the source mode: lydian 1, ionian 0 … locrian -5 (`MODE_BRIGHTNESS`; melodic minor -2, harmonic minor -3). */
  brightness: number;
  /** Function of the chord in the home key. */
  function: 'T' | 'S' | 'D' | 'unknown';
  /**
   * The chord holds a degree that sets the source mode apart from its reference scale
   * (#4 lydian, b7 mixolydian, 6 dorian, b6 aeolian, b2 phrygian, b2 or b5 locrian…).
   */
  characteristic: boolean;
}

/**
 * A chord that functions diatonically in two different keys,
 * used as the pivot point in a modulation.
 * @category Tonal harmony
 */
export interface PivotChord {
  /** The chord, spelled as in key A. */
  chord: Chord;
  /** Its role in key A. */
  functionInA: {
    /** Scale degree of the root, 1-7. */
    degree: number;
    /** Tonic, subdominant or dominant function. */
    function: 'T' | 'S' | 'D';
  };
  /** Its role in key B. */
  functionInB: {
    /** Scale degree of the root, 1-7. */
    degree: number;
    /** Tonic, subdominant or dominant function. */
    function: 'T' | 'S' | 'D';
  };
}

/**
 * The Coltrane substitution axis for a given root.
 * The three major-third substitutions form a diminished seventh pattern.
 * @category Tonal harmony
 */
export interface ColtraneAxis {
  /** Root of the key passed in. */
  root: string;
  /** The root and the roots a major third and an augmented fifth above it: `['C', 'E', 'Ab']`. */
  majorThirds: [string, string, string];
}

/**
 * How a slash chord is interpreted: simple inversion, hybrid, polychord, or upper structure.
 * @category Tonal harmony
 */
export type SlashType = 'inversion' | 'hybrid' | 'polychord' | 'upper-structure';

/**
 * Result of analyzing a slash chord (e.g. C/E, Fmaj7/A).
 * Distinguishes inversions from hybrid chords, polychords, and upper structures.
 * @category Tonal harmony
 */
export interface SlashAnalysis {
  /** How the slash chord reads (an inversion when the bass is a chord tone). */
  type: SlashType;
  /** Chord formed by the upper notes, for `'upper-structure'` and `'polychord'`. */
  upperStructure?: Chord;
  /** The bass note. */
  lowerRoot?: Note;
  /** Major triad on the bass, for `'polychord'`. */
  lowerChord?: Chord;
  /** Upper notes named as intervals over the bass: `'R'`, `'M3'`, `'P5'`, `'b7'`, `'9'`, `'#11'`, `'13'`… */
  resultingTensions?: string[];
}

/**
 * Hints for enharmonic respelling decisions.
 * Providing a key or functional role improves spelling accuracy.
 * @category Tonal harmony
 */
export interface RespellContext {
  /** Key to spell in (`'Db major'`); takes precedence over `direction`. */
  keySymbol?: string;
  /** Accepted but not read yet by `respellNote` or `respellChord`. */
  functionalRole?: 'secondary-dominant' | 'chromatic-mediant' | 'passing' | 'neighbor';
  /** Without a key: `'ascending'` spells with sharps, `'descending'` with flats. */
  direction?: 'ascending' | 'descending';
}

// ============================================================================
//  Module-level helpers
// ============================================================================

interface KeyInfo {
  scale: Scale;
  scalePcs: number[];
  tonicPc: number;
  rootName: string;
  mode: string;
  isMinor: boolean;
  tuning: TuningSystem;
  symbol: string;
  /** Where a chord root's letter comes from: the key (`spellChordInKey`) or the chord's name. */
  spelling: 'key' | 'written';
}

function parseKey(keySymbol: string, tuning: TuningSystem, spelling: 'key' | 'written' = 'key'): KeyInfo {
  const scale = parseScaleSymbol(keySymbol, tuning);
  const scalePcs = scale.getPitchClasses();
  const match = keySymbol.match(/^([A-G][#b]*)\s+(.*)$/i);
  const rootName = match ? match[1] : 'C';
  const modeRaw = match ? match[2].trim().toLowerCase() : 'major';
  const isMinor = /minor|aeolian|dorian|phrygian|locrian/.test(modeRaw);
  return { scale, scalePcs, tonicPc: scalePcs[0], rootName, mode: modeRaw, isMinor, tuning, symbol: keySymbol, spelling };
}

function pcMod(step: number, oct: number): number {
  return ((step % oct) + oct) % oct;
}

const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Interval (semitone from bass) → tension name, used by analyzeSlash
const TENSION_NAMES: Record<number, string> = {
  0: 'R', 1: 'b9', 2: '9', 3: '#9', 4: 'M3', 5: '11',
  6: '#11', 7: 'P5', 8: 'b13', 9: '13', 10: 'b7', 11: 'M7',
};

function qualityToRomanParts(quality: string): { upper: boolean; suffix: string } {
  switch (quality) {
    case 'M': return { upper: true,  suffix: '' };
    case 'm': return { upper: false, suffix: '' };
    case 'dim': return { upper: false, suffix: '°' };
    case 'aug': return { upper: true,  suffix: '+' };
    case 'sus2': return { upper: true,  suffix: 'sus2' };
    case 'sus4': return { upper: true,  suffix: 'sus4' };
    case 'maj7': return { upper: true,  suffix: 'maj7' };
    case 'm7': return { upper: false, suffix: '7' };
    case '7': return { upper: true,  suffix: '7' };
    case 'dim7': return { upper: false, suffix: '°7' };
    case 'm7b5': return { upper: false, suffix: 'ø7' };
    case 'mM7': return { upper: false, suffix: '(maj7)' };
    case 'aug7': return { upper: true,  suffix: '+7' };
    case 'augM7': return { upper: true,  suffix: '+maj7' };
    default: return { upper: true, suffix: quality };
  }
}

/**
 * Computes a Roman numeral and diagnostic flags for `chord` in `key`.
 */
function getRomanForChord(chord: Chord, key: KeyInfo): {
  roman: string;
  degree: number;
  accidental: '' | 'b' | '#';
  isDiatonic: boolean;
  quality: string;
} {
  const oct = chord.tuningSystem.octaveSteps;
  const chordRootPc = pcMod(chord.rootStep, oct);

  // Try direct match against scale degrees first
  const idx = key.scalePcs.indexOf(chordRootPc);
  let accidental: '' | 'b' | '#' = '';
  let degree = idx !== -1 ? idx + 1 : -1;

  // A chromatic root takes its degree from the letter the key spells it with
  // (F#°7 in C is #iv°7, as `spellChordInKey` writes F#, not bv°7). With written
  // spelling every root keeps the letter of its name (Gb in C is bV, B# is #vii).
  const byLetter = idx === -1 || key.spelling === 'written' ? degreeByLetter(chord, key) : null;
  if (byLetter) {
    degree = byLetter.degree;
    accidental = byLetter.accidental;
  } else if (idx === -1) {
    // Try as flatted degree (root is 1 semitone below a scale note)
    const sharpTarget = pcMod(chordRootPc + 1, oct);
    const flatIdx = key.scalePcs.indexOf(sharpTarget);
    // Try as sharped degree
    const flatTarget = pcMod(chordRootPc - 1, oct);
    const sharpIdx = key.scalePcs.indexOf(flatTarget);
    // In a minor key, a root from the parallel major is a raised degree: G# in A minor
    // is #VII (the leading tone), not bI; C# is #III and F# is #VI.
    const majorPcs = [0, 2, 4, 5, 7, 9, 11].map(s => pcMod(key.tonicPc + key.tuning.getStepFromStandard(s), oct));
    const raised = key.isMinor && majorPcs.includes(chordRootPc);
    if (raised && sharpIdx !== -1) { degree = sharpIdx + 1; accidental = '#'; }
    else if (flatIdx !== -1) { degree = flatIdx + 1; accidental = 'b'; }
    else if (sharpIdx !== -1) { degree = sharpIdx + 1; accidental = '#'; }
  }

  const quality = chordQualityFromIntervals(chord, oct);

  // Diatonic = every pitch class of the chord is in the scale
  const chordPcs = chord.getPitchClasses();
  let isDiatonic = chordPcs.every(pc => key.scalePcs.includes(pc));

  // In a natural minor key, the dominant and leading-tone chords take the raised 7th
  // (harmonic minor) and count as diatonic: E7 and G#dim7 in A minor. The leading-tone
  // chord is written vii°, as V is written without an accidental.
  if (!isDiatonic && isNaturalMinor(key)) {
    const st = (s: number) => pcMod(key.tonicPc + key.tuning.getStepFromStandard(s), oct);
    const leadingTone = st(11);
    const harmonicPcs = key.scalePcs.map(pc => (pc === st(10) ? leadingTone : pc));
    const isV = chordRootPc === st(7) && (quality === 'M' || quality === '7');
    const isVii = chordRootPc === leadingTone && (quality === 'dim' || quality === 'dim7');
    if ((isV || isVii) && chordPcs.includes(leadingTone) && chordPcs.every(pc => harmonicPcs.includes(pc))) {
      isDiatonic = true;
      if (isVii) { degree = 7; accidental = ''; }
    }
  }

  const parts = qualityToRomanParts(quality);
  // A lower-case numeral with no quality takes the key's chord (vii in C is Bdim, vii7
  // Bm7b5): a minor chord that is not the key's says so (Bm → viim, Bm7 → viim7).
  if (accidental === '' && !isDiatonic && (quality === 'm' || quality === 'm7')) parts.suffix = quality;
  // In natural minor `vii°` stands on the raised leading tone; a diminished chord on the
  // natural seventh (G° in A minor) is written with its quality in full: `VIIdim`.
  const onNaturalSeventh = isNaturalMinor(key) && degree === 7 && accidental === ''
    && chordRootPc === pcMod(key.tonicPc + key.tuning.getStepFromStandard(10), oct);
  if (onNaturalSeventh && (quality === 'dim' || quality === 'dim7' || quality === 'm7b5')) {
    parts.upper = true;
    parts.suffix = quality;
  }
  const romanBase = degree > 0 ? ROMAN_UPPER[degree - 1] : '?';
  const romanCased = parts.upper ? romanBase : romanBase.toLowerCase();
  const roman = `${accidental}${romanCased}${parts.suffix}`;

  return { roman, degree, accidental, isDiatonic, quality };
}

/**
 * Degree and accidental of a chord root from its letter as written in the key (12-TET,
 * seven-note keys). Null when the key has no letters or the root needs a double accidental.
 */
function degreeByLetter(chord: Chord, key: KeyInfo): { degree: number; accidental: '' | 'b' | '#' } | null {
  if (chord.tuningSystem.octaveSteps !== 12 || key.scalePcs.length !== 7) return null;
  const keyNotes = key.scale.getNotes();
  const written = key.spelling === 'written' ? writtenRoot(chord.name.split('/')[0], chord.rootStep) : null;
  const rootLetter = (written ?? spellChordInKey(chord, key.symbol).name)[0];
  const degreeIdx = keyNotes.slice(0, 7).findIndex(n => n.name[0] === rootLetter);
  if (degreeIdx === -1) return null;
  const diff = pcMod(chord.rootStep - keyNotes[degreeIdx].stepsFromBase + 6, 12) - 6;
  if (Math.abs(diff) > 1) return null;
  return { degree: degreeIdx + 1, accidental: diff === 1 ? '#' : diff === -1 ? 'b' : '' };
}

function isNaturalMinor(key: KeyInfo): boolean {
  return key.mode === 'minor' || key.mode === 'aeolian' || key.mode === 'natural minor';
}

/**
 * Maps a (degree, quality) pair to a functional category T/S/D.
 * Conservative mapping: uses scale degree primarily; quality only disambiguates edge cases.
 * Secondary dominants and leading-tone chords are D whatever their degree; that override
 * lives in `analyzeProgression`, which knows the chord is secondary.
 */
function getFunction(degree: number, quality: string, isMinor: boolean, accidental: '' | 'b' | '#' = ''): 'T' | 'S' | 'D' | 'unknown' {
  if (degree <= 0) return 'unknown';
  // Dominants: V (any quality), vii° (leading-tone)
  if (degree === 5) return 'D';
  if (degree === 7) {
    if (quality === 'dim' || quality === 'dim7' || quality === 'm7b5') return 'D';
    // The subtonic VII of a minor key stands in for V (i-VII-i, the Andalusian cadence)
    if (isMinor && accidental === '') return 'D';
    // bVII in major comes from the minor subdominant family (the backdoor bVII7)
    if (!isMinor && accidental === 'b') return 'S';
    return 'unknown';
  }
  // Subdominants: ii, IV
  if (degree === 2 || degree === 4) return 'S';
  // Tonics: I, iii, vi
  if (degree === 1 || degree === 3 || degree === 6) return 'T';
  return 'unknown';
}

/** A dominant seventh on the first, fourth or fifth degree: the I7, IV7 and V7 of the blues. */
function isBluesSeventh(chord: Chord, key: KeyInfo): boolean {
  const oct = chord.tuningSystem.octaveSteps;
  if (chordQualityFromIntervals(chord, oct) !== '7') return false;
  const fromTonic = pcMod(chord.rootStep - key.tonicPc, oct);
  return [0, 5, 7].map(s => key.tuning.getStepFromStandard(s)).includes(fromTonic);
}

function detectSecondaryDominant(chord: Chord, key: KeyInfo): { isSecondary: boolean; target?: string } {
  const oct = chord.tuningSystem.octaveSteps;
  const quality = chordQualityFromIntervals(chord, oct);
  const chordRootPc = pcMod(chord.rootStep, oct);

  // Secondary leading-tone chord: a chromatic diminished chord a semitone below a diatonic
  // degree (F#°7 → G in C major is vii°7/V). Diatonic ones keep their own reading (ii° in minor).
  const ltSuffix: Record<string, string> = { dim: 'vii°', dim7: 'vii°7', m7b5: 'viiø7' };
  if (ltSuffix[quality]) {
    if (chord.getPitchClasses().every(pc => key.scalePcs.includes(pc))) return { isSecondary: false };
    const targetPc = pcMod(chordRootPc + key.tuning.getStepFromStandard(1), oct);
    if (targetPc === key.tonicPc) return { isSecondary: false };
    const targetIdx = key.scalePcs.indexOf(targetPc);
    if (targetIdx === -1 || key.scalePcs.length !== 7) return { isSecondary: false };
    // A diminished triad cannot be tonicized
    const fifth = pcMod(key.scalePcs[(targetIdx + 4) % 7] - targetPc, oct);
    if (fifth === key.tuning.getStepFromStandard(6)) return { isSecondary: false };
    return { isSecondary: true, target: `${ltSuffix[quality]}/${targetRoman(key, targetIdx, targetIdx + 1)}` };
  }

  if (quality !== '7' && quality !== 'M') return { isSecondary: false };
  const targetPc = pcMod(chordRootPc + 5, oct); // V → I is root+5 (a 4th up)

  // Don't flag V → I of the main key as secondary
  if (targetPc === key.tonicPc) return { isSecondary: false };

  const targetIdx = key.scalePcs.indexOf(targetPc);
  if (targetIdx === -1) return { isSecondary: false };

  const targetDegree = targetIdx + 1;
  // Only meaningful for dom7 ('7'), or for plain major triads as secondary dominants
  if (quality !== '7') return { isSecondary: false };
  return { isSecondary: true, target: `V7/${targetRoman(key, targetIdx, targetDegree)}` };
}

/**
 * Roman numeral of a tonicized degree, cased by the diatonic triad built on it:
 * upper case for major, lower case for minor (V7/ii in C major, V7/IV stays upper).
 */
function targetRoman(key: KeyInfo, targetIdx: number, targetDegree: number): string {
  const upper = ROMAN_UPPER[targetDegree - 1];
  const pcs = key.scalePcs;
  if (pcs.length !== 7) return upper;
  const oct = key.tuning.octaveSteps;
  const third = pcMod(pcs[(targetIdx + 2) % 7] - pcs[targetIdx], oct);
  return third === key.tuning.getStepFromStandard(3) ? upper.toLowerCase() : upper;
}

/**
 * Returns a human-readable tag for a borrowed chord, based on parallel-mode analysis,
 * or null if the chord is not a borrowing from a recognized parallel mode.
 */
function detectBorrowedFrom(chord: Chord, key: KeyInfo): string | null {
  if (key.tuning.octaveSteps !== 12) return null;
  const chordPcs = new Set(chord.getPitchClasses());

  // Try parallel modes based on whether main key is major or minor
  const parallelCandidates = key.isMinor
    ? ['major', 'dorian', 'phrygian', 'mixolydian', 'lydian', 'harmonic minor']
    : ['minor', 'dorian', 'mixolydian', 'phrygian', 'lydian', 'harmonic minor', 'melodic minor'];

  for (const mode of parallelCandidates) {
    let modeScale: Scale;
    try {
      modeScale = parseScaleSymbol(`${key.rootName} ${mode}`, key.tuning);
    } catch {
      continue;
    }
    const modePcs = new Set(modeScale.getPitchClasses());
    // Chord must be fully diatonic to the parallel mode
    const fits = Array.from(chordPcs).every(pc => modePcs.has(pc));
    if (!fits) continue;
    // And must include at least one note NOT in the home key (otherwise it's diatonic)
    const distinctive = Array.from(chordPcs).some(pc => !key.scalePcs.includes(pc));
    if (distinctive) return mode;
  }
  return null;
}

function detectTritoneSubOfV(chord: Chord, key: KeyInfo): boolean {
  const oct = chord.tuningSystem.octaveSteps;
  if (oct !== 12) return false;
  const quality = chordQualityFromIntervals(chord, oct);
  if (quality !== '7') return false;
  const chordRootPc = pcMod(chord.rootStep, oct);
  // tritone sub root = bII of target = tonicPc + 1
  return chordRootPc === pcMod(key.tonicPc + 1, oct);
}

// ============================================================================
//  Harmony
// ============================================================================

/**
 * Tonal harmony, as static methods: progression analysis (`analyzeProgression`), chord
 * detection (`detectChords`, `detectChordsScored`), cadences, voice leading and doubling
 * checks, secondary and borrowed chords, modulation and pivot chords, chord-scale
 * suggestions, negative harmony, the Coltrane axis, slash chords and enharmonic respelling.
 * Key arguments are written `'C major'`, `'A minor'`, `'D dorian'`.
 * @category Tonal harmony
 */
export class Harmony {
  /**
   * Checks voice leading between two chords. Emits warnings for parallel motion,
   * voice crossing, overlap, and (when `context` is provided) unresolved tendency
   * tones, hidden/direct 5ths/8ves, false relations, and doubled leading tones.
   *
   * Voices are expected to be ordered bass → soprano in both chords.
   *
   * @param ruleset
   *   - `'strict'`: Bach chorale-style - all standard prohibitions enforced.
   *   - `'contemporary'`: jazz/pop - relaxes parallel 5ths/8ves and leaps.
   *   - `'species'`: minimal - no parallels, no crossing, no overlap. Full species
   *      counterpoint rules live in the counterpoint module (future phase).
   * @param context Optional harmonic context enabling tendency-tone and false-relation checks.
   */
  static checkVoiceLeading(
    chordA: Note[],
    chordB: Note[],
    ruleset: 'strict' | 'contemporary' | 'species' = 'strict',
    context?: { keySymbol?: string; chordA?: Chord; chordB?: Chord }
  ): VoiceLeadingIssue[] {
    const issues: VoiceLeadingIssue[] = [];
    const len = Math.min(chordA.length, chordB.length);
    if (len < 2) return issues;

    const ts = chordA[0].tuningSystem;
    const oct = ts.octaveSteps;
    const p5 = ts.getStepFromStandard(7);

    // Pair-wise interval checks (parallel 5ths/8ves, hidden/direct motion)
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const stepsA = chordA[j].stepsFromBase - chordA[i].stepsFromBase;
        const stepsB = chordB[j].stepsFromBase - chordB[i].stepsFromBase;

        const is5thA = Math.abs(stepsA) % oct === p5;
        const is5thB = Math.abs(stepsB) % oct === p5;
        const is8veA = Math.abs(stepsA) % oct === 0 && stepsA !== 0;
        const is8veB = Math.abs(stepsB) % oct === 0 && stepsB !== 0;

        const voiceIDelta = chordB[i].stepsFromBase - chordA[i].stepsFromBase;
        const voiceJDelta = chordB[j].stepsFromBase - chordA[j].stepsFromBase;
        const voiceIMoved = voiceIDelta !== 0;
        const voiceJMoved = voiceJDelta !== 0;
        const sameDirection = (voiceIDelta > 0 && voiceJDelta > 0) || (voiceIDelta < 0 && voiceJDelta < 0);

        if (ruleset === 'strict' || ruleset === 'species') {
          if (is5thA && is5thB && voiceIMoved && voiceJMoved) {
            issues.push({ type: 'Parallel 5th', voices: [i, j], message: `Parallel 5ths (Voices ${i+1} and ${j+1})` });
          }
          if (is8veA && is8veB && voiceIMoved && voiceJMoved) {
            issues.push({ type: 'Parallel Octave', voices: [i, j], message: `Parallel Octaves (Voices ${i+1} and ${j+1})` });
          }
          // Hidden/Direct 5ths and 8ves - only flag outer-voice pairs (bass + soprano) in chorale style
          const isOuterPair = (i === 0 && j === len - 1);
          if (ruleset === 'strict' && isOuterPair && sameDirection && voiceIMoved && voiceJMoved) {
            const isLeap = Math.abs(voiceJDelta) > ts.getStepFromStandard(2); // > major 2nd = leap in top voice
            if (is5thB && !is5thA) {
              issues.push({
                type: isLeap ? 'Hidden Fifth' : 'Direct Fifth',
                voices: [i, j],
                message: `${isLeap ? 'Hidden' : 'Direct'} 5th into outer voices`
              });
            }
            if (is8veB && !is8veA) {
              issues.push({
                type: isLeap ? 'Hidden Octave' : 'Direct Octave',
                voices: [i, j],
                message: `${isLeap ? 'Hidden' : 'Direct'} octave into outer voices`
              });
            }
          }
        }

        if (chordB[i].stepsFromBase > chordB[j].stepsFromBase) {
          issues.push({ type: 'Voice Crossing', voices: [i, j], message: `Voice Crossing: Voice ${i+1} crosses above Voice ${j+1}` });
        }
        // Overlap: a voice passes where its neighbour just was (adjacent voices only)
        if (j === i + 1 && chordB[i].stepsFromBase > chordA[j].stepsFromBase) {
          issues.push({ type: 'Voice Overlap', voices: [i, j], message: `Voice Overlap: Voice ${i+1} rises above previous Voice ${j+1}` });
        }
        if (j === i + 1 && chordB[j].stepsFromBase < chordA[i].stepsFromBase) {
          issues.push({ type: 'Voice Overlap', voices: [i, j], message: `Voice Overlap: Voice ${j+1} falls below previous Voice ${i+1}` });
        }
      }
    }

    // Per-voice checks: forbidden leaps
    if (ruleset === 'strict' || ruleset === 'species') {
      for (let v = 0; v < len; v++) {
        const delta = chordB[v].stepsFromBase - chordA[v].stepsFromBase;
        const abs = Math.abs(delta);
        // Leap > octave or augmented 4th (6 semitones) in strict; > P5 in species
        const limit = ruleset === 'species' ? ts.getStepFromStandard(7) : oct;
        if (abs > limit) {
          issues.push({
            type: 'Forbidden Leap',
            voices: [v],
            message: `Forbidden leap in Voice ${v+1} (${abs} steps)`
          });
        } else if (ruleset === 'strict' && abs === ts.getStepFromStandard(6)) {
          issues.push({
            type: 'Forbidden Leap',
            voices: [v],
            message: `Augmented 4th leap in Voice ${v+1}`
          });
        }
      }
    }

    // Context-dependent checks: tendency tones, false relations, doubled leading tone
    if (context?.keySymbol) {
      try {
        const key = parseKey(context.keySymbol, ts);
        const leadingTonePc = pcMod(key.tonicPc + ts.getStepFromStandard(11), oct);
        const tonicPc = key.tonicPc;

        if (context.chordA) {
          const qa = chordQualityFromIntervals(context.chordA, oct);
          const rootPcA = pcMod(context.chordA.rootStep, oct);

          // V or V7: leading tone must resolve up to tonic in some voice
          const isDominantRoot = rootPcA === pcMod(tonicPc + ts.getStepFromStandard(7), oct);
          if (isDominantRoot && (qa === 'M' || qa === '7')) {
            const leadingVoices: number[] = [];
            chordA.forEach((n, idx) => {
              if (pcMod(n.stepsFromBase, oct) === leadingTonePc) leadingVoices.push(idx);
            });
            // Doubled leading tone
            if (leadingVoices.length > 1) {
              issues.push({
                type: 'Doubled Leading Tone',
                voices: leadingVoices,
                message: `Leading tone doubled in Voices ${leadingVoices.map(v => v+1).join(', ')}`
              });
            }
            // Unresolved leading tone
            for (const v of leadingVoices) {
              const nextPc = pcMod(chordB[v].stepsFromBase, oct);
              if (nextPc !== tonicPc) {
                issues.push({
                  type: 'Leading Tone Unresolved',
                  voices: [v],
                  message: `Leading tone in Voice ${v+1} does not resolve to tonic`
                });
              }
            }
          }

          // Dominant 7th: 7th must resolve down by step
          if (qa === '7') {
            const seventhPc = pcMod(rootPcA + ts.getStepFromStandard(10), oct);
            chordA.forEach((n, idx) => {
              if (pcMod(n.stepsFromBase, oct) === seventhPc) {
                const delta = chordB[idx].stepsFromBase - n.stepsFromBase;
                // down a minor or major second, in this tuning's steps
                if (delta !== -ts.getStepFromStandard(1) && delta !== -ts.getStepFromStandard(2)) {
                  issues.push({
                    type: '7th Unresolved',
                    voices: [idx],
                    message: `Chord 7th in Voice ${idx+1} does not resolve down by step`
                  });
                }
              }
            });
          }
        }

        // False relations: same letter/pc_class_base differs chromatically between two voices across the pair
        // Simplified: if any pc in chordA maps to a chromatically-altered pc (±1) in chordB in a *different* voice
        const pcsA = chordA.map(n => pcMod(n.stepsFromBase, oct));
        const pcsB = chordB.map(n => pcMod(n.stepsFromBase, oct));
        for (let i = 0; i < pcsA.length; i++) {
          for (let j = 0; j < pcsB.length; j++) {
            if (i === j) continue;
            const diff = ((pcsB[j] - pcsA[i]) % oct + oct) % oct;
            if (diff === 1 || diff === oct - 1) {
              // Ensure same scale letter: approximate via diatonic neighborhood
              // Only flag if pc_A is in scale and pc_B is its chromatic alteration
              if (key.scalePcs.includes(pcsA[i]) !== key.scalePcs.includes(pcsB[j])) {
                issues.push({
                  type: 'False Relation',
                  voices: [i, j],
                  message: `Possible false relation between Voices ${i+1} (chord A) and ${j+1} (chord B)`
                });
              }
            }
          }
        }
      } catch {
        // Bad key symbol - skip contextual checks
      }
    }

    return issues;
  }

  /**
   * Returns warnings about chord voicing: doubled leading tone, missing essential
   * chord tones, and improper doublings relative to conventional practice.
   */
  static checkDoubling(voicing: Note[], chordSymbol: Chord, keySymbol?: string): DoublingIssue[] {
    const issues: DoublingIssue[] = [];
    const ts = chordSymbol.tuningSystem;
    const oct = ts.octaveSteps;
    const voicingPcs = voicing.map(n => pcMod(n.stepsFromBase, oct));
    const chordPcs = chordSymbol.getPitchClasses();
    const rootPc = pcMod(chordSymbol.rootStep, oct);

    // Missing chord tones
    const has = (pc: number) => voicingPcs.includes(pc);
    if (!has(rootPc)) {
      issues.push({ type: 'Missing Root', voices: [], message: 'Root not present in voicing' });
    }
    // 3rd = chord tone at interval m3 or M3
    const thirdPc = chordPcs.find(pc => {
      const rel = pcMod(pc - rootPc, oct);
      return rel === ts.getStepFromStandard(3) || rel === ts.getStepFromStandard(4);
    });
    if (thirdPc !== undefined && !has(thirdPc)) {
      issues.push({ type: 'Missing Third', voices: [], message: '3rd not present in voicing' });
    }
    const fifthPc = chordPcs.find(pc => {
      const rel = pcMod(pc - rootPc, oct);
      return rel === ts.getStepFromStandard(6) || rel === ts.getStepFromStandard(7) || rel === ts.getStepFromStandard(8);
    });
    if (fifthPc !== undefined && !has(fifthPc) && voicing.length >= 3 && chordPcs.length >= 3) {
      // 5th may be omitted in 4-voice dom7, so only flag in triad-only voicings
      const quality = chordQualityFromIntervals(chordSymbol, oct);
      if (quality === 'M' || quality === 'm' || quality === 'dim' || quality === 'aug') {
        issues.push({ type: 'Missing Fifth', voices: [], message: '5th not present in triad voicing' });
      }
    }

    // Doubled leading tone (requires key context)
    if (keySymbol) {
      try {
        const key = parseKey(keySymbol, ts);
        const leadingTonePc = pcMod(key.tonicPc + ts.getStepFromStandard(11), oct);
        const leadingVoices: number[] = [];
        voicing.forEach((n, i) => {
          if (pcMod(n.stepsFromBase, oct) === leadingTonePc) leadingVoices.push(i);
        });
        if (leadingVoices.length > 1) {
          issues.push({
            type: 'Doubled Leading Tone',
            voices: leadingVoices,
            message: `Leading tone doubled in Voices ${leadingVoices.map(v => v+1).join(', ')}`
          });
        }

        // Major triad strict doubling: don't double the 3rd
        const quality = chordQualityFromIntervals(chordSymbol, oct);
        if (quality === 'M' && thirdPc !== undefined) {
          const thirdVoices: number[] = [];
          voicing.forEach((n, i) => {
            if (pcMod(n.stepsFromBase, oct) === thirdPc) thirdVoices.push(i);
          });
          if (thirdVoices.length > 1) {
            issues.push({
              type: 'Improper Doubling',
              voices: thirdVoices,
              message: `3rd of major triad doubled in Voices ${thirdVoices.map(v => v+1).join(', ')}`
            });
          }
        }
      } catch {
        // bad key - skip
      }
    }

    return issues;
  }

  /**
   * Analyzes a progression in a given key, returning Roman-numeral-level info for
   * each chord (function, diatonicism, borrowed/secondary flags, cadence-with-next)
   * and a list of detected modulations (see below). After a modulation, numerals and
   * cadences are read in the new key, and each entry's `key` says which key it was read in.
   *
   * Modulation: a chord foreign to the current key starts a passage held by a new key;
   * the new key is the one with an authentic cadence (V → I) in the passage, then with its
   * tonic chord in it, then with the best Krumhansl-Schmuckler correlation. A passage of
   * fewer than three chords is a tonicization, not a modulation (E7 → Am inside C major).
   * Nor is a passage whose foreign chords are all secondary dominants of the current key
   * and after which the music returns to it: the turnaround G7 Cm7 F7 Bb7 in Bb major
   * (VI7 ii7 V7 I7) stays in Bb, though G7 → Cm7 is a cadence in C minor. A passage that does
   * not return (C … D7 G Em Am D7 G to the end) is a modulation.
   *
   * `style: 'blues'`: dominant sevenths on I, IV and V belong to the key (C7, F7 and G7 in
   * C major are I7, IV7 and V7, functions T, S and D), not secondary dominants (C7 as V7/IV)
   * nor borrowed chords, and they do not start a modulation. I7 preceded by its ii is still
   * V7/IV (Gm7 C7 → F7). Without the option, I7 → IV is V7/IV, as in rhythm changes.
   *
   * Harmonic rhythm: with `durations` (in beats, one per chord), chord changes per bar of
   * `beatsPerBar` (default 4); without them, chord changes per chord, which only says how
   * often consecutive chords differ. `harmonicRhythmUnit` says which.
   *
   * Numerals read back with `parseRomanProgression` (`I7` is a dominant, `Imaj7` a major
   * seventh). A chromatic root takes its letter from the key by default (`spellChordInKey`:
   * Gb in C is read F#, `#IV`); with `spelling: 'written'` every root keeps the letter of
   * its name when the name matches its pitch (Gb in C is `bV`), for chords that arrive
   * already named rather than detected.
   */
  static analyzeProgression(
    chords: Chord[],
    keySymbol: string,
    options: { spelling?: 'key' | 'written'; durations?: readonly number[]; beatsPerBar?: number; style?: 'tonal' | 'blues' } = {},
  ): {
    /** One entry per chord, in order. */
    analysis: ChordAnalysis[];
    /** Key changes, in order; empty when the progression stays in the key. */
    modulations: ModulationEvent[];
    /** Chord changes per bar (with `durations`) or per chord (without them). */
    harmonicRhythm: number;
    /** Which of the two `harmonicRhythm` measures. */
    harmonicRhythmUnit: 'per-bar' | 'per-chord';
  } {
    const unit = options.durations ? 'per-bar' : 'per-chord';
    if (chords.length === 0) return { analysis: [], modulations: [], harmonicRhythm: 0, harmonicRhythmUnit: unit };
    if (options.durations && options.durations.length !== chords.length) {
      throw new RangeError(`analyzeProgression: ${chords.length} chords but ${options.durations.length} durations`);
    }
    const tuning = chords[0].tuningSystem;
    // another tuning: the 12-TET analysis, with its chords retuned
    if (!isTwelveTET(tuning)) {
      const twelve = chordsInTwelve(chords);
      if (twelve) {
        const r = Harmony.analyzeProgression(twelve, keySymbol, options);
        return {
          ...r,
          analysis: r.analysis.map((a, i) => ({ ...a, chord: a.chord.retune(tuning) ?? chords[i] })),
          modulations: r.modulations.map(m => ({ ...m, pivotChord: m.pivotChord?.retune(tuning) ?? undefined })),
        };
      }
    }
    const spelling = options.spelling ?? 'key';
    const homeKey = parseKey(keySymbol, tuning, spelling);

    // The key each chord is read in: the home key, then each modulation's from its index
    const blues = options.style === 'blues';
    const modulations = detectModulations(chords, homeKey, blues);
    const keySymbols = chords.map((_, i) => {
      const last = modulations.filter(m => m.atIndex <= i).pop();
      return last ? last.toKey : keySymbol;
    });
    const keys = new Map<string, KeyInfo>([[keySymbol, homeKey]]);
    const keyAt = (i: number) => {
      const s = keySymbols[i];
      if (!keys.has(s)) keys.set(s, parseKey(s, tuning, spelling));
      return keys.get(s)!;
    };

    const analysis: ChordAnalysis[] = chords.map((chord, i) => {
      const key = keyAt(i);
      const { roman, degree, accidental, isDiatonic, quality } = getRomanForChord(chord, key);
      const degreeFn = getFunction(degree, quality, key.isMinor, accidental);

      // In the blues, I7 preceded by its ii (Fm7 Bb7 → Eb7 in Bb) is still V7/IV
      const prev = chords[i - 1];
      const iiBefore = prev !== undefined && pcMod(prev.rootStep - chord.rootStep, 12) === 7
        && ['m', 'm7'].includes(chordQualityFromIntervals(prev, prev.tuningSystem.octaveSteps));
      const bluesSeventh = blues && isBluesSeventh(chord, key) && !iiBefore;
      const { isSecondary, target } = bluesSeventh ? { isSecondary: false, target: undefined } : detectSecondaryDominant(chord, key);

      // A secondary chord's chromatic note comes from the key it tonicizes, not from a
      // parallel mode: D7 in C is V7/V, not a chord borrowed from lydian.
      let borrowedFrom: string | undefined;
      let isBorrowed = false;
      if (!isDiatonic && !isSecondary && !bluesSeventh) {
        const bf = detectBorrowedFrom(chord, key);
        if (bf) { isBorrowed = true; borrowedFrom = bf; }
      }

      let cadenceWithNext: string | undefined;
      if (i < chords.length - 1) {
        // read in the key of the chord it arrives at (D7 → G after a move to G major)
        const cad = Harmony.analyzeCadence(chord, chords[i + 1], keySymbols[i + 1]);
        if (cad !== 'No standard cadence') cadenceWithNext = cad;
      }

      let substitutionCandidate: string | undefined;
      if (detectTritoneSubOfV(chord, key)) substitutionCandidate = 'tritone sub of V';

      // Secondary chords and the tritone sub of V act as dominants whatever their degree
      const fn = isSecondary || substitutionCandidate ? 'D' : degreeFn;

      return {
        chord,
        roman,
        degree,
        function: fn,
        isDiatonic,
        isBorrowed,
        borrowedFrom,
        isSecondary,
        secondaryTarget: target,
        cadenceWithNext,
        substitutionCandidate,
        key: keySymbols[i],
      };
    });

    const harmonicRhythm = computeHarmonicRhythm(chords, options.durations, options.beatsPerBar);

    return { analysis, modulations, harmonicRhythm, harmonicRhythmUnit: unit };
  }

  /**
   * Determines the context of a second-inversion (6/4) chord within a progression.
   * Returns `'none'` if the chord at `index` is not in second inversion.
   *
   * - `cadential`: tonic 6/4 followed by V → I.
   * - `pedal`: bass stays the same across the 6/4 and its neighbors.
   * - `passing`: bass moves by step through the 6/4.
   * - `arpeggiated`: same chord repeats with different inversions.
   */
  static analyzeSixFour(progression: Chord[], keySymbol: string, index: number): SixFourAnalysis {
    if (index < 0 || index >= progression.length) return { type: 'none' };
    const chord = progression[index];
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;

    // Must be in 2nd inversion: bass must be the 5th of the chord
    if (chord.bassStep === undefined) return { type: 'none' };
    const bassPc = pcMod(chord.bassStep, oct);
    const rootPc = pcMod(chord.rootStep, oct);
    const fifthPc = pcMod(rootPc + ts.getStepFromStandard(7), oct);
    if (bassPc !== fifthPc) return { type: 'none' };

    const key = parseKey(keySymbol, ts);

    // Cadential: chord root = tonic, next = V, following = I
    if (rootPc === key.tonicPc && index + 2 < progression.length) {
      const next = progression[index + 1];
      const following = progression[index + 2];
      const nextRootPc = pcMod(next.rootStep, oct);
      const followingRootPc = pcMod(following.rootStep, oct);
      if (nextRootPc === pcMod(key.tonicPc + ts.getStepFromStandard(7), oct) &&
          followingRootPc === key.tonicPc) {
        return { type: 'cadential', resolution: following };
      }
    }

    // Arpeggiated: prev and/or next chord has same pitch classes (just different inversion)
    const chordPcs = new Set(chord.getPitchClasses());
    const samePcs = (other: Chord) => {
      const otherPcs = new Set(other.getPitchClasses());
      if (otherPcs.size !== chordPcs.size) return false;
      for (const pc of chordPcs) if (!otherPcs.has(pc)) return false;
      return true;
    };
    if ((index > 0 && samePcs(progression[index - 1])) ||
        (index + 1 < progression.length && samePcs(progression[index + 1]))) {
      return { type: 'arpeggiated' };
    }

    // Pedal: same bass note as both neighbors
    if (index > 0 && index + 1 < progression.length) {
      const prevBass = progression[index - 1].bassStep ?? progression[index - 1].rootStep;
      const nextBass = progression[index + 1].bassStep ?? progression[index + 1].rootStep;
      if (pcMod(prevBass, oct) === bassPc && pcMod(nextBass, oct) === bassPc) {
        return { type: 'pedal' };
      }
    }

    // Passing: bass moves by step in and out
    if (index > 0 && index + 1 < progression.length) {
      const prevBass = progression[index - 1].bassStep ?? progression[index - 1].rootStep;
      const nextBass = progression[index + 1].bassStep ?? progression[index + 1].rootStep;
      const prevDelta = Math.abs(chord.bassStep - prevBass) % oct;
      const nextDelta = Math.abs(nextBass - chord.bassStep) % oct;
      const stepSize = ts.getStepFromStandard(2);
      if ((prevDelta === 1 || prevDelta === stepSize) && (nextDelta === 1 || nextDelta === stepSize)) {
        return { type: 'passing' };
      }
    }

    return { type: 'none' };
  }

  /**
   * Analyzes an array of notes and returns possible chord names.
   * Useful for Ear Training apps or MIDI input analysis.
   */
  static detectChords(notes: Note[]): string[] {
    if (notes.length === 0) return [];
    const octave = notes[0].tuningSystem.octaveSteps;

    if (octave !== 12) {
      const twelve = notesInTwelve(notes);
      return twelve ? Harmony.detectChords(twelve) : ['Unknown Chord'];
    }

    const pitchClasses = Array.from(new Set(notes.map(n => ((n.stepsFromBase % octave) + octave) % octave)));
    const bassStep = ((notes[0].stepsFromBase % octave) + octave) % octave;

    const matches: string[] = [];
    const aliases = ['major', 'minor', 'dominant7', 'half-diminished', 'm(maj7)', '7#5'];

    for (const root of pitchClasses) {
      const inputIntervals = pitchClasses.map(pc => ((pc - root + octave) % octave)).sort((a, b) => a - b);

      for (const [suffix, formula] of Object.entries(CHORD_FORMULAS)) {
        if (aliases.includes(suffix)) continue;

        const formulaPcs = Array.from(new Set(formula.map(interval => ((interval % octave) + octave) % octave))).sort((a, b) => a - b);

        if (formulaPcs.length === inputIntervals.length && formulaPcs.every((val, index) => val === inputIntervals[index])) {
          const rootFlatName = NOTE_NAMES_12TET_FLAT[root];
          const rootPf = preferFlatsForKey(rootFlatName, 'major');
          const rootName = rootPf ? rootFlatName : NOTE_NAMES_12TET_SHARP[root];
          // 'M' is the dictionary key for the major triad; the symbol is the bare root
          let chordName = `${rootName}${suffix === 'M' ? '' : suffix}`;

          if (root !== bassStep) {
            const bassFlatName = NOTE_NAMES_12TET_FLAT[bassStep];
            const bassPf = preferFlatsForKey(bassFlatName, 'major');
            const bassName = bassPf ? bassFlatName : NOTE_NAMES_12TET_SHARP[bassStep];
            chordName += `/${bassName}`;
          }

          matches.push(chordName);
        }
      }
    }

    return matches.length > 0 ? matches : ['Unknown Chord'];
  }

  /**
   * Reads a set of notes as chords and ranks the readings, with the reasons. Besides exact
   * matches (those of `detectChords`), a reading may leave out the fifth, and an eleventh or
   * thirteenth chord its ninth or eleventh, when at least three different notes sound.
   * The lowest note (by pitch) is the bass. Readings are ranked by, in order: fewer omitted
   * members, root in the bass, fewer tensions, fewer formula notes; `score` follows the same
   * order (1 − 0.3 per omitted member − 0.15 off the root − 0.03 per tension, at least 0).
   * 12-TET only: other tunings return [].
   * @example
   * Harmony.detectChordsScored(['E3', 'C4', 'Bb4'].map(n => parseNote(n)))[0]
   * // → { name: 'C7/E', omitted: ['5'], rootInBass: false, score: 0.55, … }
   */
  static detectChordsScored(notes: Note[]): ChordCandidate[] {
    if (notes.length === 0) return [];
    if (notes[0].tuningSystem.octaveSteps !== 12) {
      const twelve = notesInTwelve(notes);
      return twelve ? Harmony.detectChordsScored(twelve) : [];
    }
    const pcOf = (n: Note) => ((n.stepsFromBase % 12) + 12) % 12;
    const lowest = notes.reduce((a, b) => (b.stepsFromBase < a.stepsFromBase ? b : a));
    const bassPc = pcOf(lowest);
    const pcs = [...new Set(notes.map(pcOf))];
    const name = (pc: number) => {
      const flat = NOTE_NAMES_12TET_FLAT[pc];
      return preferFlatsForKey(flat, 'major') ? flat : NOTE_NAMES_12TET_SHARP[pc];
    };
    const aliases = ['major', 'minor', 'dominant7', 'half-diminished', 'm(maj7)', 'aug(maj7)', '7#5'];

    const found = new Map<string, ChordCandidate & { size: number; order: number }>();
    let order = 0;
    for (const root of pcs) {
      const played = new Set(pcs.map(pc => (pc - root + 12) % 12));
      for (const [quality, formula] of Object.entries(CHORD_FORMULAS)) {
        if (aliases.includes(quality)) continue;
        const members = new Map<number, number>(); // pc above the root → formula interval
        for (const i of formula) if (!members.has(i % 12)) members.set(i % 12, i);
        if ([...played].some(p => !members.has(p))) continue;
        const missing = [...members.keys()].filter(p => !played.has(p));
        const isUpper = formula.some(i => i >= 17); // eleventh or thirteenth chord
        const omittable = (p: number) => p === 7 || (isUpper && (p === 2 || (p === 5 && formula.includes(21))));
        if (missing.length > 0 && (pcs.length < 3 || !missing.every(omittable))) continue;

        const rootInBass = root === bassPc;
        const omitted = missing.map(p => chordDegreeLabel(members.get(p)!, formula));
        const tensions = [...members.values()].filter(i => i > 12).map(i => chordDegreeLabel(i, formula));
        const score = Math.max(0, 1 - 0.3 * omitted.length - (rootInBass ? 0 : 0.15) - 0.03 * tensions.length);
        const symbol = `${name(root)}${quality === 'M' ? '' : quality}${rootInBass ? '' : `/${name(bassPc)}`}`;
        if (found.has(symbol)) continue;
        found.set(symbol, {
          name: symbol, root: name(root), bass: name(bassPc), quality,
          score: Math.round(score * 1000) / 1000, rootInBass, omitted, tensions,
          size: members.size, order: order++,
        });
      }
    }
    return [...found.values()]
      .sort((a, b) => b.score - a.score || a.size - b.size || a.order - b.order)
      .map(({ size: _size, order: _order, ...c }) => c);
  }

  /**
   * Returns the Negative Harmony equivalent of a chord in a given key.
   */
  static getNegativeHarmony(chord: Chord, keyCenter: string): Chord {
    if (chord.tuningSystem.octaveSteps !== 12) {
      const negative = chord.retune(TET12) && Harmony.getNegativeHarmony(chord.retune(TET12)!, keyCenter).retune(chord.tuningSystem);
      if (negative) return negative;
    }
    const match = keyCenter.match(/^([A-G][#b]*)/i);
    const keyRootName = match ? match[1] : 'C';
    const ts = chord.tuningSystem;
    const keyRootStep = ts.getStepFromStandard(parseNoteToStep12TET(keyRootName, 4));

    const axisSum = (keyRootStep * 2) + ts.getStepFromStandard(7);

    const negativeSteps = chord.intervalsInSteps.map(interval => {
      const absoluteStep = chord.rootStep + interval;
      return axisSum - absoluteStep;
    });

    const tuning = chord.tuningSystem;
    const negativeNotes = negativeSteps.map(step => new Note(tuning, step)).sort((a, b) => a.frequency - b.frequency);

    // reached in another tuning only when the negative chord has a note it cannot hold:
    // the reflected steps are kept, unnamed
    const detectedNames = ts.octaveSteps === 12 ? this.detectChords(negativeNotes) : ['Unknown Chord'];
    const lowestStep = negativeNotes[0].stepsFromBase;
    if (detectedNames[0] === 'Unknown Chord') {
      return new Chord(`Negative of ${chord.name}`, tuning, lowestStep, negativeNotes.map(n => n.stepsFromBase - lowestStep));
    }

    // The root is the root of the chord the notes are named as; a lowest note that is not
    // that root becomes the bass (Cm7/Bb has root C and Bb below it).
    const bestName = detectedNames[0];
    const oct = tuning.octaveSteps;
    const pc = (s: number) => ((s % oct) + oct) % oct;
    const rootPc = pc(ts.getStepFromStandard(parseNoteToStep12TET(bestName.match(/^[A-G][#b]*/)![0], 4)));
    const rootStep = negativeNotes.find(n => pc(n.stepsFromBase) === rootPc)!.stepsFromBase;
    const newIntervals = [...new Set(negativeNotes.map(n => {
      let iv = n.stepsFromBase - rootStep;
      while (iv < 0) iv += oct;
      return iv;
    }))].sort((a, b) => a - b);
    const bassStep = pc(lowestStep) === rootPc ? undefined : lowestStep;

    return new Chord(bestName, tuning, rootStep, newIntervals, bassStep);
  }

  /**
   * Returns borrowed chords from parallel modes (Modal Interchange).
   *
   * Returns `BorrowedChord[]`.
   * Each entry includes the source mode, brightness, harmonic function in the
   * home key, and whether the chord is characteristic of its source mode.
   * Chords that `analyzeProgression` reads as diatonic are left out: in a minor key, the
   * dominant and leading-tone chords of the harmonic minor (E7 and G#dim7 in A minor).
   *
   * @param keySymbol - e.g. `'C major'`, `'A minor'`
   * @param options.sources - Limit results to these mode names only.
   * @param options.tuning - Defaults to TET12; returns [] for non-12-TET.
   * @param options.type - `'seventh'` (default) or `'triad'`, as in `Scale.getDiatonicChords`.
   */
  static getBorrowedChords(
    keySymbol: string,
    options?: { sources?: string[]; tuning?: TuningSystem; type?: 'triad' | 'seventh' }
  ): BorrowedChord[] {
    const tuning = options?.tuning ?? TET12;
    if (tuning.octaveSteps !== 12) {
      // the 12-TET answer, retuned; a chord the tuning cannot hold is left out
      return Harmony.getBorrowedChords(keySymbol, { ...options, tuning: TET12 })
        .map(b => ({ ...b, chord: b.chord.retune(tuning) }))
        .filter((b): b is BorrowedChord => b.chord !== null);
    }

    const match = keySymbol.match(/^([A-G][#b]*)\s+(.+)$/i);
    if (!match) return [];
    const [, rootName] = match;

    const homeKey = parseKey(keySymbol, tuning);
    const homePcsArr = [...homeKey.scalePcs].sort((a, b) => a - b);

    const candidateModes = [
      'lydian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian',
      'harmonic minor', 'melodic minor', 'harmonic major',
    ];
    const sourcesToCheck = options?.sources
      ? candidateModes.filter(m => options.sources!.includes(m))
      : candidateModes;

    const results: BorrowedChord[] = [];

    for (const mode of sourcesToCheck) {
      let modeScale: Scale;
      try {
        modeScale = parseScaleSymbol(`${rootName} ${mode}`, tuning);
      } catch { continue; }

      // Skip modes with identical PC content to home key (e.g. 'ionian' when home is 'major')
      const modePcsArr = modeScale.getPitchClasses().sort((a, b) => a - b);
      if (modePcsArr.length === homePcsArr.length && modePcsArr.every((pc, i) => pc === homePcsArr[i])) {
        continue;
      }

      const brightness = EXTENDED_MODE_BRIGHTNESS[mode] ?? 0;
      const charPcs = MODE_CHARACTERISTIC_PC[mode] ?? [];

      let diatonicChords: Chord[];
      try {
        diatonicChords = modeScale.getDiatonicChords(options?.type ?? 'seventh');
      } catch { continue; }

      for (const c of diatonicChords) {
        const cPcs = c.getPitchClasses();
        // Skip chords diatonic to the home key, as analyzeProgression reads them
        const { degree, quality, accidental, isDiatonic } = getRomanForChord(c, homeKey);
        if (isDiatonic) continue;
        const fn = getFunction(degree, quality, homeKey.isMinor, accidental);

        // characteristic = chord contains a mode-defining PC (relative to home tonic)
        const tonicPc = homeKey.tonicPc;
        const characteristic = cPcs.some(pc =>
          charPcs.some(offset => ((tonicPc + offset) % 12) === pc)
        );

        results.push({ chord: c, sourceMode: mode, brightness, function: fn, characteristic });
      }
    }

    return results;
  }

  /**
   * Finds chords that are diatonic to both keys and can therefore serve as pivot chords
   * for modulation between them. Returns `PivotChord[]` with harmonic function in each key.
   */
  static findPivotChords(
    keyA: string,
    keyB: string,
    type: 'triad' | 'seventh' = 'triad'
  ): PivotChord[] {
    const tuning = TET12;
    let kA: KeyInfo, kB: KeyInfo;
    try {
      kA = parseKey(keyA, tuning);
      kB = parseKey(keyB, tuning);
    } catch { return []; }

    let chordsA: Chord[], chordsB: Chord[];
    try {
      chordsA = kA.scale.getDiatonicChords(type);
      chordsB = kB.scale.getDiatonicChords(type);
    } catch { return []; }

    const results: PivotChord[] = [];

    for (let i = 0; i < chordsA.length; i++) {
      const cA = chordsA[i];
      const pcsA = cA.getPitchClasses();

      for (let j = 0; j < chordsB.length; j++) {
        const cB = chordsB[j];
        const pcsB = cB.getPitchClasses();

        if (pcsA.length !== pcsB.length) continue;
        const sameChord = pcsA.every(pc => pcsB.includes(pc));
        if (!sameChord) continue;

        const degreeA = i + 1;
        const degreeB = j + 1;
        const { quality: qualA } = getRomanForChord(cA, kA);
        const { quality: qualB } = getRomanForChord(cB, kB);
        const fnA = getFunction(degreeA, qualA, kA.isMinor) as 'T' | 'S' | 'D';
        const fnB = getFunction(degreeB, qualB, kB.isMinor) as 'T' | 'S' | 'D';

        results.push({
          chord: cA,
          functionInA: { degree: degreeA, function: fnA },
          functionInB: { degree: degreeB, function: fnB },
        });
        break;
      }
    }

    return results;
  }

  /**
   * Classifies the type of modulation between two key areas based on the transitional chords.
   *
   * - `'enharmonic'`: both keys have identical pitch class content.
   * - `'chromatic'`: the tonic notes are one semitone apart.
   * - `'pivot'`: a chord in `chordsA` is diatonic to `keyB`.
   * - `'common-tone'`: the last chord of A and first chord of B share at least one PC.
   * - `'direct'`: abrupt modulation, no smooth transition detected.
   */
  static classifyModulation(
    chordsA: Chord[],
    chordsB: Chord[],
    keyA: string,
    keyB: string
  ): 'direct' | 'pivot' | 'enharmonic' | 'chromatic' | 'common-tone' {
    if (![...chordsA, ...chordsB].every(c => isTwelveTET(c.tuningSystem))) {
      // read through 12-TET; a chord with a note that stands for none can be neither pivot nor common tone
      const twelve = (cs: Chord[]) => cs.map(c => c.retune(TET12)).filter((c): c is Chord => c !== null);
      return Harmony.classifyModulation(twelve(chordsA), twelve(chordsB), keyA, keyB);
    }
    const tuning = TET12;

    let scaleA: Scale, scaleB: Scale;
    try {
      scaleA = parseScaleSymbol(keyA, tuning);
      scaleB = parseScaleSymbol(keyB, tuning);
    } catch { return 'direct'; }

    // Enharmonic: identical PC content
    const pcsA = scaleA.getPitchClasses().sort((a, b) => a - b);
    const pcsB = scaleB.getPitchClasses().sort((a, b) => a - b);
    if (pcsA.length === pcsB.length && pcsA.every((pc, i) => pc === pcsB[i])) {
      return 'enharmonic';
    }

    // Chromatic: tonic PCs 1 semitone apart
    const tonicA = pcMod(scaleA.rootStep, 12);
    const tonicB = pcMod(scaleB.rootStep, 12);
    const semiDiff = Math.min(((tonicB - tonicA + 12) % 12), ((tonicA - tonicB + 12) % 12));
    if (semiDiff === 1) return 'chromatic';

    // Pivot: any chord in chordsA is diatonic to keyB
    const pcsBSet = new Set(pcsB);
    for (const c of chordsA) {
      if (c.getPitchClasses().every(pc => pcsBSet.has(pc))) return 'pivot';
    }

    // Common-tone: last chord of A shares a PC with first chord of B
    if (chordsA.length > 0 && chordsB.length > 0) {
      const lastAPcs = new Set(chordsA[chordsA.length - 1].getPitchClasses());
      if (chordsB[0].getPitchClasses().some(pc => lastAPcs.has(pc))) return 'common-tone';
    }

    return 'direct';
  }

  /**
   * Applies negative harmony to each chord in the progression, preserving order.
   */
  static getNegativeProgression(chords: Chord[], keyCenter: string): Chord[] {
    return chords.map(c => Harmony.getNegativeHarmony(c, keyCenter));
  }

  /**
   * Returns the Coltrane axis for a given key root: the three roots separated by
   * equal major thirds (dividing the octave into thirds). Used in Coltrane Changes.
   *
   * Example: `'C'` → `{ root: 'C', majorThirds: ['C', 'E', 'Ab'] }`.
   */
  static getColtraneAxis(key: string): ColtraneAxis {
    const rootMatch = key.match(/^([A-G][#b]*)/i);
    const rootName = rootMatch ? rootMatch[1] : 'C';
    const rootPc = pcMod(parseNoteToStep12TET(rootName, 4), 12);
    const pc1 = (rootPc + 4) % 12;
    const pc2 = (rootPc + 8) % 12;

    const pf0 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[rootPc], 'major');
    const pf1 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc1], 'major');
    const pf2 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc2], 'major');

    return {
      root: rootName,
      majorThirds: [
        pf0 ? NOTE_NAMES_12TET_FLAT[rootPc] : NOTE_NAMES_12TET_SHARP[rootPc],
        pf1 ? NOTE_NAMES_12TET_FLAT[pc1]    : NOTE_NAMES_12TET_SHARP[pc1],
        pf2 ? NOTE_NAMES_12TET_FLAT[pc2]    : NOTE_NAMES_12TET_SHARP[pc2],
      ],
    };
  }

  /**
   * Returns the two Coltrane substitutions for a chord: the other two roots on the
   * same major-third axis, using the same chord quality as the original.
   */
  static getColtraneSubstitutions(chord: Chord, _keySymbol: string): Chord[] {
    const oct = chord.tuningSystem.octaveSteps;
    if (oct !== 12) {
      const twelve = chord.retune(TET12);
      if (!twelve) return [];
      return Harmony.getColtraneSubstitutions(twelve, _keySymbol)
        .map(c => c.retune(chord.tuningSystem)).filter((c): c is Chord => c !== null);
    }

    const rootPc = pcMod(chord.rootStep, 12);
    const pc1 = (rootPc + 4) % 12;
    const pc2 = (rootPc + 8) % 12;

    const quality = chordQualityFromIntervals(chord, 12);
    const suffix = quality === 'M' ? '' : quality;

    const pf1 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc1], 'major');
    const pf2 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc2], 'major');
    const name1 = (pf1 ? NOTE_NAMES_12TET_FLAT[pc1] : NOTE_NAMES_12TET_SHARP[pc1]) + suffix;
    const name2 = (pf2 ? NOTE_NAMES_12TET_FLAT[pc2] : NOTE_NAMES_12TET_SHARP[pc2]) + suffix;

    return [
      parseChordSymbol(name1, chord.tuningSystem),
      parseChordSymbol(name2, chord.tuningSystem),
    ];
  }

  /**
   * Analyzes the cadence between two chords in a given key.
   *
   * Recognized cadences: Authentic (V→I), Plagal (IV→I), Minor Plagal (iv→i),
   * Deceptive (V→vi), Half (→V), Phrygian/Hyper-phrygian (♭II→I or iv→V),
   * Picardy (minor i → major I), Backdoor (♭VII7→I), Tritone Sub (subV7→I).
   */
  static analyzeCadence(chord1: Chord, chord2: Chord, keySymbol: string): string {
    const ts = chord1.tuningSystem;
    const oct = ts.octaveSteps;
    const scale = parseScaleSymbol(keySymbol, ts);
    const scaleNotes = scale.getNotes(1);
    const tonicStep = scaleNotes[0].stepsFromBase % oct;

    const c1Root = chord1.rootStep % oct;
    const c2Root = chord2.rootStep % oct;

    const t = (tonicStep + oct) % oct;
    const r1 = (c1Root + oct) % oct;
    const r2 = (c2Root + oct) % oct;

    const min3 = ts.getStepFromStandard(3);
    const maj3 = ts.getStepFromStandard(4);
    const min7 = ts.getStepFromStandard(10);
    const maj7_step = ts.getStepFromStandard(11);
    const c1Pcs = chord1.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
    const c2Pcs = chord2.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
    const isC1Dominant = c1Pcs.includes(min7) && !c1Pcs.includes(maj7_step);
    const c1IsMinor = c1Pcs.includes(min3) && !c1Pcs.includes(maj3);
    const c2IsMajor = c2Pcs.includes(maj3) && !c2Pcs.includes(min3);

    const isC2Tonic = r2 === t;
    const isC1Subdominant = r1 === (t + ts.getStepFromStandard(5)) % oct; // IV
    // V with the leading tone (a major third): v → i is not a cadence on the dominant
    const isC1DominantRoot = r1 === (t + ts.getStepFromStandard(7)) % oct && c1Pcs.includes(maj3); // V

    // Picardy: same root, minor → major on tonic pair
    if (r1 === t && r2 === t && c1IsMinor && c2IsMajor) {
      return 'Picardy Third (i -> I)';
    }

    if (isC1DominantRoot && isC2Tonic) {
      return 'Authentic Cadence (V -> I)';
    }

    // Plagal / Minor plagal
    if (isC1Subdominant && isC2Tonic) {
      if (c1IsMinor) return 'Minor Plagal Cadence (iv -> i)';
      return 'Plagal Cadence (IV -> I)';
    }

    // Deceptive: V to the key's own sixth degree (vi in major, VI in minor)
    const sixth = scaleNotes.length > 5 ? ((scaleNotes[5].stepsFromBase % oct) + oct) % oct : -1;
    if (isC1DominantRoot && r2 === sixth) {
      const minorSixth = ((sixth - t) % oct + oct) % oct === ts.getStepFromStandard(8);
      return minorSixth ? 'Deceptive Cadence (V -> VI)' : 'Deceptive Cadence (V -> vi)';
    }

    // Phrygian Half / Hyper-phrygian: ♭II → I (or → i)
    if (r1 === (t + ts.getStepFromStandard(1)) % oct && isC2Tonic && !isC1Dominant) {
      return 'Phrygian Cadence (bII -> I)';
    }

    // iv6 → V (Phrygian half cadence in minor): the bass falls a semitone from the 6th
    // degree to the 5th (F → E in A minor); iv in root position → V is a plain half cadence
    const bassOf = (c: Chord) => c.bassStep ?? Math.min(...c.intervalsInSteps.map(s => c.rootStep + s));
    const b1 = ((bassOf(chord1) % oct) + oct) % oct;
    const b2 = ((bassOf(chord2) % oct) + oct) % oct;
    const sixthBass = b1 === (t + ts.getStepFromStandard(8)) % oct && b2 === (t + ts.getStepFromStandard(7)) % oct;
    if (isC1Subdominant && c1IsMinor && r2 === (t + ts.getStepFromStandard(7)) % oct && sixthBass) {
      return 'Phrygian Half Cadence (iv -> V)';
    }

    if (isC2Tonic && r1 === (t + ts.getStepFromStandard(10)) % oct && isC1Dominant) {
      return 'Backdoor Cadence (bVII7 -> I)';
    }
    if (r2 === (t + ts.getStepFromStandard(7)) % oct) {
      return 'Half Cadence (-> V)';
    }

    if (isC1Dominant && r1 === (t + ts.getStepFromStandard(1)) % oct && isC2Tonic) {
      return 'Tritone Sub Resolution (subV7 -> I)';
    }

    return 'No standard cadence';
  }

  /**
   * Suggests scales for improvisation over a given chord.
   * Triads and sixth chords take the scales of their seventh chord: C as Cmaj7, Cm as Cm7
   * (Cm6, with the natural sixth, takes dorian or melodic minor). A chord no rule names is read by
   * its third (major or minor scale); without a third (sus2) none is suggested.
   */
  static getSuggestedScales(chord: Chord, nextChord?: Chord, ruleset: 'berklee' | 'classical' | 'modal' = 'berklee'): {
    /** Scale name with its root: `'G mixolydian'`. */
    scale: string;
    /** When the scale applies: `'standard V'`, `'if IV chord'`… */
    hint?: string;
  }[] {
    const ts = chord.tuningSystem;
    // another tuning: read through the 12-TET notes its steps stand for
    if (!(ts instanceof EDO && ts.divisions === 12)) {
      const twelve = chord.retune(TET12);
      return twelve ? Harmony.getSuggestedScales(twelve, nextChord?.retune(TET12) ?? undefined, ruleset) : [];
    }
    const oct = ts.octaveSteps;
    const rootPf = chord.preferFlats ?? false;
    const rootSemitones = chord.rootStep;
    const root = writtenRoot(chord.name.split('/')[0], rootSemitones) ?? get12TETBaseName(rootSemitones, rootPf);

    const pcs = chord.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
    const has = (semitone: number) => pcs.includes(ts.getStepFromStandard(semitone));

    const isMaj7    = has(11) && has(4);
    const isMin7    = has(10) && has(3) && has(7) && !has(6);
    const isDom7    = has(10) && has(4) && !has(11);
    const isHalfDim = has(6)  && has(3) && has(10);
    const isDim     = has(6)  && has(3) && !has(10);
    const isAug     = has(8)  && has(4) && !has(10);
    // triads, sixths and added ninths: no seventh
    const isMajor   = has(4) && has(7) && !has(10) && !has(11);
    const isMinor   = has(3) && has(7) && !has(6) && !has(10) && !has(11);
    const isMinMaj7 = has(3) && has(7) && has(11);
    const isSus4    = has(5) && has(7) && !has(3) && !has(4);
    const byThird = (): { scale: string; hint?: string }[] =>
      has(4) ? [s(`${root} major`)] : has(3) ? [s(`${root} minor`)] : [];

    const s = (scale: string, hint?: string): { scale: string; hint?: string } => ({ scale, hint });

    if (ruleset === 'classical') {
      if (isMaj7 || isMajor) return [s(`${root} major`)];
      if (isMinor && has(9)) return [s(`${root} melodic minor`)];
      if (isMin7 || isMinor) return [s(`${root} minor`)];
      if (isMinMaj7) return [s(`${root} harmonic minor`), s(`${root} melodic minor`)];
      if (isDom7) return [s(`${root} mixolydian`)];
      if (isHalfDim) return [s(`${root} locrian`)];
      if (isDim) return [s(`${root} whole-half diminished`)];
      if (isAug || isSus4) return [];
      return byThird();
    }

    if (ruleset === 'modal') {
      if (isMaj7 || isMajor) return [s(`${root} ionian`), s(`${root} lydian`)];
      if (isMinor && has(9)) return [s(`${root} dorian`)];
      if (isMin7 || isMinor) return [s(`${root} dorian`), s(`${root} phrygian`), s(`${root} aeolian`)];
      if (isDom7 || isSus4) return [s(`${root} mixolydian`)];
      if (isHalfDim) return [s(`${root} locrian`), s(`${root} locrian #2`)];
    }

    if (isMaj7 || isMajor) {
      return [s(`${root} ionian`), s(`${root} lydian`, 'if IV chord')];
    }

    if (isMinor && has(9)) {
      return [s(`${root} dorian`), s(`${root} melodic minor`, 'tonic minor')];
    }

    if (isMinMaj7) {
      return [s(`${root} melodic minor`), s(`${root} harmonic minor`)];
    }

    if (isSus4) {
      return [s(`${root} mixolydian`, 'V7sus4')];
    }

    if (isMin7 || isMinor) {
      return [s(`${root} dorian`, 'standard ii'), s(`${root} aeolian`), s(`${root} phrygian`)];
    }

    if (isDom7) {
      const suggestions = [s(`${root} mixolydian`, 'standard V')];

      if (nextChord) {
        const r1 = chord.rootStep % oct;
        const r2 = nextChord.rootStep % oct;
        const distance = ((r2 - r1) + oct) % oct;

        if (distance === 5) {
          const isNextMinor = !!nextChord.name.match(/^[A-G][#b]*m(?!aj)/);
          if (isNextMinor) {
            suggestions.push(s(`${root} phrygian dominant`, 'mixolydian b9 b13, V of harmonic minor'));
            suggestions.push(s(`${root} altered`));
          } else {
            suggestions.push(s(`${root} lydian dominant`, 'if tritone sub'));
            suggestions.push(s(`${root} half-whole diminished`));
          }
        } else if (distance === 11) {
          suggestions.push(s(`${root} lydian dominant`));
        }
      } else {
        suggestions.push(s(`${root} lydian dominant`));
        suggestions.push(s(`${root} altered`));
      }
      return suggestions;
    }

    if (isHalfDim) {
      return [s(`${root} locrian #2`, 'jazz standard'), s(`${root} locrian`)];
    }

    if (isDim) {
      return [s(`${root} whole-half diminished`)];
    }

    if (isAug) {
      return [s(`${root} whole tone`)];
    }

    return byThird();
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Sequence detection, retrograde/inversion, smoothness
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Detects common harmonic sequences in a chord progression.
   */
  static detectSequence(chords: Chord[]): {
    /**
     * `'circle-of-fifths-descending'`, `'circle-of-fifths-ascending'`, their `'diatonic-…'`
     * forms, `'parallel-descending'`, `'parallel-ascending'`, `'pachelbel'`, `'romanesca'` or
     * `'unknown'`.
     */
    type: string;
    /** 0 to 1: 1 for an exact match, 0 for `'unknown'`. */
    confidence: number;
  } {
    if (chords.length > 0 && !chords.every(c => isTwelveTET(c.tuningSystem))) {
      const twelve = chordsInTwelve(chords);
      return twelve ? Harmony.detectSequence(twelve) : { type: 'unknown', confidence: 0 };
    }
    if (chords.length < 3) return { type: 'unknown', confidence: 0 };
    const oct = chords[0].tuningSystem.octaveSteps;
    const roots = chords.map(c => ((c.rootStep % oct) + oct) % oct);

    // Compute interval classes between consecutive roots
    const intervals: number[] = [];
    for (let i = 1; i < roots.length; i++) {
      intervals.push(((roots[i] - roots[i - 1]) + oct) % oct);
    }

    // Circle of fifths descending: each root is a P4 (5 semitones) above the last
    const is5desc = intervals.every(iv => iv === 5);
    if (is5desc) return { type: 'circle-of-fifths-descending', confidence: 1 };

    // Circle of fifths ascending: each root is a P5 (7 semitones) above the last
    const is5asc = intervals.every(iv => iv === 7);
    if (is5asc) return { type: 'circle-of-fifths-ascending', confidence: 1 };

    // Diatonic circle of fifths: fifths with one diminished fifth / augmented fourth to stay
    // in the key (C F B E A D G C: descending fifths, F → B a tritone)
    const tritone = oct / 2;
    const fourth = Math.round(oct * 5 / 12);
    const fifth = oct - fourth;
    if (intervals.includes(tritone) && intervals.filter(iv => iv === tritone).length === 1) {
      if (intervals.every(iv => iv === fourth || iv === tritone)) return { type: 'diatonic-circle-of-fifths-descending', confidence: 0.95 };
      if (intervals.every(iv => iv === fifth || iv === tritone)) return { type: 'diatonic-circle-of-fifths-ascending', confidence: 0.95 };
    }

    // Parallel motion: all roots move by the same interval, up (1..half octave) or down
    const allSameInterval = intervals.every(iv => iv === intervals[0]);
    if (allSameInterval && intervals[0] !== 0) {
      const descending = intervals[0] > oct / 2;
      if (descending) return { type: 'parallel-descending', confidence: 0.85 };
      return { type: 'parallel-ascending', confidence: 0.85 };
    }

    // Pachelbel: I-V-vi-iii-IV-I-IV-V (roots: 0,7,9,4,5,0,5,7 relative to key)
    // Simplified: detect the interval pattern 7,2,7,1,7,5,2 (mod 12)
    if (intervals.length >= 7) {
      const pachPattern = [7, 2, 7, 1, 7, 5, 2];
      const matchPach = pachPattern.every((iv, i) => intervals[i] === iv);
      if (matchPach) return { type: 'pachelbel', confidence: 1 };
      // Partial match
      const partial = pachPattern.slice(0, intervals.length).filter((iv, i) => intervals[i] === iv).length;
      if (partial / Math.min(pachPattern.length, intervals.length) >= 0.7) {
        return { type: 'pachelbel', confidence: 0.75 };
      }
    }

    // Romanesca: III-VII-i-V in minor, I-V-vi-iii in major (roots 0,7,9,4; the opening
    // of the Pachelbel pattern above)
    if (intervals.length >= 3) {
      const romPattern = [7, 2, 7];
      const matchRom = romPattern.every((iv, i) => intervals[i] === iv);
      if (matchRom) return { type: 'romanesca', confidence: 0.85 };
    }

    return { type: 'unknown', confidence: 0 };
  }

  /**
   * Returns the retrograde (reversed order) of a chord progression.
   */
  static retrogradeProgression(chords: Chord[]): Chord[] {
    return chords.slice().reverse();
  }

  /**
   * Returns a harmonically inverted progression around `axisNote`.
   * Each chord's root is reflected: newRoot = 2*axis - root (in steps).
   * Chord quality is preserved.
   */
  static invertProgression(chords: Chord[], axisNote: Note): Chord[] {
    return chords.map(c => {
      const axisStep = axisNote.stepsFromBase;
      const newRootStep = 2 * axisStep - c.rootStep;
      const rootDelta = newRootStep - c.rootStep;
      return c.transpose(rootDelta);
    });
  }

  /**
   * Measures average voice-leading smoothness across a progression (0 = rough, 1 = smooth).
   * Every pitch class of each chord moves to the nearest pitch class of the next one, and
   * every pitch class of the next to the nearest of the previous: the mean move, in interval
   * classes, against half an octave (the largest move). Common tones count as 0.
   */
  static voiceLeadingSmoothness(chords: Chord[]): number {
    if (chords.length <= 1) return 1;
    const oct = chords[0].tuningSystem.octaveSteps;
    const ic = (a: number, b: number) => { const d = Math.abs(a - b); return Math.min(d, oct - d); };
    let total = 0;
    let count = 0;
    for (let i = 1; i < chords.length; i++) {
      const a = chords[i - 1].getPitchClasses();
      const b = chords[i].getPitchClasses();
      for (const p of a) { total += Math.min(...b.map(q => ic(p, q))); count++; }
      for (const q of b) { total += Math.min(...a.map(p => ic(p, q))); count++; }
    }
    return Math.max(0, 1 - total / count / (oct / 2));
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Slash analysis, chord-scale completeness, enharmonic respelling
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Analyzes a slash chord and classifies it as inversion, hybrid, polychord, or upper-structure.
   * Returns `{ type: 'inversion' }` for chords without a bass note.
   */
  static analyzeSlash(chord: Chord): SlashAnalysis {
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;
    if (oct !== 12) {
      const twelve = chord.retune(TET12);
      if (!twelve) return { type: 'hybrid' };
      const r = Harmony.analyzeSlash(twelve);
      return {
        ...r,
        upperStructure: r.upperStructure?.retune(ts) ?? undefined,
        lowerChord: r.lowerChord?.retune(ts) ?? undefined,
        lowerRoot: r.lowerRoot?.retune(ts) ?? undefined,
      };
    }
    if (chord.bassStep === undefined) return { type: 'inversion' };

    const bassPc = ((chord.bassStep % oct) + oct) % oct;
    const rootPc = ((chord.rootStep % oct) + oct) % oct;
    const chordPcs = chord.intervalsInSteps.map(i => ((rootPc + i) % oct + oct) % oct);

    const lowerRoot = new Note(ts, chord.bassStep);

    // Inversion: bass is a chord tone
    if (chordPcs.includes(bassPc)) {
      return { type: 'inversion', lowerRoot };
    }

    // Detect what the upper voices form: the chord tones without the bass, which is not one of them
    const upperNotes = chord.getNotes().filter(n => pcMod(n.stepsFromBase, oct) !== bassPc);
    const upperDetected = Harmony.detectChords(upperNotes);
    const upperChordName = upperDetected[0] !== 'Unknown Chord' ? upperDetected[0] : null;

    const tensions = chordPcs.map(pc => {
      const interval = ((pc - bassPc + oct) % oct);
      return TENSION_NAMES[interval] ?? null;
    }).filter(Boolean) as string[];

    if (upperChordName) {
      const upperChord = parseChordSymbol(upperChordName, ts);
      const upperRootPc = ((upperChord.rootStep % oct) + oct) % oct;
      const upperOffset = ((upperRootPc - bassPc + oct) % oct);

      // Upper-structure offsets: 1(bII), 2(II), 3(bIII), 8(bVI), 9(VI), 10(bVII)
      if ([1, 2, 3, 8, 9, 10].includes(upperOffset)) {
        return { type: 'upper-structure', upperStructure: upperChord, lowerRoot, resultingTensions: tensions };
      }

      // Polychord: upper forms a separate recognizable chord over a different root
      const lowerPf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[bassPc], 'major');
      const lowerName = lowerPf ? NOTE_NAMES_12TET_FLAT[bassPc] : NOTE_NAMES_12TET_SHARP[bassPc];
      let lowerChord: Chord | undefined;
      try { lowerChord = parseChordSymbol(lowerName, ts); } catch { /* ignore */ }

      return { type: 'polychord', upperStructure: upperChord, lowerRoot, lowerChord, resultingTensions: tensions };
    }

    return { type: 'hybrid', lowerRoot, resultingTensions: tensions };
  }

  /**
   * Returns all scales from the dictionary that contain every pitch class of the chord.
   * `completeness` = chord notes / scale notes (how much of the scale the chord fills).
   * Results are sorted by completeness descending.
   */
  static getAllContainingScales(chord: Chord): {
    /** A scale that holds every note of the chord. */
    scale: Scale;
    /** Share of the scale's notes that the chord holds, 0 to 1. */
    completeness: number;
  }[] {
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;
    if (oct !== 12) {
      const twelve = chord.retune(TET12);
      if (!twelve) return [];
      return Harmony.getAllContainingScales(twelve)
        .map(r => ({ ...r, scale: r.scale.retune(ts) }))
        .filter((r): r is { scale: Scale; completeness: number } => r.scale !== null);
    }

    const chordPcsArr = chord.getPitchClasses();
    if (chordPcsArr.length === 0) return [];
    const chordPcsSet = new Set(chordPcsArr);

    // Canonical scale types only (no aliases to avoid duplicate results)
    const CANONICAL = [
      'major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
      'harmonic minor', 'locrian #6', 'ionian #5', 'dorian #4', 'phrygian dominant', 'lydian #2', 'super locrian bb7',
      'harmonic major',
      'melodic minor', 'dorian b2', 'lydian augmented', 'lydian dominant', 'mixolydian b6', 'locrian #2', 'altered',
      'whole tone', 'augmented', 'whole-half diminished', 'half-whole diminished',
      'pentatonic major', 'pentatonic minor', 'blues', 'blues major',
      'bebop dominant', 'bebop major', 'bebop dorian',
      'double harmonic', 'hungarian minor', 'neapolitan minor', 'neapolitan major', 'persian',
      'prometheus', 'hirajoshi', 'kumoi', 'in', 'iwato', 'yo', 'chinese', 'egyptian',
    ];

    const results: { scale: Scale; completeness: number }[] = [];

    for (const type of CANONICAL) {
      const pattern = SCALE_PATTERNS[type];
      if (!pattern) continue;

      for (let rootPc = 0; rootPc < 12; rootPc++) {
        // Build scale PCs from step pattern
        const scalePcs: number[] = [];
        let cumulative = 0;
        for (const interval of pattern) {
          scalePcs.push((rootPc + cumulative) % 12);
          cumulative += interval;
        }
        const scalePcsSet = new Set(scalePcs);

        if (![...chordPcsSet].every(pc => scalePcsSet.has(pc))) continue;

        const completeness = chordPcsSet.size / scalePcsSet.size;
        const pf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[rootPc], type);
        const rootName = pf ? NOTE_NAMES_12TET_FLAT[rootPc] : NOTE_NAMES_12TET_SHARP[rootPc];

        try {
          const scale = parseScaleSymbol(`${rootName} ${type}`, ts);
          results.push({ scale, completeness });
        } catch { /* skip */ }
      }
    }

    results.sort((a, b) => b.completeness - a.completeness);
    return results;
  }

  /**
   * Respells a note based on key context or melodic direction.
   * - `keySymbol`: the key's spelling (`spellPitchInKey`): scale letters, chromatic notes
   *   as the harmonic chromatic scale writes them (F# in C, Gb in Db major).
   * - `direction: 'ascending'`: prefer sharps; `'descending'`: prefer flats.
   * Returns the original note if no context applies.
   */
  static respellNote(note: Note, context: RespellContext): Note {
    const ts = note.tuningSystem;
    if (ts.octaveSteps !== 12) {
      const twelve = note.retune(TET12);
      return twelve ? new Note(ts, note.stepsFromBase, Harmony.respellNote(twelve, context).name) : note;
    }
    if (context.keySymbol) return new Note(ts, note.stepsFromBase, spellPitchInKey(note.stepsFromBase, context.keySymbol));

    let useFlats: boolean;
    if (context.direction === 'ascending') {
      useFlats = false;
    } else if (context.direction === 'descending') {
      useFlats = true;
    } else {
      return note;
    }

    const names = useFlats ? NOTE_NAMES_12TET_FLAT : NOTE_NAMES_12TET_SHARP;
    const pc = ((note.stepsFromBase % 12) + 12) % 12;
    const octave = Math.floor((note.stepsFromBase + 9) / 12) + 4;
    return new Note(ts, note.stepsFromBase, `${names[pc]}${octave}`);
  }

  /**
   * Respells a chord's root and slash bass based on key context or melodic direction,
   * keeping the written suffix (extensions, alterations).
   * - `keySymbol`: `spellChordInKey` (root letter from the key, chord tones by interval).
   * - `direction: 'ascending'`: sharp names; `'descending'`: flat names (C#9 → Db9).
   */
  static respellChord(chord: Chord, context: RespellContext): Chord {
    const ts = chord.tuningSystem;
    if (ts.octaveSteps !== 12) {
      const twelve = chord.retune(TET12);
      return (twelve && Harmony.respellChord(twelve, context).retune(ts)) ?? chord;
    }
    if (context.keySymbol) return spellChordInKey(chord, context.keySymbol);

    let useFlats: boolean;
    if (context.direction === 'ascending') {
      useFlats = false;
    } else if (context.direction === 'descending') {
      useFlats = true;
    } else {
      return chord;
    }

    const pick = (step: number) => (useFlats ? NOTE_NAMES_12TET_FLAT : NOTE_NAMES_12TET_SHARP)[pcMod(step, 12)];
    const [main, slash] = chord.name.split('/');
    const written = main.match(/^[A-G][#b]*/)?.[0];
    const quality = chordQualityFromIntervals(chord, 12);
    const suffix = written ? main.slice(written.length) : (quality === 'M' ? '' : quality);
    const bass = slash !== undefined && chord.bassStep !== undefined ? `/${pick(chord.bassStep)}` : '';

    return new Chord(`${pick(chord.rootStep)}${suffix}${bass}`, ts, chord.rootStep, chord.intervalsInSteps, chord.bassStep, useFlats);
  }
}

// ============================================================================
//  Module helpers (not exported)
// ============================================================================

/** A key to modulate to: its pitch classes (minor keys include the raised leading tone). */
interface CandidateKey { symbol: string; pcs: number[]; tonicPc: number; minor: boolean }

function candidateKeys(tuning: TuningSystem): CandidateKey[] {
  const keys: CandidateKey[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const flatName = NOTE_NAMES_12TET_FLAT[pc];
    const sharpName = NOTE_NAMES_12TET_SHARP[pc];
    const major = `${preferFlatsForKey(flatName, 'major') ? flatName : sharpName} major`;
    const minor = `${preferFlatsForKey(flatName, 'minor') ? flatName : sharpName} minor`;
    const majPcs = parseScaleSymbol(major, tuning).getPitchClasses();
    const minScale = parseScaleSymbol(minor, tuning).getPitchClasses();
    keys.push({ symbol: major, pcs: majPcs, tonicPc: majPcs[0], minor: false });
    // harmonic minor's leading tone belongs to the key (E7 → Am in A minor)
    const leadingTone = pcMod(minScale[0] + 11, 12);
    keys.push({ symbol: minor, pcs: [...minScale, leadingTone], tonicPc: minScale[0], minor: true });
  }
  return keys;
}

/**
 * Modulations: a chord foreign to the current key starts a passage that a new key holds.
 * The new key is the one, among those holding the passage, with an authentic cadence
 * (V or V7 → its tonic) in it, then with its tonic chord in it, then with the best
 * Krumhansl-Schmuckler correlation. A passage of fewer than three chords is a
 * tonicization (E7 → Am inside C major; B7 → Em at the end), not a modulation.
 * Nor is a passage whose foreign chords are all secondary dominants of the current key when
 * the next chord returns to that key (a turnaround). In the blues, I7, IV7 and V7 belong to
 * the key. The modulation is placed on the first foreign chord; it is a pivot modulation
 * when the chord before belongs to both keys.
 */
function detectModulations(chords: Chord[], key: KeyInfo, blues = false): ModulationEvent[] {
  const events: ModulationEvent[] = [];
  const tuning = key.tuning;
  if (tuning.octaveSteps !== 12 || chords.length < 2) return events;

  const candidates = candidateKeys(tuning);
  const pcsOf = chords.map(c => c.getPitchClasses());
  const fits = (i: number, pcs: number[]) => pcsOf[i].every(pc => pcs.includes(pc));
  const has = (c: Chord, semis: number) => c.intervalsInSteps.some(s => pcMod(s, 12) === semis);
  const isTonic = (c: Chord, k: CandidateKey) =>
    pcMod(c.rootStep, 12) === k.tonicPc && has(c, k.minor ? 3 : 4) && !has(c, k.minor ? 4 : 3);
  const isDominant = (c: Chord, k: CandidateKey) => pcMod(c.rootStep, 12) === pcMod(k.tonicPc + 7, 12) && has(c, 4);

  let active: { symbol: string; pcs: number[] } = { symbol: `${key.rootName} ${key.mode}`, pcs: key.scalePcs };
  let activeInfo = key;
  // In the blues, I7, IV7 and V7 belong to the active key
  const inActive = (j: number) => fits(j, active.pcs) || (blues && isBluesSeventh(chords[j], activeInfo));
  // Secondary dominants and leading-tone chords of the active key
  const applied = (j: number) => detectSecondaryDominant(chords[j], activeInfo).isSecondary;
  let i = 1;
  while (i < chords.length) {
    if (inActive(i)) { i++; continue; }

    // The passage each candidate holds from the foreign chord on
    const options = candidates
      .filter(k => k.symbol !== active.symbol && fits(i, k.pcs))
      .map(k => {
        let end = i;
        while (end + 1 < chords.length && fits(end + 1, k.pcs)) end++;
        const passage = chords.slice(i, end + 1);
        const cadence = passage.some((c, j) => j + 1 < passage.length && isDominant(c, k) && isTonic(passage[j + 1], k));
        const tonic = passage.some(c => isTonic(c, k));
        const confirmed = end - i + 1 >= 3;
        // Applied chords of the active key, then back to it: a tonicization
        let appliedOnly = true;
        for (let j = i; j <= end; j++) if (!inActive(j) && !applied(j)) appliedOnly = false;
        const returns = end + 1 < chords.length && (inActive(end + 1) || applied(end + 1));
        return { k, end, cadence, tonic, confirmed: confirmed && !(appliedOnly && returns) };
      })
      .filter(o => o.confirmed && (o.cadence || o.tonic));

    if (options.length === 0) { i++; continue; }

    const histogram = new Array(12).fill(0);
    for (let j = Math.max(0, i - 1); j <= Math.max(...options.map(o => o.end)); j++) {
      for (const pc of pcsOf[j]) histogram[(pc + 9) % 12] += 1; // A-based pitch class → C-based
    }
    const ranking = KeyDetection.detectFromHistogram(histogram).map(r => r.key.toLowerCase());
    const rank = (s: string) => { const r = ranking.indexOf(s.toLowerCase()); return r === -1 ? Infinity : r; };
    const best = options.sort((a, b) =>
      Number(b.cadence) - Number(a.cadence) || Number(b.tonic) - Number(a.tonic) || rank(a.k.symbol) - rank(b.k.symbol))[0];

    const pivot = i > 0 && fits(i - 1, active.pcs) && fits(i - 1, best.k.pcs) ? chords[i - 1] : undefined;
    events.push({ atIndex: i, fromKey: active.symbol, toKey: best.k.symbol, type: pivot ? 'pivot' : 'direct', pivotChord: pivot });
    active = best.k;
    activeInfo = parseKey(best.k.symbol, tuning, key.spelling);
    i = best.end + 1;
  }
  return events;
}

/**
 * Harmonic rhythm. With durations (in beats), chord changes per bar of `beatsPerBar`;
 * without them, chord changes per chord (a repeated chord is not a change).
 */
function computeHarmonicRhythm(chords: Chord[], durations?: readonly number[], beatsPerBar = 4): number {
  if (chords.length <= 1) return chords.length === 0 ? 0 : 1;
  let changes = 0;
  for (let i = 1; i < chords.length; i++) {
    const prev = chords[i - 1];
    const cur = chords[i];
    if (prev.rootStep !== cur.rootStep || prev.name !== cur.name) changes++;
  }
  if (!durations) return changes / (chords.length - 1);
  const bars = durations.reduce((a, b) => a + b, 0) / beatsPerBar;
  return bars > 0 ? changes / bars : 0;
}
