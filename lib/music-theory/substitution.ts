import { Chord } from './chord';
import { parseChordSymbol, parseScaleSymbol } from './parser';
import { get12TETBaseName, preferFlatsForKey, NOTE_NAMES_12TET_FLAT, NOTE_NAMES_12TET_SHARP } from './utils';

export interface SubstitutionOption {
  chord: Chord;
  type: 'tritone' | 'diatonic' | 'deceptive' | 'chromatic-mediant' | 'sus4' | 'modal';
  explanation: string;
}

function pcMod(n: number): number {
  return ((n % 12) + 12) % 12;
}

function chordQuality(chord: Chord): string {
  const oct = chord.tuningSystem.octaveSteps;
  if (oct !== 12) return '';
  const pcs = chord.intervalsInSteps.map(i => pcMod(i));
  const has = (n: number) => pcs.includes(n);
  if (has(4) && has(7) && has(11)) return 'maj7';
  if (has(3) && has(7) && has(10)) return 'm7';
  if (has(4) && has(7) && has(10)) return '7';
  if (has(3) && has(6) && has(9))  return 'dim7';
  if (has(3) && has(6) && has(10)) return 'm7b5';
  if (has(5) && has(7)) return 'sus4';
  if (has(2) && has(7)) return 'sus2';
  if (has(3) && has(7)) return 'm';
  if (has(4) && has(7)) return 'M';
  return '';
}

function noteName(pc: number, flat: boolean): string {
  return flat ? NOTE_NAMES_12TET_FLAT[pc] : NOTE_NAMES_12TET_SHARP[pc];
}

/**
 * Returns harmonic substitution options for `chord` in the given key.
 *
 * Covers: tritone substitution (for V7), sus4 suspension, deceptive resolution,
 * and diatonic substitutions (I → iii, I → vi; IV → ii).
 */
export function getSubstitutions(chord: Chord, keySymbol: string): SubstitutionOption[] {
  const oct = chord.tuningSystem.octaveSteps;
  if (oct !== 12) return [];

  const tuning = chord.tuningSystem;
  const results: SubstitutionOption[] = [];
  const rootPc = pcMod(chord.rootStep);
  const quality = chordQuality(chord);
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
  if ((quality === 'M' || quality === 'maj7') && scalePcs.length >= 7) {
    const idx = scalePcs.indexOf(rootPc);
    if (idx !== -1) {
      const degree = idx + 1;
      const suffix = quality === 'maj7' ? '7' : '';

      if (degree === 1) {
        // I → iii
        const iiiPc = scalePcs[2];
        const pf3 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[iiiPc], 'minor');
        results.push({
          chord: parseChordSymbol(noteName(iiiPc, pf3) + 'm' + suffix, tuning),
          type: 'diatonic',
          explanation: 'Diatonic substitute: iii replaces I',
        });
        // I → vi
        const viPc = scalePcs[5];
        const pf6 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[viPc], 'minor');
        results.push({
          chord: parseChordSymbol(noteName(viPc, pf6) + 'm' + suffix, tuning),
          type: 'diatonic',
          explanation: 'Diatonic substitute: vi replaces I',
        });
      }

      if (degree === 4) {
        // IV → ii
        const iiPc = scalePcs[1];
        const pf2 = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[iiPc], 'minor');
        results.push({
          chord: parseChordSymbol(noteName(iiPc, pf2) + 'm' + suffix, tuning),
          type: 'diatonic',
          explanation: 'Diatonic substitute: ii replaces IV',
        });
      }
    }
  }

  return results;
}
