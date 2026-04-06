import { Note } from './note';
import { Duration, TimeSignature } from './rhythm';

export interface StreamEvent {
  time: number; // Start time in beats
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
    // duration.totalValue is in whole notes. 
    // Multiply by denominator to get beats (e.g., in 4/4, 0.25 * 4 = 1 beat)
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
    // Sort events by time to maintain order
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
