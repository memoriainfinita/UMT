/**
 * Tests for lib/music-theory/scala.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseScala } from '../../lib/music-theory/scala';

describe('parseScala', () => {
  it('an empty description line is the description', () => {
    const t = parseScala('! empty description\n\n2\n3/2\n2/1\n');
    expect(t.name).toBe('');
    expect(t.octaveSteps).toBe(2);
    expect(t.getInterval(1).cents).toBeCloseTo(701.955, 2);
  });

  it('fewer pitches than declared throws', () => {
    expect(() => parseScala('short\n3\n3/2\n2/1\n')).toThrow(/3 notes declared, 2 found/);
  });
});
