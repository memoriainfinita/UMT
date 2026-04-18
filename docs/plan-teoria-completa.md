# Plan — Expansión teórica completa de UMT

**Fecha:** 2026-04-18
**Objetivo:** cerrar las lagunas detectadas en el análisis de teoría armónica para que UMT sea una librería universal y profesional. 6 fases, breaking changes permitidos para mejorar la API.

---

## Principios transversales

- **Breaking changes permitidos** en favor de APIs coherentes. Bumpear versión mayor al final.
- **Universalidad:** cada función nueva acepta `tuning: TuningSystem` cuando tenga sentido. Cuando la teoría solo aplica a 12-TET, guard explícito y documentado.
- **Inmutabilidad:** las escalas y acordes son inmutables; las funciones derivadas devuelven objetos nuevos.
- **Tests unitarios obligatorios** por cada función nueva en `tests/unit/`.
- **Actualizar `public/example.html`** al final de cada fase con una sección demostrativa.
- **Orden:** Fase N no empieza hasta que N-1 pasa tests y se mergea.

---

## FASE 1 — Fundamentos ausentes (acordes diatónicos, características modales)

### 1.1 `Scale.getDiatonicChords(type)`

**Firma:**
```ts
getDiatonicChords(type: 'triad' | 'seventh' = 'triad'): Chord[]
```

**Comportamiento:** construye un acorde sobre cada grado de la escala apilando terceras de la propia escala (terceras diatónicas, no cromáticas). Devuelve un array del tamaño del `stepPattern`. Los nombres de los acordes se derivan por detección de cualidad (`Harmony.detectChords` pero reutilizando lógica interna para no depender de 12-TET en estructuras; en tunings no-12-TET devuelve cualidades best-effort).

**Detalles:**
- `type: 'triad'` → apila grados 1-3-5 de cada grado.
- `type: 'seventh'` → apila grados 1-3-5-7.
- Para escalas no heptatónicas (pentatónicas, blues, bebop 8 notas), apila también saltando un grado, documentando que el resultado es "acordes derivados de la escala", no tríadas funcionales.
- En 12-TET, asigna nombre canónico (Cmaj7, Dm7...) usando `Harmony.detectChords` sobre las pitch classes.
- En no-12-TET, el nombre refleja la estructura intervalica (p.ej. `Scale Degree 1 triad`).

### 1.2 `Scale.getChordOnDegree(degree, type)`

**Firma:**
```ts
getChordOnDegree(degree: number, type: 'triad' | 'seventh' = 'triad'): Chord
```

Variante single-degree. 1-indexed. Throw si `degree` fuera de rango.

### 1.3 Mapeo modo → cualidades de grado

**Ubicación:** `dictionaries.ts` — nuevo export `MODAL_DEGREE_QUALITIES`.

```ts
export const MODAL_DEGREE_QUALITIES: Record<string, {
  triads: ('M' | 'm' | 'dim' | 'aug')[];
  sevenths: ('maj7' | 'm7' | '7' | 'm7b5' | 'dim7' | 'mM7' | 'augM7' | 'aug7')[];
}>;
```

Cubre: ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian, harmonic minor, melodic minor, harmonic major. Calculado, no escrito a mano (script one-shot que itera `getDiatonicChords` y congela el resultado).

### 1.4 `Scale.getModalCharacteristics()`

**Firma:**
```ts
interface ModalCharacteristics {
  characteristicDegrees: number[];   // degrees that distinguish this mode from Ionian (major)
  characteristicIntervals: string[]; // human names: "b2", "#4", "b6", "b7"...
  brightness: number;                 // Lydian = +1, Ionian = 0, ... Locrian = -5
  avoidNotes: number[];              // scale degrees (1-indexed) considered "avoid" in chord-scale theory
  parentScaleName?: string;          // e.g. "major" for Dorian — null for non-derived scales
  parentModeDegree?: number;         // 2 for Dorian within major
}

getModalCharacteristics(): ModalCharacteristics;
```

**Tabla de brillo** (solo para los 7 modos diatónicos y modos de menor melódica/armónica reconocidos):

| Modo | Brillo |
|---|---|
| Lydian | +1 |
| Ionian | 0 |
| Mixolydian | -1 |
| Dorian | -2 |
| Aeolian | -3 |
| Phrygian | -4 |
| Locrian | -5 |

Para escalas no modales clásicas, devuelve `brightness: 0` y warning en docs.

**Avoid notes** (tabla estática para modos principales, `null` para el resto):
- Ionian: 4
- Dorian: 6
- Phrygian: 2, 6
- Lydian: (ninguna)
- Mixolydian: 4
- Aeolian: 6
- Locrian: 2

### 1.5 `Scale.getParentScale()` y `Scale.getRelativeMode(targetModeName)`

```ts
getParentScale(): Scale | null;
getRelativeMode(targetModeName: string): Scale | null;
```

- `getParentScale()`: si es un modo derivado, devuelve la escala padre en su raíz natural. D Dorian → C Major. Devuelve `null` si no es un modo diatónico/armónico-menor/melódico-menor.
- `getRelativeMode('phrygian')`: desde D Dorian, navegar dentro de la familia Major hasta Phrygian (E Phrygian). Devuelve `null` si el modo destino no pertenece a la misma familia.

### 1.6 Tests Fase 1

- `tests/unit/scale-diatonic.test.ts` — todos los modos clásicos × triads/sevenths, verificar cualidades exactas.
- `tests/unit/scale-modal.test.ts` — características, brillo, parent, relative mode.
- Mínimo 40 tests.

### Criterios de aceptación Fase 1

- `Scale.getDiatonicChords()` devuelve para `C major` → `[C, Dm, Em, F, G, Am, Bdim]` (triads) y `[Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7b5]` (sevenths).
- Para `D dorian` → `[Dm, Em, F, G, Am, Bdim, C]` (triads).
- Todos los tests pasan.
- Demo actualizada con sección nueva.

---

## FASE 2 — Análisis de progresión completa

### 2.1 `Harmony.analyzeProgression(chords, keySymbol)`

**Firma:**
```ts
interface ChordAnalysis {
  chord: Chord;
  roman: string;                         // "ii7", "V7/V", "bVI", "subV7"
  degree: number;                         // 1-7
  function: 'T' | 'S' | 'D' | 'unknown';  // Tonic, Subdominant, Dominant
  isDiatonic: boolean;
  isBorrowed: boolean;
  borrowedFrom?: string;                 // "parallel minor (aeolian)", "harmonic minor"...
  isSecondary: boolean;                  // V/x, vii°/x
  secondaryTarget?: string;              // "ii" if it's V7/ii
  cadenceWithNext?: string;              // from analyzeCadence
}

static analyzeProgression(
  chords: Chord[],
  keySymbol: string
): { analysis: ChordAnalysis[]; modulations: ModulationEvent[] };

interface ModulationEvent {
  atIndex: number;
  fromKey: string;
  toKey: string;
  type: 'direct' | 'pivot' | 'enharmonic' | 'chromatic' | 'common-tone';
  pivotChord?: Chord;
}
```

**Criterios de función:**
- T = grados 1, 3, 6 (en mayor) / 1, 3 (en menor)
- S = grados 2, 4
- D = grados 5, 7
- Modal analysis para modos no mayores (Dorian, Phrygian, etc.) — tabla análoga.

### 2.2 Cadencias faltantes

Añadir a `Harmony.analyzeCadence`:
- **Cadencia andaluza/frigia** iv–♭III–♭II–i (en Phrygian) → retorna `'Andalusian Cadence'`
- **Cadencia plagal modal** (IV–I con escala modal) → `'Modal Plagal Cadence'`
- **Cadencia hiper-frigia** ♭II–I → `'Phrygian Half Cadence'`
- **Cadencia picarda** (menor → tónica mayor final) → `'Picardy Third'`

### 2.3 Resolución de voces

En `Harmony.checkVoiceLeading`, nuevo tipo de issue:
```ts
type: 'Leading Tone Unresolved' | '7th Unresolved' | 'Forbidden Leap'
```

- Sensible (grado 7 de la tonalidad) debe resolver a tónica por grado ascendente.
- 7ª de acorde debe descender por grado.
- Saltos prohibidos en strict: tritono, 7ª mayor, intervalos aumentados melódicos.

Requiere pasar la tonalidad como parámetro nuevo:
```ts
checkVoiceLeading(
  chordA: Note[],
  chordB: Note[],
  ruleset: 'strict' | 'contemporary' = 'strict',
  context?: { keySymbol?: string; chordB?: Chord }
): VoiceLeadingIssue[];
```

### 2.4 Tests Fase 2

- `tests/unit/harmony-progression.test.ts` — progresiones clásicas (ii-V-I, I-vi-IV-V, Cadencia andaluza, blues 12).
- `tests/unit/harmony-cadences.test.ts` — todas las cadencias nuevas.
- `tests/unit/voice-leading.test.ts` — resolución sensible/7ª/saltos.
- Mínimo 35 tests.

### Criterios de aceptación Fase 2

- `analyzeProgression(parseRomanProgression("ii7 V7 Imaj7", "C major"), "C major")` identifica funciones S→D→T y cadencia auténtica.
- `analyzeProgression` sobre `Am-G-F-E` en `A phrygian` identifica cadencia andaluza.
- Voice leading detecta séptima no resuelta en `G7 → Cmaj7` sin bajar el F.

---

## FASE 3 — Intermodalidad universal y modulación

### 3.1 `getBorrowedChords` reescrito (**breaking change**)

**Nueva firma:**
```ts
interface BorrowedChord {
  chord: Chord;
  sourceMode: string;      // "aeolian", "phrygian", "dorian", "harmonic minor"...
  brightness: number;       // relative to the tonic key
  function: 'T' | 'S' | 'D' | 'unknown';
  characteristic: boolean;  // true if the chord contains a characteristic note of sourceMode
}

static getBorrowedChords(
  keySymbol: string,
  options?: {
    sources?: string[];          // modes to borrow from; default: all 7 diatonic + harmonic/melodic minor + harmonic major
    tuning?: TuningSystem;
  }
): BorrowedChord[];
```

**Implementación:** iterar sobre modos paralelos, generar diatonic chords, excluir los que coincidan con la escala original, etiquetar origen y brillo.

### 3.2 `Harmony.findPivotChords(keyA, keyB)`

```ts
interface PivotChord {
  chord: Chord;
  functionInA: { degree: number; function: 'T' | 'S' | 'D' | 'unknown' };
  functionInB: { degree: number; function: 'T' | 'S' | 'D' | 'unknown' };
}

static findPivotChords(keyA: string, keyB: string, type: 'triad' | 'seventh' = 'seventh'): PivotChord[];
```

Devuelve acordes diatónicos comunes a ambas tonalidades con sus funciones en cada una.

### 3.3 `Harmony.classifyModulation(chordsA, chordsB, keyA, keyB)`

```ts
static classifyModulation(
  chordsA: Chord[],
  chordsB: Chord[],
  keyA: string,
  keyB: string
): { type: 'direct' | 'pivot' | 'enharmonic' | 'chromatic' | 'common-tone'; pivot?: Chord; commonTones?: Note[] };
```

Lógica:
- Si último acorde de A pertenece a B → `pivot`.
- Si hay notas comunes literales entre último de A y primero de B → `common-tone`.
- Si hay reinterpretación enarmónica (acorde idéntico con distinto nombre funcional, p.ej. Ger+6 ↔ V7) → `enharmonic`.
- Si transición por semitonos en raíz sin pivote → `chromatic`.
- Si nada de lo anterior → `direct`.

### 3.4 `CircleOfFifths` extendido con modos

```ts
interface ModalKey {
  root: string;
  mode: string;
  parentMajorKey: string;
}

static getModalKey(root: string, mode: string): ModalKey;
static getModalNeighbors(modalKey: ModalKey, radius?: number): ModalKey[];
static getModalDistance(keyA: ModalKey, keyB: ModalKey): number;
```

Distancia modal = distancia entre las tonalidades padre + diferencia de brillo modal.

### 3.5 Tests Fase 3

- `tests/unit/borrowed-chords.test.ts` — préstamos desde 10+ modos paralelos.
- `tests/unit/pivot-chords.test.ts` — pivotes entre tonalidades cercanas y lejanas.
- `tests/unit/modulation.test.ts` — clasificación de modulaciones.
- Mínimo 30 tests.

### Criterios de aceptación Fase 3

- `getBorrowedChords('C major')` devuelve préstamos desde los 6 modos paralelos restantes + melódica/armónica/armónica mayor, con `sourceMode` y `brightness` correctos.
- `findPivotChords('C major', 'G major')` devuelve al menos G, Em, C, Am.
- `classifyModulation` distingue pivote vs directa vs cromática en ejemplos clásicos.

---

## FASE 4 — Progresiones y secuencias

### 4.1 Dictionary `PROGRESSIONS`

**Nuevo archivo:** `lib/music-theory/progressions.ts`

```ts
interface ProgressionPreset {
  name: string;
  roman: string;           // "ii7 V7 Imaj7"
  keyType: 'major' | 'minor' | 'modal';
  description: string;
}

export const PROGRESSIONS: Record<string, ProgressionPreset>;
```

Contenido inicial:
- `ii-V-I`, `ii-V-i`
- `I-V-vi-IV` (pop axis)
- `I-vi-IV-V` (50s)
- `I-IV-V` (blues simple)
- `blues-12` (12-bar blues)
- `rhythm-changes` (I-vi-ii-V × 8 + bridge III7-VI7-II7-V7)
- `coltrane-changes` (Bmaj7-D7-Gmaj7-Bb7-Ebmaj7-F#7-Bmaj7 — relative to C)
- `andalusian` (i-bVII-bVI-V)
- `pachelbel` (I-V-vi-iii-IV-I-IV-V)
- `turnaround-jazz` (I-VI7-ii7-V7)

Función helper: `getProgression(name, key, tuning?) → Chord[]`.

### 4.2 `Harmony.detectSequence(chords)`

```ts
interface SequenceMatch {
  type: 'circle-of-fifths-descending' | 'circle-of-fifths-ascending' | 'parallel-ascending' | 'parallel-descending' | 'pachelbel';
  startIndex: number;
  length: number;
  intervalPattern: number[];
}

static detectSequence(chords: Chord[]): SequenceMatch[];
```

### 4.3 Tests Fase 4

- `tests/unit/progressions.test.ts` — todos los presets generan correctamente.
- `tests/unit/sequences.test.ts` — detecta cada tipo en ejemplos canónicos.
- Mínimo 25 tests.

---

## FASE 5 — Jazz / armonía contemporánea

### 5.1 Upper-structure triads

**Nuevo archivo:** `lib/music-theory/upper-structures.ts`

```ts
interface UpperStructure {
  triad: Chord;           // the triad voiced on top
  tensions: string[];      // "9", "#11", "b13"...
  overChord: Chord;        // the base dominant
  label: string;           // "UST: D/G7 = G7(9, #11, 13)"
}

export function getUpperStructures(dominantChord: Chord): UpperStructure[];
```

Devuelve las 6 USTs canónicas (I, II, bIII, III, bV, V triads sobre dominante) evaluando qué tensiones se generan.

### 5.2 Hybrid / slash chord analysis

```ts
interface SlashAnalysis {
  type: 'inversion' | 'hybrid' | 'polychord' | 'upper-structure';
  upperStructure?: Chord;
  lowerRoot?: Note;
  resultingTensions?: string[];
}

static analyzeSlash(chord: Chord): SlashAnalysis;
```

- `inversion`: bajo es nota del acorde.
- `hybrid`: triada sobre bajo que no es nota del acorde, sin 3ª del bajo (p.ej. `G/F` = F Lydian sound).
- `polychord`: dos acordes completos apilados.
- `upper-structure`: caso específico sobre dominante.

### 5.3 Tests Fase 5

Mínimo 15 tests.

---

## FASE 6 — Extensiones especializadas

### 6.1 Set theory — Forte names, Z-relations, complement

- `SetTheory.getForteNumber(pitchClasses): string` — tabla estática de 12 × Forte prime forms.
- `SetTheory.getZRelated(pitchClasses): number[][]` — buscar set con mismo vector intervalico.
- `SetTheory.getComplement(pitchClasses, octave?): number[]` — pc classes no presentes.

### 6.2 Serialismo / dodecafonismo

**Nuevo archivo:** `lib/music-theory/twelve-tone.ts`

```ts
export class ToneRow {
  constructor(row: number[]);  // 12 unique pitch classes 0-11
  getMatrix(): number[][];     // 12x12 matrix
  P(n: number): number[];       // prime transposition
  I(n: number): number[];       // inversion
  R(): number[];                // retrograde
  RI(n: number): number[];      // retrograde inversion
  isAllInterval(): boolean;     // all 11 intervals present
  isCombinatorial(): 'P' | 'I' | 'RI' | null;  // hexachordal combinatoriality
}
```

### 6.3 Contrapunto

**Nuevo archivo:** `lib/music-theory/counterpoint.ts`

- `Counterpoint.checkFirstSpecies(cf: Note[], counter: Note[]): CounterpointIssue[]`
- Soporte inicial: especies 1 y 2 en modo mayor/menor.
- Verifica: consonancias permitidas, paralelas prohibidas, movimiento directo a perfecta, principio/fin en octava/unísono.

### 6.4 Microtonal avanzado

**Nuevo archivo:** `lib/music-theory/xen.ts`

- `Tonnetz` — coordenadas (x, y) para cada nota en retícula de 3ªs/5ªs.
- `MOS` — generación de escalas Moment of Symmetry dado un generador y un período.
- `CommaPump` — detectar secuencia de acordes que acumula un error microtonal en JI.

### 6.5 Notación avanzada

- `musicxml-bridge.ts` — exportar `MusicStream` a MusicXML.
- `lilypond-bridge.ts` — exportar a LilyPond.

### 6.6 Análisis melódico

**Nuevo archivo:** `lib/music-theory/melody.ts`

```ts
export class MelodyAnalysis {
  static getContour(notes: Note[]): ('+' | '-' | '=')[];
  static getIntervalHistogram(notes: Note[]): Map<number, number>;
  static findMotifs(notes: Note[], minLength: number): Motif[];
  static reduce(notes: Note[], durations: number[]): Note[]; // structural tones
}
```

### 6.7 Tests Fase 6

Mínimo 60 tests distribuidos.

---

## Cronograma estimado

| Fase | Archivos tocados | Tests nuevos | Sesiones estimadas |
|---|---|---|---|
| 1 | scale.ts, dictionaries.ts, chord.ts | 40 | 1-2 |
| 2 | harmony.ts | 35 | 2 |
| 3 | harmony.ts, circle.ts | 30 | 2 |
| 4 | progressions.ts (nuevo), harmony.ts | 25 | 1-2 |
| 5 | upper-structures.ts (nuevo), chord.ts | 15 | 1 |
| 6 | twelve-tone.ts, counterpoint.ts, xen.ts, melody.ts, musicxml-bridge.ts, lilypond-bridge.ts | 60 | 3-4 |

**Total:** ~205 tests nuevos, 10-13 sesiones.

---

## Breaking changes documentados

1. `Harmony.getBorrowedChords` cambia firma de retorno `Chord[]` → `BorrowedChord[]`.
2. `Harmony.checkVoiceLeading` añade parámetro opcional `context` — aditivo, no breaking.
3. Nuevos exports en `index.ts` por cada módulo nuevo.

Bump versión: `1.x.x` → `2.0.0` al terminar fase 3.

---

## Orden de trabajo recomendado para cada fase

1. Actualizar este plan si cambia alcance.
2. Escribir tests primero (rojo) — al menos los casos de referencia.
3. Implementar hasta pasar tests (verde).
4. Revisar API, refactor si hay fricción.
5. `npm run build:umt` — verificar que bundle compila.
6. Actualizar `public/example.html` con sección demostrativa.
7. Actualizar `state.md` con entrada en History.
8. Commit atómico en inglés.
