import { TILE, DIR } from "../constants.js";
import { Tile } from "../world/tiles.js";
import { TextParticle } from "./particles.js";
import { C } from "../render/palette.js";

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
    this.dir = DIR.DOWN;
    this.walk = 0;
    this.swimTimer = 0;
    // Knockback still owed, one pixel per step.
    this.xk = 0;
    this.yk = 0;
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

  isSwimming() {
    const t = this.level.tileAtPixel(this.x, this.y);
    return t === Tile.water || t === Tile.lava;
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
      if (this.overlapsAt(nx, ny, e) && !this.overlaps(e)) {
        if (e.touchedBy) e.touchedBy(this);
        return false;
      }
    }
    this.x = nx;
    this.y = ny;
    return true;
  }

  // Walking for anything alive: half speed in water, knockback first, and no
  // steering while still flashing from a hit. Returns false only when a real
  // step was tried and blocked.
  walkMove(xa, ya) {
    if (this.isSwimming() && this.swimTimer++ % 2 === 0) return true;
    if (this.xk < 0) {
      this.moveAxis(-1, 0);
      this.xk++;
    }
    if (this.xk > 0) {
      this.moveAxis(1, 0);
      this.xk--;
    }
    if (this.yk < 0) {
      this.moveAxis(0, -1);
      this.yk++;
    }
    if (this.yk > 0) {
      this.moveAxis(0, 1);
      this.yk--;
    }
    if (this.hurtTime > 0) return true;
    if (xa === 0 && ya === 0) return true;
    this.walk++;
    if (xa < 0) this.dir = DIR.LEFT;
    if (xa > 0) this.dir = DIR.RIGHT;
    if (ya < 0) this.dir = DIR.UP;
    if (ya > 0) this.dir = DIR.DOWN;
    const moved = this.move(xa, ya);
    if (moved) this.level.steppedOn(Math.floor(this.x / TILE), Math.floor(this.y / TILE));
    return moved;
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

  knockback(dir, amount = 6) {
    if (dir === DIR.DOWN) this.yk = amount;
    if (dir === DIR.UP) this.yk = -amount;
    if (dir === DIR.LEFT) this.xk = -amount;
    if (dir === DIR.RIGHT) this.xk = amount;
  }

  // `dir` is the direction the blow travels. Returns true if the hit landed
  // (false while still flashing from the last one).
  hurt(amt, dir, game) {
    if (this.hurtTime > 0) return false;
    this.level.add(new TextParticle(amt, this.x, this.y, C(500)));
    this.health -= amt;
    this.knockback(dir);
    this.hurtTime = 10;
    if (this.health <= 0) this.die(game);
    return true;
  }

  die() {
    this.removed = true;
  }

  tick() {
    if (this.hurtTime > 0) this.hurtTime--;
  }
}
