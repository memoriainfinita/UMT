import { Chord } from './chord';

export type FormType =
  | 'AABA' | 'AAB' | 'ABAB' | 'ABAC' | 'binary' | 'ternary'
  | 'rondo' | 'sonata-allegro' | 'theme-variations' | 'blues-12'
  | 'strophic' | 'through-composed' | 'unknown';

export interface FormSection {
  label: string;
  start: number;
  end: number;
}

export interface FormAnalysis {
  type: FormType;
  sections: FormSection[];
  confidence: number;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function chordsSignature(chords: Chord[]): string {
  return chords.map(c => {
    const root = ((c.rootStep % 12) + 12) % 12;
    return `${root}:${c.name}`;
  }).join(',');
}

function sectionSimilarity(a: Chord[], b: Chord[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    const rA = ((a[i].rootStep % 12) + 12) % 12;
    const rB = ((b[i].rootStep % 12) + 12) % 12;
    if (rA === rB && a[i].name === b[i].name) matches++;
  }
  return matches / Math.max(a.length, b.length);
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
   */
  static analyzeHarmonic(
    chords: Chord[],
    _keySymbol: string,
    barsPerSection?: number,
  ): FormAnalysis {
    if (chords.length === 0) {
      return { type: 'unknown', sections: [], confidence: 0 };
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
   * Finds repeated sections of at least `minLength` chords.
   * Returns array of `{ start, length }` - start index of each repeated segment.
   */
  static detectReprise(chords: Chord[], minLength = 2): { start: number; length: number }[] {
    const results: { start: number; length: number }[] = [];
    const n = chords.length;
    if (n < minLength * 2) return results;

    const seen = new Map<string, number>();

    for (let len = minLength; len <= Math.floor(n / 2); len++) {
      for (let i = 0; i <= n - len; i++) {
        const sig = chordsSignature(chords.slice(i, i + len));
        if (seen.has(sig)) {
          const firstAt = seen.get(sig)!;
          // avoid duplicates in results
          const already = results.some(r => r.start === firstAt && r.length === len);
          if (!already) results.push({ start: firstAt, length: len });
        } else {
          seen.set(sig, i);
        }
      }
    }

    // Keep only maximal non-overlapping reprises
    return results.sort((a, b) => b.length - a.length || a.start - b.start);
  }
}
