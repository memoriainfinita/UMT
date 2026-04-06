# Universal Music Theory Library

## What is this

A standalone TypeScript music theory library (`UMT`) supporting 12-TET, microtonal tunings (JI, EDOs, Werckmeister, Bohlen-Pierce), and advanced theory (Neo-Riemannian, Set Theory, Key Detection).

The library compiles to a standalone IIFE (`public/umt.js`, ~29KB) with zero runtime dependencies — usable via script tag, CDN, or ESM import in any project.

The Next.js demo in `app/` is temporary scaffolding from the initial Gemini-generated version. It will be replaced with a vanilla HTML demo (`public/example.html`). Do not treat the Next.js app as part of the library scope.

## Stack

- **Library**: TypeScript, compiled with esbuild → `public/umt.js`
- **Demo (temporary)**: Next.js 15 / React 19, kept only until the vanilla HTML demo is complete
- **Audio**: Web Audio API (`lib/audio.ts`)
- **Deploy**: build locally (`npm run build:umt`), commit `public/umt.js`, push. No CI pipeline. GitHub Pages will serve the static demo from `docs/` or `public/` once the repo is created.

## Commands

```bash
npm run build:umt    # Compile lib/music-theory/umt.ts → public/umt.js (the only required step)
npm run dev          # Start Next.js dev server (temporary, for the demo only)
npm run build        # Build library + Next.js app (temporary)
npm run lint         # ESLint
```

## Project structure

```
lib/music-theory/    # Core library — all TypeScript
  types.ts           # Cents, Hertz, Ratio
  interval.ts        # Interval math (cents, ratios)
  tuning.ts          # TuningSystem (abstract), EDO, JustIntonation, CentTuning, NonOctaveTuning
  note.ts            # Note class
  scale.ts           # Scale class with modes
  chord.ts           # Chord — voicings, inversions, voice leading, tritone sub
  dictionaries.ts    # CHORD_FORMULAS and SCALE_PATTERNS (12-TET semitone values)
  parser.ts          # parseChordSymbol, parseScaleSymbol, parseNote, parseRomanProgression
  presets.ts         # Ready-to-use tuning systems, scales, chords
  harmony.ts         # Harmony class — voice leading, chord detection, cadences, negative harmony
  circle.ts          # CircleOfFifths
  set-theory.ts      # Normal/prime form, interval vector
  key-detection.ts   # Krumhansl-Schmuckler algorithm
  neo-riemannian.ts  # PLR transformations
  scala.ts           # Scala (.scl) file parser
  rhythm.ts          # Duration, TimeSignature, Polyrhythm, Euclidean
  stream.ts          # MusicStream event container
  abc-bridge.ts      # Export UMT objects to ABC notation
  utils.ts           # Note naming, MIDI conversion, interval naming
  index.ts           # Re-exports everything
  umt.ts             # IIFE entry point — attaches UMT to window

lib/audio.ts         # Web Audio API synth (Synth class)
public/
  umt.js             # Compiled bundle — tracked in git (enables CDN via jsDelivr)
  umt.js.map         # Source map
  example.html       # Vanilla JS demo — the target demo format

app/                 # Next.js demo (temporary — to be replaced)
components/          # React components (temporary)
```

## Coordinate system

All pitch positions are **steps from A4 = 0** within a `TuningSystem`. A4 = 440Hz = step 0. C4 = −9 in 12-TET.

## Key conventions

- `TuningSystem` is abstract. Always use `EDO`, `JustIntonation`, `CentTuning`, or `NonOctaveTuning`.
- `Chord.smoothTransition` handles voice leading automatically — use it for progressions.
- Parser functions accept an optional `tuning: TuningSystem = TET12` parameter. Interval values from `CHORD_FORMULAS`/`SCALE_PATTERNS` are mapped to the target tuning via `tuning.getStepFromStandard()`.
- `parseRomanProgression` supports: `ii7`, `V7`, `V7alt`, `V7/ii` (applied chords), `subV7` (tritone sub).
- `ScalaTuning` (from `.scl` files) requires the last entry to be the octave (`2/1` or `1200.0`).
- `Harmony.detectChords` and `Harmony.getNegativeHarmony` are 12-TET only — they return early for other tunings.
- All library strings are in English. No Spanish strings in library code.
- `public/umt.js` is tracked in git intentionally — it is the distributable artifact, not a build byproduct to ignore.
