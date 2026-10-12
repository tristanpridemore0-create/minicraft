import { TILE } from "../constants.js";
import { walkable } from "../world/tiles.js";

export class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.xr = 6;
    this.yr = 6;
    this.removed = false;
    this.level = null;
    this.hurtTime = 0;
    this.health = 10;
    this.type = "entity";
  }

  move(xa, ya) {
    if (xa === 0 && ya === 0) return false;
    let moved = false;
    if (xa !== 0) moved = this.moveAxis(xa, 0) || moved;
    if (ya !== 0) moved = this.moveAxis(0, ya) || moved;
    return moved;
  }

  canSwim() {
    return true;
  }

  moveAxis(xa, ya) {
    const nx = this.x + xa;
    const ny = this.y + ya;
    if (this.blocked(nx, ny)) {
      this.bump(nx, ny);
      return false;
    }
    for (const e of this.level.entities) {
      if (e === this || e.removed || !e.blocks) continue;
      if (this.overlapsAt(nx, ny, e)) {
        this.touched(e);
        if (e.type === "furniture" && this.type === "player") e.move(xa, ya);
        if (this.overlapsAt(nx, ny, e)) return false;
      }
    }
    this.x = nx;
    this.y = ny;
    return true;
  }

  blocked(px, py) {
    return this.level.blocked(px, py, this.xr, this.yr, this.canSwim());
  }

  overlapsAt(px, py, e) {
    return px + this.xr > e.x - e.xr && px - this.xr < e.x + e.xr && py + this.yr > e.y - e.yr && py - this.yr < e.y + e.yr;
  }

  overlaps(e) {
    return this.overlapsAt(this.x, this.y, e);
  }

  bump() {}
  touched() {}

  // Returns true if the hit landed (false while still flashing from the last one).
  hurt(amt, srcX, srcY, game) {
    if (this.hurtTime > 0) return false;
    this.health -= amt;
    this.hurtTime = 10;
    const dx = Math.sign(this.x - srcX) || 0;
    const dy = Math.sign(this.y - srcY) || 0;
    this.knock(dx * 4, dy * 4);
    if (this.health <= 0) this.die(game);
    return true;
  }

  knock(xa, ya) {
    for (let i = 0; i < 4; i++) this.move(xa, ya);
  }

  die() {
    this.removed = true;
  }

  tick() {
    if (this.hurtTime > 0) this.hurtTime--;
  }

  facingTile(dir) {
    const ox = dir === 2 ? -8 : dir === 3 ? 8 : 0;
    const oy = dir === 1 ? -8 : dir === 0 ? 8 : 0;
    return { tx: Math.floor((this.x + ox) / TILE), ty: Math.floor((this.y + oy) / TILE) };
  }
}

export function tryStep(level, x, y, xr, yr, canSwim) {
  const x0 = Math.floor((x - xr) / TILE);
  const y0 = Math.floor((y - yr) / TILE);
  const x1 = Math.floor((x + xr) / TILE);
  const y1 = Math.floor((y + yr) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!walkable(level.get(tx, ty), canSwim)) return false;
    }
  }
  return true;
}
