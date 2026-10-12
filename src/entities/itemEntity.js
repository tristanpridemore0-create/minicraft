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
  }

  tick(game) {
    super.tick();
    this.life--;
    if (this.life <= 0) this.removed = true;
    if (this.pickupDelay > 0) this.pickupDelay--;
    this.move(Math.sign(this.vx), Math.sign(this.vy));
    this.vx *= 0.8;
    this.vy *= 0.8;
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
