# Universal Music Theory Library

## What is this

A standalone TypeScript music theory library (`UMT`) covering 12-TET, microtonal tunings, world music, post-tonal theory, rhythm, and notation export. 40+ modules, 1016 tests, zero runtime dependencies.

The library compiles to a standalone IIFE (`dist/umt.js`, 146 kb) for script tags and jsDelivr, and to an ESM bundle (`dist/umt.mjs`) with bundled types (`dist/umt.d.ts`). Releases are git tags with notes in `CHANGELOG.md`.

The demo is a single vanilla HTML file (`index.html`) with 12 interactive sections in four groups (tonal harmony, scales and tuning, rhythm, beyond), its own CSS with light and dark themes. The original Next.js scaffolding and old demo versions are in `archive/` (gitignored).

## Stack

- **Library**: TypeScript, compiled with esbuild → `dist/umt.js` (IIFE) and `dist/umt.mjs` (ESM); types by dts-bundle-generator → `dist/umt.d.ts`
- **Demo**: Vanilla HTML (`index.html`) - no build step. CDN: Tone.js (audio), abcjs (sheet music), Fraunces from Google Fonts. No Tailwind, no Next.js/React.
- **Deploy**: build locally (`npm run build`), commit `dist/`, push. CI (GitHub Actions) fails if `dist/` does not match the sources. A release bumps `package.json`, adds a `CHANGELOG.md` entry and a `vX.Y.Z` tag. GitHub Pages serves from root `/`. Repo: https://github.com/memoriainfinita/UMT

## Commands

```bash
npm run build        # dist/umt.js (IIFE), dist/umt.mjs (ESM), dist/umt.d.ts (types)
npm run build:umt    # IIFE only, for a quick demo check
npm run test:unit    # vitest, one file per module in tests/unit/
npx http-server . -p 8080   # Serve the demo locally
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (covers lib/ and tests/)
```

## Project structure

```
lib/music-theory/         # Core library - all TypeScript (46 modules)
  types.ts                # Cents, Hertz, Ratio
  interval.ts             # Interval math (cents, ratios)
  tuning.ts               # TuningSystem (abstract), EDO, JustIntonation, CentTuning, NonOctaveTuning
  note.ts                 # Note class
  scale.ts                # Scale class - modes, diatonic chords, modal characteristics
  chord.ts                # Chord - voicings, inversions, voice leading, tritone sub
  dictionaries.ts         # CHORD_FORMULAS (100+) and SCALE_PATTERNS (80+)
  parser.ts               # parseChordSymbol, parseScaleSymbol, parseNote, parseRomanProgression
  presets.ts              # Ready-to-use tuning systems, scales, chords
  harmony.ts              # Voice leading, chord detection, cadences, negative harmony, Coltrane axis
  circle.ts               # CircleOfFifths
  set-theory.ts           # Normal/prime form, interval vector, Forte catalogue, Z-relations
  key-detection.ts        # Correlation key finding, five key profiles (KEY_PROFILES)
  neo-riemannian.ts       # PLR transformations
  substitution.ts         # Chord substitutions (tritone, sus4, deceptive, diatonic)
  progressions.ts         # 16 named progressions
  form.ts                 # Formal analysis (AABA, ABAB, binary...)
  upper-structures.ts     # USTs, slash chord analysis, chord-scale completeness
  figured-bass.ts         # Figured bass parsing and realization
  spelling.ts             # Pitches spelled in a key, chord tones by interval
  voicing.ts              # Voicing analysis: inversion, position, drop voicings, doubled/omitted
  scale-finder.ts         # Scales of SCALE_PATTERNS that hold a set of notes, ranked
  chord-names.ts          # Chord symbol styles, solfège roots, long names (en, es)
  twelve-tone.ts          # ToneRow, P/I/R/RI, 12x12 matrix
  counterpoint.ts         # Species counterpoint, Canon
  melody.ts               # Contour analysis, motif detection
  schenker.ts             # Basic Schenkerian reduction
  scala.ts                # Scala (.scl) file parser
  rhythm.ts               # Duration, TimeSignature, Polyrhythm, Euclidean, MetricModulation
  clave-patterns.ts       # 10 clave presets
  rhythmic-cycles.ts      # Talas, flamenco compás, aksak meters
  ragas.ts                # 10 Hindustani ragas
  maqamat.ts              # 8 Arabic maqamat (24-EDO)
  solfege.ts              # Fixed-do and movable-do
  hexachord.ts            # Guidonian hexachord
  tonnetz.ts              # Tonnetz pitch space
  mos.ts                  # MOS scales, comma pumps
  xen.ts                  # Otonal/utonal, neutral intervals
  spectral.ts             # Roughness, sensory consonance, overtone series
  temperament-analysis.ts # Temperament error analysis, EDO comparison
  voice-leading-geometry.ts # OPTIC equivalences, Tymoczko geometry
  abc-bridge.ts           # Export to ABC notation
  lilypond-bridge.ts      # Export to LilyPond
  musicxml-bridge.ts      # Export to MusicXML
  notation-layout.ts      # Shared by the exporters: spelling, key signatures, measures and ties
  utils.ts                # Note naming, MIDI conversion, interval naming
  index.ts                # Re-exports everything
  umt.ts                  # IIFE entry point - attaches UMT to window

dist/
  umt.js                  # Compiled bundle - tracked in git (CDN via jsDelivr)

index.html                # Demo page - 12 interactive sections

archive/                  # Old demos and Next.js scaffolding (gitignored)
docs/
  plan-teoria-completa.md # Design history - 10-phase expansion plan
```

## Coordinate system

All pitch positions are **steps from A4 = 0** within a `TuningSystem`. A4 = 440Hz = step 0. C4 = -9 in 12-TET.

## Key conventions

- `TuningSystem` is abstract. Always use `EDO`, `JustIntonation`, `CentTuning`, or `NonOctaveTuning`.
- `Chord.smoothTransition` handles voice leading automatically - use it for progressions.
- Parser functions accept an optional `tuning: TuningSystem = TET12` parameter. Interval values from `CHORD_FORMULAS`/`SCALE_PATTERNS` are mapped to the target tuning via `tuning.getStepFromStandard()` (nearest step in cents).
- `parseRomanProgression` supports: `ii7`, `V7`, `V7alt`, `V7/ii` (applied chords), `subV7` (tritone sub). Upper-case `7` is a dominant (`I7` = C7); the major seventh is `Imaj7`. `analyzeProgression` numerals read back with it.
- `ScalaTuning` (from `.scl` files) requires the last entry to be the octave (`2/1` or `1200.0`).
- `Harmony.detectChords` and `Harmony.getNegativeHarmony` are 12-TET only - they return early for other tunings.
- All library strings are in English. No Spanish strings in library code.
- `dist/umt.js` is tracked in git intentionally - it is the distributable artifact, not a build byproduct to ignore.
