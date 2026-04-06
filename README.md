# Universal Music Theory (UMT)

A standalone TypeScript music theory library covering classical and jazz harmony, microtonal tuning systems, and set theory. Compiles to a single zero-dependency JS bundle usable in any browser or Node project.

## Features

- **Tuning systems**: 12-TET, 24-TET, 31-TET, Just Intonation (5-limit, Ptolemaic), Werckmeister III, Bohlen-Pierce, custom EDOs
- **Scala file parser**: load any microtonal tuning from `.scl` files
- **Notes and intervals**: frequency math, enharmonic names, cent and ratio distances
- **Chords**: triads, seventh chords, extended (9, 11, 13), altered, suspended — voicings (`drop2`, `drop3`, `quartal`, `rootless`), inversions, slash chords
- **Scales and modes**: major, minor, Greek modes, harmonic/melodic minor, jazz scales, exotic scales (Hirajoshi, Double Harmonic, Enigmatic...) — modal derivation
- **Symbol parsers**: chord symbols (`Cmaj9/E`, `D-7b5`), scale symbols (`D dorian`), Roman numeral progressions (`ii7 - V7/ii - subV7 - Imaj7`) — all tuning-aware
- **Harmony**: voice leading analysis, modal interchange, negative harmony, tritone substitution, cadence analysis, scale suggestions
- **Chord detection**: identify a chord from a set of notes
- **Neo-Riemannian theory**: P, L, R transformations on any tuning
- **Set theory**: normal form, prime form, interval vector
- **Circle of fifths**: key signatures, relatives, dominants
- **Rhythm**: complex and additive meters (e.g. 3+2+2/8), tuplets, Euclidean polyrhythms
- **ABC bridge**: export UMT objects to ABC notation for score rendering

## Installation

**Browser — script tag (local)**
```html
<script src="umt.js"></script>
<script>
  const chord = UMT.parseChordSymbol('Cmaj7');
</script>
```

**Browser — CDN (jsDelivr)**
```html
<!-- Replace YOUR_GITHUB_USER once the repo is public -->
<script src="https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/universal-music-theory-library@main/public/umt.js"></script>
```

**TypeScript / ESM**
```typescript
import { Note, parseChordSymbol, TET12, Harmony } from './lib/music-theory';
```

See `public/example.html` for a complete vanilla JS usage example.

## Usage

### Notes and tuning systems

```typescript
import { Note, TET12, FiveLimitJI, WerckmeisterIII, parseScala } from './lib/music-theory';

const a4 = new Note(TET12, 0);
console.log(a4.frequency); // 440

const a4ji = new Note(FiveLimitJI, 0);
const c4w = new Note(WerckmeisterIII, -9);

const scl = `! pelog.scl\nJavanese Pelog\n7\n!\n120.0\n250.0\n400.0\n550.0\n700.0\n850.0\n2/1`;
const pelog = parseScala(scl);
const pelogNote = new Note(pelog, 2);
```

### Chords and voicings

```typescript
import { parseChordSymbol, TET31 } from './lib/music-theory';

const cmaj9 = parseChordSymbol('Cmaj9/E');
const cmaj9_31 = parseChordSymbol('Cmaj9', TET31); // intervals mapped to 31-TET

const drop2 = cmaj9.getVoicing('drop2');
const firstInv = cmaj9.getInversion(1);

const tritoneSub = parseChordSymbol('G7').getTritoneSubstitution(); // Db7
```

### Scales and modes

```typescript
import { parseScaleSymbol, TET24 } from './lib/music-theory';

const dDorian = parseScaleSymbol('D dorian');
const neutral = parseScaleSymbol('C neutral scale', TET24);
const dDorian2 = parseScaleSymbol('C major').getMode(2);
```

### Progressions and voice leading

```typescript
import { parseRomanProgression, Chord, Harmony } from './lib/music-theory';

const chords = parseRomanProgression('ii7 - V7/ii - subV7 - Imaj7', 'C major');

let currentNotes = chords[0].getNotes();
for (const chord of chords.slice(1)) {
  currentNotes = Chord.smoothTransition(currentNotes, chord);
}

const issues = Harmony.checkVoiceLeading(chords[0].getNotes(), chords[1].getNotes());
```

### Harmony

```typescript
import { Harmony, parseChordSymbol } from './lib/music-theory';

const g7 = parseChordSymbol('G7');
const cmaj7 = parseChordSymbol('Cmaj7');

const neg = Harmony.getNegativeHarmony(g7, 'C major');
const scales = Harmony.getSuggestedScales(g7, cmaj7, 'berklee');
const borrowed = Harmony.getBorrowedChords('C major');
const cadence = Harmony.analyzeCadence(g7, cmaj7, 'C major');
const detected = Harmony.detectChords([noteC, noteE, noteG, noteBb]); // ["C7"]
```

### Neo-Riemannian transformations

```typescript
import { NeoRiemannian, parseChordSymbol } from './lib/music-theory';

const cMajor = parseChordSymbol('C');
const cMinor = NeoRiemannian.P(cMajor); // Cm
const eMinor = NeoRiemannian.L(cMajor); // Em
const aMinor = NeoRiemannian.R(cMajor); // Am
```

### Set theory

```typescript
import { SetTheory } from './lib/music-theory';

const pcs = [0, 4, 7];
SetTheory.normalForm(pcs);     // [0, 4, 7]
SetTheory.primeForm(pcs);      // [0, 3, 7]
SetTheory.intervalVector(pcs); // [0, 0, 1, 1, 1, 0]
```

## Architecture

All source is in `lib/music-theory/`.

| File | Responsibility |
|------|---------------|
| `types.ts` | Base types: `Cents`, `Hertz`, `Ratio` |
| `interval.ts` | Interval math (cents, ratios) |
| `tuning.ts` | `TuningSystem` abstract class + `EDO`, `JustIntonation`, `CentTuning`, `NonOctaveTuning` |
| `note.ts` | `Note` — frequency, name, transposition |
| `scale.ts` | `Scale` — modes, transposition |
| `chord.ts` | `Chord` — voicings, inversions, voice leading, tritone sub |
| `parser.ts` | `parseChordSymbol`, `parseScaleSymbol`, `parseNote`, `parseRomanProgression` |
| `dictionaries.ts` | `CHORD_FORMULAS` and `SCALE_PATTERNS` lookup tables |
| `presets.ts` | Ready-to-use tuning systems, scales, chords |
| `harmony.ts` | `Harmony` — voice leading, chord detection, negative harmony, cadences |
| `circle.ts` | `CircleOfFifths` |
| `set-theory.ts` | `SetTheory` — normal/prime form, interval vector |
| `neo-riemannian.ts` | `NeoRiemannian` — P, L, R transformations |
| `key-detection.ts` | Krumhansl-Schmuckler key detection algorithm |
| `scala.ts` | Scala `.scl` file parser |
| `rhythm.ts` | `Duration`, `TimeSignature`, `Polyrhythm`, Euclidean rhythms |
| `stream.ts` | `MusicStream` event container |
| `abc-bridge.ts` | Export UMT objects to ABC notation |
| `utils.ts` | Note naming, MIDI conversion, interval naming |
| `index.ts` | Re-exports everything |
| `umt.ts` | IIFE entry point — attaches `UMT` to `window` |

### Coordinate system

All pitch positions are **steps from A4 = 0** within a `TuningSystem`. A4 = 440Hz = step 0. C4 = −9 in 12-TET.

### Accidental spelling

The library uses circle-of-fifths logic to choose flats vs. sharps throughout — not a hardcoded list.

- `parseChordSymbol('Bb7')` → notes spelled `Bb`, `D`, `F`, `Ab` (including in inversions and voicings)
- `parseScaleSymbol('D phrygian')` → `Eb`, `Bb` etc. (parent key = Bb major → flat side)
- `parseScaleSymbol('D mixolydian')` → `F#`, `C` etc. (parent key = G major → sharp side)
- `KeyDetection.detect()` returns `"Bb Major"`, not `"A# Major"`
- `NeoRiemannian.P/L/R` preserve or re-derive the correct enharmonic for the result chord

The preference is stored per-`Note` as a `preferFlats` flag and propagated through all transformations (`transpose`, `getInversion`, `getVoicing`, `smoothTransition`). The flag is set by the parser based on the key signature of the root + scale/mode type.

### Parser tuning parameter

`parseChordSymbol`, `parseScaleSymbol`, and `parseRomanProgression` accept an optional `TuningSystem` parameter (default: `TET12`). Interval values from the dictionaries are mapped to the target tuning via `TuningSystem.getStepFromStandard()`.

## Build

```bash
npm install
npm run build:umt   # compiles lib/music-theory/umt.ts → public/umt.js (~29KB minified)
```

## License

GNU General Public License v3.0 (GPL-3.0).

This library was built with a 100% open source philosophy — created for people, not for corporate profit. The GPL license ensures that any software using this library must also remain free and open, protecting collective musical knowledge. See `LICENSE` for details.
