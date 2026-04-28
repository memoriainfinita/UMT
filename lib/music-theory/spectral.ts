/**
 * Spectral / psychoacoustic tools.
 * Models consonance, roughness, and the harmonic series.
 */
import { Hertz } from './types';
import { Chord } from './chord';

export class Spectral {
  /**
   * Returns the first `count` partials of the harmonic series starting at `fundamental` Hz.
   */
  static overtoneSeries(fundamental: Hertz, count = 16): Hertz[] {
    return Array.from({ length: count }, (_, i) => fundamental * (i + 1));
  }

  /**
   * Computes sum and difference combination tones up to `order`.
   * Only non-negative tones are returned.
   */
  static combinationTones(f1: Hertz, f2: Hertz, order = 2): { sum: Hertz[]; difference: Hertz[] } {
    const sum: Hertz[] = [];
    const difference: Hertz[] = [];
    for (let m = 1; m <= order; m++) {
      for (let n = 1; n <= order; n++) {
        const s = m * f1 + n * f2;
        const d = Math.abs(m * f1 - n * f2);
        sum.push(s);
        if (d > 0) difference.push(d);
      }
    }
    return {
      sum: [...new Set(sum)].sort((a, b) => a - b),
      difference: [...new Set(difference)].sort((a, b) => a - b),
    };
  }

  /**
   * Returns the beat frequency (interference) between two pitches.
   */
  static beatFrequency(f1: Hertz, f2: Hertz): Hertz {
    return Math.abs(f1 - f2);
  }

  /**
   * Estimates sensory roughness based on the Plomp-Levelt critical bandwidth model.
   * Returns a value 0 (smooth) to 1 (maximum roughness).
   *
   * This is a simplified implementation - accurate only for simple sine-tone pairs.
   * For complex spectra, use `roughnessPlompLevelt`.
   */
  static consonanceCurve(intervalCents: number): number {
    // Plomp-Levelt-inspired curve: maximum roughness near 25% of critical bandwidth.
    // Approximation: peak roughness around 1-2 semitones (100-200 cents).
    const x = Math.abs(intervalCents);
    if (x === 0) return 0;
    if (x >= 1200) return 0; // octave: consonant
    // Empirical Gaussian-like curve peaking around 1 semitone (100 cents)
    const peak = 100;
    const spread = 80;
    return Math.exp(-Math.pow(Math.log(x / peak), 2) / (2 * Math.pow(Math.log(spread / peak), 2)));
  }

  /**
   * Estimates roughness for a set of frequencies using a pairwise Plomp-Levelt model.
   * Lower values = more consonant.
   *
   * @param frequencies - Array of frequencies in Hz.
   * @param amplitudes - Optional amplitudes (default: all 1).
   */
  static roughnessPlompLevelt(frequencies: Hertz[], amplitudes?: number[]): number {
    const amps = amplitudes ?? frequencies.map(() => 1);
    let roughness = 0;

    for (let i = 0; i < frequencies.length; i++) {
      for (let j = i + 1; j < frequencies.length; j++) {
        const f1 = frequencies[i], f2 = frequencies[j];
        const a1 = amps[i], a2 = amps[j];
        // Critical bandwidth approximation (Bark scale)
        const fAvg = (f1 + f2) / 2;
        const critBW = 1.72 * Math.pow(fAvg, 0.65);
        const x = Math.abs(f1 - f2) / critBW;
        // Plomp-Levelt roughness function
        const r = a1 * a2 * (Math.exp(-3.5 * x) - Math.exp(-5.75 * x));
        roughness += Math.max(0, r);
      }
    }
    return roughness;
  }

  /**
   * Estimates sensory consonance of a chord using its note frequencies.
   * Returns a value 0 (maximum roughness) to 1 (maximum consonance).
   */
  static sensoryConsonance(chord: Chord): number {
    const notes = chord.getNotes();
    const freqs = notes.map(n => n.frequency);
    const roughness = this.roughnessPlompLevelt(freqs);
    // Normalize: a single note has roughness 0; normalize by number of pairs
    const pairs = (freqs.length * (freqs.length - 1)) / 2;
    if (pairs === 0) return 1;
    return Math.max(0, 1 - roughness / pairs);
  }
}
