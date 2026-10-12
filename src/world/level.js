import { MAP, TILE } from "../constants.js";
import { Tile, solid, liquid, holeLike, walkable, floorOf, tileHp, harvestKind } from "./tiles.js";
import { TextParticle, SmashParticle } from "../entities/particles.js";
import { C } from "../render/palette.js";
import { TOOL } from "../constants.js";
import { canMineHardRock, canMineOre, toolBonus, itemDef } from "../items/defs.js";

export class Level {
  constructor(id, data) {
    this.id = id;
    this.w = data.w;
    this.h = data.h;
    this.tiles = data.tiles;
    this.hurt = new Int16Array(MAP * MAP);
    this.entities = [];
    this.tick = 0;
  }

  idx(x, y) {
    return x + y * this.w;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return Tile.rock;
    return this.tiles[this.idx(x, y)];
  }

  set(x, y, id) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.tiles[this.idx(x, y)] = id;
    this.hurt[this.idx(x, y)] = 0;
  }

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

  tileAtPixel(px, py) {
    return this.get(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  add(e) {
    e.level = this;
    this.entities.push(e);
  }

  removeDead() {
    this.entities = this.entities.filter((e) => !e.removed);
  }

  entitiesIn(x0, y0, x1, y1, except = null) {
    return this.entities.filter((e) => !e.removed && e !== except && e.x + e.xr > x0 && e.x - e.xr < x1 && e.y + e.yr > y0 && e.y - e.yr < y1);
  }

  tryHitTile(tx, ty, player, drops) {
    const id = this.get(tx, ty);
    if (id === Tile.stairsDown || id === Tile.stairsUp) return false;
    const item = player.activeItem();
    const kind = harvestKind(id);
    if (id === Tile.hardRock && !canMineHardRock(item)) return false;
    if (kind === "ore" && !canMineOre(item)) return false;

    if (id === Tile.grass && item && item.tool === TOOL.HOE) {
      this.set(tx, ty, Tile.farm);
      if (Math.random() < 0.15) drops.push({ id: "seeds", n: 1 });
      return true;
    }
    if ((id === Tile.dirt || id === Tile.stoneFloor) && item && item.tool === TOOL.HOE) {
      this.set(tx, ty, Tile.farm);
      return true;
    }
    if ((id === Tile.grass || id === Tile.dirt || id === Tile.sand || id === Tile.stoneFloor || id === Tile.farm) && item && item.tool === TOOL.SHOVEL) {
      if (id === Tile.grass && Math.random() < 0.1) drops.push({ id: "seeds", n: 1 });
      if (id === Tile.sand) drops.push({ id: "sand", n: 1 });
      else drops.push({ id: "dirt", n: 1 });
      this.set(tx, ty, Tile.hole);
      return true;
    }
    if (id === Tile.cloud && item && item.tool === TOOL.SHOVEL) {
      drops.push({ id: "cloud", n: 1 });
      return true;
    }
    if (id === Tile.flower) {
      drops.push({ id: "flower", n: 1 + ((Math.random() < 0.5) | 0) });
      this.set(tx, ty, Tile.grass);
      return true;
    }
    if (id === Tile.wheat0 || id === Tile.wheat1 || id === Tile.wheat2 || id === Tile.wheat3) {
      drops.push({ id: "seeds", n: 1 });
      if (id === Tile.wheat3) drops.push({ id: "wheat", n: 1 + ((Math.random() < 0.5) | 0) });
      this.set(tx, ty, Tile.dirt);
      return true;
    }
    if (id === Tile.sapling || id === Tile.cactusSapling) {
      this.set(tx, ty, floorOf(id));
      return true;
    }

    const hpMax = tileHp(id);
    if (hpMax <= 1 && !solid(id)) return false;

    let dmg = 1 + toolBonus(item, kind);
    if (player.stamina >= player.maxStamina - 1) dmg += 1;
    this.hurt[this.idx(tx, ty)] += dmg;
    this.add(new SmashParticle(tx * TILE + 8, ty * TILE + 8));
    this.add(new TextParticle(dmg, tx * TILE + 8, ty * TILE + 8, C(500)));

    if (kind === "tree" && Math.random() < 0.08) drops.push({ id: "apple", n: 1 });
    if (kind === "ore" && Math.random() < 0.35) {
      const ore = id === Tile.ironOre ? "ironOre" : id === Tile.goldOre ? "goldOre" : "gem";
      drops.push({ id: ore, n: 1 });
    }

    if (this.hurt[this.idx(tx, ty)] >= hpMax) {
      this.breakTile(tx, ty, drops);
    }
    return true;
  }

  breakTile(tx, ty, drops) {
    const id = this.get(tx, ty);
    if (id === Tile.tree) {
      drops.push({ id: "wood", n: 1 + ((Math.random() * 2) | 0) });
      if (Math.random() < 0.8) drops.push({ id: "acorn", n: 1 + ((Math.random() < 0.5) | 0) });
      this.set(tx, ty, Tile.grass);
    } else if (id === Tile.rock || id === Tile.hardRock) {
      drops.push({ id: "stone", n: 1 + ((Math.random() * 4) | 0) });
      if (Math.random() < 0.25) drops.push({ id: "coal", n: 1 });
      this.set(tx, ty, Tile.stoneFloor);
    } else if (id === Tile.cactus) {
      drops.push({ id: "cactus", n: 1 + ((Math.random() < 0.5) | 0) });
      this.set(tx, ty, Tile.sand);
    } else if (id === Tile.cloudCactus) {
      this.set(tx, ty, Tile.cloud);
    } else if (id === Tile.ironOre) {
      drops.push({ id: "ironOre", n: 1 + ((Math.random() * 2) | 0) });
      this.set(tx, ty, Tile.stoneFloor);
    } else if (id === Tile.goldOre) {
      drops.push({ id: "goldOre", n: 1 + ((Math.random() * 2) | 0) });
      this.set(tx, ty, Tile.stoneFloor);
    } else if (id === Tile.gemOre) {
      drops.push({ id: "gem", n: 1 + ((Math.random() * 2) | 0) });
      this.set(tx, ty, Tile.stoneFloor);
    }
  }

  placeItem(tx, ty, itemId) {
    const def = itemDef(itemId);
    if (!def || !def.place) return false;
    const cur = this.get(tx, ty);
    if (def.place === "sapling" && cur === Tile.grass) {
      this.set(tx, ty, Tile.sapling);
      return true;
    }
    if (def.place === "cactusSapling" && cur === Tile.sand) {
      this.set(tx, ty, Tile.cactusSapling);
      return true;
    }
    if (def.place === "flower" && cur === Tile.grass) {
      this.set(tx, ty, Tile.flower);
      return true;
    }
    if (def.place === "wheat0" && cur === Tile.farm) {
      this.set(tx, ty, Tile.wheat0);
      return true;
    }
    if (def.place === "sand" && (cur === Tile.hole || liquid(cur))) {
      this.set(tx, ty, Tile.sand);
      return true;
    }
    if (def.place === "dirt" && (cur === Tile.hole || liquid(cur))) {
      this.set(tx, ty, this.id < 0 ? Tile.stoneFloor : Tile.dirt);
      return true;
    }
    if (def.place === "cloud" && cur === Tile.fall) {
      this.set(tx, ty, Tile.cloud);
      return true;
    }
    return false;
  }

  grow() {
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() * this.w) | 0;
      const y = (Math.random() * this.h) | 0;
      const t = this.get(x, y);
      if (t === Tile.sapling && Math.random() < 0.05) this.set(x, y, Tile.tree);
      if (t === Tile.cactusSapling && Math.random() < 0.05) this.set(x, y, Tile.cactus);
      if (t === Tile.wheat0 || t === Tile.wheat1 || t === Tile.wheat2) {
        if (Math.random() < 0.08) this.set(x, y, t + 1);
      }
      if (t === Tile.dirt && this.id === 0) {
        const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
        if (n.some((v) => v === Tile.grass || v === Tile.flower) && Math.random() < 0.04) this.set(x, y, Tile.grass);
      }
      if (t === Tile.farm && Math.random() < 0.01) this.set(x, y, Tile.dirt);
    }
  }

  liquidAt(px, py) {
    const t = this.tileAtPixel(px, py);
    return { water: t === Tile.water, lava: t === Tile.lava };
  }
}

export { solid, liquid, holeLike };
