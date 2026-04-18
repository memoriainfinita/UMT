# State — Universal Music Theory Library

## System

- Platform: Windows 10 Pro, bash via Claude Code
- Node: 20 (required by deploy workflow)
- Package manager: npm

## Project

- Path: `C:\Users\mykl\OneDrive\Scriptorium\DOCS\CODING GIT\UNIVERSAL MUSIC LIBRARY\universal-music-theory-library`
- Status: functional — library runs, demo page works, not deeply tested in all branches
- Deploy target: GitHub Pages via `.github/workflows/deploy.yml`

## Services / Dependencies

- abcjs ^6.6.2 — sheet music rendering in demo
- lucide-react — icons in demo
- esbuild — bundles `lib/music-theory/umt.ts` → `public/umt.js`
- Next.js 15 / React 19 — demo app

## Patterns

- [coordinate-system] Steps from A4=0. C4=-9 in 12-TET. Confirmed 2026-04.
- [library-language] All library strings in English. Demo UI in Spanish. Confirmed 2026-04.
- [build-umt] `npm run build:umt` must run before `next build`. Already in `build` script. Confirmed 2026-04.
- [audio-lib] Tone.js vía CDN para audio en demos vanilla. Confirmed 2026-04.
- [sheet-music] abcjs vía CDN + ABCBridge para partituras en demos vanilla. Confirmed 2026-04.

## History

### 2026-04-06 — Revisión y limpieza completa (sesión 1)

Revisión desde cero del proyecto generado por Gemini. Correcciones aplicadas:

**Bugs reales:**
- `note.ts` — `transpose()` propagaba el `_name` original (nota transpuesta tenía nombre incorrecto)
- `key-detection.ts` — `get12TETName(i)` devolvía nombres con octava ("A4 Major" en lugar de "A Major")
- `neo-riemannian.ts` — transformaciones P/L/R generaban nombres de acorde con octava ("C4m" en lugar de "Cm")
- `parser.ts` — sufijo `7alt` no mapeado; `V7alt` se parseaba como tríada mayor. Añadido a ambos bloques de normalización
- `page.tsx` — ejemplo Scala Pelog sin octava; `octaveCents = 1000¢` en lugar de `1200¢`. Corregido a `2/1`
- `page.tsx` — Set Theory tokenizaba con `.split(' ')` en lugar de `.split(/\s+/)`

**Typing / código muerto en librería:**
- `presets.ts` — `MajorTriad` y `ChromaticScale` usaban `any`. Tipados con `TuningSystem`. Eliminado acceso a `tuning.intervals` no tipado
- `abc-bridge.ts` — `streamToABC(stream: any)` → `streamToABC(stream: MusicStream)`
- `harmony.ts` — `'Acorde Desconocido'` → `'Unknown Chord'`

**Limpieza de artefactos Gemini:**
- `package.json` — nombre `"ai-studio-applet"` → `"universal-music-theory-library"`
- `package.json` — eliminadas deps muertas: `@google/genai`, `@hookform/resolvers`, `motion`, `class-variance-authority`, `firebase-tools`
- `app/layout.tsx` — metadata "My Google AI Studio App" → correcta
- `next.config.ts` — eliminado bloque `DISABLE_HMR` (AI Studio), `picsum.photos`, `transpilePackages: ['motion']`; archivo tenía caracteres Unicode corruptos
- `.env.example` — limpiado de credenciales Gemini
- `metadata.json` — eliminado campo `requestFramePermissions`

**Archivos eliminados:**
- `hooks/use-mobile.ts` — nunca importado
- `lib/utils.ts` — `cn()` nunca llamado fuera del archivo

### 2026-04-06 — Refactor arquitectural (sesión 5, continuación)

Commit: `c9bb3be`.

- `Pitch` eliminado de `types.ts` (artefacto Gemini, nunca usado)
- `TET12` movido a `tuning.ts` (era el único motivo por el que parser/harmony dependían de presets)
- `parseNoteToStep12TET` movido de `parser.ts` a `utils.ts` (utilidad de coordenadas, no parser)
- `stream.ts` absorbido en `rhythm.ts` y eliminado (83 líneas, un solo concepto)
- La librería queda en 19 archivos con dependencias más limpias

**Pendiente tras esta sesión:**
- Ejecutar `npm install` para actualizar `package-lock.json` con las deps eliminadas
- Probar en profundidad todas las secciones de la demo (voice leading, Neo-Riemannian, Set Theory, Scala parser)
- Revisar si `WerckmeisterIII` y otras afinaciones históricas suenan bien en la demo

## History

### 2026-04-06 — Auditoría y hardening completo (sesión 2)

Revisión profunda de toda la librería. Commit: `5a83a01`.

**Bugs corregidos:**
- `harmony.ts` — `'Acorde Desconocido'` → `'Unknown Chord'` en `getNegativeHarmony` (fallback nunca se ejecutaba)
- `harmony.ts` — mensajes de voice leading traducidos al inglés
- `abc-bridge.ts` — barlines usaban `>= 4` hardcodeado; ahora usa `stream.timeSignature.totalBeats`
- `page.tsx` — `.split(' ')` → `.split(/\s+/)` en sección PLR
- `page.tsx` — label `"0=C"` corregido a `"0=A"` (sistema de coordenadas A=0)

**Limpieza:**
- `parser.ts` — extraído `normalizeSuffix()` e `inferRomanSuffix()`, eliminada duplicación de shorthands
- `rhythm.ts` — eliminada clase muerta `RhythmEvent`
- `utils.ts` — añadido `get12TETBaseName()`, sustituye 16x `.replace(/\d+/, '')` en toda la librería

**Mejoras de API:**
- `harmony.ts` — `getSuggestedScales` devuelve `{scale: string; hint?: string}[]` con nombres parseables por `parseScaleSymbol`
- `set-theory.ts` — añadido `getPitchClassesC0()` normalizado a C=0 (convención estándar)

**Robustez teórica:**
- `harmony.ts` — `analyzeCadence` detecta dominantes por `intervalsInSteps`, no por nombre de acorde
- `chord.ts` — `getTritoneSubstitution` devuelve `null` fuera de 12-TET
- `harmony.ts` — `getBorrowedChords` añade préstamo desde Dorian y amplía sección menor con más opciones

## History

### 2026-04-06 — Hardening universal + docs (sesión 3)

Commit: `aa838b2`.

**Scope redefinido:** librería standalone JS/TS. Next.js demo es temporal, a reemplazar con HTML vanilla. Deploy: build local + commit `public/umt.js` + push. Sin CI/GitHub Actions. CDN via jsDelivr cuando se cree el repo.

**Fixes de universalidad:**
- `parser.ts` — `parseChordSymbol`, `parseScaleSymbol`, `parseRomanProgression` aceptan `tuning: TuningSystem = TET12`; intervalos mapeados via `getStepFromStandard()`
- `harmony.ts` — `% 12` → `octaveSteps` en `checkVoiceLeading`; `getSuggestedScales` usa `intervalsInSteps` en vez de regex sobre el nombre; `detectChords` guard para no-12-TET; `getNegativeHarmony` y `getBorrowedChords` con parámetro `tuning`
- `neo-riemannian.ts` — P/L/R usan `getStepFromStandard()` para todos los intervalos
- `note.ts`, `scale.ts` — detección de 12-TET via `instanceof EDO` en vez de comparación de string
- `tuning.ts` — comentario clarificado en `NonOctaveTuning.octaveSteps`

**Docs:**
- README reescrito en inglés, sin slop, scope real
- CLAUDE.md actualizado con scope, plan de deploy, Next.js marcado como temporal

## History

### 2026-04-06 — Repaso final librería + expansión universal (sesión 5)

**Bugs corregidos:**
- `set-theory.ts` — `getPitchClassesC0` usaba shift +3 en lugar de +9 (A=0→C=0 requiere +9)
- `harmony.ts` — `getSuggestedScales` devolvía `dorian` con hint "Locrian #2" para m7b5; corregido a `locrian #2`

**Fixes menores:**
- `abc-bridge.ts` — `noteToABC` siempre usaba `preferFlats: true`; ahora usa `note.getName()` para respetar la preferencia de la nota. Eliminado import huérfano de `get12TETName`
- `tuning.ts` — Añadido comentario clarificador en `CentTuning.getInterval` (octava siempre 1200, no el último valor del array)
- `circle.ts` — JSDoc que documenta la convención de minúsculas para tonalidades menores
- `chord.ts` — Nota en `getVoicing('quartal')` que el multiplicador 5 es específico de 12-TET

**Expansión de `dictionaries.ts` (rewrite completo):**

Acordes añadidos: `5` (power), `add9`, `madd9`, `add11`, `add#11`, `m6/9`, `dimM7`, `7b5`, `7#5`, `7b9#9`, `7b13`, `7#11`, `mM9`, `9sus4`, `9b5`, `9#11`, `maj7#11`, `maj9#11`, `13sus4`
Aliases añadidos: `m(maj7)` (→mM7), `7#5` (→aug7)

Escalas añadidas:
- Modos de menor melódica completos: `dorian b2`, `lydian augmented`, `mixolydian b6`, `locrian #2`
- Modos de menor armónica: `locrian #6`, `ionian #5`, `dorian #4`, `phrygian dominant`, `lydian #2`, `super locrian bb7`
- `harmonic major`, `blues major`
- Bebop: `bebop dominant`, `bebop major`, `bebop dorian`
- Exóticas: `persian`, `prometheus`, `in`, `iwato`, `yo`
- Aliases: `natural minor`, `jazz minor`, `acoustic`, `super locrian`, `spanish`, `flamenco`, `freygish`, `hindu`, `romanian minor`

**Harmony:**
- `detectChords` actualizado para saltar aliases `m(maj7)` y `7#5`
- `getSuggestedScales` (modal ruleset) también devuelve `locrian #2` para m7b5

### 2026-04-06 — Revisión capa base (sesión 6)

Revisión sistemática archivo a archivo. Commits: f3496ca, 251d30c, 2f23bc8, 6d6f8e7.

**Archivos revisados:** types.ts, interval.ts, tuning.ts, note.ts, scale.ts, chord.ts, dictionaries.ts, parser.ts, presets.ts

**Cambios principales:**
- `types.ts`: JSDoc, `MidiNote` alias
- `interval.ts`: guard ratio inválido, `inOctave()`, `semitones`, `divide()`, `negate()`, `equals()`
- `tuning.ts`: guards en 4 constructores, `getStepFromStandard` en todas las subclases, `EDO.getNoteName` 12-TET, JSDoc
- `note.ts`: throw en `getIntervalTo` freq inválida, `pitchClass`, `octave`, `equals()`
- `scale.ts`: fix bug flats en `getNotes`, `getPitchClasses()`, `contains()`, `getDegree()`, `stepPattern readonly`, `transpose` con nombre correcto
- `chord.ts`: fix bug flats en `getNotes`/bass, `getPitchClasses()`, `contains()`, `intervalsInSteps readonly`, `transpose` con nombre correcto
- `dictionaries.ts`: `readonly` en ambos records; acordes: augM7, 7sus2, m11b5, 13b9, 13#11, aug(maj7); escalas: augmented, pelog, kumoi, balinese, chinese, egyptian, byzantine, gypsy major/minor; fix TET12 import en presets
- `parser.ts`: normalización mayúsculas raíz, `parseNote` preserva nombre, nuevos shorthands (M7, Δ7, +7, maj), guard en acordes aplicados, errores descriptivos
- `presets.ts`: TET19, TET53, MinorTriad genérico, fix PtolemaicJI, `MajorTriad` usa `getStepFromStandard`, JSDoc

**Pendiente (sesión 6):** harmony.ts, circle.ts, set-theory.ts, key-detection.ts, neo-riemannian.ts, scala.ts, rhythm.ts, abc-bridge.ts, utils.ts, index.ts, umt.ts

### 2026-04-06 — Overhaul sistema bemoles/sostenidos (sesión 8)

Commit: 421dc78. Auditoría completa + corrección de 10 bugs en 8 archivos.

**Cambio arquitectural central:**
- `Note`: añadido `_preferFlats?: boolean` separado de `_name`. `transpose()` propaga la preferencia → inversiones, voicings, drops ya no pierden el contexto de la tonalidad.
- `Note.preferFlats` getter público, derivado de `_name` o `_preferFlats`.

**`utils.ts` — `preferFlatsForKey(root, scaleType)` reemplaza `usesFlats()`:**
- Usa círculo de quintas via tabla de offsets modales (`MAJOR_MODE_PARENT_OFFSET`)
- D phrygian → padre Bb mayor → bemoles ✓ (antes: sostenidos)
- D mixolydian → padre G mayor → sostenidos ✓
- Familia menor (harmonic minor, jazz minor…) por lookup directo

**Scale / Chord / Parser:**
- Constructor recibe `preferFlats?: boolean`; `parseScaleSymbol` y `parseChordSymbol` lo calculan via `preferFlatsForKey`
- `getNotes()` usa el valor almacenado en vez del hack de `_name`
- `transpose()` re-deriva la preferencia para la nueva raíz (sin octava en el nombre)

**Capa alta:**
- `detectChords()`: nombrado canónico por círculo de quintas (Bb no A#)
- `getSuggestedScales()`: raíz derivada de `chord.rootStep` no de `chord.name` (string frágil)
- `getBorrowedChords()`: usa `note.preferFlats` de cada nota, consistente
- `NeoRiemannian` P/L/R: P hereda preferencia de la fuente; L/R derivan del nuevo root
- `KeyDetection.detect()`: devuelve "Bb Major" no "A# Major"

**Limitación conocida pendiente:** el b7 de C7 se deletrea A# (no Bb) porque C es tonalidad de sostenidos. Requeriría lógica por tipo de intervalo, no solo por raíz. Anotado en TODO.

### 2026-04-06 — Revisión capa alta + hardening arquitectural (sesión 7)

Revisión sistemática + análisis arquitectural completo. Archivos tocados: harmony.ts, circle.ts, set-theory.ts, key-detection.ts, scala.ts, abc-bridge.ts, utils.ts, tuning.ts.

**Bugs corregidos:**
- `harmony.ts` — `getSuggestedScales`: `nextChord.name.includes('m')` → regex `/^[A-G][#b]*m(?!aj)/` (falso positivo con `Cmaj7`)
- `harmony.ts` — `getSuggestedScales` berklee/isDom7: `% 12` → `% oct` (3 ocurrencias)
- `harmony.ts` — `getBorrowedChords`: guard `if (tuning.octaveSteps !== 12) return []` (usa `get12TETBaseName` internamente)
- `scala.ts` — `parseScala`: strip inline comments antes de parsear (`"3/2 fifth".split('/').map(Number)` → `[3, NaN]`)
- `scala.ts` — `parseScala`: validación de `numNotes` (guard contra NaN/negativo)
- `circle.ts` — refactor: `normalizeKey()` privado aplicado en los 4 métodos públicos (antes solo `getSignature` normalizaba enarmónicas)
- `key-detection.ts` — perfiles `majorProfile`/`minorProfile` → `readonly`
- `utils.ts` — `getIntervalName`: añadidos m9, A11 para compuestos ≥ 12 semitones

**Mejoras arquitecturales:**
- `set-theory.ts` — `normalForm`, `primeForm`, `intervalVector` aceptan `octave = 12`; `getPitchClasses` usa `tuningSystem.octaveSteps` automáticamente → funciona en cualquier EDO
- `tuning.ts` — `JustIntonation.getStepFromStandard`: cambiado de aproximación proporcional a **búsqueda por proximidad en cents** (más preciso para JI no-cromático; para 12 clases sigue siendo identidad)
- `abc-bridge.ts` — `noteToABC` lanza error descriptivo para notas no-12-TET en vez de devolver 'C' silenciosamente; `streamToABC` usa helper `beatsToABCDuration` con cobertura de duraciones estándar + puntillos + fracciones genéricas

### 2026-04-06 — Diseño y plan de migración demo vanilla (sesión 4)

Brainstorming completo + spec + plan de implementación para migrar la demo de Next.js a HTML vanilla.

- Spec: `docs/superpowers/specs/2026-04-06-vanilla-demo-migration-design.md`
- Plan: `docs/superpowers/plans/2026-04-06-vanilla-demo-migration.md`

Decisiones clave:
- Demo nueva (no port), adaptada al estado real de la librería
- Un solo `public/example.html`, 11 secciones + API Reference
- Audio via Tone.js CDN, partituras via abcjs CDN, estilos via Tailwind CDN
- Archivado: `app/`, `components/`, `lib/audio.ts` → `archive/next-demo/`
- `package.json` limpiado de deps Next/React
- Implementación pendiente para sesión 5

## TODO

- [ ] **Ejecutar `docs/plan-teoria-completa.md`** — 10 fases, ~455 tests nuevos (v2: revisión profunda incluye lagunas omitidas + huecos nuevos)
  - [ ] Fase 1: acordes diatónicos + características modales
  - [ ] Fase 2: análisis de progresión + voice leading clásico completo (doblado, 6/4, falsas relaciones, quintas ocultas)
  - [ ] Fase 3: intermodalidad universal + pivot chords + modulación + sustitución completa + Coltrane matrix (breaking: `getBorrowedChords`, `checkVoiceLeading`)
  - [ ] Fase 4: progresiones presets + secuencias + análisis formal (AABA, sonata, rondó...)
  - [ ] Fase 5: UST + slash/polychord + chord-scale completeness + enharmonic respelling
  - [ ] Fase 6: set theory completo (Tn/TnI, subset) + dodecafonismo + contrapunto 1-5 + canon + Schenker básico + melodía
  - [ ] Fase 7: rítmica avanzada (hemiola, síncopa, clave patterns, polymeter, metric modulation, isorhythm)
  - [ ] Fase 8: bajo cifrado + escalas griegas + hexacordos + musica ficta + ragas + maqamat + solfège
  - [ ] Fase 9: Messiaen modes completos + Tonnetz + MOS + comma pumps + xen + temperament compare + espectral + Tymoczko OPTIC
  - [ ] Fase 10: MusicXML + LilyPond + ABC mejorado
- [ ] Crear repo en GitHub y actualizar URL CDN en README
- [x] Ejecutar plan `docs/superpowers/plans/2026-04-06-vanilla-demo-migration.md` (14 tareas) — librería lista para esto
- [x] Test completo de la demo con Playwright — 32/32 pasados
- [x] Añadir tests unitarios — vitest configurado, 42 tests en `tests/unit/circle.test.ts`
- [ ] Revisar spelling del b7 en acordes dominantes en tonalidades de sostenidos (C7 → A# en vez de Bb — limitación de diseño conocida, requiere lógica por intervalo)
- [x] Revisión capa alta — harmony.ts, circle.ts, set-theory.ts, key-detection.ts, neo-riemannian.ts, scala.ts, rhythm.ts, abc-bridge.ts, utils.ts, index.ts, umt.ts
- [x] Overhaul sistema bemoles/sostenidos — sesión 8

## History

### 2026-04-18 — Plan v2: revisión profunda

Revisión del plan inicial. Detectadas 11 lagunas del diagnóstico original que se habían quedado fuera + 22 huecos nuevos (bajo cifrado, forma musical, ragas, maqamat, hexacordos, musica ficta, análisis espectral, Tymoczko OPTIC, Schenker, Messiaen modes 4-7, metric modulation, isorhythm, clave patterns, sustituciones armónicas completas, Coltrane matrix como módulo, chord-scale completeness, polychord parser, etc.). Plan reescrito: 10 fases (antes 6), ~455 tests (antes 205). Decisión: incluir todo, incluso lo previamente descartado (Schenker básico, ragas, Tymoczko). Bumps de versión escalonados: 2.0 tras fase 3, 3.0 tras fase 6, 4.0 tras fase 9.

### 2026-04-18 — Análisis teórico profundo + plan global de expansión

Auditoría de la cobertura de teoría armónica de la librería. Detectadas lagunas estructurales:

- **Modos**: catálogo completo en `dictionaries.ts` pero sin sistema — faltan características modales, brillo, parent scale, avoid notes.
- **Acordes diatónicos por escala**: ausentes. Laguna más grave — bloquea análisis funcional.
- **Análisis de progresión**: `analyzeCadence` solo evalúa 2 acordes. No hay análisis de progresión completa (función T/S/D, préstamos, secundarios, modulaciones).
- **Intercambio modal**: `getBorrowedChords` hardcoded solo mayor↔menor paralelo + Dorian. Faltan 7 modos paralelos + menor armónica/melódica + armónica mayor.
- **Modulación**: cero lógica de pivot chord, clasificación de modulación, distancia modal.
- **Progresiones/secuencias preset**: ausentes (ii-V-I, Coltrane changes, rhythm changes, blues 12, Pachelbel...).
- **Jazz avanzado**: sin UST, sin análisis de slash chords.
- **Set theory**: falta Forte names, Z-relations, complements.
- **Dodecafonismo, contrapunto, MOS, Tonnetz, análisis melódico, MusicXML/LilyPond**: ausentes.

Plan global escrito en `docs/plan-teoria-completa.md`. 6 fases, ~205 tests nuevos. Decisión: breaking changes permitidos, bump 2.0.0 al terminar fase 3. Sin implementación en esta sesión — solo diagnóstico + plan.

### 2026-04-18 — CircleOfFifths expansion + vitest

Spec: `docs/superpowers/specs/2026-04-18-circle-of-fifths-expansion-design.md`
Plan: `docs/superpowers/plans/2026-04-18-circle-of-fifths-expansion.md`

Añadidos 6 métodos nuevos a `circle.ts`: `getPosition`, `navigate`, `getDistance`, `getParallel`, `getNeighbors`, `getRelatedKeys`. Nuevo tipo exportado: `RelatedKey`. Vitest configurado (`npm run test:unit`), 42 tests pasando. Bundle reconstruido a 38.8kb.

### 2026-04-13 — Fixes visuales y audio demo

Bugs corregidos en `public/example.html`:

- **Pentagrama gris:** `body` tiene `text-neutral-100` (blanco); abcjs usa `currentColor` en el SVG → notación invisible sobre fondo blanco. Fix: `color:#000` en los tres divs contenedores (`staff-scales`, `staff-chords`, `staff-abc`) + regla CSS `.abcjs-container { color: #000 }`.
- **Rhythm audio error:** `triggerAttackRelease` en bucle con tiempos absolutos causaba "Start time must be strictly greater than previous start time". Fix: reescrito con `Tone.Part` + `Tone.Transport`, que gestiona el scheduling correctamente.

### 2026-04-13 — Testing Playwright + fixes demo

32/32 tests pasados. Configuración: `tests/demo.spec.js` + `playwright.config.js` con `webServer` (levanta http-server automáticamente). Comando: `npx playwright test`.

Bugs encontrados y corregidos:

- `example.html` — `@apply` Tailwind no se aplicaba: reemplazado con CSS nativo en `<style>`
- `example.html` — `scale.stepsPattern` → undefined: corregido a `scale.stepPattern`
- `scale.ts` — `getNotes()` en tunings no-12-TET llamaba `usesFlats("Step -5")` → crash: añadido guard para solo calcular `pf` en 12-TET
- `playwright.config.js` — añadido `webServer` para levantar/parar http-server automáticamente

### 2026-04-12 — Migración demo vanilla HTML

Demo migrada de Next.js a un único `public/example.html`. Archivados: `app/`, `components/`, `lib/audio.ts`, configs Next.js → `archive/next-demo/`. `public/example.html` anterior → `archive/example-v0.html`. `package.json` limpiado: eliminadas deps Next/React/lucide.

Secciones implementadas (11 + API Reference):
1. Tuning Systems — selector + arpeggio Tone.js
2. Scales & Modes — parseScaleSymbol + abcjs staff
3. Chords & Voicings — voicings, inversiones, abcjs, Tone.js
4. Progressions & Voice Leading — parseRomanProgression + smoothTransition
5. Harmony & Key Analysis — detectChords, analyzeCadence, getSuggestedScales, getNegativeHarmony, Circle SVG
6. Set Theory & Neo-Riemannian — normalForm, primeForm, intervalVector, PLR
7. Microtonal & Scala — parseScala + presets Pelog/BP/Werck
8. Rhythm & Meter — Polyrhythm.euclidean, MusicStream, Tone.MembraneSynth
9. ABC Notation Export — ABCBridge + abcjs render
10. Utilities — MIDI↔freq, enarmónicos, nombres de intervalo
11. API Reference — tablas estáticas de todas las clases y métodos
