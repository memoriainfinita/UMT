export class CircleOfFifths {
  static readonly majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  static readonly minorKeys = ['a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'bb', 'f', 'c', 'g', 'd'];

  /**
   * Returns the number of sharps (positive) or flats (negative) for a given key.
   */
  static getSignature(key: string): { sharps: number; flats: number } {
    const isMinor = key === key.toLowerCase() && key.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    
    // Normalize enharmonics for lookup
    let lookupKey = key;
    if (key === 'Gb') lookupKey = 'F#';
    if (key === 'C#') lookupKey = 'Db';
    if (key === 'Cb') lookupKey = 'B';
    if (key === 'eb' && isMinor) lookupKey = 'd#'; // Standardizing for the array
    if (key === 'ab' && isMinor) lookupKey = 'g#';

    const index = circle.indexOf(lookupKey);
    if (index === -1) return { sharps: 0, flats: 0 };

    // C is 0. G is 1 (1 sharp). F is 11 (-1 flat).
    let accidentals = index;
    if (index > 6) {
      accidentals = index - 12; // Negative means flats
    }

    return {
      sharps: accidentals > 0 ? accidentals : 0,
      flats: accidentals < 0 ? Math.abs(accidentals) : 0
    };
  }

  /**
   * Gets the relative minor for a major key, or relative major for a minor key.
   */
  static getRelative(key: string): string {
    const isMinor = key === key.toLowerCase() && key.length > 0;
    const sourceCircle = isMinor ? this.minorKeys : this.majorKeys;
    const targetCircle = isMinor ? this.majorKeys : this.minorKeys;
    
    const index = sourceCircle.indexOf(key);
    if (index === -1) return '';
    return targetCircle[index];
  }

  /**
   * Gets the dominant key (perfect fifth up / one step clockwise).
   */
  static getDominant(key: string): string {
    const isMinor = key === key.toLowerCase() && key.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    const index = circle.indexOf(key);
    if (index === -1) return '';
    return circle[(index + 1) % 12];
  }

  /**
   * Gets the subdominant key (perfect fourth up / one step counter-clockwise).
   */
  static getSubdominant(key: string): string {
    const isMinor = key === key.toLowerCase() && key.length > 0;
    const circle = isMinor ? this.minorKeys : this.majorKeys;
    const index = circle.indexOf(key);
    if (index === -1) return '';
    return circle[(index - 1 + 12) % 12];
  }
}
