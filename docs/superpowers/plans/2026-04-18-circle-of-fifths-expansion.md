# CircleOfFifths Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six new static methods to `CircleOfFifths` — `getPosition`, `navigate`, `getDistance`, `getParallel`, `getNeighbors`, `getRelatedKeys` — making it a complete circle-of-fifths theory module.

**Architecture:** Purely additive changes to `circle.ts`. No existing methods change. New `RelatedKey` type exported from `circle.ts` and re-exported via `index.ts`. All methods are static, stateless, and follow the existing major=uppercase / minor=lowercase convention.

**Tech Stack:** TypeScript, vitest (unit tests), esbuild (bundle verification).

---

## Task 1: Setup vitest for unit testing

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts` at project root:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test:unit": "vitest run"
```

- [ ] **Step 4: Create test directory**

```bash
mkdir -p tests/unit
```

- [ ] **Step 5: Verify vitest runs (no tests yet)**

```bash
npm run test:unit
```

Expected output: `No test files found` or similar — no error, just no tests.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: add vitest for unit testing"
```

---

## Task 2: getPosition

**Files:**
- Create: `tests/unit/circle.test.ts`
- Modify: `lib/music-theory/circle.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/circle.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CircleOfFifths } from '../../lib/music-theory/circle';

describe('CircleOfFifths.getPosition', () => {
  it('returns 0 for C major', () => {
    expect(CircleOfFifths.getPosition('C')).toBe(0);
  });
  it('returns 1 for G major', () => {
    expect(CircleOfFifths.getPosition('G')).toBe(1);
  });
  it('returns 2 for D major', () => {
    expect(CircleOfFifths.getPosition('D')).toBe(2);
  });
  it('returns 11 for F major', () => {
    expect(CircleOfFifths.getPosition('F')).toBe(11);
  });
  it('returns 0 for a minor', () => {
    expect(CircleOfFifths.getPosition('a')).toBe(0);
  });
  it('returns 3 for f# minor', () => {
    expect(CircleOfFifths.getPosition('f#')).toBe(3);
  });
  it('normalizes enharmonic Gb to F# position', () => {
    expect(CircleOfFifths.getPosition('Gb')).toBe(CircleOfFifths.getPosition('F#'));
  });
  it('returns -1 for unknown key', () => {
    expect(CircleOfFifths.getPosition('X')).toBe(-1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `CircleOfFifths.getPosition is not a function`

- [ ] **Step 3: Implement getPosition**

In `lib/music-theory/circle.ts`, add inside the `CircleOfFifths` class after `getSubdominant`:

```typescript
  /**
   * Returns the 0–11 index of the key on its circle (C/a = 0, G/e = 1…).
   * Returns -1 if the key is not recognized.
   */
  static getPosition(key: string): number {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    return circle.indexOf(normalized);
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/circle.test.ts lib/music-theory/circle.ts
git commit -m "feat(circle): add getPosition"
```

---

## Task 3: navigate

**Files:**
- Modify: `tests/unit/circle.test.ts`
- Modify: `lib/music-theory/circle.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/circle.test.ts`:

```typescript
describe('CircleOfFifths.navigate', () => {
  it('1 step clockwise from C is G', () => {
    expect(CircleOfFifths.navigate('C', 1)).toBe('G');
  });
  it('1 step counter-clockwise from C is F', () => {
    expect(CircleOfFifths.navigate('C', -1)).toBe('F');
  });
  it('2 steps clockwise from C is D', () => {
    expect(CircleOfFifths.navigate('C', 2)).toBe('D');
  });
  it('wraps around: 12 steps returns same key', () => {
    expect(CircleOfFifths.navigate('G', 12)).toBe('G');
  });
  it('wraps around: -12 steps returns same key', () => {
    expect(CircleOfFifths.navigate('D', -12)).toBe('D');
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.navigate('a', 1)).toBe('e');
  });
  it('returns empty string for unknown key', () => {
    expect(CircleOfFifths.navigate('X', 1)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `CircleOfFifths.navigate is not a function`

- [ ] **Step 3: Implement navigate**

Add inside `CircleOfFifths` class in `lib/music-theory/circle.ts`:

```typescript
  /**
   * Moves steps positions clockwise (positive) or counter-clockwise (negative).
   * Returns empty string if key is not recognized.
   */
  static navigate(key: string, steps: number): string {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    const pos = circle.indexOf(normalized);
    if (pos === -1) return '';
    return circle[((pos + steps) % 12 + 12) % 12];
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/circle.test.ts lib/music-theory/circle.ts
git commit -m "feat(circle): add navigate"
```

---

## Task 4: getDistance

**Files:**
- Modify: `tests/unit/circle.test.ts`
- Modify: `lib/music-theory/circle.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/circle.test.ts`:

```typescript
describe('CircleOfFifths.getDistance', () => {
  it('C to G is 1', () => {
    expect(CircleOfFifths.getDistance('C', 'G')).toBe(1);
  });
  it('C to F is 1', () => {
    expect(CircleOfFifths.getDistance('C', 'F')).toBe(1);
  });
  it('C to D is 2', () => {
    expect(CircleOfFifths.getDistance('C', 'D')).toBe(2);
  });
  it('C to F# is 6 (tritone — max distance)', () => {
    expect(CircleOfFifths.getDistance('C', 'F#')).toBe(6);
  });
  it('is symmetric: G to C equals C to G', () => {
    expect(CircleOfFifths.getDistance('G', 'C')).toBe(1);
  });
  it('same key returns 0', () => {
    expect(CircleOfFifths.getDistance('C', 'C')).toBe(0);
  });
  it('returns -1 for mixed modes', () => {
    expect(CircleOfFifths.getDistance('C', 'a')).toBe(-1);
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.getDistance('a', 'e')).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `CircleOfFifths.getDistance is not a function`

- [ ] **Step 3: Implement getDistance**

Add inside `CircleOfFifths` class:

```typescript
  /**
   * Shortest distance (0–6) between two keys on the same circle.
   * Returns -1 if keys are of different modes or unrecognized.
   */
  static getDistance(key1: string, key2: string): number {
    const n1 = this.normalizeKey(key1);
    const n2 = this.normalizeKey(key2);
    const isMinor1 = n1 === n1.toLowerCase() && n1.length > 0;
    const isMinor2 = n2 === n2.toLowerCase() && n2.length > 0;
    if (isMinor1 !== isMinor2) return -1;
    const pos1 = this.getPosition(key1);
    const pos2 = this.getPosition(key2);
    if (pos1 === -1 || pos2 === -1) return -1;
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff);
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/circle.test.ts lib/music-theory/circle.ts
git commit -m "feat(circle): add getDistance"
```

---

## Task 5: getParallel

**Files:**
- Modify: `tests/unit/circle.test.ts`
- Modify: `lib/music-theory/circle.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/circle.test.ts`:

```typescript
describe('CircleOfFifths.getParallel', () => {
  it('C major → c minor', () => {
    expect(CircleOfFifths.getParallel('C')).toBe('c');
  });
  it('a minor → A major', () => {
    expect(CircleOfFifths.getParallel('a')).toBe('A');
  });
  it('F# major → f# minor', () => {
    expect(CircleOfFifths.getParallel('F#')).toBe('f#');
  });
  it('Bb major → bb minor', () => {
    expect(CircleOfFifths.getParallel('Bb')).toBe('bb');
  });
  it('f# minor → F# major', () => {
    expect(CircleOfFifths.getParallel('f#')).toBe('F#');
  });
  it('double application returns original', () => {
    expect(CircleOfFifths.getParallel(CircleOfFifths.getParallel('D'))).toBe('D');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `CircleOfFifths.getParallel is not a function`

- [ ] **Step 3: Implement getParallel**

Add inside `CircleOfFifths` class:

```typescript
  /**
   * Returns the parallel key — same root, opposite mode.
   * 'C' → 'c', 'a' → 'A', 'F#' → 'f#'.
   */
  static getParallel(key: string): string {
    const normalized = this.normalizeKey(key);
    if (!normalized) return '';
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    if (isMinor) {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    } else {
      return normalized.charAt(0).toLowerCase() + normalized.slice(1);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/circle.test.ts lib/music-theory/circle.ts
git commit -m "feat(circle): add getParallel"
```

---

## Task 6: getNeighbors

**Files:**
- Modify: `tests/unit/circle.test.ts`
- Modify: `lib/music-theory/circle.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/circle.test.ts`:

```typescript
describe('CircleOfFifths.getNeighbors', () => {
  it('radius 1 from C returns G and F', () => {
    expect(CircleOfFifths.getNeighbors('C')).toEqual(['G', 'F']);
  });
  it('radius 2 from C returns G, F, D, Bb', () => {
    expect(CircleOfFifths.getNeighbors('C', 2)).toEqual(['G', 'F', 'D', 'Bb']);
  });
  it('does not include the key itself', () => {
    expect(CircleOfFifths.getNeighbors('C')).not.toContain('C');
  });
  it('works for minor keys', () => {
    expect(CircleOfFifths.getNeighbors('a')).toEqual(['e', 'd']);
  });
  it('radius 0 returns empty array', () => {
    expect(CircleOfFifths.getNeighbors('C', 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `CircleOfFifths.getNeighbors is not a function`

- [ ] **Step 3: Implement getNeighbors**

Add inside `CircleOfFifths` class:

```typescript
  /**
   * Returns keys within radius steps on the same circle, sorted closest first.
   * Clockwise neighbor before counter-clockwise at each distance. Excludes key itself.
   */
  static getNeighbors(key: string, radius = 1): string[] {
    const result: string[] = [];
    for (let d = 1; d <= radius; d++) {
      const cw = this.navigate(key, d);
      const ccw = this.navigate(key, -d);
      if (cw) result.push(cw);
      if (ccw && ccw !== cw) result.push(ccw);
    }
    return result;
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/circle.test.ts lib/music-theory/circle.ts
git commit -m "feat(circle): add getNeighbors"
```

---

## Task 7: RelatedKey type + getRelatedKeys

**Files:**
- Modify: `tests/unit/circle.test.ts`
- Modify: `lib/music-theory/circle.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/circle.test.ts`:

```typescript
describe('CircleOfFifths.getRelatedKeys', () => {
  it('returns 6 entries for C major', () => {
    expect(CircleOfFifths.getRelatedKeys('C')).toHaveLength(6);
  });
  it('includes relative minor with distance 0', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'a', relationship: 'relative', distance: 0 });
  });
  it('includes parallel minor with distance 0', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'c', relationship: 'parallel', distance: 0 });
  });
  it('includes dominant with distance 1', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'G', relationship: 'dominant', distance: 1 });
  });
  it('includes subdominant with distance 1', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    expect(related).toContainEqual({ key: 'F', relationship: 'subdominant', distance: 1 });
  });
  it('includes two neighbors at distance 2', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    const neighbors = related.filter(r => r.relationship === 'neighbor');
    expect(neighbors).toHaveLength(2);
    expect(neighbors.every(n => n.distance === 2)).toBe(true);
  });
  it('is sorted by distance ascending', () => {
    const related = CircleOfFifths.getRelatedKeys('C');
    for (let i = 1; i < related.length; i++) {
      expect(related[i].distance).toBeGreaterThanOrEqual(related[i - 1].distance);
    }
  });
  it('works for minor keys', () => {
    const related = CircleOfFifths.getRelatedKeys('a');
    expect(related).toContainEqual({ key: 'C', relationship: 'relative', distance: 0 });
    expect(related).toContainEqual({ key: 'A', relationship: 'parallel', distance: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `CircleOfFifths.getRelatedKeys is not a function`

- [ ] **Step 3: Add RelatedKey type and implement getRelatedKeys**

At the top of `lib/music-theory/circle.ts`, before the class declaration, add:

```typescript
export type RelatedKey = {
  key: string;
  relationship: 'relative' | 'parallel' | 'dominant' | 'subdominant' | 'neighbor';
  distance: number;
};
```

Then add inside the `CircleOfFifths` class:

```typescript
  /**
   * Returns all tonally related keys sorted by distance ascending.
   * Covers: relative, parallel, dominant, subdominant, and ±2 neighbors.
   */
  static getRelatedKeys(key: string): RelatedKey[] {
    const result: RelatedKey[] = [];

    const rel = this.getRelative(key);
    if (rel) result.push({ key: rel, relationship: 'relative', distance: 0 });

    const par = this.getParallel(key);
    if (par) result.push({ key: par, relationship: 'parallel', distance: 0 });

    const dom = this.getDominant(key);
    if (dom) result.push({ key: dom, relationship: 'dominant', distance: 1 });

    const sub = this.getSubdominant(key);
    if (sub) result.push({ key: sub, relationship: 'subdominant', distance: 1 });

    const n2cw = this.navigate(key, 2);
    const n2ccw = this.navigate(key, -2);
    if (n2cw) result.push({ key: n2cw, relationship: 'neighbor', distance: 2 });
    if (n2ccw) result.push({ key: n2ccw, relationship: 'neighbor', distance: 2 });

    return result;
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/circle.test.ts lib/music-theory/circle.ts
git commit -m "feat(circle): add RelatedKey type and getRelatedKeys"
```

---

## Task 8: Export RelatedKey + build verification

**Files:**
- Verify: `lib/music-theory/index.ts` (already re-exports `./circle` — no change needed)
- Verify build: `public/umt.js`

- [ ] **Step 1: Verify RelatedKey is exported**

`index.ts` already has `export * from './circle'` — `RelatedKey` will be included automatically. Confirm:

```bash
grep "RelatedKey" lib/music-theory/index.ts
```

Expected: no output needed — `export *` covers it. If you see a named export conflict, add `export type { RelatedKey } from './circle'` explicitly.

- [ ] **Step 2: Run full test suite**

```bash
npm run test:unit
```

Expected: all tests PASS, no failures.

- [ ] **Step 3: Build the bundle**

```bash
npm run build:umt
```

Expected: `public/umt.js` rebuilt with no TypeScript errors.

- [ ] **Step 4: Verify new methods are accessible in the bundle**

```bash
node -e "
const { UMT } = require('./public/umt.js');
// umt.js is IIFE, access via global UMT
" 2>&1 || echo "IIFE format — check manually in browser console"
```

Since it's an IIFE, verify in browser: open `public/example.html`, open console, run:

```js
UMT.CircleOfFifths.getPosition('C')       // → 0
UMT.CircleOfFifths.navigate('C', 1)       // → 'G'
UMT.CircleOfFifths.getDistance('C', 'G')  // → 1
UMT.CircleOfFifths.getParallel('C')       // → 'c'
UMT.CircleOfFifths.getNeighbors('C')      // → ['G', 'F']
UMT.CircleOfFifths.getRelatedKeys('C')    // → array of 6
```

- [ ] **Step 5: Final commit**

```bash
git add public/umt.js public/umt.js.map
git commit -m "build: rebuild umt.js with CircleOfFifths expansion"
```
