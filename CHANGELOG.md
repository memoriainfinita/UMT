# Changelog

Versions are git tags. Pin one (`#v0.2.0` in npm, `@v0.2.0` on jsDelivr); `main` may change.

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
