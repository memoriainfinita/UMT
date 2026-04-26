/**
 * Guidonian hexachords (medieval solmization system).
 *
 * Three overlapping hexachords defined by Guido d'Arezzo (c. 1025):
 * - Hexachordum Naturale (C–A): no accidentals
 * - Hexachordum Durum (G–E): uses B natural
 * - Hexachordum Molle (F–D): uses B flat
 *
 * Each hexachord uses the syllables: ut, re, mi, fa, sol, la
 */
import { Note } from './note';
import { TET12 } from './tuning';
import { parseNoteToStep12TET } from './utils';

type HexachordSyllable = 'ut' | 're' | 'mi' | 'fa' | 'sol' | 'la';
type HexachordType = 'naturale' | 'durum' | 'molle';

// Each hexachord: starting note name + scale steps in semitones (W W H W W = 2 2 1 2 2)
const HEXACHORD_DEFS: Record<HexachordType, { start: string; notes: string[] }> = {
  naturale: { start: 'C', notes: ['C', 'D', 'E', 'F', 'G', 'A'] },
  durum:    { start: 'G', notes: ['G', 'A', 'B', 'C', 'D', 'E'] },
  molle:    { start: 'F', notes: ['F', 'G', 'A', 'Bb', 'C', 'D'] },
};

const SYLLABLES: HexachordSyllable[] = ['ut', 're', 'mi', 'fa', 'sol', 'la'];

export class Hexachord {
  static readonly NATURALE = HEXACHORD_DEFS.naturale.notes;
  static readonly DURUM = HEXACHORD_DEFS.durum.notes;
  static readonly MOLLE = HEXACHORD_DEFS.molle.notes;

  /**
   * Returns the Guidonian solfège syllable for a note within a hexachord.
   * Returns null if the note is not part of the specified hexachord.
   */
  static getSyllable(note: Note, hexachord: HexachordType): HexachordSyllable | null {
    const def = HEXACHORD_DEFS[hexachord];
    const notePc = ((note.stepsFromBase % 12) + 12) % 12;

    for (let i = 0; i < def.notes.length; i++) {
      const step = parseNoteToStep12TET(def.notes[i], 4);
      const pc = ((step % 12) + 12) % 12;
      if (pc === notePc) return SYLLABLES[i];
    }
    return null;
  }

  /**
   * Finds a shared note (mutation point) for transitioning between two hexachords.
   * Returns the syllable assignment in both hexachords, or null if no mutation is possible.
   */
  static mutate(
    fromHex: HexachordType,
    toHex: HexachordType,
    sharedNote: Note
  ): { fromSyllable: HexachordSyllable; toSyllable: HexachordSyllable } | null {
    const from = this.getSyllable(sharedNote, fromHex);
    const to = this.getSyllable(sharedNote, toHex);
    if (!from || !to) return null;
    return { fromSyllable: from, toSyllable: to };
  }

  /**
   * Returns all notes of a hexachord as Note objects (in octave 4).
   */
  static getNotes(hexachord: HexachordType): Note[] {
    return HEXACHORD_DEFS[hexachord].notes.map(name => {
      const step = parseNoteToStep12TET(name, 4);
      return new Note(TET12, step, `${name}4`);
    });
  }
}
