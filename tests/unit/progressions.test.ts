/**
 * Tests for lib/music-theory/progressions.ts.
 */
import { describe, it, expect } from 'vitest';
import { PROGRESSIONS, getProgression } from '../../lib/music-theory/progressions';
import { parseRomanProgression } from '../../lib/music-theory/parser';
import { Chord } from '../../lib/music-theory/chord';

function prog(roman: string, key: string): Chord[] { return parseRomanProgression(roman, key); }

describe('PROGRESSIONS dictionary', () => {
  it('exports a non-empty record', () => {
    expect(Object.keys(PROGRESSIONS).length).toBeGreaterThan(5);
  });

  it('has ii-V-I entry with correct structure', () => {
    const entry = PROGRESSIONS['ii-V-I'];
    expect(entry).toBeDefined();
    expect(entry.name).toBe('ii-V-I');
    expect(Array.isArray(entry.romanNumerals)).toBe(true);
    expect(entry.romanNumerals.length).toBeGreaterThan(0);
    expect(typeof entry.description).toBe('string');
    expect(typeof entry.style).toBe('string');
  });

  it('has blues-12 entry', () => {
    expect(PROGRESSIONS['blues-12']).toBeDefined();
    expect(PROGRESSIONS['blues-12'].romanNumerals.length).toBe(12);
  });

  it('has coltrane-changes entry', () => {
    expect(PROGRESSIONS['coltrane-changes']).toBeDefined();
  });

  it('has andalusian entry', () => {
    expect(PROGRESSIONS['andalusian']).toBeDefined();
  });

  it('has pachelbel entry', () => {
    expect(PROGRESSIONS['pachelbel']).toBeDefined();
  });

  it('has rhythm-changes entry', () => {
    expect(PROGRESSIONS['rhythm-changes']).toBeDefined();
  });
});

describe('getProgression()', () => {
  it('returns Chord[] for ii-V-I in C major', () => {
    const chords = getProgression('ii-V-I', 'C major');
    expect(Array.isArray(chords)).toBe(true);
    expect(chords.every(c => c instanceof Chord)).toBe(true);
    expect(chords.length).toBeGreaterThanOrEqual(3);
  });

  it('ii-V-I in C major produces Dm7, G7, Cmaj7', () => {
    const chords = getProgression('ii-V-I', 'C major');
    const names = chords.map(c => c.name);
    expect(names[0]).toMatch(/Dm7/);
    expect(names[1]).toMatch(/G7/);
    expect(names[2]).toMatch(/Cmaj7|C/);
  });

  it('throws for unknown progression id', () => {
    expect(() => getProgression('nonexistent-prog', 'C major')).toThrow();
  });
});

describe('Progressions', () => {
  const names = (id: string, key: string) => getProgression(id, key).map(c => c.name).join(' ');

  it('every progression parses in its default key or C major', () => {
    for (const [id, p] of Object.entries(PROGRESSIONS)) {
      expect(() => getProgression(id, p.defaultKey ?? 'C major')).not.toThrow();
    }
  });

  it('12-bar blues uses dominant sevenths on I and IV', () => {
    expect(names('blues-12', 'C major')).toBe('C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7');
  });

  it('jazz blues and Bird blues are distinct and as written', () => {
    expect(names('blues-jazz', 'F major')).toBe('F7 Bb7 F7 Cm7 F7 Bb7 Bdim7 F7 D7 Gm7 C7 F7 D7 Gm7 C7');
    expect(names('bird-blues', 'F major'))
      .toBe('Fmaj7 Em7b5 A7 Dm7 G7 Cm7 F7 Bb7 Bbm7 Eb7 Am7 D7 Abm7 Db7 Gm7 C7 Fmaj7 D7 Gm7 C7');
  });

  it('Coltrane changes and Giant Steps move by major thirds', () => {
    expect(names('coltrane-changes', 'C major')).toBe('Dm7 Eb7 Abmaj7 B7 Emaj7 G7 Cmaj7');
    expect(names('giant-steps-cycle', 'B major')).toBe('Bmaj7 D7 Gmaj7 A#7 D#maj7');
  });

  it('rhythm changes bar 5 goes I to I7', () => {
    expect(names('rhythm-changes', 'Bb major').split(' ').slice(8, 12)).toEqual(['Bbmaj7', 'Bb7', 'Ebmaj7', 'Ebm7']);
  });

  it('dom gives an explicit dominant; lower case is rejected', () => {
    expect(parseRomanProgression('Idom7 IVdom9 Imaj7', 'C major').map(c => c.name)).toEqual(['C7', 'F9', 'Cmaj7']);
    expect(() => parseRomanProgression('idom7', 'C major')).toThrow();
  });
});
