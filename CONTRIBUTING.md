# Contributing

## Setup

UMT uses pnpm 11 (the version is pinned in `package.json`). It installs only versions published more than a day ago and runs install scripts only for the packages approved in `pnpm-workspace.yaml` (esbuild).

```bash
pnpm install
pnpm run typecheck     # tsc --noEmit, lib/ and tests/
pnpm run lint          # ESLint
pnpm run docs:check    # fails on an exported symbol without documentation
pnpm run test:unit     # vitest
pnpm run build         # dist/umt.js (IIFE), dist/umt.mjs (ESM), dist/umt.d.ts (types)
pnpm dlx http-server . -p 8080   # the demo, index.html
```

CI runs all of these on every push and pull request, and fails if `dist/` does not match the sources.

## Rules

- **Library code in `lib/music-theory/`**, TypeScript, no runtime dependencies. Library strings are in English; names in other languages go through `chord-names.ts`.
- **Pitches are steps from A4 = 0** in a `TuningSystem`. Do not assume 12-TET: map formulas with `tuning.getStepFromStandard()`. A function that only makes sense in 12-TET says so in its documentation and returns its "nothing found" value for other tunings.
- **Every export is documented** (JSDoc): what it does, its parameters, what it returns, and what each field of a returned object holds. `pnpm run docs:check` enforces it.
- **Every export carries `@category`**, the module's group in the Modules section of `README.md` (Core, Tonal harmony, Post-tonal, World music, Rhythm, Microtonal / Xenharmonic, Notation). It places the export in the API docs menu; without it the export falls under Guides.
- **One test file per module** in `tests/unit/`, headed by the theory sources the module follows. Reference data (scales, ragas, maqamat, Forte classes, rhythmic cycles) is checked against a cited source, and the source is named in the module.
- **A bug fix starts with a failing test** that reproduces it.
- **Output changes are breaking changes.** If an existing function returns something different for the same input, it goes under "Breaking changes" in `CHANGELOG.md`.

## Commit `dist/`

`dist/umt.js`, `dist/umt.mjs` and `dist/umt.d.ts` are tracked: jsDelivr and GitHub installs serve them. Run `pnpm run build` and commit them with the source change.

## Releases

1. Bump the version: `pnpm version X.Y.Z --no-git-tag-version`.
2. Add the `CHANGELOG.md` entry, and update the version in `README.md`, `GUIDE.md` and `index.html`.
3. Regenerate the API docs after the bump, so they carry the new version: `pnpm run docs`, and commit `api-docs/`.
4. Tag `vX.Y.Z` and push the tag with the branch.
