/**
 * Basic Raga catalog - Western 12-TET approximations only.
 *
 * NOTE: Real ragas involve ornaments (gamaka), graces (meend), characteristic phrases
 * (pakad), and performance-time rules not representable in this simplified model.
 * This module provides structural information only - aroha/avaroha in semitones
 * and theoretical metadata. Use as a reference, not as a complete performance guide.
 */

export interface Raga {
  name: string;
  /** Ascending pattern - semitone offsets from tonic (C=0 convention). */
  aroha: readonly number[];
  /** Descending pattern - semitone offsets from tonic. */
  avaroha: readonly number[];
  /** Primary note (vadi) - degree index in aroha (1-indexed). */
  vadi: number;
  /** Secondary note (samvadi) - degree index in aroha (1-indexed). */
  samvadi: number;
  /** Parent scale family (Carnatic thaat or Hindustani equivalent). */
  thaat: string;
  /** Traditional performance time (optional). */
  time?: string;
  /** Brief character description. */
  description: string;
}

export const RAGAS: Record<string, Raga> = Object.freeze({
  'yaman': {
    name: 'Yaman',
    aroha:   [0, 2, 4, 6, 7, 9, 11, 12],
    avaroha: [12, 11, 9, 7, 6, 4, 2, 0],
    vadi: 5, samvadi: 2,
    thaat: 'kalyan',
    time: 'First watch of the night',
    description: 'One of the most popular ragas. Peaceful, serene, expansive. Uses sharp (tivra) Ma.',
  },
  'bhairav': {
    name: 'Bhairav',
    aroha:   [0, 1, 4, 5, 7, 8, 11, 12],
    avaroha: [12, 11, 8, 7, 5, 4, 1, 0],
    vadi: 5, samvadi: 2,
    thaat: 'bhairav',
    time: 'Early morning',
    description: 'Solemn and devotional. Both Re and Dha are komal (flat). Auspicious morning raga.',
  },
  'bhairavi': {
    name: 'Bhairavi',
    aroha:   [0, 1, 3, 5, 7, 8, 10, 12],
    avaroha: [12, 10, 8, 7, 5, 3, 1, 0],
    vadi: 5, samvadi: 1,
    thaat: 'bhairavi',
    time: 'Early morning (concluding raga)',
    description: 'Uses all flat notes (except Pa). Expressive, tender, often used to conclude a concert.',
  },
  'malkauns': {
    name: 'Malkauns',
    aroha:   [0, 3, 5, 8, 10, 12],
    avaroha: [12, 10, 8, 5, 3, 0],
    vadi: 5, samvadi: 2,
    thaat: 'bhairavi',
    time: 'Late night',
    description: 'Pentatonic (no Re or Pa). Serious, introverted, mystical. Deep night raga.',
  },
  'darbari-kanada': {
    name: 'Darbari Kanada',
    aroha:   [0, 2, 3, 5, 7, 8, 10, 12],
    avaroha: [12, 10, 8, 7, 5, 3, 2, 0],
    vadi: 5, samvadi: 2,
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
    time: 'Late night / Spring',
    description: 'Associated with Holi and spring. Playful yet pensive. Similar to natural minor + Dorian.',
  },
  'khamaj': {
    name: 'Khamaj',
    aroha:   [0, 2, 4, 5, 7, 9, 10, 12],
    avaroha: [12, 10, 9, 7, 5, 4, 2, 0],
    vadi: 5, samvadi: 2,
    thaat: 'khamaj',
    time: 'Late evening',
    description: 'Erotic and playful. Uses both komal and shuddha Ni. Basis for Thumri style.',
  },
  'todi': {
    name: 'Todi',
    aroha:   [0, 1, 3, 6, 7, 8, 11, 12],
    avaroha: [12, 11, 8, 7, 6, 3, 1, 0],
    vadi: 4, samvadi: 1,
    thaat: 'todi',
    time: 'Late morning',
    description: 'Complex, emotional, considered a difficult raga to master. Komal Re Ga Dha, tivra Ma.',
  },
  'desh': {
    name: 'Desh',
    aroha:   [0, 2, 5, 7, 9, 12],
    avaroha: [12, 11, 9, 7, 5, 4, 2, 0],
    vadi: 5, samvadi: 2,
    thaat: 'khamaj',
    time: 'Late night / Rainy season',
    description: 'Romantic, evocative of the monsoon. Pentatonic aroha, heptatonic avaroha.',
  },
  'puriya-dhanashree': {
    name: 'Puriya Dhanashree',
    aroha:   [0, 1, 4, 6, 7, 9, 11, 12],
    avaroha: [12, 11, 9, 7, 6, 4, 1, 0],
    vadi: 5, samvadi: 2,
    thaat: 'purvi',
    time: 'Evening',
    description: 'Serene and devotional. Both Ma are used; tivra Ma in aroha, shuddha Ma in avaroha.',
  },
});
