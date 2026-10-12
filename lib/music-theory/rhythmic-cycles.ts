/**
 * Rhythmic cycles outside Western meter: Hindustani and Carnatic talas, flamenco compás,
 * and aksak meters of Turkish and Balkan music.
 */
import { TimeSignature } from './rhythm';

/** A repeating rhythmic cycle. */
export interface RhythmicCycle {
  /** Display name: `'Teental (Tintal)'`, `'Bulerías'`. */
  name: string;
  /** Musical tradition it belongs to. */
  tradition: 'hindustani' | 'carnatic' | 'flamenco' | 'aksak';
  /** Pulses in one cycle (matras, aksharas, beats of the compás, or eighths). */
  beats: number;
  /** Divisions of the cycle (vibhag, anga, groups of the compás, aksak cells), adding up to `beats`. */
  groups: number[];
  /** Hindustani tala: the sign of each vibhag, `'X'` sam, `'0'` khali (wave), a number for a clap (tali). */
  vibhag?: string[];
  /** Hindustani tala whose sam falls on a khali vibhag (Rupak). */
  samIsKhali?: boolean;
  /** Count spoken on the first pulse (flamenco: 12 in bulerías and seguiriya, 1 in soleá); default 1. */
  firstCount?: number;
  /** Accented counts, in the cycle's own counting (flamenco). Without it the group starts are accented. */
  accents?: number[];
  /** Reference the cycle was checked against. */
  source: string;
}

const TALA_SOURCE = 'Wikipedia, "Tala (music)": Hindustani tala table (beats, division, vibhaga)';
const CARNATIC_SOURCE = 'Wikipedia, "Tala (music)": suladi sapta tala table, chatusra jati (laghu = 4)';
const FLAMENCO_SOURCE = 'Wikipedia, "Flamenco": Compás or time signature';
const AKSAK_SOURCE = 'Wikipedia, "Aksak": table of units, subdivisions and names';

/** Talas, flamenco compás and aksak meters. */
export const RHYTHMIC_CYCLES: Record<string, RhythmicCycle> = {
  teental: { name: 'Teental (Tintal)', tradition: 'hindustani', beats: 16, groups: [4, 4, 4, 4], vibhag: ['X', '2', '0', '3'], source: TALA_SOURCE },
  jhoomra: { name: 'Jhoomra', tradition: 'hindustani', beats: 14, groups: [3, 4, 3, 4], vibhag: ['X', '2', '0', '3'], source: TALA_SOURCE },
  dhamar: { name: 'Dhamar', tradition: 'hindustani', beats: 14, groups: [5, 2, 3, 4], vibhag: ['X', '2', '0', '3'], source: TALA_SOURCE },
  ektal: { name: 'Ektal', tradition: 'hindustani', beats: 12, groups: [2, 2, 2, 2, 2, 2], vibhag: ['X', '0', '2', '0', '3', '4'], source: TALA_SOURCE },
  jhaptal: { name: 'Jhaptal', tradition: 'hindustani', beats: 10, groups: [2, 3, 2, 3], vibhag: ['X', '2', '0', '3'], source: TALA_SOURCE },
  keherwa: { name: 'Keherwa', tradition: 'hindustani', beats: 8, groups: [4, 4], vibhag: ['X', '0'], source: TALA_SOURCE },
  rupak: {
    name: 'Rupak', tradition: 'hindustani', beats: 7, groups: [3, 2, 2], vibhag: ['X', '2', '3'], samIsKhali: true,
    source: 'Wikipedia, "Rupak Tala": vibhags of 3, 2 and 2 matras, theka "Tin Tin Na X | Dhin Na 2 | Dhin Na 3"; sam and khali both on the first matra',
  },
  dadra: { name: 'Dadra', tradition: 'hindustani', beats: 6, groups: [3, 3], vibhag: ['X', '0'], source: TALA_SOURCE },

  adi: { name: 'Adi tala (chatusra jati triputa)', tradition: 'carnatic', beats: 8, groups: [4, 2, 2], source: CARNATIC_SOURCE },
  rupaka: { name: 'Rupaka tala (chatusra jati)', tradition: 'carnatic', beats: 6, groups: [2, 4], source: CARNATIC_SOURCE },

  bulerias: { name: 'Bulerías', tradition: 'flamenco', beats: 12, groups: [3, 3, 2, 2, 2], firstCount: 12, accents: [12, 3, 6, 8, 10], source: FLAMENCO_SOURCE },
  solea: { name: 'Soleá', tradition: 'flamenco', beats: 12, groups: [3, 3, 2, 2, 2], firstCount: 1, accents: [3, 6, 8, 10, 12], source: FLAMENCO_SOURCE },
  alegrias: { name: 'Alegrías', tradition: 'flamenco', beats: 12, groups: [3, 3, 2, 2, 2], firstCount: 1, accents: [3, 6, 8, 10, 12], source: FLAMENCO_SOURCE },
  seguiriya: { name: 'Seguiriya', tradition: 'flamenco', beats: 12, groups: [2, 2, 3, 3, 2], firstCount: 12, accents: [12, 2, 4, 7, 10], source: FLAMENCO_SOURCE },

  paidushko: { name: 'Paidushko (Türk aksağı)', tradition: 'aksak', beats: 5, groups: [2, 3], source: AKSAK_SOURCE },
  racenica: { name: 'Račenica', tradition: 'aksak', beats: 7, groups: [2, 2, 3], source: AKSAK_SOURCE },
  lesnoto: { name: 'Lesnoto (devr-i hindi)', tradition: 'aksak', beats: 7, groups: [3, 2, 2], source: AKSAK_SOURCE },
  daychovo: { name: 'Daychovo (aksak)', tradition: 'aksak', beats: 9, groups: [2, 2, 2, 3], source: AKSAK_SOURCE },
  grancharsko: { name: 'Grancharsko', tradition: 'aksak', beats: 9, groups: [2, 3, 2, 2], source: AKSAK_SOURCE },
  gankino: { name: 'Gankino', tradition: 'aksak', beats: 11, groups: [2, 2, 3, 2, 2], source: AKSAK_SOURCE },
  elenino: { name: 'Elenino horo', tradition: 'aksak', beats: 13, groups: [2, 2, 2, 2, 2, 3], source: AKSAK_SOURCE },
  krivoSadovsko: { name: 'Krivo Sadovsko horo', tradition: 'aksak', beats: 13, groups: [2, 2, 2, 3, 2, 2], source: AKSAK_SOURCE },
};

/** What a metronome plays on one pulse of a cycle. */
export type CycleStroke = 'sam' | 'tali' | 'khali' | 'accent' | 'beat';

/** The spoken count of each pulse: 1…n, or from `firstCount` (bulerías: 12, 1, 2 … 11). */
export function cycleCounts(cycle: RhythmicCycle): number[] {
  const first = cycle.firstCount ?? 1;
  return Array.from({ length: cycle.beats }, (_, i) => ((first - 1 + i) % cycle.beats) + 1);
}

/**
 * The stroke of each pulse, for a metronome. Hindustani talas: `'sam'` on the first pulse,
 * `'tali'` (clap) or `'khali'` (wave) on the first pulse of each other vibhag (Rupak's sam,
 * also khali, is `'sam'`). Flamenco: `'accent'` on the accented counts. Others:
 * `'accent'` on the first pulse of each group. Every other pulse is `'beat'`.
 */
export function cycleStrokes(cycle: RhythmicCycle): CycleStroke[] {
  const strokes: CycleStroke[] = new Array(cycle.beats).fill('beat');
  const groupStarts = cycle.groups.reduce<number[]>((acc, g, i) => [...acc, i === 0 ? 0 : acc[i - 1] + cycle.groups[i - 1]], []);
  if (cycle.vibhag) {
    groupStarts.forEach((start, i) => {
      const sign = cycle.vibhag![i];
      strokes[start] = sign === '0' ? 'khali' : sign === 'X' ? 'sam' : 'tali';
    });
  } else if (cycle.accents) {
    const counts = cycleCounts(cycle);
    counts.forEach((c, i) => { if (cycle.accents!.includes(c)) strokes[i] = 'accent'; });
  } else {
    for (const start of groupStarts) strokes[start] = 'accent';
  }
  return strokes;
}

/**
 * An additive time signature for the cycle: its groups over `denominator` (default 8,
 * the usual unit of aksak meters: Račenica is 2+2+3/8).
 */
export function cycleTimeSignature(cycle: RhythmicCycle, denominator = 8): TimeSignature {
  return new TimeSignature([...cycle.groups], denominator);
}
