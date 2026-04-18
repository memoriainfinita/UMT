# CircleOfFifths Expansion — Design Spec

**Date:** 2026-04-18
**File:** `lib/music-theory/circle.ts`
**Scope:** Additive — no existing methods change.

## Goal

Make `CircleOfFifths` a complete standalone module covering all circle-of-fifths theory: navigation, distance, proximity, and tonal relationships. Harmonic analysis (diatonic chords, pivot chords) remains in `harmony.ts`, which may call `CircleOfFifths` internally.

## New Type

```ts
type RelatedKey = {
  key: string;
  relationship: 'relative' | 'parallel' | 'dominant' | 'subdominant' | 'neighbor';
  distance: number;
};
```

Exported from `circle.ts` and re-exported via `index.ts`.

## New Methods

### `getPosition(key): number`

Returns the 0–11 index of the key on its circle (major or minor). C/a = 0, G/e = 1, D/b = 2… in clockwise order.

Returns `-1` if the key is not found (consistent with `indexOf` semantics — callers can guard).

```ts
CircleOfFifths.getPosition('D')   // 2
CircleOfFifths.getPosition('f#')  // 3
```

### `navigate(key, steps): string`

Moves `steps` positions clockwise (positive) or counter-clockwise (negative) from `key`. Wraps around at 12.

```ts
CircleOfFifths.navigate('C', 2)   // 'D'
CircleOfFifths.navigate('C', -1)  // 'F'
CircleOfFifths.navigate('g', 3)   // 'c#'
```

### `getDistance(key1, key2): number`

Shortest distance between two keys on the same circle (0–6). Both keys must be the same mode (both major or both minor); if modes differ, returns `-1`.

```ts
CircleOfFifths.getDistance('C', 'A')   // 3
CircleOfFifths.getDistance('C', 'F#')  // 6
CircleOfFifths.getDistance('C', 'G')   // 1
```

### `getParallel(key): string`

Returns the parallel key — same root note, opposite mode.

```ts
CircleOfFifths.getParallel('C')   // 'c'
CircleOfFifths.getParallel('a')   // 'A'
CircleOfFifths.getParallel('F#')  // 'f#'
```

Implementation: flip case of the first character, keep accidentals. Applies `normalizeKey` to handle enharmonics.

### `getNeighbors(key, radius = 1): string[]`

Returns all keys within `radius` steps on the same circle, excluding `key` itself. Result is sorted by distance (closest first), then clockwise within the same distance.

```ts
CircleOfFifths.getNeighbors('C')      // ['G', 'F']
CircleOfFifths.getNeighbors('C', 2)   // ['G', 'F', 'D', 'Bb']
```

### `getRelatedKeys(key): RelatedKey[]`

Returns all tonally related keys sorted by proximity. Covers:

- `relative` — relative major/minor (distance conceptually 0, separate circle)
- `parallel` — same root, opposite mode
- `dominant` — 1 step clockwise (same circle)
- `subdominant` — 1 step counter-clockwise (same circle)
- `neighbor` — ±2 steps on the same circle

Sorted by `distance` ascending. Within the same distance, order: relative → parallel → dominant → subdominant → neighbor.

```ts
CircleOfFifths.getRelatedKeys('C')
// [
//   { key: 'a',  relationship: 'relative',    distance: 0 },
//   { key: 'c',  relationship: 'parallel',    distance: 0 },
//   { key: 'G',  relationship: 'dominant',    distance: 1 },
//   { key: 'F',  relationship: 'subdominant', distance: 1 },
//   { key: 'D',  relationship: 'neighbor',    distance: 2 },
//   { key: 'Bb', relationship: 'neighbor',    distance: 2 },
// ]
```

## Boundary

`getRelatedKeys` returns **key names only**. If a caller needs pivot chords between two related keys, that belongs in `harmony.ts`:

```ts
const related = CircleOfFifths.getRelatedKeys('C');
// harmony.ts uses related[i].key to find shared diatonic chords
```

## What Does Not Change

- `getSignature`, `getRelative`, `getDominant`, `getSubdominant` — unchanged
- `normalizeKey` — stays private, reused by new methods
- No new dependencies

## Files Touched

- `lib/music-theory/circle.ts` — add `RelatedKey` type + 6 methods
- `lib/music-theory/index.ts` — re-export `RelatedKey`
