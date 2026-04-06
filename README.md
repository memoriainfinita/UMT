# Universal Music Theory (UMT)

Una librería de teoría musical universal escrita en TypeScript, diseñada para ser matemáticamente rigurosa, modular y capaz de manejar desde armonía clásica y jazzística hasta sistemas microtonales y teoría de conjuntos.

## Características Principales

- **Sistemas de Afinación (Tuning Systems)**: Soporte nativo para 12-TET, 24-TET (cuartos de tono), 31-TET (meantone), Just Intonation (5-limit, Ptolemaic), Werckmeister III, Bohlen-Pierce, y afinaciones personalizadas (EDO).
- **Parser de Archivos Scala (`.scl`)**: Importa cualquier sistema de afinación microtonal del mundo directamente desde el formato estándar Scala.
- **Notas e Intervalos**: Cálculos de frecuencia precisos, nombres enarmónicos y distancias interválicas exactas en cents y ratios.
- **Acordes y Voicings**: Soporte para tríadas, cuatríadas, acordes extendidos (9, 11, 13), alterados, suspendidos, y voicings avanzados (`drop2`, `drop3`, `quartal`, `rootless`).
- **Escalas y Modos**: Diccionario extenso de escalas (mayores, menores, modos griegos, exóticas como Hirajoshi, Double Harmonic, Enigmatic) y derivación modal.
- **Armonía Avanzada**: 
  - Intercambio Modal y Acordes Prestados.
  - Armonía Negativa.
  - Sustitución Tritonal.
  - Análisis de Cadencias y Sugerencia de Escalas.
- **Detector de Acordes (Chord Guesser)**: Identifica el nombre de un acorde a partir de un conjunto de notas.
- **Conducción de Voces (Voice Leading)**: 
  - Transiciones suaves entre acordes (`smoothTransition`).
  - **Auditor Clásico**: Detecta quintas paralelas, octavas paralelas, cruce de voces y superposición.
- **Teoría de Conjuntos (Set Theory)**: Análisis matemático de Pitch-Class Sets (Forma Normal, Forma Prima, Vector Interválico).
- **Ritmo y Métrica (Rhythm)**: Soporte para compases complejos, aditivos (ej. 3+2+2/8), tuplos y generación de polirritmos euclidianos.
- **Puente Visual (ABCBridge)**: Exporta objetos de la librería a notación ABC para renderizar partituras en el navegador.
- **Círculo de Quintas**: Navegación por armaduras de clave, relativos y dominantes.
- **Parsers de Texto**: Interpreta cifrado americano (`Cmaj9/E`), progresiones en números romanos (`ii7 - V7/ii - subV7 - Imaj7`) y nombres de escalas (`D dorian`).

## Instalación

**En el navegador (Script tag)**
Descarga `umt.js` e inclúyelo en tu HTML. Expone el objeto global `UMT`.
```html
<script src="umt.js"></script>
```

**En proyectos Node/Bundlers (ESM / TypeScript)**
Copia la carpeta `lib/music-theory` a tu proyecto.
```typescript
import { Note, parseChordSymbol, TET12, Harmony, SetTheory } from './lib/music-theory';
```

## Ejemplos de Uso

### 1. Notas y Sistemas de Afinación

```typescript
import { Note, TET12, FiveLimitJI, parseScala } from './lib/music-theory';

// Nota en 12-TET estándar (A4 = 440Hz)
const a4 = new Note(TET12, 0); 
console.log(a4.frequency); // 440

// Nota en Just Intonation
const a4_ji = new Note(FiveLimitJI, 0);

// Cargar un archivo Scala (.scl)
const pelogScl = `! pelog.scl
!
Javanese Pelog scale
7
!
120.0
250.0
400.0
550.0
700.0
850.0
1000.0`;
const pelogTuning = parseScala(pelogScl);
const pelogNote = new Note(pelogTuning, 2);
```

### 2. Acordes y Voicings

```typescript
import { parseChordSymbol } from './lib/music-theory';

const chord = parseChordSymbol('Cmaj9/E');
console.log(chord.name); // "Cmaj9/E"

// Obtener notas con un voicing específico
const drop2Notes = chord.getVoicing('drop2');
const quartalNotes = chord.getVoicing('quartal');
```

### 3. Progresiones y Conducción de Voces

```typescript
import { parseRomanProgression, Harmony } from './lib/music-theory';

// Parsea una progresión compleja con dominantes secundarios y sustitutos tritonales
const chords = parseRomanProgression('ii7 - V7/ii - subV7 - Imaj7', 'C major');

// Analizar la conducción de voces entre dos acordes
const issues = Harmony.checkVoiceLeading(chords[0].getNotes(), chords[1].getNotes());
if (issues.length > 0) {
  console.log("Errores de contrapunto:", issues);
}
```

### 4. Armonía Avanzada y Negativa

```typescript
import { Harmony, parseChordSymbol } from './lib/music-theory';

const g7 = parseChordSymbol('G7');

// Armonía Negativa de G7 en C Mayor (resulta en Fm6)
const negative = Harmony.getNegativeHarmony(g7, 'C major');

// Sugerencias de escalas para improvisar sobre una cadencia
const scales = Harmony.getSuggestedScales(g7, parseChordSymbol('Cmaj7'));

// Detector de acordes
const detected = Harmony.detectChords([noteC, noteE, noteG, noteBb]);
console.log(detected); // ["C7"]
```

### 5. Teoría de Conjuntos (Set Theory)

```typescript
import { SetTheory } from './lib/music-theory';

const pitchClasses = [0, 4, 7]; // Acorde Mayor (C E G)

const normalForm = SetTheory.normalForm(pitchClasses); // [0, 4, 7]
const primeForm = SetTheory.primeForm(pitchClasses);   // [0, 3, 7]
const intervalVector = SetTheory.intervalVector(pitchClasses); // [0, 0, 1, 1, 1, 0]
```

## Arquitectura

La librería está dividida en módulos independientes y fuertemente tipados:

- `tuning.ts`: Interfaces base para sistemas de afinación.
- `scala.ts`: Parser de archivos `.scl`.
- `note.ts`: Representación de frecuencias y nombres.
- `interval.ts`: Matemáticas de intervalos (ratios y cents).
- `chord.ts` / `scale.ts`: Estructuras musicales.
- `harmony.ts`: Análisis funcional, conducción de voces y armonía negativa.
- `set-theory.ts`: Análisis matemático de conjuntos.
- `rhythm.ts`: Duraciones, compases aditivos y polirritmos euclidianos.
- `abc-bridge.ts`: Puente para exportar a notación ABC.
- `parser.ts`: Intérpretes de strings (cifrado, números romanos).
- `dictionaries.ts`: Fórmulas de acordes y patrones de escalas.
- `circle.ts`: Círculo de quintas.

## Construcción (Build)

Para compilar el archivo minificado `umt.js` desde el código fuente TypeScript:

```bash
npm install
npm run build:umt
```
El archivo compilado se generará en `public/umt.js`.

## Licencia

Este proyecto está licenciado bajo la **GNU General Public License v3.0 (GPL-3.0)**. 

*Nota del autor: Esta librería se ha construido con una filosofía 100% Open Source, creada para la humanidad y no para el lucro corporativo. La licencia GPL garantiza que cualquier software que utilice esta librería deba permanecer también libre y abierto, protegiendo el conocimiento musical colectivo.* Consulta el archivo `LICENSE` para más detalles.
