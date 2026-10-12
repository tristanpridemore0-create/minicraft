import { Entity } from "./entity.js";

export class ItemEntity extends Entity {
  constructor(x, y, itemId, count = 1) {
    super(x, y);
    this.type = "item";
    this.itemId = itemId;
    this.count = count;
    this.xr = 3;
    this.yr = 3;
    this.life = 60 * 45;
    this.pickupDelay = 20;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.fx = 0;
    this.fy = 0;
    // Height above the ground, for the drop-and-bounce; purely for show.
    this.zz = 2;
    this.za = Math.random() * 0.7 + 1;
  }

  tick(game) {
    super.tick();
    this.life--;
    if (this.life <= 0) this.removed = true;
    if (this.pickupDelay > 0) this.pickupDelay--;
    // Scatter a few pixels and settle. Whole-pixel steps are taken only once
    // enough speed has built up, so a fading velocity really does stop.
    this.fx += this.vx;
    this.fy += this.vy;
    const mx = Math.trunc(this.fx);
    const my = Math.trunc(this.fy);
    if (mx || my) {
      this.move(mx, my);
      this.fx -= mx;
      this.fy -= my;
    }
    this.vx *= 0.8;
    this.vy *= 0.8;
    this.zz += this.za;
    if (this.zz < 0) {
      this.zz = 0;
      this.za *= -0.5;
    }
    this.za -= 0.15;
    if (this.pickupDelay <= 0 && game.player && this.overlaps(game.player)) {
      game.player.inv.add(this.itemId, this.count);
      game.audio.pickup();
      this.removed = true;
    }
  }
}

export function dropItems(level, x, y, drops) {
  for (const d of drops) {
    if (!d || !d.n) continue;
    level.add(new ItemEntity(x + (Math.random() * 6 - 3), y + (Math.random() * 6 - 3), d.id, d.n));
  }
}
