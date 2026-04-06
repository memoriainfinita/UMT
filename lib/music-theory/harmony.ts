import { Chord } from './chord';
import { parseScaleSymbol, parseChordSymbol, parseNoteToStep12TET } from './parser';
import { get12TETName, get12TETBaseName } from './utils';
import { CHORD_FORMULAS } from './dictionaries';
import { Note } from './note';
import { TuningSystem } from './tuning';
import { TET12 } from './presets';

export interface VoiceLeadingIssue {
  type: 'Parallel 5th' | 'Parallel Octave' | 'Voice Crossing' | 'Voice Overlap';
  voices: [number, number];
  message: string;
}

export class Harmony {
  /**
   * Analyzes voice leading between two chords and returns a list of warnings.
   * Assumes notes are ordered from lowest (bass) to highest (soprano).
   * @param ruleset 'strict' (Bach chorale) or 'contemporary' (Jazz/Pop)
   */
  static checkVoiceLeading(chordA: Note[], chordB: Note[], ruleset: 'strict' | 'contemporary' = 'strict'): VoiceLeadingIssue[] {
    const issues: VoiceLeadingIssue[] = [];
    const len = Math.min(chordA.length, chordB.length);
    
    const oct = chordA[0]?.tuningSystem.octaveSteps ?? 12;
    const p5 = chordA[0]?.tuningSystem.getStepFromStandard(7) ?? 7;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const stepsA = chordA[j].stepsFromBase - chordA[i].stepsFromBase;
        const stepsB = chordB[j].stepsFromBase - chordB[i].stepsFromBase;

        const is5thA = Math.abs(stepsA) % oct === p5;
        const is5thB = Math.abs(stepsB) % oct === p5;
        const is8veA = Math.abs(stepsA) % oct === 0 && stepsA !== 0;
        const is8veB = Math.abs(stepsB) % oct === 0 && stepsB !== 0;

        const voiceIMoved = chordA[i].stepsFromBase !== chordB[i].stepsFromBase;
        const voiceJMoved = chordA[j].stepsFromBase !== chordB[j].stepsFromBase;

        if (ruleset === 'strict') {
          if (is5thA && is5thB && voiceIMoved && voiceJMoved) {
            issues.push({ type: 'Parallel 5th', voices: [i, j], message: `Parallel 5ths (Voices ${i+1} and ${j+1})` });
          }
          if (is8veA && is8veB && voiceIMoved && voiceJMoved) {
            issues.push({ type: 'Parallel Octave', voices: [i, j], message: `Parallel Octaves (Voices ${i+1} and ${j+1})` });
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
    return issues;
  }

  /**
   * Analyzes an array of notes and returns possible chord names.
   * Useful for Ear Training apps or MIDI input analysis.
   */
  static detectChords(notes: Note[]): string[] {
    if (notes.length === 0) return [];
    const octave = notes[0].tuningSystem.octaveSteps;

    // Chord detection against CHORD_FORMULAS (12-TET semitone values) only makes sense in 12-TET
    if (octave !== 12) return ['Unknown Chord'];

    // Get unique pitch classes
    const pitchClasses = Array.from(new Set(notes.map(n => ((n.stepsFromBase % octave) + octave) % octave)));
    const bassStep = ((notes[0].stepsFromBase % octave) + octave) % octave;

    const matches: string[] = [];
    const aliases = ['major', 'minor', 'dominant7', 'half-diminished'];

    for (const root of pitchClasses) {
      // Input intervals relative to root, mod octave, sorted
      const inputIntervals = pitchClasses.map(pc => ((pc - root + octave) % octave)).sort((a, b) => a - b);

      for (const [suffix, formula] of Object.entries(CHORD_FORMULAS)) {
        if (aliases.includes(suffix)) continue;

        // Convert formula to unique pitch classes mod octave, sorted
        const formulaPcs = Array.from(new Set(formula.map(interval => ((interval % octave) + octave) % octave))).sort((a, b) => a - b);

        if (formulaPcs.length === inputIntervals.length && formulaPcs.every((val, index) => val === inputIntervals[index])) {
          const rootName = get12TETBaseName(root, false);
          let chordName = `${rootName}${suffix}`;

          if (root !== bassStep) {
            const bassName = get12TETBaseName(bassStep, false);
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
   * Negative harmony reflects notes around the axis of the key (midpoint between root and fifth).
   */
  static getNegativeHarmony(chord: Chord, keyCenter: string): Chord {
    const match = keyCenter.match(/^([A-G][#b]*)/i);
    const keyRootName = match ? match[1] : 'C';
    const ts = chord.tuningSystem;
    // Convert key root to the chord's tuning coordinate space
    const keyRootStep = ts.getStepFromStandard(parseNoteToStep12TET(keyRootName, 4));

    // In negative harmony, the axis of inversion is the perfect fifth of the key.
    // For C major, axis is between Eb and E. The sum of inverted pairs is always P5 (relative to root).
    // Absolute axis sum = (keyRootStep * 2) + P5.
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
   * For a major key, it typically borrows from parallel minor (Aeolian), Dorian, Mixolydian, etc.
   */
  static getBorrowedChords(keySymbol: string, tuning: TuningSystem = TET12): Chord[] {
    const match = keySymbol.match(/^([A-G][#b]*)\s+(.*)$/i);
    if (!match) return [];
    const [, rootName, type] = match;
    const isMajor = type.toLowerCase().includes('major') || type.toLowerCase().includes('ionian');

    const borrowedChords: Chord[] = [];

    if (isMajor) {
      // --- From parallel Aeolian (natural minor) ---
      const minorScale = parseScaleSymbol(`${rootName} minor`, tuning);
      const minorNotes = minorScale.getNotes(1);
      const b3 = get12TETBaseName(minorNotes[2].stepsFromBase, true);
      const b6 = get12TETBaseName(minorNotes[5].stepsFromBase, true);
      const b7 = get12TETBaseName(minorNotes[6].stepsFromBase, true);
      const p4 = get12TETBaseName(minorNotes[3].stepsFromBase, true);
      const p5 = get12TETBaseName(minorNotes[4].stepsFromBase, true);
      const p2 = get12TETBaseName(minorNotes[1].stepsFromBase, true);

      borrowedChords.push(parseChordSymbol(`${rootName}m7`, tuning));  // i m7   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${p2}m7b5`, tuning));      // ii∅7   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${b3}maj7`, tuning));      // bIII△  (Aeolian)
      borrowedChords.push(parseChordSymbol(`${p4}m7`, tuning));        // iv m7  (Aeolian)
      borrowedChords.push(parseChordSymbol(`${p5}m7`, tuning));        // v m7   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${b6}maj7`, tuning));      // bVI△   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${b7}7`, tuning));         // bVII7  (Backdoor dominant — Aeolian/Mixolydian)

      // --- From parallel Dorian ---
      const dorianScale = parseScaleSymbol(`${rootName} dorian`, tuning);
      const dorianNotes = dorianScale.getNotes(1);
      const d6 = get12TETBaseName(dorianNotes[5].stepsFromBase); // natural 6th (differs from Aeolian b6)
      borrowedChords.push(parseChordSymbol(`${d6}m7`, tuning));          // vim7 from Dorian (natural 6th area)
      borrowedChords.push(parseChordSymbol(`${p4}7`, tuning));           // IV7  (Dorian characteristic)
    } else {
      // --- From parallel major ---
      const majorScale = parseScaleSymbol(`${rootName} major`, tuning);
      const majorNotes = majorScale.getNotes(1);
      const p4 = get12TETBaseName(majorNotes[3].stepsFromBase);
      const p5 = get12TETBaseName(majorNotes[4].stepsFromBase);
      const maj3 = get12TETBaseName(majorNotes[2].stepsFromBase); // natural 3rd (Picardy area)

      borrowedChords.push(parseChordSymbol(`${rootName}maj7`, tuning));  // I△  (Picardy third)
      borrowedChords.push(parseChordSymbol(`${maj3}7`, tuning));         // III7 (from parallel major)
      borrowedChords.push(parseChordSymbol(`${p4}maj7`, tuning));        // IV△
      borrowedChords.push(parseChordSymbol(`${p5}7`, tuning));           // V7
    }
    
    return borrowedChords;
  }

  /**
   * Analyzes the cadence between two chords in a given key.
   */
  static analyzeCadence(chord1: Chord, chord2: Chord, keySymbol: string): string {
    const ts = chord1.tuningSystem;
    const oct = ts.octaveSteps;
    const scale = parseScaleSymbol(keySymbol, ts);
    const scaleNotes = scale.getNotes(1);
    const tonicStep = scaleNotes[0].stepsFromBase % oct;

    const c1Root = chord1.rootStep % oct;
    const c2Root = chord2.rootStep % oct;

    // Normalize to positive modulo
    const t = (tonicStep + oct) % oct;
    const r1 = (c1Root + oct) % oct;
    const r2 = (c2Root + oct) % oct;

    // A chord is dominant if it contains a minor 7th but not a major 7th.
    // Checked against actual intervals to avoid false positives from chord names.
    const min7 = ts.getStepFromStandard(10);
    const maj7 = ts.getStepFromStandard(11);
    const c1Pcs = chord1.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
    const isC1Dominant = c1Pcs.includes(min7) && !c1Pcs.includes(maj7);
    const isC2Tonic = r2 === t;
    const isC1Subdominant = r1 === (t + ts.getStepFromStandard(5)) % oct; // IV
    const isC1DominantRoot = r1 === (t + ts.getStepFromStandard(7)) % oct; // V

    if (isC1DominantRoot && isC2Tonic) {
      return 'Authentic Cadence (V -> I)';
    }
    if (isC1Subdominant && isC2Tonic) {
      return 'Plagal Cadence (IV -> I)';
    }
    if (isC1DominantRoot && r2 === (t + ts.getStepFromStandard(9)) % oct) { // V -> vi
      return 'Deceptive Cadence (V -> vi)';
    }
    if (isC2Tonic && r1 === (t + ts.getStepFromStandard(10)) % oct && isC1Dominant) { // bVII7 -> I
      return 'Backdoor Cadence (bVII7 -> I)';
    }
    if (r2 === (t + ts.getStepFromStandard(7)) % oct) { // Ends on V
      return 'Half Cadence (-> V)';
    }

    // Check for tritone substitution resolution (subV7 -> I)
    if (isC1Dominant && r1 === (t + ts.getStepFromStandard(1)) % oct && isC2Tonic) {
      return 'Tritone Sub Resolution (subV7 -> I)';
    }

    return 'No standard cadence';
  }

  /**
   * Suggests scales for improvisation over a given chord, optionally considering the next chord.
   * @param chord The chord to analyze
   * @param nextChord The following chord in the progression (optional)
   * @param ruleset The pedagogical style to use ('berklee' | 'classical' | 'modal')
   */
  static getSuggestedScales(chord: Chord, nextChord?: Chord, ruleset: 'berklee' | 'classical' | 'modal' = 'berklee'): { scale: string; hint?: string }[] {
    const root = chord.name.match(/^[A-G][#b]*/)?.[0] || 'C';
    const ts = chord.tuningSystem;
    const oct = ts.octaveSteps;

    // Detect chord type from intervals, not from name string
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
      if (isHalfDim) return [s(`${root} locrian`)];
    }

    // Default: 'berklee' (Jazz Chord-Scale Theory)
    if (isMaj7) {
      return [s(`${root} ionian`), s(`${root} lydian`, 'if IV chord')];
    }

    if (isMin7) {
      return [s(`${root} dorian`, 'standard ii'), s(`${root} aeolian`), s(`${root} phrygian`)];
    }

    if (isDom7) {
      const suggestions = [s(`${root} mixolydian`, 'standard V')];

      if (nextChord) {
        const r1 = chord.rootStep % 12;
        const r2 = nextChord.rootStep % 12;
        const distance = ((r2 - r1) + 12) % 12;

        if (distance === 5) {
          const isNextMinor = nextChord.name.includes('m');
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
      return [s(`${root} locrian`), s(`${root} dorian`, 'Locrian #2 — jazz standard')];
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
