# Changelog

Versions are git tags. Pin one (`github:memoriainfinita/UMT#v0.8.0` in `package.json`, `@v0.8.0` on jsDelivr); `main` may change.

## 0.8.0 - 2026-10-20

Movable do, requested by MODUS. No breaking changes.

### Added

- `Solfege.movableDo(note, key, { syllables: 'ti' })`: tonic sol-fa and Kodály syllables, ti on the seventh and the chromatic degrees by the note's letter: di ri fi si li raised, ra me se le te lowered (C# in C major is "di", Db "ra", G# in A minor "si"). An alteration the system has no syllable for (Cb, E# in C major) gives `'?'`. The default, `'si'`, stays Latin and diatonic
- `Solfege.fromSolfege(…, 'movable', { syllables })` reads "ti" and the chromatic syllables; "si" is the seventh by default and the raised fifth with `'ti'`

### Fixed

- `movableDo` and `fromSolfege` take the tonic in lower case: `'c major'` threw "Invalid note name: c"

## 0.7.1 - 2026-10-19

Slash chords, reported from MODUS.

### Fixed

- `Harmony.analyzeSlash` read the upper structure with the bass inside it: D/C gave `D7/C`, C/D `Cadd9/D`, E/C `CaugM7`, Gb/C `Gbadd#11/C`. Now `D`, `C`, `E`, `Gb`. E/C read as a polychord because the chord found was rooted on the bass; it still is one, now for its own root (E over C)

### Added

- `Harmony.analyzeSlash(notes)`: played notes, lowest first or in any order. The lowest is the bass and the notes above it, without its pitch class, are read as a chord over it: C3 D4 F#4 A4 is D over C (`'upper-structure'`, 9 #11 13), where `detectChordsScored` gives only `D7/C`. All the notes are read as one chord when they are a triad, sixth or seventh on the bass (C3 E4 G4 B4 is Cmaj7, not Em over C) or when the notes above make no chord of three pitch classes (E3 C4 G4 is C/E)

## 0.7.0 - 2026-10-13

Other tunings answer as 12-TET does, or not at all. A battery runs every analysis in Werckmeister III, 5-limit JI, 19-, 24-, 31- and 53-EDO and Ptolemy's 7-note JI against its 12-TET answer (`tests/unit/tuning-conformance.test.ts`). Nothing changes in 12-TET: MODUS (380 tests) and notae pass unchanged.

### Breaking changes

Only outside 12-TET.

- The parsers place each note on the tuning's step for that note. They measured intervals from A4, which in an unequal tuning put notes off their own steps: Dm in Ptolemy's JI had an F#
- The parsers refuse a symbol whose notes the tuning lacks, with a `RangeError`, instead of moving them: `parseScaleSymbol('C major', PtolemaicJI)` gave the seven notes of A major (the tuning is A B C# D E F# G#)
- Note names: a step that stands for a 12-TET note (`TuningSystem.getStandardStep`) is named, in sharps or by the note's flat/sharp preference: `'C4'` for step -23 of 31-EDO, every step of Werckmeister III and 5-limit JI. They were `'Step n'`. Steps that stand for none (24-EDO quarter tones) keep `'Step n'`; `EDO.getNoteName` is the inherited `TuningSystem.getNoteName`
- Wrong answers that are now right: P, L and R named their chords as if steps were semitones (`P(C)` in 31-EDO was A#m); `analyzeProgression` read ii7 V7 Imaj7 as II V I and found no modulation; `getDiatonicChords` named chords `'C4(0,10,18,28)'`; `detectSequence` and `classifyModulation` measured steps as semitones; `getSuggestedScales` gave E ionian for E7 in Ptolemy's JI; `Solfege.fixedDo` called G of 19-EDO fa#
- Functions that gave nothing now answer as in 12-TET: `detectChords`, `detectChordsScored`, `analyzeVoicing`, `getTritoneSubstitution`, `getNegativeHarmony`, `getSubstitutions`, `getUpperStructures`, `getBorrowedChords`, `getAllContainingScales`, `getColtraneSubstitutions`, `analyzeSlash`, `respellNote`, `respellChord`, `spellChord`, `spellChordInKey`, `Solfege.movableDo`, the modal methods of `Scale`. Lists leave out the chords and scales the tuning cannot hold

### Added

- `TuningSystem.getStandardStep(step)`: the 12-TET note a step stands for, or `null`; `retuneStep(step, target)`
- `Chord.retune(tuning)`, `Scale.retune(tuning)`, `Note.retune(tuning)`: the same material in another tuning, or `null`
- Guide: [Other tunings](GUIDE.md#other-tunings)

## 0.6.0 - 2026-10-12

Readings reported from MODUS on the progressions of `PROGRESSIONS`.

### Breaking changes

- `NeoRiemannian.getTriadType`, `P`, `L` and `R` return `null` for anything but a major or minor triad (root, third and perfect fifth, in any inversion or doubling). G7, Cmaj7, Cadd9 and C7#9 passed as triads: `P(G7)` was Gm
- `Harmony.analyzeProgression`: a passage whose foreign chords are all secondary dominants of the current key, followed by a return to that key, is a tonicization, not a modulation. The turnaround G7 Cm7 F7 Bb7 in Bb major (VI7 ii7 V7 I7) no longer modulates to C minor
- `Harmony.analyzeCadence`: the authentic and deceptive cadences need the leading tone in the dominant chord; v → I (Fm7 → Bb7 in Bb) is no cadence

### Added

- `analyzeProgression(…, { style: 'blues' })`: dominant sevenths on I, IV and V belong to the key (I7, IV7, V7 with functions T, S, D), not secondary dominants nor borrowed chords, and do not start a modulation. I7 preceded by its ii stays V7/IV (Fm7 Bb7 → Eb7 in Bb)

## 0.5.1 - 2026-10-11

### Fixed

- `Harmony.getSuggestedScales` gave major and minor for every triad, in all three rulesets (reported from MODUS). Triads and sixth chords take the scales of their seventh chord: C as Cmaj7 (classical C major; berklee and modal ionian, lydian), Cm as Cm7. Cm6 takes dorian and melodic minor (classical melodic minor), CmM7 melodic and harmonic minor, sus4 mixolydian (none in classical), Cm7b5 in classical locrian. Other chords are read by their third; without one (sus2) no scale is suggested
- `FigureAccidental` is exported: `FiguredBass.parse` returns it

## 0.5.0 - 2026-10-11

Names in Spanish, requested by MODUS. No breaking changes.

### Added

- `scaleName(name, language, { roots })`: scale and mode names with or without a root (`findScalesForNotes`, `getSuggestedScales`, `getBorrowedChords`, `borrowedFrom`): 'D dorian' → 'Re dórico', 'harmonic minor' → 'menor armónica'. Proper names (hirajoshi, pelog, freygish…) are kept
- `cadenceName(cadence, language, { short })`: cadences of `analyzeCadence` with their numerals ('Cadencia rota (V -> vi)') or alone ('Rota', 'Authentic')
- `substitutionTypeName(type, language)`: the `type` of `getSubstitutions` ('tritonal', 'mediante cromática')

## 0.4.2 - 2026-10-11

### Fixed

- `chordQualityFromIntervals` read a chord with a third and an added ninth or eleventh as sus: Cadd9, C6/9 and Cmadd9 were `'sus2'`, Cadd11 `'sus4'`. A chord is sus only without a third; G7sus4 is `'7sus4'`. In `analyzeProgression`, Cadd9 is `I` (was `Isus2`), G7sus4 `V7sus4` (was `Vsus4`); both read back with `parseRomanProgression`

## 0.4.1 - 2026-10-11

### Fixed

- `findScalesForNotes`: the chromatic scale comes last on every root. It came before the scales on other roots when its root was the tonic (E G C B listed E chromatic third)

### Demo

- Redesigned page, without Tailwind: navigation by topic, light and dark themes, chord symbol style and solfège roots for the whole page
- New sections: progression analysis, identify notes (clickable piano), key explorer, key detection, rhythmic cycles
- Results drawn instead of printed: keyboards, chord cards by function, confidence bars, step grids and cycles lit while they play, pitch-class clock, tone-row matrix, staves with ABC, LilyPond and MusicXML
- README examples and screenshots match the library's current output

## 0.4.0 - 2026-10-11

`Harmony.getBorrowedChords`, from MODUS's key explorer.

### Breaking changes

- In a minor key, the dominant and leading-tone chords of the harmonic minor (E7, E, G#dim7, G#dim in A minor) are no longer listed as borrowed: `analyzeProgression` reads them as diatonic
- `characteristic` marks the degrees that set the source mode apart from its reference scale (Berklee Online, "Modes"). Aeolian is marked by the b6 alone, not by the b6 or the b7: in C major, Cm7, Ebmaj7 and Gm7 from aeolian are no longer characteristic

## 0.3.0 - 2026-10-11

Functions requested by MODUS. No breaking changes.

### Added

- `analyzeVoicing(notes, chord?)`: inversion, close or open position (upper voices within an octave), drop 2 / drop 3 / drop 2+4, doubled, omitted and added members
- `Harmony.detectChordsScored(notes)`: chord readings with `score`, `rootInBass`, `omitted` and `tensions`; readings may leave out the fifth (and the ninth or eleventh of eleventh and thirteenth chords). `detectChords` is unchanged
- `findScalesForNotes(notes, { tonic, tonicOnly, limit })`: every `SCALE_PATTERNS` scale on every root that contains the notes, aliases merged, ranked by tonic, tier and added notes
- `formatChordSymbol` (styles `standard` Cmaj7, `symbols` CΔ7 / C-7 / Cø7 / C°7 / C+, `short` CM7; roots in letters or solfège), `chordLongName` (English, Spanish), `localizeNoteName`
- `RHYTHMIC_CYCLES`: Hindustani talas (Teental, Jhoomra, Dhamar, Ektal, Jhaptal, Keherwa, Rupak, Dadra), Carnatic Adi and Rupaka, flamenco compás (bulerías, soleá, alegrías, seguiriya), aksak meters (Paidushko, Račenica, Lesnoto, Daychovo, Grancharsko, Gankino, Elenino, Krivo Sadovsko), each with its source; `cycleCounts`, `cycleStrokes`, `cycleTimeSignature`
- `KEY_PROFILES` and `KeyDetection.detect(notes, durations, { profile })`: Krumhansl-Kessler (default), Aarden-Essen, Bellman-Budge, Temperley-Kostka-Payne and simple profiles, from Humdrum's `keycor`
- `Harmony.getBorrowedChords(key, { type: 'triad' | 'seventh' })`
- `chordDegreeLabel(interval, formula)`: chord member names (`'b3'`, `'#11'`, `'bb7'`…)

## 0.2.0 - 2026-10-11

Audit of October 2026: wrong results fixed module by module, packaging and CI.

### Breaking changes

Outputs that change for the same input:

- `Chord.getNotes()` spells each note by its interval above the written root (D#m → D# F# A#; C7#9 → D#; Edim7 → E G Bb Db). Names may carry E#, B#, Cb, Fb and double accidentals; the octave follows the letter (B#3 sounds as C4)
- `Harmony.detectChords`: a major triad is `"C"` / `"C/E"`, not `"CM"` / `"CM/E"`
- `Harmony.analyzeCadence`: the deceptive cadence is recognized in minor (`'Deceptive Cadence (V -> VI)'`); `Phrygian Half Cadence` only with the bass falling from the 6th to the 5th degree
- `Harmony.getSuggestedScales(V7, minor chord)`: mixolydian, phrygian dominant, altered (no half-whole diminished)
- `Harmony.getNegativeHarmony`: `rootStep` is the root of the detected name; another lowest note goes to `bassStep`
- `parseRomanProgression`: quality from the key (`ii` → Dm, `vii` → Bdim); accidentals relative to the key's own scale (`bVII` in A minor → Gb); upper-case `7` is a dominant (`I7` → C7, `Imaj7` for the major seventh); `dom` asks for a dominant; an unknown suffix throws
- `Harmony.analyzeProgression`:
  - Numerals read back with `parseRomanProgression` (Bm7 in C → `viim7`, Gdim in A minor → `VIIdim`)
  - Chromatic roots take the letter the key spells (F#dim7 in C → `#iv°7`)
  - Modulations start at the first chord foreign to the active key. The new key is chosen by authentic cadence, then the presence of its tonic, then Krumhansl correlation. Fewer than three chords is a tonicization
  - Numerals and cadences are read in the local key (`ChordAnalysis.key`)
  - `harmonicRhythm` counts changes per bar when durations are given (`harmonicRhythmUnit`)
- `spellChordInKey` in minor keeps the raised third's letter (C# major in A minor is C#)
- `new Chord(...)` throws unless `intervalsInSteps` starts at 0
- `CircleOfFifths.getSignature` reads the key as written (Gb → 6 flats, C# → 7 sharps)
- Reference data corrected: Forte table (all 223 classes, `4-Z15`), Werckmeister III, harmonic series, clave patterns (son and rumba 2-3, cinquillo), maqamat (maqamworld), ragas (`vadi` and `samvadi` as svara numbers with `SVARA_NAMES`; Khamaj, Todi, Desh, Puriya Dhanashree), progressions, commas. Maqam `gharsa` is now `character` (`gharsa` kept as a deprecated alias)
- `FiguredBass.realize` completes abbreviated figures (`6` → 6/3, `7` → 7/5/3, `6/5`, `4/3`, `4/2`)
- `Solfege.movableDo` in minor is la-based (A minor: A = "la")
- `ToneRow`: forms named by their first pitch class, standard matrix, `R(n)`
- `MetricModulation` works from the given tempo; `RhythmTransform.retrogradeInversion` is deprecated
- `getStepFromStandard` maps to the nearest step in cents in every tuning (not a linear proportion); scale patterns are mapped by position (`getPatternFromStandard`), so a scale keeps its span (22-EDO major spans 22 steps)
- `OPTIC`: cumulative equivalences; `C` is the prime form and the count moved to `cardinality`; `efficientVoiceLeading` measures by interval class and throws above 8 voices
- `isMOS(scale, period = 12)` by Myhill's property; `detectWolfIntervals` default threshold 20¢, returns `{ interval, from, errorCents }`; `Spectral.sensoryConsonance` from harmonic partials (Sethares)
- `Tonnetz` positions on the fifths/thirds lattice; `pathBetween` gives shortest paths
- Exporters:
  - ABC writes C4 as `C` (it was one octave high), with naturals against the key and within the measure
  - LilyPond writes absolute pitches (no `\relative`)
  - MusicXML takes the key signature from a `key` option
  - All three tie notes across barlines, write gaps as rests, and throw `RangeError` on overlapping events

### Added

- `KeyDetection.detect(notes, durations?)` weighted by duration; `KeyDetection.detectFromHistogram`
- `Harmony.analyzeProgression(chords, key, { spelling, durations, beatsPerBar })`
- `Note.scientificOctave`; `getIntervalBetween('C4', 'F#4')` → `A4`; interval names with quality, compounds at any size
- `parseChordSymbol` accepts `6/9`, `m6/9` and `6/9/<bass>`
- `Motif.occurrences`; `TuningSystem.getPatternFromStandard`
- `key` options in `streamToABC`, `streamToABCWithChords`, `chordToABC`, `scaleToABC`, `progressionToABC`, `streamToLilyPond`, `streamToMusicXML`
- ESM build `dist/umt.mjs` with bundled types `dist/umt.d.ts` (`exports` in `package.json`); `npm run build` builds all three files
- CI on GitHub Actions: typecheck, lint, tests, build, and `dist` must match the sources

### Fixed

- Tuning-dependent modules no longer assume 12-TET: counterpoint, figured bass, `getSuggestedScales`, Tonnetz, temperament comparison, exporters
- `Chord.getNotes()` no longer throws in tunings without note names
- `parseScaleSymbol` in 7-note tunings (`PtolemaicJI`) no longer throws
- `CentTuning` copies its input; `freqToMidi` clamps to 0-127; `parseScala` accepts an empty description line
- Species counterpoint on a slot grid (passing tones, suspensions); canons with rests
- Schenker, form analysis (twelve-bar blues, reprises), motif detection, syncopation by meter, hemiola

### Tests

- One test file per library module, headed by the theory sources the module cites

## 0.1.0

State before the audit (`801e5ec`).
