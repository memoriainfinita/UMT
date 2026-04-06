import { Chord } from './chord';
import { parseScaleSymbol, parseChordSymbol, parseNoteToStep12TET } from './parser';
import { get12TETName } from './utils';
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
            issues.push({ type: 'Parallel 5th', voices: [i, j], message: `Quintas paralelas (Voces ${i+1} y ${j+1})` });
          }
          if (is8veA && is8veB && voiceIMoved && voiceJMoved) {
            issues.push({ type: 'Parallel Octave', voices: [i, j], message: `Octavas paralelas (Voces ${i+1} y ${j+1})` });
          }
        }

        if (chordB[i].stepsFromBase > chordB[j].stepsFromBase) {
          issues.push({ type: 'Voice Crossing', voices: [i, j], message: `Cruce: Voz ${i+1} supera a Voz ${j+1}` });
        }

        if (chordB[i].stepsFromBase > chordA[j].stepsFromBase) {
          issues.push({ type: 'Voice Overlap', voices: [i, j], message: `Superposición: Voz ${i+1} sube sobre Voz ${j+1} anterior` });
        }
        if (chordB[j].stepsFromBase < chordA[i].stepsFromBase) {
          issues.push({ type: 'Voice Overlap', voices: [i, j], message: `Superposición: Voz ${j+1} baja bajo Voz ${i+1} anterior` });
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
          const rootName = get12TETName(root, false).replace(/\d+/, '');
          let chordName = `${rootName}${suffix}`;

          if (root !== bassStep) {
            const bassName = get12TETName(bassStep, false).replace(/\d+/, '');
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
    const bestName = detectedNames[0] !== 'Acorde Desconocido' ? detectedNames[0] : `Negative of ${chord.name}`;

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
      // Borrow from parallel minor (Aeolian)
      const minorScale = parseScaleSymbol(`${rootName} minor`);
      const minorNotes = minorScale.getNotes(1);
      
      // Typical borrowed chords: iim7b5, ivm7, v7, bVImaj7, bVII7
      // Let's just construct them manually or via parser
      const b3 = get12TETName(minorNotes[2].stepsFromBase, true).replace(/\d+/, '');
      const b6 = get12TETName(minorNotes[5].stepsFromBase, true).replace(/\d+/, '');
      const b7 = get12TETName(minorNotes[6].stepsFromBase, true).replace(/\d+/, '');
      const p4 = get12TETName(minorNotes[3].stepsFromBase, true).replace(/\d+/, '');
      const p5 = get12TETName(minorNotes[4].stepsFromBase, true).replace(/\d+/, '');
      const p2 = get12TETName(minorNotes[1].stepsFromBase, true).replace(/\d+/, '');

      borrowedChords.push(parseChordSymbol(`${rootName}m7`)); // i m7
      borrowedChords.push(parseChordSymbol(`${p2}m7b5`)); // ii m7b5
      borrowedChords.push(parseChordSymbol(`${b3}maj7`)); // bIII maj7
      borrowedChords.push(parseChordSymbol(`${p4}m7`)); // iv m7
      borrowedChords.push(parseChordSymbol(`${p5}m7`)); // v m7
      borrowedChords.push(parseChordSymbol(`${b6}maj7`)); // bVI maj7
      borrowedChords.push(parseChordSymbol(`${b7}7`)); // bVII 7 (Backdoor dominant)
    } else {
      // Borrow from parallel major
      const majorScale = parseScaleSymbol(`${rootName} major`);
      const majorNotes = majorScale.getNotes(1);
      const p4 = get12TETName(majorNotes[3].stepsFromBase).replace(/\d+/, '');
      const p5 = get12TETName(majorNotes[4].stepsFromBase).replace(/\d+/, '');
      
      borrowedChords.push(parseChordSymbol(`${rootName}maj7`)); // I maj7 (Picardy third)
      borrowedChords.push(parseChordSymbol(`${p4}maj7`)); // IV maj7
      borrowedChords.push(parseChordSymbol(`${p5}7`)); // V 7
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
    
    const isC1Dominant = chord1.name.includes('7') && !chord1.name.includes('maj7') && !chord1.name.includes('m7');
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
  static getSuggestedScales(chord: Chord, nextChord?: Chord, ruleset: 'berklee' | 'classical' | 'modal' = 'berklee'): string[] {
    const name = chord.name;
    const root = name.match(/^[A-G][#b]*/)?.[0] || 'C';
    
    const isMaj7 = name.includes('maj7') || name.includes('Δ');
    const isMin7 = name.includes('m7') && !name.includes('m7b5');
    const isDom7 = name.includes('7') && !isMaj7 && !isMin7 && !name.includes('dim');
    const isHalfDim = name.includes('m7b5') || name.includes('ø');
    const isDim = name.includes('dim') || name.includes('o');
    const isAug = name.includes('aug') || name.includes('+');
    
    if (ruleset === 'classical') {
      // Classical pedagogy usually just sticks to the key
      if (isMaj7) return [`${root} Major`];
      if (isMin7) return [`${root} Minor`];
      if (isDom7) return [`${root} Mixolydian`];
      if (isDim) return [`${root} Diminished`];
      return [`${root} Major`, `${root} Minor`];
    }

    if (ruleset === 'modal') {
      // Modal pedagogy focuses on modes of the major scale
      if (isMaj7) return [`${root} Ionian`, `${root} Lydian`];
      if (isMin7) return [`${root} Dorian`, `${root} Phrygian`, `${root} Aeolian`];
      if (isDom7) return [`${root} Mixolydian`];
      if (isHalfDim) return [`${root} Locrian`];
    }

    // Default: 'berklee' (Jazz Chord-Scale Theory)
    if (isMaj7) {
      return [`${root} Ionian (Major)`, `${root} Lydian (if IV chord)`];
    }
    
    if (isMin7) {
      return [`${root} Dorian (standard ii)`, `${root} Aeolian (Natural Minor)`, `${root} Phrygian`];
    }
    
    if (isDom7) {
      const suggestions = [`${root} Mixolydian (standard V)`];
      
      if (nextChord) {
        const r1 = chord.rootStep % 12;
        const r2 = nextChord.rootStep % 12;
        const distance = ((r2 - r1) + 12) % 12;
        
        // Resolving down a perfect fifth (V -> I)
        if (distance === 5) {
          const isNextMinor = nextChord.name.includes('m');
          if (isNextMinor) {
            suggestions.push(`${root} Altered Scale (Super Locrian)`);
            suggestions.push(`${root} Mixolydian b9 b13`);
          } else {
            suggestions.push(`${root} Lydian Dominant (if tritone sub)`);
            suggestions.push(`${root} Half-Whole Diminished`);
          }
        }
        // Resolving down a half step (Tritone sub)
        else if (distance === 11) {
          suggestions.push(`${root} Lydian Dominant`);
        }
      } else {
        suggestions.push(`${root} Lydian Dominant`);
        suggestions.push(`${root} Altered Scale`);
      }
      return suggestions;
    }
    
    if (isHalfDim) {
      return [`${root} Locrian`, `${root} Locrian #2 (Jazz standard)`];
    }
    
    if (isDim) {
      return [`${root} Whole-Half Diminished`];
    }
    
    if (isAug) {
      return [`${root} Whole Tone`];
    }
    
    return [`${root} Major`, `${root} Minor`];
  }
}
