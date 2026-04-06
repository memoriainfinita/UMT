import { CHORD_FORMULAS, SCALE_PATTERNS } from './dictionaries';
import { TET12 } from './presets';
import { Chord } from './chord';
import { Scale } from './scale';
import { Note } from './note';
import { get12TETName } from './utils';

const NOTE_REGEX = /^([A-G])([#b]*)/;

/**
 * Converts a standard note name (e.g., "C#", "Bb") to steps from A4 in 12-TET.
 */
export function parseNoteToStep12TET(noteName: string, octave: number = 4): number {
  const baseNotes: Record<string, number> = { 'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2 };
  const match = noteName.match(NOTE_REGEX);
  
  if (!match) throw new Error(`Invalid note name: ${noteName}`);
  
  const [, note, accidentals] = match;
  let step = baseNotes[note];
  
  for (const acc of accidentals) {
    if (acc === '#') step += 1;
    if (acc === 'b') step -= 1;
  }
  
  // Adjust for octave (A4 is octave 4, step 0)
  step += (octave - 4) * 12;
  
  return step;
}

/**
 * Parses a standard chord symbol (e.g., "C#maj7", "D-7b5", "C/E") into a Chord object.
 */
export function parseChordSymbol(symbol: string, octave: number = 4): Chord {
  // Check for slash chord
  const [mainSymbol, bassSymbol] = symbol.split('/');
  
  // Extract root note and chord type
  const match = mainSymbol.match(/^([A-G][#b]*)(.*)$/);
  if (!match) throw new Error(`Invalid chord symbol: ${mainSymbol}`);
  
  const [, rootName, typeRaw] = match;
  let type = typeRaw.trim();
  
  // Handle common shorthand notations
  if (type === '') type = 'M';
  if (type === '-') type = 'm';
  if (type === '-7') type = 'm7';
  if (type === 'Δ') type = 'maj7';
  if (type === 'ø') type = 'm7b5';
  if (type === 'o' || type === '°') type = 'dim';
  if (type === 'o7' || type === '°7') type = 'dim7';
  if (type === '+') type = 'aug';

  const intervals = CHORD_FORMULAS[type];
  if (!intervals) throw new Error(`Unknown chord type: ${type}`);
  
  const rootStep = parseNoteToStep12TET(rootName, octave);
  
  let bassStep: number | undefined = undefined;
  if (bassSymbol) {
    bassStep = parseNoteToStep12TET(bassSymbol, octave);
  }
  
  return new Chord(symbol, TET12, rootStep, intervals, bassStep);
}

/**
 * Parses a scale symbol (e.g., "C# dorian", "Bb harmonic minor") into a Scale object.
 */
export function parseScaleSymbol(symbol: string, octave: number = 4): Scale {
  const match = symbol.match(/^([A-G][#b]*)\s+(.*)$/i);
  if (!match) throw new Error(`Invalid scale symbol: ${symbol}`);
  
  const [, rootName, typeRaw] = match;
  const type = typeRaw.trim().toLowerCase();
  
  const pattern = SCALE_PATTERNS[type];
  if (!pattern) throw new Error(`Unknown scale type: ${type}`);
  
  const rootStep = parseNoteToStep12TET(rootName, octave);
  return new Scale(symbol, TET12, rootStep, pattern);
}

/**
 * Parses a note string (e.g., "C4", "Bb3", "F#") into a Note object in 12-TET.
 */
export function parseNote(noteStr: string, defaultOctave: number = 4): Note {
  const match = noteStr.match(/^([A-G])([#b]*)(-?\d+)?$/i);
  if (!match) throw new Error(`Invalid note string: ${noteStr}`);
  
  const name = match[1].toUpperCase() + match[2].toLowerCase();
  const oct = match[3] ? parseInt(match[3], 10) : defaultOctave;
  
  const step = parseNoteToStep12TET(name, oct);
  return new Note(TET12, step);
}

const ROMAN_VALUES: Record<string, number> = {
  'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7
};

/**
 * Parses a Roman Numeral progression in a given key.
 * Example: parseRomanProgression("ii7 - V7/ii - subV7 - Imaj7", "C major")
 */
export function parseRomanProgression(progression: string, keySymbol: string, octave: number = 4): Chord[] {
  const keyScale = parseScaleSymbol(keySymbol, octave);
  const scaleNotes = keyScale.getNotes(2); // Get 2 octaves to be safe
  
  const tokens = progression.split(/[\s-]+/).filter(t => t.length > 0);
  
  return tokens.map(token => {
    // Check for applied chords (e.g., V7/ii)
    const parts = token.split('/');
    if (parts.length === 2) {
      const appliedRoman = parts[0];
      const targetRoman = parts[1];
      
      // 1. Find the root step of the target roman numeral in the main key
      const targetMatch = targetRoman.match(/^([b#]?)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/i);
      if (!targetMatch) throw new Error(`Invalid target Roman numeral: ${targetRoman}`);
      
      const [, tAcc, tRom] = targetMatch;
      const tDegree = ROMAN_VALUES[tRom.toLowerCase()];
      let targetRootStep = scaleNotes[tDegree - 1].stepsFromBase;
      if (tAcc === 'b') targetRootStep -= 1;
      if (tAcc === '#') targetRootStep += 1;
      
      // 2. Create a temporary major scale based on that target root
      const targetRootName = get12TETName(targetRootStep).replace(/\d+/, '');
      // Determine if target is minor based on roman numeral casing
      const isTargetMinor = tRom === tRom.toLowerCase();
      const tempKeyScale = parseScaleSymbol(`${targetRootName} ${isTargetMinor ? 'minor' : 'major'}`, octave);
      const tempScaleNotes = tempKeyScale.getNotes(2);
      
      // 3. Parse the applied roman numeral in that temporary key
      const appliedMatch = appliedRoman.match(/^(sub)?([b#]?)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/i);
      if (!appliedMatch) throw new Error(`Invalid applied Roman numeral: ${appliedRoman}`);
      
      const [, isSub, aAcc, aRom, aSuffixRaw] = appliedMatch;
      const aDegree = ROMAN_VALUES[aRom.toLowerCase()];
      const isMinor = aRom === aRom.toLowerCase();
      let aSuffix = aSuffixRaw.trim();
      
      if (aSuffix === '') aSuffix = isMinor ? 'm' : 'M';
      if (aSuffix === '7' && isMinor) aSuffix = 'm7';
      if (aSuffix === '7' && !isMinor && aDegree === 5) aSuffix = '7';
      if (aSuffix === '7' && !isMinor && aDegree !== 5) aSuffix = 'maj7';
      if (aSuffix === 'Δ') aSuffix = 'maj7';
      if (aSuffix === '-') aSuffix = 'm';
      if (aSuffix === '-7') aSuffix = 'm7';
      if (aSuffix === 'ø') aSuffix = 'm7b5';
      if (aSuffix === 'o' || aSuffix === '°') aSuffix = 'dim';
      if (aSuffix === '7alt') aSuffix = 'alt';
      
      const intervals = CHORD_FORMULAS[aSuffix] || CHORD_FORMULAS['M'];
      
      let rootStep = tempScaleNotes[aDegree - 1].stepsFromBase;
      if (aAcc === 'b') rootStep -= 1;
      if (aAcc === '#') rootStep += 1;
      
      if (isSub) {
        rootStep += 6; // Tritone substitution
      }
      
      const rootName = get12TETName(rootStep, true).replace(/\d+/, '');
      const chordName = `${rootName}${aSuffixRaw}`;
      
      return new Chord(chordName, TET12, rootStep, intervals);
    }
    
    // Normal parsing
    const match = token.match(/^(sub)?([b#]?)(IV|III|II|I|VII|VI|V|iv|iii|ii|i|vii|vi|v)(.*)$/i);
    if (!match) throw new Error(`Invalid Roman numeral: ${token}`);
    
    const [, isSub, accidental, roman, suffixRaw] = match;
    const degree = ROMAN_VALUES[roman.toLowerCase()];
    if (!degree) throw new Error(`Unknown Roman numeral: ${roman}`);
    
    const isMinor = roman === roman.toLowerCase();
    let suffix = suffixRaw.trim();
    
    // Infer default quality if no suffix is provided
    if (suffix === '') {
      suffix = isMinor ? 'm' : 'M';
    }
    
    // Handle shorthand
    if (suffix === '7' && isMinor) suffix = 'm7'; // "ii7" usually means m7
    if (suffix === '7' && !isMinor && degree === 5) suffix = '7'; // "V7" is dominant
    if (suffix === '7' && !isMinor && degree !== 5) suffix = 'maj7'; // "I7" usually means maj7 in jazz, though strictly it's dominant. Let's use maj7 for I and IV.
    
    // Map suffix back to our dictionary
    if (suffix === 'Δ') suffix = 'maj7';
    if (suffix === '-') suffix = 'm';
    if (suffix === '-7') suffix = 'm7';
    if (suffix === 'ø') suffix = 'm7b5';
    if (suffix === 'o' || suffix === '°') suffix = 'dim';
    if (suffix === '7alt') suffix = 'alt';
    
    const intervals = CHORD_FORMULAS[suffix] || CHORD_FORMULAS['M'];
    
    // Calculate root step
    let rootStep = scaleNotes[degree - 1].stepsFromBase;
    if (accidental === 'b') rootStep -= 1;
    if (accidental === '#') rootStep += 1;
    
    if (isSub) {
      rootStep += 6; // Tritone substitution
    }
    
    // Create a readable chord name like "Gmaj7"
    const preferFlats = !!isSub || accidental === 'b';
    const rootName = get12TETName(rootStep, preferFlats).replace(/\d+/, '');
    const chordName = `${rootName}${suffixRaw}`;
    
    return new Chord(chordName, TET12, rootStep, intervals);
  });
}
