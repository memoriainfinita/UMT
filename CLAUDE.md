# Universal Music Theory Library

## What is this

A standalone TypeScript music theory library (`UMT`) supporting 12-TET, microtonal tunings (JI, EDOs, Werckmeister, Bohlen-Pierce), and advanced theory (Neo-Riemannian, Set Theory, Key Detection).

The library compiles to a standalone IIFE (`public/umt.js`, ~29KB) with zero runtime dependencies — usable via script tag, CDN, or ESM import in any project.

The demo is a single vanilla HTML file (`public/example.html`). The original Next.js scaffolding has been archived to `archive/next-demo/`.

## Stack

- **Library**: TypeScript, compiled with esbuild → `public/umt.js`
- **Demo**: Vanilla HTML (`public/example.html`) — no build step. CDN: Tone.js (audio), abcjs (sheet music), Tailwind. No Next.js/React.
- **Deploy**: build locally (`npm run build:umt`), commit `public/umt.js`, push. No CI pipeline. GitHub Pages will serve the static demo from `docs/` or `public/` once the repo is created.

## Commands

```bash
npm run build:umt    # Compile lib/music-theory/umt.ts → public/umt.js (the only required step)
npx http-server public -p 8080   # Serve the demo locally
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

public/
  umt.js             # Compiled bundle — tracked in git (enables CDN via jsDelivr)
  umt.js.map         # Source map
  example.html       # Vanilla JS demo — the target demo format

archive/             # Archived Next.js demo (app/, components/, lib/audio.ts, Next.js configs)
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
