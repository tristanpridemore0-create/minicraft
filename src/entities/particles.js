// Particles are drawn and ticked like entities but never collide with anything,
// so they are plain objects rather than Entity subclasses.

// A damage number that pops up, arcs and bounces before fading.
export class TextParticle {
  constructor(msg, x, y, col) {
    this.type = "text";
    this.msg = String(msg);
    this.col = col;
    this.x = x;
    this.y = y;
    this.xr = 0;
    this.yr = 0;
    this.removed = false;
    this.level = null;
    this.time = 0;
    this.xx = x;
    this.yy = y;
    this.zz = 2;
    this.xa = (Math.random() - 0.5) * 0.6;
    this.ya = (Math.random() - 0.5) * 0.4;
    this.za = Math.random() * 0.7 + 2;
  }

  tick() {
    if (++this.time > 60) this.removed = true;
    this.xx += this.xa;
    this.yy += this.ya;
    this.zz += this.za;
    if (this.zz < 0) {
      this.zz = 0;
      this.za *= -0.5;
      this.xa *= 0.6;
      this.ya *= 0.6;
    }
    this.za -= 0.15;
    this.x = this.xx | 0;
    this.y = this.yy | 0;
  }
}

// A short white burst where something was hit.
export class SmashParticle {
  constructor(x, y) {
    this.type = "smash";
    this.x = x;
    this.y = y;
    this.xr = 0;
    this.yr = 0;
    this.removed = false;
    this.level = null;
    this.time = 0;
  }

  tick() {
    if (++this.time > 10) this.removed = true;
  }
}
