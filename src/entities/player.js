// The player: health, stamina, the pack, walking, and what the attack and menu
// keys do.

import { Entity } from "./entity.js";
import { DIR, TILE, MAP } from "../constants.js";
import { Inventory } from "../items/inventory.js";
import { itemDef, attackBonus } from "../items/defs.js";
import { Furniture } from "./furniture.js";
import { Tile, contactDamage, walkable } from "../world/tiles.js";
import { TextParticle } from "./particles.js";
import { C } from "../render/palette.js";

const rnd = (n) => (Math.random() * n) | 0;

// There is one Player, kept in game.player.
export class Player extends Entity {
  // A new player: full health and stamina, a workbench and a power glove in the
  // pack, and empty hands.
  constructor(x, y) {
    super(x, y);
    this.type = "player";
    // Ten hearts and ten stamina bolts.
    this.health = this.maxHealth = 10;
    this.stamina = this.maxStamina = 10;
    // Counts ticks toward the next point of stamina coming back.
    this.staminaRecharge = 0;
    // Counts down after running out of stamina; nothing recharges until it ends.
    this.staminaRechargeDelay = 0;
    this.inv = new Inventory([
      { id: "workbench", count: 1 },
      { id: "powerGlove", count: 1 },
    ]);
    // The item in hand. It lives outside the inventory, and may be nothing.
    this.held = null;
    // attackTime counts down while a swing is on screen. attackDir and
    // attackItem remember which way it went and what was in hand, so it can be
    // drawn.
    this.attackTime = 0;
    this.attackDir = DIR.DOWN;
    this.attackItem = null;
    // How many attacks so far. In multiplayer the other players watch this
    // number to know when to show a swing.
    this.attacks = 0;
    // Counts down after being hurt. Nothing can hurt the player until it
    // reaches zero.
    this.invuln = 0;
    this.tickTime = 0;
    // Stops stairs sending you straight back the moment you arrive.
    this.onStairDelay = 0;
    this.swimming = false;
    // The damage owed for walking into something painful this tick (see bump
    // below).
    this.bumped = null;
    this.score = 0;
    // The id of the armor being worn, or null (see items/defs.js).
    this.armor = null;
    // Build mode: nothing hurts, nothing tires you, nothing runs out.
    this.build = false;
    this.xr = 4;
    this.yr = 3;
  }

  // The full description of the item in hand, from items/defs.js, or null.
  activeItem() {
    return this.held ? itemDef(this.held.id) : null;
  }

  // The item in hand as a slot, { id, count, extra }, or null.
  activeSlot() {
    return this.held;
  }

  // Is the player carrying a lantern, in hand or anywhere in the pack? It
  // lights the way in caves either way, so you can hold a sword and still see.
  hasLantern() {
    return (this.held && this.held.id === "lantern") || this.inv.has("lantern");
  }

  // The player can swim.
  canSwim() {
    return true;
  }

  // Spend stamina if there is enough, and say whether there was.
  payStamina(cost) {
    if (this.build) return true;
    if (cost > this.stamina) return false;
    if (cost > 0) this.stamina -= cost;
    return true;
  }

  // Use up one of whatever is in hand.
  spendHeld() {
    if (this.build) return;
    if (this.held && --this.held.count <= 0) this.held = null;
  }

  // Take damage, unless protected. `dir` is the way the blow is travelling,
  // which is the way the player gets knocked.
  //
  // `fight` is true for a blow from a monster, the Air Wizard or a spark. Armor
  // takes something off those, though never so much that the blow comes to
  // less than 1. It does nothing against lava, cactus, ore or drowning.
  hurtFrom(amt, dir, game, fight = false) {
    if (this.build || this.invuln > 0 || this.hurtTime > 0 || game.dead) return;
    if (fight && this.armor) amt = Math.max(1, amt - itemDef(this.armor).armor);
    this.health -= amt;
    this.level.add(new TextParticle(amt, this.x, this.y, C(504)));
    this.knockback(dir);
    this.hurtTime = 10;
    this.invuln = 30;
    game.audio.hurt();
    if (this.health <= 0) {
      this.health = 0;
      game.dead = true;
      game.audio.death();
    }
  }

  // Gain health, up to the maximum, with a green number floating up.
  heal(amt) {
    this.level.add(new TextParticle(amt, this.x, this.y, C(50)));
    this.health = Math.min(this.maxHealth, this.health + amt);
  }

  // Everything the player does in one tick.
  tick(game) {
    super.tick();
    this.tickTime++;
    if (this.invuln > 0) this.invuln--;
    if (this.attackTime > 0) this.attackTime--;

    const tile = this.level.tileAtPixel(this.x, this.y);
    this.swimming = tile === Tile.water || tile === Tile.lava;
    if (tile === Tile.lava) this.hurtFrom(4, this.dir ^ 1, game);

    this.checkStairs(game, tile);

    // Hitting zero stamina means a 40-tick wait before any comes back.
    if (this.stamina <= 0 && this.staminaRechargeDelay === 0 && this.staminaRecharge === 0) {
      this.staminaRechargeDelay = 40;
    }
    if (this.staminaRechargeDelay > 0) this.staminaRechargeDelay--;
    // Otherwise a point comes back every 10 ticks. Swimming and attacking both
    // start that count again.
    if (this.staminaRechargeDelay === 0) {
      this.staminaRecharge++;
      if (this.swimming) this.staminaRecharge = 0;
      while (this.staminaRecharge > 10) {
        this.staminaRecharge -= 10;
        if (this.stamina < this.maxStamina) this.stamina++;
      }
    }

    // Which way the player wants to go: -1, 0 or 1 across, and the same up and
    // down.
    let xa = 0;
    let ya = 0;
    if (game.input.held("up")) ya--;
    if (game.input.held("down")) ya++;
    if (game.input.held("left")) xa--;
    if (game.input.held("right")) xa++;

    // Swimming costs a point of stamina a second, then a point of health.
    if (!this.build && this.swimming && this.tickTime % 60 === 0) {
      if (this.stamina > 0) this.stamina--;
      else this.hurtFrom(1, this.dir ^ 1, game);
    }

    // While worn out you only move every other tick.
    if (this.staminaRechargeDelay % 2 === 0) {
      this.bumped = null;
      this.walkMove(xa, ya);
      // Walking into a cactus or an ore vein hurts; standing beside one does not.
      if (this.bumped) this.hurtFrom(this.bumped, this.dir ^ 1, game);
    }

    // Every attack costs a point of stamina, whatever it hits.
    if (game.input.just("attack") && this.stamina > 0) {
      if (!this.build) this.stamina--;
      this.staminaRecharge = 0;
      this.attack(game);
    }

    if (game.input.just("menu")) game.tryUseOrMenu();
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
        if (dmg && (!this.bumped || dmg > this.bumped)) this.bumped = dmg;
      }
    }
  }

  // Standing on stairs changes level, once. The delay stops it happening again
  // until you have stepped off for a moment.
  checkStairs(game, tile) {
    if (tile !== Tile.stairsDown && tile !== Tile.stairsUp) {
      if (this.onStairDelay > 0) this.onStairDelay--;
      return;
    }
    if (this.onStairDelay === 0) game.changeLevel(tile === Tile.stairsUp ? 1 : -1);
    this.onStairDelay = 10;
  }

  // The area just in front of the player, `range` pixels deep.
  // Given as [left, top, right, bottom], ready to hand to level.entitiesIn().
  frontBox(range) {
    const { x } = this;
    const y = this.y - 2;
    if (this.dir === DIR.DOWN) return [x - 8, y + 4, x + 8, y + range];
    if (this.dir === DIR.UP) return [x - 8, y - range, x + 8, y - 4];
    if (this.dir === DIR.RIGHT) return [x + 4, y - 8, x + range, y + 8];
    return [x - range, y - 8, x - 4, y + 8];
  }

  // The tile the player is facing, 12 pixels ahead.
  frontTile() {
    let px = this.x;
    let py = this.y - 2;
    if (this.dir === DIR.DOWN) py += 12;
    if (this.dir === DIR.UP) py -= 12;
    if (this.dir === DIR.LEFT) px -= 12;
    if (this.dir === DIR.RIGHT) px += 12;
    return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) };
  }

  // The attack key does whatever the item in hand is for. Only when that
  // comes to nothing, and only bare-handed or with a tool, does it hit.
  attack(game) {
    // Flip to the other walking picture, which gives the swing a small lurch.
    this.walk += 8;
    this.attacks++;
    this.attackDir = this.dir;
    const item = this.activeItem();
    this.attackItem = this.held ? this.held.id : null;
    const level = this.level;
    const { tx, ty } = this.frontTile();
    const inMap = tx >= 0 && ty >= 0 && tx < MAP && ty < MAP;

    // First try using the item in hand for what it is for.
    if (item) {
      this.attackTime = 10;
      if (item.id === "powerGlove") {
        const furn = level.entitiesIn(...this.frontBox(12), this).find((e) => e.type === "furniture");
        if (furn) {
          // The glove goes back in the pack and the furniture comes to hand.
          furn.removed = true;
          game.net.furnitureRemoved(furn);
          this.inv.putFront(this.held);
          this.held = { id: furn.kind, count: 1, extra: furn.inv ? furn.inv.toJSON() : null };
          game.audio.pickup();
          return;
        }
      }
      if (inMap && (this.useHeldOn(tx, ty, item, game) || level.interact(tx, ty, this, item))) {
        game.audio.hit();
        return;
      }
    }

    // Holding something that is not a tool, wood for instance, with no use for
    // it here: just swing at the air.
    if (item && item.tool === undefined) {
      game.audio.swing();
      return;
    }

    // A plain hit: 1-3 damage to whatever is in front, plus the weapon's bonus
    // against monsters.
    this.attackTime = 5;
    let hit = false;
    for (const e of level.entitiesIn(...this.frontBox(20), this)) {
      if (e.type !== "mob" && e.type !== "wizard") continue;
      e.hurt(rnd(3) + 1 + attackBonus(item), this.attackDir, game);
      hit = true;
    }
    if (inMap && level.hurtTile(tx, ty, rnd(3) + 1)) hit = true;
    game.audio[hit ? "hit" : "swing"]();
  }

  // Putting down, planting or eating the item in hand.
  useHeldOn(tx, ty, item, game) {
    const level = this.level;
    // Furniture goes down in the middle of the tile, if the tile is free.
    if (item.kind === "furniture") {
      const cx = tx * TILE + 8;
      const cy = ty * TILE + 8;
      const taken = level.entitiesIn(cx - 3, cy - 3, cx + 3, cy + 3).some((e) => e.type === "furniture");
      if (taken || !walkable(level.get(tx, ty), false)) return false;
      const made = new Furniture(cx, cy, item.furniture, this.held.extra || []);
      level.add(made);
      game.net.furnitureAdded(made);
      this.spendHeld();
      return true;
    }
    // Armor goes on, and whatever was being worn goes back in the pack.
    if (item.kind === "armor") {
      if (this.armor) this.inv.putFront({ id: this.armor, count: 1 });
      this.armor = item.id;
      this.held = null;
      return true;
    }
    // Food only works when hurt, and costs stamina to eat.
    if (item.kind === "food") {
      if (this.health >= this.maxHealth || !this.payStamina(item.staminaCost)) return false;
      this.heal(item.heal);
      this.spendHeld();
      return true;
    }
    // Build mode only: stone goes down as a wall on open ground.
    if (this.build && item.id === "stone") {
      const here = level.get(tx, ty);
      const open = here === Tile.grass || here === Tile.dirt || here === Tile.stoneFloor || here === Tile.sand;
      const cx = tx * TILE + 8;
      const cy = ty * TILE + 8;
      if (!open || level.entitiesIn(cx - 8, cy - 8, cx + 8, cy + 8).some((e) => e.type === "furniture")) return false;
      level.set(tx, ty, Tile.rock);
      return true;
    }
    if (item.kind === "place") {
      if (!level.plant(tx, ty, item)) return false;
      this.spendHeld();
      return true;
    }
    return false;
  }

  // The menu key: open whatever furniture is in front. False if there is none.
  use(game) {
    const furn = this.level.entitiesIn(...this.frontBox(12), this).find((e) => e.type === "furniture" && e.kind !== "lantern");
    if (!furn) return false;
    game.openStation(furn);
    return true;
  }
}
