/** A pitch interval expressed in cents (1/100 of a semitone). 1200 cents = 1 octave. */
export type Cents = number;

/** A frequency expressed in Hertz (cycles per second). A4 = 440 Hz by default. */
export type Hertz = number;

/**
 * A frequency ratio used to define intervals in just intonation and tuning systems.
 * - `[number, number]` - integer fraction, e.g. `[3, 2]` for a perfect fifth (3/2)
 * - `number` - decimal ratio, e.g. `1.5` for a perfect fifth
 * Both forms are accepted by `Interval.fromRatio()`.
 */
export type Ratio = [number, number] | number;

/**
 * A MIDI note number in the range 0–127.
 * MIDI note 69 = A4 (440 Hz). Middle C (C4) = 60.
 */
export type MidiNote = number;
