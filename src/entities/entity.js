// The basics shared by everything that moves around a level: the player,
// monsters, furniture and dropped items. Each of those is a class that `extends
// Entity`, which means it gets everything in here for free and adds or replaces
// what it needs.

import { TILE, DIR } from "../constants.js";
import { Tile } from "../world/tiles.js";
import { TextParticle } from "./particles.js";
import { C } from "../render/palette.js";

// The base class. Player, Mob, AirWizard, Spark, Furniture and ItemEntity all
// build on it.
export class Entity {
  // Every entity starts at a position. The rest are sensible defaults that
  // subclasses change.
  constructor(x, y) {
    // Position in pixels, measured to the middle of the thing.
    this.x = x;
    this.y = y;
    // Half its width and half its height, for collisions: it reaches xr pixels
    // to the left and right of x, and yr above and below y.
    this.xr = 6;
    this.yr = 6;
    // Set to true to have it taken off the level at the end of the tick.
    this.removed = false;
    this.level = null;
    // Counts down after being hit. While it is above zero the thing flashes
    // white and cannot be hit again.
    this.hurtTime = 0;
    this.health = 10;
    // What kind of thing this is. Other code checks it, for example the
    // renderer when choosing how to draw it.
    this.type = "entity";
    this.dir = DIR.DOWN;
    // How far it has walked, used to pick the walking picture.
    this.walk = 0;
    this.swimTimer = 0;
    // Knockback still owed, one pixel per step.
    this.xk = 0;
    this.yk = 0;
  }

  // Try to move by (xa, ya) pixels. Sideways and up/down are tried separately,
  // so walking diagonally into a wall still slides along it. Returns true if it
  // moved at all.
  move(xa, ya) {
    if (xa === 0 && ya === 0) return false;
    let moved = false;
    if (xa !== 0) moved = this.moveAxis(xa, 0) || moved;
    if (ya !== 0) moved = this.moveAxis(0, ya) || moved;
    return moved;
  }

  // Can it go into water? Subclasses replace this.
  canSwim() {
    return true;
  }

  // Is it standing in water or lava right now?
  isSwimming() {
    const t = this.level.tileAtPixel(this.x, this.y);
    return t === Tile.water || t === Tile.lava;
  }

  // One step in one direction. It fails if a tile is in the way (bump() is
  // told, so the player can be hurt by a cactus) or if something solid such as
  // furniture is (which is told it was touched, so it can be pushed).
  moveAxis(xa, ya) {
    const nx = this.x + xa;
    const ny = this.y + ya;
    if (this.blocked(nx, ny)) {
      this.bump(nx, ny);
      return false;
    }
    for (const e of this.level.entities) {
      if (e === this || e.removed || !e.blocks) continue;
      // Only blocked when the step would start an overlap. If the two already
      // overlap, let it walk back out.
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
    // In water, skip every other step.
    if (this.isSwimming() && this.swimTimer++ % 2 === 0) return true;
    // Pay off any knockback, a pixel at a time.
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
    // Still reeling from a hit: no walking.
    if (this.hurtTime > 0) return true;
    if (xa === 0 && ya === 0) return true;
    this.walk++;
    // Face the way it is heading.
    if (xa < 0) this.dir = DIR.LEFT;
    if (xa > 0) this.dir = DIR.RIGHT;
    if (ya < 0) this.dir = DIR.UP;
    if (ya > 0) this.dir = DIR.DOWN;
    const moved = this.move(xa, ya);
    if (moved) this.level.steppedOn(Math.floor(this.x / TILE), Math.floor(this.y / TILE));
    return moved;
  }

  // Would its box overlap a tile it cannot walk on, if it stood at (px, py)?
  blocked(px, py) {
    return this.level.blocked(px, py, this.xr, this.yr, this.canSwim());
  }

  // Would its box overlap another entity's box, if it stood at (px, py)?
  overlapsAt(px, py, e) {
    return px + this.xr > e.x - e.xr && px - this.xr < e.x + e.xr && py + this.yr > e.y - e.yr && py - this.yr < e.y + e.yr;
  }

  // Does it overlap another entity where it stands now?
  overlaps(e) {
    return this.overlapsAt(this.x, this.y, e);
  }

  // Called when a tile blocks a step. It does nothing here; the player replaces
  // it.
  bump() {}

  // Shove this thing `amount` pixels in a direction. The push is stored and
  // paid off one pixel per step in walkMove().
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

  // Mark it for removal. Subclasses add drops, score and so on.
  die() {
    this.removed = true;
  }

  // Called once per game tick, 60 times a second. Subclasses add their own
  // behaviour and call this as well.
  tick() {
    if (this.hurtTime > 0) this.hurtTime--;
  }
}
