---
created: 2026-04-28
last_updated: 2026-10-10
---

# State - Universal Music Theory Library

## System

- Platform: Windows 10 Pro, bash via Claude Code
- Node: 20
- Package manager: npm

## Project

- Repo: https://github.com/memoriainfinita/UMT
- Demo: https://memoriainfinita.github.io/UMT (GitHub Pages, branch `main`, root `/`)
- API Docs: https://memoriainfinita.github.io/UMT/api-docs/ (TypeDoc, generado en `api-docs/`)
- CDN: https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@v0.3.0/dist/umt.js (IIFE) y `dist/umt.mjs` (ESM)
- Versión: 0.3.0 (tag `v0.3.0`); `v0.2.0` cierra las fases 0-6 de la auditoría; `v0.1.0` es el estado previo a la auditoría (`801e5ec`). Cambios en `CHANGELOG.md`
- Status: publicado y en producción.
- Deploy: `npm run build` + commit `dist/` + push; versión nueva: `package.json`, `CHANGELOG.md` y tag `vX.Y.Z`. Para docs: `npm run docs` + commit `api-docs/` + push.

## Dependencies

- esbuild (fijado 0.28.2) - compila `dist/umt.js` (IIFE, 142 kb) y `dist/umt.mjs` (ESM)
- dts-bundle-generator (fijado 9.5.1) - tipos en un solo `dist/umt.d.ts`
- typedoc - genera API docs HTML en `api-docs/` (`npm run docs`)
- vitest - tests unitarios (`npm run test:unit`) - 994 tests, un archivo por módulo
- GitHub Actions (`.github/workflows/ci.yml`) - typecheck, lint, tests, build y `dist` igual a las fuentes
- Tone.js CDN - audio en demo
- abcjs CDN - partituras en demo
- Tailwind CDN - estilos en demo

## Patterns

- [coordinate-system] Steps from A4=0. C4=-9 in 12-TET. Confirmed 2026-04.
- [library-language] All library strings in English. Confirmed 2026-04.
- [build] `npm run build` genera `dist/umt.js`, `dist/umt.mjs` y `dist/umt.d.ts`; los tres se commitean y la CI falla si no coinciden con las fuentes. Confirmed 2026-10.
- [tests] Un archivo de tests por módulo de `lib/music-theory/` (harmony por tema: analysis, chromatic, voice-leading), con las fuentes teóricas que cita el módulo en la cabecera. Confirmed 2026-10.
- [audio-lib] Tone.js via CDN para audio en demo vanilla. Confirmed 2026-04.
- [sheet-music] abcjs via CDN + ABCBridge para partituras en demo vanilla. Confirmed 2026-04.
- [spelling] Las escalas heptatónicas en 12-TET se escriben por letra (`spellByLetter` en `utils.ts`): F# mayor lleva E#, D menor armónica lleva C#, y los acordes diatónicos toman la misma letra (`E#dim`). La letra raíz sale del nombre de la escala si coincide con la altura. Las demás escalas siguen con `preferFlats`. Confirmed 2026-10.
- [harmony] `secondaryTarget` va en minúscula cuando la tríada diatónica del grado tonicizado es menor (`V7/ii`, `V7/vi`). Confirmed 2026-10.
- [harmony] En tonalidad menor, una fundamental cromática del mayor paralelo es grado elevado (`#III`, `#vi°`; el vii° de la sensible va sin alteración, ver abajo); las demás se leen rebajadas (`bII`, `bV`), igual que en mayor. Confirmed 2026-10.
- [harmony] Función: toda secundaria (V7/x, vii°/x) es D. VII en menor es D; bVII en mayor es S. Confirmed 2026-10.
- [harmony] En menor natural, V, V7, vii° y vii°7 con la sensible elevada son diatónicos (menor armónica), y el vii° se escribe sin alteración. Lo de la menor melódica (IV mayor) sigue prestado. Confirmed 2026-10.
- [harmony] Acorde de sensible secundario: dim, dim7 o m7b5 cromático un semitono bajo un grado diatónico no disminuido → `vii°/x`, `vii°7/x`, `viiø7/x`. Los diatónicos conservan su lectura (ii° en menor). Confirmed 2026-10.
- [harmony] El sustituto tritonal de V (bII7) es D. Una secundaria no se marca además como prestada (D7 en C es V7/V, no lidio). Confirmed 2026-10.
- [spelling] `spelling.ts`: en una tonalidad, las notas de la escala con sus letras y las cromáticas por la escala cromática armónica (b2, b3, #4, b6, b7; en menor, 3, 6 y 7 elevados como #3, #6, #7). Las notas de un acorde se nombran por su intervalo sobre la fundamental (b5 sin quinta justa, #11 con ella; bb7 en dim7). Nota cromática suelta: si la convención da doble alteración y la otra letra tiene menos, la otra (La en Reb mayor). Fundamental de acorde: acorde de solo notas de la tonalidad, letra de la tonalidad (F##dim7 en Sol# menor); fundamental de la tonalidad en acorde cromático, su letra salvo que la otra ahorre 3 o más alteraciones (Gbm en Reb mayor; G en Sol# menor); fundamental cromática, la de menos alteraciones con la fundamental contada doble. En menor, la tercera elevada (C# en La menor) conserva su letra como fundamental, igual que la 6ª y la 7ª elevadas. `Chord.getNotes()` nombra cada nota por su intervalo sobre la letra escrita de la fundamental (D#m → D# F# A#; Edim7 → E G Bb Db). Confirmed 2026-10.
- [harmony] El numeral de una fundamental cromática sale de la letra con que la escribe `spellChordInKey`: F#dim7 en C es `#iv°7`. Confirmed 2026-10.
- [roman] `parseRomanProgression`: la mayúscula o minúscula da la tercera; lo que el numeral no dice lo pone la tonalidad (`vii` en C = Bdim, `vii7` = Bm7b5). Mayúscula con `7` es siempre dominante, convención de jazz (`I7` = C7, `IV7` = F7, `V7` = G7); la séptima mayor se escribe `maj7`; `dom` es alias (`Idom7`). Si la tercera no es la de la tonalidad, el acorde simple del caso (`II` = D). Las alteraciones mueven el grado de la propia escala: en menor `VII` y `VI` son los naturales y `bVII` en La menor es Gb. En menor natural, `vii°`, `vii°7` y `viiø7` van sobre la sensible elevada; un disminuido sobre la 7ª natural se escribe `VIIdim`. Sufijo desconocido → error. `analyzeProgression` escribe numerales que el parser vuelve a leer igual (`viim7` para Bm7 en C). Confirmed 2026-10.
- [harmony] `analyzeProgression(chords, key, { spelling })`: `'key'` (por defecto) toma la letra de una fundamental cromática de `spellChordInKey`; `'written'` conserva la letra del nombre si coincide con la altura (Gb en C = `bV`), para acordes que llegan ya nombrados. Confirmed 2026-10.
- [interval] Calidad de intervalo por letras: `getIntervalBetween('C4', 'F#4')` = A4; `getIntervalName(semitonos, true, letras)`. Sin letras, 6 semitonos es d5. Confirmed 2026-10.
- [solfege] Do móvil con la menor desde la (Kodály): en La menor A es "la"; los modos eclesiásticos cantan desde el do de su mayor (en Re dórico D es "re"). Confirmed 2026-10.
- [twelve-tone] Las formas de una serie se nombran por su primera clase de altura (Straus): la serie dada es `P(row[0])`; la matriz es la estándar (primera fila la serie, primera columna su inversión). Confirmed 2026-10.
- [counterpoint] `checkSpecies` lee el contrapunto en una rejilla de tiempos por nota del cantus (1, 2, 4, 2, 4 según especie; en 5ª una nota larga repite su altura). Confirmed 2026-10.
- [tuning] `getStepFromStandard` lleva un paso de 12-TET al paso de la afinación más cercano en cents (clase base); EDO redondea y las afinaciones de 12 clases van uno a uno. Los módulos 12-TET (Tonnetz, contrapunto, cifrado) leen las notas de otras afinaciones por su semitono más cercano según la frecuencia. Confirmed 2026-10.
- [export] Los tres exportadores (ABC, LilyPond, MusicXML) escriben sobre `notation-layout.ts`: grafía por letra y octava científica (otras afinaciones: semitono más cercano, y en MusicXML `<alter>` decimal), compases en ticks (384 por redonda), puntillos, tresillos y ligaduras al cruzar la barra; una sola voz, eventos solapados lanzan error. ABC con `L:1/4`, `C` = C4. Confirmed 2026-10.
- [harmony] Modulación en `analyzeProgression`: empieza en el primer acorde ajeno a la tonalidad activa; tonalidad nueva por cadencia auténtica, luego tónica presente, luego Krumhansl; menos de tres acordes es tonicización. Numerales y cadencias en la tonalidad local (`ChordAnalysis.key`). Confirmed 2026-10.
- [data] Los datos de referencia se contrastan con fuente y los tests fijan los valores: Forte de la lista de Wikipedia (223 clases, prime forms de Rahn, Z mayúscula), maqamat de maqamworld.com (forma ascendente), ragas de las fichas de Wikipedia (vadi y samvadi como número de svara, Sa = 1 … Ni = 7). La fuente va citada en la cabecera del módulo. Confirmed 2026-10.
- [substitution] Sustitutos diatónicos: el acorde de la escala a una tercera con la misma función (I → iii, vi; ii ↔ IV; V ↔ vii°), en mayor y menor natural, con la grafía y el tipo (tríada o cuatríada) de la escala. En mayor, IV y ii toman la subdominante menor (iv, bVII7, iiø7), y esta vuelve a IV. Confirmed 2026-10.

## TODO

- [x] Crear docs de la API — TypeDoc en `api-docs/`, publicado en GitHub Pages
- [x] Sistema de aliases para el parser — `translateSymbol(input, aliases)` + mapas predefinidos `SOLFEGE_ROOTS`, `QUALITY_ALIASES_ES/FR/IT`. 33 tests. Commit `20ee31d`.
- [x] Voicing algorítmico para fretboard — `getFretboardVoicings`, `getFretboardScale`, `getFretboardScalePositions` + presets de tuning. 34 tests. Commits `9fa8316`, `572a534`.
- [x] `figured-bass.ts` — `keySymbol` implementado: resolución diatónica de numerales sin accidental explícito. Fallback si bass es cromático o clave inválida. 16 tests. Commit `6f48e14`.
- [x] `figured-bass.ts` — `FiguredBass.voices()`: SATB clásico. Rangos vocales, doblamiento (raíz en tríadas, todos los PCs en acorde de 7ª), sin cruzamiento, S-A/A-T max 8va, T-B max 12ª. 13 tests. Commit `d1e7d12`.
- [x] `counterpoint.ts` — reglas modales implementadas: finalis, ambitus, tritono melódico. 13 tests. Commit `d1e7d12`.
- [x] ESLint — `typescript-eslint` instalado, parser configurado con tsconfig. 4 errores corregidos. Commit `84cdafa`.
- [x] `SetTheory.getZRelated` — implementado via búsqueda dinámica en FORTE_TABLE por interval vector. 6 tests. Commit `d1e7d12`.
- [x] `Polymeter` — `cycleBeats`, `naturalCycle`, `cycleLength`, `generateGrid()`. 7 tests. Commit `549920d`.
- [x] Auditoría 2026-10: arreglar fallos en 8 fases (0 fallos de MODUS, núcleo, datos, análisis, xen, exportadores, distribución, funciones de MODUS). Fases 0 (`6750e23`), 1 (`a0494bd`…`e893bc3`), 2 (`1c67882`), 3 (`b3d2390`…`65641ad`, más `37f1473` por las notas de MODUS) 4 (`3449c91`…`88171ea`), 5 (`6a8d4fa`), 6 (`3f3fd6c`…`v0.2.0`) y 7 (`12c73c7`…`v0.3.0`, más `bc3b157`) hechas. notae fijada a `v0.3.0`. Detalle y plan en `docs/auditoria-2026-10.md`; peticiones de MODUS en `docs/notas-desde-modus-2026-10.md`

## History

### 2026-10-11 - El build deja de ser solo `build:umt`

El pattern [build-umt] decía que `npm run build:umt` (IIFE) era el único paso. La fase 6 añade el paquete ESM con tipos para consumir la librería por npm desde un tag: `npm run build` genera también `dist/umt.mjs` y `dist/umt.d.ts`.

### 2026-10-10 - `I7` pasa a ser dominante en `parseRomanProgression`

El pattern [roman] decía `I7` = Cmaj7 (la séptima de la tonalidad, convención de `music21`, fijada en la fase 1). Lo supera la fase 3: con esa lectura `analyzeProgression` escribía C7 como `I7` y el parser lo devolvía Cmaj7, y la librería escribe `Imaj7` en todas sus progresiones. El usuario eligió la convención de jazz (B1).

### 2026-10-10 - `Chord.getNotes()` pasa a grafía por letras

El pattern [spelling] decía "`Chord.getNotes()` no cambia" (grafía por pitch class y `preferFlats`). Lo supera la fase 1 de la auditoría: esa grafía daba D#m → Gb, C7#9 → Eb, Edim7 → A# C#. Con ello deja de valer el pattern "m2/m3/m7 siempre usan bemol en `getNotes()` via `intervalPreferFlats()`": esa función queda solo de respaldo cuando la letra pediría más de dos alteraciones.

### 2026-06-16 - Limpieza: carpetas vacías heredadas

Revisión de organización de la raíz: repo trackeado limpio, sin archivos fuera de sitio. Borradas dos carpetas vacías heredadas del scaffold original: `hooks/` y `.github/workflows/` (más `.github/`, que quedaba vacía tras retirar el `deploy.yml` de Next.js). No estaban trackeadas; sin impacto en git.

### 2026-06-13 - Auditoría: docs desactualizadas, LICENSE faltante, typecheck

Revisión completa buscando IA slop y stubs: ninguno encontrado en `lib/` (los "simplified/approximation" son limitaciones documentadas). Corregido: import `TET12` sin usar en `fretboard.test.ts` (rompía `tsc --noEmit`; invisible porque ESLint ignora `tests/**`), `LICENSE` GPL-3.0 creado (el README lo referenciaba pero no existía) + campo `license` en package.json, script `npm run typecheck` añadido, README/CLAUDE.md/state.md actualizados (688 tests, 112 kb, link API docs a Pages, instrucción Playwright rota eliminada). `docs/public/` y `test-results/` huérfanos movidos a `_archive/` (gitignorado). 688 tests pasan, typecheck verde.

### 2026-05-06 - Banjo support: BANJO_OPEN_G + stringOffset

`BANJO_OPEN_G = [-2, -19, -14, -10, -7]` añadido a `fretboard.ts` (drone G4 en index 0, luego D3 G3 B3 D4). `stringOffset?: number[]` añadido a `FretboardVoicingOptions` y a los dos tipos de resultado (`FretboardVoicingResult`, `FretboardScaleResult`). Las tres funciones fretboard aplican el offset a los frets de salida (cálculo interno sin cambios). notae puede pasar `stringOffset: [5,0,0,0,0]` y recibir coordenadas absolutas directamente. 13 tests nuevos, 45 en fretboard.test.ts. Bundle 111.5kb. Commit `45f637e`.

### 2026-05-05 - Fretboard voicing module

Nuevo módulo `fretboard.ts`: `getFretboardVoicings` (backtracking, ventana de trastes, todas las posiciones), `getFretboardScale` (mapa completo del mástil), `getFretboardScalePositions` (cajas CAGED-style). Presets: `GUITAR_STANDARD`, `GUITAR_DROPPED_D`, `GUITAR_OPEN_G`, `UKULELE_STANDARD`, `BASS_STANDARD`. Output compatible con `FretboardChord` de notae. 34 tests, 677 en total. Bundle 111.2kb. Commits `9fa8316`, `572a534`.

### 2026-05-05 - JSDoc: Polymeter constructor y SetTheory.getZRelated

Revisión de cobertura JSDoc en lo implementado recientemente. Dos huecos encontrados y corregidos: `Polymeter` constructor (sin doc, parámetro `cycleBeats` no obvio) y `SetTheory.getZRelated` (doc sin `@param`/`@returns`). Bundle reconstruido (108.7kb). Push a main. Commit `1c5b37e`.

### 2026-05-05 - Counterpoint: reglas modales en checkSpecies

`Counterpoint.checkSpecies` ahora acepta `mode?: string` (antes `_mode`, sin implementar). Tres checks modales: **finalis** (CF debe empezar y terminar en el finalis del modo), **ambitus** (counterpoint dentro de [-7, +15] semitonos del finalis), **tritono melódico** (salto de A4 = 6 semitonos prohibido). Modos soportados: dorian, phrygian, lydian, mixolydian, aeolian, ionian, locrian. 13 tests nuevos. 643 tests en total.

### 2026-05-05 - FiguredBass.voices: realización SATB clásica

`FiguredBass.voices(bassNote, figures, keySymbol)` → `[S, A, T, B]`. Rangos: S(C4–G5), A(G3–C5), T(C3–G4). Doblamiento: en tríadas el bajo se dobla en una voz superior; en acordes de 7ª (4 PCs) las 3 voces superiores cubren los PCs restantes sin doblamiento. Sin cruzamiento de voces. Espaciado S-A/A-T max 8va, T-B max 12ª. Scoring por proximidad al centro de rango. 13 tests nuevos. 630 tests en total.

### 2026-05-05 - FiguredBass.realize: resolución diatónica por clave

`keySymbol` implementado en `FiguredBass.realize()`. Numerales sin accidental explícito se resuelven diatónicamente: `getDiatonicPCs()` parsea la clave via `parseScaleSymbol`, `diatonicOffset()` cuenta grados diatónicos desde el bajo. Fallback a `FIGURE_DEFAULT_SEMITONES` si el bajo es cromático o la clave no parsea. Accidentales explícitos siempre tienen prioridad. 16 tests en `tests/unit/figured-bass.test.ts`.

### 2026-05-05 - Build y push

Bundle reconstruido (106 kb). Incluye Polymeter completo + fixes ESLint. Push a main.

### 2026-05-04 - Polymeter: cycleBeats, naturalCycle, cycleLength, generateGrid

`Polymeter` implementado: `naturalCycle` (LCM de metros), `cycleLength` (cycleBeats ?? naturalCycle), `getCyclePosition` wrapea en cycleLength, `generateGrid()` devuelve todos los downbeats por metro en un ciclo completo ordenados por beat. 7 tests nuevos, 595 en total. Commit `549920d`.

### 2026-05-04 - Sistema de aliases para el parser

`translateSymbol(input, aliases)` + mapas predefinidos `SOLFEGE_ROOTS`, `QUALITY_ALIASES_ES/FR/IT` en nuevo módulo `lib/music-theory/aliases.ts`. Greedy left-to-right, match más largo primero. 33 tests nuevos, 588 en total. Commit `20ee31d`.

### 2026-05-04 - Limpieza general: código muerto, restos Next.js, fixes menores

Eliminados todos los restos de Next.js: `tsconfig.json` reescrito, `eslint.config.mjs` reescrito, `@playwright/test` y `@types/node` desinstalados, `.next/` y `test-results/` fuera del gitignore. Revisión sistemática de código muerto con `tsc --noUnusedLocals --noUnusedParameters`: eliminados 9 imports no usados, 6 variables locales huérfanas, `Z_PAIRS`, `FIXED_DO_SYLLABLES`, `intervalClass`, `cycleBeats` y código muerto en `counterpoint.ts`. Fix: `maqamat.ts` Nawa Athar corregido a `[4,2,6]`. 555 tests pasan. Commits `7e3af03`…`51fc7d7`.

### 2026-05-04 - JSDoc completo + TypeDoc API docs

JSDoc añadido a todos los exports públicos de los 40+ módulos de `lib/music-theory/`. Incluye: módulos JSDoc, clases, interfaces, tipos, constantes y funciones. TypeDoc configurado (`typedoc.json` + `tsconfig.typedoc.json`) y `npm run docs` genera `api-docs/` (HTML completo). Docs publicadas en `https://memoriainfinita.github.io/UMT/api-docs/`. Fix de error TS preexistente en `counterpoint.ts` (uso de `.constructor` no constructable). `HexachordSyllable` y `HexachordType` exportados. Commits `b5e9c6f`…`25029f6`.

### 2026-05-03 - Parser compositivo para acordes extendidos/alterados

`parseChordSymbol` ahora acepta cualquier combinación de calidad + número + alteraciones en cualquier orden. Gramática: `<quality>? <maj>? <7|9|11|13>? <b5|#5|b9|#9|#11|b13>*`. El diccionario tiene prioridad; el parser compositivo actúa como fallback. Espacios en el sufijo ignorados. JSDoc de `parseChordSymbol` actualizado. 29 tests nuevos. 555 tests pasan. Commits `a9176ef`.

### 2026-05-03 - JSDoc: ScalaTuning, substitution helpers, UST_TABLE

JSDoc añadido a `ScalaTuning` (clase, constructor, métodos), helpers internos de `substitution.ts` (`pcMod`, `chordQuality`, `noteName`) y `UST_TABLE` en `upper-structures.ts`. Commit `fba637d`.



### 2026-05-03 - Fix parser: accidental explícito respetado

`parseChordSymbol`/`parseScaleSymbol` ahora respetan el accidental explícito del usuario. Si root tiene `#` → `preferFlats=false`; si tiene `b` → `preferFlats=true`. `A#maj7` ya no devuelve `Bb` como root. 526 tests pasan. Commit `b32d643`.

### 2026-05-03 - Migración bundle a dist/ + limpieza

Bundle movido de `docs/umt.js` a `dist/umt.js`. Demo movida de `docs/index.html` a `index.html` (raiz). GitHub Pages reconfigurado para servir desde root `/` en vez de `/docs`. CDN URL actualizada a `dist/umt.js`. README, CLAUDE.md, .gitignore, package.json actualizados en consecuencia. Workflow de Next.js `.github/workflows/deploy.yml` eliminado (resto del scaffolding original, fallaba en cada push).


### 2026-04-28 - Demo en producción

Demo verificada en https://memoriainfinita.github.io/UMT. GitHub Pages configurado: branch `main`, folder `/docs`. `public/` renombrado a `docs/` para compatibilidad. Build path actualizado a `docs/umt.js`.

### 2026-04-28 - Publicación en GitHub

Primer push a https://github.com/memoriainfinita/UMT. Rama `main`.
Limpieza pre-push: `archive/`, `docs/` internos, `.env.example`, `metadata.json`, `.eslintrc.json`, `playwright.config.js`, `tests/demo.spec.js` excluidos del repo público.
