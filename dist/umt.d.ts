/**
 * A pitch interval expressed in cents (1/100 of a semitone). 1200 cents = 1 octave.
 * @category Core
 */
export type Cents = number;
/**
 * A frequency expressed in Hertz (cycles per second). A4 = 440 Hz by default.
 * @category Core
 */
export type Hertz = number;
/**
 * A frequency ratio used to define intervals in just intonation and tuning systems.
 * - `[number, number]` - integer fraction, e.g. `[3, 2]` for a perfect fifth (3/2)
 * - `number` - decimal ratio, e.g. `1.5` for a perfect fifth
 * Both forms are accepted by `Interval.fromRatio()`.
 * @category Core
 */
export type Ratio = [
	number,
	number
] | number;
/**
 * A MIDI note number in the range 0–127.
 * MIDI note 69 = A4 (440 Hz). Middle C (C4) = 60.
 * @category Core
 */
export type MidiNote = number;
/**
 * A pitch interval, held as its size in cents.
 * @category Core
 */
export declare class Interval {
	/** Size in cents (1200 = octave); negative for a descending interval. */
	cents: Cents;
	/** Create an interval from a value in cents. Prefer `fromCents()` or `fromRatio()` for clarity. */
	constructor(
	/** Size in cents (1200 = octave); negative for a descending interval. */
	cents: Cents);
	/**
	 * Create an interval from a frequency ratio.
	 * @param ratio - Integer fraction `[numerator, denominator]` or decimal (e.g. `[3,2]` or `1.5` for a perfect fifth).
	 * @throws if the ratio is zero, negative, or not finite.
	 */
	static fromRatio(ratio: Ratio): Interval;
	/** Create an interval from a value in cents. */
	static fromCents(cents: Cents): Interval;
	/** The interval as a decimal frequency ratio (e.g. 1.5 for a perfect fifth). */
	get ratio(): number;
	/** The interval in semitones (cents / 100). May be fractional for microtonal intervals. */
	get semitones(): number;
	/** Add two intervals (stack them). */
	add(other: Interval): Interval;
	/** Subtract an interval (remove it from this one). */
	subtract(other: Interval): Interval;
	/** Scale the interval by a numeric factor. */
	multiply(factor: number): Interval;
	/** Divide the interval by a numeric factor. */
	divide(factor: number): Interval;
	/**
	 * Return the descending (negative) form of this interval.
	 * Useful for voice leading and downward transposition.
	 */
	negate(): Interval;
	/**
	 * Reduce the interval to a single octave (0–1200 cents).
	 * Useful for pitch-class equivalence and scale analysis.
	 */
	inOctave(): Interval;
	/**
	 * Compare two intervals within a tolerance.
	 * @param other - The interval to compare against.
	 * @param toleranceCents - Maximum allowed difference in cents (default: 1¢).
	 */
	equals(other: Interval, toleranceCents?: number): boolean;
}
/**
 * Abstract base class for all tuning systems.
 *
 * The coordinate system is **steps from A4 = 0**. A4 is the reference pitch (default 440 Hz).
 * Steps can be negative (below A4) or positive (above A4), and span multiple octaves.
 *
 * All concrete subclasses must implement `getFrequency`, `getInterval`, and `octaveSteps`.
 * @category Core
 */
export declare abstract class TuningSystem {
	/** Display name: `'12-TET'`, `'Ptolemaic Just Intonation'`, `'Werckmeister III'`. */
	name: string;
	/** Reference frequency for step 0 (A4). Default: 440 Hz. */
	baseFrequency: Hertz;
	constructor(
	/** Display name: `'12-TET'`, `'Ptolemaic Just Intonation'`, `'Werckmeister III'`. */
	name: string, 
	/** Reference frequency for step 0 (A4). Default: 440 Hz. */
	baseFrequency?: Hertz);
	/** Returns the frequency in Hz for a given step offset from A4. */
	abstract getFrequency(steps: number): Hertz;
	/** Returns the `Interval` from A4 to the given step. */
	abstract getInterval(steps: number): Interval;
	/**
	 * Number of steps that constitute one period (usually one octave, 2:1).
	 * For non-octave tunings (e.g. Bohlen-Pierce) this is steps per tritave.
	 */
	abstract get octaveSteps(): number;
	/**
	 * Returns a human-readable note name for the given step.
	 * Subclasses should override this when meaningful names are available.
	 * Default: `"Step N"`.
	 */
	getNoteName(step: number): string;
	/**
	 * Converts a standard 12-TET step (A4 = 0) to the step of this tuning nearest in cents
	 * (`standardStep` × 100¢ above step 0). Works for any tuning whose steps rise: unequal
	 * (JI, cent tables, Scala) and non-octave ones alike — in Bohlen-Pierce a fifth (700¢)
	 * maps to step 5 (731.6¢). Tunings with 12 steps per octave map one to one.
	 */
	getStepFromStandard(standardStep: number): number;
	/**
	 * Converts a 12-TET step pattern (successive steps, e.g. major `[2, 2, 1, 2, 2, 2, 1]`) to
	 * this tuning. Each note's position above the first is mapped, not each step, so the
	 * pattern keeps its span: in 22-EDO the major scale spans 22 steps (rounding each step
	 * would give 24), and in a 7-note JI scale a semitone does not collapse to 0 steps.
	 * A step comes out 0 only when two notes land on the same step of this tuning.
	 */
	getPatternFromStandard(pattern: readonly number[]): number[];
}
/**
 * Equal Division of the Octave - divides the octave into `divisions` equal steps.
 * Examples: 12-TET (standard), 24-TET (quarter-tone), 31-TET, 53-TET.
 * @category Core
 */
export declare class EDO extends TuningSystem {
	divisions: number;
	/**
	 * @param divisions - Number of equal steps per octave. Must be a positive integer.
	 */
	constructor(divisions: number, baseFrequency?: Hertz);
	getInterval(steps: number): Interval;
	getFrequency(steps: number): Hertz;
	get octaveSteps(): number;
	/** Maps a 12-TET step to the nearest step in this EDO via linear scaling. */
	getStepFromStandard(standardStep: number): number;
	/**
	 * Returns a note name for the given step.
	 * For 12-TET, uses standard note names (e.g. "C#4", "Bb3").
	 * For other EDOs, falls back to `"Step N"`.
	 */
	getNoteName(step: number): string;
}
/**
 * Just Intonation - pitch classes defined by exact frequency ratios within one octave.
 * The octave (2:1) is implied and not included in the ratios array.
 *
 * Example: 5-limit JI major scale
 * ```ts
 * new JustIntonation('5-limit Major', [[9,8],[5,4],[4,3],[3,2],[5,3],[15,8]])
 * ```
 * @category Core
 */
export declare class JustIntonation extends TuningSystem {
	/** Resolved interval objects including the implicit unison at index 0. */
	intervals: Interval[];
	/**
	 * @param ratios - Frequency ratios for the pitch classes above the tonic (unison excluded).
	 *   At least one ratio is required. The unison (1:1) is prepended automatically if absent.
	 */
	constructor(name: string, ratios: Ratio[], baseFrequency?: Hertz);
	getInterval(steps: number): Interval;
	getFrequency(steps: number): Hertz;
	get octaveSteps(): number;
	/**
	 * Maps a 12-TET step to this JI tuning's nearest step index by cents proximity.
	 * For 12-pitch-class JI the mapping is exact (identity).
	 * For other sizes, each 12-TET semitone maps to the JI pitch class closest in cents
	 * (100¢ per semitone approximation). If the JI scale lacks a chromatic pitch class
	 * (e.g. a diatonic 7-note scale), adjacent semitones may collapse to the same step.
	 */
	getStepFromStandard(standardStep: number): number;
}
/**
 * Cent-based tuning - pitch classes defined by exact cent offsets within one octave.
 * Intended for historical temperaments (Werckmeister, Kirnberger, meantone, etc.)
 * and any tuning system defined by cent deviations from equal temperament.
 *
 * The octave is always treated as exactly 1200 cents (2:1), regardless of the last
 * value in the array. Historical temperaments define pitch classes, not the octave itself.
 *
 * Example: Werckmeister III (approximate)
 * ```ts
 * new CentTuning('Werckmeister III', [90, 192, 294, 390, 498, 588, 696, 792, 888, 996, 1092])
 * ```
 * @category Core
 */
export declare class CentTuning extends TuningSystem {
	cents: number[];
	/**
	 * @param cents - Cent values for each pitch class above the tonic (unison excluded).
	 *   The unison (0¢) is prepended automatically if absent.
	 *   At least one value is required.
	 */
	constructor(name: string, cents: number[], baseFrequency?: Hertz);
	getInterval(steps: number): Interval;
	getFrequency(steps: number): Hertz;
	get octaveSteps(): number;
	/**
	 * Maps a 12-TET step to this tuning's step nearest in cents; one to one with 12 pitch classes.
	 */
	getStepFromStandard(standardStep: number): number;
}
/**
 * Non-octave tuning - the period of repetition is not the octave (2:1) but an arbitrary ratio.
 * The canonical example is Bohlen-Pierce, which repeats at the tritave (3:1) with 13 equal steps.
 *
 * Example: Bohlen-Pierce
 * ```ts
 * new NonOctaveTuning('Bohlen-Pierce', 13, 3)
 * ```
 * @category Core
 */
export declare class NonOctaveTuning extends TuningSystem {
	stepsPerPeriod: number;
	periodRatio: number;
	/**
	 * @param stepsPerPeriod - Number of equal steps per period. Must be a positive integer.
	 * @param periodRatio - The frequency ratio of one period (e.g. `3` for tritave). Must be > 1.
	 */
	constructor(name: string, stepsPerPeriod: number, periodRatio: number, baseFrequency?: Hertz);
	getInterval(steps: number): Interval;
	getFrequency(steps: number): Hertz;
	/** Steps per period (not an octave - the period is `periodRatio : 1`). */
	get octaveSteps(): number;
}
/**
 * Standard 12-TET singleton - used as the default tuning throughout the library.
 * @category Core
 */
export declare const TET12: EDO;
/**
 * A single pitch in a given tuning system.
 *
 * Position is stored as `stepsFromBase`, an integer offset from A4 (step 0) within the tuning.
 * The same step number means different frequencies in different tuning systems.
 * @category Core
 */
export declare class Note {
	tuningSystem: TuningSystem;
	stepsFromBase: number;
	private _name?;
	private _preferFlats?;
	/**
	 * @param tuningSystem - The tuning system this note belongs to.
	 * @param stepsFromBase - Steps from A4 (= 0). Can be negative (below A4) or positive (above).
	 * @param _name - Optional explicit name including octave (e.g. `"Db4"`). When provided,
	 *   overrides the computed name from the tuning system. Used by the parser to preserve
	 *   the original user notation (e.g. "Db4" vs "C#4").
	 * @param _preferFlats - Optional flat/sharp preference for computed names. Propagated by
	 *   `transpose()` and set by `Scale.getNotes()` / `Chord.getNotes()` based on key context.
	 *   Ignored when `_name` is provided (the explicit name takes precedence).
	 */
	constructor(tuningSystem: TuningSystem, stepsFromBase: number, _name?: string | undefined, _preferFlats?: boolean | undefined);
	/**
	 * The full note name including octave number (e.g. `"C4"`, `"Bb3"`, `"F#5"`).
	 * In 12-TET, the octave follows scientific pitch notation: C4 = middle C.
	 * Uses the flat/sharp preference set at construction.
	 * For an explicit override use `getName({ preferFlats: true/false })`.
	 *
	 * @example
	 * UMT.parseChordSymbol('Cmaj7').getNotes().map(n => n.name)
	 * // → ['C4', 'E4', 'G4', 'B4']
	 */
	get name(): string;
	/**
	 * The flat/sharp preference for this note's computed name.
	 * Derived from the explicit `_name` (true if it contains a flat accidental)
	 * or from the stored `_preferFlats` flag (false by default).
	 * This value is propagated by `transpose()`.
	 */
	get preferFlats(): boolean;
	/**
	 * Returns the full note name including octave (e.g. `"C4"`, `"Bb3"`), optionally overriding
	 * the stored flat/sharp preference.
	 * If an explicit name was set at construction, it is returned as-is (no re-spelling).
	 * Otherwise, uses `_preferFlats` if set, then falls back to `options.preferFlats`, then sharps.
	 */
	getName(options?: {
		preferFlats?: boolean;
	}): string;
	/** Frequency of this note in Hz. */
	get frequency(): Hertz;
	/** Interval from A4 to this note in cents. */
	get centsFromBase(): number;
	/**
	 * Step position within one period (0 to `octaveSteps - 1`).
	 * Equivalent to pitch class in 12-TET (0 = A, 3 = C, etc.).
	 */
	get pitchClass(): number;
	/**
	 * Octave number relative to A4.
	 * A4–G#4 = octave 0, A5–G#5 = octave 1, A3–G#3 = octave −1.
	 */
	get octave(): number;
	/**
	 * Octave number of the written name, in scientific pitch notation: C4 is middle C,
	 * B3 is the note below it, and B#3 (same pitch as C4) keeps octave 3. Not the same as
	 * `octave`, which counts from A4. Null when the name carries no octave.
	 */
	get scientificOctave(): number | null;
	/**
	 * Returns a new note transposed by the given number of steps in the same tuning system.
	 * By whole octaves an explicit name keeps its letter (D#4 → D#5). Otherwise the name is
	 * computed again, with the flat/sharp preference of `_name` or `_preferFlats`.
	 */
	transpose(steps: number): Note;
	/**
	 * Returns the interval from this note to `other`.
	 * Works across different tuning systems by comparing frequencies.
	 * @throws if either note's frequency is not a positive finite number.
	 */
	getIntervalTo(other: Note): Interval;
	/**
	 * Returns true if this note has the same pitch as `other`, within a tolerance.
	 * @param toleranceCents - Maximum allowed frequency difference in cents (default: 1¢).
	 */
	equals(other: Note, toleranceCents?: number): boolean;
}
/**
 * A chord: a root pitch plus a set of intervals defining the chord quality, within a tuning system.
 *
 * `intervalsInSteps` contains the offset in tuning steps from the root for each chord tone,
 * including the root itself (offset 0) as the first element.
 * Example: `[0, 4, 7]` = major triad in 12-TET (root, major third, perfect fifth).
 * @category Tonal harmony
 */
export declare class Chord {
	name: string;
	tuningSystem: TuningSystem;
	rootStep: number;
	readonly intervalsInSteps: readonly number[];
	bassStep?: number | undefined;
	readonly preferFlats?: boolean | undefined;
	/**
	 * @param name - Human-readable chord name (e.g. "Cmaj7", "Bb7", "G/B").
	 * @param tuningSystem - The tuning system this chord operates in.
	 * @param rootStep - Step offset of the root from A4 (= 0).
	 * @param intervalsInSteps - Intervals from the root for each chord tone, in tuning steps.
	 *   Must include 0 (the root) as the first element.
	 * @param bassStep - Optional bass note step for slash chords (e.g. C/E). If provided and
	 *   higher than the root, it is automatically moved an octave down.
	 * @param preferFlats - Optional flat/sharp preference for note naming in `getNotes()`.
	 *   When provided, overrides the root-name heuristic. Set by `parseChordSymbol` and
	 *   PLR transforms for context-aware accidental spelling.
	 */
	constructor(name: string, tuningSystem: TuningSystem, rootStep: number, intervalsInSteps: readonly number[], bassStep?: number | undefined, preferFlats?: boolean | undefined);
	/**
	 * Returns the notes of the chord in root position. In 12-TET each tone is named by its
	 * interval above the written root (D#m → D# F# A#; Cm7b5 → C Eb Gb Bb; C7#11 has F#).
	 * For slash chords, the bass note is prepended below the root.
	 */
	getNotes(): Note[];
	/**
	 * Returns the pitch classes of all chord tones as step offsets within one period
	 * (0 to `octaveSteps - 1`). Does not include the bass note of slash chords.
	 */
	getPitchClasses(): number[];
	/**
	 * Returns true if the given step (or its pitch class) is a tone of this chord.
	 * Comparison is by pitch class - octave is ignored.
	 */
	contains(step: number): boolean;
	/**
	 * Returns a new chord transposed by the given number of steps. The name follows: the
	 * root takes the spelling of the key with fewer accidentals, and a slash bass keeps
	 * its letter distance from the root (C/E +2 → D/F#; C/Bb +2 → D/C).
	 * By whole octaves the chord keeps its name.
	 */
	transpose(steps: number): Chord;
	/**
	 * Returns the notes of the chord in a specific inversion.
	 * @param inversion - 0 = root position, 1 = 1st inversion, 2 = 2nd inversion, etc.
	 *   Values ≥ `notes.length` wrap around (modulo). Slash chord bass notes participate
	 *   in the inversion logic and may not stay at the bottom.
	 */
	getInversion(inversion: number): Note[];
	/**
	 * Returns a specific voicing of the chord.
	 * - `close` - notes in root position, as compact as possible (default stack).
	 * - `drop2` - second note from the top dropped one octave (requires ≥ 4 voices).
	 * - `drop3` - third note from the top dropped one octave (requires ≥ 4 voices).
	 * - `rootless` - root note omitted (common in jazz piano comping).
	 * - `open` - every other upper voice raised an octave (wider spacing).
	 * - `quartal` - notes stacked by fourths (approximate; 12-TET–optimised).
	 */
	getVoicing(type: "close" | "drop2" | "drop3" | "rootless" | "open" | "quartal"): Note[];
	/**
	 * Returns the tritone substitution of this chord.
	 * Typically applied to dominant 7th chords (e.g., G7 -> Db7).
	 * NOTE: Only meaningful in 12-TET (tritone = 6 semitones). Returns null for other tuning systems.
	 */
	getTritoneSubstitution(): Chord | null;
	/**
	 * Voice Leading: Finds the inversion/voicing of this chord that requires the minimum total
  
	 * movement (in cents) from the current set of notes.
	 */
	static smoothTransition(currentNotes: Note[], targetChord: Chord): Note[];
}
/**
 * Chord quality from its intervals (12-TET): `'maj7'`, `'m7'`, `'7'`, `'dim7'`, `'m7b5'`,
 * `'mM7'`, `'aug7'`, `'augM7'`, `'aug'`, `'dim'`, `'7sus4'`, `'sus2'`, `'sus4'`, `'m'`, `'M'`, or
 * `''` when none fits or the tuning is not 12 steps per octave. Ninths, elevenths and sixths
 * reduce to the triad or seventh below them (Cadd9 and C6/9 are `'M'`); a chord is sus only
 * without a third.
 * @category Tonal harmony
 */
export declare function chordQualityFromIntervals(chord: Chord, oct?: number): string;
/**
 * Name of a chord member by its interval above the root (12-TET semitones, as in
 * `CHORD_FORMULAS`): `'R'`, `'b3'`, `'3'`, `'5'`, `'b7'`, `'7'`, `'9'`, `'#11'`, `'13'`…
 * Ninths, elevenths and thirteenths are named as such when the formula writes them above
 * the octave (14 = `'9'`); below it they are `'2'`, `'4'`, `'6'` (sus2, sus4, sixth chords).
 * The rest of the formula decides two cases: 9 semitones is `'bb7'` in a diminished seventh
 * chord, and 3 semitones is `'#9'` beside a major third.
 * @param interval - Semitones above the root (0-23; larger values are reduced by octaves).
 * @param formula - All intervals of the chord.
 * @category Tonal harmony
 */
export declare function chordDegreeLabel(interval: number, formula: readonly number[]): string;
/**
 * Characteristic analysis of a modal scale: brightness relative to Ionian,
 * degrees that differ from the parallel major, jazz avoid notes, and parent-family info.
 * @category Tonal harmony
 */
export interface ModalCharacteristics {
	/** Degrees (1-7) that differ from the major scale on the same root (12-TET heptatonic scales). */
	characteristicDegrees: number[];
	/** The same degrees with their alteration against major: dorian `['b3', 'b7']`, lydian `['#4']`. */
	characteristicIntervals: string[];
	/** From `MODE_BRIGHTNESS`: lydian 1, ionian 0 … locrian -5; 0 for a scale it does not list. */
	brightness: number;
	/** Degrees a semitone above a tone of the tonic triad (traditional jazz avoid notes): 4 in ionian. */
	avoidNotes: number[];
	/** Parent scale family (`'major'`, `'melodic minor'`…), when the mode belongs to one. */
	parentScaleName?: string;
	/** Degree of the parent scale the mode starts on, from 1 (dorian is 2). */
	parentModeDegree?: number;
}
/**
 * A scale: a root pitch plus an ordered pattern of step intervals within a tuning system.
 *
 * `stepPattern` defines the intervals between consecutive degrees in tuning steps
 * (e.g. `[2, 2, 1, 2, 2, 2, 1]` for major in 12-TET). The pattern is relative -
 * the same pattern at a different `rootStep` gives the same scale type in a different key.
 * @category Tonal harmony
 */
export declare class Scale {
	name: string;
	tuningSystem: TuningSystem;
	rootStep: number;
	readonly stepPattern: readonly number[];
	readonly preferFlats?: boolean | undefined;
	/**
	 * @param name - Human-readable scale name (e.g. "C Major", "D Dorian").
	 * @param tuningSystem - The tuning system this scale operates in.
	 * @param rootStep - Step offset of the root note from A4 (= 0).
	 * @param stepPattern - Intervals between consecutive scale degrees, in tuning steps.
	 *   Must be non-empty with all values > 0.
	 * @param preferFlats - Optional flat/sharp preference for note naming in `getNotes()`.
	 *   When provided, overrides the root-name heuristic. Set by `parseScaleSymbol` using
	 *   `preferFlatsForKey(root, scaleType)` for mode-aware accuracy.
	 */
	constructor(name: string, tuningSystem: TuningSystem, rootStep: number, stepPattern: readonly number[], preferFlats?: boolean | undefined);
	/**
	 * Returns the notes of the scale across the given number of octaves.
	 *
	 * The result always includes one extra note at the end: the root repeated one period
	 * above the last octave (e.g. 8 notes for a 7-note scale over 1 octave).
	 * This matches standard notation and is useful for display.
	 *
	 * @param octaves - Number of octaves to span (default: 1).
	 */
	getNotes(octaves?: number): Note[];
	/**
	 * Returns the pitch classes of the scale degrees as step offsets within one period
	 * (0 to `octaveSteps - 1`), starting from the root pitch class.
	 *
	 * Does not include the repeated octave note. A 7-note scale returns 7 pitch classes.
	 */
	getPitchClasses(): number[];
	/**
	 * Returns true if the given step (or its pitch class) belongs to this scale.
	 * Comparison is by pitch class - octave is ignored.
	 */
	contains(step: number): boolean;
	/**
	 * Returns the 1-indexed scale degree of the given step, or `null` if not in the scale.
	 * Comparison is by pitch class - octave is ignored.
	 */
	getDegree(step: number): number | null;
	/**
	 * Derives a mode from the current scale by rotating its step pattern.
	 * @param degree - 1-indexed mode degree (e.g. 2 for Dorian if current scale is Major). Must be an integer.
	 */
	getMode(degree: number): Scale;
	/**
	 * Returns the diatonic chords built by stacking thirds on each scale degree.
	 * - `'triad'` (default): three-note chord (root, 3rd, 5th).
	 * - `'seventh'`: four-note chord (root, 3rd, 5th, 7th).
	 *
	 * In 12-TET, chord names are canonical (e.g. `Bm7b5`, `Caug`). In other tuning systems
	 * a structural label is used (e.g. `"C (0,3,7)"`) since the chord dictionary is 12-TET specific.
	 *
	 * Scales with fewer than 5 notes may not support `'seventh'` on every degree.
	 */
	getDiatonicChords(type?: "triad" | "seventh"): Chord[];
	/**
	 * Returns the diatonic chord built on a single scale degree (1-indexed).
	 * See `getDiatonicChords` for details on `type` and naming.
	 */
	getChordOnDegree(degree: number, type?: "triad" | "seventh"): Chord;
	/**
	 * Identifies the canonical scale-type key (e.g. "dorian", "phrygian dominant") by
	 * matching the scale's name first, then falling back to `SCALE_PATTERNS` pattern lookup.
	 * Returns null if no match is found.
	 */
	private getCanonicalType;
	/**
	 * Returns modal characteristics: brightness (relative to Ionian), the degrees that
	 * differ from the parallel major, traditional jazz avoid notes, and parent-family info.
	 *
	 * `characteristicDegrees`/`characteristicIntervals` and `avoidNotes` are only computed
	 * in 12-TET. Brightness uses `MODE_BRIGHTNESS`; returns 0 if the mode is unknown.
	 */
	getModalCharacteristics(): ModalCharacteristics;
	/**
	 * Returns the parent scale of this mode (e.g. D Dorian → C major), or null if
	 * this scale is not a recognized mode of a known family.
	 */
	getParentScale(): Scale | null;
	/**
	 * Returns the relative mode within the same modal family (e.g. D Dorian → F Lydian).
	 * Returns null if the target mode is in a different family or either mode is unknown.
	 */
	getRelativeMode(targetModeName: string): Scale | null;
	/**
	 * Returns a new scale with the same pattern transposed by the given number of steps.
	 * Named with the new root and the same type ("C major" +2 → "D major"); the root takes
	 * the spelling of the key with fewer accidentals.
	 */
	transpose(steps: number): Scale;
}
/**
 * Note names in 12-TET using sharps, ordered from A (index 0 = A, index 3 = C, etc.).
 * @category Core
 */
export declare const NOTE_NAMES_12TET_SHARP: string[];
/**
 * Note names in 12-TET using flats, ordered from A (index 0 = A, index 3 = C, etc.).
 * @category Core
 */
export declare const NOTE_NAMES_12TET_FLAT: string[];
/**
 * Converts a standard note name (e.g., "C#", "Bb") + octave to steps from A4 in 12-TET.
 * A4 = 0. C4 = -9.
 * @category Core
 */
export declare function parseNoteToStep12TET(noteName: string, octave?: number): number;
/**
 * Returns the full note name with octave for a step offset from A4 in 12-TET.
 * @param stepsFromA4 - Integer semitone offset from A4 (A4 = 0, C4 = -9).
 * @param preferFlats - If true, uses flat spelling (e.g. Bb instead of A#).
 * @returns Note name with octave, e.g. `"C4"`, `"Bb3"`.
 * @category Core
 */
export declare function get12TETName(stepsFromA4: number, preferFlats?: boolean): string;
/**
 * Names a 12-TET step using the letter `degree` positions above `rootLetter`
 * (degree 0 = the root letter itself), with whatever accidentals that letter needs.
 * The octave number follows the letter, so B#3 and C4 are the same pitch.
 * @returns Full name with octave (e.g. `"E#4"`, `"Cb5"`), or null when the letter
 *   would need more than two accidentals.
 * @category Core
 */
export declare function spellByLetter(stepsFromA4: number, rootLetter: string, degree: number): string | null;
/**
 * Letter offset of a chord tone above the root, from its interval in semitones and the
 * rest of the chord (`pcs`: the chord's intervals mod 12): 6 is b5 without a perfect fifth
 * and #11 with one; 8 is #5 or b13; 3 is #9 when the chord has a major third; 9 is the
 * bb7 of a diminished seventh.
 * @category Core
 */
export declare function chordToneOffset(semitones: number, pcs: ReadonlySet<number>): number;
/**
 * The written root of a symbol (`"Cb"` from `"Cbmaj7"`, `"E#"` from `"E# major"`) when it
 * names the pitch of `stepsFromA4` in 12-TET; otherwise null.
 * @category Core
 */
export declare function writtenRoot(symbol: string, stepsFromA4: number): string | null;
/**
 * Returns just the note letter+accidental without octave number (e.g. "C#", "Bb").
 * @category Core
 */
export declare function get12TETBaseName(stepsFromA4: number, preferFlats?: boolean): string;
/**
 * Returns the other spellings of a note, up to double sharps and double flats (`##`,
 * `bb`), fewest accidentals first. With an octave, the octave follows the letter
 * (C4 → B#3, Dbb4).
 * @param noteName - Note name with optional accidental and octave, e.g. `"C#"`, `"F#4"`.
 * @returns Enharmonic equivalents, e.g. `["Db", "B##"]` for `"C#"`; empty for an invalid name.
 * @category Core
 */
export declare function getEnharmonics(noteName: string): string[];
/**
 * Returns true if the given key should use flat accidentals for note naming.
 *
 * Uses circle-of-fifths logic extended to the church modes and the modes of harmonic and
 * melodic minor. For major-family modes, the parent Ionian key is looked up in the circle;
 * for minor-family modes, the parent minor key (a minor tonic is looked up by its own name).
 * Falls back to checking the root's own accidental for unknown scale types.
 *
 * @param rootName - Root note name (e.g. 'D', 'Bb', 'F#'). Octave digits are stripped.
 * @param scaleType - Scale or mode type (e.g. 'major', 'dorian', 'harmonic minor'). Default: 'major'.
 * @category Core
 */
export declare function preferFlatsForKey(rootName: string, scaleType?: string): boolean;
/**
 * @deprecated Use `preferFlatsForKey(rootName, scaleType)` instead.
 * This alias only considers the root note without scale-type context,
 * which gives incorrect results for modes and minor-family scales.
 * @category Core
 */
export declare function usesFlats(rootName: string): boolean;
/**
 * Returns the interval abbreviation for a number of semitones above a root, compound
 * intervals included at any size (`m9`, `P11`, `M13`, `P15`, `M17`).
 * Pitch alone cannot tell A4 from d5: pass `letterSteps` (letters above the root, 0 =
 * unison) to choose; without it, 6 semitones is `d5` and every other size takes its
 * usual number (3 = m3, 8 = m6).
 * @param stepsFromRoot - Semitones above the root (negative: measured downwards).
 * @param is12TET - If false, returns a generic `"Step N"` label.
 * @param letterSteps - Letter distance, e.g. 3 for a fourth, 9 for a tenth.
 * @returns Interval abbreviation, e.g. `"M3"`, `"A4"`, `"m10"`; `"Step N"` when the
 *   letter distance and the semitones do not make an interval.
 * @category Core
 */
export declare function getIntervalName(stepsFromRoot: number, is12TET?: boolean, letterSteps?: number): string;
/**
 * Names the interval between two written notes by their letters and octaves: C4–F#4 is
 * `A4`, C4–Gb4 is `d5`, C4–E5 is `M10`. Order does not matter; the interval is measured
 * from the lower note. Notes without an octave are taken in octave 4.
 * @param a - Note name, e.g. `"C4"`, `"F#"`, `"Bb3"`.
 * @param b - Note name.
 * @throws if either name is not a note.
 * @category Core
 */
export declare function getIntervalBetween(a: string, b: string): string;
/**
 * Returns a human-readable interval name from a cent value.
 * Matches to the nearest 12-TET interval within ±10 cents, compound intervals included
 * (`Major 10th (M10)`, `Perfect 15th (P15)`); the tritone is `Tritone (A4/d5)` and its
 * compounds `Augmented 11th (A11)`. Otherwise returns the raw cent value.
 * Useful for microtonal tunings where exact semitone counts don't apply.
 * @param cents - Interval size in cents (negative: measured downwards).
 * @returns Interval name, e.g. `"Major 3rd (M3)"`, or `"350.00 cents"` if no match.
 * @category Core
 */
export declare function getSemanticIntervalName(cents: number): string;
/**
 * Converts a frequency in Hz to the nearest MIDI note number, clamped to 0-127.
 * MIDI note 69 is A4 (default 440Hz).
 * @category Core
 */
export declare function freqToMidi(freq: Hertz, baseA4?: Hertz): MidiNote;
/**
 * Converts a frequency to the closest valid MIDI note and the pitch bend offset in cents.
 * Useful for microtonal playback via standard MIDI.
 * @category Core
 */
export declare function freqToMidiPitchBend(freq: Hertz, baseA4?: Hertz): {
	/** Nearest MIDI note number (not clamped to 0-127). */
	note: MidiNote;
	/** Distance from that note, in cents, -50 to 50. */
	centsOffset: number;
};
/**
 * Converts a MIDI note number (0-127) to frequency in Hz.
 * @category Core
 */
export declare function midiToFreq(midi: MidiNote, baseA4?: Hertz): Hertz;
/**
 * CHORD_FORMULAS - intervals in 12-TET semitones from root (0 = root, 7 = P5, etc.)
 * Parser maps these to any target tuning via getStepFromStandard().
 * Canonical keys are used in chord naming and detection; aliases section maps
 * common alternate notations to the same formula.
 * @category Core
 */
export declare const CHORD_FORMULAS: Record<string, readonly number[]>;
/**
 * SCALE_PATTERNS - step intervals in 12-TET semitones (e.g., [2,2,1,2,2,2,1] for Major).
 * All patterns must sum to 12 (one octave). Steps are mapped to any target tuning
 * via getStepFromStandard() in parser functions.
 *
 * Modes are grouped under their parent scale for legibility.
 * @category Core
 */
export declare const SCALE_PATTERNS: Record<string, readonly number[]>;
/**
 * MODAL_DEGREE_QUALITIES - chord qualities per scale degree for each classical mode.
 *
 * `triads[i]` is the triad quality on degree i+1; `sevenths[i]` is the seventh-chord
 * quality on degree i+1. Values are suffixes compatible with `CHORD_FORMULAS`
 * (empty string = major triad; 'M' would be redundant).
 *
 * Verified against `Scale.getDiatonicChords` for each mode rooted at C.
 * @category Core
 */
export interface ModalDegreeQualities {
	/** Triad quality on each degree, 1 to 7 (`''` major, `'m'`, `'dim'`, `'aug'`). */
	readonly triads: readonly string[];
	/** Seventh-chord quality on each degree, 1 to 7 (`'maj7'`, `'m7'`, `'7'`, `'m7b5'`…). */
	readonly sevenths: readonly string[];
}
/**
 * Chord qualities on each degree of each mode, by mode name (`'dorian'`, `'harmonic minor'`…). See `ModalDegreeQualities`.
 * @category Core
 */
export declare const MODAL_DEGREE_QUALITIES: Readonly<Record<string, ModalDegreeQualities>>;
/**
 * MODE_PARENT_FAMILY - for each mode, the family it belongs to and its 1-indexed
 * position within that family. Enables `Scale.getParentScale()` and
 * `Scale.getRelativeMode()` navigation within classical modal systems.
 * @category Core
 */
export interface ModeParent {
	/** Parent scale type: `'major'`, `'harmonic minor'`, `'melodic minor'`… */
	readonly family: string;
	/** Degree of the parent scale the mode starts on, from 1. */
	readonly degree: number;
	/** Modes of the family in order, from degree 1. */
	readonly familyModes: readonly string[];
}
/**
 * Parent family and degree of each mode, by mode name (`'dorian'` → major, degree 2). See `ModeParent`.
 * @category Core
 */
export declare const MODE_PARENT_FAMILY: Readonly<Record<string, ModeParent>>;
/**
 * MODE_BRIGHTNESS - ordering of diatonic modes by sharpness relative to the parent major.
 * Lydian (+1 raised degree) brightest; Locrian (5 flat degrees vs major) darkest.
 * Values are integers: positive = brighter than Ionian, negative = darker.
 * @category Core
 */
export declare const MODE_BRIGHTNESS: Readonly<Record<string, number>>;
/**
 * Parses a standard chord symbol into a `Chord` object.
 *
 * Supported formats:
 * - Triads: `C`, `Cm`, `Cdim`, `Caug`, `Csus2`, `Csus4`
 * - Seventh chords: `Cmaj7`, `Cm7`, `C7`, `Cdim7`, `Cm7b5`, `CmM7`
 * - Extended: `C9`, `C11`, `C13`, `Cmaj9`, etc.
 * - Altered: `C7b9`, `C7#11`, `C7alt`, `Calt`
 * - Slash chords: `C/E`, `Cmaj7/G`, `C6/9/E` (only a note name after the last slash is a bass)
 * - Shorthands: `CΔ`, `CΔ7`, `Cø`, `C-7`, `C°`, `C°7`, `C+`
 * - Compositional (any combination): `Cm9b5`, `C13b9#11`, `CmM9`, `Cmaj13#11`
 *   Alterations (`b5 #5 b9 #9 #11 b13`) may appear in any order.
 *   Spaces within the suffix are ignored (`C7 b9 #11` = `C7b9#11`).
 *
 * Resolution order: dictionary lookup → compositional parser → error.
 * Named chords (`dim7`, `add9`, `6/9`, `alt`, etc.) are always resolved via
 * the dictionary regardless of whether they could be parsed compositionally.
 *
 * Root is case-insensitive (`cmaj7` = `Cmaj7`).
 *
 * @param symbol - Chord symbol string.
 * @param tuning - Target tuning system (default: 12-TET). Intervals are mapped via `getStepFromStandard`.
 * @param octave - Octave for the root note (default: 4).
 * @throws if the symbol cannot be parsed or the chord type is neither in the dictionary nor compositionally valid.
 * @category Core
 */
export declare function parseChordSymbol(symbol: string, tuning?: TuningSystem, octave?: number): Chord;
/**
 * Parses a scale symbol into a `Scale` object.
 *
 * Format: `"<Root> <type>"`, e.g. `"C# dorian"`, `"Bb harmonic minor"`, `"D melodic minor"`.
 * Root is case-insensitive. Scale type must match a key in `SCALE_PATTERNS` (case-insensitive).
 *
 * @param symbol - Scale symbol string with root and type separated by a space.
 * @param tuning - Target tuning system (default: 12-TET). Pattern steps are mapped via `getPatternFromStandard` (positions, not single steps).
 * @param octave - Octave for the root note (default: 4).
 * @throws if the symbol cannot be parsed or the scale type is unknown.
 * @category Core
 */
export declare function parseScaleSymbol(symbol: string, tuning?: TuningSystem, octave?: number): Scale;
/**
 * Parses a note string into a `Note` object in 12-TET.
 *
 * Accepts: `"C4"`, `"Bb3"`, `"F#"`, `"c#5"` (case-insensitive root).
 * The original spelling (sharp or flat) is preserved in the returned Note's name.
 *
 * @param noteStr - Note string with optional octave number.
 * @param defaultOctave - Octave to use if none is specified (default: 4).
 * @throws if the string cannot be parsed.
 * @category Core
 */
export declare function parseNote(noteStr: string, defaultOctave?: number): Note;
/**
 * Parses a Roman numeral progression in a given key into an array of `Chord` objects.
 *
 * - Case gives the third: `I`, `IV`, `V` major; `ii`, `iii`, `vi` minor
 * - What the numeral leaves unsaid comes from the key: `vii` in C major is Bdim,
 *   `ii7` is Dm7, `vii7` is Bm7b5. A third that is not the key's gives the plain chord
 *   of the case: `II` is D, `iv7` in major Fm7
 * - Upper-case `7` is a dominant seventh (jazz convention): `V7` G7, `I7` C7, `IV7` F7;
 *   the major seventh is written `maj7` (`Imaj7`). `dom` is an alias (`Idom7`)
 * - Any other suffix is a chord type, read like `parseChordSymbol` (dictionary, then
 *   compositional); lower case adds the minor third: `ii9` is Dm9, `V7b9` G7b9,
 *   `viiø7` Bm7b5, `vii°7` Bdim7. An unknown suffix throws
 * - Accidentals move the key's own degree: `bVII` in C major is Bb, `bII` in A minor is
 *   Bb. In minor, `VII` and `VI` are the natural degrees (G and F in A minor), and
 *   `vii°`, `vii°7`, `viiø7` stand on the raised leading tone (G#)
 * - Applied chords: `V7/ii`, `vii°7/V`, `V/bVI` (read in the major or minor key of the
 *   target, as its case says)
 * - Tritone substitution: `subV7`, `subV7/ii`
 *
 * Roots are named as the key writes them (`bII` in E major is F, `V/vi` in Db major is Ab).
 * Example: `parseRomanProgression("ii7 V7 subV7/ii Imaj7", "C major")`
 *
 * @param progression - Space- or hyphen-separated Roman numeral tokens.
 * @param keySymbol - Seven-note key, e.g. `"C major"`, `"A minor"`, `"D dorian"`.
 * @param tuning - Target tuning system (default: 12-TET). Chords are built as in
 *   `parseChordSymbol`, with intervals mapped by `getStepFromStandard`.
 * @param octave - Octave of the key's tonic (default: 4).
 * @throws on an invalid numeral, an unknown suffix or a key that is not heptatonic.
 * @category Core
 */
export declare function parseRomanProgression(progression: string, keySymbol: string, tuning?: TuningSystem, octave?: number): Chord[];
/**
 * Parses a polychord notation into two separate chords.
 *
 * Formats supported:
 * - `"Fmaj7|Gmaj7"` - upper chord | lower chord (vertical stack)
 * - `"D/C"` - upper chord over the triad of the bass note; throws when the bass is a
 *   tone of the upper chord (`"C/E"` is an inversion: use `parseChordSymbol`)
 *
 * @throws if the symbol cannot be parsed.
 * @category Core
 */
export declare function parsePolychord(symbol: string, tuning?: TuningSystem): {
	/** The chord on top. */
	upper: Chord;
	/** The chord below (for `'D/C'`, the major triad on C). */
	lower: Chord;
};
/**
 * 19-TET - good approximation of minor thirds and meantone; used in microtonalism.
 * @category Core
 */
export declare const TET19: EDO;
/**
 * 24-TET - quarter-tone tuning; common in Arabic and Turkish maqam music.
 * @category Core
 */
export declare const TET24: EDO;
/**
 * 31-TET - excellent meantone approximation; best EDO for pure major thirds.
 * @category Core
 */
export declare const TET31: EDO;
/**
 * 53-TET - closest standard EDO to 5-limit just intonation; scientific reference.
 * @category Core
 */
export declare const TET53: EDO;
/**
 * Werckmeister III (Well Temperament, 1691).
 * Used by Bach and contemporaries. Each key has a slightly different character.
 * Werckmeister's values are in cents from C; step 0 is A4 (A → C = 311.73¢).
 * @category Core
 */
export declare const WerckmeisterIII: CentTuning;
/**
 * Bohlen-Pierce (ED3) - 13 equal steps to the tritave (ratio 3:1).
 * Developed independently by Heinz Bohlen (1972) and John Pierce (1984).
 * @category Core
 */
export declare const BohlenPierce: NonOctaveTuning;
/**
 * Ptolemaic (Ptolemy's Intense Diatonic) - 5-limit JI diatonic scale.
 * The classic just intonation tuning for the 7-note major scale.
 * Ratios: 1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8.
 * @category Core
 */
export declare const PtolemaicJI: JustIntonation;
/**
 * 5-Limit Just Intonation (Chromatic) - all 12 pitch classes tuned to pure 5-limit ratios.
 * The standard JI chromatic scale as used in classical JI analysis.
 * @category Core
 */
export declare const FiveLimitJI: JustIntonation;
/**
 * Returns a major scale in 12-TET rooted at `rootStep` (steps from A4).
 * @category Core
 */
export declare const MajorScale12TET: (rootStep: number) => Scale;
/**
 * Returns a natural minor scale in 12-TET rooted at `rootStep`.
 * @category Core
 */
export declare const MinorScale12TET: (rootStep: number) => Scale;
/**
 * Returns a major triad in 12-TET rooted at `rootStep`.
 * @category Core
 */
export declare const MajorTriad12TET: (rootStep: number) => Chord;
/**
 * Returns a minor triad in 12-TET rooted at `rootStep`.
 * @category Core
 */
export declare const MinorTriad12TET: (rootStep: number) => Chord;
/**
 * Returns a dominant 7th chord in 12-TET rooted at `rootStep`.
 * @category Core
 */
export declare const Dominant7th12TET: (rootStep: number) => Chord;
/**
 * Returns a neutral/Rast scale in 24-TET (approximates common maqam scales).
 * @category Core
 */
export declare const NeutralScale24TET: (rootStep: number) => Scale;
/**
 * Returns the Bayati maqam scale in 24-TET. Characteristic neutral 2nd above root.
 * @category Core
 */
export declare const BayatiScale24TET: (rootStep: number) => Scale;
/**
 * Returns a neutral triad in 24-TET (neutral third = 350¢).
 * @category Core
 */
export declare const NeutralTriad24TET: (rootStep: number) => Chord;
/**
 * Returns a quarter-comma meantone major scale in 31-TET.
 * @category Core
 */
export declare const MeantoneMajor31TET: (rootStep: number) => Scale;
/**
 * Returns the BP Lambda chord (Dur triad) rooted at `rootStep`. Analogous to a major triad.
 * @category Core
 */
export declare const BohlenPierceLambdaChord: (rootStep: number) => Chord;
/**
 * Returns the BP Moll chord (Minor triad) rooted at `rootStep`.
 * @category Core
 */
export declare const BohlenPierceMollChord: (rootStep: number) => Chord;
/**
 * Returns the full BP chromatic scale (13 equal steps per tritave).
 * @category Core
 */
export declare const BohlenPierceChromaticScale: (rootStep: number) => Scale;
/**
 * Returns a major triad in any tuning system. Intervals mapped via `getStepFromStandard`.
 * @category Core
 */
export declare const MajorTriad: (tuning: TuningSystem, rootStep: number) => Chord;
/**
 * Returns a minor triad in any tuning system. Intervals mapped via `getStepFromStandard`.
 * @category Core
 */
export declare const MinorTriad: (tuning: TuningSystem, rootStep: number) => Chord;
/**
 * Returns a chromatic scale spanning one full period of any tuning system.
 * @category Core
 */
export declare const ChromaticScale: (tuning: TuningSystem, rootStep: number) => Scale;
/**
 * Builds a scale from a segment of the harmonic series. The tuning is octave-repeating JI whose
 * pitch classes are the partials reduced to one octave; the scale climbs through the partials,
 * so a segment wider than an octave (1–16) spans several octaves.
 * @param rootHz - Frequency of the first partial in Hz (scale step 0).
 * @param fromHarmonic - First partial (e.g. 8).
 * @param toHarmonic - Last partial (e.g. 16).
 * @category Core
 */
export declare function HarmonicSeries(rootHz: number, fromHarmonic: number, toHarmonic: number): Scale;
/**
 * Harmonic series partials 1–16 (full overtone scale).
 * @category Core
 */
export declare const Harmonics1to16: Scale;
/**
 * Harmonic series partials 8–16 (one-octave segment, upper harmonics).
 * @category Core
 */
export declare const Harmonics8to16: Scale;
/**
 * Harmonic series partials 16–32 (very high harmonics).
 * @category Core
 */
export declare const Harmonics16to32: Scale;
/**
 * A key related to a reference key, with its relationship type and circle-of-fifths distance.
 * @category Tonal harmony
 */
export type RelatedKey = {
	/** The related key, in the circle's notation: major upper case (`'G'`), minor lower case (`'e'`). */
	key: string;
	/** How it relates to the reference key; `'neighbor'` is two steps away on the circle. */
	relationship: "relative" | "parallel" | "dominant" | "subdominant" | "neighbor";
	/** Steps on the circle of fifths: 0 relative and parallel, 1 dominant and subdominant, 2 neighbors. */
	distance: number;
};
/**
 * A modal key: a root note, a mode name, and the parent major key that the mode is derived from.
 * For example, D dorian is derived from C major (D is the 2nd degree of C major).
 * @category Tonal harmony
 */
export interface ModalKey {
	/** Root of the mode, as passed in: `'D'`. */
	root: string;
	/** Mode name in lower case: `'dorian'`. */
	mode: string;
	/** Major key the mode belongs to (`'C'` for D dorian); empty when the mode is not one of the seven diatonic modes. */
	parentMajorKey: string;
}
/**
 * Circle of Fifths utility.
 * Convention: major keys use uppercase ('C', 'G'...), minor keys use lowercase ('a', 'e'...).
 * Methods that return keys follow this same convention - callers should use case to distinguish mode.
 * @category Tonal harmony
 */
export declare class CircleOfFifths {
	/** Major keys clockwise from C, in upper case. */
	static readonly majorKeys: string[];
	/** Minor keys clockwise from A, in lower case (`'a'` is A minor), aligned with their relative majors. */
	static readonly minorKeys: string[];
	/** Normalizes enharmonic key names to the canonical form used in the circle arrays. */
	private static normalizeKey;
	/**
	 * Returns the key signature of a key as written: Gb → 6 flats, F# → 6 sharps, C# → 7 sharps,
	 * eb → 6 flats. Theoretical keys go past 7 (G# → 8 sharps). Unrecognized keys → no accidentals.
	 */
	static getSignature(key: string): {
		/** Number of sharps in the key signature. */
		sharps: number;
		/** Number of flats in the key signature. */
		flats: number;
	};
	/**
	 * Gets the relative minor for a major key, or relative major for a minor key.
	 */
	static getRelative(key: string): string;
	/**
	 * Gets the dominant key (perfect fifth up / one step clockwise).
	 */
	static getDominant(key: string): string;
	/**
	 * Returns the 0–11 index of the key on its circle (C/a = 0, G/e = 1…).
	 * Returns -1 if the key is not recognized.
	 */
	static getPosition(key: string): number;
	/**
	 * Moves steps positions clockwise (positive) or counter-clockwise (negative).
	 * Returns empty string if key is not recognized.
	 */
	static navigate(key: string, steps: number): string;
	/**
	 * Gets the subdominant key (perfect fourth up / one step counter-clockwise).
	 */
	static getSubdominant(key: string): string;
	/**
	 * Shortest distance (0–6) between two keys on the same circle.
	 * Returns -1 if keys are of different modes or unrecognized.
	 */
	static getDistance(key1: string, key2: string): number;
	/**
	 * Returns the parallel key - same root, opposite mode.
	 * 'C' → 'c', 'a' → 'A', 'F#' → 'f#'.
	 */
	static getParallel(key: string): string;
	/**
	 * Returns keys within radius steps on the same circle, sorted closest first.
	 * Clockwise neighbor before counter-clockwise at each distance. Excludes key itself.
	 */
	static getNeighbors(key: string, radius?: number): string[];
	/**
	 * Returns all tonally related keys sorted by distance ascending.
	 * Covers: relative, parallel, dominant, subdominant, and ±2 neighbors.
	 */
	static getRelatedKeys(key: string): RelatedKey[];
	/**
	 * Returns the `ModalKey` for a given root and mode name, computing the
	 * parent major key (the major scale from which this mode is derived).
	 *
	 * For example, D dorian → parent major key = C (D is degree 2 of C major).
	 * Only the 7 diatonic modes of the major family are supported.
	 */
	static getModalKey(root: string, mode: string): ModalKey;
	/**
	 * Returns modal keys with the same root and adjacent brightness (within `radius` steps).
	 * Neighbors are modes of the same root note that are brighter or darker than the input.
	 */
	static getModalNeighbors(modalKey: ModalKey, radius?: number): ModalKey[];
	/**
	 * Returns the circle-of-fifths distance between the parent major keys of two modal keys.
	 * Distance 0 means both modes share the same parent major key.
	 */
	static getModalDistance(keyA: ModalKey, keyB: ModalKey): number;
}
/**
 * Category of a voice-leading problem detected between two chords.
 * @category Tonal harmony
 */
export type VoiceLeadingIssueType = "Parallel 5th" | "Parallel Octave" | "Voice Crossing" | "Voice Overlap" | "Leading Tone Unresolved" | "7th Unresolved" | "Forbidden Leap" | "Hidden Fifth" | "Hidden Octave" | "Direct Fifth" | "Direct Octave" | "False Relation" | "Doubled Leading Tone" | "Missing Third" | "Missing Root" | "Missing Fifth" | "Improper 6/4 Usage";
/**
 * A specific voice-leading problem detected between two voices.
 * @category Tonal harmony
 */
export interface VoiceLeadingIssue {
	/** What the problem is. */
	type: VoiceLeadingIssueType;
	/** Indices of the voices involved, as ordered in the arrays passed in (0 = first note). */
	voices: number[];
	/** Readable description, with voices numbered from 1 (`'Parallel 5ths (Voices 1 and 3)'`). */
	message: string;
}
/**
 * A doubling or spacing problem detected in a chord voicing.
 * @category Tonal harmony
 */
export interface DoublingIssue {
	/** What the problem is. */
	type: "Doubled Leading Tone" | "Missing Third" | "Missing Root" | "Missing Fifth" | "Improper Doubling";
	/** Indices of the voices involved in the voicing passed in; empty when a chord member is missing. */
	voices: number[];
	/** Readable description. */
	message: string;
}
/**
 * Full harmonic analysis of a chord within a key context.
 * Includes Roman numeral, function (T/S/D), modal borrowing, and cadence detection.
 * @category Tonal harmony
 */
export interface ChordAnalysis {
	/** The chord analyzed, as passed in. */
	chord: Chord;
	/**
	 * Roman numeral in the local key, readable back with `parseRomanProgression`: `'ii7'`,
	 * `'V7'`, `'bVImaj7'`, `'#iv°7'`, `'ivm'` (a minor chord the key does not hold).
	 */
	roman: string;
	/** Scale degree of the root, 1-7, or -1 when the root cannot be placed on a degree. */
	degree: number;
	/** Tonic, subdominant or dominant function; secondary dominants and the tritone sub of V are `'D'`. */
	function: "T" | "S" | "D" | "unknown";
	/** Every note belongs to the local key (in natural minor, also V, V7, vii° and vii°7 with the raised seventh). */
	isDiatonic: boolean;
	/** The chord comes from a parallel mode (see `borrowedFrom`). Secondary dominants are not borrowed. */
	isBorrowed: boolean;
	/** Mode it is borrowed from: `'minor'`, `'dorian'`, `'phrygian'`, `'mixolydian'`, `'lydian'`, `'harmonic minor'`… */
	borrowedFrom?: string;
	/** A secondary dominant or leading-tone chord (see `secondaryTarget`). */
	isSecondary: boolean;
	/** The secondary function: `'V7/ii'`, `'V7/IV'`, `'vii°7/V'`. The target is cased by its triad in the key. */
	secondaryTarget?: string;
	/** Cadence formed with the next chord, read in the next chord's key: `'Authentic Cadence (V -> I)'`… (see `Harmony.analyzeCadence`). */
	cadenceWithNext?: string;
	/** `'tritone sub of V'` for a dominant seventh on bII. */
	substitutionCandidate?: string;
	/** The key this chord was read in: the home key, or the key of the last modulation. */
	key: string;
}
/**
 * A detected key change within a chord progression.
 * Includes the index where modulation occurs and the type (pivot, direct, etc.).
 * @category Tonal harmony
 */
export interface ModulationEvent {
	/** Index of the first chord read in the new key. */
	atIndex: number;
	/** Key before the change, as passed in or as a previous event's `toKey`. */
	fromKey: string;
	/** New key, as `'G major'` or `'C minor'`. */
	toKey: string;
	/**
	 * `'pivot'` when the chord before `atIndex` belongs to both keys, otherwise `'direct'`.
	 * `analyzeProgression` only gives these two; `Harmony.classifyModulation` also tells
	 * `'enharmonic'`, `'chromatic'` and `'common-tone'`.
	 */
	type: "direct" | "pivot" | "enharmonic" | "chromatic" | "common-tone";
	/** The chord before `atIndex`, when it belongs to both keys. */
	pivotChord?: Chord;
}
/**
 * Analysis of a second-inversion (6/4) chord.
 * Classifies it as cadential, pedal, passing, or arpeggiated.
 * @category Tonal harmony
 */
export interface SixFourAnalysis {
	/** How the 6/4 chord is used; `'none'` when the chord is not in second inversion. */
	type: "cadential" | "pedal" | "passing" | "arpeggiated" | "none";
	/** For a cadential 6/4, the chord it resolves to (the following V). */
	resolution?: Chord;
}
/**
 * One reading of a set of notes as a chord, with what ranks it (see `Harmony.detectChordsScored`).
 * @category Tonal harmony
 */
export interface ChordCandidate {
	/** Chord symbol, with a slash bass when the lowest note is not the root: `'C7'`, `'C7/E'`. */
	name: string;
	/** Root note name, without octave. */
	root: string;
	/** Lowest note name, without octave. */
	bass: string;
	/** Key of the formula in `CHORD_FORMULAS` (`'M'`, `'7'`, `'maj9'`…). */
	quality: string;
	/** 1 for a complete chord over its root; less for each omitted member, another bass, and each tension. */
	score: number;
	/** The lowest note is the root. */
	rootInBass: boolean;
	/** Formula members that do not sound (`'5'`; `'9'` and `'11'` in eleventh and thirteenth chords). */
	omitted: string[];
	/** Members above the octave: `'9'`, `'#11'`, `'b13'`… */
	tensions: string[];
}
/**
 * A chord borrowed from a parallel mode (modal mixture), from `Harmony.getBorrowedChords`.
 * @category Tonal harmony
 */
export interface BorrowedChord {
	/** The borrowed chord, spelled in the source mode. */
	chord: Chord;
	/** Mode it comes from, on the same tonic: `'aeolian'`, `'dorian'`, `'mixolydian'`, `'harmonic minor'`… */
	sourceMode: string;
	/** Brightness of the source mode: lydian 1, ionian 0 … locrian -5 (`MODE_BRIGHTNESS`; melodic minor -2, harmonic minor -3). */
	brightness: number;
	/** Function of the chord in the home key. */
	function: "T" | "S" | "D" | "unknown";
	/**
	 * The chord holds a degree that sets the source mode apart from its reference scale
	 * (#4 lydian, b7 mixolydian, 6 dorian, b6 aeolian, b2 phrygian, b2 or b5 locrian…).
	 */
	characteristic: boolean;
}
/**
 * A chord that functions diatonically in two different keys,
 * used as the pivot point in a modulation.
 * @category Tonal harmony
 */
export interface PivotChord {
	/** The chord, spelled as in key A. */
	chord: Chord;
	/** Its role in key A. */
	functionInA: {
		/** Scale degree of the root, 1-7. */
		degree: number;
		/** Tonic, subdominant or dominant function. */
		function: "T" | "S" | "D";
	};
	/** Its role in key B. */
	functionInB: {
		/** Scale degree of the root, 1-7. */
		degree: number;
		/** Tonic, subdominant or dominant function. */
		function: "T" | "S" | "D";
	};
}
/**
 * The Coltrane substitution axis for a given root.
 * The three major-third substitutions form a diminished seventh pattern.
 * @category Tonal harmony
 */
export interface ColtraneAxis {
	/** Root of the key passed in. */
	root: string;
	/** The root and the roots a major third and an augmented fifth above it: `['C', 'E', 'Ab']`. */
	majorThirds: [
		string,
		string,
		string
	];
}
/**
 * How a slash chord is interpreted: simple inversion, hybrid, polychord, or upper structure.
 * @category Tonal harmony
 */
export type SlashType = "inversion" | "hybrid" | "polychord" | "upper-structure";
/**
 * Result of analyzing a slash chord (e.g. C/E, Fmaj7/A).
 * Distinguishes inversions from hybrid chords, polychords, and upper structures.
 * @category Tonal harmony
 */
export interface SlashAnalysis {
	/** How the slash chord reads (an inversion when the bass is a chord tone). */
	type: SlashType;
	/** Chord formed by the upper notes, for `'upper-structure'` and `'polychord'`. */
	upperStructure?: Chord;
	/** The bass note. */
	lowerRoot?: Note;
	/** Major triad on the bass, for `'polychord'`. */
	lowerChord?: Chord;
	/** Upper notes named as intervals over the bass: `'R'`, `'M3'`, `'P5'`, `'b7'`, `'9'`, `'#11'`, `'13'`… */
	resultingTensions?: string[];
}
/**
 * Hints for enharmonic respelling decisions.
 * Providing a key or functional role improves spelling accuracy.
 * @category Tonal harmony
 */
export interface RespellContext {
	/** Key to spell in (`'Db major'`); takes precedence over `direction`. */
	keySymbol?: string;
	/** Accepted but not read yet by `respellNote` or `respellChord`. */
	functionalRole?: "secondary-dominant" | "chromatic-mediant" | "passing" | "neighbor";
	/** Without a key: `'ascending'` spells with sharps, `'descending'` with flats. */
	direction?: "ascending" | "descending";
}
/**
 * Tonal harmony, as static methods: progression analysis (`analyzeProgression`), chord
 * detection (`detectChords`, `detectChordsScored`), cadences, voice leading and doubling
 * checks, secondary and borrowed chords, modulation and pivot chords, chord-scale
 * suggestions, negative harmony, the Coltrane axis, slash chords and enharmonic respelling.
 * Key arguments are written `'C major'`, `'A minor'`, `'D dorian'`.
 * @category Tonal harmony
 */
export declare class Harmony {
	/**
	 * Checks voice leading between two chords. Emits warnings for parallel motion,
	 * voice crossing, overlap, and (when `context` is provided) unresolved tendency
	 * tones, hidden/direct 5ths/8ves, false relations, and doubled leading tones.
	 *
	 * Voices are expected to be ordered bass → soprano in both chords.
	 *
	 * @param ruleset
	 *   - `'strict'`: Bach chorale-style - all standard prohibitions enforced.
	 *   - `'contemporary'`: jazz/pop - relaxes parallel 5ths/8ves and leaps.
	 *   - `'species'`: minimal - no parallels, no crossing, no overlap. Full species
	 *      counterpoint rules live in the counterpoint module (future phase).
	 * @param context Optional harmonic context enabling tendency-tone and false-relation checks.
	 */
	static checkVoiceLeading(chordA: Note[], chordB: Note[], ruleset?: "strict" | "contemporary" | "species", context?: {
		keySymbol?: string;
		chordA?: Chord;
		chordB?: Chord;
	}): VoiceLeadingIssue[];
	/**
	 * Returns warnings about chord voicing: doubled leading tone, missing essential
	 * chord tones, and improper doublings relative to conventional practice.
	 */
	static checkDoubling(voicing: Note[], chordSymbol: Chord, keySymbol?: string): DoublingIssue[];
	/**
	 * Analyzes a progression in a given key, returning Roman-numeral-level info for
	 * each chord (function, diatonicism, borrowed/secondary flags, cadence-with-next)
	 * and a list of detected modulations (see below). After a modulation, numerals and
	 * cadences are read in the new key, and each entry's `key` says which key it was read in.
	 *
	 * Modulation: a chord foreign to the current key starts a passage held by a new key;
	 * the new key is the one with an authentic cadence (V → I) in the passage, then with its
	 * tonic chord in it, then with the best Krumhansl-Schmuckler correlation. A passage of
	 * fewer than three chords is a tonicization, not a modulation (E7 → Am inside C major).
	 * Nor is a passage whose foreign chords are all secondary dominants of the current key
	 * and after which the music returns to it: the turnaround G7 Cm7 F7 Bb7 in Bb major
	 * (VI7 ii7 V7 I7) stays in Bb, though G7 → Cm7 is a cadence in C minor. A passage that does
	 * not return (C … D7 G Em Am D7 G to the end) is a modulation.
	 *
	 * `style: 'blues'`: dominant sevenths on I, IV and V belong to the key (C7, F7 and G7 in
	 * C major are I7, IV7 and V7, functions T, S and D), not secondary dominants (C7 as V7/IV)
	 * nor borrowed chords, and they do not start a modulation. I7 preceded by its ii is still
	 * V7/IV (Gm7 C7 → F7). Without the option, I7 → IV is V7/IV, as in rhythm changes.
	 *
	 * Harmonic rhythm: with `durations` (in beats, one per chord), chord changes per bar of
	 * `beatsPerBar` (default 4); without them, chord changes per chord, which only says how
	 * often consecutive chords differ. `harmonicRhythmUnit` says which.
	 *
	 * Numerals read back with `parseRomanProgression` (`I7` is a dominant, `Imaj7` a major
	 * seventh). A chromatic root takes its letter from the key by default (`spellChordInKey`:
	 * Gb in C is read F#, `#IV`); with `spelling: 'written'` every root keeps the letter of
	 * its name when the name matches its pitch (Gb in C is `bV`), for chords that arrive
	 * already named rather than detected.
	 */
	static analyzeProgression(chords: Chord[], keySymbol: string, options?: {
		spelling?: "key" | "written";
		durations?: readonly number[];
		beatsPerBar?: number;
		style?: "tonal" | "blues";
	}): {
		/** One entry per chord, in order. */
		analysis: ChordAnalysis[];
		/** Key changes, in order; empty when the progression stays in the key. */
		modulations: ModulationEvent[];
		/** Chord changes per bar (with `durations`) or per chord (without them). */
		harmonicRhythm: number;
		/** Which of the two `harmonicRhythm` measures. */
		harmonicRhythmUnit: "per-bar" | "per-chord";
	};
	/**
	 * Determines the context of a second-inversion (6/4) chord within a progression.
	 * Returns `'none'` if the chord at `index` is not in second inversion.
	 *
	 * - `cadential`: tonic 6/4 followed by V → I.
	 * - `pedal`: bass stays the same across the 6/4 and its neighbors.
	 * - `passing`: bass moves by step through the 6/4.
	 * - `arpeggiated`: same chord repeats with different inversions.
	 */
	static analyzeSixFour(progression: Chord[], keySymbol: string, index: number): SixFourAnalysis;
	/**
	 * Analyzes an array of notes and returns possible chord names.
	 * Useful for Ear Training apps or MIDI input analysis.
	 */
	static detectChords(notes: Note[]): string[];
	/**
	 * Reads a set of notes as chords and ranks the readings, with the reasons. Besides exact
	 * matches (those of `detectChords`), a reading may leave out the fifth, and an eleventh or
	 * thirteenth chord its ninth or eleventh, when at least three different notes sound.
	 * The lowest note (by pitch) is the bass. Readings are ranked by, in order: fewer omitted
	 * members, root in the bass, fewer tensions, fewer formula notes; `score` follows the same
	 * order (1 − 0.3 per omitted member − 0.15 off the root − 0.03 per tension, at least 0).
	 * 12-TET only: other tunings return [].
	 * @example
	 * Harmony.detectChordsScored(['E3', 'C4', 'Bb4'].map(n => parseNote(n)))[0]
	 * // → { name: 'C7/E', omitted: ['5'], rootInBass: false, score: 0.55, … }
	 */
	static detectChordsScored(notes: Note[]): ChordCandidate[];
	/**
	 * Returns the Negative Harmony equivalent of a chord in a given key.
	 */
	static getNegativeHarmony(chord: Chord, keyCenter: string): Chord;
	/**
	 * Returns borrowed chords from parallel modes (Modal Interchange).
	 *
	 * Returns `BorrowedChord[]`.
	 * Each entry includes the source mode, brightness, harmonic function in the
	 * home key, and whether the chord is characteristic of its source mode.
	 * Chords that `analyzeProgression` reads as diatonic are left out: in a minor key, the
	 * dominant and leading-tone chords of the harmonic minor (E7 and G#dim7 in A minor).
	 *
	 * @param keySymbol - e.g. `'C major'`, `'A minor'`
	 * @param options.sources - Limit results to these mode names only.
	 * @param options.tuning - Defaults to TET12; returns [] for non-12-TET.
	 * @param options.type - `'seventh'` (default) or `'triad'`, as in `Scale.getDiatonicChords`.
	 */
	static getBorrowedChords(keySymbol: string, options?: {
		sources?: string[];
		tuning?: TuningSystem;
		type?: "triad" | "seventh";
	}): BorrowedChord[];
	/**
	 * Finds chords that are diatonic to both keys and can therefore serve as pivot chords
	 * for modulation between them. Returns `PivotChord[]` with harmonic function in each key.
	 */
	static findPivotChords(keyA: string, keyB: string, type?: "triad" | "seventh"): PivotChord[];
	/**
	 * Classifies the type of modulation between two key areas based on the transitional chords.
	 *
	 * - `'enharmonic'`: both keys have identical pitch class content.
	 * - `'chromatic'`: the tonic notes are one semitone apart.
	 * - `'pivot'`: a chord in `chordsA` is diatonic to `keyB`.
	 * - `'common-tone'`: the last chord of A and first chord of B share at least one PC.
	 * - `'direct'`: abrupt modulation, no smooth transition detected.
	 */
	static classifyModulation(chordsA: Chord[], chordsB: Chord[], keyA: string, keyB: string): "direct" | "pivot" | "enharmonic" | "chromatic" | "common-tone";
	/**
	 * Applies negative harmony to each chord in the progression, preserving order.
	 */
	static getNegativeProgression(chords: Chord[], keyCenter: string): Chord[];
	/**
	 * Returns the Coltrane axis for a given key root: the three roots separated by
	 * equal major thirds (dividing the octave into thirds). Used in Coltrane Changes.
	 *
	 * Example: `'C'` → `{ root: 'C', majorThirds: ['C', 'E', 'Ab'] }`.
	 */
	static getColtraneAxis(key: string): ColtraneAxis;
	/**
	 * Returns the two Coltrane substitutions for a chord: the other two roots on the
	 * same major-third axis, using the same chord quality as the original.
	 */
	static getColtraneSubstitutions(chord: Chord, _keySymbol: string): Chord[];
	/**
	 * Analyzes the cadence between two chords in a given key.
	 *
	 * Recognized cadences: Authentic (V→I), Plagal (IV→I), Minor Plagal (iv→i),
	 * Deceptive (V→vi), Half (→V), Phrygian/Hyper-phrygian (♭II→I or iv→V),
	 * Picardy (minor i → major I), Backdoor (♭VII7→I), Tritone Sub (subV7→I).
	 */
	static analyzeCadence(chord1: Chord, chord2: Chord, keySymbol: string): string;
	/**
	 * Suggests scales for improvisation over a given chord.
	 * Triads and sixth chords take the scales of their seventh chord: C as Cmaj7, Cm as Cm7
	 * (Cm6, with the natural sixth, takes dorian or melodic minor). A chord no rule names is read by
	 * its third (major or minor scale); without a third (sus2) none is suggested.
	 */
	static getSuggestedScales(chord: Chord, nextChord?: Chord, ruleset?: "berklee" | "classical" | "modal"): {
		/** Scale name with its root: `'G mixolydian'`. */
		scale: string;
		/** When the scale applies: `'standard V'`, `'if IV chord'`… */
		hint?: string;
	}[];
	/**
	 * Detects common harmonic sequences in a chord progression.
	 */
	static detectSequence(chords: Chord[]): {
		/**
		 * `'circle-of-fifths-descending'`, `'circle-of-fifths-ascending'`, their `'diatonic-…'`
		 * forms, `'parallel-descending'`, `'parallel-ascending'`, `'pachelbel'`, `'romanesca'` or
		 * `'unknown'`.
		 */
		type: string;
		/** 0 to 1: 1 for an exact match, 0 for `'unknown'`. */
		confidence: number;
	};
	/**
	 * Returns the retrograde (reversed order) of a chord progression.
	 */
	static retrogradeProgression(chords: Chord[]): Chord[];
	/**
	 * Returns a harmonically inverted progression around `axisNote`.
	 * Each chord's root is reflected: newRoot = 2*axis - root (in steps).
	 * Chord quality is preserved.
	 */
	static invertProgression(chords: Chord[], axisNote: Note): Chord[];
	/**
	 * Measures average voice-leading smoothness across a progression (0 = rough, 1 = smooth).
	 * Every pitch class of each chord moves to the nearest pitch class of the next one, and
	 * every pitch class of the next to the nearest of the previous: the mean move, in interval
	 * classes, against half an octave (the largest move). Common tones count as 0.
	 */
	static voiceLeadingSmoothness(chords: Chord[]): number;
	/**
	 * Analyzes a slash chord and classifies it as inversion, hybrid, polychord, or upper-structure.
	 * Returns `{ type: 'inversion' }` for chords without a bass note.
	 */
	static analyzeSlash(chord: Chord): SlashAnalysis;
	/**
	 * Returns all scales from the dictionary that contain every pitch class of the chord.
	 * `completeness` = chord notes / scale notes (how much of the scale the chord fills).
	 * Results are sorted by completeness descending.
	 */
	static getAllContainingScales(chord: Chord): {
		/** A scale that holds every note of the chord. */
		scale: Scale;
		/** Share of the scale's notes that the chord holds, 0 to 1. */
		completeness: number;
	}[];
	/**
	 * Respells a note based on key context or melodic direction.
	 * - `keySymbol`: the key's spelling (`spellPitchInKey`): scale letters, chromatic notes
	 *   as the harmonic chromatic scale writes them (F# in C, Gb in Db major).
	 * - `direction: 'ascending'`: prefer sharps; `'descending'`: prefer flats.
	 * Returns the original note if no context applies.
	 */
	static respellNote(note: Note, context: RespellContext): Note;
	/**
	 * Respells a chord's root and slash bass based on key context or melodic direction,
	 * keeping the written suffix (extensions, alterations).
	 * - `keySymbol`: `spellChordInKey` (root letter from the key, chord tones by interval).
	 * - `direction: 'ascending'`: sharp names; `'descending'`: flat names (C#9 → Db9).
	 */
	static respellChord(chord: Chord, context: RespellContext): Chord;
}
/**
 * Allen Forte set-class analysis for any pitch-class collection.
 * @category Post-tonal
 */
export declare class SetTheory {
	/**
	 * Extracts unique pitch classes from an array of notes.
	 * Uses the tuning system's `octaveSteps` as the modulus - works for any EDO.
	 * Returns integers 0 to (octaveSteps - 1) where 0 = A (the library's coordinate origin).
	 */
	static getPitchClasses(notes: Note[]): number[];
	/**
	 * Like getPitchClasses, but as 12-TET pitch classes from C = 0 (standard set-theory convention).
	 * C=0, C#=1, D=2, ..., B=11. Notes in other tunings count for the nearest 12-TET pitch class.
	 */
	static getPitchClassesC0(notes: Note[]): number[];
	/**
	 * Calculates the Normal Form of a pitch class set.
	 * The most compact arrangement of the set. Ties in span are broken as in Rahn (1980):
	 * the rotation whose second-to-last note is closest to the first wins, then the third-to-last…
	 * (Forte compares from the bottom instead; the two differ in a few set classes).
	 * @param pcs - Array of pitch class integers.
	 * @param octave - Steps per octave (default 12). Pass `tuningSystem.octaveSteps` for non-12-TET.
	 */
	static normalForm(pcs: number[], octave?: number): number[];
	/**
	 * Calculates the Prime Form of a pitch class set.
	 * The standard representative of a set class (transpositionally and inversionally equivalent).
	 * @param pcs - Array of pitch class integers.
	 * @param octave - Steps per octave (default 12).
	 */
	static primeForm(pcs: number[], octave?: number): number[];
	/**
	 * Calculates the Interval Vector of a pitch class set.
	 * Returns an array of length `floor(octave / 2)` counting interval class occurrences.
	 * @param pcs - Array of pitch class integers.
	 * @param octave - Steps per octave (default 12).
	 */
	static intervalVector(pcs: number[], octave?: number): number[];
	/**
	 * Returns the Allen Forte set-class number for a pitch class set.
	 * Uses C=0 convention (same as standard set theory literature).
	 * Covers every set class of 1–12 pitch classes; returns `'unknown'` for the empty set.
	 */
	static getForteNumber(pcs: number[]): string;
	/**
	 * Returns all prime forms that share the same interval vector as `pcs` (Z-related sets).
	 * Z-related sets have identical interval vectors but are not related by transposition or inversion.
	 * Returns an empty array if no Z-relation exists or the set is not in the Forte table.
	 *
	 * @param pcs - Pitch classes in C=0 space (0–11).
	 * @returns Array of prime forms (each an array of pitch classes in C=0 space) that are Z-related to `pcs`.
	 */
	static getZRelated(pcs: number[]): number[][];
	/**
	 * Returns the complement of a pitch class set (all PCs not in the set).
	 * @param pcs - Pitch class integers.
	 * @param octave - Octave modulus (default 12).
	 */
	static getComplement(pcs: number[], octave?: number): number[];
	/**
	 * Transposition operator Tn - transposes all pitch classes by n.
	 */
	static Tn(pcs: number[], n: number, octave?: number): number[];
	/**
	 * Transposition + inversion operator TnI - inverts then transposes.
	 */
	static TnI(pcs: number[], n: number, octave?: number): number[];
	/**
	 * Returns true if `a` is a subset of `b` (every PC in `a` is also in `b`).
	 */
	static isSubset(a: number[], b: number[], octave?: number): boolean;
	/**
	 * Returns true if `a` is a superset of `b` (every PC in `b` is also in `a`).
	 */
	static isSuperset(a: number[], b: number[], octave?: number): boolean;
	/**
	 * Returns all subsets of `pcs` with the given cardinality.
	 */
	static getAllSubsets(pcs: number[], cardinality: number): number[][];
}
/**
 * A tuning system loaded from a Scala (.scl) file.
 *
 * Pitches are stored as cent offsets from the root (step 0 = 0¢, always implied).
 * The last entry in the `.scl` file must be the period (typically 1200¢ = one octave);
 * this value is used to compute frequencies for steps outside the first period.
 *
 * Use `parseScala()` to construct from raw `.scl` text.
 * @category Microtonal / Xenharmonic
 */
export declare class ScalaTuning extends TuningSystem {
	/** Cent offsets from the root, with 0¢ prepended. Length = `octaveSteps + 1`. */
	cents: number[];
	/** Number of steps per period (= number of pitches in the `.scl` file, excluding the implied root). */
	octaveSteps: number;
	/**
	 * @param name - Scale name (first non-comment line of the `.scl` file).
	 * @param cents - Cent offsets for each pitch, **excluding** the implied 0¢ root but
	 *   **including** the period as the last entry (e.g. `[…, 1200.0]`).
	 * @param baseFrequency - Frequency of step 0 in Hz (default: 440 Hz = A4).
	 */
	constructor(name: string, cents: number[], baseFrequency?: number);
	/** Frequency in Hz for the given step offset from the base pitch. */
	getFrequency(stepsFromBase: number): number;
	/** Interval from step 0 to the given step, in cents. */
	getInterval(steps: number): Interval;
	/**
	 * Returns a generic name for the given step (e.g. `"Step 3"`).
	 * Scala files have no standard note names, so no enharmonic spelling is possible.
	 */
	getNoteName(stepsFromBase: number): string;
}
/**
 * Parses a Scala (.scl) file format string and returns a ScalaTuning object.
 * Following the Scala format: lines starting with `!` are comments; the first other line
 * is the description, which may be empty; then the number of notes; then one pitch per line.
 * @throws if the note count is missing, or there are fewer pitches than it says.
 * @category Microtonal / Xenharmonic
 */
export declare function parseScala(sclText: string, baseFrequency?: number): ScalaTuning;
/**
 * A note duration expressed as a fraction of a whole note, with optional augmentation dots.
 * @category Rhythm
 */
export declare class Duration {
	value: number;
	dots: number;
	/**
	 * @param value Fraction of a whole note (e.g., 0.25 for a quarter note)
	 * @param dots Number of augmentation dots
	 */
	constructor(value: number, dots?: number);
	/** Length as a fraction of a whole note, dots included (a dotted quarter is 0.375). */
	get totalValue(): number;
	/**
	 * Applies a tuplet ratio to this duration.
	 * @param fit How many notes we are fitting (e.g., 3 in a triplet)
	 * @param inSpaceOf The space of how many normal notes (e.g., 2 in a triplet)
	 */
	tuplet(fit: number, inSpaceOf: number): Duration;
	/** Whole note (1). */
	static Whole: Duration;
	/** Half note (1/2). */
	static Half: Duration;
	/** Quarter note (1/4). */
	static Quarter: Duration;
	/** Eighth note (1/8). */
	static Eighth: Duration;
	/** Sixteenth note (1/16). */
	static Sixteenth: Duration;
	/** Thirty-second note (1/32). */
	static ThirtySecond: Duration;
}
/**
 * A time signature, supporting additive meters (e.g. 3+2+2/8) and irrational denominators.
 * Includes presets for common signatures via static properties.
 * @category Rhythm
 */
export declare class TimeSignature {
	numerators: number[];
	denominator: number;
	/**
	 * @param numerators Array of numerators for additive meters (e.g., [3, 2, 2] for 7/8). For standard 4/4, use [4].
	 * @param denominator The note value that represents one beat (e.g., 4 for quarter, 8 for eighth). Can be irrational (e.g., 3).
	 */
	constructor(numerators: number[], denominator: number);
	/** Beats per measure: the numerators added (3+2+2/8 has 7). */
	get totalBeats(): number;
	/** Length of a measure as a fraction of a whole note (3/4 is 0.75). */
	get measureDuration(): number;
	/** More than one numerator, as in 3+2+2/8. */
	get isAdditive(): boolean;
	/** Written form: `'4/4'`, `'3+2+2/8'`. */
	toString(): string;
	/** 4/4. */
	static Common: TimeSignature;
	/** 3/4. */
	static Waltz: TimeSignature;
	/** 2/4. */
	static March: TimeSignature;
	/** 6/8. */
	static CompoundDuple: TimeSignature;
	/** 3+2+2/8. */
	static Balkan7: TimeSignature;
	/** 2+2+2+3/8. */
	static Balkan9: TimeSignature;
}
/**
 * Polyrhythm generation and Euclidean rhythm distribution.
 * @category Rhythm
 */
export declare class Polyrhythm {
	/**
	 * Generates a polyrhythm between multiple voices.
	 * @param voices Array of pulse counts (e.g., [3, 4] for 3-against-4)
	 * @param totalDuration The total duration of the cycle in whole notes (default 1)
	 * @returns An array of voices, each containing an array of timestamps (fractions of totalDuration) where pulses occur.
	 */
	static generate(voices: number[], totalDuration?: number): number[][];
	/**
	 * Calculates the Euclidean rhythm (distributing k pulses as evenly as possible over n steps).
	 * Popular in African, Latin, and electronic music (e.g., E(3,8) is the Tresillo).
	 */
	static euclidean(pulses: number, steps: number): boolean[];
}
/**
 * A single timed event in a MusicStream: onset, duration, notes, and velocity.
 * @category Rhythm
 */
export interface StreamEvent {
	/** Onset, in beats of the stream's time signature (its denominator's note value) from the start. */
	time: number;
	/** Length in beats. */
	duration: number;
	/** Notes sounding together; empty for a rest. */
	notes: Note[];
	/** Loudness, normally 0 to 1 (default 0.8). */
	velocity: number;
}
/**
 * MusicStream
 * A standard data structure for representing temporal musical events.
 * Acts as a contract that can be consumed by audio engines (Tone.js, Web Audio)
 * or MIDI writers.
 * @category Rhythm
 */
export declare class MusicStream {
	/** Events in time order. */
	events: StreamEvent[];
	private currentBeat;
	/** Meter of the stream; its denominator sets what a beat is. */
	timeSignature: TimeSignature;
	/** Tempo in beats per minute. */
	bpm: number;
	constructor(timeSignature?: TimeSignature, bpm?: number);
	/**
	 * Adds an event to the stream and advances the internal time cursor.
	 */
	addEvent(notes: Note[], duration: Duration, velocity?: number): void;
	/**
	 * Adds an event at a specific time without advancing the main cursor.
	 */
	addEventAt(time: number, notes: Note[], duration: Duration, velocity?: number): void;
	/**
	 * Generates a generic JSON representation of the stream.
	 * This is the standard contract for external engines.
	 */
	toJSON(): {
		/** Meter and tempo. */
		metadata: {
			/** Written time signature: `'4/4'`, `'3+2+2/8'`. */
			timeSignature: string;
			/** Tempo in beats per minute. */
			bpm: number;
		};
		/** The events, as in `events`. */
		events: {
			/** Onset in beats. */
			time: number;
			/** Length in beats. */
			duration: number;
			/** Notes sounding together. */
			notes: {
				/** Frequency in Hz. */
				frequency: number;
				/** Steps from A4 in the note's tuning. */
				stepsFromBase: number;
				/** Note name with octave, when the tuning has names. */
				name: string;
			}[];
			/** Loudness, normally 0 to 1. */
			velocity: number;
		}[];
	};
}
/**
 * Augmentation, diminution, and retrograde of duration arrays.
 * @category Rhythm
 */
export declare class RhythmTransform {
	/** Augmentation: multiply each duration by factor (default ×2). */
	static augmentation(durations: number[], factor?: number): number[];
	/** Diminution: divide each duration by factor (default ÷2). */
	static diminution(durations: number[], factor?: number): number[];
	/** Retrograde: reverse the duration array. */
	static retrograde(durations: number[]): number[];
	/**
	 * Reverses the array and reflects each duration around the mean (2·mean − d, floored at 0).
	 * @deprecated Not an established rhythmic operation: durations have no inversion as
	 *   pitches do. Kept for compatibility; use `retrograde` for the standard transformation.
	 */
	static retrogradeInversion(durations: number[]): number[];
}
/**
 * Detection of rhythmic features: hemiola, syncopation, clave patterns, etc.
 * @category Rhythm
 */
export declare class RhythmAnalysis {
	/**
	 * Detects hemiola: accents grouping six beats as 2+2+2 where the meter groups them 3+3
	 * (two bars of a triple meter such as 3/4, or one bar of 6/8 or 6/4).
	 * @param pattern - Accent positions in beats from the start (0-indexed), over one span of
	 *   six beats (two bars of 3, one bar of 6); later spans repeat modulo 6.
	 * @param timeSignature - A meter of 3 or 6 beats; others return false.
	 * @returns True when accents fall on beats 0, 2 and 4 of the span and not on beat 3.
	 */
	static detectHemiola(pattern: number[], timeSignature: TimeSignature): boolean;
	/**
	 * Strong beats of a meter, 0-indexed: the start of each group in an additive meter
	 * (3+2+2 → 0, 3, 5); every third beat in a compound meter (6/8 → 0, 3; 9/8; 12/8);
	 * every other beat in a duple or quadruple one (2/4, 4/4 → 0, 2); only the downbeat in
	 * a triple one (3/4) or an irregular one.
	 */
	static strongBeats(timeSignature: TimeSignature): number[];
	/**
	 * Returns a syncopation index (0–1): proportion of accented notes that fall on weak beats.
	 * @param pattern - Array of onset positions (beat positions, 0-indexed).
	 * @param timeSignature - The meter context.
	 */
	static detectSyncopation(pattern: number[], timeSignature: TimeSignature): number;
	/**
	 * Detects if the pattern matches the Tresillo (3+3+2 over 8 steps).
	 */
	static detectTresillo(pattern: number[]): boolean;
	/**
	 * Detects if the pattern matches the Cinquillo (2+1+2+1+2 - 8 steps, 5 pulses: X.XX.XX.).
	 */
	static detectCinquillo(pattern: number[]): boolean;
	/**
	 * Identifies which clave pattern (if any) matches the input, from `CLAVE_PATTERNS`.
	 * @param pattern - Onset array of 16 steps (two bars of 4/4 in eighth notes, or one in sixteenths).
	 */
	static detectClave(pattern: number[]): "son-3-2" | "son-2-3" | "rumba-3-2" | "rumba-2-3" | "bossa" | "none";
}
/**
 * Polymeter: multiple time signatures cycling simultaneously.
 * @category Rhythm
 */
export declare class Polymeter {
	private readonly meters;
	private readonly _cycleBeats;
	/**
	 * @param meters - Two or more time signatures cycling simultaneously.
	 * @param cycleBeats - Optional fixed cycle length in beats. If omitted, the cycle
	 *   ends at the LCM of all meter lengths (`naturalCycle`). Providing a shorter value
	 *   truncates the cycle before the meters naturally realign.
	 */
	constructor(meters: TimeSignature[], cycleBeats?: number);
	/** Beat at which all meters realign naturally (LCM of all meter lengths). */
	get naturalCycle(): number;
	/** Effective cycle length: cycleBeats if set, otherwise naturalCycle. */
	get cycleLength(): number;
	/** Returns the meter and position within that meter at a given absolute beat, wrapped at cycleLength. */
	getCyclePosition(beat: number): {
		/** One of the meters. */
		meter: TimeSignature;
		/** Beat within that meter's measure, from 0. */
		positionInMeter: number;
	}[];
	/** Returns all downbeats for each meter within one full cycle, sorted by beat. */
	generateGrid(): {
		/** Beat of the downbeat within the cycle, from 0. */
		beat: number;
		/** Index of the meter in the constructor's list. */
		meterIndex: number;
	}[];
}
/**
 * Metric Modulation - computing tempo relationships between related meters.
 * @category Rhythm
 */
export declare class MetricModulation {
	/**
	 * Computes the new tempo after a metric modulation.
	 * The pivot note value `fromDuration` at `fromTempo` BPM equals `toDuration` in the new tempo.
	 *
	 * @param fromTempo - Original tempo in BPM.
	 * @param fromDuration - Duration value in old tempo (e.g., 0.25 = quarter note).
	 * @param toDuration  - Duration value in new tempo that equals fromDuration.
	 * @returns New tempo in BPM.
	 */
	static calculate(fromTempo: number, fromDuration: number, toDuration: number): number;
	/**
	 * Computes the new tempo for a metric modulation where a note value of the old meter
	 * becomes the beat of the new one: in 4/4 at 120, a dotted quarter (0.375) as the new
	 * beat gives 80.
	 * @param fromMeter - Meter before the modulation (its denominator is the old beat).
	 * @param toMeter - Meter after the modulation; its beat is the pivot note value.
	 * @param pivotDuration - The pivot as a fraction of a whole note, measured in the old meter.
	 * @param fromTempo - Old tempo in beats per minute (default 120).
	 */
	static equivalence(fromMeter: TimeSignature, toMeter: TimeSignature, pivotDuration: number, fromTempo?: number): {
		/** Tempo after the modulation, in beats of `toMeter` per minute. */
		newTempo: number;
	};
}
/**
 * Isorhythm: the medieval technique of repeating talea (rhythm) and color (pitch) independently.
 * @category Rhythm
 */
export declare class Isorhythm {
	private readonly talea;
	private readonly color;
	constructor(talea: number[], color: number[]);
	/**
	 * Generates an isorhythmic sequence up to `totalBeats` beats.
	 * Returns an array of `{ note, duration }` pairs where note is from the color
	 * and duration from the talea, cycling independently.
	 */
	generate(totalBeats: number): {
		/** Value from the color (pitch pattern). */
		note: number;
		/** Value from the talea (rhythm pattern), in beats. */
		duration: number;
	}[];
}
/**
 * Options for writing a stream in ABC.
 * @category Notation
 */
export interface ABCStreamOptions {
	/** Key of the tune (default `'C major'`): accidentals are written against its signature. Use the same key in `wrapInHeaders`. */
	key?: string;
}
/**
 * Bridge between Universal Music Theory and ABC Notation.
 * Converts UMT objects to ABC strings for visual rendering. Lengths assume `L:1/4`, as
 * `wrapInHeaders` writes. Notes of other tunings are written at the nearest 12-TET pitch.
 * @category Notation
 */
export declare class ABCBridge {
	/**
	 * Converts a single Note to ABC notation, with its accidental if it has one and no key or
	 * measure context (see `streamToABC` for naturals against a signature).
	 * C4 (middle C) → `C`, C5 → `c`, C3 → `C,`, Bb4 → `_B`.
	 */
	static noteToABC(note: Note): string;
	/**
	 * Converts a chord (or array of notes) to an ABC chord string, with accidentals written
	 * against the signature of `key`.
	 */
	static chordToABC(chord: Chord | Note[], key?: string): string;
	/**
	 * Converts a scale to an ABC sequence of quarter notes (one measure, no barlines), with
	 * accidentals written against the signature of `key`.
	 */
	static scaleToABC(scale: Scale, octaves?: number, key?: string): string;
	/**
	 * Converts a progression (array of note arrays) to ABC, one chord per measure.
	 */
	static progressionToABC(progression: Note[][], key?: string): string;
	/**
	 * Converts a MusicStream to ABC notation (body only; see `wrapInHeaders`).
	 * Barlines follow the stream's time signature; notes that cross one are tied, and lengths
	 * with no single written value are split into tied values. Lengths count in quarter notes
	 * (`L:1/4`) whatever the meter: in 6/8 an eighth is `/2`. Triplet notes are written `(3:2:1`.
	 */
	static streamToABC(stream: MusicStream, options?: ABCStreamOptions): string;
	/**
	 * Wraps ABC content in standard headers for rendering.
	 * @param keySymbol - UMT key symbol (e.g. 'C major', 'G major', 'D minor').
	 *   Automatically converted to ABC K: field (e.g. 'C', 'G', 'Dm').
	 */
	static wrapInHeaders(content: string, title?: string, meter?: string, keySymbol?: string): string;
	/**
	 * Converts a MusicStream to ABC notation with optional chord symbols above the staff.
	 * @param chordNames - Optional chord names aligned to `stream.events`; each is written
	 *   above the first note of its event.
	 */
	static streamToABCWithChords(stream: MusicStream, chordNames?: string[], options?: ABCStreamOptions): string;
	/**
	 * Generates an ABC tuplet string.
	 * @param notes - Notes within the tuplet.
	 * @param p - How many notes in the tuplet (e.g. 3 for triplet).
	 * @param q - Normal note value they fit into (e.g. 2 for triplet).
	 * @param duration - Written length of each note in quarter notes (0.5 = an eighth).
	 */
	static tuplet(notes: Note[], p: number, q: number, duration: number): string;
}
/**
 * Neo-Riemannian Theory Module
 * Applies geometric transformations (PLR) to triads.
 * P: Parallel (C Major <-> C Minor)
 * L: Leading-tone exchange (C Major <-> E Minor)
 * R: Relative (C Major <-> A Minor)
 * @category Tonal harmony
 */
export declare class NeoRiemannian {
	/**
	 * Identifies a major or minor triad and returns its root step: exactly a root, a third and a
	 * perfect fifth, in any inversion or doubling. Anything else is `null` (G7, Cmaj7, Cadd9,
	 * Cdim, Csus4), so P, L and R return `null` for it too.
	 */
	static getTriadType(chord: Chord): {
		/** Root of the triad, in steps from A4. */
		rootStep: number;
		/** Major (true) or minor (false). */
		isMajor: boolean;
	} | null;
	/**
	 * Parallel Transformation (P)
	 * Moves the third of the chord by a half-step.
	 * C Major -> C Minor
	 */
	static P(chord: Chord): Chord | null;
	/**
	 * Leading-tone Exchange (L)
	 * Major: Root moves down a half-step (C Major -> E Minor)
	 * Minor: Fifth moves up a half-step (A Minor -> F Major)
	 */
	static L(chord: Chord): Chord | null;
	/**
	 * Relative Transformation (R)
	 * Major: Fifth moves up a whole-step (C Major -> A Minor)
	 * Minor: Root moves down a whole-step (A Minor -> C Major)
	 */
	static R(chord: Chord): Chord | null;
}
/**
 * A pair of key profiles: weights of the 12 pitch classes above the tonic, major and minor.
 * @category Tonal harmony
 */
export interface KeyProfile {
	/** 12 weights for a major key, from the tonic up by semitones. */
	major: readonly number[];
	/** 12 weights for a minor key, from the tonic up by semitones. */
	minor: readonly number[];
	/** Where the weights come from. */
	source: string;
}
/**
 * Key profiles for correlation key finding, as listed by Craig Sapp for Humdrum's `keycor`
 * (extras.humdrum.org/man/keycor). Index 0 is the tonic.
 * @category Tonal harmony
 */
export declare const KEY_PROFILES: Readonly<Record<"krumhansl" | "aarden" | "bellman" | "temperley" | "simple", KeyProfile>>;
/**
 * Name of a preset in `KEY_PROFILES`.
 * @category Tonal harmony
 */
export type KeyProfileName = keyof typeof KEY_PROFILES;
/**
 * Options for key detection.
 * @category Tonal harmony
 */
export interface KeyDetectionOptions {
	/** Key profile to correlate with (default `'krumhansl'`), or a custom pair. */
	profile?: KeyProfileName | KeyProfile;
}
/**
 * Key Detection Module
 * Implements correlation key finding (Krumhansl-Schmuckler) with a choice of key profiles.
 * @category Tonal harmony
 */
export declare class KeyDetection {
	/** Krumhansl-Kessler major weights, the default profile (`KEY_PROFILES.krumhansl.major`). */
	static readonly majorProfile: number[];
	/** Krumhansl-Kessler minor weights, the default profile (`KEY_PROFILES.krumhansl.minor`). */
	static readonly minorProfile: number[];
	/**
	 * Detects the most likely key based on an array of notes.
	 * Each note counts once, or by its duration when `durations` is given (as in the original
	 * Krumhansl-Schmuckler algorithm). Notes outside 12-TET count for the nearest 12-TET pitch class.
	 * @param notes - The notes to analyse.
	 * @param durations - Optional duration of each note, in any unit (only proportions matter).
	 * @param options - `profile`: which key profile to correlate with (default Krumhansl-Kessler).
	 * @returns Array of possible keys sorted by confidence (Pearson correlation coefficient).
	 * @throws RangeError if `durations` does not match `notes` in length, or holds a negative or non-finite value.
	 */
	static detect(notes: Note[], durations?: readonly number[], options?: KeyDetectionOptions): {
		/** Key name with a capitalized mode: `'C Major'`, `'Eb Minor'`. */
		key: string;
		/** Pearson correlation with the profile, -1 to 1. */
		confidence: number;
	}[];
	/**
	 * Detects the most likely key from a pitch class histogram (index 0 = C, 1 = C#/Db, … 11 = B),
	 * e.g. total durations per pitch class accumulated over a piece.
	 * @param weights - 12 non-negative weights.
	 * @param options - `profile`: which key profile to correlate with (default Krumhansl-Kessler).
	 * @returns Array of possible keys sorted by confidence; empty when all weights are 0.
	 * @throws RangeError if there are not 12 weights, or one is negative or non-finite.
	 */
	static detectFromHistogram(weights: readonly number[], options?: KeyDetectionOptions): {
		/** Key name with a capitalized mode: `'C Major'`, `'Eb Minor'`. */
		key: string;
		/** Pearson correlation with the profile, -1 to 1. */
		confidence: number;
	}[];
	/** 12-TET pitch class (0 = C); other tunings round the note's frequency to the nearest semitone. */
	private static pitchClass;
	private static shiftProfile;
	private static pearsonCorrelation;
}
/**
 * A possible chord substitution with its type and harmonic explanation.
 * @category Tonal harmony
 */
export interface SubstitutionOption {
	/** The substitute chord. */
	chord: Chord;
	/** Kind of substitution; `substitutionTypeName` gives it in words, in English or Spanish. */
	type: "tritone" | "diatonic" | "deceptive" | "chromatic-mediant" | "sus4" | "modal";
	/** Why it works, in English: `'Tritone sub: Db7 shares the tritone with G7'`. */
	explanation: string;
}
/**
 * Returns harmonic substitution options for `chord` in the given key.
 *
 * Covers: tritone substitution (for V7), sus4 suspension, deceptive resolution,
 * diatonic substitutions in major and natural minor (a third away, same function:
 * I → iii, vi; ii ↔ IV; V ↔ vii°; i → III, VI), and in major keys the minor
 * subdominant family (IV, ii → iv, bVII7, iiø7, and back to IV).
 * @category Tonal harmony
 */
export declare function getSubstitutions(chord: Chord, keySymbol: string): SubstitutionOption[];
/**
 * A named chord progression of `PROGRESSIONS`.
 * @category Tonal harmony
 */
export interface ProgressionEntry {
	/** Its id in `PROGRESSIONS`: `'ii-V-I'`, `'blues-12'`. */
	name: string;
	/** Roman numerals, read with `parseRomanProgression` in the key given to `getProgression`. */
	romanNumerals: string[];
	/** What it is and where it is used. */
	description: string;
	/** `'jazz'`, `'pop'`, `'blues'`, `'classical'`, `'flamenco'`, `'folk'`. */
	style: string;
	/** Key it is usually played in, when there is one (`'Bb major'` for the jazz blues). */
	defaultKey?: string;
}
/**
 * Named progressions by id: ii-V-I, twelve-bar blues, rhythm changes, Coltrane changes, Andalusian cadence… Build one with `getProgression(id, key)`.
 * @category Tonal harmony
 */
export declare const PROGRESSIONS: Record<string, ProgressionEntry>;
/**
 * Returns a realized Chord[] for the named progression in the given key.
 * A bar with two chords ("ii7 V7") gives both, in order.
 * @category Tonal harmony
 */
export declare function getProgression(id: string, keySymbol: string, tuning?: TuningSystem): Chord[];
/**
 * Recognized musical form types. `'unknown'` is returned when no pattern matches confidently.
 * Forms that need more than the chords (sonata, theme and variations) are not detected.
 * @category Tonal harmony
 */
export type FormType = "AABA" | "AAB" | "ABAB" | "ABAC" | "binary" | "ternary" | "rondo" | "blues-12" | "strophic" | "through-composed" | "unknown";
/**
 * A labeled section within a formal analysis (e.g. A, B, A').
 * @category Tonal harmony
 */
export interface FormSection {
	/** Section letter: `'A'`, `'B'`, `'C'`. */
	label: string;
	/** Index of its first chord. */
	start: number;
	/** Index of its last chord (inclusive). */
	end: number;
}
/**
 * Result of a harmonic form analysis: detected type, labeled sections, and confidence (0–1).
 * @category Tonal harmony
 */
export interface FormAnalysis {
	/** The form detected, or `'unknown'`. */
	type: FormType;
	/** The sections, in order. */
	sections: FormSection[];
	/** 0 to 1. */
	confidence: number;
}
/**
 * Formal analysis of a chord progression: form type and sections, and reprises.
 * @category Tonal harmony
 */
export declare class FormAnalyzer {
	/**
	 * Analyzes harmonic form by segmenting `chords` into sections of `barsPerSection`
	 * chords (default: auto-detect). Returns form type, labeled sections, and confidence.
	 * One chord per bar in choruses of 12 that follow the twelve-bar blues in `keySymbol`
	 * give `'blues-12'`, one section per chorus.
	 */
	static analyzeHarmonic(chords: Chord[], keySymbol: string, barsPerSection?: number): FormAnalysis;
	/**
	 * Finds passages of at least `minLength` chords that come back later, longest first.
	 * Each result is the first occurrence (`start`, `length`) of a passage that recurs
	 * without overlapping itself; a passage inside a longer reprise already found, or
	 * overlapping one, is not reported again.
	 */
	static detectReprise(chords: Chord[], minLength?: number): {
		/** Index of the first chord of the passage's first occurrence. */
		start: number;
		/** Number of chords in the passage. */
		length: number;
	}[];
}
/**
 * An upper-structure triad voiced over a dominant chord, with its resulting tensions and label.
 * @category Tonal harmony
 */
export interface UpperStructure {
	/** The major triad played above the dominant. */
	triad: Chord;
	/** What the triad adds over the dominant: `['9', '#11', '13']`. */
	tensions: string[];
	/** The dominant seventh chord underneath. */
	overChord: Chord;
	/** Roman numeral of the triad's root over the dominant's root: `'II'`, `'bVI'`. */
	label: string;
}
/**
 * Returns the six canonical upper-structure triads for a dominant 7th chord.
 * Returns [] for non-12-TET tunings or non-dominant chords (a dominant has a major third
 * and a minor seventh: G7, G9, G13, G7alt).
 * @category Tonal harmony
 */
export declare function getUpperStructures(dominantChord: Chord): UpperStructure[];
/**
 * Twelve-tone / serial composition tools.
 * All operations work in pitch-class space (0–11, C=0 convention is NOT required;
 * the row is treated as an ordered sequence of pitch classes modulo 12).
 *
 * Forms are labeled by the pitch class they start on (P(n), I(n) and RI(n) begin on n),
 * so the row as given is P(row[0]): P(0) only when the row starts on 0.
 * @category Post-tonal
 */
export declare class ToneRow {
	private readonly row;
	/**
	 * @param row - Ordered sequence of 12 unique pitch classes (0–11).
	 * @throws if the row does not contain exactly 12 unique pitch classes.
	 */
	constructor(row: number[]);
	/**
	 * Returns the 12×12 tone row matrix: the first row is the row as given, the first
	 * column the inversion starting on the same pitch class. Each row is the P form that
	 * starts on its first pitch class (read right to left: R); each column, top to bottom,
	 * an I form (bottom to top: RI).
	 */
	getMatrix(): number[][];
	/**
	 * Prime form transposed so that it starts on pitch class `n`.
	 * The row as given is P(row[0]).
	 */
	P(n: number): number[];
	/**
	 * Inversion (I) transposed so that it starts on pitch class `n`.
	 * The inversion mirrors all intervals of the row.
	 */
	I(n: number): number[];
	/**
	 * Retrograde of P(n): by default the row as given, reversed.
	 */
	R(n?: number): number[];
	/**
	 * Retrograde Inversion transposed so that it starts on pitch class `n`.
	 */
	RI(n: number): number[];
	/**
	 * Returns true if the row is an all-interval series:
	 * every interval class from 1 to 11 appears exactly once between consecutive pitches.
	 */
	isAllInterval(): boolean;
	/**
	 * Tests whether the row is hexachordally combinatorial with itself: some form's first
	 * hexachord holds the same pitch classes as the row's second hexachord, so the two
	 * together make an aggregate. Returns the first operation found ('P', 'I', 'RI') or null.
	 * - `'P'`: a transposition other than the row itself.
	 * - `'I'`: an inversion.
	 * - `'RI'`: a retrograde inversion.
	 */
	isCombinatorial(): "P" | "I" | "RI" | null;
	/**
	 * Returns the two hexachords of the row: first 6 and last 6 pitch classes.
	 */
	getHexachords(): [
		number[],
		number[]
	];
}
/**
 * A rule violation found during species counterpoint analysis.
 * @category Post-tonal
 */
export interface CounterpointIssue {
	/** `'Parallel 5th'`, `'Dissonance on Strong Beat'`, `'Melodic Tritone'`, `'Modal Finalis'`, `'Modal Ambitus'`… */
	type: string;
	/** Position where it happens, from 1 (a note of the cantus, or a slot in the species grid). */
	beat?: number;
	/** Readable description. */
	description: string;
}
/**
 * Checks counterpoint rules for a given species.
 * `cf` = cantus firmus notes; `counter` = counterpoint notes.
 * Notes should be in the same tuning system. Intervals are read in 12-TET semitones (notes
 * of other tunings at their nearest semitone).
 * @category Post-tonal
 */
export declare class Counterpoint {
	/**
	 * Validates a counterpoint voice against a cantus firmus.
	 *
	 * The counterpoint is given on a grid of slots per cantus firmus note: 1 (1st species),
	 * 2 (2nd), 4 (3rd), 2 (4th: slot 1 is the tied-over note, slot 2 the new one) and 4
	 * (5th: a longer note repeats its pitch in the following slots; a tie is a repeated
	 * pitch across the bar line).
	 *
	 * - Strong slots (the first of each measure) must be consonant, except a suspension in
	 *   the 4th and 5th species: prepared (same pitch in the slot before, consonant there)
	 *   and resolved down by step to a consonance.
	 * - Weak slots: a dissonance must be a passing or neighbour note (approached and left by
	 *   step); in the 4th species weak slots are consonant.
	 * - Parallel 5ths and octaves between consecutive strong slots; hidden 5ths and octaves
	 *   in the 1st species; unison only at the start and end.
	 *
	 * @param species - 1 | 2 | 3 | 4 | 5
	 * @param cf - Cantus firmus notes (one per measure).
	 * @param counter - Counterpoint notes on the slot grid above.
	 * @param mode - Optional mode, on its white-key finalis (`"dorian"` = D) or transposed
	 *   (`"G dorian"`): `dorian`, `phrygian`, `lydian`, `mixolydian`, `aeolian`, `ionian`, `locrian`.
	 *   Enables modal checks: finalis (CF must start and end on it), ambitus (counterpoint
	 *   within [-7, +15] semitones of the finalis), and melodic tritone detection.
	 */
	static checkSpecies(species: 1 | 2 | 3 | 4 | 5, cf: Note[], counter: Note[], mode?: string): CounterpointIssue[];
}
/**
 * Canon and imitation detection / generation tools.
 * @category Post-tonal
 */
export declare class Canon {
	/**
	 * Detects imitative entries between voices.
	 * Returns matches: which voice, at what beat offset, what transposition, whether inverted.
	 */
	static detectImitation(voices: Note[][]): {
		/** Index of the imitating voice (the first voice is the model). */
		voice: number;
		/** Note index in that voice where the imitation starts. */
		offset: number;
		/** Steps from the model's first note to the imitation's first note. */
		transposition: number;
		/** The imitation moves by inverted intervals. */
		inversion: boolean;
	}[];
	/**
	 * Generates a two-voice canon from a theme.
	 * @param theme - The theme notes.
	 * @param interval - Transposition interval in steps for the follower voice.
	 * @param delay - Entry delay in number of notes.
	 * @param inversion - If true, the follower uses the melodic inversion.
	 * @returns `[leader, follower]`, both `theme.length + delay` long: the follower opens with
	 *   `delay` rests (`null`) and the leader ends with as many, so index i sounds together.
	 */
	static generateCanon(theme: Note[], interval: number, delay: number, inversion?: boolean): (Note | null)[][];
}
/**
 * A recurring interval pattern detected within a melody.
 * @category Post-tonal
 */
export interface Motif {
	/** Index of the first note of the first occurrence. */
	start: number;
	/** Length in notes. */
	length: number;
	/** Intervals between consecutive notes, in steps. */
	intervals: number[];
	/** Occurrences that do not overlap one another. */
	occurrences: number;
}
/**
 * Melodic analysis tools.
 * @category Post-tonal
 */
export declare class MelodyAnalysis {
	/**
	 * Returns the contour of a melody as a sequence of direction symbols.
	 * `'+'` = ascending, `'-'` = descending, `'='` = repeated pitch.
	 */
	static getContour(notes: Note[]): ("+" | "-" | "=")[];
	/**
	 * Returns a histogram of interval classes between consecutive notes.
	 * Keys are interval sizes in steps (signed); values are occurrence counts.
	 */
	static getIntervalHistogram(notes: Note[]): Map<number, number>;
	/**
	 * Finds recurring interval patterns (motifs) in a melody, up to 9 notes long.
	 * Occurrences are counted without overlap (in C D C D C, C-D-C occurs once). A pattern
	 * that only recurs inside a longer motif, as often as it, is left out.
	 * Sorted by number of occurrences, then by length (longest first).
	 * @param notes - Melody notes.
	 * @param minLength - Minimum motif length in notes (default 3).
	 */
	static findMotifs(notes: Note[], minLength?: number): Motif[];
	/**
	 * Reduces a melody using durational weight - keeps structurally important notes.
	 * Uses a simple approach: notes with longer durations are more likely to be kept.
	 * @param notes - Melody notes.
	 * @param durations - Duration of each note (arbitrary units). Must match notes length.
	 * @returns Reduced note array (roughly half the original length).
	 */
	static reduce(notes: Note[], durations: number[]): Note[];
	/**
	 * Returns the contour reduction of a melody: only local peaks and troughs.
	 * The first and last notes are always included.
	 */
	static getContourReduction(notes: Note[]): Note[];
}
/**
 * The detected Urlinie (fundamental melodic line) and its type (3-, 5-, or 8-line).
 * @category Post-tonal
 */
export interface UrlinieResult {
	/** The notes of the line, from the head tone down to the tonic. */
	line: Note[];
	/** Which degree the line descends from: ^3, ^5 or ^8. */
	type: "3-line" | "5-line" | "8-line";
}
/**
 * Basic Schenkerian reduction (approximate): Urlinie, Ursatz and structural levels of a progression.
 * @category Post-tonal
 */
export declare class Schenker {
	/**
	 * Attempts to identify an Urlinie (fundamental melodic line) in a melody.
	 *
	 * Looks for a descending stepwise line ending on the tonic that covers
	 * a 3rd (^3-^2-^1), 5th (^5-^4-^3-^2-^1), or octave (^8-^7-...-^1).
	 *
	 * Returns null if no clear Urlinie is detected.
	 *
	 * @param melody - Melody notes (12-TET).
	 * @param keySymbol - Key, e.g. `'C major'`.
	 */
	static findUrlinie(melody: Note[], keySymbol: string): UrlinieResult | null;
	/**
	 * Identifies an Ursatz (basic structure) from a progression and melody.
	 * Returns the bass arpeggiation (I-V-I) and Urlinie notes, or null.
	 */
	static getUrsatz(progression: Chord[], melody: Note[], keySymbol: string): {
		/** Roots of the bass arpeggiation I-V-I found in the progression (two or three notes). */
		bass: Note[];
		/** The Urlinie (see `findUrlinie`). */
		melody: Note[];
	} | null;
	/**
	 * Reduces a chord progression to a simplified structural level.
	 *
	 * - `'background'`: only tonic and dominant (the first chord is taken as the tonic).
	 * - `'middleground'`: merges consecutive chords on the same root (C C7 → C).
	 * - `'foreground'`: merges consecutive identical chords (same pitch classes).
	 */
	static prolongationLevel(chords: Chord[], level: "foreground" | "middleground" | "background"): Chord[];
}
/**
 * Clave patterns and other common rhythmic patterns as boolean arrays.
 * Each array has 16 steps (one measure of 4/4 in 16th notes) unless noted.
 * true = onset, false = rest.
 */
/**
 * A named rhythmic clave or timeline pattern as a boolean onset array.
 * @category Rhythm
 */
export interface ClavePattern {
	/** Display name: `'Son Clave 3-2'`. */
	name: string;
	/** One entry per step (sixteenths in a 4/4 bar for most patterns); true is an onset. */
	steps: readonly boolean[];
	/** Short description of the pattern. */
	description: string;
}
/**
 * Collection of 10 clave and timeline patterns from Cuban, Brazilian, and West African music.
 * @category Rhythm
 */
export declare const CLAVE_PATTERNS: Record<string, ClavePattern>;
/**
 * Accidental of a figured-bass figure: sharp, flat or natural.
 * @category Tonal harmony
 */
export type FigureAccidental = "#" | "b" | "n";
/**
 * Figured bass: parsing figures, realizing them over a bass note, and four-voice (SATB) realization.
 * @category Tonal harmony
 */
export declare class FiguredBass {
	/**
	 * Reads a figure string into {num, acc} parts as written (`'6/4'`, `'#6'`, `'b7'`). A bare
	 * accidental (`'#'`, `'b'`, `'n'`) is the third with that accidental. Empty → no parts.
	 */
	private static parseFigureParts;
	/** Written parts plus the figures the abbreviation leaves implicit (`'6'` → 6 and 3). */
	private static completeFigures;
	/**
	 * Returns the 7 diatonic pitch classes (C=0) for a key symbol, or null if unparseable.
	 * C=0, D=2, E=4, F=5, G=7, A=9, B=11.
	 */
	private static getDiatonicPCs;
	/**
	 * Returns the semitone offset for a diatonic figure numeral above a bass PC.
	 * Counts `num` diatonic steps upward within the scale and returns the chromatic distance.
	 * Handles numerals > 7 (compound intervals) via octave displacement.
	 */
	private static diatonicOffset;
	/**
	 * Parses a figured bass symbol into interval offsets and accidentals, as written
	 * (no key, no implied figures: `'6'` → [9]). A plain triad (`''`, `'5'`, `'3'`, `'5/3'`)
	 * gives [4, 7].
	 *
	 * Supported formats: `'6'`, `'6/4'`, `'7'`, `'6/5'`, `'4/3'`, `'4/2'`,
	 * `'9'`, `'#6'`, `'b7'`, `'6/4/2'`, `'#'` (raised third), empty string (= root position triad).
	 *
	 * @returns Object with `intervals` (semitone offsets above bass) and
	 *   `accidentals` (Map from interval index to accidental).
	 */
	static parse(symbol: string): {
		/** Semitones above the bass, one per figure. */
		intervals: number[];
		/** Accidental of each figure that has one, keyed by its index in `intervals`. */
		accidentals: Map<number, FigureAccidental>;
	};
	/**
	 * Realizes a figured bass symbol above a bass note, returning a Chord.
	 *
	 * Abbreviations are completed as in continuo practice: `6` is 6/3, `7` is 7/5/3, `6/5` is
	 * 6/5/3, `4/3` is 6/4/3, `2` and `4/2` are 6/4/2. A bare accidental alters the third.
	 *
	 * When `keySymbol` is provided, numerals without explicit accidentals are resolved
	 * diatonically: the interval is adjusted to the nearest scale degree in the key.
	 * If the bass note is not in the key, falls back to `FIGURE_DEFAULT_SEMITONES`.
	 * Explicit accidentals (e.g. `'#6'`, `'b7'`) always override diatonic resolution.
	 *
	 * @param bassNote - The bass note.
	 * @param figures - The figured bass symbol (e.g., `'6'`, `'6/4'`, `'7'`, `''`).
	 * @param keySymbol - Key context for diatonic resolution (e.g. `'G major'`, `'D minor'`).
	 *   If the key cannot be parsed or the bass note is chromatic, falls back to equal-tempered defaults.
	 * @param _voices - Reserved. For full SATB voicing use {@link FiguredBass.voices}.
	 */
	static realize(bassNote: Note, figures: string, keySymbol?: string, _voices?: number): Chord;
	/**
	 * Realizes a figured bass symbol as a 4-voice SATB voicing.
	 *
	 * Returns `[soprano, alto, tenor, bass]` as an array of 4 `Note` objects.
	 * The bass voice is the given `bassNote`. The upper voices (T, A, S) are placed
	 * within classical vocal ranges using standard doubling and spacing rules:
	 * - Soprano: C4–G5, Alto: G3–C5, Tenor: C3–G4
	 * - S-A and A-T: max one octave apart; T-B: max a 12th (19 semitones)
	 * - No voice crossing
	 * - Triads: root doubled; 7th chords: all 4 pitch classes represented
	 *
	 * @param bassNote - The bass note (basso continuo).
	 * @param figures - The figured bass symbol (e.g. `''`, `'6'`, `'6/4'`, `'7'`).
	 * @param keySymbol - Key context for diatonic resolution (default `'C major'`).
	 * @returns `[soprano, alto, tenor, bass]`
	 */
	static voices(bassNote: Note, figures: string, keySymbol?: string): Note[];
	/**
	 * Derives the figured bass symbol from a chord and its bass note.
	 * Returns the standard abbreviation by the chord member in the bass: triads `''`, `'6'`,
	 * `'6/4'`; seventh chords `'7'`, `'6/5'`, `'4/3'`, `'4/2'`. A bass that is no root, third,
	 * fifth or seventh returns its offset in steps above the root.
	 */
	static fromChord(chord: Chord, bassNote: Note): string;
}
/**
 * Names a 12-TET step (A4 = 0) as it is written in `keySymbol` ("E major", "C minor",
 * "D dorian"). The key's notes take the scale's letters (G# in E major, E# in F# major,
 * F## in G# minor). The rest follow the harmonic chromatic scale (in C major: Db, Eb,
 * F#, Ab, Bb; in A minor: Bb, C#, D#, F#, G#), unless that needs a double accidental and
 * the neighbouring letter needs fewer (A natural in Db major, not Bbb). An unknown key
 * falls back to flats.
 * @returns Name with octave; the octave follows the letter (B#3 is the pitch of C4).
 * @category Tonal harmony
 */
export declare function spellPitchInKey(stepsFromA4: number, keySymbol: string): string;
/**
 * Names the chord's notes by their interval above the root, from the root as written in
 * `rootName` (default: the chord's own name). Cm7b5 is C Eb Gb Bb, C7#11 has F#, Bdim7
 * has Ab. Same order and octaves as `chord.getNotes()` (slash bass first). Other
 * tunings: the names `getNotes()` gives.
 * @category Tonal harmony
 */
export declare function spellChord(chord: Chord, rootName?: string): string[];
/**
 * Renames a chord as it is written in `keySymbol`. A root that is a note of the key takes
 * the key's letter (Ab7 in A major is G#7) unless the other letter saves 3 or more
 * accidentals (a G major chord in G# minor is G, not F## A## C###); a chord made only of
 * key notes always keeps it (F##dim7 in G# minor). A chromatic root takes whichever of its two
 * letters leaves fewer accidentals across the chord tones, the root's counted twice (C in
 * F# major, not B# with D## F##); on a tie, the key's spelling (`spellPitchInKey`). A slash bass is named by
 * its interval in the chord, or by the key when it is not a chord tone.
 * Returns the chord unchanged when the key is unknown or the tuning is not 12-TET.
 * @category Tonal harmony
 */
export declare function spellChordInKey(chord: Chord, keySymbol: string): Chord;
/**
 * Basic Raga catalog - Western 12-TET approximations only.
 *
 * NOTE: Real ragas involve ornaments (gamaka), graces (meend), characteristic phrases
 * (pakad), and performance-time rules not representable in this simplified model.
 * This module provides structural information only - aroha/avaroha in semitones
 * and theoretical metadata. Use as a reference, not as a complete performance guide.
 *
 * Aroha, avaroha, vadi, samvadi, thaat and time follow the English Wikipedia raga infoboxes
 * (Bhatkhande-system sources, 2026-10), with zigzag phrases reduced to straight lines.
 * @category World music
 */
export interface Raga {
	/** Display name: `'Yaman'`. */
	name: string;
	/** Ascending pattern - semitone offsets from tonic (Sa = 0). */
	aroha: readonly number[];
	/** Descending pattern - semitone offsets from tonic. */
	avaroha: readonly number[];
	/**
	 * Primary note (vadi) as a svara number: 1 = Sa, 2 = Re, 3 = Ga, 4 = Ma, 5 = Pa, 6 = Dha, 7 = Ni.
	 * Whether it is komal, shuddha or tivra follows from the raga's notes.
	 */
	vadi: number;
	/** Secondary note (samvadi) as a svara number, same convention as `vadi`. */
	samvadi: number;
	/** Parent thaat (Bhatkhande's Hindustani classification). */
	thaat: string;
	/** Traditional performance time (optional). */
	time?: string;
	/** Brief character description. */
	description: string;
}
/**
 * Svara names indexed by the numbers used in `vadi` and `samvadi` (index 0 unused).
 * @category World music
 */
export declare const SVARA_NAMES: readonly [
	"",
	"Sa",
	"Re",
	"Ga",
	"Ma",
	"Pa",
	"Dha",
	"Ni"
];
/**
 * Ten Hindustani ragas by id (`'yaman'`, `'bhairav'`…), checked against the Wikipedia raga infoboxes.
 * @category World music
 */
export declare const RAGAS: Record<string, Raga>;
/**
 * Basic Maqamat catalog - 24-EDO (quarter-tone) approximations.
 *
 * NOTE: Maqam music involves subtle microtonal inflections, performance contexts,
 * modulation chains (sayr), and cultural conventions not captured here.
 * Intervals are given in quarter-tones (1 QT = 50 cents; 24 QT = octave).
 * This module provides structural scaffolding only.
 *
 * Scales and ajnas follow maqamworld.com (Johnny Farraj), ascending form, one octave.
 */
/**
 * A tetrachord or pentachord cell (jins) used as a building block in maqam construction.
 * @category World music
 */
export interface Jins {
	/** Display name: `'Rast'`, `'Bayati'`, `'Hijaz'`. */
	name: string;
	/** Interval pattern in quarter-tones. */
	intervals: readonly number[];
}
/**
 * A maqam scale: its constituent ajnas, full note sequence in quarter-tones, and emotional character.
 * @category World music
 */
export interface Maqam {
	/** Display name: `'Rast'`. */
	name: string;
	/** Ajnas in scale order, from the tonic up. */
	ajnas: readonly Jins[];
	/** Full scale in quarter-tones from tonic (24-EDO), ascending. */
	notes: readonly number[];
	/** Commonly cited mood (informal, not a theoretical property). */
	character?: string;
	/** @deprecated Same as `character`. */
	gharsa?: string;
}
/**
 * Catalog of 8 Arabic maqamat as 24-EDO (quarter-tone) approximations.
 * @category World music
 */
export declare const MAQAMAT: Record<string, Maqam>;
/**
 * Solfège (solmization) tools.
 * @category World music
 */
export declare class Solfege {
	/**
	 * Returns the fixed-do solfège syllable for a note (C = do always).
	 * Uses Spanish naming convention (do, re, mi, fa, sol, la, si).
	 */
	static fixedDo(note: Note, preferFlats?: boolean): string;
	/**
	 * Returns the movable-do solfège syllable for a note in a given key.
	 * "Do" is the tonic of a major key; minor keys and the church modes sing from their
	 * parent major's do (la-based minor: in A minor, A is "la"; in D dorian, D is "re").
	 * Only works in 12-TET. Returns `'?'` for chromatic notes, unknown modes or unsupported tunings.
	 *
	 * @param note - The note to solmize.
	 * @param keySymbol - Key, e.g. `'C major'`, `'A minor'`, `'D dorian'`.
	 */
	static movableDo(note: Note, keySymbol: string): string;
	/**
	 * Converts a solfège syllable back to a Note in the given key, in the octave that starts
	 * on do: fixed do gives C4–B4; movable do counts up from the key's tonic in octave 4
	 * (la-based minor: "la" in A minor is A4, "do" C5).
	 *
	 * @param syllable - Solfège syllable (e.g., `'do'`, `'sol'`).
	 * @param keySymbol - Key context.
	 * @param mode - `'fixed'` (C=do) or `'movable'` (tonic=do). Default: `'movable'`.
	 */
	static fromSolfege(syllable: string, keySymbol: string, mode?: "fixed" | "movable"): Note;
}
/**
 * A Guidonian hexachord syllable (solfège name within the hexachord).
 * @category World music
 */
export type HexachordSyllable = "ut" | "re" | "mi" | "fa" | "sol" | "la";
/**
 * One of the three Guidonian hexachord species.
 * @category World music
 */
export type HexachordType = "naturale" | "durum" | "molle";
/**
 * Guidonian hexachords: the syllable of a note in each hexachord, and mutation between them.
 * @category World music
 */
export declare class Hexachord {
	/** Hexachordum naturale, C to A: `['C', 'D', 'E', 'F', 'G', 'A']`. */
	static readonly NATURALE: string[];
	/** Hexachordum durum, G to E, with B natural. */
	static readonly DURUM: string[];
	/** Hexachordum molle, F to D, with B flat. */
	static readonly MOLLE: string[];
	/**
	 * Returns the Guidonian solfège syllable for a note within a hexachord.
	 * Returns null if the note is not part of the specified hexachord.
	 */
	static getSyllable(note: Note, hexachord: HexachordType): HexachordSyllable | null;
	/**
	 * Finds a shared note (mutation point) for transitioning between two hexachords.
	 * Returns the syllable assignment in both hexachords, or null if no mutation is possible.
	 */
	static mutate(fromHex: HexachordType, toHex: HexachordType, sharedNote: Note): {
		/** Syllable of the shared note in the hexachord left. */
		fromSyllable: HexachordSyllable;
		/** Syllable of the same note in the hexachord entered. */
		toSyllable: HexachordSyllable;
	} | null;
	/**
	 * Returns all notes of a hexachord as Note objects (in octave 4).
	 */
	static getNotes(hexachord: HexachordType): Note[];
}
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
/**
 * The Tonnetz: grid positions of notes (fifths by major thirds) and shortest paths between chords. 12-TET.
 * @category Microtonal / Xenharmonic
 */
export declare class Tonnetz {
	/**
	 * Returns the 2D Tonnetz coordinates for a note, in the fundamental domain
	 * x ∈ 0..3 (fifths), y ∈ 0..2 (major thirds), where every pitch class appears once:
	 * from A, E is (1, 0), C# (0, 1), C (1, 2) (A + a fifth + two major thirds).
	 *
	 * @param note - The note to locate.
	 * @param origin - Optional origin note (default: A4 = step 0).
	 */
	static getPosition(note: Note, origin?: Note): TonnetzPosition;
	/**
	 * Returns the shortest Tonnetz paths from each note of chord A to the nearest note of
	 * chord B, one path after another. Each path starts on the A note and moves by unit
	 * steps (fifth, major third or minor third, either way) to the B note; a common tone is
	 * a path of one position. Coordinates continue from the A note's position, so a path
	 * may leave the fundamental domain of `getPosition`.
	 */
	static pathBetween(a: Chord, b: Chord): TonnetzPosition[];
	/**
	 * Returns the 6 Tonnetz neighbors of a note, next to its own position:
	 * ±P5 (x±1, y), ±M3 (x, y±1), ±m3 (x+1, y−1 and x−1, y+1).
	 */
	static neighbors(note: Note): TonnetzPosition[];
}
/**
 * MOS (Moment of Symmetry) scales - generated scales with exactly two step sizes.
 * Used in xenharmonic / microtonal theory to find well-formed scales in arbitrary EDOs.
 * @category Microtonal / Xenharmonic
 */
export declare class MOS {
	/**
	 * Generates a MOS scale by stacking a generator interval within a period.
	 *
	 * @param generator - Generator size in steps within the period.
	 * @param period - Period size in steps (usually octave = 12 in 12-TET, or EDO divisions).
	 * @param size - Number of notes desired.
	 * @returns Array of step offsets from 0 (the tonic), sorted ascending.
	 */
	static generate(generator: number, period: number, size: number): number[];
	/**
	 * Tests whether a set of steps is a MOS (moment of symmetry) scale by Myhill's property:
	 * every generic interval (spanning k scale steps, k = 1 … n−1, around the period) comes
	 * in exactly two sizes. Two step sizes alone are not enough: LLssLLL (0 2 4 5 6 8 10 in
	 * 12) has them and is not a MOS.
	 *
	 * @param scale - Step offsets within one period (0 included).
	 * @param period - Period in steps (default 12: one 12-TET octave).
	 * @returns true if the scale is a MOS (well-formed scale).
	 */
	static isMOS(scale: number[], period?: number): boolean;
	/**
	 * Returns the MOS family - all MOS scales for a given generator and period up to maxSize.
	 * Each entry is a MOS scale (sorted step array).
	 */
	static getMOSFamily(generator: number, period: number, maxSize: number): number[][];
}
/**
 * Comma pump detection: pitch drift of a just-intonation progression.
 * @category Microtonal / Xenharmonic
 */
export declare class CommaPump {
	/**
	 * Detects if a chord progression drifts in pitch due to JI comma accumulation.
	 *
	 * Returns the total drift in cents and the likely comma type.
	 * A drift near 0 means the progression is comma-free ("pumpless").
	 * A drift near a known comma value identifies the pump type.
	 *
	 * @param chords - The progression (all chords should share the same JI tuning).
	 * @param tuning - The JI tuning context.
	 */
	static detect(chords: Chord[], tuning: JustIntonation): {
		/** Absolute drift after the progression, in cents; 0 for a progression without drift. */
		drift: number;
		/** The comma the drift matches (within 3 cents, 5 for septimal), if any. */
		commaType?: "syntonic" | "pythagorean" | "septimal";
	};
}
/**
 * Xenharmonic chord analysis: neutral triads, otonal/utonal detection, and essentially-just matching.
 * @category Microtonal / Xenharmonic
 */
export declare class Xen {
	/**
	 * Detects whether a chord contains a neutral third (≈ 350 cents, midway between m3 and M3).
	 * Indicates a non-12-TET structure typical of maqam music and neutral scales.
	 */
	static detectNeutralTriad(chord: Chord): boolean;
	/**
	 * Tests whether a chord is otonal: its notes are partials n₁ < n₂ < … of one fundamental,
	 * none above `harmonicLimit` (4:5:6 major triad, 4:5:6:7 harmonic seventh).
	 *
	 * @param chord - The chord to test.
	 * @param harmonicLimit - Highest partial number allowed (default 7).
	 * @param toleranceCents - How far each note may be from its partial (default 15¢, enough
	 *   for 12-TET's major third; 31¢ would admit its minor seventh as 7/4).
	 * @returns The partial number of each note, lowest note first.
	 */
	static detectOtonal(chord: Chord, harmonicLimit?: number, toleranceCents?: number): {
		/** Every note lies on a partial of one fundamental, within the limit and tolerance. */
		isOtonal: boolean;
		/** Partial number of each note, lowest note first (`[4, 5, 6]` for a major triad). */
		harmonics: number[];
	};
	/**
	 * Tests whether a chord is utonal: its notes are subharmonics 1/n of one common overtone,
	 * none below 1/`harmonicLimit` (1/6 : 1/5 : 1/4, the minor triad 10:12:15).
	 *
	 * @param chord - The chord to test.
	 * @param harmonicLimit - Highest subharmonic number allowed (default 7).
	 * @param toleranceCents - How far each note may be from its subharmonic (default 15¢).
	 * @returns The subharmonic number of each note, highest note first.
	 */
	static detectUtonal(chord: Chord, harmonicLimit?: number, toleranceCents?: number): {
		/** Every note lies on a subharmonic of one pitch, within the limit and tolerance. */
		isUtonal: boolean;
		/** Subharmonic number of each note, highest note first. */
		subharmonics: number[];
	};
	/**
	 * Returns the closest essentially-just chord (a tempered chord heard as a JI chord) and
	 * its ratios: each interval of the chord, in its own tuning, goes to the nearest of a set
	 * of simple 5- and 7-limit ratios.
	 *
	 * @param chord - The chord, in any tuning.
	 * @param _tuning - Unused; kept for compatibility (the chord's own tuning is used).
	 */
	static getEssentiallyJustChord(chord: Chord, _tuning?: JustIntonation): {
		/** `'4:5:6 (JI major triad)'`, `'10:12:15 (JI minor triad)'`, `'4:5:6:7 (harmonic seventh chord)'` or `'Unknown JI chord'`. */
		name: string;
		/** The just ratio each interval of the chord is read as, as `[numerator, denominator]`. */
		ratios: [
			number,
			number
		][];
	};
}
/**
 * Psychoacoustic analysis: harmonic series, combination tones, roughness, and sensory consonance.
 * @category Microtonal / Xenharmonic
 */
export declare class Spectral {
	/**
	 * Returns the first `count` partials of the harmonic series starting at `fundamental` Hz.
	 */
	static overtoneSeries(fundamental: Hertz, count?: number): Hertz[];
	/**
	 * Computes sum and difference combination tones up to `order`.
	 * Only non-negative tones are returned.
	 */
	static combinationTones(f1: Hertz, f2: Hertz, order?: number): {
		/** Sum tones m·f1 + n·f2, for m and n from 1 to `order`. */
		sum: Hertz[];
		/** Difference tones |m·f1 − n·f2|, without zeros. */
		difference: Hertz[];
	};
	/**
	 * Returns the beat frequency (interference) between two pitches.
	 */
	static beatFrequency(f1: Hertz, f2: Hertz): Hertz;
	/**
	 * Estimates sensory roughness based on the Plomp-Levelt critical bandwidth model.
	 * Returns a value 0 (smooth) to 1 (maximum roughness).
	 *
	 * This is a simplified implementation - accurate only for simple sine-tone pairs.
	 * For complex spectra, use `roughnessPlompLevelt`.
	 */
	static consonanceCurve(intervalCents: number): number;
	/**
	 * Estimates roughness for a set of frequencies using a pairwise Plomp-Levelt model.
	 * Lower values = more consonant.
	 *
	 * @param frequencies - Array of frequencies in Hz.
	 * @param amplitudes - Optional amplitudes (default: all 1).
	 */
	static roughnessPlompLevelt(frequencies: Hertz[], amplitudes?: number[]): number;
	/**
	 * Estimates sensory consonance of a chord from the roughness between the harmonic partials
	 * of its notes (Sethares' model: partial k at k·f with amplitude rolloff^(k−1)). Only
	 * partials of different notes are paired. Returns 1 − roughness / the most roughness those
	 * partials could make, from 0 (rough) to 1 (smooth): a fifth scores above a tritone.
	 *
	 * @param chord - The chord to evaluate.
	 * @param partials - Harmonic partials per note (default 6; 1 = fundamentals only).
	 * @param rolloff - Amplitude ratio between consecutive partials (default 0.88).
	 */
	static sensoryConsonance(chord: Chord, partials?: number, rolloff?: number): number;
}
/**
 * A single row in a temperament comparison: one tuning vs. one JI interval.
 * @category Microtonal / Xenharmonic
 */
export interface ComparisonEntry {
	/** Name of the tuning compared. */
	tuningName: string;
	/** The just interval, as `[numerator, denominator]`. */
	intervalRatio: [
		number,
		number
	];
	/** Size of the tuning's closest interval, in cents. */
	tuningCents: number;
	/** Size of the just interval, in cents. */
	justCents: number;
	/** Absolute difference between the two, in cents. */
	errorCents: number;
}
/**
 * Full comparison matrix across tuning systems and JI reference intervals.
 * @category Microtonal / Xenharmonic
 */
export interface ComparisonTable {
	/** The just intervals compared, as ratios. */
	intervals: [
		number,
		number
	][];
	/** One row per tuning, one entry per interval, in the order of `intervals`. */
	entries: ComparisonEntry[][];
}
/**
 * Static methods for comparing tuning systems against JI, detecting wolf intervals, and finding optimal EDOs.
 * @category Microtonal / Xenharmonic
 */
export declare class TemperamentAnalysis {
	/**
	 * Compares multiple tuning systems against JI reference intervals.
	 * Returns a comparison table with cent errors for each interval in each tuning.
	 *
	 * @param tunings - Array of tuning systems to compare.
	 * @param intervals - JI ratios to compare (e.g., [[3,2], [5,4]] = P5 and M3).
	 */
	static compare(tunings: TuningSystem[], intervals: [
		number,
		number
	][]): ComparisonTable;
	/**
	 * Detects wolf intervals: single instances of an interval that stand out from the other
	 * intervals of the same number of steps. For each step count k, the typical size (median
	 * over all starting degrees) is taken as meant to be the nearest consonance (6/5, 5/4,
	 * 4/3, 3/2, 8/5, 5/3) when within `threshold` of it; an instance more than `threshold`
	 * away from that consonance is a wolf (Pythagorean tuning's G#–Eb fifth). Equal
	 * temperaments have none.
	 *
	 * @param tuning - The tuning system to audit.
	 * @param threshold - Error threshold in cents (default 20: Pythagorean tuning's wolf fifth
	 *   is a Pythagorean comma, 23.5¢, short).
	 * @returns Array of { interval (step count), from (starting step), errorCents (from the consonance) }.
	 */
	static detectWolfIntervals(tuning: TuningSystem, threshold?: number): {
		/** Size of the interval in steps of the tuning. */
		interval: number;
		/** Step the out-of-tune interval starts on. */
		from: number;
		/** Distance from the just consonance it stands for, in cents. */
		errorCents: number;
	}[];
	/**
	 * Returns definitions of common musical commas, with cents to three decimals.
	 * `ratioText` is exact. The Mercator comma (3^53/2^84) is beyond Number precision:
	 * its `ratio` is the nearest doubles and its cents are computed from the exponents.
	 */
	static getCommas(): {
		/** `'Syntonic comma'`, `'Pythagorean comma'`, `'Schisma'`… */
		name: string;
		/** As `[numerator, denominator]` (may lose precision for very large ratios; see `ratioText`). */
		ratio: [
			number,
			number
		];
		/** Exact ratio as text: `'81/80'`. */
		ratioText: string;
		/** Size in cents, to three decimals. */
		cents: number;
	}[];
	/**
	 * Finds unison vectors for a JustIntonation tuning: the known commas by which two sizes
	 * of the same interval (same number of steps, different starting notes) differ. In 5-limit
	 * JI the fifths 3/2 and 40/27, or the whole tones 9/8 and 10/9, differ by 81/80.
	 */
	static getUnisonVectors(tuning: JustIntonation): [
		number,
		number
	][];
}
/**
 * Maps a JI ratio to the closest step in an EDO.
 * @param jiRatio - [numerator, denominator] ratio.
 * @param edoSize - Number of steps per octave in the target EDO.
 * @category Microtonal / Xenharmonic
 */
export declare function mapJItoEDO(jiRatio: [
	number,
	number
], edoSize: number): {
	/** Closest step of the EDO. */
	step: number;
	/** Absolute distance from the just interval, in cents. */
	errorCents: number;
};
/**
 * Finds the smallest EDO that approximates all given JI ratios within a cent threshold.
 * @param jiRatios - Array of [numerator, denominator] ratios.
 * @param maxSize - Maximum EDO size to search (default 72).
 * @category Microtonal / Xenharmonic
 */
export declare function bestEDOFor(jiRatios: [
	number,
	number
][], maxSize?: number): {
	/** Number of equal divisions of the octave. */
	size: number;
	/** Sum of the absolute errors of all the ratios, in cents. */
	totalError: number;
};
/**
 * A chord under the OPTIC equivalences, each one added to the previous (O, OP, OPT, OPTI,
 * OPTIC), in 12-TET pitch classes.
 * @category Microtonal / Xenharmonic
 */
export interface OPTICResult {
	/** O: octave equivalence - pitch classes in voice order, doublings kept */
	O: number[];
	/** OP: + permutation - pitch classes sorted, doublings kept */
	P: number[];
	/** OPT: + transposition - the most compact rotation (normal form), starting on 0 */
	T: number[];
	/** OPTI: + inversion - the more compact of T and its inversion's T */
	I: number[];
	/** OPTIC: + cardinality - doublings removed: the set class's prime form */
	C: number[];
	/** Number of distinct pitch classes */
	cardinality: number;
}
/**
 * Computes the OPTIC equivalence classes of a chord given as pitches or pitch classes
 * (12-TET semitones), in voice order: (0, 4, 7) → T [0, 4, 7], I and C [0, 3, 7].
 *
 * @param pcs - Pitches or pitch classes, one per voice.
 * @category Microtonal / Xenharmonic
 */
export declare function OPTIC(pcs: number[]): OPTICResult;
/**
 * Voice-leading geometry (Tymoczko): OPTIC equivalence and minimal voice leadings between chords.
 * @category Microtonal / Xenharmonic
 */
export declare class VoiceLeadingGeometry {
	/**
	 * Computes OPTIC equivalence for a chord.
	 */
	static OPTIC(chord: number[]): OPTICResult;
	/**
	 * Finds the most efficient voice leading between two chords in pitch-class space: each
	 * voice of `a` goes to a note of `b`, and the cost is the sum of the interval classes
	 * moved (the shortest way, up or down, ignoring octaves). Up to 8 voices.
	 *
	 * Returns all minimal-cost assignments (notes of `b` in the order of `a`'s voices) and
	 * the total distance in steps.
	 * @throws RangeError for chords of more than 8 notes.
	 *
	 * @param a - Source chord.
	 * @param b - Target chord.
	 */
	static efficientVoiceLeading(a: Chord, b: Chord): {
		/** Every minimal assignment: notes of `b` in the order of `a`'s voices. */
		paths: Note[][];
		/** Sum of the interval classes moved, in steps. */
		totalDistance: number;
	};
	/**
	 * Returns the voice-leading distance between two chords:
	 * the minimum total semitone displacement across all voice assignments.
	 */
	static chordGraphDistance(a: Chord, b: Chord): number;
}
/**
 * Optional metadata fields for MusicXML score headers.
 * @category Notation
 */
export interface MusicXMLMetadata {
	/** Work title. */
	title?: string;
	/** Composer credit. */
	composer?: string;
	/** Name of the part (default `'Music'`). */
	partName?: string;
}
/**
 * Options for writing a stream in MusicXML.
 * @category Notation
 */
export interface MusicXMLOptions {
	/** Key of the music (e.g. `'D major'`, `'E dorian'`): sets `<key>` and the written accidentals. Default `'C major'`. */
	key?: string;
}
/**
 * Converts a MusicStream to a MusicXML string. Gaps between events become rests; notes
 * that cross a barline, or have no single written value, are split into tied values.
 * `<divisions>` is the fewest per quarter note that count every value whole.
 * @category Notation
 */
export declare function streamToMusicXML(stream: MusicStream, metadata?: MusicXMLMetadata, options?: MusicXMLOptions): string;
/**
 * Converts a single Chord to a one-measure MusicXML snippet (a whole-note chord in 4/4).
 * @category Notation
 */
export declare function chordToMusicXML(chord: Chord, metadata?: MusicXMLMetadata): string;
/**
 * Converts a Scale to ascending MusicXML quarter notes in 4/4.
 * @category Notation
 */
export declare function scaleToMusicXML(scale: Scale, octaves?: number, metadata?: MusicXMLMetadata): string;
/**
 * Optional metadata fields for LilyPond header block.
 * @category Notation
 */
export interface LPMetadata {
	/** `title` of the LilyPond header. */
	title?: string;
	/** `composer` of the LilyPond header. */
	composer?: string;
	/** `opus` of the LilyPond header. */
	opus?: string;
}
/**
 * Options for writing a stream in LilyPond.
 * @category Notation
 */
export interface LPOptions {
	/** Key of the music (e.g. `'D major'`, `'E dorian'`): sets `\key`. Default: none (C major). */
	key?: string;
}
/**
 * Converts a MusicStream to a LilyPond string. Measures end in bar checks (`|`); notes that
 * cross a barline, or have no single written value, are split into tied values. An additive
 * meter is written `\time 3,2,2 7/8`.
 * @category Notation
 */
export declare function streamToLilyPond(stream: MusicStream, metadata?: LPMetadata, options?: LPOptions): string;
/**
 * Converts a Chord to a LilyPond snippet (one whole-note chord in 4/4).
 * @category Notation
 */
export declare function chordToLilyPond(chord: Chord, metadata?: LPMetadata): string;
/**
 * Converts a Scale to an ascending LilyPond sequence of quarter notes in 4/4.
 * @category Notation
 */
export declare function scaleToLilyPond(scale: Scale, metadata?: LPMetadata): string;
/**
 * Symbol translation utilities for non-English input.
 *
 * `translateSymbol` performs a greedy left-to-right substitution pass over a
 * music symbol string before it reaches the parser. Longer alias keys take
 * priority over shorter ones, so `Sol` is matched before `Si` and
 * `disminuido` before `dis`.
 *
 * Accidentals (`#`, `b`) and Arabic digits are language-neutral and pass
 * through unchanged, so `Sib` → `Bb` without needing an explicit `Sib` entry.
 *
 * Predefined maps cover the most common cases; combine them with spread syntax:
 * ```ts
 * const es = { ...SOLFEGE_ROOTS, ...QUALITY_ALIASES_ES };
 * parseChordSymbol(translateSymbol('Sib menor', es)); // Bbm
 * parseScaleSymbol(translateSymbol('Do mayor',  es)); // C major
 * ```
 */
/**
 * Translates a music symbol string by replacing alias keys with their values.
 * Longer keys take priority. Case-sensitive.
 *
 * @param input   - Raw symbol, e.g. `'Dom7'`, `'Do mayor'`, `'Sol mineur'`.
 * @param aliases - Map of alias → canonical string.
 * @returns Translated string ready for `parseChordSymbol` / `parseScaleSymbol`.
 * @category Core
 */
export declare function translateSymbol(input: string, aliases: Record<string, string>): string;
/**
 * Solfège note names → English note letters. Accidentals (`#`, `b`) pass through.
 * @category Core
 */
export declare const SOLFEGE_ROOTS: Record<string, string>;
/**
 * Spanish quality names → canonical parser tokens.
 * @category Core
 */
export declare const QUALITY_ALIASES_ES: Record<string, string>;
/**
 * French quality names → canonical parser tokens.
 * @category Core
 */
export declare const QUALITY_ALIASES_FR: Record<string, string>;
/**
 * Italian quality names → canonical parser tokens.
 * @category Core
 */
export declare const QUALITY_ALIASES_IT: Record<string, string>;
/**
 * Standard guitar tuning: E2 A2 D3 G3 B3 E4
 * @category Core
 */
export declare const GUITAR_STANDARD: readonly [
	-29,
	-24,
	-19,
	-14,
	-10,
	-5
];
/**
 * Guitar drop D tuning: D2 A2 D3 G3 B3 E4
 * @category Core
 */
export declare const GUITAR_DROPPED_D: readonly [
	-31,
	-24,
	-19,
	-14,
	-10,
	-5
];
/**
 * Guitar open G tuning: D2 G2 D3 G3 B3 D4
 * @category Core
 */
export declare const GUITAR_OPEN_G: readonly [
	-31,
	-26,
	-19,
	-14,
	-10,
	-7
];
/**
 * Standard ukulele tuning (reentrant): G4 C4 E4 A4
 * @category Core
 */
export declare const UKULELE_STANDARD: readonly [
	-2,
	-9,
	-5,
	0
];
/**
 * Standard 4-string bass tuning: E1 A1 D2 G2
 * @category Core
 */
export declare const BASS_STANDARD: readonly [
	-41,
	-36,
	-31,
	-26
];
/**
 * 5-string banjo open G tuning (drone first): G4 D3 G3 B3 D4
 * @category Core
 */
export declare const BANJO_OPEN_G: readonly [
	-2,
	-19,
	-14,
	-10,
	-7
];
/**
 * Options for voicing and scale position generation.
 * @category Core
 */
export type FretboardVoicingOptions = {
	/** Highest fret to search. Default: 12. */
	maxFret?: number;
	/** Maximum fret span (stretch) in a single voicing. Default: 4. */
	maxStretch?: number;
	/** Fret window size for {@link getFretboardScalePositions}. Default: 4. */
	windowSize?: number;
	/**
	 * Per-string fret offset: the physical fret number where each string's nut sits.
	 * 0 (default) for normal strings. Use 5 for the 5-string banjo drone (index 0 with
	 * `BANJO_OPEN_G`). When provided, output fret values are shifted by this amount so
	 * they match absolute fret positions on the instrument.
	 * @example
	 * getFretboardVoicings(chord, BANJO_OPEN_G, { stringOffset: [5, 0, 0, 0, 0] })
	 */
	stringOffset?: number[];
};
/**
 * A single chord voicing for a fretted instrument.
 * Compatible with notae's `FretboardChord` — spread with `name` to render directly.
 *
 * @example
 * const voicings = getFretboardVoicings(chord, GUITAR_STANDARD);
 * renderFretboard({ name: chord.name, ...voicings[0] });
 * @category Core
 */
export type FretboardVoicingResult = {
	/** One fret per string, low→high. -1 = mute (×), stringOffset[i] = open (○), N = fret N. */
	frets: number[];
	/** Absolute fret of the first displayed fret. 1 in open position or when lowest fret is 1. */
	baseFret: number;
	/** Open-string note names, low→high (e.g. `['E','A','D','G','B','E']`). */
	tuning: string[];
	/** Root note name (e.g. `'C'`, `'F#'`). */
	root: string;
	/** Per-string fret offset, echoed from options. Present only when offset was supplied. */
	stringOffset?: number[];
};
/**
 * Scale notes mapped to fretboard positions.
 * Compatible with notae's `FretboardChord` — spread with `name` to render directly.
 *
 * @example
 * const map = getFretboardScale(scale, GUITAR_STANDARD);
 * renderFretboard({ name: scale.name, ...map });
 * @category Core
 */
export type FretboardScaleResult = {
	/** Per string: all fret positions where a scale note appears. Empty array = no scale notes on this string. */
	frets: number[][];
	/** 1 for a full-neck map, or the starting fret for a position box. */
	baseFret: number;
	/** Open-string note names, low→high. */
	tuning: string[];
	/** Root note name. */
	root: string;
	/** Per-string fret offset, echoed from options. Present only when offset was supplied. */
	stringOffset?: number[];
};
/**
 * Generates all valid chord voicings for a fretted instrument using backtracking.
 *
 * Each voicing covers all pitch classes of the chord. Results are sorted by
 * position (lowest fret first), then by stretch, then by number of muted strings.
 *
 * @param chord - The chord to voice.
 * @param tuning - Open string steps from A4, low→high. Use the exported presets
 *   (`GUITAR_STANDARD`, `UKULELE_STANDARD`, etc.) or supply a custom array.
 * @param options - Search constraints: `maxFret` (default 12), `maxStretch` (default 4).
 * @returns Array of voicings sorted by playability. Empty if no valid voicing exists.
 * @category Core
 */
export declare function getFretboardVoicings(chord: Chord, tuning: readonly number[], options?: FretboardVoicingOptions): FretboardVoicingResult[];
/**
 * Maps all scale note positions across the full neck.
 * Each string entry is an array of fret numbers (0–`maxFret`) where a scale note appears.
 *
 * @param scale - The scale to map.
 * @param tuning - Open string steps from A4, low→high.
 * @param options - `maxFret` controls how far up the neck to scan (default 12).
 * @returns A single result with all scale positions across the neck.
 * @category Core
 */
export declare function getFretboardScale(scale: Scale, tuning: readonly number[], options?: FretboardVoicingOptions): FretboardScaleResult;
/**
 * Returns scale position "boxes" — windows of adjacent frets covering the scale.
 * Each box is a `FretboardScaleResult` limited to a `windowSize`-fret span, plus open strings.
 * Useful for CAGED-style position practice on any instrument.
 *
 * @param scale - The scale to map.
 * @param tuning - Open string steps from A4, low→high.
 * @param options - `maxFret` (default 12), `windowSize` (default 4).
 * @returns Array of position boxes ordered by starting fret, each with at least one note.
 * @category Core
 */
export declare function getFretboardScalePositions(scale: Scale, tuning: readonly number[], options?: FretboardVoicingOptions): FretboardScaleResult[];
/**
 * One sounding note of a voicing, bottom to top.
 * @category Tonal harmony
 */
export interface VoicedNote {
	/** Note name with octave: `'E4'`. */
	note: string;
	/** Chord member (`'R'`, `'3'`, `'b7'`, `'9'`…), or null for a note outside the chord. */
	degree: string | null;
}
/**
 * Result of `analyzeVoicing`.
 * @category Tonal harmony
 */
export interface VoicingAnalysis {
	/** Name of the chord the notes are read as (passed in, or the best detection). */
	chord: string;
	/** Notes from the bass up. */
	voices: VoicedNote[];
	/** Lowest note, with octave. */
	bass: string;
	/** Chord member in the bass (`'R'`, `'3'`, `'5'`, `'b7'`…), or null for a note outside the chord. */
	bassDegree: string | null;
	/** 0 root position, 1 first (third in the bass), 2 second (fifth), 3 third (seventh); null for any other bass. */
	inversion: number | null;
	/** Upper voices (all but the bass) within an octave: `'close'`; wider: `'open'`. Null with fewer than three voices. */
	position: "close" | "open" | null;
	/** Four-voice jazz voicings derived from a close voicing by dropping voices an octave. */
	drop: "drop 2" | "drop 3" | "drop 2+4" | null;
	/** Chord members that sound more than once. */
	doubled: string[];
	/** Chord members that do not sound. */
	omitted: string[];
	/** Sounding notes outside the chord. */
	added: string[];
	/** Semitones from the lowest to the highest note. */
	span: number;
}
/**
 * Analyzes how a chord is voiced: inversion, close or open position, drop 2 / drop 3 /
 * drop 2+4, and which members are doubled, omitted or added.
 * Notes may come in any order. Without `chord`, the first reading of
 * `Harmony.detectChords` is used. Other tunings are read by the nearest 12-TET semitone.
 * @returns null when no chord is given and none is detected.
 * @example
 * analyzeVoicing(['G3', 'C4', 'E4', 'B4'].map(n => parseNote(n)), parseChordSymbol('Cmaj7'))
 * // → inversion 2, drop 'drop 2' (from B G E C, G dropped), position 'close'
 * @category Tonal harmony
 */
export declare function analyzeVoicing(notes: Note[], chord?: Chord): VoicingAnalysis | null;
/**
 * A scale that contains every note of the set.
 * @category Tonal harmony
 */
export interface ScaleMatch {
	/** Scale symbol, readable by `parseScaleSymbol`: `'C major'`. */
	name: string;
	/** Root note name: `'C'`, `'F#'`. */
	root: string;
	/** Scale type, a key of `SCALE_PATTERNS`: `'major'`, `'dorian'`. */
	type: string;
	/** Other names of the same pattern in SCALE_PATTERNS (`'ionian'`, `'greek-hypolydian'`). */
	aliases: string[];
	/** Notes of the scale, spelled. */
	notes: string[];
	/** Scale notes that are not in the set. */
	extra: string[];
	/** The scale's root is the tonic (given, or the lowest note). */
	rootIsTonic: boolean;
	/** 0 common (diatonic modes, harmonic and melodic minor, pentatonics, blues), 1 other families, 2 regional and symmetric collections, 3 chromatic. */
	tier: number;
}
/**
 * Options for `findScalesForNotes`.
 * @category Tonal harmony
 */
export interface FindScalesOptions {
	/** Tonic to rank first (`'D'`, `'F#'`); default: the lowest note. */
	tonic?: string;
	/** Only scales whose root is the tonic. */
	tonicOnly?: boolean;
	/** At most this many results. */
	limit?: number;
}
/**
 * Returns the scales of SCALE_PATTERNS, on every root, that contain all the given notes,
 * ranked: root on the tonic first, then by tier (common scales before other families and
 * regional collections), then by fewer notes added to the set. The chromatic scale, which
 * holds any set, comes last on every root. Aliases of one pattern are
 * one result. Roots take the letter of a given note when one has that pitch class.
 * Other tunings are read by the nearest 12-TET pitch class.
 * @example
 * findScalesForNotes(['C4', 'E4', 'G4', 'Bb4'].map(n => parseNote(n)))[0].name // 'C mixolydian'
 * @category Tonal harmony
 */
export declare function findScalesForNotes(notes: Note[], options?: FindScalesOptions): ScaleMatch[];
/**
 * How `formatChordSymbol` writes qualities.
 * @category Tonal harmony
 */
export type ChordSymbolStyle = "standard" | "symbols" | "short";
/**
 * Languages of `chordLongName` and `localizeNoteName`.
 * @category Tonal harmony
 */
export type ChordNameLanguage = "en" | "es";
/**
 * A note name in another language. Short form keeps the accidental sign (`'F#'` → `'Fa#'`);
 * long form spells it (`'F#'` → `'F sharp'` / `'Fa sostenido'`). An octave number is kept.
 * @category Tonal harmony
 */
export declare function localizeNoteName(name: string, language: ChordNameLanguage, long?: boolean): string;
/**
 * Writes a chord symbol in another style, optionally with the root (and slash bass) in
 * solfège.
 * - `'standard'`: as the library writes it (Cmaj7, Cm7, Cm7b5, Cdim7, Caug)
 * - `'symbols'`: jazz symbols (CΔ7, C-7, Cø7, C°7, C+, C-Δ7)
 * - `'short'`: M for major seventh (CM7, CM9)
 * @example formatChordSymbol('F#m7b5', { style: 'symbols', roots: 'solfege' }) // 'Fa#ø7'
 * @category Tonal harmony
 */
export declare function formatChordSymbol(chord: Chord | string, options?: {
	style?: ChordSymbolStyle;
	roots?: "letters" | "solfege";
}): string;
/**
 * A chord's name in words: `'C major seventh'`, `'Do séptima mayor'`, `'F sharp minor'`,
 * `'Fa sostenido menor'`. A slash bass reads "over E" / "con bajo en Mi". Qualities beyond
 * triads, sixths, suspensions and seventh chords keep their symbol after the root
 * (`'C 7#9'`, `'Do 7#9'`).
 * @category Tonal harmony
 */
export declare function chordLongName(chord: Chord | string, language?: ChordNameLanguage): string;
/**
 * A scale or mode name in another language, with or without a root: the `name` of
 * `findScalesForNotes` and `scale` of `getSuggestedScales` (`'D dorian'`), or the
 * `sourceMode` of `getBorrowedChords` and `borrowedFrom` of `analyzeProgression`
 * (`'harmonic minor'`). Names without a translation (hirajoshi, pelog, freygish…) are kept.
 * Roots are in solfège in Spanish and in letters in English unless `roots` says otherwise.
 * @example scaleName('F# lydian dominant', 'es') // 'Fa# lidio dominante'
 * @example scaleName('A harmonic minor', 'en', { roots: 'solfege' }) // 'La harmonic minor'
 * @category Tonal harmony
 */
export declare function scaleName(name: string, language?: ChordNameLanguage, options?: {
	roots?: "letters" | "solfege";
}): string;
/**
 * A cadence from `Harmony.analyzeCadence` (or `cadenceWithNext` of `analyzeProgression`) in
 * another language. The long form keeps the numerals (`'Cadencia rota (V -> vi)'`); `short`
 * gives the name alone (`'Rota'`, `'Authentic'`). An unknown string is returned unchanged.
 * @category Tonal harmony
 */
export declare function cadenceName(cadence: string, language?: ChordNameLanguage, options?: {
	short?: boolean;
}): string;
/**
 * The `type` of a `getSubstitutions` option in words: `'tritone'` → `'tritonal'`
 * (sustitución tritonal), `'chromatic-mediant'` → `'chromatic mediant'` / `'mediante cromática'`.
 * An unknown type is returned unchanged.
 * @category Tonal harmony
 */
export declare function substitutionTypeName(type: string, language?: ChordNameLanguage): string;
/**
 * A repeating rhythmic cycle.
 * @category Rhythm
 */
export interface RhythmicCycle {
	/** Display name: `'Teental (Tintal)'`, `'Bulerías'`. */
	name: string;
	/** Musical tradition it belongs to. */
	tradition: "hindustani" | "carnatic" | "flamenco" | "aksak";
	/** Pulses in one cycle (matras, aksharas, beats of the compás, or eighths). */
	beats: number;
	/** Divisions of the cycle (vibhag, anga, groups of the compás, aksak cells), adding up to `beats`. */
	groups: number[];
	/** Hindustani tala: the sign of each vibhag, `'X'` sam, `'0'` khali (wave), a number for a clap (tali). */
	vibhag?: string[];
	/** Hindustani tala whose sam falls on a khali vibhag (Rupak). */
	samIsKhali?: boolean;
	/** Count spoken on the first pulse (flamenco: 12 in bulerías and seguiriya, 1 in soleá); default 1. */
	firstCount?: number;
	/** Accented counts, in the cycle's own counting (flamenco). Without it the group starts are accented. */
	accents?: number[];
	/** Reference the cycle was checked against. */
	source: string;
}
/**
 * Talas, flamenco compás and aksak meters.
 * @category Rhythm
 */
export declare const RHYTHMIC_CYCLES: Record<string, RhythmicCycle>;
/**
 * What a metronome plays on one pulse of a cycle.
 * @category Rhythm
 */
export type CycleStroke = "sam" | "tali" | "khali" | "accent" | "beat";
/**
 * The spoken count of each pulse: 1…n, or from `firstCount` (bulerías: 12, 1, 2 … 11).
 * @category Rhythm
 */
export declare function cycleCounts(cycle: RhythmicCycle): number[];
/**
 * The stroke of each pulse, for a metronome. Hindustani talas: `'sam'` on the first pulse,
 * `'tali'` (clap) or `'khali'` (wave) on the first pulse of each other vibhag (Rupak's sam,
 * also khali, is `'sam'`). Flamenco: `'accent'` on the accented counts. Others:
 * `'accent'` on the first pulse of each group. Every other pulse is `'beat'`.
 * @category Rhythm
 */
export declare function cycleStrokes(cycle: RhythmicCycle): CycleStroke[];
/**
 * An additive time signature for the cycle: its groups over `denominator` (default 8,
 * the usual unit of aksak meters: Račenica is 2+2+3/8).
 * @category Rhythm
 */
export declare function cycleTimeSignature(cycle: RhythmicCycle, denominator?: number): TimeSignature;

export {};
