/**
 * Universal Rhythm & Meter Module
 * Handles standard durations, complex tuplets, additive meters, and polyrhythms.
 */

export class Duration {
  /**
   * @param value Fraction of a whole note (e.g., 0.25 for a quarter note)
   * @param dots Number of augmentation dots
   */
  constructor(public value: number, public dots: number = 0) {}

  get totalValue(): number {
    let total = this.value;
    let currentAdd = this.value;
    for (let i = 0; i < this.dots; i++) {
      currentAdd /= 2;
      total += currentAdd;
    }
    return total;
  }

  /**
   * Applies a tuplet ratio to this duration.
   * @param fit How many notes we are fitting (e.g., 3 in a triplet)
   * @param inSpaceOf The space of how many normal notes (e.g., 2 in a triplet)
   */
  tuplet(fit: number, inSpaceOf: number): Duration {
    return new Duration(this.value * (inSpaceOf / fit), this.dots);
  }

  // Standard durations
  static Whole = new Duration(1);
  static Half = new Duration(1/2);
  static Quarter = new Duration(1/4);
  static Eighth = new Duration(1/8);
  static Sixteenth = new Duration(1/16);
  static ThirtySecond = new Duration(1/32);
}

export class TimeSignature {
  /**
   * @param numerators Array of numerators for additive meters (e.g., [3, 2, 2] for 7/8). For standard 4/4, use [4].
   * @param denominator The note value that represents one beat (e.g., 4 for quarter, 8 for eighth). Can be irrational (e.g., 3).
   */
  constructor(public numerators: number[], public denominator: number) {}

  get totalBeats(): number {
    return this.numerators.reduce((a, b) => a + b, 0);
  }

  get measureDuration(): number {
    // Total value in terms of whole notes
    return this.totalBeats / this.denominator;
  }

  get isAdditive(): boolean {
    return this.numerators.length > 1;
  }

  toString(): string {
    const numStr = this.numerators.join('+');
    return `${numStr}/${this.denominator}`;
  }

  // Common signatures
  static Common = new TimeSignature([4], 4);
  static Waltz = new TimeSignature([3], 4);
  static March = new TimeSignature([2], 4);
  static CompoundDuple = new TimeSignature([6], 8);
  static Balkan7 = new TimeSignature([3, 2, 2], 8); // 3+2+2 / 8
  static Balkan9 = new TimeSignature([2, 2, 2, 3], 8); // 2+2+2+3 / 8
}

export class Polyrhythm {
  /**
   * Generates a polyrhythm between multiple voices.
   * @param voices Array of pulse counts (e.g., [3, 4] for 3-against-4)
   * @param totalDuration The total duration of the cycle in whole notes (default 1)
   * @returns An array of voices, each containing an array of timestamps (fractions of totalDuration) where pulses occur.
   */
  static generate(voices: number[], totalDuration: number = 1): number[][] {
    return voices.map(pulses => {
      const timestamps = [];
      const step = totalDuration / pulses;
      for (let i = 0; i < pulses; i++) {
        timestamps.push(i * step);
      }
      return timestamps;
    });
  }

  /**
   * Calculates the Euclidean rhythm (distributing k pulses as evenly as possible over n steps).
   * Popular in African, Latin, and electronic music (e.g., E(3,8) is the Tresillo).
   */
  static euclidean(pulses: number, steps: number): boolean[] {
    if (pulses >= steps) return Array(steps).fill(true);
    if (pulses === 0) return Array(steps).fill(false);

    let pattern: number[][] = Array.from({ length: pulses }, () => [1]);
    let remainders: number[][] = Array.from({ length: steps - pulses }, () => [0]);

    while (remainders.length > 1) {
      const numToMove = Math.min(pattern.length, remainders.length);
      for (let i = 0; i < numToMove; i++) {
        pattern[i] = pattern[i].concat(remainders[i]);
      }
      const newRemainders = remainders.slice(numToMove);
      if (newRemainders.length > 0) {
        remainders = newRemainders;
      } else {
        remainders = pattern.slice(numToMove);
        pattern = pattern.slice(0, numToMove);
      }
    }

    const result: number[] = [];
    for (const group of pattern) result.push(...group);
    for (const group of remainders) result.push(...group);

    return result.map(val => val === 1);
  }
}

// ── MusicStream ────────────────────────────────────────────────────────────────

import { Note } from './note';

export interface StreamEvent {
  time: number;     // Start time in beats
  duration: number; // Duration in beats
  notes: Note[];
  velocity: number;
}

/**
 * MusicStream
 * A standard data structure for representing temporal musical events.
 * Acts as a contract that can be consumed by audio engines (Tone.js, Web Audio)
 * or MIDI writers.
 */
export class MusicStream {
  events: StreamEvent[] = [];
  private currentBeat: number = 0;
  public timeSignature: TimeSignature;
  public bpm: number;

  constructor(timeSignature: TimeSignature = TimeSignature.Common, bpm: number = 120) {
    this.timeSignature = timeSignature;
    this.bpm = bpm;
  }

  /**
   * Adds an event to the stream and advances the internal time cursor.
   */
  addEvent(notes: Note[], duration: Duration, velocity: number = 0.8) {
    const durationInBeats = duration.totalValue * this.timeSignature.denominator;
    this.events.push({
      time: this.currentBeat,
      duration: durationInBeats,
      notes,
      velocity
    });
    this.currentBeat += durationInBeats;
  }

  /**
   * Adds an event at a specific time without advancing the main cursor.
   */
  addEventAt(time: number, notes: Note[], duration: Duration, velocity: number = 0.8) {
    this.events.push({
      time,
      duration: duration.totalValue * this.timeSignature.denominator,
      notes,
      velocity
    });
    this.events.sort((a, b) => a.time - b.time);
  }

  /**
   * Generates a generic JSON representation of the stream.
   * This is the standard contract for external engines.
   */
  toJSON() {
    return {
      metadata: {
        timeSignature: this.timeSignature.toString(),
        bpm: this.bpm
      },
      events: this.events.map(e => ({
        time: e.time,
        duration: e.duration,
        notes: e.notes.map(n => ({
          frequency: n.frequency,
          stepsFromBase: n.stepsFromBase,
          name: n.getName()
        })),
        velocity: e.velocity
      }))
    };
  }
}
