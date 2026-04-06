import { Chord } from './chord';
import { parseScaleSymbol, parseChordSymbol, parseNoteToStep12TET } from './parser';
import { get12TETName, get12TETBaseName } from './utils';
import { CHORD_FORMULAS } from './dictionaries';
import { Note } from './note';

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
    
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const stepsA = chordA[j].stepsFromBase - chordA[i].stepsFromBase;
        const stepsB = chordB[j].stepsFromBase - chordB[i].stepsFromBase;
        
        const is5thA = Math.abs(stepsA) % 12 === 7;
        const is5thB = Math.abs(stepsB) % 12 === 7;
        const is8veA = Math.abs(stepsA) % 12 === 0 && stepsA !== 0;
        const is8veB = Math.abs(stepsB) % 12 === 0 && stepsB !== 0;

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
    const keyRootStep = parseNoteToStep12TET(keyRootName, 4);

    // In negative harmony, the axis of inversion is the perfect fifth of the key.
    // For C major, axis is between Eb and E. The sum of inverted pairs is always 7 (relative to root).
    // Absolute axis sum = (keyRootStep * 2) + 7.
    const axisSum = (keyRootStep * 2) + 7;

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
  static getBorrowedChords(keySymbol: string): Chord[] {
    const match = keySymbol.match(/^([A-G][#b]*)\s+(.*)$/i);
    if (!match) return [];
    const [, rootName, type] = match;
    const isMajor = type.toLowerCase().includes('major') || type.toLowerCase().includes('ionian');
    
    const borrowedChords: Chord[] = [];
    
    if (isMajor) {
      // --- From parallel Aeolian (natural minor) ---
      const minorScale = parseScaleSymbol(`${rootName} minor`);
      const minorNotes = minorScale.getNotes(1);
      const b3 = get12TETBaseName(minorNotes[2].stepsFromBase, true);
      const b6 = get12TETBaseName(minorNotes[5].stepsFromBase, true);
      const b7 = get12TETBaseName(minorNotes[6].stepsFromBase, true);
      const p4 = get12TETBaseName(minorNotes[3].stepsFromBase, true);
      const p5 = get12TETBaseName(minorNotes[4].stepsFromBase, true);
      const p2 = get12TETBaseName(minorNotes[1].stepsFromBase, true);

      borrowedChords.push(parseChordSymbol(`${rootName}m7`));  // i m7   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${p2}m7b5`));      // ii∅7   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${b3}maj7`));      // bIII△  (Aeolian)
      borrowedChords.push(parseChordSymbol(`${p4}m7`));        // iv m7  (Aeolian)
      borrowedChords.push(parseChordSymbol(`${p5}m7`));        // v m7   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${b6}maj7`));      // bVI△   (Aeolian)
      borrowedChords.push(parseChordSymbol(`${b7}7`));         // bVII7  (Backdoor dominant — Aeolian/Mixolydian)

      // --- From parallel Dorian ---
      // Dorian adds the natural 6th: the characteristic II7 (Lydian/Dorian) and IV (natural)
      const dorianScale = parseScaleSymbol(`${rootName} dorian`);
      const dorianNotes = dorianScale.getNotes(1);
      const d6 = get12TETBaseName(dorianNotes[5].stepsFromBase); // natural 6th (differs from Aeolian b6)
      borrowedChords.push(parseChordSymbol(`${d6}m7`));          // vim7 from Dorian (natural 6th area)
      borrowedChords.push(parseChordSymbol(`${p4}7`));           // IV7  (Dorian characteristic)
    } else {
      // --- From parallel major ---
      const majorScale = parseScaleSymbol(`${rootName} major`);
      const majorNotes = majorScale.getNotes(1);
      const p4 = get12TETBaseName(majorNotes[3].stepsFromBase);
      const p5 = get12TETBaseName(majorNotes[4].stepsFromBase);
      const maj3 = get12TETBaseName(majorNotes[2].stepsFromBase); // natural 3rd (Picardy area)

      borrowedChords.push(parseChordSymbol(`${rootName}maj7`));  // I△  (Picardy third)
      borrowedChords.push(parseChordSymbol(`${maj3}7`));         // III7 (from parallel major — secondary dominant feel)
      borrowedChords.push(parseChordSymbol(`${p4}maj7`));        // IV△
      borrowedChords.push(parseChordSymbol(`${p5}7`));           // V7
    }
    
    return borrowedChords;
  }

  /**
   * Analyzes the cadence between two chords in a given key.
   */
  static analyzeCadence(chord1: Chord, chord2: Chord, keySymbol: string): string {
    const scale = parseScaleSymbol(keySymbol);
    const scaleNotes = scale.getNotes(1);
    const tonicStep = scaleNotes[0].stepsFromBase % 12;
    
    const c1Root = chord1.rootStep % 12;
    const c2Root = chord2.rootStep % 12;
    
    // Normalize to positive modulo
    const t = (tonicStep + 12) % 12;
    const r1 = (c1Root + 12) % 12;
    const r2 = (c2Root + 12) % 12;
    
    // A chord is dominant if it contains a minor 7th (10 semitones) but not a major 7th (11).
    // Checked against actual intervals to avoid false positives from chord names (dim7, maj9, etc.).
    const oct = chord1.tuningSystem.octaveSteps;
    const c1Pcs = chord1.intervalsInSteps.map(i => ((i % oct) + oct) % oct);
    const isC1Dominant = c1Pcs.includes(10) && !c1Pcs.includes(11);
    const isC2Tonic = r2 === t;
    const isC1Subdominant = r1 === (t + 5) % 12; // IV
    const isC1DominantRoot = r1 === (t + 7) % 12; // V
    
    if (isC1DominantRoot && isC2Tonic) {
      return 'Authentic Cadence (V -> I)';
    }
    if (isC1Subdominant && isC2Tonic) {
      return 'Plagal Cadence (IV -> I)';
    }
    if (isC1DominantRoot && r2 === (t + 9) % 12) { // V -> vi
      return 'Deceptive Cadence (V -> vi)';
    }
    if (isC2Tonic && r1 === (t + 10) % 12 && isC1Dominant) { // bVII7 -> I
      return 'Backdoor Cadence (bVII7 -> I)';
    }
    if (r2 === (t + 7) % 12) { // Ends on V
      return 'Half Cadence (-> V)';
    }
    
    // Check for tritone substitution resolution (subV7 -> I)
    if (isC1Dominant && r1 === (t + 1) % 12 && isC2Tonic) {
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
    const name = chord.name;
    const root = name.match(/^[A-G][#b]*/)?.[0] || 'C';

    const isMaj7 = name.includes('maj7') || name.includes('Δ');
    const isMin7 = name.includes('m7') && !name.includes('m7b5');
    const isDom7 = name.includes('7') && !isMaj7 && !isMin7 && !name.includes('dim');
    const isHalfDim = name.includes('m7b5') || name.includes('ø');
    const isDim = name.includes('dim') || name.includes('o');
    const isAug = name.includes('aug') || name.includes('+');

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
