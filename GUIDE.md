# Developer guide

How to load UMT, the objects it works with, what it accepts, what it returns, and recipes for common tasks. Every function and result field is described in the [API docs](https://memoriainfinita.github.io/UMT/api-docs/).

## Loading UMT

Pin a release tag (`v0.10.0`). `main` may change, and breaking changes are listed in [`CHANGELOG.md`](CHANGELOG.md).

```html
<!-- Script tag: a global UMT -->
<script src="https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@v0.10.0/dist/umt.js"></script>
<script>
  UMT.parseChordSymbol('Cmaj7').getNotes().map(n => n.name); // ['C4', 'E4', 'G4', 'B4']
</script>

<!-- ES module from the CDN -->
<script type="module">
  import { parseChordSymbol } from 'https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@v0.10.0/dist/umt.mjs';
</script>
```

In a project, install from the GitHub tag. The package ships ESM and bundled TypeScript types (`dist/umt.d.ts`); it has no runtime dependencies.

```bash
pnpm add github:memoriainfinita/UMT#v0.10.0
```

```typescript
import { parseChordSymbol, Harmony, TET12 } from 'universal-music-theory-library';
```

## The objects

### Pitch: steps from A4

Every pitch is a number of **steps from A4** in a tuning system. A4 is step 0 (440 Hz by default); in 12-TET C4 is -9 and C5 is 3. A step is a semitone in 12-TET, about 39 cents in 31-EDO (31 steps per octave), and so on.

```typescript
const c4 = parseNote('C4');
c4.stepsFromBase;   // -9
c4.frequency;       // 261.63
c4.name;            // 'C4'

new Note(TET12, -9).name;               // 'C4'
new Note(TET12, 60 - 69).name;          // MIDI 60 → 'C4' (MIDI = steps + 69 in 12-TET)
new Note(TET31, -23).name;              // 'C4': the step stands for C (see Other tunings)
new Note(TET31, -22).name;              // 'Step -22': it stands for no 12-TET note
```

`parseNote` reads 12-TET note names, with or without an octave (`'Bb3'`, `'F##4'`, `'C'` is C4). For other tunings, build `Note` from a step.

### Tuning systems

| Tuning | Build it with |
|---|---|
| Equal divisions of the octave | `TET12`, `TET19`, `TET24`, `TET31`, `TET53`, or `new EDO(17)` |
| Just intonation | `PtolemaicJI`, `FiveLimitJI`, or `new JustIntonation(name, ratios)` |
| Historical temperaments, cent tables | `WerckmeisterIII`, or `new CentTuning(name, cents)` |
| Non-octave tunings | `BohlenPierce`, or `new NonOctaveTuning(...)` |
| Scala files | `parseScala(text)` |

Parsers take the tuning as an optional argument (default `TET12`): `parseChordSymbol('C', TET31)`, `parseScaleSymbol('C major', TET31)`. Chord and scale formulas are written in 12-TET semitones; each note goes to the step of the tuning that stands for it, and a symbol whose notes the tuning does not have is refused (see Other tunings).

### Chords

```typescript
const chord = parseChordSymbol('Cmaj7/E');
chord.name;               // 'Cmaj7/E'
chord.rootStep;           // -9 (C4)
chord.intervalsInSteps;   // [0, 4, 7, 11], above the root
chord.bassStep;           // -5 (E4); undefined without a slash bass
chord.getNotes().map(n => n.name);   // ['E3', 'C4', 'E4', 'G4', 'B4']: the slash bass goes below
parseChordSymbol('C', TET12, 3).getNotes().map(n => n.name);   // ['C3', 'E3', 'G3']: third argument is the octave
```

### Scales

```typescript
const scale = parseScaleSymbol('D dorian');
scale.getNotes().map(n => n.name);   // ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5']: one octave, root repeated
scale.getNotes(2);                   // two octaves
scale.getDiatonicChords('seventh').map(c => c.name);   // ['Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5', 'Cmaj7']
```

### Pitch classes count from A

`getPitchClasses()` on a chord or scale returns pitch classes **from A = 0** (step 0 is A4), not from C:

```typescript
parseChordSymbol('C').getPitchClasses();   // [3, 7, 10]: C, E, G
```

Add 9 (mod 12) to count from C = 0. `KeyDetection.detectFromHistogram` is the exception: its 12 weights start at C.

## What UMT accepts

### Chord symbols

Root letter (upper or lower case), accidentals, a quality, extensions and alterations, and an optional slash bass:

`C`, `Cm`, `C7`, `Cmaj7`, `Cm7b5`, `Cdim7`, `C+`, `Csus4`, `Cadd9`, `C6/9`, `C7#9`, `C13#11`, `C7alt`, `C/E`, and jazz symbols `CΔ7`, `C-7`, `Cø7`, `C°7`. The qualities are the keys of `CHORD_FORMULAS`, plus extensions and alterations built from them.

An unknown quality throws: `parseChordSymbol('Cxyz')` → `Error: parseChordSymbol: unknown chord type "xyz" in "Cxyz".`

### Scale names

A root, a space and a scale type from `SCALE_PATTERNS` (80+): `'C major'`, `'A harmonic minor'`, `'D dorian'`, `'F# lydian dominant'`, `'E phrygian dominant'`, `'C pentatonic minor'`, `'A hirajoshi'`. The type is not case-sensitive. An unknown type throws.

### Keys

Harmony functions take a key as a scale name: `'C major'`, `'A minor'`, `'D dorian'`. A root alone (`'C'`) or a chord symbol (`'Cm'`) throws. `'minor'` is natural minor; in analysis, V and vii° with the raised seventh still count as diatonic.

### Roman numerals

`parseRomanProgression` takes one string, numerals separated by spaces or hyphens, and a key:

```typescript
parseRomanProgression('ii7 V7 Imaj7', 'C major').map(c => c.name);       // ['Dm7', 'G7', 'Cmaj7']
parseRomanProgression('V7/ii subV7 bVII7 I7', 'C major').map(c => c.name); // ['A7', 'Db7', 'Bb7', 'C7']
parseRomanProgression('i iv V7 VI', 'A minor').map(c => c.name);          // ['Am', 'Dm', 'E7', 'F']
```

- Upper or lower case sets the third; what the numeral does not say comes from the key (`vii` in C is Bdim).
- `7` after an upper-case numeral is a dominant seventh (`I7` is C7); the major seventh is `maj7`.
- `V7/x` is a secondary dominant, `subV7` the tritone substitute.
- Accidentals move the degree of the key's own scale: in A minor, `bVII` is Gb.
- An unknown suffix throws.

### Names in other languages

`translateSymbol` turns Spanish, French or Italian names into symbols the parsers read:

```typescript
const es = { ...SOLFEGE_ROOTS, ...QUALITY_ALIASES_ES };
translateSymbol('Sol menor', es);   // 'G minor', for parseScaleSymbol or parseChordSymbol
```

## What UMT returns

### Names and spelling

- Library strings are in English. For an interface in Spanish, see [Names for an interface](#names-for-an-interface).
- Notes are spelled by letter: F# major has E#, and `Chord.getNotes()` names each note by its interval above the root (`Edim7` is E G Bb Db).
- `analyzeProgression` gives a chromatic root the letter the key spells it with: Gb7 in C is `#IV7`, read as F#7. With `{ spelling: 'written' }` it keeps the letter of the chord's name (`bV7`), for chords that arrive already named.
- `KeyDetection` writes the mode capitalized: `'A Minor'`. Harmony functions accept either case.
- `CircleOfFifths` writes minor keys in lower case: `getRelative('C')` is `'a'`.

### When nothing matches

| Situation | Result |
|---|---|
| A string a parser cannot read (`parseNote`, `parseChordSymbol`, `parseScaleSymbol`, `parseRomanProgression`, key arguments) | throws `Error` |
| A chord or scale whose notes the tuning does not have (`parseScaleSymbol('C major', PtolemaicJI)`) | throws `RangeError` |
| An argument of the wrong size or value (durations that do not match the notes, a non-integer degree, overlapping events in an exporter) | throws `RangeError` |
| `Harmony.detectChords` with no chord found, or notes that stand for no 12-TET note | `['Unknown Chord']` |
| Other detections (`Schenker.findUrlinie`, `NeoRiemannian.getTriadType`, `P`/`L`/`R` on a non-triad) | `null` |
| Searches with no result (`getSuggestedScales` for a chord without a third, `getFretboardVoicings`) | `[]` |
| Classifications with no match (`detectSequence`, `analyzeHarmonic`) | `'unknown'` |

### Other tunings

A step of a tuning that repeats at the octave **stands for** a 12-TET note when it is the tuning's step for that note (`getStepFromStandard`) and the nearest to it in cents: `tuning.getStandardStep(step)` gives the note, or `null`. In a 12-note tuning (12-TET, Werckmeister III, `FiveLimitJI`) every step stands for itself; in 19- and 31-EDO the steps that stand for notes are the meantone images of the 12 notes; a quarter tone of 24-EDO stands for none, and nothing does in a tuning that does not repeat at the octave (Bohlen-Pierce).

Everything that names or analyses reads a chord, scale or note through the 12-TET notes its steps stand for, and gives back chords and scales in the original tuning:

- Note names, chord and scale names, spelling, Roman numerals, functions, cadences and modulations, chord detection, voicings, P/L/R, substitutions, borrowed chords, suggested scales, negative harmony, solfège: the same answer as in 12-TET.
- When a note stands for no 12-TET note, the function gives its "nothing found" value from the table above: `'Step n'` as a note name, `null`, `[]`, `['Unknown Chord']`, `'?'` in solfège.
- Lists (substitutions, borrowed chords, containing scales, upper structures) leave out the chords and scales the tuning cannot hold.
- `chord.retune(tuning)`, `scale.retune(tuning)` and `note.retune(tuning)` move material between tunings by the same rule; `null` when a note has no counterpart.

What stays as it was:

- The Tonnetz, counterpoint, figured bass and `KeyDetection` read each note at its nearest 12-TET semitone, quarter tones included.
- `SetTheory.getPitchClasses` counts in steps of the tuning (31 pitch classes in 31-EDO); `getPitchClassesC0` gives 12-TET pitch classes for the Forte catalogue.
- `getFretboardVoicings` and `getFretboardScale` place one fret per step of the chord's tuning; the instrument presets are 12-TET, so a chord of another tuning goes on a guitar as `chord.retune(TET12)`.
- The exporters write the tuning's pitches with fractional alterations (MusicXML `<alter>`).

In 31-EDO C sharp and D flat are different notes (steps -21 and -20 from A4); UMT does not model spelled notes yet, so only the step that stands for the 12-TET C sharp/D flat (-21) is named.

## Recipes

### Analyze a progression

```typescript
const chords = ['Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'Fm6', 'Cmaj7'].map(s => parseChordSymbol(s));
const { analysis, modulations } = Harmony.analyzeProgression(chords, 'C major');

analysis.map(a => a.roman);       // ['ii7', 'V7', 'Imaj7', 'VI7', 'ii7', 'ivm', 'Imaj7']
analysis.map(a => a.function);    // T, S or D per chord
analysis[3].secondaryTarget;      // 'V7/ii'
analysis[5].borrowedFrom;         // 'minor'
analysis[1].cadenceWithNext;      // 'Authentic Cadence (V -> I)'
modulations;                      // []: each entry says where the key changes and to what
```

Options: `spelling: 'written'` (see above), `durations` and `beatsPerBar` for the harmonic rhythm per bar, and `style: 'blues'` so that I7, IV7 and V7 are chords of the key rather than secondary dominants. Named progressions are in `PROGRESSIONS`; `getProgression('ii-V-I', 'Bb major')` builds one.

### Name the chord, scale and voicing of a set of notes

```typescript
const notes = ['E3', 'G3', 'C4', 'B4'].map(n => parseNote(n));   // or new Note(TET12, midi - 69)

Harmony.detectChords(notes);                    // ['Cmaj7/E']
Harmony.detectChordsScored(notes)[0];           // { name: 'Cmaj7/E', score: 0.85, rootInBass: false, omitted, tensions, … }
analyzeVoicing(notes);                          // { chord: 'Cmaj7/E', inversion: 1, position: 'open', drop, doubled, … }
findScalesForNotes(notes, { limit: 3 }).map(s => s.name);   // ['E phrygian', 'E minor', 'E harmonic minor']: the lowest note is the tonic
findScalesForNotes(notes, { tonic: 'C', limit: 2 }).map(s => s.name);   // ['C major', 'C lydian']
```

### Find the key of a melody

```typescript
const melody = ['A3', 'C4', 'E4', 'G#4', 'A4', 'E4', 'C4', 'A3'].map(n => parseNote(n));
KeyDetection.detect(melody, [2, 1, 1, 1, 2, 1, 1, 4])[0];   // { key: 'A Minor', confidence: 0.84 }
KeyDetection.detect(melody, undefined, { profile: 'temperley' });   // other profiles: KEY_PROFILES
```

Durations are optional and only their proportions matter.

### Write and play music

A `MusicStream` holds timed events; the exporters turn it into notation, and its notes carry frequencies for an audio engine.

```typescript
const stream = new MusicStream(TimeSignature.Common, 100);   // 4/4, 100 bpm
for (const n of ['D4', 'F#4', 'A4', 'D5']) stream.addEvent([parseNote(n)], Duration.Quarter);

const abc = ABCBridge.wrapInHeaders(ABCBridge.streamToABC(stream, { key: 'D major' }), 'Arpeggio', '4/4', 'D major');
const xml = streamToMusicXML(stream, { title: 'Arpeggio' }, { key: 'D major' });   // metadata, then options
const ly = streamToLilyPond(stream, { title: 'Arpeggio' }, { key: 'D major' });

stream.toJSON().events;   // [{ time: 0, duration: 1, notes: [{ frequency: 293.66, stepsFromBase: -7, name: 'D4' }], velocity: 0.8 }, …]
```

- `Duration` values are fractions of a whole note (`Duration.Quarter` is 0.25); event times and lengths are in beats of the time signature.
- `addEvent` appends at the cursor; `addEventAt(time, notes, duration)` places an event anywhere. An event with no notes is a rest.
- `streamToABC` returns the tune body; `wrapInHeaders` adds `X:`, `T:`, `M:`, `L:` and `K:`. Render it with abcjs.
- The exporters write one voice and throw `RangeError` on overlapping events.

### Names for an interface

```typescript
formatChordSymbol('Cmaj7', { style: 'symbols' });   // 'CΔ7' ('standard' Cmaj7, 'short' CM7)
formatChordSymbol('F#m7b5', { roots: 'solfege' });  // 'Fa#m7b5'
chordLongName('Cmaj7', 'es');                       // 'Do séptima mayor'
localizeNoteName('F#4', 'es');                      // 'Fa#4'
scaleName('D dorian', 'es');                        // 'Re dórico'
cadenceName('Deceptive Cadence (V -> vi)', 'es', { short: true });   // 'Rota'
substitutionTypeName('tritone', 'es');              // 'tritonal'
```

### Chords and scales on a fretboard

```typescript
const voicings = getFretboardVoicings(parseChordSymbol('G'), GUITAR_STANDARD);   // all voicings, lowest position first
voicings[0];   // { frets: [...], baseFret, tuning: ['E', 'A', 'D', 'G', 'B', 'E'], root: 'G' }; -1 is a muted string
getFretboardScalePositions(parseScaleSymbol('D dorian'), GUITAR_STANDARD);   // position boxes
```

Tunings: `GUITAR_STANDARD`, `GUITAR_DROPPED_D`, `GUITAR_OPEN_G`, `BASS_STANDARD`, `UKULELE_STANDARD`, `BANJO_OPEN_G`, or an array of open-string steps from A4, low to high. The results plug into the [notae](https://github.com/memoriainfinita/notae) renderers.

### Other tunings

```typescript
const scale = parseScaleSymbol('C major', TET31);
scale.getNotes().map(n => n.stepsFromBase);   // [-23, -18, -13, -10, -5, 0, 5, 8]
scale.getNotes().map(n => n.name);            // ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
scale.getNotes().map(n => n.frequency);       // Hz, for playback

const ii = parseChordSymbol('Dm7', TET31);
Harmony.analyzeProgression([ii, parseChordSymbol('G7', TET31)], 'C major').analysis.map(a => a.roman);   // ['ii7', 'V7']
ii.retune(WerckmeisterIII)?.getNotes().map(n => n.name);   // ['D4', 'F4', 'A4', 'C5'], tuned as Werckmeister did
parseScaleSymbol('A major', PtolemaicJI).getNotes().map(n => n.name);   // ['A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G#5', 'A5']

TemperamentAnalysis.compare([TET12, WerckmeisterIII, TET31], [[3, 2], [5, 4]]);   // cents and error per interval
```

## Versions

Releases are git tags with an entry in `CHANGELOG.md`. A release that changes the output of an existing function lists it under "Breaking changes"; pin a tag and read the entry before moving to the next one.
