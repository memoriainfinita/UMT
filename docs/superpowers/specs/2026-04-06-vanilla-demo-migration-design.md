# Vanilla HTML Demo — Design Spec

Date: 2026-04-06

## Goal

Replace the temporary Next.js demo (`app/`) with a single self-contained HTML file (`public/example.html`) that demonstrates every module of the UMT library. The demo targets both developers (as living documentation) and non-technical users (interactive music exploration). Tone is direct and honest — this is a library, not a product.

---

## Output

**One file:** `public/example.html`

No build step required. Opens directly in the browser (or served via `npm run dev` / any static server). All dependencies loaded from CDN.

---

## Dependencies (CDN)

| Library | Purpose |
|---------|---------|
| `./umt.js` | The library itself (local) |
| Tone.js | Audio playback — demonstrates integration with external libs |
| abcjs | Sheet music rendering — demonstrates ABC notation export |
| Tailwind CSS (CDN) | Styling — no build |

---

## Structure

### Header
- Library name + short description (one line, no marketing)
- Navigation anchors to each section

### Sections (one per module group)

Each section follows this pattern:
- Title = module name(s) covered
- Input(s) or selector where relevant (editable by user)
- "Run" button that executes the UMT API call
- Output block (`<pre>`, console style)
- abcjs staff render where relevant (Chords, Scales, ABC Export)
- Tone.js audio where relevant (Tuning, Chords, Scales, Progressions)

Section JS is a self-contained function. No shared state between sections.

#### 1. Tuning Systems
Modules: `tuning`, `interval`, `note`, `presets`

- Selector: choose tuning (TET12, TET24, TET31, FiveLimitJI, PtolemaicJI, WerckmeisterIII, BohlenPierce, custom EDO input)
- Root note selector (C4 default)
- Output: list of notes with Hz and cents
- Audio: plays the scale as arpeggio via Tone.js

#### 2. Scales & Modes
Modules: `scale`, `parser` (parseScaleSymbol), `utils`

- Input: scale symbol (e.g. "D dorian", "Bb lydian")
- Mode selector (1–7)
- Output: note names, steps, intervals
- Staff: rendered via abcjs
- Audio: arpeggio via Tone.js

#### 3. Chords & Voicings
Modules: `chord`, `parser` (parseChordSymbol), `dictionaries`

- Input: chord symbol (e.g. "Cmaj9/E", "F#m7b5")
- Voicing selector: close / drop2 / rootless / open
- Inversion selector: 0–3
- Output: note names, steps, frequencies
- Staff: rendered via abcjs
- Audio: plays chord via Tone.js

#### 4. Progressions & Voice Leading
Modules: `parser` (parseRomanProgression), `harmony` (smoothTransition, checkVoiceLeading)

- Input: Roman progression (e.g. "ii7 - V7alt - Imaj7")
- Key selector (e.g. "C major")
- Output: resolved chords, voice leading steps, warnings if any
- Audio: plays progression with smooth transitions via Tone.js

#### 5. Harmony & Key Analysis
Modules: `harmony` (analyzeCadence, detectChords, getSuggestedScales, getBorrowedChords, getNegativeHarmony), `key-detection`, `circle`

- Input: note list (e.g. "C4 E4 G4 Bb4") for chord detection
- Input: key for borrowed chords and negative harmony
- Output: detected chord, cadence type, suggested scales, borrowed chords, negative harmony result
- Circle of Fifths: rendered as SVG or canvas showing the key

#### 6. Set Theory & Neo-Riemannian
Modules: `set-theory`, `neo-riemannian`

- Input: note list for set theory analysis
- Output: pitch classes, normal form, prime form, interval vector
- PLR section: input chord symbol, buttons P / L / R, output transformed chord
- Audio: plays original + transformed chord via Tone.js

#### 7. Microtonal & Scala
Modules: `scala`, presets (BohlenPierce, TET24, custom)

- Textarea: paste a .scl file (Pelog example pre-loaded)
- Output: parsed tuning name, octave steps, cents per step
- Audio: plays the parsed scale via Tone.js
- Note: demonstrates that UMT works beyond 12-TET

#### 8. Rhythm & Meter
Modules: `rhythm`, `stream`

- Input: Euclidean rhythm params (pulses, steps, offset)
- Input: time signature (numerator / denominator)
- Output: beat pattern (visual + text)
- Audio: plays the rhythm pattern via Tone.js

#### 9. ABC Notation Export
Modules: `abc-bridge`, `stream`

- Input: chord progression or scale (pre-loaded example)
- Output: generated ABC notation string
- Staff: rendered via abcjs from the generated ABC string
- Demonstrates the full pipeline: UMT objects → ABC → visual score

#### 10. Utilities
Modules: `utils`

- MIDI ↔ Frequency converter (input: MIDI number or Hz)
- Enharmonics: input note name, output equivalents
- Interval naming: input two notes, output interval name + cents
- Semantic interval name (e.g. "major third")

#### 11. API Reference
No interactivity. A clean table per class:

- Class name, constructor signature
- Key methods with parameter types and return types
- One-line description per method
- Covers: Note, Scale, Chord, Harmony, SetTheory, NeoRiemannian, KeyDetection, CircleOfFifths, Rhythm, MusicStream, ABCBridge, all parsers, all tuning classes, all presets

---

## Archiving Plan

| Source | Destination |
|--------|-------------|
| `app/` | `archive/next-demo/app/` |
| `components/` | `archive/next-demo/components/` |
| `lib/audio.ts` | `archive/next-demo/audio.ts` |
| `public/example.html` (current) | `archive/example-v0.html` |

Files removed from `package.json` dependencies (Next.js/React stack):
- `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom`
- `lucide-react`
- `abcjs` (used via CDN in the demo, not as npm dep)

Files kept:
- `esbuild` and all build scripts
- `typescript`, `@types/node`
- `tailwindcss` config (only if needed for anything else — otherwise removed too)

`package.json` scripts after cleanup:
```json
"build:umt": "esbuild ...",
"lint": "eslint ."
```
`dev` and `build` (Next.js) scripts are removed.

---

## What Does Not Change

- `lib/music-theory/` — untouched
- `public/umt.js` and `umt.js.map` — untouched
- `CLAUDE.md` — updated to reflect demo is now vanilla
- `state.md` — updated after implementation

---

## Success Criteria

- `public/example.html` opens in browser without a server (or with `npx serve public`)
- All 11 sections render without console errors
- Tone.js audio plays in sections 1–4, 6, 7, 8
- abcjs renders staff in sections 2, 3, 9
- API Reference covers all exported classes and key methods
- No Next.js / React files remain in the active project tree
