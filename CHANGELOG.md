# Changelog

Versions are git tags. Pin one (`#v0.4.1` in npm, `@v0.4.1` on jsDelivr); `main` may change.

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
