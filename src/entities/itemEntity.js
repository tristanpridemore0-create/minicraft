import { Entity } from "./entity.js";

function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class ItemEntity extends Entity {
  constructor(x, y, itemId, count = 1) {
    super(x, y);
    this.type = "item";
    this.itemId = itemId;
    this.count = count;
    this.xr = 3;
    this.yr = 3;
    this.time = 0;
    this.lifeTime = 600 + ((Math.random() * 60) | 0);
    // Exact position, and height above the ground for the drop-and-bounce.
    this.xx = x;
    this.yy = y;
    this.zz = 2;
    this.xa = gaussian() * 0.3;
    this.ya = gaussian() * 0.2;
    this.za = Math.random() * 0.7 + 1;
  }

  tick(game) {
    if (++this.time >= this.lifeTime) {
      this.removed = true;
      return;
    }
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
