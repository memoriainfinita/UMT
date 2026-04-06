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

## TODO

- [ ] Ejecutar `npm install` para limpiar package-lock.json
- [ ] Test completo de la demo en navegador
- [ ] Verificar que `umt.js` en `public/` está actualizado (`npm run build:umt`)
- [ ] Decidir si `public/umt.js` debe ir en `.gitignore` (es artifact de build)
- [ ] Considerar añadir tests unitarios para los módulos core
