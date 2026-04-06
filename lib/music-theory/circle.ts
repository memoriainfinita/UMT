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
}
