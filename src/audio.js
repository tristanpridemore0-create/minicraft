// Sound effects, made on the spot from simple tones. There are no sound files.

// Makes and plays the tones.
export class AudioBus {
  // `ctx` is the browser's sound system. It stays empty until unlock() is
  // called.
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // Browsers will not let a page make sound until the player has pressed or
  // tapped something. This is called on the first key press or touch to switch
  // sound on.
  unlock() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  // Play one tone. `freq` is the pitch in hertz (higher is squeakier), `dur`
  // the length in seconds, `type` the shape of the wave ("square" is the
  // classic buzzy game sound, "sawtooth" is harsher) and `gain` the volume.
  beep(freq, dur = 0.08, type = "square", gain = 0.04) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    // Fade to almost nothing by the end, so the tone does not stop with a
    // click.
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // Tone, then volume control, then speakers.
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  // One method per game sound. Each is a tone or two with its own pitch and
  // length.
  hit() {
    this.beep(180, 0.06, "square", 0.05);
  }
  // A swing that hits nothing.
  swing() {
    this.beep(420, 0.04, "square", 0.03);
  }
  // Picking an item up.
  pickup() {
    this.beep(880, 0.07, "square", 0.04);
  }
  // Crafting: two rising notes.
  craft() {
    this.beep(520, 0.05);
    setTimeout(() => this.beep(740, 0.08), 50);
  }
  // The player being hurt.
  hurt() {
    this.beep(120, 0.14, "sawtooth", 0.06);
  }
  // The player dying: one long low tone.
  death() {
    this.beep(90, 0.4, "sawtooth", 0.07);
  }
  // Winning: three rising notes.
  win() {
    this.beep(523, 0.12);
    setTimeout(() => this.beep(659, 0.12), 120);
    setTimeout(() => this.beep(784, 0.25), 240);
  }
}
