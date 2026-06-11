// Minimal chiptune-style sound effects with WebAudio (no asset files needed).

class Sfx {
  constructor() {
    this.muted = false;
    this.ctx = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur = 0.12, { type = 'square', vol = 0.12, slideTo = null, delay = 0 } = {}) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  collect() {
    this.tone(880, 0.08);
    this.tone(1318, 0.12, { delay: 0.07 });
  }
  chirp() {
    this.tone(1100, 0.07, { slideTo: 1500 });
  }
  foxFlee() {
    this.tone(700, 0.2, { type: 'sawtooth', slideTo: 220, vol: 0.1 });
  }
  eat() {
    this.tone(320, 0.25, { type: 'triangle', slideTo: 130, vol: 0.16 });
  }
  goal() {
    [659, 784, 988].forEach((f, i) => this.tone(f, 0.12, { delay: i * 0.1 }));
  }
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, { delay: i * 0.13, vol: 0.14 }));
  }
}

export const sfx = new Sfx();
