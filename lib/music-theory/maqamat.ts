/**
 * Basic Maqamat catalog - 24-EDO (quarter-tone) approximations.
 *
 * NOTE: Maqam music involves subtle microtonal inflections, performance contexts,
 * modulation chains (sayr), and cultural conventions not captured here.
 * Intervals are given in quarter-tones (1 QT = 50 cents; 24 QT = octave).
 * This module provides structural scaffolding only.
 *
 * Scales and ajnas follow maqamworld.com (Johnny Farraj), ascending form, one octave.
 */

/** A tetrachord or pentachord cell (jins) used as a building block in maqam construction. */
export interface Jins {
  name: string;
  /** Interval pattern in quarter-tones. */
  intervals: readonly number[];
}

/** A maqam scale: its constituent ajnas, full note sequence in quarter-tones, and emotional character. */
export interface Maqam {
  name: string;
  /** Ajnas in scale order, from the tonic up. */
  ajnas: readonly Jins[];
  /** Full scale in quarter-tones from tonic (24-EDO), ascending. */
  notes: readonly number[];
  /** Commonly cited mood (informal, not a theoretical property). */
  character?: string;
  /** @deprecated Same as `character`. */
  gharsa?: string;
}

// ── Common Ajnas ─────────────────────────────────────────────────────────────

const AJNAS: Record<string, Jins> = {
  rast:    { name: 'Rast',    intervals: [4, 3, 3] },    // C D E½b F → 0 4 7 10
  bayati:  { name: 'Bayati',  intervals: [3, 3, 4] },    // D E½b F G → 0 3 6 10
  sikah:   { name: 'Sikah',   intervals: [3, 4] },       // E½b F G → 0 3 7
  saba:    { name: 'Saba',    intervals: [3, 3, 2] },    // D E½b F Gb → 0 3 6 8
  hijaz:   { name: 'Hijaz',   intervals: [2, 6, 2] },    // D Eb F# G → 0 2 8 10
  nahawand:{ name: 'Nahawand',intervals: [4, 2, 4] },    // C D Eb F → 0 4 6 10
  kurd:    { name: 'Kurd',    intervals: [2, 4, 4] },    // D Eb F G → 0 2 6 10
  ajam:    { name: 'Ajam',    intervals: [4, 4, 2] },    // Bb C D Eb → 0 4 8 10
};

const maqam = (name: string, ajnas: Jins[], notes: number[], character: string): Maqam =>
  ({ name, ajnas, notes, character, gharsa: character });

/** Catalog of 8 Arabic maqamat as 24-EDO (quarter-tone) approximations. */
export const MAQAMAT: Record<string, Maqam> = Object.freeze({
  // C D E½b F G A B½b C
  'rast': maqam('Rast', [AJNAS.rast, AJNAS.rast], [0, 4, 7, 10, 14, 18, 21, 24], 'Joy, vitality, openness'),
  // D E½b F G A Bb C D: Nahawand on the 4th (Rast on the 4th is the alternative)
  'bayati': maqam('Bayati', [AJNAS.bayati, AJNAS.nahawand], [0, 3, 6, 10, 14, 16, 20, 24], 'Longing, nostalgia, sensitivity'),
  // D Eb F# G A Bb C D: Nahawand on the 4th (Rast on the 4th is the alternative)
  'hijaz': maqam('Hijaz', [AJNAS.hijaz, AJNAS.nahawand], [0, 2, 8, 10, 14, 16, 20, 24], 'Oriental mysticism, tension, transcendence'),
  // C D Eb F G Ab B C: Hijaz on the 5th ascending; descends with Kurd on the 5th (Bb)
  'nahawand': maqam('Nahawand', [AJNAS.nahawand, AJNAS.hijaz], [0, 4, 6, 10, 14, 16, 22, 24], 'Sadness, longing, romance (similar to harmonic minor ascending)'),
  // D Eb F G A Bb C D: Nahawand on the 4th
  'kurd': maqam('Kurd', [AJNAS.kurd, AJNAS.nahawand], [0, 2, 6, 10, 14, 16, 20, 24], 'Seriousness, strength'),
  // D E½b F Gb A Bb C D: Hijaz on the 3rd, Ajam on the 6th (with Nikriz on the 6th the octave is Db)
  'saba': maqam('Saba', [AJNAS.saba, AJNAS.hijaz, AJNAS.ajam], [0, 3, 6, 8, 14, 16, 20, 24], 'Grief, lamentation, heaviness'),
  // E½b F G A B½b C D E½b: upper Rast on the 3rd, Rast on the 6th
  'sikah': maqam('Sikah', [AJNAS.sikah, AJNAS.rast, AJNAS.rast], [0, 3, 7, 11, 14, 17, 21, 24], 'Spiritual, sacred, inner peace'),
  // E½b F G Ab B C D E½b: Hijaz on the 3rd, Rast on the 6th
  'huzam': maqam('Huzam', [AJNAS.sikah, AJNAS.hijaz, AJNAS.rast], [0, 3, 7, 9, 15, 17, 21, 24], 'Passion, intensity, dramatic expression'),
});
