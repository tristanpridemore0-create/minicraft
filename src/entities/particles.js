// Particles are drawn and ticked like entities but never collide with anything,
// so they are plain objects rather than Entity subclasses.

// A damage number that pops up, arcs and bounces before fading.
export class TextParticle {
  // `msg` is the text to show and `col` its colour.
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
    // Exact position and height, and the speed in each direction. It is tossed
    // upward and drifts a little sideways.
    this.xx = x;
    this.yy = y;
    this.zz = 2;
    this.xa = (Math.random() - 0.5) * 0.6;
    this.ya = (Math.random() - 0.5) * 0.4;
    this.za = Math.random() * 0.7 + 2;
  }

  // Fly up, fall and bounce, then disappear.
  tick() {
    // Gone after one second.
    if (++this.time > 60) this.removed = true;
    this.xx += this.xa;
    this.yy += this.ya;
    this.zz += this.za;
    // Bounce off the ground, losing height and speed each time.
    if (this.zz < 0) {
      this.zz = 0;
      this.za *= -0.5;
      this.xa *= 0.6;
      this.ya *= 0.6;
    }
    // Gravity.
    this.za -= 0.15;
    this.x = this.xx | 0;
    this.y = this.yy | 0;
  }
}

// A short white burst where something was hit.
export class SmashParticle {
  // It does not move, so it only needs a position.
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

  // Gone after a sixth of a second.
  tick() {
    if (++this.time > 10) this.removed = true;
  }
}
