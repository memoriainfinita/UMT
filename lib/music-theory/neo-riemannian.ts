import { Chord } from './chord';
import { get12TETBaseName } from './utils';

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
    
    const intervals = notes.map(n => ((n.stepsFromBase - chord.rootStep) % 12 + 12) % 12);
    
    const hasMajorThird = intervals.includes(4);
    const hasMinorThird = intervals.includes(3);
    const hasPerfectFifth = intervals.includes(7);

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

    const rootName = get12TETBaseName(type.rootStep);
    const name = rootName + (type.isMajor ? 'm' : '');
    return new Chord(name, chord.tuningSystem, type.rootStep, type.isMajor ? [0, 3, 7] : [0, 4, 7]);
  }

  /**
   * Leading-tone Exchange (L)
   * Major: Root moves down a half-step (C Major -> E Minor)
   * Minor: Fifth moves up a half-step (A Minor -> F Major)
   */
  static L(chord: Chord): Chord | null {
    const type = this.getTriadType(chord);
    if (!type) return null;
    
    if (type.isMajor) {
      const newRoot = type.rootStep + 4; // Up a major third
      return new Chord(get12TETBaseName(newRoot) + 'm', chord.tuningSystem, newRoot, [0, 3, 7]);
    } else {
      const newRoot = type.rootStep - 4; // Down a major third
      return new Chord(get12TETBaseName(newRoot), chord.tuningSystem, newRoot, [0, 4, 7]);
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
    
    if (type.isMajor) {
      const newRoot = type.rootStep - 3; // Down a minor third
      return new Chord(get12TETBaseName(newRoot) + 'm', chord.tuningSystem, newRoot, [0, 3, 7]);
    } else {
      const newRoot = type.rootStep + 3; // Up a minor third
      return new Chord(get12TETBaseName(newRoot), chord.tuningSystem, newRoot, [0, 4, 7]);
    }
  }
}
