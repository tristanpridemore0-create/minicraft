// One level of the world (the surface, a cave or the sky): its tiles,
// everything standing or lying on it, and the rules for what happens when a
// tile is hit, dug, planted or left to grow.

import { MAP, TILE, TOOL, TIER } from "../constants.js";
import { Tile, solid, liquid, holeLike, walkable } from "./tiles.js";
import { TextParticle, SmashParticle } from "../entities/particles.js";
import { ItemEntity } from "../entities/itemEntity.js";
import { C } from "../render/palette.js";

// A random whole number from 0 to n - 1.
const rnd = (n) => (Math.random() * n) | 0;

// The four tiles next to a tile: left, right, up and down.
const NEIGHBOURS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
// Which item each ore tile gives.
const ORE_ITEM = { [Tile.ironOre]: "ironOre", [Tile.goldOre]: "goldOre", [Tile.gemOre]: "gem" };
const isWheat = (id) => id >= Tile.wheat0 && id <= Tile.wheat3;

// One level. `id` is its number: 1 for the sky, 0 for the surface and -1 to -3
// for the caves.
export class Level {
  // `data` comes from the world generator: the tiles and the size of the map.
  constructor(id, data) {
    this.id = id;
    this.w = data.w;
    this.h = data.h;
    // One number per tile, row after row. tiles.js says what the numbers mean.
    this.tiles = data.tiles;
    // Per-tile extras: `data` is an age (crops, saplings, farmland) or a
    // footprint timer (sand); `hurt` is damage taken so far.
    this.data = new Uint8Array(MAP * MAP);
    this.hurt = new Int16Array(MAP * MAP);
    // Everything on this level that is not a tile: monsters, furniture, dropped
    // items and particles. The player is kept separately, in game.player.
    this.entities = [];
    // Multiplayer: our own monsters, put away while another player's are
    // being shown on this level instead (see netMobs.js).
    this.asleep = [];
    // Build mode: everything breaks on the first hit.
    this.instant = false;
    // Multiplayer: a function to call whenever a tile changes, so the change
    // can be sent to the other players. The Game sets it; it may be null.
    this.onSet = null;
  }

  // Where tile (x, y) sits in the long lists above.
  idx(x, y) {
    return x + y * this.w;
  }

  // Is (x, y) on the map?
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  // The tile at (x, y). Anything off the map counts as rock, so nothing can
  // walk off the edge.
  get(x, y) {
    if (!this.inside(x, y)) return Tile.rock;
    return this.tiles[this.idx(x, y)];
  }

  // The extra number stored for a tile (see `data` above).
  getData(x, y) {
    return this.inside(x, y) ? this.data[this.idx(x, y)] : 0;
  }

  // Change a tile. Its extra number and any damage start again from zero.
  set(x, y, id, data = 0) {
    if (!this.inside(x, y)) return;
    const i = this.idx(x, y);
    this.tiles[i] = id;
    this.data[i] = data;
    this.hurt[i] = 0;
    if (this.onSet) this.onSet(x, y, id, data);
  }

  // Bare ground on this level: what is left when something is dug out.
  floor() {
    return this.id < 0 ? Tile.stoneFloor : Tile.dirt;
  }

  // Would something centred on the pixel (px, py), reaching xr pixels to each
  // side and yr up and down, overlap a tile it cannot walk on? Every tile the
  // box touches is checked.
  blocked(px, py, xr = 5, yr = 5, canSwim = true) {
    const x0 = Math.floor((px - xr) / TILE);
    const y0 = Math.floor((py - yr) / TILE);
    const x1 = Math.floor((px + xr) / TILE);
    const y1 = Math.floor((py + yr) / TILE);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!walkable(this.get(x, y), canSwim)) return true;
      }
    }
    return false;
  }

  // The tile under a pixel position.
  tileAtPixel(px, py) {
    return this.get(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  // Put something on this level.
  add(e) {
    e.level = this;
    this.entities.push(e);
  }

  // Clear out everything that was marked as removed during this tick.
  removeDead() {
    this.entities = this.entities.filter((e) => !e.removed);
  }

  // Everything whose box overlaps the rectangle from (x0, y0) to (x1, y1),
  // leaving out `except` if one is given.
  entitiesIn(x0, y0, x1, y1, except = null) {
    return this.entities.filter((e) => !e.removed && e !== except && e.x + e.xr > x0 && e.x - e.xr < x1 && e.y + e.yr > y0 && e.y - e.yr < y1);
  }

  // Drop `n` single items somewhere inside a tile.
  drop(tx, ty, itemId, n = 1) {
    for (let i = 0; i < n; i++) {
      this.add(new ItemEntity(tx * TILE + rnd(10) + 3, ty * TILE + rnd(10) + 3, itemId, 1));
    }
  }

  // The burst and the floating number shown when a tile is hit.
  hitFx(tx, ty, dmg) {
    this.add(new SmashParticle(tx * TILE + 8, ty * TILE + 8));
    this.add(new TextParticle(dmg, tx * TILE + 8, ty * TILE + 8, C(500)));
  }

  // Add damage to a tile; true once it has taken `need` in total.
  damage(tx, ty, dmg, need) {
    this.hitFx(tx, ty, dmg);
    const i = this.idx(tx, ty);
    this.hurt[i] += dmg;
    return this.instant || this.hurt[i] >= need;
  }

  // A tree takes 20 damage to fell. Each hit has a 1 in 10 chance of shaking an
  // apple loose. Felling it gives 1-2 wood and up to 3 acorns.
  hitTree(tx, ty, dmg) {
    if (rnd(10) === 0) this.drop(tx, ty, "apple");
    if (!this.damage(tx, ty, dmg, 20)) return;
    this.drop(tx, ty, "wood", rnd(2) + 1);
    this.drop(tx, ty, "acorn", rnd(rnd(4) + 1));
    this.set(tx, ty, Tile.grass);
  }

  // Rock gives 1-4 stone and sometimes a piece of coal. `need` is 50 for
  // ordinary rock and 200 for hard rock.
  hitRock(tx, ty, dmg, need) {
    if (!this.damage(tx, ty, dmg, need)) return;
    this.drop(tx, ty, "stone", rnd(4) + 1);
    this.drop(tx, ty, "coal", rnd(2));
    this.set(tx, ty, this.floor());
  }

  // Ore gives a little on most hits and breaks somewhere between the third
  // and twelfth.
  hitOre(tx, ty) {
    const id = this.get(tx, ty);
    const i = this.idx(tx, ty);
    const hits = this.hurt[i] + 1;
    this.hitFx(tx, ty, 1);
    let count = rnd(2);
    if (this.instant || hits >= rnd(10) + 3) {
      this.set(tx, ty, this.floor());
      count += 2;
    } else {
      this.hurt[i] = hits;
    }
    this.drop(tx, ty, ORE_ITEM[id], count);
  }

  // Pull up wheat. Only ripe wheat (age 40 and over) gives any, and fully grown
  // wheat (age 50) gives the most. A seed may come back either way.
  harvest(tx, ty) {
    const age = this.getData(tx, ty);
    this.drop(tx, ty, "seeds", rnd(2));
    if (age >= 50) this.drop(tx, ty, "wheat", rnd(3) + 2);
    else if (age >= 40) this.drop(tx, ty, "wheat", rnd(2) + 1);
    this.set(tx, ty, Tile.dirt);
  }

  // Using a tool on the tile in front. Every swing that does something costs
  // stamina; a better tool costs less.
  interact(tx, ty, player, item) {
    if (!item || item.tool === undefined) return false;
    const id = this.get(tx, ty);
    const tool = item.tool;
    const lvl = item.tier;
    // A wooden tool costs 4 stamina a swing and a gem tool costs nothing extra.
    const cost = 4 - lvl;
    // The damage of a swing with the right tool: 10-19, plus 5 for each tier.
    const swing = () => rnd(10) + lvl * 5 + 10;

    // Shovel: digs up the ground. In each check below payStamina comes last on
    // purpose, so stamina is only spent when the tile is one this tool works
    // on.
    if (tool === TOOL.SHOVEL) {
      if (id === Tile.grass && player.payStamina(cost)) {
        this.set(tx, ty, Tile.dirt);
        if (rnd(5) === 0) this.drop(tx, ty, "seeds");
        return true;
      }
      if ((id === Tile.dirt || id === Tile.stoneFloor) && player.payStamina(cost)) {
        this.set(tx, ty, Tile.hole);
        this.drop(tx, ty, "dirt");
        return true;
      }
      if (id === Tile.sand && player.payStamina(cost)) {
        this.set(tx, ty, this.floor());
        this.drop(tx, ty, "sand");
        return true;
      }
      if ((id === Tile.farm || isWheat(id)) && player.payStamina(cost)) {
        this.set(tx, ty, Tile.dirt);
        return true;
      }
      if (id === Tile.flower && player.payStamina(cost)) {
        this.drop(tx, ty, "flower", 2);
        this.set(tx, ty, Tile.grass);
        return true;
      }
      if (id === Tile.cloud && player.payStamina(5)) {
        this.drop(tx, ty, "cloud", rnd(2) + 1);
        return true;
      }
    }

    // Hoe: turns ground into farmland. On grass, one swing in five turns up
    // seeds instead.
    if (tool === TOOL.HOE) {
      if (id === Tile.grass && player.payStamina(cost)) {
        if (rnd(5) === 0) this.drop(tx, ty, "seeds");
        else this.set(tx, ty, Tile.farm);
        return true;
      }
      if ((id === Tile.dirt || id === Tile.stoneFloor) && player.payStamina(cost)) {
        this.set(tx, ty, Tile.farm);
        return true;
      }
    }

    // Axe: fells trees.
    if (tool === TOOL.AXE && id === Tile.tree && player.payStamina(cost)) {
      this.hitTree(tx, ty, swing());
      return true;
    }

    // Pickaxe: breaks rock and mines ore. Hard rock needs a gem pickaxe.
    if (tool === TOOL.PICK) {
      if (id === Tile.rock && player.payStamina(cost)) {
        this.hitRock(tx, ty, swing(), 50);
        return true;
      }
      if (id === Tile.hardRock && lvl === TIER.GEM && player.payStamina(cost)) {
        this.hitRock(tx, ty, swing(), 200);
        return true;
      }
      if (ORE_ITEM[id] && player.payStamina(6 - lvl)) {
        this.hitOre(tx, ty);
        return true;
      }
      if (id === Tile.cloudCactus && player.payStamina(6 - lvl)) {
        if (this.damage(tx, ty, 1, 10)) this.set(tx, ty, Tile.cloud);
        return true;
      }
    }
    return false;
  }

  // A plain hit: a punch, or a swing with the wrong tool. Returns true if
  // there was anything there to hit.
  hurtTile(tx, ty, dmg) {
    const id = this.get(tx, ty);
    if (id === Tile.tree) this.hitTree(tx, ty, dmg);
    else if (id === Tile.rock) this.hitRock(tx, ty, dmg, 50);
    else if (id === Tile.hardRock || ORE_ITEM[id] || id === Tile.cloudCactus) this.hitFx(tx, ty, 0);
    else if (id === Tile.cactus) {
      if (this.damage(tx, ty, dmg, 10)) {
        this.drop(tx, ty, "cactus", rnd(2) + 1);
        this.set(tx, ty, Tile.sand);
      }
    } else if (id === Tile.flower) {
      this.drop(tx, ty, "flower", rnd(2) + 1);
      this.set(tx, ty, Tile.grass);
    } else if (isWheat(id)) this.harvest(tx, ty);
    else if (id === Tile.sapling) this.set(tx, ty, Tile.grass);
    else if (id === Tile.cactusSapling) this.set(tx, ty, Tile.sand);
    else return false;
    return true;
  }

  // Putting a plantable item down on the tile in front.
  plant(tx, ty, def) {
    const cur = this.get(tx, ty);
    const bare = cur === Tile.dirt || cur === Tile.stoneFloor;
    if (def.place === "flower" && cur === Tile.grass) this.set(tx, ty, Tile.flower);
    else if (def.place === "sapling" && cur === Tile.grass) this.set(tx, ty, Tile.sapling);
    else if (def.place === "cactusSapling" && cur === Tile.sand) this.set(tx, ty, Tile.cactusSapling);
    else if (def.place === "wheat0" && cur === Tile.farm) this.set(tx, ty, Tile.wheat0);
    else if (def.place === "sand" && (cur === Tile.grass || bare)) this.set(tx, ty, Tile.sand);
    else if (def.place === "dirt" && (cur === Tile.hole || liquid(cur))) this.set(tx, ty, this.floor());
    else if (def.place === "cloud" && cur === Tile.fall) this.set(tx, ty, Tile.cloud);
    else return false;
    return true;
  }

  // Something alive just walked onto this tile.
  steppedOn(tx, ty) {
    if (!this.inside(tx, ty)) return;
    const id = this.get(tx, ty);
    const i = this.idx(tx, ty);
    // Walking on sand leaves footprints, which fade in tickTiles below.
    // Farmland and crops can be trampled, but only by one step in 60.
    if (id === Tile.sand) this.data[i] = 10;
    else if (id === Tile.farm) {
      if (rnd(60) === 0 && this.data[i] >= 5) this.set(tx, ty, Tile.dirt);
    } else if (isWheat(id)) {
      if (rnd(60) === 0 && this.data[i] >= 2) this.harvest(tx, ty);
    }
  }

  // The world's slow clock: each game tick a fiftieth of the map, picked at
  // random, gets a turn. This is what grows crops, spreads grass and lets
  // water and lava run into holes.
  //
  // `grow` is false for a player in a multiplayer room who is not the one
  // running this level's clock (see MobShare.runs in netMobs.js). They still fade their own
  // footprints and mend their own half-broken tiles, which nobody else sees,
  // but leave the changes to the world itself to the player who is.
  tickTiles(grow = true) {
    const n = ((this.w * this.h) / 50) | 0;
    for (let k = 0; k < n; k++) {
      const x = rnd(this.w);
      const y = rnd(this.h);
      const i = this.idx(x, y);
      const id = this.tiles[i];
      if (id === Tile.sand) {
        // Footprints fade.
        if (this.data[i] > 0) this.data[i]--;
      } else if (id === Tile.tree || id === Tile.rock || id === Tile.hardRock || id === Tile.cactus) {
        // Half-broken things slowly mend if you stop hitting them.
        if (this.hurt[i] > 0) this.hurt[i]--;
      } else if (!grow) {
        // Everything below changes the world, so it is somebody else's job.
      } else if (id === Tile.grass) {
        // Grass creeps onto a neighbouring dirt tile, one turn in 40.
        if (rnd(40) !== 0) continue;
        const [dx, dy] = NEIGHBOURS[rnd(4)];
        if (this.get(x + dx, y + dy) === Tile.dirt) this.set(x + dx, y + dy, Tile.grass);
      } else if (id === Tile.water || id === Tile.lava) {
        // Water and lava run into a hole beside them.
        const [dx, dy] = NEIGHBOURS[rnd(4)];
        if (this.get(x + dx, y + dy) === Tile.hole) this.set(x + dx, y + dy, id);
      } else if (id === Tile.farm) {
        // Farmland ages up to 5. Only then can it be trampled back to dirt.
        if (this.data[i] < 5) this.data[i]++;
      } else if (isWheat(id)) {
        // Wheat grows from age 0 to 50, and every 10 it moves on to the next of
        // its four pictures.
        if (rnd(2) === 0 && this.data[i] < 50) {
          this.data[i]++;
          const stage = Tile.wheat0 + Math.min(3, (this.data[i] / 10) | 0);
          if (stage !== id) {
            this.tiles[i] = stage;
            // The picture changed, so the other players need to hear of it.
            if (this.onSet) this.onSet(x, y, stage, this.data[i]);
          }
        }
      } else if (id === Tile.sapling || id === Tile.cactusSapling) {
        // A sapling becomes a tree or a cactus after about 100 turns.
        if (++this.data[i] > 100) this.set(x, y, id === Tile.sapling ? Tile.tree : Tile.cactus);
      }
    }
  }
}

// Passed along from tiles.js for convenience.
export { solid, liquid, holeLike };
