# State - Universal Music Theory Library

## System

- Platform: Windows 10 Pro, bash via Claude Code
- Node: 20
- Package manager: npm

## Project

- Repo: https://github.com/memoriainfinita/UMT
- Demo: https://memoriainfinita.github.io/UMT (GitHub Pages, branch `main`, root `/`)
- CDN: https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@main/dist/umt.js
- Status: publicado y en producción.
- Deploy: build local (`npm run build:umt`) + commit `dist/umt.js` + push.

## Dependencies

- esbuild - compila `lib/music-theory/umt.ts` → `dist/umt.js` (104 kb)
- vitest - tests unitarios (`npm run test:unit`) - 524 tests
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

- [ ] Crear Wiki en GitHub con docs de la API
- [ ] Sistema de aliases para el parser — paso de traducción previo al parser que mapea tokens alternativos a canónicos (ej. 'mayor'→'major', 'Do'→'C'). API propuesta: `{ aliases: Record<string,string> }` en parseChordSymbol/parseScaleSymbol. El usuario construye su propio diccionario por idioma o sistema. — una pagina por modulo principal (Harmony, Tuning, SetTheory...). Opciones: web editor o clonar el repo .wiki.git.
- [ ] `lib/music-theory/note.ts`: JSDoc de `name`, `getName` y constructor `_name` actualizado (2026-05-03) — incluye octava en el nombre devuelto. Pendiente commit y push.
- [ ] Voicing algorítmico para fretboard — dado un acorde y un tuning, generar `FretboardChord` (posiciones en trastes) para notae. Diseñar API cuando UMT esté más maduro. Coordinado con notae state.md línea 272.

## History

### 2026-05-03 - Fix parser: accidental explícito respetado

`parseChordSymbol`/`parseScaleSymbol` ahora respetan el accidental explícito del usuario. Si root tiene `#` → `preferFlats=false`; si tiene `b` → `preferFlats=true`. `A#maj7` ya no devuelve `Bb` como root. 526 tests pasan. Commit `b32d643`.

### 2026-05-03 - Migración bundle a dist/ + limpieza

Bundle movido de `docs/umt.js` a `dist/umt.js`. Demo movida de `docs/index.html` a `index.html` (raiz). GitHub Pages reconfigurado para servir desde root `/` en vez de `/docs`. CDN URL actualizada a `dist/umt.js`. README, CLAUDE.md, .gitignore, package.json actualizados en consecuencia. Workflow de Next.js `.github/workflows/deploy.yml` eliminado (resto del scaffolding original, fallaba en cada push).


### 2026-04-28 - Demo en producción

Demo verificada en https://memoriainfinita.github.io/UMT. GitHub Pages configurado: branch `main`, folder `/docs`. `public/` renombrado a `docs/` para compatibilidad. Build path actualizado a `docs/umt.js`.

### 2026-04-28 - Publicación en GitHub

Primer push a https://github.com/memoriainfinita/UMT. Rama `main`.
Limpieza pre-push: `archive/`, `docs/` internos, `.env.example`, `metadata.json`, `.eslintrc.json`, `playwright.config.js`, `tests/demo.spec.js` excluidos del repo público.
