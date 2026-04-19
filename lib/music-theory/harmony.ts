import { Chord } from './chord';
import { parseScaleSymbol, parseChordSymbol } from './parser';
import { get12TETName, get12TETBaseName, parseNoteToStep12TET, preferFlatsForKey, NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP } from './utils';
import { CHORD_FORMULAS } from './dictionaries';
import { Note } from './note';
import { Scale } from './scale';
import { TuningSystem, TET12 } from './tuning';

// ============================================================================
//  Types
// ============================================================================

export type VoiceLeadingIssueType =
  | 'Parallel 5th' | 'Parallel Octave' | 'Voice Crossing' | 'Voice Overlap'
  | 'Leading Tone Unresolved' | '7th Unresolved' | 'Forbidden Leap'
  | 'Hidden Fifth' | 'Hidden Octave' | 'Direct Fifth' | 'Direct Octave'
  | 'False Relation' | 'Doubled Leading Tone'
  | 'Missing Third' | 'Missing Root' | 'Missing Fifth'
  | 'Improper 6/4 Usage';

export interface VoiceLeadingIssue {
  type: VoiceLeadingIssueType;
  voices: number[];
  message: string;
}

export interface DoublingIssue {
  type: 'Doubled Leading Tone' | 'Missing Third' | 'Missing Root' | 'Missing Fifth' | 'Improper Doubling';
  voices: number[];
  message: string;
}

export interface ChordAnalysis {
  chord: Chord;
  roman: string;
  degree: number;                 // 1-7, or -1 if chromatic and un-mappable
  function: 'T' | 'S' | 'D' | 'unknown';
  isDiatonic: boolean;
  isBorrowed: boolean;
  borrowedFrom?: string;
  isSecondary: boolean;
  secondaryTarget?: string;
  cadenceWithNext?: string;
  substitutionCandidate?: string;
}

export interface ModulationEvent {
  atIndex: number;
  fromKey: string;
  toKey: string;
  type: 'direct' | 'pivot' | 'enharmonic' | 'chromatic' | 'common-tone';
  pivotChord?: Chord;
}

export interface SixFourAnalysis {
  type: 'cadential' | 'pedal' | 'passing' | 'arpeggiated' | 'none';
  resolution?: Chord;
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
}

function parseKey(keySymbol: string, tuning: TuningSystem): KeyInfo {
  const scale = parseScaleSymbol(keySymbol, tuning);
  const scalePcs = scale.getPitchClasses();
  const match = keySymbol.match(/^([A-G][#b]*)\s+(.*)$/i);
  const rootName = match ? match[1] : 'C';
  const modeRaw = match ? match[2].trim().toLowerCase() : 'major';
  const isMinor = /minor|aeolian|dorian|phrygian|locrian/.test(modeRaw);
  return { scale, scalePcs, tonicPc: scalePcs[0], rootName, mode: modeRaw, isMinor, tuning };
}

function pcMod(step: number, oct: number): number {
  return ((step % oct) + oct) % oct;
}

function chordQualityFromIntervals(chord: Chord, oct: number): string {
  if (oct !== 12) return '';
  const pcs = chord.intervalsInSteps.map(i => pcMod(i, oct));
  const has = (n: number) => pcs.includes(n);
  if (has(4) && has(7) && has(11)) return 'maj7';
  if (has(3) && has(7) && has(10)) return 'm7';
  if (has(4) && has(7) && has(10)) return '7';
  if (has(3) && has(6) && has(9)) return 'dim7';
  if (has(3) && has(6) && has(10)) return 'm7b5';
  if (has(3) && has(7) && has(11)) return 'mM7';
  if (has(4) && has(8) && has(10)) return 'aug7';
  if (has(4) && has(8) && has(11)) return 'augM7';
  if (has(4) && has(8)) return 'aug';
  if (has(3) && has(6)) return 'dim';
  if (has(2) && has(7)) return 'sus2';
  if (has(5) && has(7)) return 'sus4';
  if (has(3) && has(7)) return 'm';
  if (has(4) && has(7)) return 'M';
  return '';
}

const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

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
  let idx = key.scalePcs.indexOf(chordRootPc);
  let accidental: '' | 'b' | '#' = '';
  let degree = idx !== -1 ? idx + 1 : -1;

  if (idx === -1) {
    // Try as flatted degree (root is 1 semitone below a scale note)
    const sharpTarget = pcMod(chordRootPc + 1, oct);
    const flatIdx = key.scalePcs.indexOf(sharpTarget);
    // Try as sharped degree
    const flatTarget = pcMod(chordRootPc - 1, oct);
    const sharpIdx = key.scalePcs.indexOf(flatTarget);
    if (flatIdx !== -1) { degree = flatIdx + 1; accidental = 'b'; }
    else if (sharpIdx !== -1) { degree = sharpIdx + 1; accidental = '#'; }
  }

  const quality = chordQualityFromIntervals(chord, oct);
  const parts = qualityToRomanParts(quality);
  const romanBase = degree > 0 ? ROMAN_UPPER[degree - 1] : '?';
  const romanCased = parts.upper ? romanBase : romanBase.toLowerCase();
  const roman = `${accidental}${romanCased}${parts.suffix}`;

  // Diatonic = every pitch class of the chord is in the scale
  const chordPcs = chord.getPitchClasses();
  const isDiatonic = chordPcs.every(pc => key.scalePcs.includes(pc));

  return { roman, degree, accidental, isDiatonic, quality };
}

/**
 * Maps a (degree, quality) pair to a functional category T/S/D.
 * Conservative mapping: uses scale degree primarily; quality only disambiguates edge cases.
 */
function getFunction(degree: number, quality: string, isMinor: boolean): 'T' | 'S' | 'D' | 'unknown' {
  if (degree <= 0) return 'unknown';
  // Dominants: V (any quality), vii° (leading-tone)
  if (degree === 5) return 'D';
  if (degree === 7) {
    if (quality === 'dim' || quality === 'dim7' || quality === 'm7b5') return 'D';
    return 'unknown';
  }
  // Subdominants: ii, IV
  if (degree === 2 || degree === 4) return 'S';
  // Tonics: I, iii, vi
  if (degree === 1 || degree === 3 || degree === 6) return 'T';
  return 'unknown';
}

function detectSecondaryDominant(chord: Chord, key: KeyInfo): { isSecondary: boolean; target?: string } {
  const oct = chord.tuningSystem.octaveSteps;
  const quality = chordQualityFromIntervals(chord, oct);
  if (quality !== '7' && quality !== 'M') return { isSecondary: false };
  const chordRootPc = pcMod(chord.rootStep, oct);
  const targetPc = pcMod(chordRootPc + 5, oct); // V → I is root+5 (a 4th up)

  // Don't flag V → I of the main key as secondary
  if (targetPc === key.tonicPc) return { isSecondary: false };

  const targetIdx = key.scalePcs.indexOf(targetPc);
  if (targetIdx === -1) return { isSecondary: false };

  const targetDegree = targetIdx + 1;
  // Only meaningful for dom7 ('7'), or for plain major triads as secondary dominants
  if (quality !== '7') return { isSecondary: false };
  return { isSecondary: true, target: `V7/${ROMAN_UPPER[targetDegree - 1]}` };
}

/**
 * Returns a human-readable tag for a borrowed chord, based on parallel-mode analysis,
 * or null if the chord is not a borrowing from a recognized parallel mode.
 */
function detectBorrowedFrom(chord: Chord, key: KeyInfo): string | null {
  if (key.tuning.octaveSteps !== 12) return null;
  const chordPcs = new Set(chord.getPitchClasses());
  const quality = chordQualityFromIntervals(chord, 12);

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

export class Harmony {
  /**
   * Checks voice leading between two chords. Emits warnings for parallel motion,
   * voice crossing, overlap, and (when `context` is provided) unresolved tendency
   * tones, hidden/direct 5ths/8ves, false relations, and doubled leading tones.
   *
   * Voices are expected to be ordered bass → soprano in both chords.
   *
   * @param ruleset
   *   - `'strict'`: Bach chorale-style — all standard prohibitions enforced.
   *   - `'contemporary'`: jazz/pop — relaxes parallel 5ths/8ves and leaps.
   *   - `'species'`: minimal — no parallels, no crossing, no overlap. Full species
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
          // Hidden/Direct 5ths and 8ves — only flag outer-voice pairs (bass + soprano) in chorale style
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
        if (chordB[i].stepsFromBase > chordA[j].stepsFromBase) {
          issues.push({ type: 'Voice Overlap', voices: [i, j], message: `Voice Overlap: Voice ${i+1} rises above previous Voice ${j+1}` });
        }
        if (chordB[j].stepsFromBase < chordA[i].stepsFromBase) {
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
        const leadingTonePc = pcMod(key.tonicPc + oct - 1, oct);
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
                if (delta !== -1 && delta !== -ts.getStepFromStandard(1) && delta !== -2) {
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
        // Bad key symbol — skip contextual checks
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
        const leadingTonePc = pcMod(key.tonicPc + oct - 1, oct);
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
        // bad key — skip
      }
    }

    return issues;
  }

  /**
   * Analyzes a progression in a given key, returning Roman-numeral-level info for
   * each chord (function, diatonicism, borrowed/secondary flags, cadence-with-next)
   * and a list of detected modulations (3+ consecutive chords diatonic to a new key).
   */
  static analyzeProgression(chords: Chord[], keySymbol: string): {
    analysis: ChordAnalysis[];
    modulations: ModulationEvent[];
    harmonicRhythm: number;
  } {
    if (chords.length === 0) return { analysis: [], modulations: [], harmonicRhythm: 0 };
    const tuning = chords[0].tuningSystem;
    const key = parseKey(keySymbol, tuning);

    const analysis: ChordAnalysis[] = chords.map((chord, i) => {
      const { roman, degree, isDiatonic, quality } = getRomanForChord(chord, key);
      const fn = getFunction(degree, quality, key.isMinor);

      let borrowedFrom: string | undefined;
      let isBorrowed = false;
      if (!isDiatonic) {
        const bf = detectBorrowedFrom(chord, key);
        if (bf) { isBorrowed = true; borrowedFrom = bf; }
      }

      const { isSecondary, target } = detectSecondaryDominant(chord, key);

      let cadenceWithNext: string | undefined;
      if (i < chords.length - 1) {
        const cad = Harmony.analyzeCadence(chord, chords[i + 1], keySymbol);
        if (cad !== 'No standard cadence') cadenceWithNext = cad;
      }

      let substitutionCandidate: string | undefined;
      if (detectTritoneSubOfV(chord, key)) substitutionCandidate = 'tritone sub of V';

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
      };
    });

    const modulations = detectModulations(chords, key);
    const harmonicRhythm = computeHarmonicRhythm(chords);

    return { analysis, modulations, harmonicRhythm };
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

    if (octave !== 12) return ['Unknown Chord'];

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
          let chordName = `${rootName}${suffix}`;

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
   * Returns the Negative Harmony equivalent of a chord in a given key.
   */
  static getNegativeHarmony(chord: Chord, keyCenter: string): Chord {
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

    const detectedNames = this.detectChords(negativeNotes);
    const bestName = detectedNames[0] !== 'Unknown Chord' ? detectedNames[0] : `Negative of ${chord.name}`;

    const newRootStep = negativeNotes[0].stepsFromBase;
    const newIntervals = negativeNotes.map(n => n.stepsFromBase - newRootStep);

    return new Chord(bestName, tuning, newRootStep, newIntervals);
  }

  /**
   * Returns a list of borrowed chords from parallel modes (Modal Interchange).
   */
  static getBorrowedChords(keySymbol: string, tuning: TuningSystem = TET12): Chord[] {
    if (tuning.octaveSteps !== 12) return [];
    const match = keySymbol.match(/^([A-G][#b]*)\s+(.*)$/i);
    if (!match) return [];
    const [, rootName, type] = match;
    const isMajor = type.toLowerCase().includes('major') || type.toLowerCase().includes('ionian');

    const borrowedChords: Chord[] = [];

    if (isMajor) {
      const minorScale = parseScaleSymbol(`${rootName} minor`, tuning);
      const minorNotes = minorScale.getNotes(1);
      const b3  = get12TETBaseName(minorNotes[2].stepsFromBase, minorNotes[2].preferFlats);
      const b6  = get12TETBaseName(minorNotes[5].stepsFromBase, minorNotes[5].preferFlats);
      const b7  = get12TETBaseName(minorNotes[6].stepsFromBase, minorNotes[6].preferFlats);
      const p4  = get12TETBaseName(minorNotes[3].stepsFromBase, minorNotes[3].preferFlats);
      const p5  = get12TETBaseName(minorNotes[4].stepsFromBase, minorNotes[4].preferFlats);
      const p2  = get12TETBaseName(minorNotes[1].stepsFromBase, minorNotes[1].preferFlats);

      borrowedChords.push(parseChordSymbol(`${rootName}m7`, tuning));
      borrowedChords.push(parseChordSymbol(`${p2}m7b5`, tuning));
      borrowedChords.push(parseChordSymbol(`${b3}maj7`, tuning));
      borrowedChords.push(parseChordSymbol(`${p4}m7`, tuning));
      borrowedChords.push(parseChordSymbol(`${p5}m7`, tuning));
      borrowedChords.push(parseChordSymbol(`${b6}maj7`, tuning));
      borrowedChords.push(parseChordSymbol(`${b7}7`, tuning));

      const dorianScale = parseScaleSymbol(`${rootName} dorian`, tuning);
      const dorianNotes = dorianScale.getNotes(1);
      const d6 = get12TETBaseName(dorianNotes[5].stepsFromBase, dorianNotes[5].preferFlats);
      const p4d = get12TETBaseName(dorianNotes[3].stepsFromBase, dorianNotes[3].preferFlats);
      borrowedChords.push(parseChordSymbol(`${d6}m7`, tuning));
      borrowedChords.push(parseChordSymbol(`${p4d}7`, tuning));
    } else {
      const majorScale = parseScaleSymbol(`${rootName} major`, tuning);
      const majorNotes = majorScale.getNotes(1);
      const p4   = get12TETBaseName(majorNotes[3].stepsFromBase, majorNotes[3].preferFlats);
      const p5   = get12TETBaseName(majorNotes[4].stepsFromBase, majorNotes[4].preferFlats);
      const maj3 = get12TETBaseName(majorNotes[2].stepsFromBase, majorNotes[2].preferFlats);

      borrowedChords.push(parseChordSymbol(`${rootName}maj7`, tuning));
      borrowedChords.push(parseChordSymbol(`${maj3}7`, tuning));
      borrowedChords.push(parseChordSymbol(`${p4}maj7`, tuning));
      borrowedChords.push(parseChordSymbol(`${p5}7`, tuning));
    }

    return borrowedChords;
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
    const c1IsMajor = c1Pcs.includes(maj3) && !c1Pcs.includes(min3);
    const c1IsMinor = c1Pcs.includes(min3) && !c1Pcs.includes(maj3);
    const c2IsMajor = c2Pcs.includes(maj3) && !c2Pcs.includes(min3);
    const c2IsMinor = c2Pcs.includes(min3) && !c2Pcs.includes(maj3);

    const isC2Tonic = r2 === t;
    const isC1Subdominant = r1 === (t + ts.getStepFromStandard(5)) % oct; // IV
    const isC1DominantRoot = r1 === (t + ts.getStepFromStandard(7)) % oct; // V

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

    // Deceptive
    if (isC1DominantRoot && r2 === (t + ts.getStepFromStandard(9)) % oct) {
      return 'Deceptive Cadence (V -> vi)';
    }

    // Phrygian Half / Hyper-phrygian: ♭II → I (or → i)
    if (r1 === (t + ts.getStepFromStandard(1)) % oct && isC2Tonic && !isC1Dominant) {
      return 'Phrygian Cadence (bII -> I)';
    }

    // iv → V (classical Phrygian half cadence in minor)
    if (isC1Subdominant && c1IsMinor && r2 === (t + ts.getStepFromStandard(7)) % oct) {
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
   */
  static getSuggestedScales(chord: Chord, nextChord?: Chord, ruleset: 'berklee' | 'classical' | 'modal' = 'berklee'): { scale: string; hint?: string }[] {
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;
    const rootPf = chord.preferFlats ?? false;
    const root = get12TETBaseName(chord.rootStep, rootPf);

    const pcs = chord.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
    const has = (semitone: number) => pcs.includes(ts.getStepFromStandard(semitone));

    const isMaj7    = has(11) && has(4);
    const isMin7    = has(10) && has(3) && has(7) && !has(6);
    const isDom7    = has(10) && has(4) && !has(11);
    const isHalfDim = has(6)  && has(3) && has(10);
    const isDim     = has(6)  && has(3) && !has(10);
    const isAug     = has(8)  && has(4) && !has(10);

    const s = (scale: string, hint?: string): { scale: string; hint?: string } => ({ scale, hint });

    if (ruleset === 'classical') {
      if (isMaj7) return [s(`${root} major`)];
      if (isMin7) return [s(`${root} minor`)];
      if (isDom7) return [s(`${root} mixolydian`)];
      if (isDim) return [s(`${root} whole-half diminished`)];
      return [s(`${root} major`), s(`${root} minor`)];
    }

    if (ruleset === 'modal') {
      if (isMaj7) return [s(`${root} ionian`), s(`${root} lydian`)];
      if (isMin7) return [s(`${root} dorian`), s(`${root} phrygian`), s(`${root} aeolian`)];
      if (isDom7) return [s(`${root} mixolydian`)];
      if (isHalfDim) return [s(`${root} locrian`), s(`${root} locrian #2`)];
    }

    if (isMaj7) {
      return [s(`${root} ionian`), s(`${root} lydian`, 'if IV chord')];
    }

    if (isMin7) {
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
            suggestions.push(s(`${root} altered`));
            suggestions.push(s(`${root} half-whole diminished`, 'Mixolydian b9 b13 approximation'));
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

    return [s(`${root} major`), s(`${root} minor`)];
  }
}

// ============================================================================
//  Module helpers (not exported)
// ============================================================================

function detectModulations(chords: Chord[], key: KeyInfo): ModulationEvent[] {
  const events: ModulationEvent[] = [];
  const tuning = key.tuning;
  const oct = tuning.octaveSteps;
  if (oct !== 12) return events;

  // Candidate keys to check modulation to: all 12 major and 12 minor keys except current.
  const candidateKeys: { symbol: string; pcs: number[]; rootPc: number; mode: 'major' | 'minor' }[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const flatName = NOTE_NAMES_12TET_FLAT[pc];
    const sharpName = NOTE_NAMES_12TET_SHARP[pc];
    const pickMajor = preferFlatsForKey(flatName, 'major') ? flatName : sharpName;
    const pickMinor = preferFlatsForKey(flatName, 'minor') ? flatName : sharpName;
    const majScale = parseScaleSymbol(`${pickMajor} major`, tuning);
    const minScale = parseScaleSymbol(`${pickMinor} minor`, tuning);
    candidateKeys.push({ symbol: `${pickMajor} major`, pcs: majScale.getPitchClasses(), rootPc: pc, mode: 'major' });
    candidateKeys.push({ symbol: `${pickMinor} minor`, pcs: minScale.getPitchClasses(), rootPc: pc, mode: 'minor' });
  }

  // Sliding window of 3: if 3 consecutive chords are fully diatonic to some candidate key
  // that isn't the home key, mark a modulation at the start of that window.
  let activeKeySymbol = `${key.rootName} ${key.mode}`;
  let activeKeyPcs = key.scalePcs;
  let i = 0;
  while (i <= chords.length - 3) {
    const windowPcs = [
      ...chords[i].getPitchClasses(),
      ...chords[i + 1].getPitchClasses(),
      ...chords[i + 2].getPitchClasses(),
    ];
    const fitsActive = windowPcs.every(pc => activeKeyPcs.includes(pc));
    if (fitsActive) { i++; continue; }

    // Find best candidate (not active) that fits all three
    const hit = candidateKeys.find(ck =>
      ck.symbol !== activeKeySymbol &&
      windowPcs.every(pc => ck.pcs.includes(pc))
    );
    if (hit) {
      // Determine type: 'pivot' if chord at i-1 is diatonic to both keys, 'direct' otherwise
      let modType: ModulationEvent['type'] = 'direct';
      let pivot: Chord | undefined;
      if (i > 0) {
        const prevPcs = chords[i - 1].getPitchClasses();
        const fitsOld = prevPcs.every(pc => activeKeyPcs.includes(pc));
        const fitsNew = prevPcs.every(pc => hit.pcs.includes(pc));
        if (fitsOld && fitsNew) { modType = 'pivot'; pivot = chords[i - 1]; }
      }
      events.push({ atIndex: i, fromKey: activeKeySymbol, toKey: hit.symbol, type: modType, pivotChord: pivot });
      activeKeySymbol = hit.symbol;
      activeKeyPcs = hit.pcs;
      i += 3;
    } else {
      i++;
    }
  }
  return events;
}

function computeHarmonicRhythm(chords: Chord[]): number {
  if (chords.length <= 1) return chords.length === 0 ? 0 : 1;
  let changes = 0;
  for (let i = 1; i < chords.length; i++) {
    const prev = chords[i - 1];
    const cur = chords[i];
    if (prev.rootStep !== cur.rootStep || prev.name !== cur.name) changes++;
  }
  return changes / (chords.length - 1);
}
