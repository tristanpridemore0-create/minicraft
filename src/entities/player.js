import { Entity } from "./entity.js";
import { DIR, TILE } from "../constants.js";
import { Inventory } from "../items/inventory.js";
import { itemDef } from "../items/defs.js";
import { playerAttack } from "../combat/combat.js";
import { Furniture } from "./furniture.js";
import { Tile, contactDamage } from "../world/tiles.js";
import { TextParticle } from "./particles.js";
import { C } from "../render/palette.js";

export class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.type = "player";
    this.health = 10;
    this.maxHealth = 10;
    this.stamina = 10;
    this.maxStamina = 10;
    this.staminaRecharge = 0;
    this.dir = DIR.DOWN;
    this.inv = new Inventory([
      { id: "powerGlove", count: 1 },
      { id: "workbench", count: 1 },
    ]);
    this.active = 0;
    this.attackTime = 0;
    this.invuln = 0;
    this.walk = 0;
    this.swimming = false;
    this.bumped = null;
    this.xr = 5;
    this.yr = 6;
  }

  activeItem() {
    const s = this.inv.slots[this.active];
    return s ? itemDef(s.id) : null;
  }

  activeSlot() {
    return this.inv.slots[this.active] || null;
  }

  canSwim() {
    return true;
  }

  hurtFrom(amt, sx, sy, game) {
    if (this.invuln > 0 || this.hurtTime > 0) return;
    this.health -= amt;
    this.hurtTime = 10;
    this.invuln = 30;
    this.level.add(new TextParticle(amt, this.x, this.y, C(504)));
    game.audio.hurt();
    this.knock(Math.sign(this.x - sx) * 3, Math.sign(this.y - sy) * 3);
    if (this.health <= 0) {
      this.health = 0;
      game.dead = true;
      game.audio.death();
    }
  }

  tick(game) {
    super.tick();
    if (this.invuln > 0) this.invuln--;
    if (this.attackTime > 0) this.attackTime--;

    const env = this.level.liquidAt(this.x, this.y);
    const swimming = env.water;
    this.swimming = swimming;
    if (env.lava && this.invuln === 0) this.hurtFrom(3, this.x, this.y, game);

    if (swimming) {
      this.staminaRecharge = 0;
      if (game.tick % 10 === 0) {
        if (this.stamina > 0) this.stamina--;
        else if (this.invuln === 0) this.hurtFrom(1, this.x, this.y, game);
      }
    } else if (this.attackTime === 0) {
      this.staminaRecharge++;
      if (this.staminaRecharge > 8 && this.stamina < this.maxStamina) {
        this.stamina++;
        this.staminaRecharge = 0;
      }
    }

    let xa = 0;
    let ya = 0;
    if (game.input.held("up")) ya--;
    if (game.input.held("down")) ya++;
    if (game.input.held("left")) xa--;
    if (game.input.held("right")) xa++;
    if (this.stamina <= 0 && swimming) {
      xa = 0;
      ya = 0;
    } else if (this.stamina <= 0) {
      if (game.tick % 2 !== 0) {
        xa = 0;
        ya = 0;
      }
    }
    if (ya > 0) this.dir = DIR.DOWN;
    else if (ya < 0) this.dir = DIR.UP;
    else if (xa < 0) this.dir = DIR.LEFT;
    else if (xa > 0) this.dir = DIR.RIGHT;
    if (xa || ya) {
      this.bumped = null;
      this.move(xa, ya);
      this.walk++;
      // Walking into a cactus or an ore vein hurts; standing beside one does not.
      if (this.bumped) this.hurtFrom(this.bumped.dmg, this.bumped.x, this.bumped.y, game);
    }

    if (game.input.just("attack") && this.attackTime === 0 && this.stamina > 0) {
      const item = this.activeItem();
      const cost = item && item.stamina ? item.stamina : 1;
      this.attackTime = 10;
      this.stamina = Math.max(0, this.stamina - Math.min(cost, this.stamina));
      playerAttack(game, this);
    }

    if (game.input.just("menu")) game.tryUseOrMenu();

    this.checkStairs(game);
  }

  // Called by move() when a step is blocked: note the most harmful tile touched.
  bump(nx, ny) {
    const x0 = Math.floor((nx - this.xr) / TILE);
    const y0 = Math.floor((ny - this.yr) / TILE);
    const x1 = Math.floor((nx + this.xr) / TILE);
    const y1 = Math.floor((ny + this.yr) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const dmg = contactDamage(this.level.get(tx, ty));
        if (dmg && (!this.bumped || dmg > this.bumped.dmg)) this.bumped = { dmg, x: tx * TILE + 8, y: ty * TILE + 8 };
      }
    }
  }

  checkStairs(game) {
    const t = this.level.tileAtPixel(this.x, this.y);
    const on = t === Tile.stairsDown || t === Tile.stairsUp;
    if (!on) {
      game.stairLock = 0;
      return;
    }
    if (t === Tile.stairsDown) {
      const dest = this.level.id - 1;
      if (game.levels[dest]) game.changeLevel(dest, this.x, this.y);
    } else if (t === Tile.stairsUp) {
      const dest = this.level.id + 1;
      if (game.levels[dest]) game.changeLevel(dest, this.x, this.y);
    }
  }

  useFacing(game) {
    const item = this.activeItem();
    const slot = this.activeSlot();
    const { tx, ty } = this.facingTile(this.dir);
    const px = tx * TILE + 8;
    const py = ty * TILE + 8;

    const furn = this.level.entities.find(
      (e) => e.type === "furniture" && !e.removed && Math.abs(e.x - px) < 14 && Math.abs(e.y - py) < 14
    );

    if (item && item.id === "powerGlove" && furn) {
      this.inv.add(furn.kind, 1, furn.kind === "chest" ? furn.inv.toJSON() : null);
      furn.removed = true;
      this.active = this.inv.slots.length - 1;
      return true;
    }

    if (item && item.kind === "furniture") {
      if (!this.level.blocked(px, py, 6, 6, true)) {
        const extra = slot.extra;
        this.inv.takeAt(this.active);
        this.level.add(new Furniture(px, py, item.furniture, extra || []));
        if (this.active >= this.inv.slots.length) this.active = Math.max(0, this.inv.slots.length - 1);
        return true;
      }
    }

    if (item && item.kind === "place") {
      if (this.level.placeItem(tx, ty, item.id)) {
        this.inv.takeAt(this.active);
        if (this.active >= this.inv.slots.length) this.active = Math.max(0, this.inv.slots.length - 1);
        return true;
      }
    }

    if (item && item.kind === "food") {
      if (this.stamina >= item.staminaCost && this.health < this.maxHealth) {
        this.stamina -= item.staminaCost;
        this.health = Math.min(this.maxHealth, this.health + item.heal);
        this.inv.takeAt(this.active);
        if (this.active >= this.inv.slots.length) this.active = Math.max(0, this.inv.slots.length - 1);
        return true;
      }
    }

    if (furn && furn.kind !== "lantern") {
      game.openStation(furn);
      return true;
    }
    return false;
  }
}
