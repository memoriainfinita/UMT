/**
 * CHORD_FORMULAS - intervals in 12-TET semitones from root (0 = root, 7 = P5, etc.)
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
 * SCALE_PATTERNS - step intervals in 12-TET semitones (e.g., [2,2,1,2,2,2,1] for Major).
 * All patterns must sum to 12 (one octave). Steps are mapped to any target tuning
 * via getStepFromStandard() in parser functions.
 *
 * Modes are grouped under their parent scale for legibility.
 */
export const SCALE_PATTERNS: Record<string, readonly number[]> = {

  // ── Diatonic modes (major system) ─────────────────────────────────────────
  'ionian':           [2, 2, 1, 2, 2, 2, 1],   // Mode 1 - Major
  'dorian':           [2, 1, 2, 2, 2, 1, 2],   // Mode 2
  'phrygian':         [1, 2, 2, 2, 1, 2, 2],   // Mode 3
  'lydian':           [2, 2, 2, 1, 2, 2, 1],   // Mode 4
  'mixolydian':       [2, 2, 1, 2, 2, 1, 2],   // Mode 5
  'aeolian':          [2, 1, 2, 2, 1, 2, 2],   // Mode 6 - Natural Minor
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
  'locrian #2':           [2, 1, 2, 1, 2, 2, 2],  // Mode 6 (Aeolian b5 - standard for m7b5)
  'altered':              [1, 2, 1, 2, 2, 2, 2],  // Mode 7 (Super Locrian - altered dominant)

  // ── Symmetric scales ─────────────────────────────────────────────────────
  'whole tone':               [2, 2, 2, 2, 2, 2],           // Messiaen mode 1 - whole tone
  'augmented':                [3, 1, 3, 1, 3, 1],           // Messiaen mode 3 (related)
  'chromatic':                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'whole-half diminished':    [2, 1, 2, 1, 2, 1, 2, 1],    // Octatonic / Messiaen mode 2 (starts W)
  'half-whole diminished':    [1, 2, 1, 2, 1, 2, 1, 2],    // Octatonic / Messiaen mode 2 (starts H)
  // Messiaen modes of limited transposition (modes 4–7)
  'messiaen-4':    [1, 1, 3, 1, 1, 1, 3, 1],               // Mode 4 - 3 transpositions
  'messiaen-5':    [1, 4, 1, 1, 4, 1],                     // Mode 5 - 3 transpositions
  'messiaen-6':    [2, 2, 1, 1, 2, 2, 1, 1],               // Mode 6 - 6 transpositions
  'messiaen-7':    [1, 1, 1, 2, 1, 1, 1, 1, 2, 1],         // Mode 7 - 6 transpositions

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

  // ── Ancient Greek modes (differ from medieval church modes) ─────────────────
  // NOTE: Greek modes are defined descending from their characteristic tetrachord.
  // These are ascending Western 12-TET approximations for reference only.
  // Greek Dorian ≠ medieval Dorian; Greek Phrygian ≠ medieval Phrygian, etc.
  'greek-dorian':       [2, 1, 2, 2, 2, 1, 2],  // = medieval Phrygian (E mode)
  'greek-phrygian':     [1, 2, 2, 2, 1, 2, 2],  // = medieval Dorian (D mode) [descending: W H W W W H W]
  'greek-lydian':       [2, 2, 2, 1, 2, 2, 1],  // = medieval Mixolydian (G mode)
  'greek-mixolydian':   [2, 2, 1, 2, 2, 1, 2],  // = medieval Aeolian (A mode)
  'greek-hypodorian':   [2, 1, 2, 2, 1, 2, 2],  // = medieval Aeolian (plagal Dorian)
  'greek-hypophrygian': [1, 2, 2, 1, 2, 2, 2],  // plagal Phrygian
  'greek-hypolydian':   [2, 2, 1, 2, 2, 2, 1],  // = medieval Ionian (plagal Lydian)
  'greek-hypomixolydian':[2, 1, 2, 2, 2, 1, 2], // = plagal Mixolydian

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


/**
 * MODAL_DEGREE_QUALITIES - chord qualities per scale degree for each classical mode.
 *
 * `triads[i]` is the triad quality on degree i+1; `sevenths[i]` is the seventh-chord
 * quality on degree i+1. Values are suffixes compatible with `CHORD_FORMULAS`
 * (empty string = major triad; 'M' would be redundant).
 *
 * Verified against `Scale.getDiatonicChords` for each mode rooted at C.
 */
export interface ModalDegreeQualities {
  readonly triads: readonly string[];
  readonly sevenths: readonly string[];
}

export const MODAL_DEGREE_QUALITIES: Readonly<Record<string, ModalDegreeQualities>> = Object.freeze({
  // ── Diatonic (major system) ──
  'ionian':     Object.freeze({ triads: ['', 'm', 'm', '', '', 'm', 'dim'],     sevenths: ['maj7','m7','m7','maj7','7','m7','m7b5'] }),
  'dorian':     Object.freeze({ triads: ['m', 'm', '', '', 'm', 'dim', ''],     sevenths: ['m7','m7','maj7','7','m7','m7b5','maj7'] }),
  'phrygian':   Object.freeze({ triads: ['m', '', '', 'm', 'dim', '', 'm'],     sevenths: ['m7','maj7','7','m7','m7b5','maj7','m7'] }),
  'lydian':     Object.freeze({ triads: ['', '', 'm', 'dim', '', 'm', 'm'],     sevenths: ['maj7','7','m7','m7b5','maj7','m7','m7'] }),
  'mixolydian': Object.freeze({ triads: ['', 'm', 'dim', '', 'm', 'm', ''],     sevenths: ['7','m7','m7b5','maj7','m7','m7','maj7'] }),
  'aeolian':    Object.freeze({ triads: ['m', 'dim', '', 'm', 'm', '', ''],     sevenths: ['m7','m7b5','maj7','m7','m7','maj7','7'] }),
  'locrian':    Object.freeze({ triads: ['dim', '', 'm', 'm', '', '', 'm'],     sevenths: ['m7b5','maj7','m7','m7','maj7','7','m7'] }),

  // ── Harmonic Minor ──
  'harmonic minor': Object.freeze({
    triads:   ['m', 'dim', 'aug', 'm', '', '', 'dim'],
    sevenths: ['mM7', 'm7b5', 'augM7', 'm7', '7', 'maj7', 'dim7'],
  }),

  // ── Melodic Minor (ascending / jazz minor) ──
  'melodic minor': Object.freeze({
    triads:   ['m', 'm', 'aug', '', '', 'dim', 'dim'],
    sevenths: ['mM7', 'm7', 'augM7', '7', '7', 'm7b5', 'm7b5'],
  }),

  // ── Aliases ──
  'major':        Object.freeze({ triads: ['', 'm', 'm', '', '', 'm', 'dim'],     sevenths: ['maj7','m7','m7','maj7','7','m7','m7b5'] }),
  'minor':        Object.freeze({ triads: ['m', 'dim', '', 'm', 'm', '', ''],     sevenths: ['m7','m7b5','maj7','m7','m7','maj7','7'] }),
  'natural minor':Object.freeze({ triads: ['m', 'dim', '', 'm', 'm', '', ''],     sevenths: ['m7','m7b5','maj7','m7','m7','maj7','7'] }),
  'jazz minor':   Object.freeze({ triads: ['m', 'm', 'aug', '', '', 'dim', 'dim'],sevenths: ['mM7','m7','augM7','7','7','m7b5','m7b5'] }),
});


/**
 * MODE_PARENT_FAMILY - for each mode, the family it belongs to and its 1-indexed
 * position within that family. Enables `Scale.getParentScale()` and
 * `Scale.getRelativeMode()` navigation within classical modal systems.
 */
export interface ModeParent {
  readonly family: string;       // parent scale type (e.g. 'major', 'harmonic minor')
  readonly degree: number;       // 1-indexed degree within the family
  readonly familyModes: readonly string[];  // modes in order, for relative-mode lookup
}

const MAJOR_FAMILY = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
const HARMONIC_MINOR_FAMILY = ['harmonic minor', 'locrian #6', 'ionian #5', 'dorian #4', 'phrygian dominant', 'lydian #2', 'super locrian bb7'];
const MELODIC_MINOR_FAMILY = ['melodic minor', 'dorian b2', 'lydian augmented', 'lydian dominant', 'mixolydian b6', 'locrian #2', 'altered'];

export const MODE_PARENT_FAMILY: Readonly<Record<string, ModeParent>> = Object.freeze({
  // Major family
  'ionian':     Object.freeze({ family: 'major', degree: 1, familyModes: MAJOR_FAMILY }),
  'dorian':     Object.freeze({ family: 'major', degree: 2, familyModes: MAJOR_FAMILY }),
  'phrygian':   Object.freeze({ family: 'major', degree: 3, familyModes: MAJOR_FAMILY }),
  'lydian':     Object.freeze({ family: 'major', degree: 4, familyModes: MAJOR_FAMILY }),
  'mixolydian': Object.freeze({ family: 'major', degree: 5, familyModes: MAJOR_FAMILY }),
  'aeolian':    Object.freeze({ family: 'major', degree: 6, familyModes: MAJOR_FAMILY }),
  'locrian':    Object.freeze({ family: 'major', degree: 7, familyModes: MAJOR_FAMILY }),
  'major':      Object.freeze({ family: 'major', degree: 1, familyModes: MAJOR_FAMILY }),
  'minor':      Object.freeze({ family: 'major', degree: 6, familyModes: MAJOR_FAMILY }),
  'natural minor': Object.freeze({ family: 'major', degree: 6, familyModes: MAJOR_FAMILY }),

  // Harmonic minor family
  'harmonic minor':    Object.freeze({ family: 'harmonic minor', degree: 1, familyModes: HARMONIC_MINOR_FAMILY }),
  'locrian #6':        Object.freeze({ family: 'harmonic minor', degree: 2, familyModes: HARMONIC_MINOR_FAMILY }),
  'ionian #5':         Object.freeze({ family: 'harmonic minor', degree: 3, familyModes: HARMONIC_MINOR_FAMILY }),
  'dorian #4':         Object.freeze({ family: 'harmonic minor', degree: 4, familyModes: HARMONIC_MINOR_FAMILY }),
  'phrygian dominant': Object.freeze({ family: 'harmonic minor', degree: 5, familyModes: HARMONIC_MINOR_FAMILY }),
  'lydian #2':         Object.freeze({ family: 'harmonic minor', degree: 6, familyModes: HARMONIC_MINOR_FAMILY }),
  'super locrian bb7': Object.freeze({ family: 'harmonic minor', degree: 7, familyModes: HARMONIC_MINOR_FAMILY }),

  // Melodic minor family
  'melodic minor':    Object.freeze({ family: 'melodic minor', degree: 1, familyModes: MELODIC_MINOR_FAMILY }),
  'jazz minor':       Object.freeze({ family: 'melodic minor', degree: 1, familyModes: MELODIC_MINOR_FAMILY }),
  'dorian b2':        Object.freeze({ family: 'melodic minor', degree: 2, familyModes: MELODIC_MINOR_FAMILY }),
  'lydian augmented': Object.freeze({ family: 'melodic minor', degree: 3, familyModes: MELODIC_MINOR_FAMILY }),
  'lydian dominant':  Object.freeze({ family: 'melodic minor', degree: 4, familyModes: MELODIC_MINOR_FAMILY }),
  'mixolydian b6':    Object.freeze({ family: 'melodic minor', degree: 5, familyModes: MELODIC_MINOR_FAMILY }),
  'locrian #2':       Object.freeze({ family: 'melodic minor', degree: 6, familyModes: MELODIC_MINOR_FAMILY }),
  'altered':          Object.freeze({ family: 'melodic minor', degree: 7, familyModes: MELODIC_MINOR_FAMILY }),
});


/**
 * MODE_BRIGHTNESS - ordering of diatonic modes by sharpness relative to the parent major.
 * Lydian (+1 raised degree) brightest; Locrian (5 flat degrees vs major) darkest.
 * Values are integers: positive = brighter than Ionian, negative = darker.
 */
export const MODE_BRIGHTNESS: Readonly<Record<string, number>> = Object.freeze({
  'lydian':      1,
  'ionian':      0,
  'major':       0,
  'mixolydian': -1,
  'dorian':     -2,
  'aeolian':    -3,
  'minor':      -3,
  'natural minor': -3,
  'phrygian':   -4,
  'locrian':    -5,
});
