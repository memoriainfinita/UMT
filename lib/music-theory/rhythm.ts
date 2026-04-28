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

// ============================================================================
//  Phase 7 - Rhythmic transformations and analysis
// ============================================================================

/**
 * Augmentation, diminution, and retrograde of duration arrays.
 */
export class RhythmTransform {
  /** Augmentation: multiply each duration by factor (default ×2). */
  static augmentation(durations: number[], factor = 2): number[] {
    return durations.map(d => d * factor);
  }

  /** Diminution: divide each duration by factor (default ÷2). */
  static diminution(durations: number[], factor = 2): number[] {
    return durations.map(d => d / factor);
  }

  /** Retrograde: reverse the duration array. */
  static retrograde(durations: number[]): number[] {
    return [...durations].reverse();
  }

  /** Retrograde inversion: reverse the array and negate each value relative to the mean. */
  static retrogradeInversion(durations: number[]): number[] {
    const rev = [...durations].reverse();
    if (rev.length === 0) return [];
    const mean = rev.reduce((a, b) => a + b, 0) / rev.length;
    return rev.map(d => Math.max(0, 2 * mean - d));
  }
}

/**
 * Detection of rhythmic features: hemiola, syncopation, clave patterns, etc.
 */
export class RhythmAnalysis {
  /**
   * Detects hemiola: a pattern where 3 groups of 2 beats overlay a 2 groups of 3 beats context.
   * Checks if the pattern's accent grouping conflicts with the time signature's grouping.
   */
  static detectHemiola(pattern: number[], timeSignature: TimeSignature): boolean {
    const beats = timeSignature.totalBeats;
    if (beats !== 6 && beats !== 3) return false;
    // Simple hemiola check: if pattern length = 6 and groups of 3 appear where 2 expected
    if (pattern.length !== beats) return false;
    const pairSum = pattern[0] + pattern[1];
    const tripletSum = pattern[0] + pattern[1] + pattern[2];
    return pairSum === tripletSum / 1.5; // heuristic
  }

  /**
   * Returns a syncopation index (0–1): proportion of accented notes that fall on weak beats.
   * @param pattern - Array of onset positions (beat positions, 0-indexed).
   * @param timeSignature - The meter context.
   */
  static detectSyncopation(pattern: number[], timeSignature: TimeSignature): number {
    if (pattern.length === 0) return 0;
    const beats = timeSignature.totalBeats;
    const strongBeats = new Set(
      Array.from({ length: Math.ceil(beats / 2) }, (_, i) => i * 2) // even beats = strong
    );
    const onWeakBeat = pattern.filter(p => !strongBeats.has(p % beats));
    return onWeakBeat.length / pattern.length;
  }

  /**
   * Detects if the pattern matches the Tresillo (3+3+2 over 8 steps).
   */
  static detectTresillo(pattern: number[]): boolean {
    if (pattern.length !== 8) return false;
    const tresillo = [true, false, false, true, false, false, true, false];
    return pattern.every((p, i) => Boolean(p) === tresillo[i]);
  }

  /**
   * Detects if the pattern matches the Cinquillo (1+1+2+1+2+1+1 structure - 8 steps, 5 pulses).
   */
  static detectCinquillo(pattern: number[]): boolean {
    if (pattern.length !== 8) return false;
    const cinquillo = [true, false, true, true, false, true, false, true];
    return pattern.every((p, i) => Boolean(p) === cinquillo[i]);
  }

  /**
   * Identifies which clave pattern (if any) matches the input.
   * @param pattern - Boolean array of 16 steps (one measure of 4/4 in 16th notes).
   */
  static detectClave(pattern: number[]): 'son-3-2' | 'son-2-3' | 'rumba-3-2' | 'rumba-2-3' | 'bossa' | 'none' {
    if (pattern.length !== 16) return 'none';
    const toBool = pattern.map(Boolean);
    const match = (ref: boolean[]) => ref.every((v, i) => v === toBool[i]);

    // Son clave 3-2: X . . X . . X . . . X . X . . .
    if (match([true,false,false,true,false,false,true,false,false,false,true,false,true,false,false,false])) return 'son-3-2';
    // Son clave 2-3: X . . . X . X . . X . . X . . .
    if (match([true,false,false,false,true,false,true,false,false,true,false,false,true,false,false,false])) return 'son-2-3';
    // Rumba clave 3-2: X . . X . . . X . . X . X . . .
    if (match([true,false,false,true,false,false,false,true,false,false,true,false,true,false,false,false])) return 'rumba-3-2';
    // Rumba clave 2-3: X . . . X . X . . . X . . X . .
    if (match([true,false,false,false,true,false,true,false,false,false,true,false,false,true,false,false])) return 'rumba-2-3';
    // Bossa nova: X . . X . . X . . . X . . X . .
    if (match([true,false,false,true,false,false,true,false,false,false,true,false,false,true,false,false])) return 'bossa';
    return 'none';
  }
}

/**
 * Polymeter: multiple time signatures cycling simultaneously.
 */
export class Polymeter {
  private readonly meters: TimeSignature[];
  private readonly cycleBeats: number;

  constructor(meters: TimeSignature[], cycleBeats: number) {
    this.meters = meters;
    this.cycleBeats = cycleBeats;
  }

  /** Returns the meter and position within that meter at a given absolute beat position. */
  getCyclePosition(beat: number): { meter: TimeSignature; positionInMeter: number }[] {
    return this.meters.map(meter => {
      const beatsPerMeasure = meter.totalBeats;
      const positionInMeter = beat % beatsPerMeasure;
      return { meter, positionInMeter };
    });
  }
}

/**
 * Metric Modulation - computing tempo relationships between related meters.
 */
export class MetricModulation {
  /**
   * Computes the new tempo after a metric modulation.
   * The pivot note value `fromDuration` at `fromTempo` BPM equals `toDuration` in the new tempo.
   *
   * @param fromTempo - Original tempo in BPM.
   * @param fromDuration - Duration value in old tempo (e.g., 0.25 = quarter note).
   * @param toDuration  - Duration value in new tempo that equals fromDuration.
   * @returns New tempo in BPM.
   */
  static calculate(fromTempo: number, fromDuration: number, toDuration: number): number {
    return fromTempo * (fromDuration / toDuration);
  }

  /**
   * Computes the new tempo for a metric modulation where a given note value
   * becomes the new beat unit.
   */
  static equivalence(
    fromMeter: TimeSignature,
    toMeter: TimeSignature,
    pivotDuration: number
  ): { newTempo: number } {
    const fromBeatDuration = 1 / fromMeter.denominator;
    const toBeatDuration = 1 / toMeter.denominator;
    const ratio = fromBeatDuration / toBeatDuration;
    const newTempo = 120 * ratio * (pivotDuration / fromBeatDuration);
    return { newTempo };
  }
}

/**
 * Isorhythm: the medieval technique of repeating talea (rhythm) and color (pitch) independently.
 */
export class Isorhythm {
  private readonly talea: number[];  // rhythmic pattern
  private readonly color: number[]; // pitch pattern (steps or pitch classes)

  constructor(talea: number[], color: number[]) {
    this.talea = talea;
    this.color = color;
  }

  /**
   * Generates an isorhythmic sequence up to `totalBeats` beats.
   * Returns an array of `{ note, duration }` pairs where note is from the color
   * and duration from the talea, cycling independently.
   */
  generate(totalBeats: number): { note: number; duration: number }[] {
    const result: { note: number; duration: number }[] = [];
    let elapsed = 0;
    let tIdx = 0;
    let cIdx = 0;

    while (elapsed < totalBeats && this.talea.length > 0 && this.color.length > 0) {
      const dur = this.talea[tIdx % this.talea.length];
      if (elapsed + dur > totalBeats) break;
      result.push({ note: this.color[cIdx % this.color.length], duration: dur });
      elapsed += dur;
      tIdx++;
      cIdx++;
    }
    return result;
  }
}
