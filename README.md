# Universal Music Theory Library

A TypeScript library for music theory computation that works across any tuning system -
12-TET, microtonal, historical temperaments, world music traditions, and post-tonal systems.
Zero runtime dependencies. 104 kb compiled bundle.

**[Live demo](https://memoriainfinita.github.io/UMT)** · **[Wiki / API docs](https://github.com/memoriainfinita/UMT/wiki)**

---

## What it does

Most music theory libraries are hardcoded to 12-TET. UMT is built around a universal
`TuningSystem` abstraction - every module works in any EDO, Just Intonation, or historical
temperament without modification.

```typescript
// Same chord, three tuning systems
const cmaj = parseChordSymbol('C major', TET12);
const cmaj_ji = parseChordSymbol('C major', PtolemaicJI);
const cmaj_werck = parseChordSymbol('C major', WerckmeisterIII);

// Ragas and maqamat with quarter-tone accuracy
const bhairav = RAGAS['bhairav'];    // aroha, avaroha, vadi, samvadi
const rast = MAQAMAT['rast'];        // 24-EDO quarter-tone intervals

// Post-tonal analysis
const row = new ToneRow([0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10]);
const matrix = row.getMatrix();      // 12x12 P/I/R/RI matrix

// Set theory with Forte catalogue
SetTheory.getForteNumber([0, 3, 6, 9]);   // "4-28"
SetTheory.getZRelated([0, 1, 4, 6]);      // Z-related sets
```

---

## Installation

**Browser - CDN (jsDelivr)**
```html
<script src="https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@main/public/umt.js"></script>
<script>
  const chord = UMT.parseChordSymbol('Cmaj9');
  console.log(chord.getNotes().map(n => n.name));
</script>
```

**Browser - local**
```html
<script src="umt.js"></script>
```

**TypeScript / ESM**
```typescript
import { parseChordSymbol, TET12, Harmony, SetTheory } from './lib/music-theory';
```

**Build from source**
```bash
npm install
npm run build:umt   # lib/music-theory/umt.ts -> public/umt.js
```

---

## Modules

### Core

| Module | What it does |
|--------|-------------|
| `tuning.ts` | `EDO`, `JustIntonation`, `CentTuning`, `NonOctaveTuning` - the universal tuning abstraction |
| `note.ts` | Pitch as frequency, MIDI, and enharmonic name in any tuning |
| `interval.ts` | Interval math in cents and ratios |
| `parser.ts` | `parseChordSymbol`, `parseScaleSymbol`, `parseNote`, `parseRomanProgression` - all tuning-aware |
| `dictionaries.ts` | 100+ chord formulas, 80+ scale patterns |
| `presets.ts` | Ready-to-use tuning systems, scales, chords |
| `utils.ts` | MIDI conversion, enharmonic spelling, interval naming |

### Tonal harmony

| Module | What it does |
|--------|-------------|
| `harmony.ts` | Voice leading, chord detection, negative harmony, cadences, borrowed chords, modal interchange, Coltrane axis |
| `chord.ts` | Voicings (drop2, drop3, quartal, rootless), inversions, tritone substitution, smooth transitions |
| `scale.ts` | Modes, diatonic chords, brightness, avoid notes, parent scale navigation |
| `circle.ts` | Circle of fifths - key signatures, relatives, neighbors, modal distance |
| `substitution.ts` | Chord substitutions (tritone, sus4, deceptive, diatonic) |
| `progressions.ts` | 16 named progressions (ii-V-I, Coltrane changes, blues 12, rhythm changes...) |
| `form.ts` | Formal analysis - AABA, ABAB, binary, ternary, through-composed |
| `upper-structures.ts` | Upper structure triads, slash chord analysis, chord-scale completeness |
| `key-detection.ts` | Krumhansl-Schmuckler key detection algorithm |
| `neo-riemannian.ts` | P, L, R transformations in any tuning |
| `figured-bass.ts` | Figured bass parsing and realization |

### Post-tonal

| Module | What it does |
|--------|-------------|
| `set-theory.ts` | Normal/prime form, interval vector, Forte catalogue (208 sets), Z-relations, Tn/TnI |
| `twelve-tone.ts` | Tone rows, P/I/R/RI forms, 12x12 matrix, all-interval and combinatorial detection |
| `counterpoint.ts` | Species counterpoint checker, Canon |
| `schenker.ts` | Basic Schenkerian reduction |
| `melody.ts` | Contour analysis, motif detection |

### World music

| Module | What it does |
|--------|-------------|
| `ragas.ts` | 10 Hindustani ragas - aroha, avaroha, vadi, samvadi, time, description |
| `maqamat.ts` | 8 Arabic maqamat in 24-EDO quarter-tone intervals |
| `solfege.ts` | Fixed-do and movable-do solfege |
| `hexachord.ts` | Guidonian hexachord system |

### Rhythm

| Module | What it does |
|--------|-------------|
| `rhythm.ts` | Euclidean rhythms, polyrhythm, metric modulation, isorhythm |
| `clave-patterns.ts` | 10 clave presets (son, rumba, bossa nova, tresillo, habanera...) |

### Microtonal / Xenharmonic

| Module | What it does |
|--------|-------------|
| `scala.ts` | Scala `.scl` file parser |
| `tonnetz.ts` | Tonnetz pitch space - position and navigation |
| `mos.ts` | Moment of Symmetry scales, MOS families, comma pumps |
| `xen.ts` | Otonal/utonal series, neutral intervals |
| `spectral.ts` | Roughness (Plomp-Levelt), sensory consonance, overtone series |
| `temperament-analysis.ts` | Temperament error analysis, EDO comparison, JI mapping |
| `voice-leading-geometry.ts` | OPTIC equivalences, efficient voice leading geometry (Tymoczko) |

### Notation

| Module | What it does |
|--------|-------------|
| `abc-bridge.ts` | Export scales, chords, and streams to ABC notation |
| `lilypond-bridge.ts` | Export scales, chords, and streams to LilyPond |
| `musicxml-bridge.ts` | Export scales, chords, and streams to MusicXML |

---

## Examples

### Harmony analysis

```typescript
import { parseChordSymbol, Harmony, getSubstitutions } from './lib/music-theory';

const chord = parseChordSymbol('Cmaj9');

// Suggested scales
Harmony.getSuggestedScales(chord);
// [{ scale: 'C major' }, { scale: 'C lydian' }, ...]

// Substitutions
getSubstitutions(chord, 'C major');
// [{ chord: Db7, type: 'tritone' }, ...]

// Cadence analysis
Harmony.analyzeCadence(parseChordSymbol('G7'), parseChordSymbol('Cmaj7'), 'C major');
// "Authentic (V7->I)"

// Coltrane axis
Harmony.getColtraneAxis('C major');
// { root: 'C', axes: ['C', 'E', 'Ab'] }
```

### Modal analysis

```typescript
import { parseScaleSymbol } from './lib/music-theory';

const scale = parseScaleSymbol('D dorian');

scale.getDiatonicChords('seventh');
// [Dm7, Em7b5, Fmaj7, G7, Am7, Bbmaj7, C7]

const modal = scale.getModalCharacteristics();
// { brightness: -1, avoidNotes: ['B'], characteristicIntervals: ['M6'] }

scale.getParentScale();   // C major
scale.getRelativeMode('lydian');  // A lydian
```

### Twelve-tone row

```typescript
import { ToneRow } from './lib/music-theory';

const row = new ToneRow([0, 11, 3, 4, 8, 7, 9, 5, 6, 1, 2, 10]);

row.P(0);   // prime form
row.I(0);   // inversion
row.R();    // retrograde
row.RI(0);  // retrograde inversion

row.getMatrix();        // 12x12 transformation matrix
row.isAllInterval();    // true if all 11 intervals are distinct
row.isCombinatorial();  // combinatoriality check
row.getHexachords();    // [first6, last6]
```

### World music

```typescript
import { RAGAS, MAQAMAT, CLAVE_PATTERNS } from './lib/music-theory';

// Hindustani raga
const bhairav = RAGAS['bhairav'];
bhairav.aroha;      // ascending scale in semitones
bhairav.vadi;       // primary note
bhairav.time;       // "morning"

// Arabic maqam (24-EDO quarter-tones)
const rast = MAQAMAT['rast'];
rast.notes;         // interval pattern in quarter-tones
rast.ajnas;         // constituent tetrachords

// Clave rhythm
const clave = CLAVE_PATTERNS['son-3-2'];
clave.steps;        // boolean[16] - onset pattern
```

### Notation export

```typescript
import { parseScaleSymbol, ABCBridge, scaleToLilyPond, scaleToMusicXML } from './lib/music-theory';

const scale = parseScaleSymbol('D dorian');

ABCBridge.scaleToABC(scale, 1);   // ABC notation string
scaleToLilyPond(scale);            // LilyPond source
scaleToMusicXML(scale);            // MusicXML document
```

---

## Architecture

**Coordinate system:** all pitch positions are steps from A4 = 0. A4 = 440 Hz = step 0. C4 = -9 in 12-TET.

**Tuning abstraction:** `parseChordSymbol`, `parseScaleSymbol`, and `parseRomanProgression` accept an optional `TuningSystem` parameter (default: `TET12`). Interval values from the dictionaries are mapped to the target tuning via `tuning.getStepFromStandard()`.

**Enharmonic spelling:** the library uses circle-of-fifths logic to choose flats vs. sharps - not a hardcoded list. `preferFlats` is stored per `Note` and propagated through all transformations. Interval-based overrides ensure m3, m7 etc. are always spelled as flat-side intervals regardless of key.

---

## Tests

```bash
npm run test:unit    # 524 unit tests via vitest
npx playwright test  # demo integration tests
```

---

## License

GPL-3.0. Created for people, not for corporate profit. Any software using this library must also remain free and open. See `LICENSE`.
