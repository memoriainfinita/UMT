/**
 * Harmonic form analysis: detects AABA, binary, ternary, rondo, and other formal structures
 * from a chord progression.
 */
import { Chord } from './chord';
import { parseScaleSymbol } from './parser';

/**
 * Recognized musical form types. `'unknown'` is returned when no pattern matches confidently.
 * Forms that need more than the chords (sonata, theme and variations) are not detected.
 */
export type FormType =
  | 'AABA' | 'AAB' | 'ABAB' | 'ABAC' | 'binary' | 'ternary'
  | 'rondo' | 'blues-12'
  | 'strophic' | 'through-composed' | 'unknown';

/** A labeled section within a formal analysis (e.g. A, B, A'). */
export interface FormSection {
  label: string;
  start: number;
  end: number;
}

/** Result of a harmonic form analysis: detected type, labeled sections, and confidence (0–1). */
export interface FormAnalysis {
  type: FormType;
  sections: FormSection[];
  confidence: number;
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Root pitch class in the chord's own tuning. */
function rootPc(c: Chord): number {
  const oct = c.tuningSystem.octaveSteps;
  return ((c.rootStep % oct) + oct) % oct;
}

function chordsSignature(chords: Chord[]): string {
  return chords.map(c => `${rootPc(c)}:${c.name}`).join(',');
}

function sectionSimilarity(a: Chord[], b: Chord[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (rootPc(a[i]) === rootPc(b[i]) && a[i].name === b[i].name) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

// Twelve-bar blues: allowed roots per bar, in 12-TET semitones above the tonic (I = 0,
// IV = 5, V = 7): quick change in bar 2, V or IV in bar 10, V turnaround in bar 12.
const BLUES_BARS: number[][] = [[0], [0, 5], [0], [0], [5], [5], [0], [0], [7], [7, 5], [0], [0, 7]];

/** True when the chords, one per bar in choruses of 12, follow the twelve-bar blues. */
function isTwelveBarBlues(chords: Chord[], keySymbol: string): boolean {
  if (chords.length === 0 || chords.length % 12 !== 0) return false;
  let tonic: number;
  try { tonic = parseScaleSymbol(keySymbol, chords[0].tuningSystem).rootStep; } catch { return false; }
  const ts = chords[0].tuningSystem;
  const oct = ts.octaveSteps;
  return chords.every((c, i) => BLUES_BARS[i % 12].some(s =>
    (((c.rootStep - tonic - ts.getStepFromStandard(s)) % oct) + oct) % oct === 0));
}

function sliceSection(chords: Chord[], start: number, size: number): Chord[] {
  return chords.slice(start, start + size);
}

// ─── label assignment ────────────────────────────────────────────────────────

function assignLabels(sections: Chord[][]): string[] {
  const labelMap: number[] = [];
  let nextCode = 0;
  for (let i = 0; i < sections.length; i++) {
    let found = -1;
    for (let j = 0; j < i; j++) {
      if (sectionSimilarity(sections[j], sections[i]) >= 0.75) { found = labelMap[j]; break; }
    }
    labelMap.push(found === -1 ? nextCode++ : found);
  }
  const codeToLetter = (n: number) => String.fromCharCode(65 + n); // A, B, C…
  return labelMap.map(codeToLetter);
}

function inferFormType(pattern: string): { type: FormType; confidence: number } {
  if (/^AABA$/.test(pattern)) return { type: 'AABA', confidence: 1 };
  if (/^(AABA){1,}/.test(pattern)) return { type: 'AABA', confidence: 0.9 };
  if (/^AAB$/.test(pattern)) return { type: 'AAB', confidence: 1 };
  if (/^ABAB$/.test(pattern)) return { type: 'ABAB', confidence: 1 };
  if (/^(AB){2,}/.test(pattern)) return { type: 'ABAB', confidence: 0.85 };
  if (/^ABAC$/.test(pattern)) return { type: 'ABAC', confidence: 1 };
  if (/^ABA$/.test(pattern)) return { type: 'ternary', confidence: 1 };
  if (/^AB$/.test(pattern)) return { type: 'binary', confidence: 1 };
  if (/^A+$/.test(pattern) && pattern.length >= 3) return { type: 'strophic', confidence: 0.9 };
  if (/^A+B$/.test(pattern)) return { type: 'AAB', confidence: 0.8 };
  if (/^ABCA/.test(pattern)) return { type: 'rondo', confidence: 0.75 };
  // Detect all-unique sections (no repeats) → through-composed
  const unique = new Set(pattern.split('')).size;
  if (unique === pattern.length && pattern.length >= 3) return { type: 'through-composed', confidence: 0.7 };
  return { type: 'unknown', confidence: 0.3 };
}

// ─── public API ─────────────────────────────────────────────────────────────

export class FormAnalyzer {
  /**
   * Analyzes harmonic form by segmenting `chords` into sections of `barsPerSection`
   * chords (default: auto-detect). Returns form type, labeled sections, and confidence.
   * One chord per bar in choruses of 12 that follow the twelve-bar blues in `keySymbol`
   * give `'blues-12'`, one section per chorus.
   */
  static analyzeHarmonic(
    chords: Chord[],
    keySymbol: string,
    barsPerSection?: number,
  ): FormAnalysis {
    if (chords.length === 0) {
      return { type: 'unknown', sections: [], confidence: 0 };
    }

    if (isTwelveBarBlues(chords, keySymbol)) {
      const sections = Array.from({ length: chords.length / 12 }, (_, i) => ({ label: 'A', start: i * 12, end: i * 12 + 11 }));
      return { type: 'blues-12', sections, confidence: 0.9 };
    }

    const size = barsPerSection ?? Math.max(2, Math.floor(chords.length / 4));
    const numSections = Math.floor(chords.length / size);

    if (numSections < 2) {
      return {
        type: 'unknown',
        sections: [{ label: 'A', start: 0, end: chords.length - 1 }],
        confidence: 0.3,
      };
    }

    const sectionChords: Chord[][] = [];
    for (let i = 0; i < numSections; i++) {
      sectionChords.push(sliceSection(chords, i * size, size));
    }

    const labels = assignLabels(sectionChords);
    const pattern = labels.join('');
    const { type, confidence } = inferFormType(pattern);

    const sections: FormSection[] = sectionChords.map((_, i) => ({
      label: labels[i],
      start: i * size,
      end: Math.min((i + 1) * size - 1, chords.length - 1),
    }));

    return { type, sections, confidence };
  }

  /**
   * Finds passages of at least `minLength` chords that come back later, longest first.
   * Each result is the first occurrence (`start`, `length`) of a passage that recurs
   * without overlapping itself; a passage inside a longer reprise already found, or
   * overlapping one, is not reported again.
   */
  static detectReprise(chords: Chord[], minLength = 2): { start: number; length: number }[] {
    const results: { start: number; length: number }[] = [];
    const n = chords.length;
    if (n < minLength * 2) return results;

    const used = new Array(n).fill(false);
    const free = (from: number, len: number) => used.slice(from, from + len).every(u => !u);
    const mark = (from: number, len: number) => { for (let k = from; k < from + len; k++) used[k] = true; };

    for (let len = Math.floor(n / 2); len >= minLength; len--) {
      for (let i = 0; i + 2 * len <= n; i++) {
        if (!free(i, len)) continue;
        const sig = chordsSignature(chords.slice(i, i + len));
        const repeats: number[] = [];
        for (let j = i + len; j + len <= n; j++) {
          if (free(j, len) && chordsSignature(chords.slice(j, j + len)) === sig) {
            repeats.push(j);
            j += len - 1; // occurrences do not overlap
          }
        }
        if (repeats.length > 0) {
          results.push({ start: i, length: len });
          mark(i, len);
          repeats.forEach(j => mark(j, len));
        }
      }
    }
    return results.sort((a, b) => b.length - a.length || a.start - b.start);
  }
}
