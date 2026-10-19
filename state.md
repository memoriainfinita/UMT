---
created: 2026-04-28
last_updated: 2026-10-19
---

# State - Universal Music Theory Library

## System

- Platform: Windows 10 Pro, bash via Claude Code
- Node: 24 (local y CI)
- Package manager: pnpm 11 (`packageManager` en `package.json`; `pnpm-workspace.yaml` aprueba el script de instalación de esbuild)

## Project

- Repo: https://github.com/memoriainfinita/UMT
- Demo: https://memoriainfinita.github.io/UMT (GitHub Pages, branch `main`, root `/`)
- API Docs: https://memoriainfinita.github.io/UMT/api-docs/ (TypeDoc, generado en `api-docs/`, con el diseño de la demo: `docs-theme/custom.css` y `custom.js`)
- CDN: https://cdn.jsdelivr.net/gh/memoriainfinita/UMT@v0.7.1/dist/umt.js (IIFE) y `dist/umt.mjs` (ESM)
- Versión: 0.7.1 (tag `v0.7.1`). Cambios por versión en `CHANGELOG.md`; `v0.1.0` es el estado previo a la auditoría de 2026-10 (`801e5ec`)
- Auditoría 2026-10 cerrada: detalle en `docs/auditoria-2026-10.md`; peticiones de MODUS y respuestas en `docs/notas-desde-modus-2026-10.md` (los dos sin versionar)
- Consumidores: MODUS y notae, cada uno fijado a un tag. Solo la sesión de UMT commitea aquí; MODUS deja sus peticiones en las notas
- Status: publicado y en producción.
- Deploy: `pnpm run build` + commit `dist/` + push; versión nueva: `package.json`, `CHANGELOG.md`, versión en `README.md`, `GUIDE.md` e `index.html`, `pnpm run docs` después de subir la versión, y tag `vX.Y.Z` (pasos en `CONTRIBUTING.md`).
- Documentación para desarrolladores: `GUIDE.md` (conceptos, entradas, salidas, recetas) y `CONTRIBUTING.md`, publicadas también dentro de las API docs

## Dependencies

- esbuild (fijado 0.28.2) - compila `dist/umt.js` (IIFE, 152 kb) y `dist/umt.mjs` (ESM)
- dts-bundle-generator (fijado 9.5.1) - tipos en un solo `dist/umt.d.ts`
- typedoc - genera API docs HTML en `api-docs/` (`pnpm run docs`); `pnpm run docs:check` falla si una exportación no tiene JSDoc (en la CI)
- vitest - tests unitarios (`pnpm run test:unit`) - 1318 tests, un archivo por módulo más la batería de afinaciones (`tuning-conformance.test.ts`)
- GitHub Actions (`.github/workflows/ci.yml`) - typecheck, lint, tests, build y `dist` igual a las fuentes
- Tone.js CDN - audio en demo
- abcjs CDN - partituras en demo
- Fraunces (Google Fonts) - títulos en demo; el resto es CSS propio, sin Tailwind

## Patterns

- [coordinate-system] Steps from A4=0. C4=-9 in 12-TET. Confirmed 2026-04.
- [library-language] All library strings in English. Confirmed 2026-04.
- [build] `pnpm run build` genera `dist/umt.js`, `dist/umt.mjs` y `dist/umt.d.ts`; los tres se commitean y la CI falla si no coinciden con las fuentes. Confirmed 2026-10.
- [package-manager] pnpm, no npm, por los ataques a paquetes de npm de 2026: no instala versiones de menos de un día y solo ejecuta scripts de instalación aprobados. Lo que importa la configuración va declarado (`@eslint/js`: con npm funcionaba sin declarar). En la CI, la acción de pnpm va fijada a commit. Confirmed 2026-10.
- [docs] Toda exportación lleva JSDoc, también cada campo de los objetos que devuelve, sacado del código. Los ejemplos de `GUIDE.md` y del README se ejecutan contra `dist/umt.mjs` antes de publicarlos: el valor del comentario es el que devuelve. Confirmed 2026-10.
- [docs] Cada exportación lleva `@category` con el grupo de su módulo en la sección Modules del README; el menú de las API docs se agrupa con eso. Sin la etiqueta cae en Guides sin aviso. El wiki de GitHub queda desactivado: la documentación vive en el repo y se versiona con el código. Confirmed 2026-10.
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
- [harmony] Modulación en `analyzeProgression`: empieza en el primer acorde ajeno a la tonalidad activa; tonalidad nueva por cadencia auténtica, luego tónica presente, luego Krumhansl; menos de tres acordes es tonicización, y también un pasaje cuyos acordes ajenos son todos dominantes secundarias de la tonalidad activa y tras el que se vuelve a ella (turnaround VI7 ii7 V7 I7). Numerales y cadencias en la tonalidad local (`ChordAnalysis.key`). Confirmed 2026-10.
- [harmony] `style: 'blues'` en `analyzeProgression`: I7, IV7 y V7 son de la tonalidad (T, S, D), salvo el I7 precedido de su ii, que sigue siendo V7/IV. Sin la opción, I7 → IV es V7/IV. Cadencia auténtica y rota solo con la sensible en el V. Confirmed 2026-10.
- [neo-riemannian] P, L y R solo sobre tríadas mayores y menores exactas; cualquier otro acorde da `null`. Confirmed 2026-10.
- [data] Los datos de referencia se contrastan con fuente y los tests fijan los valores: Forte de la lista de Wikipedia (223 clases, prime forms de Rahn, Z mayúscula), maqamat de maqamworld.com (forma ascendente), ragas de las fichas de Wikipedia (vadi y samvadi como número de svara, Sa = 1 … Ni = 7). La fuente va citada en la cabecera del módulo. Confirmed 2026-10.
- [slash] `analyzeSlash`: la estructura superior es el acorde sin el bajo (D/C → D). Con notas tocadas, la más grave es el bajo y las de encima, sin su clase de altura, se leen sobre él (C3 D4 F#4 A4 = D sobre C); se lee el conjunto entero si es tríada, sexta o cuatríada con la fundamental en el bajo (Cmaj7, no Em/C) o si las de encima no forman acorde de tres clases (E3 C4 G4 = C/E). Confirmed 2026-10.
- [substitution] Sustitutos diatónicos: el acorde de la escala a una tercera con la misma función (I → iii, vi; ii ↔ IV; V ↔ vii°), en mayor y menor natural, con la grafía y el tipo (tríada o cuatríada) de la escala. En mayor, IV y ii toman la subdominante menor (iv, bVII7, iiø7), y esta vuelve a IV. Confirmed 2026-10.

## TODO

- Petición de MODUS del 2026-10-19 en `docs/notas-desde-modus-2026-10.md`, "tonalidades modales y préstamos habituales": `analyzeProgression` con un modo como tonalidad (diatónicos, préstamos y funciones del modo; cadencia sin sensible), detección de modos en `KeyDetection`, marca `common` en `getBorrowedChords`. Sin diseño
- Pasos 2 a 4 del plan en `docs/plan-2026-10.md` (sin versionar). Siguiente: diseño del paso 2 (notas escritas, referencia de altura, `Interval` con calidad), a presentar antes de implementar

Lo pasado: `state-history.md`.
