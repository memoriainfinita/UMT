/**
 * Tonnetz - the pitch-class toroidal network connecting chords via Neo-Riemannian operations.
 * Uses a 2D grid: x-axis = perfect fifths, y-axis = major thirds; minor thirds run along
 * the diagonal (x + 1, y − 1). Pitch class = 7x + 4y (mod 12) from the origin.
 *
 * The Tonnetz is a 12-TET construction: notes in other tunings are placed at their nearest
 * 12-TET pitch class.
 */
import { Note } from './note';
import { Chord } from './chord';
import { EDO } from './tuning';

/**
 * A note's place on the Tonnetz grid.
 * @category Microtonal / Xenharmonic
 */
export interface TonnetzPosition {
  /** Perfect fifths from the origin. */
  x: number;
  /** Major thirds from the origin. */
  y: number;
  /** The note placed. */
  note: Note;
}

/** Unit moves on the grid: ±P5, ±M3, ±m3, with their size in semitones. */
const MOVES: { dx: number; dy: number; semitones: number }[] = [
  { dx: 1, dy: 0, semitones: 7 }, { dx: -1, dy: 0, semitones: -7 },
  { dx: 0, dy: 1, semitones: 4 }, { dx: 0, dy: -1, semitones: -4 },
  { dx: 1, dy: -1, semitones: 3 }, { dx: -1, dy: 1, semitones: -3 },
];

/** 12-TET semitones from A4 of a note (nearest semitone outside 12-TET). */
function semitones(note: Note): number {
  const ts = note.tuningSystem;
  return ts instanceof EDO && ts.divisions === 12
    ? note.stepsFromBase
    : Math.round(12 * Math.log2(note.frequency / 440));
}

const pc12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * The Tonnetz: grid positions of notes (fifths by major thirds) and shortest paths between chords. 12-TET.
 * @category Microtonal / Xenharmonic
 */
export class Tonnetz {
  /**
   * Returns the 2D Tonnetz coordinates for a note, in the fundamental domain
   * x ∈ 0..3 (fifths), y ∈ 0..2 (major thirds), where every pitch class appears once:
   * from A, E is (1, 0), C# (0, 1), C (1, 2) (A + a fifth + two major thirds).
   *
   * @param note - The note to locate.
   * @param origin - Optional origin note (default: A4 = step 0).
   */
  static getPosition(note: Note, origin?: Note): TonnetzPosition {
    const rel = pc12(semitones(note) - (origin ? semitones(origin) : 0));
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        if (pc12(7 * x + 4 * y) === rel) return { x, y, note };
      }
    }
    return { x: 0, y: 0, note }; // unreachable: 7x + 4y covers all 12 classes
  }

  /**
   * Returns the shortest Tonnetz paths from each note of chord A to the nearest note of
   * chord B, one path after another. Each path starts on the A note and moves by unit
   * steps (fifth, major third or minor third, either way) to the B note; a common tone is
   * a path of one position. Coordinates continue from the A note's position, so a path
   * may leave the fundamental domain of `getPosition`.
   */
  static pathBetween(a: Chord, b: Chord): TonnetzPosition[] {
    const targets = new Set(b.getNotes().map(n => pc12(semitones(n))));
    const path: TonnetzPosition[] = [];

    for (const start of a.getNotes()) {
      const startPos = Tonnetz.getPosition(start);
      // breadth-first search over pitch classes
      const from = new Map<number, { prev: number; move: number } | null>([[pc12(semitones(start)), null]]);
      const queue = [pc12(semitones(start))];
      let found = targets.has(queue[0]) ? queue[0] : -1;
      while (found === -1 && queue.length > 0) {
        const pc = queue.shift()!;
        for (let m = 0; m < MOVES.length && found === -1; m++) {
          const next = pc12(pc + MOVES[m].semitones);
          if (from.has(next)) continue;
          from.set(next, { prev: pc, move: m });
          if (targets.has(next)) found = next;
          else queue.push(next);
        }
      }
      const moves: number[] = [];
      for (let pc = found; from.get(pc); pc = from.get(pc)!.prev) moves.unshift(from.get(pc)!.move);

      let { x, y } = startPos;
      let step = start.stepsFromBase;
      const ts = start.tuningSystem;
      path.push(startPos);
      for (const m of moves) {
        x += MOVES[m].dx;
        y += MOVES[m].dy;
        step += ts.getStepFromStandard(MOVES[m].semitones);
        path.push({ x, y, note: new Note(ts, step) });
      }
    }
    return path;
  }

  /**
   * Returns the 6 Tonnetz neighbors of a note, next to its own position:
   * ±P5 (x±1, y), ±M3 (x, y±1), ±m3 (x+1, y−1 and x−1, y+1).
   */
  static neighbors(note: Note): TonnetzPosition[] {
    const ts = note.tuningSystem;
    const { x, y } = Tonnetz.getPosition(note);
    return MOVES.map(m => ({
      x: x + m.dx,
      y: y + m.dy,
      note: new Note(ts, note.stepsFromBase + ts.getStepFromStandard(m.semitones)),
    }));
  }
}
