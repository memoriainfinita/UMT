# State - Universal Music Theory Library

## System

- Platform: Windows 10 Pro, bash via Claude Code
- Node: 20
- Package manager: npm

## Project

- Repo: https://github.com/memoriainfinita/UMT
- Demo: https://memoriainfinita.github.io/UMT (GitHub Pages, branch `main`, folder `/docs`)
- CDN: https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@main/docs/umt.js
- Status: publicado y en producción.
- Deploy: build local (`npm run build:umt`) + commit `docs/umt.js` + push.

## Dependencies

- esbuild - compila `lib/music-theory/umt.ts` → `docs/umt.js` (104 kb)
- vitest - tests unitarios (`npm run test:unit`) - 524 tests
- Tone.js CDN - audio en demo
- abcjs CDN - partituras en demo
- Tailwind CDN - estilos en demo

## Patterns

- [coordinate-system] Steps from A4=0. C4=-9 in 12-TET. Confirmed 2026-04.
- [library-language] All library strings in English. Confirmed 2026-04.
- [build-umt] `npm run build:umt` es el único paso de build. El bundle se commitea en git en `docs/umt.js`. Confirmed 2026-04.
- [audio-lib] Tone.js via CDN para audio en demo vanilla. Confirmed 2026-04.
- [sheet-music] abcjs via CDN + ABCBridge para partituras en demo vanilla. Confirmed 2026-04.
- [spelling] m2/m3/m7 siempre usan bemol en `chord.ts:getNotes()` via `intervalPreferFlats()`. d5/A4 y m6/A5 usan contexto del acorde. Confirmed 2026-04.

## TODO

- [ ] Crear Wiki en GitHub con docs de la API

## History

### 2026-04-28 - Demo en producción

Demo verificada en https://memoriainfinita.github.io/UMT. GitHub Pages configurado: branch `main`, folder `/docs`. `public/` renombrado a `docs/` para compatibilidad. Build path actualizado a `docs/umt.js`.

### 2026-04-28 - Publicación en GitHub

Primer push a https://github.com/memoriainfinita/UMT. Rama `main`.
Limpieza pre-push: `archive/`, `docs/` internos, `.env.example`, `metadata.json`, `.eslintrc.json`, `playwright.config.js`, `tests/demo.spec.js` excluidos del repo público.
