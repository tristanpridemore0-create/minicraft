// An item lying on the ground, waiting to be picked up.

import { Entity } from "./entity.js";

// A random number that is usually near 0 and only rarely far from it (a bell
// curve). It makes most drops land close by while a few fly further.
function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// `itemId` is which item it is and `count` how many are in the pile.
export class ItemEntity extends Entity {
  // Created at the spot where something dropped it.
  constructor(x, y, itemId, count = 1) {
    super(x, y);
    this.type = "item";
    this.itemId = itemId;
    this.count = count;
    this.xr = 3;
    this.yr = 3;
    this.time = 0;
    // Items vanish after 10 to 11 seconds if nobody picks them up.
    this.lifeTime = 600 + ((Math.random() * 60) | 0);
    // Exact position, and height above the ground for the drop-and-bounce.
    this.xx = x;
    this.yy = y;
    this.zz = 2;
    // Starting speed: a small random drift sideways and a toss upward.
    this.xa = gaussian() * 0.3;
    this.ya = gaussian() * 0.2;
    this.za = Math.random() * 0.7 + 1;
  }

  // Fly, bounce and settle, then be picked up or fade away.
  tick(game) {
    if (++this.time >= this.lifeTime) {
      this.removed = true;
      return;
    }
    this.xx += this.xa;
    this.yy += this.ya;
    this.zz += this.za;
    // It has hit the ground: bounce half as high and lose some sideways speed.
    if (this.zz < 0) {
      this.zz = 0;
      this.za *= -0.5;
      this.xa *= 0.6;
      this.ya *= 0.6;
    }
    // Gravity.
    this.za -= 0.15;
    // Take whole-pixel steps toward the exact position; if a wall stops us,
    // pull the exact position back to where we really are.
    const ox = this.x;
    const oy = this.y;
    const wantX = (this.xx | 0) - ox;
    const wantY = (this.yy | 0) - oy;
    this.move(wantX, wantY);
    this.xx += this.x - ox - wantX;
    this.yy += this.y - oy - wantY;

    const p = game.player;
    // After half a second, the player picks it up by touching it. Each pickup
    // is worth one point.
    if (this.time > 30 && p && !game.dead && this.overlaps(p)) {
      p.inv.add(this.itemId, this.count);
      p.score++;
      game.audio.pickup();
      this.removed = true;
    }
  }
}

// Scatter drops around a point, each within a few pixels of it.
export function dropItems(level, x, y, drops) {
  for (const d of drops) {
    if (!d || !d.n) continue;
    for (let i = 0; i < d.n; i++) {
      level.add(new ItemEntity(x + ((Math.random() * 11) | 0) - 5, y + ((Math.random() * 11) | 0) - 5, d.id, 1));
    }
  }
}
