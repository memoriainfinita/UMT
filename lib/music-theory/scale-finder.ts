/**
 * Finds the scales of SCALE_PATTERNS that contain a set of notes, ranked.
 */
import { Note } from './note';
import { SCALE_PATTERNS } from './dictionaries';
import { parseScaleSymbol } from './parser';
import { NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP, preferFlatsForKey } from './utils';

/**
 * A scale that contains every note of the set.
 * @category Tonal harmony
 */
export interface ScaleMatch {
  /** Scale symbol, readable by `parseScaleSymbol`: `'C major'`. */
  name: string;
  /** Root note name: `'C'`, `'F#'`. */
  root: string;
  /** Scale type, a key of `SCALE_PATTERNS`: `'major'`, `'dorian'`. */
  type: string;
  /** Other names of the same pattern in SCALE_PATTERNS (`'ionian'`, `'greek-hypolydian'`). */
  aliases: string[];
  /** Notes of the scale, spelled. */
  notes: string[];
  /** Scale notes that are not in the set. */
  extra: string[];
  /** The scale's root is the tonic (given, or the lowest note). */
  rootIsTonic: boolean;
  /** 0 common (diatonic modes, harmonic and melodic minor, pentatonics, blues), 1 other families, 2 regional and symmetric collections, 3 chromatic. */
  tier: number;
}

/**
 * Options for `findScalesForNotes`.
 * @category Tonal harmony
 */
export interface FindScalesOptions {
  /** Tonic to rank first (`'D'`, `'F#'`); default: the lowest note. */
  tonic?: string;
  /** Only scales whose root is the tonic. */
  tonicOnly?: boolean;
  /** At most this many results. */
  limit?: number;
}

// Preferred name for patterns with aliases, and the tier of each family
const PREFERRED = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'altered', 'melodic minor'];
const TIER_0 = new Set([
  'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian',
  'harmonic minor', 'melodic minor', 'pentatonic major', 'pentatonic minor', 'blues',
]);
const TIER_1 = new Set([
  'locrian #6', 'ionian #5', 'dorian #4', 'phrygian dominant', 'lydian #2', 'super locrian bb7', 'harmonic major',
  'dorian b2', 'lydian augmented', 'lydian dominant', 'mixolydian b6', 'locrian #2', 'altered',
  'whole tone', 'augmented', 'whole-half diminished', 'half-whole diminished',
  'blues major', 'bebop dominant', 'bebop major', 'bebop dorian',
]);
const tierOf = (type: string) => (type === 'chromatic' ? 3 : TIER_0.has(type) ? 0 : TIER_1.has(type) ? 1 : 2);

/** Patterns with their names: the preferred name first, Greek names last. */
function patternGroups(): { type: string; aliases: string[]; offsets: number[] }[] {
  const groups = new Map<string, string[]>();
  for (const [type, steps] of Object.entries(SCALE_PATTERNS)) {
    const key = steps.join(',');
    groups.set(key, [...(groups.get(key) ?? []), type]);
  }
  return [...groups.values()].map(names => {
    const ranked = [...names].sort((a, b) => {
      const pa = PREFERRED.indexOf(a), pb = PREFERRED.indexOf(b);
      if (pa !== pb) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
      return Number(a.startsWith('greek-')) - Number(b.startsWith('greek-'));
    });
    const steps = SCALE_PATTERNS[ranked[0]];
    const offsets = steps.slice(0, -1).reduce((acc, s) => [...acc, acc[acc.length - 1] + s], [0]);
    return { type: ranked[0], aliases: ranked.slice(1), offsets };
  });
}

const pcOfName = (name: string): number => {
  const m = name.match(/^([A-G])(#{1,2}|b{1,2})?/);
  if (!m) throw new RangeError(`findScalesForNotes: unknown tonic "${name}"`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]!;
  const acc = m[2] ?? '';
  return (((base + (acc.startsWith('#') ? 1 : -1) * acc.length) % 12) + 12) % 12;
};

/**
 * Returns the scales of SCALE_PATTERNS, on every root, that contain all the given notes,
 * ranked: root on the tonic first, then by tier (common scales before other families and
 * regional collections), then by fewer notes added to the set. The chromatic scale, which
 * holds any set, comes last on every root. Aliases of one pattern are
 * one result. Roots take the letter of a given note when one has that pitch class.
 * Other tunings are read by the nearest 12-TET pitch class.
 * @example
 * findScalesForNotes(['C4', 'E4', 'G4', 'Bb4'].map(n => parseNote(n)))[0].name // 'C mixolydian'
 * @category Tonal harmony
 */
export function findScalesForNotes(notes: Note[], options: FindScalesOptions = {}): ScaleMatch[] {
  if (notes.length === 0) return [];
  const pcOf = (n: Note) => ((Math.round(12 * Math.log2(n.frequency / 440)) + 9) % 12 + 12) % 12; // 0 = C
  const lowest = notes.reduce((a, b) => (b.frequency < a.frequency ? b : a));
  const tonicPc = options.tonic ? pcOfName(options.tonic) : pcOf(lowest);
  const pcs = new Set(notes.map(pcOf));

  // names as written, when the notes carry letters
  const written = new Map<number, string>();
  for (const n of notes) {
    const m = n.name.match(/^[A-G](#{1,2}|b{1,2})?/);
    if (m && !written.has(pcOf(n))) written.set(pcOf(n), m[0]);
  }
  const rootName = (pc: number) => {
    if (written.has(pc)) return written.get(pc)!;
    const flat = NOTE_NAMES_12TET_FLAT[(pc + 3) % 12]; // names are indexed from A
    return preferFlatsForKey(flat, 'major') ? flat : NOTE_NAMES_12TET_SHARP[(pc + 3) % 12];
  };

  const results: ScaleMatch[] = [];
  for (const { type, aliases, offsets } of patternGroups()) {
    for (let root = 0; root < 12; root++) {
      if (options.tonicOnly && root !== tonicPc) continue;
      const scalePcs = new Set(offsets.map(o => (root + o) % 12));
      if ([...pcs].some(p => !scalePcs.has(p))) continue;
      const root12 = rootName(root);
      let spelled: string[];
      try {
        spelled = parseScaleSymbol(`${root12} ${type}`).getNotes().slice(0, offsets.length).map(n => n.name.replace(/-?\d+$/, ''));
      } catch {
        continue;
      }
      results.push({
        name: `${root12} ${type}`, root: root12, type, aliases,
        notes: spelled,
        extra: spelled.filter((_, i) => !pcs.has((root + offsets[i]) % 12)),
        rootIsTonic: root === tonicPc,
        tier: tierOf(type),
      });
    }
  }

  const isChromatic = (m: ScaleMatch) => Number(m.tier === 3);
  results.sort((a, b) =>
    isChromatic(a) - isChromatic(b) || Number(b.rootIsTonic) - Number(a.rootIsTonic) ||
    a.tier - b.tier || a.extra.length - b.extra.length);
  return options.limit !== undefined ? results.slice(0, options.limit) : results;
}
