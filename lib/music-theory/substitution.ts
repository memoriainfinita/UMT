/**
 * Chord substitution engine: tritone subs, diatonic substitutions, sus4, and deceptive resolutions.
 */
import { Chord, chordQualityFromIntervals } from './chord';
import { parseChordSymbol, parseScaleSymbol } from './parser';
import { get12TETBaseName, preferFlatsForKey, NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP } from './utils';

/**
 * A possible chord substitution with its type and harmonic explanation.
 * @category Tonal harmony
 */
export interface SubstitutionOption {
  /** The substitute chord. */
  chord: Chord;
  /** Kind of substitution; `substitutionTypeName` gives it in words, in English or Spanish. */
  type: 'tritone' | 'diatonic' | 'deceptive' | 'chromatic-mediant' | 'sus4' | 'modal';
  /** Why it works, in English: `'Tritone sub: Db7 shares the tritone with G7'`. */
  explanation: string;
}

/** Wraps `n` into [0, 11] — handles negative values correctly. */
function pcMod(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Returns the note name for pitch class `pc` (0=A), using flats or sharps. */
function noteName(pc: number, flat: boolean): string {
  return flat ? NOTE_NAMES_12TET_FLAT[pc] : NOTE_NAMES_12TET_SHARP[pc];
}

/**
 * Returns harmonic substitution options for `chord` in the given key.
 *
 * Covers: tritone substitution (for V7), sus4 suspension, deceptive resolution,
 * diatonic substitutions in major and natural minor (a third away, same function:
 * I → iii, vi; ii ↔ IV; V ↔ vii°; i → III, VI), and in major keys the minor
 * subdominant family (IV, ii → iv, bVII7, iiø7, and back to IV).
 * @category Tonal harmony
 */
export function getSubstitutions(chord: Chord, keySymbol: string): SubstitutionOption[] {
  const oct = chord.tuningSystem.octaveSteps;
  if (oct !== 12) return [];

  const tuning = chord.tuningSystem;
  const results: SubstitutionOption[] = [];
  const rootPc = pcMod(chord.rootStep);
  const quality = chordQualityFromIntervals(chord);
  const pf = chord.preferFlats ?? false;
  const rootName = get12TETBaseName(chord.rootStep, pf);

  let scalePcs: number[] = [];
  let tonicPc = 0;
  try {
    const scale = parseScaleSymbol(keySymbol, tuning);
    scalePcs = scale.getPitchClasses();
    tonicPc = scalePcs[0];
  } catch { /* ignore */ }

  // ── Dominant 7th substitutions ────────────────────────────────────────────
  if (quality === '7') {
    // Tritone substitution
    const triPc = pcMod(rootPc + 6);
    const triPf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[triPc], 'major');
    const triName = noteName(triPc, triPf) + '7';
    results.push({
      chord: parseChordSymbol(triName, tuning),
      type: 'tritone',
      explanation: `Tritone sub: ${triName} shares the tritone with ${rootName}7`,
    });

    // Sus4 suspension
    results.push({
      chord: parseChordSymbol(rootName + 'sus4', tuning),
      type: 'sus4',
      explanation: `Sus4 suspension of dominant: ${rootName}sus4`,
    });

    // Deceptive resolution V → vi
    const isDomV = rootPc === pcMod(tonicPc + 7);
    if (isDomV && scalePcs.length >= 6) {
      const viPc = scalePcs[5];
      const viPf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[viPc], 'minor');
      const viName = noteName(viPc, viPf) + 'm';
      results.push({
        chord: parseChordSymbol(viName, tuning),
        type: 'deceptive',
        explanation: `Deceptive resolution to vi (${viName}) instead of I`,
      });
    }
  }

  // ── Diatonic substitutions ────────────────────────────────────────────────
  // A diatonic chord can be replaced by the diatonic chord a third above or below when
  // both have the same function (they share two notes): I → iii, vi; ii ↔ IV; V ↔ vii°.
  // Works in major and natural minor, with the key's own spelling and chord type.
  const mode = keySymbol.replace(/^[A-G][#b]*\s*/i, '').trim().toLowerCase();
  const isMajorKey = mode === 'major' || mode === 'ionian';
  const isMinorKey = mode === 'minor' || mode === 'aeolian' || mode === 'natural minor';
  if (!isMajorKey && !isMinorKey) return results;

  let triads: Chord[], sevenths: Chord[], degreeNames: string[];
  try {
    const scale = parseScaleSymbol(keySymbol, tuning);
    triads = scale.getDiatonicChords('triad');
    sevenths = scale.getDiatonicChords('seventh');
    degreeNames = scale.getNotes().slice(0, 7).map(n => n.name.replace(/-?\d+$/, ''));
  } catch { return results; }
  if (triads.length !== 7) return results;

  const samePcs = (a: Chord, b: Chord) => {
    const pa = a.getPitchClasses(), pb = b.getPitchClasses();
    return pa.length === pb.length && pa.every(pc => pb.includes(pc));
  };
  const romanOf = (c: Chord, idx: number) => {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][idx];
    const q = chordQualityFromIntervals(c);
    if (q === 'dim7' || q === 'm7b5' || /^[A-G][#b]*dim/.test(c.name)) return roman.toLowerCase() + '°';
    return q === 'm' || q === 'm7' ? roman.toLowerCase() : roman;
  };
  // T, S, D by degree; VII is D in both modes (leading-tone chord, or subtonic in minor)
  const FUNCTION = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];

  const isSeventh = chord.getPitchClasses().length >= 4;
  const pool = isSeventh ? sevenths : triads;
  const idx = pool.findIndex(c => samePcs(c, chord));

  if (idx !== -1) {
    for (const d of [(idx + 2) % 7, (idx + 5) % 7]) {
      if (FUNCTION[d] !== FUNCTION[idx]) continue;
      results.push({
        chord: pool[d],
        type: 'diatonic',
        explanation: `Diatonic substitute: ${romanOf(triads[d], d)} replaces ${romanOf(triads[idx], idx)}`,
      });
    }
  }

  // ── Minor subdominant (major keys) ────────────────────────────────────────
  // IV and ii can take the subdominant chords of the parallel minor, and those can take
  // each other: iv, bVII7, iiø7 (F → Fm, Bb7, Dm7b5 in C major).
  if (isMajorKey) {
    const lower = (n: string) => (n.endsWith('#') ? n.slice(0, -1) : n + 'b');
    const family = [
      { symbol: degreeNames[3] + (isSeventh ? 'm7' : 'm'), roman: 'iv' },
      { symbol: lower(degreeNames[6]) + '7', roman: 'bVII7' },
      { symbol: degreeNames[1] + 'm7b5', roman: 'iiø7' },
    ].flatMap(m => { try { return [{ ...m, chord: parseChordSymbol(m.symbol, tuning) }]; } catch { return []; } });

    const member = family.find(m => samePcs(m.chord, chord));
    if (idx === 1 || idx === 3) {
      const from = romanOf(triads[idx], idx);
      for (const m of family) {
        results.push({ chord: m.chord, type: 'modal', explanation: `Minor subdominant: ${m.roman} (from the parallel minor) replaces ${from}` });
      }
    } else if (member) {
      for (const m of family) {
        if (m === member) continue;
        results.push({ chord: m.chord, type: 'modal', explanation: `Minor subdominant: ${m.roman} replaces ${member.roman}` });
      }
      results.push({ chord: pool[3], type: 'diatonic', explanation: `Diatonic subdominant: IV replaces ${member.roman}` });
    }
  }

  return results;
}
