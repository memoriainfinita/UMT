/**
 * Universal Rhythm & Meter Module
 * Handles standard durations, complex tuplets, additive meters, and polyrhythms.
 */
import { CLAVE_PATTERNS } from './clave-patterns';
import { Note } from './note';

/** A note duration expressed as a fraction of a whole note, with optional augmentation dots. */
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

/**
 * A time signature, supporting additive meters (e.g. 3+2+2/8) and irrational denominators.
 * Includes presets for common signatures via static properties.
 */
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

/** Polyrhythm generation and Euclidean rhythm distribution. */
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

/** A single timed event in a MusicStream: onset, duration, notes, and velocity. */
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
//  Rhythmic transformations and analysis
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

  /**
   * Reverses the array and reflects each duration around the mean (2·mean − d, floored at 0).
   * @deprecated Not an established rhythmic operation: durations have no inversion as
   *   pitches do. Kept for compatibility; use `retrograde` for the standard transformation.
   */
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
   * Detects hemiola: accents grouping six beats as 2+2+2 where the meter groups them 3+3
   * (two bars of a triple meter such as 3/4, or one bar of 6/8 or 6/4).
   * @param pattern - Accent positions in beats from the start (0-indexed), over one span of
   *   six beats (two bars of 3, one bar of 6); later spans repeat modulo 6.
   * @param timeSignature - A meter of 3 or 6 beats; others return false.
   * @returns True when accents fall on beats 0, 2 and 4 of the span and not on beat 3.
   */
  static detectHemiola(pattern: number[], timeSignature: TimeSignature): boolean {
    const beats = timeSignature.totalBeats;
    if (beats !== 6 && beats !== 3) return false;
    const accents = new Set(pattern.map(p => ((p % 6) + 6) % 6));
    return accents.has(0) && accents.has(2) && accents.has(4) && !accents.has(3);
  }

  /**
   * Strong beats of a meter, 0-indexed: the start of each group in an additive meter
   * (3+2+2 → 0, 3, 5); every third beat in a compound meter (6/8 → 0, 3; 9/8; 12/8);
   * every other beat in a duple or quadruple one (2/4, 4/4 → 0, 2); only the downbeat in
   * a triple one (3/4) or an irregular one.
   */
  static strongBeats(timeSignature: TimeSignature): number[] {
    const { numerators, denominator } = timeSignature;
    const beats = timeSignature.totalBeats;
    if (numerators.length > 1) {
      return numerators.reduce<number[]>((acc, n, i) => [...acc, i === 0 ? 0 : acc[i - 1] + numerators[i - 1]], []);
    }
    const every = denominator >= 8 && beats > 3 && beats % 3 === 0 ? 3 : beats % 2 === 0 ? 2 : beats;
    return Array.from({ length: Math.ceil(beats / every) }, (_, i) => i * every);
  }

  /**
   * Returns a syncopation index (0–1): proportion of accented notes that fall on weak beats.
   * @param pattern - Array of onset positions (beat positions, 0-indexed).
   * @param timeSignature - The meter context.
   */
  static detectSyncopation(pattern: number[], timeSignature: TimeSignature): number {
    if (pattern.length === 0) return 0;
    const beats = timeSignature.totalBeats;
    const strong = new Set(this.strongBeats(timeSignature));
    const onWeakBeat = pattern.filter(p => !strong.has(((p % beats) + beats) % beats));
    return onWeakBeat.length / pattern.length;
  }

  /**
   * Detects if the pattern matches the Tresillo (3+3+2 over 8 steps).
   */
  static detectTresillo(pattern: number[]): boolean {
    return matchesPattern(pattern, CLAVE_PATTERNS.tresillo.steps);
  }

  /**
   * Detects if the pattern matches the Cinquillo (2+1+2+1+2 - 8 steps, 5 pulses: X.XX.XX.).
   */
  static detectCinquillo(pattern: number[]): boolean {
    return matchesPattern(pattern, CLAVE_PATTERNS.cinquillo.steps);
  }

  /**
   * Identifies which clave pattern (if any) matches the input, from `CLAVE_PATTERNS`.
   * @param pattern - Onset array of 16 steps (two bars of 4/4 in eighth notes, or one in sixteenths).
   */
  static detectClave(pattern: number[]): 'son-3-2' | 'son-2-3' | 'rumba-3-2' | 'rumba-2-3' | 'bossa' | 'none' {
    const claves = ['son-3-2', 'son-2-3', 'rumba-3-2', 'rumba-2-3', 'bossa'] as const;
    return claves.find(id => matchesPattern(pattern, CLAVE_PATTERNS[id].steps)) ?? 'none';
  }
}

/** True when `pattern` has onsets exactly where `ref` does (same length). */
function matchesPattern(pattern: number[], ref: readonly boolean[]): boolean {
  return pattern.length === ref.length && pattern.every((p, i) => Boolean(p) === ref[i]);
}

/**
 * Polymeter: multiple time signatures cycling simultaneously.
 */
export class Polymeter {
  private readonly meters: TimeSignature[];
  private readonly _cycleBeats: number | undefined;

  /**
   * @param meters - Two or more time signatures cycling simultaneously.
   * @param cycleBeats - Optional fixed cycle length in beats. If omitted, the cycle
   *   ends at the LCM of all meter lengths (`naturalCycle`). Providing a shorter value
   *   truncates the cycle before the meters naturally realign.
   */
  constructor(meters: TimeSignature[], cycleBeats?: number) {
    this.meters = meters;
    this._cycleBeats = cycleBeats;
  }

  /** Beat at which all meters realign naturally (LCM of all meter lengths). */
  get naturalCycle(): number {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
    return this.meters.map(m => m.totalBeats).reduce(lcm, 1);
  }

  /** Effective cycle length: cycleBeats if set, otherwise naturalCycle. */
  get cycleLength(): number {
    return this._cycleBeats ?? this.naturalCycle;
  }

  /** Returns the meter and position within that meter at a given absolute beat, wrapped at cycleLength. */
  getCyclePosition(beat: number): { meter: TimeSignature; positionInMeter: number }[] {
    const wrapped = beat % this.cycleLength;
    return this.meters.map(meter => ({
      meter,
      positionInMeter: wrapped % meter.totalBeats
    }));
  }

  /** Returns all downbeats for each meter within one full cycle, sorted by beat. */
  generateGrid(): { beat: number; meterIndex: number }[] {
    const events: { beat: number; meterIndex: number }[] = [];
    this.meters.forEach((meter, meterIndex) => {
      for (let beat = 0; beat < this.cycleLength; beat += meter.totalBeats) {
        events.push({ beat, meterIndex });
      }
    });
    return events.sort((a, b) => a.beat - b.beat || a.meterIndex - b.meterIndex);
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
   * Computes the new tempo for a metric modulation where a note value of the old meter
   * becomes the beat of the new one: in 4/4 at 120, a dotted quarter (0.375) as the new
   * beat gives 80.
   * @param fromMeter - Meter before the modulation (its denominator is the old beat).
   * @param toMeter - Meter after the modulation; its beat is the pivot note value.
   * @param pivotDuration - The pivot as a fraction of a whole note, measured in the old meter.
   * @param fromTempo - Old tempo in beats per minute (default 120).
   */
  static equivalence(
    fromMeter: TimeSignature,
    toMeter: TimeSignature,
    pivotDuration: number,
    fromTempo = 120
  ): { newTempo: number } {
    // The pivot lasts pivotDuration · denominator old beats; one new beat lasts as long.
    return { newTempo: fromTempo / (pivotDuration * fromMeter.denominator) };
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
