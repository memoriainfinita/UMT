# Plan — Expansión teórica completa de UMT

**Fecha:** 2026-04-18 (v2 — incluye lagunas omitidas + huecos detectados en revisión)
**Objetivo:** cerrar todas las lagunas para que UMT sea una librería universal y profesional de teoría musical, cubriendo armonía, contrapunto, forma, rítmica, microtonalidad, análisis espectral, serialismo y tradiciones no-occidentales. 10 fases, breaking changes permitidos.

---

## Principios transversales

- **Breaking changes permitidos** en favor de APIs coherentes. Bump mayor al final de cada bloque (1-3, 4-6, 7-10).
- **Universalidad:** cada función nueva acepta `tuning: TuningSystem` cuando tenga sentido. Cuando la teoría aplica solo a 12-TET, guard explícito documentado.
- **Inmutabilidad:** escalas y acordes inmutables; funciones derivadas devuelven objetos nuevos.
- **Tests unitarios obligatorios** por cada función nueva en `tests/unit/`.
- **`public/example.html`** actualizado al final de cada fase con sección demostrativa.
- **Orden:** fase N no empieza hasta que N-1 pasa tests y se mergea.
- **Documentación cultural:** para tradiciones no-occidentales (ragas, maqamat, hexacordos), código + nota de que simplifica la tradición real.

---

## FASE 1 — Fundamentos ausentes (acordes diatónicos, características modales)

### 1.1 `Scale.getDiatonicChords(type)`

```ts
getDiatonicChords(type: 'triad' | 'seventh' = 'triad'): Chord[]
```

Apila terceras diatónicas sobre cada grado. Nombres canónicos vía `Harmony.detectChords` en 12-TET; structural labels en otros tunings.

### 1.2 `Scale.getChordOnDegree(degree, type)`

```ts
getChordOnDegree(degree: number, type: 'triad' | 'seventh' = 'triad'): Chord
```

Single-degree, 1-indexed.

### 1.3 `MODAL_DEGREE_QUALITIES`

Tabla estática en `dictionaries.ts` con cualidades de triadas y séptimas por grado para cada modo clásico. Generada programáticamente, congelada.

### 1.4 `Scale.getModalCharacteristics()`

```ts
interface ModalCharacteristics {
  characteristicDegrees: number[];
  characteristicIntervals: string[];
  brightness: number;                 // Lydian +1 ... Locrian -5
  avoidNotes: number[];
  parentScaleName?: string;
  parentModeDegree?: number;
}
```

### 1.5 `Scale.getParentScale()` / `Scale.getRelativeMode(targetModeName)`

Navegación dentro de la familia modal.

### 1.6 Tests Fase 1

Mínimo **40 tests** en `tests/unit/scale-diatonic.test.ts`, `scale-modal.test.ts`.

### Criterios de aceptación

- `C major` → `[C, Dm, Em, F, G, Am, Bdim]` y `[Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5]`.
- `D dorian` → `[Dm, Em, F, G, Am, Bdim, C]`.

---

## FASE 2 — Análisis de progresión + voice leading clásico completo

### 2.1 `Harmony.analyzeProgression(chords, keySymbol)`

```ts
interface ChordAnalysis {
  chord: Chord;
  roman: string;
  degree: number;
  function: 'T' | 'S' | 'D' | 'unknown';
  isDiatonic: boolean;
  isBorrowed: boolean;
  borrowedFrom?: string;
  isSecondary: boolean;
  secondaryTarget?: string;
  cadenceWithNext?: string;
  substitutionCandidate?: string;  // e.g. "tritone sub of V", "diatonic sub of I"
}

interface ModulationEvent {
  atIndex: number;
  fromKey: string;
  toKey: string;
  type: 'direct' | 'pivot' | 'enharmonic' | 'chromatic' | 'common-tone';
  pivotChord?: Chord;
}

static analyzeProgression(chords: Chord[], keySymbol: string): {
  analysis: ChordAnalysis[];
  modulations: ModulationEvent[];
  harmonicRhythm: number;           // avg chords per bar if time info available, else chord-change density
};
```

### 2.2 Cadencias faltantes

Añadir a `analyzeCadence`:
- Andaluza/Phrygian (iv–♭III–♭II–i).
- Modal plagal.
- Hiper-frigia (♭II–I).
- Picarda.
- 6/4 cadencial (I6/4 → V → I).

### 2.3 Voice leading avanzado — reescritura de `checkVoiceLeading`

Nueva firma:
```ts
checkVoiceLeading(
  chordA: Note[],
  chordB: Note[],
  ruleset: 'strict' | 'contemporary' | 'species' = 'strict',
  context?: {
    keySymbol?: string;
    chordA?: Chord;
    chordB?: Chord;
  }
): VoiceLeadingIssue[];
```

Tipos nuevos:
- `Leading Tone Unresolved`
- `7th Unresolved`
- `Forbidden Leap`
- `Hidden Fifth` / `Hidden Octave` / `Direct Fifth` / `Direct Octave`
- `False Relation` (cross-relation cromática)
- `Doubled Leading Tone`
- `Missing Third` / `Missing Root` / `Missing Fifth` (cuando violan convenciones)
- `Improper 6/4 Usage` (cadencial vs pedal vs pasaje vs arpegiado)

### 2.4 Reglas de doblado

Nuevo módulo en `harmony.ts`:
```ts
static checkDoubling(chord: Note[], chordSymbol: Chord, keySymbol?: string): DoublingIssue[];
```

Reglas: no doblar la sensible, preferir doblar tónica en I, no doblar 3ª de acorde mayor en contextos strict, reglas específicas de 6/4.

### 2.5 Detección de 6/4 cadencial

```ts
interface SixFourAnalysis {
  type: 'cadential' | 'pedal' | 'passing' | 'arpeggiated' | 'none';
  resolution?: Chord;
}
static analyzeSixFour(progression: Chord[], keySymbol: string, index: number): SixFourAnalysis;
```

### 2.6 Tests Fase 2

Mínimo **50 tests**.

---

## FASE 3 — Intermodalidad universal y modulación

### 3.1 `getBorrowedChords` reescrito (**breaking change**)

```ts
interface BorrowedChord {
  chord: Chord;
  sourceMode: string;
  brightness: number;
  function: 'T' | 'S' | 'D' | 'unknown';
  characteristic: boolean;
}

static getBorrowedChords(
  keySymbol: string,
  options?: {
    sources?: string[];
    tuning?: TuningSystem;
  }
): BorrowedChord[];
```

Cubre los 7 modos diatónicos + menor armónica + menor melódica + armónica mayor + Messiaen modes limitados.

### 3.2 `Harmony.findPivotChords(keyA, keyB)`

```ts
interface PivotChord {
  chord: Chord;
  functionInA: { degree: number; function: 'T' | 'S' | 'D' };
  functionInB: { degree: number; function: 'T' | 'S' | 'D' };
}
static findPivotChords(keyA: string, keyB: string, type: 'triad' | 'seventh' = 'seventh'): PivotChord[];
```

### 3.3 `Harmony.classifyModulation(chordsA, chordsB, keyA, keyB)`

Clasificación: direct | pivot | enharmonic | chromatic | common-tone.

### 3.4 `CircleOfFifths` extendido con modos

```ts
interface ModalKey { root: string; mode: string; parentMajorKey: string; }
static getModalKey(root: string, mode: string): ModalKey;
static getModalNeighbors(modalKey: ModalKey, radius?: number): ModalKey[];
static getModalDistance(keyA: ModalKey, keyB: ModalKey): number;
```

### 3.5 Sustitución armónica completa

Nuevo módulo `substitution.ts`:
```ts
interface SubstitutionOption {
  chord: Chord;
  type: 'tritone' | 'diatonic' | 'deceptive' | 'chromatic-mediant' | 'sus4' | 'modal';
  explanation: string;
}
static getSubstitutions(chord: Chord, keySymbol: string): SubstitutionOption[];
```

Incluye:
- Sustitución diatónica (iii por I, vi por I).
- Deceptive (V→vi en lugar de V→I).
- Chromatic mediants (relación por 3ª con acorde no diatónico).
- Sus4 substitution.
- Modal substitution (acorde modal paralelo).

### 3.6 Negative harmony sobre progresión

```ts
static getNegativeProgression(chords: Chord[], keyCenter: string): Chord[];
```

Aplica negative harmony a cada acorde manteniendo función.

### 3.7 Coltrane matrix / tonal axis

```ts
interface ColtraneAxis { root: string; majorThirds: [string, string, string]; }
static getColtraneAxis(key: string): ColtraneAxis;
static getColtraneSubstitutions(chord: Chord, keySymbol: string): Chord[];
```

### 3.8 Tests Fase 3

Mínimo **45 tests**.

---

## FASE 4 — Progresiones, secuencias y análisis formal

### 4.1 Dictionary `PROGRESSIONS`

`lib/music-theory/progressions.ts`:
- `ii-V-I`, `ii-V-i`
- `I-V-vi-IV`, `I-vi-IV-V`, `I-IV-V`
- `blues-12`, `blues-minor`, `blues-jazz`
- `rhythm-changes`
- `coltrane-changes`
- `andalusian`
- `pachelbel`
- `turnaround-jazz`
- `montgomery-ward` (bridge turnarounds)
- `bird-blues`
- `backdoor-ii-V`
- `giant-steps-cycle`

### 4.2 `Harmony.detectSequence(chords)`

Detecta: circle-of-5ths descendente/ascendente, parallel ascending/descending, Pachelbel, Romanesca.

### 4.3 Análisis formal

Nuevo módulo `form.ts`:
```ts
type FormType = 'AABA' | 'AAB' | 'ABAB' | 'ABAC' | 'binary' | 'ternary' | 'rondo' | 'sonata-allegro' | 'theme-variations' | 'blues-12' | 'strophic' | 'through-composed' | 'unknown';

interface FormAnalysis {
  type: FormType;
  sections: { label: string; start: number; end: number }[];
  confidence: number;
}

export class FormAnalyzer {
  static analyzeHarmonic(chords: Chord[], keySymbol: string, barsPerSection?: number): FormAnalysis;
  static detectReprise(chords: Chord[]): { start: number; length: number }[];
}
```

### 4.4 Retrograde/inversion de progresiones

```ts
static retrogradeProgression(chords: Chord[]): Chord[];
static invertProgression(chords: Chord[], axisNote: Note): Chord[];
```

### 4.5 Smooth voice leading métrica

```ts
static voiceLeadingSmoothness(progression: Chord[]): number;  // 0 = rough, 1 = smooth
```

### 4.6 Tests Fase 4

Mínimo **40 tests**.

---

## FASE 5 — Jazz / armonía contemporánea

### 5.1 Upper-structure triads

`upper-structures.ts`:
```ts
interface UpperStructure {
  triad: Chord;
  tensions: string[];
  overChord: Chord;
  label: string;
}
export function getUpperStructures(dominantChord: Chord): UpperStructure[];
```

6 USTs canónicas sobre dominante.

### 5.2 Slash chord / polychord analysis

```ts
type SlashType = 'inversion' | 'hybrid' | 'polychord' | 'upper-structure';
interface SlashAnalysis {
  type: SlashType;
  upperStructure?: Chord;
  lowerRoot?: Note;
  lowerChord?: Chord;       // for polychord
  resultingTensions?: string[];
}
static analyzeSlash(chord: Chord): SlashAnalysis;
```

### 5.3 Polychord notation parser

```ts
export function parsePolychord(symbol: string, tuning?: TuningSystem): { upper: Chord; lower: Chord };
```

Acepta `Fmaj7|Gmaj7`, `D/|C7`, etc.

### 5.4 Chord-scale completeness

```ts
static getAllContainingScales(chord: Chord): { scale: Scale; completeness: number }[];
```

Devuelve TODAS las escalas del diccionario que contienen los pitch classes del acorde.

### 5.5 Enharmonic respelling utility

```ts
interface RespellContext {
  keySymbol?: string;
  functionalRole?: 'secondary-dominant' | 'chromatic-mediant' | 'passing' | 'neighbor';
  direction?: 'ascending' | 'descending';
}
static respellChord(chord: Chord, context: RespellContext): Chord;
static respellNote(note: Note, context: RespellContext): Note;
```

### 5.6 Tests Fase 5

Mínimo **30 tests**.

---

## FASE 6 — Set theory, serialismo, contrapunto, análisis melódico

### 6.1 Set Theory — completo

- `SetTheory.getForteNumber(pcs): string` — tabla estática.
- `SetTheory.getZRelated(pcs): number[][]` — pares con mismo interval vector.
- `SetTheory.getComplement(pcs, octave?): number[]`.
- `SetTheory.Tn(pcs, n): number[]` — transposition operator.
- `SetTheory.TnI(pcs, n): number[]` — transposition + inversion.
- `SetTheory.isSubset(a, b): boolean` / `isSuperset(a, b): boolean`.
- `SetTheory.getAllSubsets(pcs, cardinality): number[][]`.

### 6.2 Serialismo / dodecafonismo

`twelve-tone.ts`:
```ts
export class ToneRow {
  constructor(row: number[]);
  getMatrix(): number[][];
  P(n: number): number[];
  I(n: number): number[];
  R(): number[];
  RI(n: number): number[];
  isAllInterval(): boolean;
  isCombinatorial(): 'P' | 'I' | 'RI' | null;
  getHexachords(): [number[], number[]];
}
```

### 6.3 Contrapunto

`counterpoint.ts`:
- `Counterpoint.checkSpecies(species: 1|2|3|4|5, cf: Note[], counter: Note[], mode: string): CounterpointIssue[]`.
- Incluye todas las especies (1-5) con reglas por especie.
- Quintas/octavas ocultas y directas.
- Movimiento contrario/oblicuo/paralelo/directo.

### 6.4 Canon / imitación

```ts
export class Canon {
  static detectImitation(voices: Note[][]): { voice: number; offset: number; transposition: number; inversion: boolean }[];
  static generateCanon(theme: Note[], interval: number, delay: number, inversion?: boolean): Note[][];
}
```

### 6.5 Análisis melódico

`melody.ts`:
```ts
export class MelodyAnalysis {
  static getContour(notes: Note[]): ('+' | '-' | '=')[];
  static getIntervalHistogram(notes: Note[]): Map<number, number>;
  static findMotifs(notes: Note[], minLength: number): Motif[];
  static reduce(notes: Note[], durations: number[]): Note[];
  static getContourReduction(notes: Note[]): Note[];  // peaks only
}
```

### 6.6 Schenker básico

`schenker.ts`:
```ts
export class Schenker {
  static findUrlinie(melody: Note[], keySymbol: string): { line: Note[]; type: '3-line' | '5-line' | '8-line' } | null;
  static getUrsatz(progression: Chord[], melody: Note[], keySymbol: string): { bass: Note[]; melody: Note[] } | null;
  static prolongationLevel(chords: Chord[], level: 'foreground' | 'middleground' | 'background'): Chord[];
}
```

Nota en docs: simplificación pedagógica; análisis schenkeriano real requiere criterio musicológico.

### 6.7 Tests Fase 6

Mínimo **70 tests**.

---

## FASE 7 — Rítmica avanzada, forma y metros

### 7.1 Transformaciones rítmicas

Extensión de `rhythm.ts`:
```ts
export class RhythmTransform {
  static augmentation(durations: number[], factor: number = 2): number[];
  static diminution(durations: number[], factor: number = 2): number[];
  static retrograde(durations: number[]): number[];
  static retrogradeInversion(pattern: RhythmPattern): RhythmPattern;
}
```

### 7.2 Detección rítmica avanzada

```ts
export class RhythmAnalysis {
  static detectHemiola(pattern: number[], timeSignature: TimeSignature): boolean;
  static detectSyncopation(pattern: number[], timeSignature: TimeSignature): number;  // syncopation index
  static detectTresillo(pattern: number[]): boolean;
  static detectCinquillo(pattern: number[]): boolean;
  static detectClave(pattern: number[]): 'son-3-2' | 'son-2-3' | 'rumba-3-2' | 'rumba-2-3' | 'bossa' | 'none';
}
```

### 7.3 Presets rítmicos / clave patterns

`clave-patterns.ts`:
- Son clave 3-2 / 2-3
- Rumba clave 3-2 / 2-3
- Bossa nova
- Tresillo
- Cinquillo
- Habanera
- Cascara
- Samba

### 7.4 Polymeter

```ts
export class Polymeter {
  constructor(meters: TimeSignature[], cycleBeats: number);
  getCyclePosition(beat: number): { meter: TimeSignature; positionInMeter: number };
}
```

### 7.5 Metric modulation

```ts
export class MetricModulation {
  static calculate(fromTempo: number, fromDuration: number, toDuration: number): number;  // new tempo
  static equivalence(fromMeter: TimeSignature, toMeter: TimeSignature, pivotDuration: number): { newTempo: number };
}
```

### 7.6 Isorhythm

```ts
export class Isorhythm {
  constructor(talea: number[], color: number[]);
  generate(totalBeats: number): { note: number; duration: number }[];
}
```

### 7.7 Harmonic rhythm

```ts
static analyzeHarmonicRhythm(chords: Chord[], durations: number[]): {
  averageChordDuration: number;
  variability: number;
  accelerations: number[];  // indices where harmonic rhythm speeds up
};
```

### 7.8 Tests Fase 7

Mínimo **45 tests**.

---

## FASE 8 — Bajo cifrado, escalas históricas, tradiciones no-occidentales

### 8.1 Bajo cifrado / figured bass

`figured-bass.ts`:
```ts
export class FiguredBass {
  static parse(symbol: string): { intervals: number[]; accidentals: Map<number, '#' | 'b' | 'n'> };
  static realize(bassNote: Note, figures: string, keySymbol: string, voices: number = 4): Chord;
  static fromChord(chord: Chord, bassNote: Note): string;
}
```

Soporta 3, 5, 6, 6/4, 7, 6/5, 4/3, 4/2, 9, 7/4/2 con accidentales.

### 8.2 Escalas históricas / griegas

Añadidas a `dictionaries.ts` con prefijo `greek-`:
- `greek-dorian`, `greek-phrygian`, `greek-lydian`, `greek-mixolydian`, `greek-hypodorian`, `greek-hypophrygian`, `greek-hypolydian`, `greek-hypomixolydian`.
- Documentadas con nota que difieren de los modos eclesiásticos.

### 8.3 Hexacordos de Guido

```ts
export class Hexachord {
  static readonly NATURALE = ['C', 'D', 'E', 'F', 'G', 'A'];
  static readonly DURUM = ['G', 'A', 'B', 'C', 'D', 'E'];
  static readonly MOLLE = ['F', 'G', 'A', 'Bb', 'C', 'D'];
  static getSyllable(note: Note, hexachord: 'naturale' | 'durum' | 'molle'): 'ut' | 're' | 'mi' | 'fa' | 'sol' | 'la' | null;
  static mutate(fromHex: string, toHex: string, sharedNote: Note): { syllable: string };
}
```

### 8.4 Musica ficta

```ts
static applyMusicaFicta(melody: Note[], mode: string): Note[];  // apply typical chromatic alterations for cadences
```

### 8.5 Ragas básicos

`ragas.ts`:
```ts
interface Raga {
  name: string;
  aroha: number[];       // ascending pattern in semitones
  avaroha: number[];     // descending pattern
  vadi: number;          // primary note (degree)
  samvadi: number;       // secondary note
  thaat: string;         // parent scale family
  time?: string;         // traditional time of performance
  description: string;
}
export const RAGAS: Record<string, Raga>;  // Yaman, Bhairav, Bhairavi, Malkauns, Darbari Kanada, Kafi, Khamaj, Todi, Desh, Puriya Dhanashree
```

Nota documental: simplificación; raga real incluye ornamentación (gamaka) no modelada.

### 8.6 Maqamat básicos

`maqamat.ts`:
```ts
interface Maqam {
  name: string;
  ajnas: Jins[];    // tetrachords that compose it
  notes: number[];   // full scale in quarter-tones (24-EDO approximation)
  gharsa?: string;   // emotional character
}
interface Jins {
  name: string;
  intervals: number[];  // in quarter-tones
}
export const MAQAMAT: Record<string, Maqam>;  // Rast, Bayati, Hijaz, Nahawand, Kurd, Saba, Sikah, Huzam
```

Usa `EDO(24)` como tuning base.

### 8.7 Solfège mapping

```ts
export class Solfege {
  static fixedDo(note: Note): string;      // C = do always
  static movableDo(note: Note, keySymbol: string): string;  // do = tonic
  static fromSolfege(syllable: string, keySymbol: string, mode: 'fixed' | 'movable'): Note;
}
```

### 8.8 Tests Fase 8

Mínimo **45 tests**.

---

## FASE 9 — Microtonal y espectral avanzado

### 9.1 Modos de Messiaen completos

`dictionaries.ts` — etiquetar explícitamente como "Messiaen modes of limited transposition":
- Mode 1: whole-tone (ya existe).
- Mode 2: octatonic/half-whole diminished (ya existe).
- Mode 3: augmented (ya existe, confirmar etiquetado).
- Mode 4: `[1, 1, 3, 1, 1, 1, 3, 1]`
- Mode 5: `[1, 4, 1, 1, 4, 1]`
- Mode 6: `[2, 2, 1, 1, 2, 2, 1, 1]`
- Mode 7: `[1, 1, 1, 2, 1, 1, 1, 1, 2, 1]`

### 9.2 Tonnetz

`tonnetz.ts`:
```ts
interface TonnetzPosition { x: number; y: number; note: Note; }
export class Tonnetz {
  static getPosition(note: Note, origin?: Note): TonnetzPosition;
  static pathBetween(a: Chord, b: Chord): TonnetzPosition[];
  static neighbors(note: Note): TonnetzPosition[];
}
```

### 9.3 MOS scales

`mos.ts`:
```ts
export class MOS {
  static generate(generator: number, period: number, size: number): number[];
  static isMOS(scale: number[]): boolean;
  static getMOSFamily(generator: number, period: number, maxSize: number): number[][];
}
```

### 9.4 Comma pumps

```ts
export class CommaPump {
  static detect(chords: Chord[], tuning: JustIntonation): { drift: number; commaType?: 'syntonic' | 'pythagorean' | 'septimal' };
}
```

### 9.5 Xenharmonic chord detection

```ts
export class Xen {
  static detectNeutralTriad(chord: Chord): boolean;
  static detectOtonal(chord: Chord, harmonicLimit: number): { isOtonal: boolean; harmonics: number[] };
  static detectUtonal(chord: Chord, harmonicLimit: number): { isUtonal: boolean; subharmonics: number[] };
  static getEssentiallyJustChord(chord: Chord, tuning: JustIntonation): { name: string; ratios: [number, number][] };
}
```

### 9.6 Tempered JI mapping

```ts
static mapJItoEDO(jiRatio: [number, number], edoSize: number): { step: number; errorCents: number };
static bestEDOFor(jiRatios: [number, number][], maxSize?: number): { size: number; totalError: number };
```

### 9.7 Overtone scales

Añadir a `presets.ts`:
- `HarmonicSeries(rootHz, fromHarmonic, toHarmonic)` — escala de segmento de la serie armónica.
- `Harmonics1to16`, `Harmonics8to16`, `Harmonics16to32`.

### 9.8 Temperament comparison

`temperament-analysis.ts`:
```ts
export class TemperamentAnalysis {
  static compare(tunings: TuningSystem[], intervals: [number, number][]): ComparisonTable;
  static detectWolfIntervals(tuning: TuningSystem, threshold: number = 25): { interval: number; errorCents: number }[];
  static getCommas(): { name: string; ratio: [number, number]; cents: number }[];  // Pythagorean, syntonic, schisma, diesis, diaschisma
  static getUnisonVectors(tuning: JustIntonation): [number, number][];
}
```

### 9.9 Análisis espectral básico

`spectral.ts`:
```ts
export class Spectral {
  static overtoneSeries(fundamental: number, count: number = 16): number[];  // Hz
  static combinationTones(f1: number, f2: number, order: number = 2): { sum: number[]; difference: number[] };
  static beatFrequency(f1: number, f2: number): number;
  static roughnessPlompLevelt(frequencies: number[], amplitudes?: number[]): number;
  static consonanceCurve(intervalCents: number): number;  // Sethares/Plomp-Levelt-based
  static sensoryConsonance(chord: Chord): number;
}
```

### 9.10 Tymoczko OPTIC voice leading

`voice-leading-geometry.ts`:
```ts
export class VoiceLeadingGeometry {
  static OPTIC(chord: number[]): { O: number[]; P: number[]; T: number[]; I: number[]; C: number[] };
  static efficientVoiceLeading(a: Chord, b: Chord): { paths: Note[][]; totalDistance: number };
  static chordGraphDistance(a: Chord, b: Chord): number;
}
```

### 9.11 Tests Fase 9

Mínimo **60 tests**.

---

## FASE 10 — Notación y exportación

### 10.1 MusicXML export

`musicxml-bridge.ts`:
```ts
export function streamToMusicXML(stream: MusicStream, metadata?: MusicXMLMetadata): string;
export function chordToMusicXML(chord: Chord): string;
export function scaleToMusicXML(scale: Scale, octaves?: number): string;
```

Incluye key signatures, time signatures, clave, dinámicas básicas, articulación.

### 10.2 LilyPond export

`lilypond-bridge.ts`:
```ts
export function streamToLilyPond(stream: MusicStream, metadata?: LPMetadata): string;
export function chordToLilyPond(chord: Chord): string;
export function scaleToLilyPond(scale: Scale): string;
```

### 10.3 ABC mejorado

Ampliar `abc-bridge.ts`:
- Key signature completo según tonalidad del stream.
- Meter shifts dentro del stream.
- Chord symbols como anotaciones `"Cm7"`.
- Tuplets (tresillos, quintillos).

### 10.4 Tests Fase 10

Mínimo **30 tests**.

---

## Cronograma revisado

| Fase | Módulos tocados | Tests nuevos | Sesiones |
|---|---|---|---|
| 1 | scale.ts, chord.ts, dictionaries.ts | 40 | 1-2 |
| 2 | harmony.ts | 50 | 2-3 |
| 3 | harmony.ts, circle.ts, substitution.ts (nuevo) | 45 | 2-3 |
| 4 | progressions.ts, form.ts (nuevos), harmony.ts | 40 | 2 |
| 5 | upper-structures.ts (nuevo), chord.ts, parser.ts | 30 | 1-2 |
| 6 | set-theory.ts, twelve-tone.ts, counterpoint.ts, melody.ts, schenker.ts (nuevos) | 70 | 3-4 |
| 7 | rhythm.ts ampliado, clave-patterns.ts (nuevo) | 45 | 2 |
| 8 | figured-bass.ts, ragas.ts, maqamat.ts, solfege.ts, hexachord.ts, dictionaries.ts | 45 | 2-3 |
| 9 | tonnetz.ts, mos.ts, xen.ts, spectral.ts, temperament-analysis.ts, voice-leading-geometry.ts (nuevos), dictionaries.ts | 60 | 3-4 |
| 10 | musicxml-bridge.ts, lilypond-bridge.ts (nuevos), abc-bridge.ts | 30 | 1-2 |

**Total:** ~455 tests nuevos, 19-27 sesiones estimadas.

---

## Breaking changes documentados

1. `Harmony.getBorrowedChords` → devuelve `BorrowedChord[]` (fase 3).
2. `Harmony.checkVoiceLeading` → firma ampliada con `context` y ruleset `'species'` (fase 2).
3. Nuevos módulos exportados en `index.ts` — cada fase añade exports.

Bump versión:
- `1.x.x` → `2.0.0` al terminar fase 3 (core armonía moderna completo).
- `2.x.x` → `3.0.0` al terminar fase 6 (análisis clásico + académico completo).
- `3.x.x` → `4.0.0` al terminar fase 9 (microtonal + espectral completo).

---

## Orden de trabajo dentro de cada fase

1. Actualizar este plan si cambia alcance.
2. Escribir tests primero (rojo) — al menos los casos de referencia.
3. Implementar hasta pasar tests (verde).
4. Revisar API, refactor si hay fricción.
5. `npm run build:umt` — verificar bundle.
6. Actualizar `public/example.html` con sección demostrativa.
7. Actualizar `state.md` con entrada en History.
8. Commit atómico en inglés.

---

## Notas de alcance

- **Ragas, maqamat, hexacordos, musica ficta, escalas griegas**: inclusión deliberada. El objetivo "universal" obliga a cubrirlos, aunque con nota documental de simplificación frente a la tradición viva.
- **Schenker**: incluido como herramienta pedagógica. El análisis real requiere criterio humano; la librería ofrece andamiaje.
- **Tymoczko OPTIC**: implementación completa, incluye base académica reciente. Acompañar con referencia al paper.
- **Ragas con gamaka, maqamat con mīzān, contrapunto renacentista profundo, análisis orquestal/timbral**: explícitamente fuera del alcance; documentar en README qué NO hace la librería.
