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
  meow() {
    this.tone(820, 0.14, { type: 'triangle', slideTo: 1250, vol: 0.13 });
    this.tone(1250, 0.22, { type: 'triangle', slideTo: 650, vol: 0.1, delay: 0.13 });
  }
  door() {
    this.tone(140, 0.6, { type: 'sawtooth', slideTo: 320, vol: 0.05 });
  }
  // a cute rising pentatonic note per boba entering the farm
  parade(i) {
    const notes = [659, 740, 880, 988, 1109];
    this.tone(notes[i % notes.length], 0.07, { vol: 0.06 });
  }
  kiss() {
    this.tone(1500, 0.08, { type: 'sine', slideTo: 900, vol: 0.12 });
    this.tone(900, 0.12, { type: 'sine', slideTo: 1400, vol: 0.1, delay: 0.09 });
    [1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.16, { vol: 0.08, delay: 0.25 + i * 0.09 }));
  }
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, { delay: i * 0.13, vol: 0.14 }));
  }
}

export const sfx = new Sfx();
