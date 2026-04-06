export const CHORD_FORMULAS: Record<string, number[]> = {
  // Triads
  'M': [0, 4, 7],
  'm': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  
  // 6ths
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  '6/9': [0, 4, 7, 9, 14],

  // 7ths
  'maj7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  'mM7': [0, 3, 7, 11],
  'm(maj7)': [0, 3, 7, 11],
  'aug7': [0, 4, 8, 10],
  '7sus4': [0, 5, 7, 10],
  
  // Extensions (9ths, 11ths, 13ths)
  'maj9': [0, 4, 7, 11, 14],
  'm9': [0, 3, 7, 10, 14],
  '9': [0, 4, 7, 10, 14],
  'aug9': [0, 4, 8, 10, 14],
  '7b9': [0, 4, 7, 10, 13],
  '7#9': [0, 4, 7, 10, 15],
  '11': [0, 4, 7, 10, 14, 17],
  'maj11': [0, 4, 7, 11, 14, 17],
  'm11': [0, 3, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 21],
  'maj13': [0, 4, 7, 11, 14, 21],
  'm13': [0, 3, 7, 10, 14, 21],
  
  // Altered
  'alt': [0, 4, 10, 13, 15, 20], // Root, 3rd, b7, b9, #9, b13 (no 5th usually)
  '7#11': [0, 4, 7, 10, 18],
  
  // Aliases
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'dominant7': [0, 4, 7, 10],
  'half-diminished': [0, 3, 6, 10]
};

export const SCALE_PATTERNS: Record<string, number[]> = {
  // Diatonic Modes
  'ionian': [2, 2, 1, 2, 2, 2, 1], // Major
  'dorian': [2, 1, 2, 2, 2, 1, 2],
  'phrygian': [1, 2, 2, 2, 1, 2, 2],
  'lydian': [2, 2, 2, 1, 2, 2, 1],
  'mixolydian': [2, 2, 1, 2, 2, 1, 2],
  'aeolian': [2, 1, 2, 2, 1, 2, 2], // Natural Minor
  'locrian': [1, 2, 2, 1, 2, 2, 2],
  
  // Other common scales
  'harmonic minor': [2, 1, 2, 2, 1, 3, 1],
  'melodic minor': [2, 1, 2, 2, 2, 2, 1],
  'pentatonic major': [2, 2, 3, 2, 3],
  'pentatonic minor': [3, 2, 2, 3, 2],
  'blues': [3, 2, 1, 1, 3, 2],
  'whole tone': [2, 2, 2, 2, 2, 2],
  'chromatic': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  
  // Advanced / Jazz
  'altered': [1, 2, 1, 2, 2, 2, 2], // Super Locrian
  'half-whole diminished': [1, 2, 1, 2, 1, 2, 1, 2],
  'whole-half diminished': [2, 1, 2, 1, 2, 1, 2, 1],
  'lydian dominant': [2, 2, 2, 1, 2, 1, 2],

  // Exotic / World
  'hirajoshi': [2, 1, 4, 1, 4],
  'double harmonic': [1, 3, 1, 2, 1, 3, 1], // Arabic / Byzantine
  'enigmatic': [1, 3, 2, 2, 2, 1, 1],
  'neapolitan minor': [1, 2, 2, 2, 1, 3, 1],
  'neapolitan major': [1, 2, 2, 2, 2, 2, 1],
  'hungarian minor': [2, 1, 3, 1, 1, 3, 1],
  
  // Aliases
  'major': [2, 2, 1, 2, 2, 2, 1],
  'minor': [2, 1, 2, 2, 1, 2, 2]
};
