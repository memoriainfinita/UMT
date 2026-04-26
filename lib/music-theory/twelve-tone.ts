/**
 * Twelve-tone / serial composition tools.
 * All operations work in pitch-class space (0–11, C=0 convention is NOT required;
 * the row is treated as an ordered sequence of pitch classes modulo 12).
 */
export class ToneRow {
  private readonly row: readonly number[];

  /**
   * @param row - Ordered sequence of 12 unique pitch classes (0–11).
   * @throws if the row does not contain exactly 12 unique pitch classes.
   */
  constructor(row: number[]) {
    if (row.length !== 12 || new Set(row).size !== 12 || row.some(p => p < 0 || p > 11)) {
      throw new Error('ToneRow: row must contain exactly 12 unique pitch classes (0–11).');
    }
    this.row = Object.freeze([...row]);
  }

  /**
   * Returns the full 12×12 tone row matrix.
   * Row i is P(i) (prime transposed by i semitones from the original first pitch class).
   * Column j of row i is I(j).
   */
  getMatrix(): number[][] {
    return Array.from({ length: 12 }, (_, i) => this.P(i));
  }

  /**
   * Prime form transposed so that it starts on pitch class `n`.
   * P(0) = original row.
   */
  P(n: number): number[] {
    const offset = ((n - this.row[0]) % 12 + 12) % 12;
    return this.row.map(p => (p + offset) % 12);
  }

  /**
   * Inversion (I) transposed so that it starts on pitch class `n`.
   * The inversion mirrors all intervals of P(0).
   */
  I(n: number): number[] {
    const inv0 = this.row.map(p => ((this.row[0] - p + 12) % 12 + this.row[0]) % 12);
    const offset = ((n - inv0[0]) % 12 + 12) % 12;
    return inv0.map(p => (p + offset) % 12);
  }

  /**
   * Retrograde of the original row (P(0) reversed).
   */
  R(): number[] {
    return [...this.row].reverse();
  }

  /**
   * Retrograde Inversion transposed so that it starts on pitch class `n`.
   */
  RI(n: number): number[] {
    const inv = this.I(this.row[0]);
    const ri0 = [...inv].reverse();
    const offset = ((n - ri0[0]) % 12 + 12) % 12;
    return ri0.map(p => (p + offset) % 12);
  }

  /**
   * Returns true if the row is an all-interval series:
   * every interval class from 1 to 11 appears exactly once between consecutive pitches.
   */
  isAllInterval(): boolean {
    const intervals = new Set<number>();
    for (let i = 0; i < 11; i++) {
      const diff = ((this.row[i + 1] - this.row[i]) % 12 + 12) % 12;
      intervals.add(diff);
    }
    return intervals.size === 11; // all 11 non-zero interval classes appear
  }

  /**
   * Tests whether the row is combinatorial with itself under one of the standard operations.
   * Returns the operation type ('P', 'I', 'RI') or null.
   * - `'P'`: some transposition of P starts with the second hexachord of P(0).
   * - `'I'`: some inversion starts with the second hexachord of P(0).
   * - `'RI'`: some retrograde inversion starts with the second hexachord of P(0).
   */
  isCombinatorial(): 'P' | 'I' | 'RI' | null {
    const hex2 = new Set(this.row.slice(6));

    for (let n = 0; n < 12; n++) {
      if (n !== 0 && new Set(this.P(n).slice(0, 6)).size === 6) {
        const pHex1 = new Set(this.P(n).slice(0, 6));
        if ([...pHex1].every(p => hex2.has(p))) return 'P';
      }
      const iHex1 = new Set(this.I(n).slice(0, 6));
      if ([...iHex1].every(p => hex2.has(p))) return 'I';
      const riHex1 = new Set(this.RI(n).slice(0, 6));
      if ([...riHex1].every(p => hex2.has(p))) return 'RI';
    }
    return null;
  }

  /**
   * Returns the two hexachords of the row: first 6 and last 6 pitch classes.
   */
  getHexachords(): [number[], number[]] {
    return [[...this.row.slice(0, 6)], [...this.row.slice(6)]];
  }
}
