export type RelatedKey = {
  key: string;
  relationship: 'relative' | 'parallel' | 'dominant' | 'subdominant' | 'neighbor';
  distance: number;
};

/**
 * Circle of Fifths utility.
 * Convention: major keys use uppercase ('C', 'G'...), minor keys use lowercase ('a', 'e'...).
 * Methods that return keys follow this same convention — callers should use case to distinguish mode.
 */
export class CircleOfFifths {
  static readonly majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  static readonly minorKeys = ['a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'bb', 'f', 'c', 'g', 'd'];

  /** Normalizes enharmonic key names to the canonical form used in the circle arrays. */
  private static normalizeKey(key: string): string {
    const isMinor = key === key.toLowerCase() && key.length > 0;
    if (!isMinor) {
      if (key === 'Gb') return 'F#';
      if (key === 'C#') return 'Db';
      if (key === 'Cb') return 'B';
    } else {
      if (key === 'eb') return 'd#';
      if (key === 'ab') return 'g#';
      if (key === 'gb') return 'f#';
      if (key === 'a#') return 'bb';
    }
    return key;
  }

  /**
   * Returns the number of sharps (positive) or flats (negative) for a given key.
   */
  static getSignature(key: string): { sharps: number; flats: number } {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;

    const index = circle.indexOf(normalized);
    if (index === -1) return { sharps: 0, flats: 0 };

    // C is index 0 (no accidentals). G is index 1 (1 sharp). F is index 11 (1 flat).
    let accidentals = index;
    if (index > 6) accidentals = index - 12;

    return {
      sharps: accidentals > 0 ? accidentals : 0,
      flats: accidentals < 0 ? Math.abs(accidentals) : 0
    };
  }

  /**
   * Gets the relative minor for a major key, or relative major for a minor key.
   */
  static getRelative(key: string): string {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const sourceCircle = isMinor ? this.minorKeys : this.majorKeys;
    const targetCircle = isMinor ? this.majorKeys : this.minorKeys;

    const index = sourceCircle.indexOf(normalized);
    if (index === -1) return '';
    return targetCircle[index];
  }

  /**
   * Gets the dominant key (perfect fifth up / one step clockwise).
   */
  static getDominant(key: string): string {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    const index = circle.indexOf(normalized);
    if (index === -1) return '';
    return circle[(index + 1) % 12];
  }

  /**
   * Returns the 0–11 index of the key on its circle (C/a = 0, G/e = 1…).
   * Returns -1 if the key is not recognized.
   */
  static getPosition(key: string): number {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    return circle.indexOf(normalized);
  }

  /**
   * Moves steps positions clockwise (positive) or counter-clockwise (negative).
   * Returns empty string if key is not recognized.
   */
  static navigate(key: string, steps: number): string {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    const pos = circle.indexOf(normalized);
    if (pos === -1) return '';
    return circle[((pos + steps) % 12 + 12) % 12];
  }

  /**
   * Gets the subdominant key (perfect fourth up / one step counter-clockwise).
   */
  static getSubdominant(key: string): string {
    const normalized = this.normalizeKey(key);
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    const index = circle.indexOf(normalized);
    if (index === -1) return '';
    return circle[(index - 1 + 12) % 12];
  }

  /**
   * Shortest distance (0–6) between two keys on the same circle.
   * Returns -1 if keys are of different modes or unrecognized.
   */
  static getDistance(key1: string, key2: string): number {
    const n1 = this.normalizeKey(key1);
    const n2 = this.normalizeKey(key2);
    const isMinor1 = n1 === n1.toLowerCase() && n1.length > 0;
    const isMinor2 = n2 === n2.toLowerCase() && n2.length > 0;
    if (isMinor1 !== isMinor2) return -1;
    const pos1 = this.getPosition(key1);
    const pos2 = this.getPosition(key2);
    if (pos1 === -1 || pos2 === -1) return -1;
    const diff = Math.abs(pos1 - pos2);
    return Math.min(diff, 12 - diff);
  }

  /**
   * Returns the parallel key — same root, opposite mode.
   * 'C' → 'c', 'a' → 'A', 'F#' → 'f#'.
   */
  static getParallel(key: string): string {
    const normalized = this.normalizeKey(key);
    if (!normalized) return '';
    const isMinor = normalized === normalized.toLowerCase() && normalized.length > 0;
    if (isMinor) {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    } else {
      return normalized.charAt(0).toLowerCase() + normalized.slice(1);
    }
  }

  /**
   * Returns keys within radius steps on the same circle, sorted closest first.
   * Clockwise neighbor before counter-clockwise at each distance. Excludes key itself.
   */
  static getNeighbors(key: string, radius = 1): string[] {
    const result: string[] = [];
    for (let d = 1; d <= radius; d++) {
      const cw = this.navigate(key, d);
      const ccw = this.navigate(key, -d);
      if (cw) result.push(cw);
      if (ccw && ccw !== cw) result.push(ccw);
    }
    return result;
  }

  /**
   * Returns all tonally related keys sorted by distance ascending.
   * Covers: relative, parallel, dominant, subdominant, and ±2 neighbors.
   */
  static getRelatedKeys(key: string): RelatedKey[] {
    const result: RelatedKey[] = [];

    const rel = this.getRelative(key);
    if (rel) result.push({ key: rel, relationship: 'relative', distance: 0 });

    const par = this.getParallel(key);
    if (par) result.push({ key: par, relationship: 'parallel', distance: 0 });

    const dom = this.getDominant(key);
    if (dom) result.push({ key: dom, relationship: 'dominant', distance: 1 });

    const sub = this.getSubdominant(key);
    if (sub) result.push({ key: sub, relationship: 'subdominant', distance: 1 });

    const n2cw = this.navigate(key, 2);
    const n2ccw = this.navigate(key, -2);
    if (n2cw) result.push({ key: n2cw, relationship: 'neighbor', distance: 2 });
    if (n2ccw) result.push({ key: n2ccw, relationship: 'neighbor', distance: 2 });

    return result;
  }
}
