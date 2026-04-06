import { Chord } from './chord';
import { get12TETBaseName, preferFlatsForKey, NOTE_NAMES_12TET_FLAT } from './utils';

/**
 * Neo-Riemannian Theory Module
 * Applies geometric transformations (PLR) to triads.
 * P: Parallel (C Major <-> C Minor)
 * L: Leading-tone exchange (C Major <-> E Minor)
 * R: Relative (C Major <-> A Minor)
 */
export class NeoRiemannian {
  /**
   * Identifies if a chord is a major or minor triad and returns its root step.
   */
  static getTriadType(chord: Chord): { rootStep: number, isMajor: boolean } | null {
    const notes = chord.getNotes();
    if (notes.length < 3) return null;

    const oct = chord.tuningSystem.octaveSteps;
    const ts = chord.tuningSystem;
    const intervals = notes.map(n => ((n.stepsFromBase - chord.rootStep) % oct + oct) % oct);

    const hasMajorThird  = intervals.includes(ts.getStepFromStandard(4));
    const hasMinorThird  = intervals.includes(ts.getStepFromStandard(3));
    const hasPerfectFifth = intervals.includes(ts.getStepFromStandard(7));

    if (hasPerfectFifth && hasMajorThird) return { rootStep: chord.rootStep, isMajor: true };
    if (hasPerfectFifth && hasMinorThird) return { rootStep: chord.rootStep, isMajor: false };

    return null; // Not a pure major/minor triad
  }

  /**
   * Parallel Transformation (P)
   * Moves the third of the chord by a half-step.
   * C Major -> C Minor
   */
  static P(chord: Chord): Chord | null {
    const type = this.getTriadType(chord);
    if (!type) return null;

    const ts = chord.tuningSystem;
    const min3 = ts.getStepFromStandard(3);
    const maj3 = ts.getStepFromStandard(4);
    const per5 = ts.getStepFromStandard(7);
    // P keeps the same root — inherit the source chord's flat/sharp preference.
    const pf = chord.preferFlats ?? false;
    const rootName = get12TETBaseName(type.rootStep, pf);
    const name = rootName + (type.isMajor ? 'm' : '');
    return new Chord(name, ts, type.rootStep, type.isMajor ? [0, min3, per5] : [0, maj3, per5], undefined, pf);
  }

  /**
   * Leading-tone Exchange (L)
   * Major: Root moves down a half-step (C Major -> E Minor)
   * Minor: Fifth moves up a half-step (A Minor -> F Major)
   */
  static L(chord: Chord): Chord | null {
    const type = this.getTriadType(chord);
    if (!type) return null;

    const ts = chord.tuningSystem;
    const maj3 = ts.getStepFromStandard(4);
    const min3 = ts.getStepFromStandard(3);
    const per5 = ts.getStepFromStandard(7);
    if (type.isMajor) {
      const newRoot = type.rootStep + maj3; // Up a major third
      const pc = ((newRoot % 12) + 12) % 12;
      const pf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc], 'major');
      return new Chord(get12TETBaseName(newRoot, pf) + 'm', ts, newRoot, [0, min3, per5], undefined, pf);
    } else {
      const newRoot = type.rootStep - maj3; // Down a major third
      const pc = ((newRoot % 12) + 12) % 12;
      const pf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc], 'major');
      return new Chord(get12TETBaseName(newRoot, pf), ts, newRoot, [0, maj3, per5], undefined, pf);
    }
  }

  /**
   * Relative Transformation (R)
   * Major: Fifth moves up a whole-step (C Major -> A Minor)
   * Minor: Root moves down a whole-step (A Minor -> C Major)
   */
  static R(chord: Chord): Chord | null {
    const type = this.getTriadType(chord);
    if (!type) return null;

    const ts = chord.tuningSystem;
    const maj3 = ts.getStepFromStandard(4);
    const min3 = ts.getStepFromStandard(3);
    const per5 = ts.getStepFromStandard(7);
    if (type.isMajor) {
      const newRoot = type.rootStep - min3; // Down a minor third
      const pc = ((newRoot % 12) + 12) % 12;
      const pf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc], 'minor');
      return new Chord(get12TETBaseName(newRoot, pf) + 'm', ts, newRoot, [0, min3, per5], undefined, pf);
    } else {
      const newRoot = type.rootStep + min3; // Up a minor third
      const pc = ((newRoot % 12) + 12) % 12;
      const pf = preferFlatsForKey(NOTE_NAMES_12TET_FLAT[pc], 'major');
      return new Chord(get12TETBaseName(newRoot, pf), ts, newRoot, [0, maj3, per5], undefined, pf);
    }
  }
}
