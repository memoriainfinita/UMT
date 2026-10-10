/**
 * Tests for lib/music-theory/note.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseNote } from '../../lib/music-theory/parser';

describe('core fixes (audit 2026-10, phase 1)', () => {
  it('Note.scientificOctave follows the written name; octave still counts from A4', () => {
    expect(parseNote('C4').scientificOctave).toBe(4);
    expect(parseNote('C4').octave).toBe(-1);
    expect(parseNote('B#3').scientificOctave).toBe(3);
    expect(parseNote('A4').scientificOctave).toBe(4);
  });
});
