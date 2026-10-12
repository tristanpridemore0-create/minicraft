export class AudioBus {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  unlock() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  beep(freq, dur = 0.08, type = "square", gain = 0.04) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  hit() {
    this.beep(180, 0.06, "square", 0.05);
  }
  swing() {
    this.beep(420, 0.04, "square", 0.03);
  }
  pickup() {
    this.beep(880, 0.07, "square", 0.04);
  }
  craft() {
    this.beep(520, 0.05);
    setTimeout(() => this.beep(740, 0.08), 50);
  }
  hurt() {
    this.beep(120, 0.14, "sawtooth", 0.06);
  }
  death() {
    this.beep(90, 0.4, "sawtooth", 0.07);
  }
  win() {
    this.beep(523, 0.12);
    setTimeout(() => this.beep(659, 0.12), 120);
    setTimeout(() => this.beep(784, 0.25), 240);
  }
}
