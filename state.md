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

- [ ] Crear repo en GitHub y actualizar URL CDN en README
- [ ] Ejecutar plan `docs/superpowers/plans/2026-04-06-vanilla-demo-migration.md` (14 tareas)
- [ ] Test completo de la demo en navegador (probar todas las secciones)
- [ ] Considerar añadir tests unitarios para los módulos core
