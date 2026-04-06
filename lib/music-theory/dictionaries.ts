/**
 * CHORD_FORMULAS — intervals in 12-TET semitones from root (0 = root, 7 = P5, etc.)
 * Parser maps these to any target tuning via getStepFromStandard().
 * Canonical keys are used in chord naming and detection; aliases section maps
 * common alternate notations to the same formula.
 */
export const CHORD_FORMULAS: Record<string, readonly number[]> = {

  // ── Dyads ────────────────────────────────────────────────────────────────
  '5':          [0, 7],                   // Power chord (no 3rd)

  // ── Triads ───────────────────────────────────────────────────────────────
  'M':          [0, 4, 7],
  'm':          [0, 3, 7],
  'dim':        [0, 3, 6],
  'aug':        [0, 4, 8],
  'sus2':       [0, 2, 7],
  'sus4':       [0, 5, 7],

  // ── Add chords (triad + extension, no 7th) ───────────────────────────────
  'add9':       [0, 4, 7, 14],
  'madd9':      [0, 3, 7, 14],
  'add11':      [0, 4, 7, 17],
  'add#11':     [0, 4, 7, 18],

  // ── Sixth chords ─────────────────────────────────────────────────────────
  '6':          [0, 4, 7, 9],
  'm6':         [0, 3, 7, 9],
  '6/9':        [0, 4, 7, 9, 14],
  'm6/9':       [0, 3, 7, 9, 14],

  // ── Seventh chords ───────────────────────────────────────────────────────
  'maj7':       [0, 4, 7, 11],
  'm7':         [0, 3, 7, 10],
  '7':          [0, 4, 7, 10],
  'dim7':       [0, 3, 6, 9],
  'm7b5':       [0, 3, 6, 10],           // Half-diminished
  'mM7':        [0, 3, 7, 11],           // Minor-major 7th
  'aug7':       [0, 4, 8, 10],           // Augmented dominant 7th (= 7#5)
  'augM7':      [0, 4, 8, 11],           // Augmented major 7th (aug triad + maj7)
  '7sus4':      [0, 5, 7, 10],
  'dimM7':      [0, 3, 6, 11],           // Diminished triad + major 7th

  // ── Dominant altered / non-functional ────────────────────────────────────
  '7b5':        [0, 4, 6, 10],
  '7#5':        [0, 4, 8, 10],           // Same as aug7; common jazz notation
  '7sus2':      [0, 2, 7, 10],           // Dominant 7th suspended 2nd
  '7b9':        [0, 4, 7, 10, 13],
  '7#9':        [0, 4, 7, 10, 15],       // Hendrix chord
  '7b9#9':      [0, 4, 7, 10, 13, 15],
  '7b13':       [0, 4, 7, 10, 20],
  '7#11':       [0, 4, 7, 10, 18],       // Lydian dominant (no 9th)
  'alt':        [0, 4, 10, 13, 15, 20],  // 7alt: M3, m7, b9, #9, b13 (no 5th)

  // ── Ninth chords ─────────────────────────────────────────────────────────
  'maj9':       [0, 4, 7, 11, 14],
  'm9':         [0, 3, 7, 10, 14],
  '9':          [0, 4, 7, 10, 14],
  'mM9':        [0, 3, 7, 11, 14],       // Minor-major 9th
  'aug9':       [0, 4, 8, 10, 14],
  '9sus4':      [0, 5, 7, 10, 14],
  '9b5':        [0, 4, 6, 10, 14],
  '9#11':       [0, 4, 7, 10, 14, 18],   // Lydian dominant with 9th

  // ── Eleventh chords ──────────────────────────────────────────────────────
  '11':         [0, 4, 7, 10, 14, 17],
  'maj11':      [0, 4, 7, 11, 14, 17],
  'm11':        [0, 3, 7, 10, 14, 17],
  'm11b5':      [0, 3, 6, 10, 14, 17],   // Half-diminished 11th
  'maj7#11':    [0, 4, 7, 11, 18],       // Lydian chord (no 9th)
  'maj9#11':    [0, 4, 7, 11, 14, 18],   // Lydian chord with 9th

  // ── Thirteenth chords ────────────────────────────────────────────────────
  '13':         [0, 4, 7, 10, 14, 21],
  'maj13':      [0, 4, 7, 11, 14, 21],
  'm13':        [0, 3, 7, 10, 14, 21],
  '13sus4':     [0, 5, 7, 10, 14, 21],
  '13b9':       [0, 4, 7, 10, 13, 21],   // Dominant 13th with b9
  '13#11':      [0, 4, 7, 10, 14, 18, 21], // Lydian dominant 13th (full)

  // ── Aliases ──────────────────────────────────────────────────────────────
  'major':            [0, 4, 7],
  'minor':            [0, 3, 7],
  'dominant7':        [0, 4, 7, 10],
  'half-diminished':  [0, 3, 6, 10],
  'm(maj7)':          [0, 3, 7, 11],     // = mM7
  'aug(maj7)':        [0, 4, 8, 11],     // = augM7
};


/**
 * SCALE_PATTERNS — step intervals in 12-TET semitones (e.g., [2,2,1,2,2,2,1] for Major).
 * All patterns must sum to 12 (one octave). Steps are mapped to any target tuning
 * via getStepFromStandard() in parser functions.
 *
 * Modes are grouped under their parent scale for legibility.
 */
export const SCALE_PATTERNS: Record<string, readonly number[]> = {

  // ── Diatonic modes (major system) ─────────────────────────────────────────
  'ionian':           [2, 2, 1, 2, 2, 2, 1],   // Mode 1 — Major
  'dorian':           [2, 1, 2, 2, 2, 1, 2],   // Mode 2
  'phrygian':         [1, 2, 2, 2, 1, 2, 2],   // Mode 3
  'lydian':           [2, 2, 2, 1, 2, 2, 1],   // Mode 4
  'mixolydian':       [2, 2, 1, 2, 2, 1, 2],   // Mode 5
  'aeolian':          [2, 1, 2, 2, 1, 2, 2],   // Mode 6 — Natural Minor
  'locrian':          [1, 2, 2, 1, 2, 2, 2],   // Mode 7

  // ── Harmonic Minor and its modes ─────────────────────────────────────────
  'harmonic minor':       [2, 1, 2, 2, 1, 3, 1],  // Mode 1
  'locrian #6':           [1, 2, 2, 1, 3, 1, 2],  // Mode 2
  'ionian #5':            [2, 2, 1, 3, 1, 2, 1],  // Mode 3 (Ionian Augmented)
  'dorian #4':            [2, 1, 3, 1, 2, 1, 2],  // Mode 4 (Ukrainian Dorian / Romanian)
  'phrygian dominant':    [1, 3, 1, 2, 1, 2, 2],  // Mode 5 (Flamenco / Spanish / Freygish)
  'lydian #2':            [3, 1, 2, 1, 2, 2, 1],  // Mode 6
  'super locrian bb7':    [1, 2, 1, 2, 2, 1, 3],  // Mode 7 (Diminished Altered)

  // ── Harmonic Major ────────────────────────────────────────────────────────
  'harmonic major':       [2, 2, 1, 2, 1, 3, 1],  // Mode 1 (used in jazz/late romantic)

  // ── Melodic Minor and its modes (ascending form) ─────────────────────────
  'melodic minor':        [2, 1, 2, 2, 2, 2, 1],  // Mode 1 (Jazz Minor)
  'dorian b2':            [1, 2, 2, 2, 2, 1, 2],  // Mode 2 (Phrygian #6)
  'lydian augmented':     [2, 2, 2, 2, 1, 2, 1],  // Mode 3
  'lydian dominant':      [2, 2, 2, 1, 2, 1, 2],  // Mode 4 (Overtone / Acoustic)
  'mixolydian b6':        [2, 2, 1, 2, 1, 2, 2],  // Mode 5 (Hindu / Descending Melodic Minor)
  'locrian #2':           [2, 1, 2, 1, 2, 2, 2],  // Mode 6 (Aeolian b5 — standard for m7b5)
  'altered':              [1, 2, 1, 2, 2, 2, 2],  // Mode 7 (Super Locrian — altered dominant)

  // ── Symmetric scales ─────────────────────────────────────────────────────
  'whole tone':               [2, 2, 2, 2, 2, 2],
  'augmented':                [3, 1, 3, 1, 3, 1],         // Hexatonic symmetric (Messiaen mode 3 related)
  'chromatic':                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'whole-half diminished':    [2, 1, 2, 1, 2, 1, 2, 1],  // Octatonic (starts W)
  'half-whole diminished':    [1, 2, 1, 2, 1, 2, 1, 2],  // Octatonic (starts H, dominant)

  // ── Pentatonic / Hexatonic / Blues ────────────────────────────────────────
  'pentatonic major':     [2, 2, 3, 2, 3],
  'pentatonic minor':     [3, 2, 2, 3, 2],
  'blues':                [3, 2, 1, 1, 3, 2],   // Minor blues (hexatonic)
  'blues major':          [2, 1, 1, 3, 2, 3],   // Major blues / Country blues

  // ── Bebop scales (8-note) ─────────────────────────────────────────────────
  'bebop dominant':   [2, 2, 1, 2, 2, 1, 1, 1], // Mixolydian + chromatic passing b7→root
  'bebop major':      [2, 2, 1, 2, 1, 1, 1, 2], // Major + chromatic passing #5→6
  'bebop dorian':     [2, 1, 1, 1, 2, 2, 1, 2], // Dorian + chromatic passing b3→3

  // ── Exotic / World ────────────────────────────────────────────────────────
  'double harmonic':      [1, 3, 1, 2, 1, 3, 1], // Arabic / Byzantine / Gypsy Major
  'hungarian minor':      [2, 1, 3, 1, 1, 3, 1], // Gypsy Minor
  'neapolitan minor':     [1, 2, 2, 2, 1, 3, 1],
  'neapolitan major':     [1, 2, 2, 2, 2, 2, 1],
  'enigmatic':            [1, 3, 2, 2, 2, 1, 1],
  'persian':              [1, 3, 1, 1, 2, 3, 1],
  'prometheus':           [2, 2, 2, 3, 1, 2],    // Scriabin (hexatonic)
  'hirajoshi':            [2, 1, 4, 1, 4],        // Japanese koto
  'kumoi':                [2, 1, 4, 2, 3],        // Japanese koto (minor pentatonic variant)
  'pelog':                [1, 2, 3, 1, 5],        // Javanese gamelan (Western approximation)
  'balinese':             [1, 2, 4, 1, 4],        // Balinese gamelan (pelog subset)
  'in':                   [1, 4, 2, 1, 4],        // Japanese (Miyako-bushi)
  'iwato':                [1, 4, 1, 4, 2],        // Japanese (temple bells)
  'yo':                   [2, 3, 2, 2, 3],        // Japanese pentatonic (no semitones)
  'chinese':              [4, 2, 1, 4, 1],        // Chinese pentatonic (Gong scale)
  'egyptian':             [2, 3, 2, 3, 2],        // Egyptian / Suspended pentatonic

  // ── Aliases ───────────────────────────────────────────────────────────────
  'major':                [2, 2, 1, 2, 2, 2, 1],  // = ionian
  'minor':                [2, 1, 2, 2, 1, 2, 2],  // = aeolian
  'natural minor':        [2, 1, 2, 2, 1, 2, 2],  // = aeolian
  'jazz minor':           [2, 1, 2, 2, 2, 2, 1],  // = melodic minor
  'acoustic':             [2, 2, 2, 1, 2, 1, 2],  // = lydian dominant
  'super locrian':        [1, 2, 1, 2, 2, 2, 2],  // = altered
  'spanish':              [1, 3, 1, 2, 1, 2, 2],  // = phrygian dominant
  'flamenco':             [1, 3, 1, 2, 1, 2, 2],  // = phrygian dominant
  'freygish':             [1, 3, 1, 2, 1, 2, 2],  // = phrygian dominant (klezmer)
  'hindu':                [2, 2, 1, 2, 1, 2, 2],  // = mixolydian b6
  'romanian minor':       [2, 1, 3, 1, 2, 1, 2],  // = dorian #4
  'byzantine':            [1, 3, 1, 2, 1, 3, 1],  // = double harmonic
  'gypsy major':          [1, 3, 1, 2, 1, 3, 1],  // = double harmonic
  'gypsy minor':          [2, 1, 3, 1, 1, 3, 1],  // = hungarian minor
};
