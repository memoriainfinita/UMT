export class Synth {
  ctx: AudioContext | null = null;
  oscillators: Map<number, OscillatorNode> = new Map();
  gainNodes: Map<number, GainNode> = new Map();
  masterGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.2; // Master volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNote(id: number, frequency: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    this.stopNote(id);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();

    this.oscillators.set(id, osc);
    this.gainNodes.set(id, gain);
  }

  stopNote(id: number) {
    if (!this.ctx) return;
    const osc = this.oscillators.get(id);
    const gain = this.gainNodes.get(id);

    if (osc && gain) {
      gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.stop(this.ctx.currentTime + 0.1);
      
      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
      }, 100);

      this.oscillators.delete(id);
      this.gainNodes.delete(id);
    }
  }
}

export const synth = new Synth();
