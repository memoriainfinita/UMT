/**
 * Basic Maqamat catalog - 24-EDO (quarter-tone) approximations.
 *
 * NOTE: Maqam music involves subtle microtonal inflections, performance contexts,
 * modulation chains (sayr), and cultural conventions not captured here.
 * Intervals are given in quarter-tones (1 QT = 50 cents; 24 QT = octave).
 * This module provides structural scaffolding only.
 */

export interface Jins {
  name: string;
  /** Interval pattern in quarter-tones. */
  intervals: readonly number[];
}

export interface Maqam {
  name: string;
  /** Tetrachord/pentachord building blocks. */
  ajnas: readonly Jins[];
  /** Full scale in quarter-tones from tonic (24-EDO). */
  notes: readonly number[];
  /** Emotional character / moodassociation. */
  gharsa?: string;
}

// ── Common Ajnas (tetrachord cells) ──────────────────────────────────────────

const AJNAS: Record<string, Jins> = {
  rast:    { name: 'Rast',    intervals: [4, 3, 3] },  // M2, neutral 3, M2 → 0 4 7 10
  bayati:  { name: 'Bayati',  intervals: [3, 3, 4] },  // neutral 2, M2, M2 → 0 3 6 10
  saba:    { name: 'Saba',    intervals: [3, 3, 2, 2]},// neutral 2, M2, m2, m2 → 0 3 6 8 10
  hijaz:   { name: 'Hijaz',   intervals: [2, 6, 2] },  // m2, A2, m2 → 0 2 8 10
  nahawand:{ name: 'Nahawand',intervals: [4, 2, 4] },  // M2, m2, M2 → 0 4 6 10 (natural minor tetrachord)
  kurd:    { name: 'Kurd',    intervals: [2, 4, 4] },  // m2, M2, M2 → 0 2 6 10
  ajam:    { name: 'Ajam',    intervals: [4, 4, 2] },  // M2, M2, m2 → 0 4 8 10 (major tetrachord)
  nawa_athar:{ name: 'Nawa Athar', intervals: [4, 2, 4]}, // placeholder
};

export const MAQAMAT: Record<string, Maqam> = Object.freeze({
  'rast': {
    name: 'Rast',
    ajnas: [AJNAS.rast, AJNAS.rast],
    notes: [0, 4, 7, 10, 14, 18, 21, 24], // in QT
    gharsa: 'Joy, vitality, openness',
  },
  'bayati': {
    name: 'Bayati',
    ajnas: [AJNAS.bayati, AJNAS.rast],
    notes: [0, 3, 6, 10, 14, 18, 21, 24],
    gharsa: 'Longing, nostalgia, sensitivity',
  },
  'hijaz': {
    name: 'Hijaz',
    ajnas: [AJNAS.hijaz, AJNAS.rast],
    notes: [0, 2, 8, 10, 14, 18, 21, 24],
    gharsa: 'Oriental mysticism, tension, transcendence',
  },
  'nahawand': {
    name: 'Nahawand',
    ajnas: [AJNAS.nahawand, AJNAS.nahawand],
    notes: [0, 4, 6, 10, 14, 18, 20, 24],
    gharsa: 'Sadness, longing, romance (similar to natural minor)',
  },
  'kurd': {
    name: 'Kurd',
    ajnas: [AJNAS.kurd, AJNAS.nahawand],
    notes: [0, 2, 6, 10, 14, 18, 20, 24],
    gharsa: 'Seriousness, strength',
  },
  'saba': {
    name: 'Saba',
    ajnas: [AJNAS.saba, AJNAS.hijaz],
    notes: [0, 3, 6, 8, 14, 18, 20, 24],
    gharsa: 'Grief, lamentation, heaviness',
  },
  'sikah': {
    name: 'Sikah',
    ajnas: [AJNAS.rast, AJNAS.bayati],
    notes: [0, 3, 7, 10, 14, 17, 21, 24], // starts on neutral 3rd degree of Rast
    gharsa: 'Spiritual, sacred, inner peace',
  },
  'huzam': {
    name: 'Huzam',
    ajnas: [AJNAS.bayati, AJNAS.hijaz],
    notes: [0, 3, 6, 10, 14, 16, 22, 24],
    gharsa: 'Passion, intensity, dramatic expression',
  },
});
