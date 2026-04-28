# State - Universal Music Theory Library

## System

- Platform: Windows 10 Pro, bash via Claude Code
- Node: 20
- Package manager: npm

## Project

- Repo: https://github.com/memoriainfinita/UMT
- Demo: https://memoriainfinita.github.io/UMT
- CDN: https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@main/public/umt.js
- Status: listo para primer commit y publicación.
- Deploy: build local (`npm run build:umt`) + commit `public/umt.js` + push. GitHub Pages sirve desde `public/`.

## Dependencies

- esbuild - compila `lib/music-theory/umt.ts` → `public/umt.js` (104 kb)
- vitest - tests unitarios (`npm run test:unit`) - 524 tests
- playwright + http-server - tests de integración demo (`npx playwright test`)
- Tone.js CDN - audio en demo
- abcjs CDN - partituras en demo
- Tailwind CDN - estilos en demo

## Patterns

- [coordinate-system] Steps from A4=0. C4=-9 in 12-TET. Confirmed 2026-04.
- [library-language] All library strings in English. Confirmed 2026-04.
- [build-umt] `npm run build:umt` es el único paso de build. El bundle se commitea en git. Confirmed 2026-04.
- [audio-lib] Tone.js via CDN para audio en demo vanilla. Confirmed 2026-04.
- [sheet-music] abcjs via CDN + ABCBridge para partituras en demo vanilla. Confirmed 2026-04.
- [spelling] m2/m3/m7 siempre usan bemol en `chord.ts:getNotes()` via `intervalPreferFlats()`. d5/A4 y m6/A5 usan contexto del acorde. Confirmed 2026-04.

## TODO

- [ ] Primer commit y push al repo GitHub
- [ ] Configurar GitHub Pages (source: `public/`)
- [ ] Probar demo en producción (https://memoriainfinita.github.io/UMT)
- [ ] Crear Wiki en GitHub con docs de la API

## History

### 2026-04-28 - Rediseño web + README + limpieza repo

- `public/index.html` - demo rediseñada: hero + 7 secciones interactivas (Harmony, Tuning, Modal, Set Theory, World Music, Rhythm, Notation). Auto-run al cargar.
- `README.md` - reescrito: hook, instalación CDN/ESM, tabla de 41 módulos por dominio, ejemplos por área, arquitectura
- Em dashes eliminados de 46 archivos

### 2026-04-28 - Fix spelling de notas en acordes (intervalo-aware)

`chord.ts:getNotes()` calcula `preferFlats` por nota según el intervalo desde la raíz. m2/m3/m7 siempre usan bemol. d5/A4 y m6/A5 usan contexto del acorde. 6 tests nuevos. 524/524 tests.

### 2026-04-26 - Fases 5-10: plan de expansión completo

Commits: 54bdfed, 917d5b0, 2d5c564, 69b079e, 17f6f8f, a4920b7. 518/518 tests. Bundle: 104kb. 41 módulos. Cubre: armonia tonal completa, dodecafonismo, contrapunto, música del mundo (ragas, maqamat, clave), ritmo avanzado, análisis espectral, Tonnetz, OPTIC/Tymoczko, exportación MusicXML/LilyPond/ABC.

