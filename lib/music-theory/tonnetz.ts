/**
 * Tonnetz - the pitch-class toroidal network connecting chords via Neo-Riemannian operations.
 * Uses a 2D hexagonal grid: x-axis = perfect fifths, y-axis = major thirds.
 */
import { Note } from './note';
import { Chord } from './chord';

export interface TonnetzPosition {
  x: number;
  y: number;
  note: Note;
}

export class Tonnetz {
  /**
   * Returns the 2D Tonnetz coordinates for a note.
   * x = position along the circle of fifths (P5 axis).
   * y = position along the major-thirds axis.
   *
   * Uses A=0 as origin. C is at (-9, 0) in standard 12-TET Tonnetz coordinates.
   *
   * @param note - The note to locate.
   * @param origin - Optional origin note (default: A4 = step 0).
   */
  static getPosition(note: Note, origin?: Note): TonnetzPosition {
    const oct = note.tuningSystem.octaveSteps;
    const basePc = origin ? ((origin.stepsFromBase % oct) + oct) % oct : 0;
    const notePc = ((note.stepsFromBase % oct) + oct) % oct;
    const rel = (notePc - basePc + oct) % oct;

    // Solve: pc = 7x + 4y (mod 12) in the standard Tonnetz embedding
    // We use a simplified lookup for 12-TET
    const positions12: Record<number, [number, number]> = {
      0: [0, 0],    // A
      7: [1, 0],    // E (up a 5th)
      2: [2, 0],    // B
      9: [3, 0],    // F# / Gb
      4: [4, 0],    // C# / Db
      11: [5, 0],   // G# / Ab
      6: [6, 0],    // D# / Eb (tritone)
      1: [0, 1],    // A# / Bb (up a M3)
      8: [1, 1],    // F
      3: [2, 1],    // C
      10: [3, 1],   // G
      5: [4, 1],    // D
    };

    const pos = positions12[rel] ?? [0, 0];
    return { x: pos[0], y: pos[1], note };
  }

  /**
   * Returns the path (sequence of TonnetzPositions) connecting the notes of chord A to chord B.
   * Useful for visualizing voice-leading paths through the Tonnetz.
   */
  static pathBetween(a: Chord, b: Chord): TonnetzPosition[] {
    const aNotes = a.getNotes();
    const bNotes = b.getNotes();
    const path: TonnetzPosition[] = [];

    // Simple: show all notes of A then B
    for (const n of aNotes) path.push(Tonnetz.getPosition(n));
    for (const n of bNotes) path.push(Tonnetz.getPosition(n));

    return path;
  }

  /**
   * Returns the 6 Tonnetz neighbors of a note:
   * ±P5 (x±1,y), ±M3 (x,y±1), ±m3 (x+1,y-1 and x-1,y+1).
   */
  static neighbors(note: Note): TonnetzPosition[] {
    const ts = note.tuningSystem;
    const oct = ts.octaveSteps;
    const offsets = [7, oct - 7, 4, oct - 4, 3, oct - 3]; // P5, P4, M3, m6, m3, M6

    return offsets.map(offset => {
      const neighborStep = note.stepsFromBase + ts.getStepFromStandard(offset > 6 ? -(oct - offset) : offset);
      const neighborNote = new Note(ts, neighborStep);
      return Tonnetz.getPosition(neighborNote);
    });
  }
}
