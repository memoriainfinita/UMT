/**
 * Twelve-tone / serial composition tools.
 * All operations work in pitch-class space (0–11, C=0 convention is NOT required;
 * the row is treated as an ordered sequence of pitch classes modulo 12).
 *
 * Forms are labeled by the pitch class they start on (P(n), I(n) and RI(n) begin on n),
 * so the row as given is P(row[0]): P(0) only when the row starts on 0.
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
   * Returns the 12×12 tone row matrix: the first row is the row as given, the first
   * column the inversion starting on the same pitch class. Each row is the P form that
   * starts on its first pitch class (read right to left: R); each column, top to bottom,
   * an I form (bottom to top: RI).
   */
  getMatrix(): number[][] {
    return this.I(this.row[0]).map(start => this.P(start));
  }

  /**
   * Prime form transposed so that it starts on pitch class `n`.
   * The row as given is P(row[0]).
   */
  P(n: number): number[] {
    const offset = ((n - this.row[0]) % 12 + 12) % 12;
    return this.row.map(p => (p + offset) % 12);
  }

  /**
   * Inversion (I) transposed so that it starts on pitch class `n`.
   * The inversion mirrors all intervals of the row.
   */
  I(n: number): number[] {
    const inv0 = this.row.map(p => ((this.row[0] - p + 12) % 12 + this.row[0]) % 12);
    const offset = ((n - inv0[0]) % 12 + 12) % 12;
    return inv0.map(p => (p + offset) % 12);
  }

  /**
   * Retrograde of P(n): by default the row as given, reversed.
   */
  R(n: number = this.row[0]): number[] {
    return this.P(n).reverse();
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
   * Tests whether the row is hexachordally combinatorial with itself: some form's first
   * hexachord holds the same pitch classes as the row's second hexachord, so the two
   * together make an aggregate. Returns the first operation found ('P', 'I', 'RI') or null.
   * - `'P'`: a transposition other than the row itself.
   * - `'I'`: an inversion.
   * - `'RI'`: a retrograde inversion.
   */
  isCombinatorial(): 'P' | 'I' | 'RI' | null {
    const hex2 = new Set(this.row.slice(6));

    for (let n = 0; n < 12; n++) {
      if (n !== this.row[0] && this.P(n).slice(0, 6).every(p => hex2.has(p))) return 'P';
      if (this.I(n).slice(0, 6).every(p => hex2.has(p))) return 'I';
      if (this.RI(n).slice(0, 6).every(p => hex2.has(p))) return 'RI';
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
