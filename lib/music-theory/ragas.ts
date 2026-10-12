/**
 * Basic Raga catalog - Western 12-TET approximations only.
 *
 * NOTE: Real ragas involve ornaments (gamaka), graces (meend), characteristic phrases
 * (pakad), and performance-time rules not representable in this simplified model.
 * This module provides structural information only - aroha/avaroha in semitones
 * and theoretical metadata. Use as a reference, not as a complete performance guide.
 *
 * Aroha, avaroha, vadi, samvadi, thaat and time follow the English Wikipedia raga infoboxes
 * (Bhatkhande-system sources, 2026-10), with zigzag phrases reduced to straight lines.
 */

export interface Raga {
  /** Display name: `'Yaman'`. */
  name: string;
  /** Ascending pattern - semitone offsets from tonic (Sa = 0). */
  aroha: readonly number[];
  /** Descending pattern - semitone offsets from tonic. */
  avaroha: readonly number[];
  /**
   * Primary note (vadi) as a svara number: 1 = Sa, 2 = Re, 3 = Ga, 4 = Ma, 5 = Pa, 6 = Dha, 7 = Ni.
   * Whether it is komal, shuddha or tivra follows from the raga's notes.
   */
  vadi: number;
  /** Secondary note (samvadi) as a svara number, same convention as `vadi`. */
  samvadi: number;
  /** Parent thaat (Bhatkhande's Hindustani classification). */
  thaat: string;
  /** Traditional performance time (optional). */
  time?: string;
  /** Brief character description. */
  description: string;
}

/** Svara names indexed by the numbers used in `vadi` and `samvadi` (index 0 unused). */
export const SVARA_NAMES = ['', 'Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'] as const;

/** Ten Hindustani ragas by id (`'yaman'`, `'bhairav'`…), checked against the Wikipedia raga infoboxes. */
export const RAGAS: Record<string, Raga> = Object.freeze({
  'yaman': {
    name: 'Yaman',
    aroha:   [0, 2, 4, 6, 7, 9, 11, 12],
    avaroha: [12, 11, 9, 7, 6, 4, 2, 0],
    vadi: 3, samvadi: 7,
    thaat: 'kalyan',
    time: 'First watch of the night',
    description: 'One of the most popular ragas. Peaceful, serene, expansive. Uses sharp (tivra) Ma.',
  },
  'bhairav': {
    name: 'Bhairav',
    aroha:   [0, 1, 4, 5, 7, 8, 11, 12],
    avaroha: [12, 11, 8, 7, 5, 4, 1, 0],
    vadi: 6, samvadi: 2,
    thaat: 'bhairav',
    time: 'Early morning',
    description: 'Solemn and devotional. Both Re and Dha are komal (flat). Auspicious morning raga.',
  },
  'bhairavi': {
    name: 'Bhairavi',
    aroha:   [0, 1, 3, 5, 7, 8, 10, 12],
    avaroha: [12, 10, 8, 7, 5, 3, 1, 0],
    vadi: 4, samvadi: 1,
    thaat: 'bhairavi',
    time: 'Morning; conclusion of a concert',
    description: 'Komal Re, Ga, Dha and Ni. Expressive, tender, often used to conclude a concert.',
  },
  'malkauns': {
    name: 'Malkauns',
    aroha:   [0, 3, 5, 8, 10, 12],
    avaroha: [12, 10, 8, 5, 3, 0],
    vadi: 4, samvadi: 1,
    thaat: 'bhairavi',
    time: 'Late night',
    description: 'Pentatonic (no Re or Pa). Serious, introverted, mystical. Deep night raga.',
  },
  'darbari-kanada': {
    name: 'Darbari Kanada',
    aroha:   [0, 2, 3, 5, 7, 8, 10, 12],
    avaroha: [12, 10, 8, 7, 5, 3, 2, 0],
    vadi: 2, samvadi: 5,
    thaat: 'asavari',
    time: 'Late night',
    description: 'Raga of the court (darbar). Stately and profound. Komal Ga, Dha, Ni with oscillating Ga.',
  },
  'kafi': {
    name: 'Kafi',
    aroha:   [0, 2, 3, 5, 7, 9, 10, 12],
    avaroha: [12, 10, 9, 7, 5, 3, 2, 0],
    vadi: 5, samvadi: 2,
    thaat: 'kafi',
    time: 'Second watch of the night',
    description: 'Associated with Holi and spring. Playful yet pensive. Same notes as the Dorian mode.',
  },
  'khamaj': {
    name: 'Khamaj',
    aroha:   [0, 4, 5, 7, 9, 11, 12],
    avaroha: [12, 10, 9, 7, 5, 4, 2, 0],
    vadi: 3, samvadi: 7,
    thaat: 'khamaj',
    time: 'Late night',
    description: 'Erotic and playful. Shuddha Ni ascending (Re omitted), komal Ni descending. Basis for Thumri style.',
  },
  'todi': {
    name: 'Todi',
    aroha:   [0, 1, 3, 6, 8, 11, 12],
    avaroha: [12, 11, 8, 7, 6, 3, 1, 0],
    vadi: 6, samvadi: 3,
    thaat: 'todi',
    time: 'Late morning',
    description: 'Complex, emotional, considered a difficult raga to master. Komal Re Ga Dha, tivra Ma; Pa avoided ascending.',
  },
  'desh': {
    name: 'Desh',
    aroha:   [0, 2, 5, 7, 11, 12],
    avaroha: [12, 10, 9, 7, 5, 4, 2, 0],
    vadi: 2, samvadi: 5,
    thaat: 'khamaj',
    time: 'Late night / Rainy season',
    description: 'Romantic, evocative of the monsoon. Pentatonic aroha with shuddha Ni; heptatonic avaroha with komal Ni.',
  },
  'puriya-dhanashree': {
    name: 'Puriya Dhanashree',
    aroha:   [0, 1, 4, 6, 8, 11, 12],
    avaroha: [12, 11, 8, 7, 6, 4, 1, 0],
    vadi: 5, samvadi: 2,
    thaat: 'purvi',
    time: 'Evening',
    description: 'Serene and devotional. Komal Re and Dha, tivra Ma only; Pa avoided ascending.',
  },
});
