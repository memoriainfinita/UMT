---
created: 2026-04-28
last_updated: 2026-06-16
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
- CDN: https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@main/dist/umt.js
- Status: publicado y en producción.
- Deploy: `npm run build:umt` + commit `dist/umt.js` + push. Para docs: `npm run docs` + commit `api-docs/` + push.

## Dependencies

- esbuild - compila `lib/music-theory/umt.ts` → `dist/umt.js` (112 kb)
- typedoc - genera API docs HTML en `api-docs/` (`npm run docs`)
- vitest - tests unitarios (`npm run test:unit`) - 688 tests
- Tone.js CDN - audio en demo
- abcjs CDN - partituras en demo
- Tailwind CDN - estilos en demo

## Patterns

- [coordinate-system] Steps from A4=0. C4=-9 in 12-TET. Confirmed 2026-04.
- [library-language] All library strings in English. Confirmed 2026-04.
- [build-umt] `npm run build:umt` es el único paso de build. El bundle se commitea en git en `dist/umt.js`. Confirmed 2026-05.
- [audio-lib] Tone.js via CDN para audio en demo vanilla. Confirmed 2026-04.
- [sheet-music] abcjs via CDN + ABCBridge para partituras en demo vanilla. Confirmed 2026-04.
- [spelling] m2/m3/m7 siempre usan bemol en `chord.ts:getNotes()` via `intervalPreferFlats()`. d5/A4 y m6/A5 usan contexto del acorde. Confirmed 2026-04.

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

## History

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
