// Builds the world from a seed number. The same seed always gives the same
// world, because every "random" choice in here comes from the seed (see rng.js)
// and never from Math.random().

import { MAP, LEVEL } from "../constants.js";
import { Tile } from "./tiles.js";
import { RNG, fbm, hash2 } from "../rng.js";

// Make all five levels and join them with stairs. Each level uses its own
// variation of the seed so they do not all look alike.
export function generateWorld(seed) {
  const rng = new RNG(seed);
  const levels = {
    [LEVEL.SURFACE]: makeLevel(),
    [LEVEL.CAVE1]: makeLevel(),
    [LEVEL.CAVE2]: makeLevel(),
    [LEVEL.CAVE3]: makeLevel(),
    [LEVEL.SKY]: makeLevel(),
  };

  genSurface(levels[LEVEL.SURFACE], seed);
  genCave(levels[LEVEL.CAVE1], seed + 11, "iron");
  genCave(levels[LEVEL.CAVE2], seed + 22, "gold");
  genCave(levels[LEVEL.CAVE3], seed + 33, "gem");
  genSky(levels[LEVEL.SKY], seed + 44);

  placeStairs(levels, rng, seed);
  return levels;
}

// An empty level: one number per tile, all zero to start with. A Uint8Array is
// a compact list of small whole numbers.
function makeLevel() {
  const tiles = new Uint8Array(MAP * MAP);
  const data = new Uint8Array(MAP * MAP);
  return { tiles, data, w: MAP, h: MAP };
}

// Write a tile, ignoring positions off the edge of the map. The tiles are one
// long list, row after row, so the tile at (x, y) is entry number x + y * MAP.
function set(level, x, y, id) {
  if (x < 0 || y < 0 || x >= MAP || y >= MAP) return;
  level.tiles[x + y * MAP] = id;
}

// Read a tile. Anything off the edge counts as water.
function get(level, x, y) {
  if (x < 0 || y < 0 || x >= MAP || y >= MAP) return Tile.water;
  return level.tiles[x + y * MAP];
}

// The surface. Three separate layers of noise decide what each tile is:
//
//   e  height: low is water, a little higher is beach, very high is rock
//   m  dryness: dry ground at a middling height becomes desert sand
//   t  growth: where it is high there are trees on grass and cacti on sand,
//      and where it is low there are flowers
function genSurface(level, seed) {
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const e = fbm(x, y, seed, 28, 5);
      const m = fbm(x, y, seed + 9, 36, 4);
      const t = fbm(x, y, seed + 17, 18, 3);
      let id = Tile.grass;
      if (e < 0.38) id = Tile.water;
      else if (e < 0.43) id = Tile.sand;
      else if (e > 0.72) id = Tile.rock;
      else if (m > 0.62 && e > 0.44 && e < 0.58) id = Tile.sand;
      set(level, x, y, id);
      if (id === Tile.grass && t > 0.58 && e > 0.45 && e < 0.68) set(level, x, y, Tile.tree);
      if (id === Tile.grass && t < 0.18) set(level, x, y, Tile.flower);
      if (id === Tile.sand && t > 0.7) set(level, x, y, Tile.cactus);
    }
  }
  // Ring the whole map with water, so the world is an island.
  for (let i = 0; i < MAP; i++) {
    set(level, i, 0, Tile.water);
    set(level, i, MAP - 1, Tile.water);
    set(level, 0, i, Tile.water);
    set(level, MAP - 1, i, Tile.water);
  }
}

// A cave level. `ore` says which ore it holds, and that also decides the
// liquid: the iron caves are dry, the gold caves have water and the gem caves
// have lava.
function genCave(level, seed, ore) {
  const oreTile = ore === "iron" ? Tile.ironOre : ore === "gold" ? Tile.goldOre : Tile.gemOre;
  const liquid = ore === "gold" ? Tile.water : ore === "gem" ? Tile.lava : Tile.stoneFloor;
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      // n decides where the rock walls are, o where ore sits inside the rock
      // and l where the pools are.
      const n = fbm(x, y, seed, 14, 4);
      const o = fbm(x, y, seed + 5, 8, 3);
      const l = fbm(x, y, seed + 8, 22, 3);
      if (n > 0.55) set(level, x, y, Tile.rock);
      else if (ore !== "iron" && l < 0.34) set(level, x, y, liquid);
      else set(level, x, y, Tile.stoneFloor);
      if (get(level, x, y) === Tile.rock && o > 0.78) set(level, x, y, oreTile);
    }
  }
  // Wall the level in with rock.
  for (let i = 0; i < MAP; i++) {
    set(level, i, 0, Tile.rock);
    set(level, i, MAP - 1, Tile.rock);
    set(level, 0, i, Tile.rock);
    set(level, MAP - 1, i, Tile.rock);
  }
}

// The sky: clouds to walk on with open air between them, and the odd cloud
// cactus.
function genSky(level, seed) {
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const n = fbm(x, y, seed, 20, 4);
      if (n > 0.5) {
        set(level, x, y, Tile.cloud);
        if (hash2(x, y, seed) > 0.97) set(level, x, y, Tile.cloudCactus);
      } else set(level, x, y, Tile.fall);
    }
  }
}

// Join the levels up. Stairs down on one level and the stairs up on the level
// below are always on the same tile, so you arrive where you left.
function placeStairs(levels, rng, seed) {
  const surface = levels[LEVEL.SURFACE];
  const downs = [];
  // 28 staircases down from the surface, each somewhere inside rock, so you
  // have to dig to reach one. A try that lands outside rock is taken again,
  // which is what `i--` does.
  for (let i = 0; i < 28; i++) {
    const x = rng.range(6, MAP - 7);
    const y = rng.range(6, MAP - 7);
    if (get(surface, x, y) !== Tile.rock) {
      i--;
      continue;
    }
    set(surface, x, y, Tile.stairsDown);
    downs.push([x, y]);
  }

  // Work down through the caves. Each level gets stairs up underneath every
  // staircase from the level above, with the rock around them cleared, and then
  // up to 18 staircases down of its own.
  let cur = downs;
  const chain = [LEVEL.CAVE1, LEVEL.CAVE2, LEVEL.CAVE3];
  for (let li = 0; li < chain.length; li++) {
    const lv = levels[chain[li]];
    const next = [];
    for (const [x, y] of cur) {
      set(lv, x, y, Tile.stairsUp);
      clearAround(lv, x, y, Tile.stoneFloor);
    }
    for (let i = 0; i < 18; i++) {
      const x = rng.range(6, MAP - 7);
      const y = rng.range(6, MAP - 7);
      if (get(lv, x, y) === Tile.rock || get(lv, x, y) === Tile.stoneFloor) {
        set(lv, x, y, Tile.stairsDown);
        next.push([x, y]);
      }
    }
    cur = next.length ? next : cur;
  }

  // Three staircases up to the sky, each walled in with hard rock that only a
  // gem pickaxe can break.
  const skyStairs = [];
  for (let i = 0; i < 3; i++) {
    let x = rng.range(10, MAP - 11);
    let y = rng.range(10, MAP - 11);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        set(surface, x + dx, y + dy, Tile.hardRock);
      }
    }
    set(surface, x, y, Tile.stairsUp);
    skyStairs.push([x, y]);
  }
  // Where each one comes out in the sky, make sure there is cloud to stand on.
  const sky = levels[LEVEL.SKY];
  for (const [x, y] of skyStairs) {
    set(sky, x, y, Tile.stairsDown);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (get(sky, x + dx, y + dy) === Tile.fall) set(sky, x + dx, y + dy, Tile.cloud);
      }
    }
  }
}

// Open up the eight tiles around a staircase so you do not arrive sealed in
// rock.
function clearAround(level, x, y, floor) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = get(level, x + dx, y + dy);
      if (t === Tile.rock || t === Tile.ironOre || t === Tile.goldOre || t === Tile.gemOre) set(level, x + dx, y + dy, floor);
    }
  }
}

// Where the player starts: the first grass tile found near the middle of the
// surface or, failing that, any grass at all. The answer is in pixels, at the
// centre of the tile.
export function findSpawn(level) {
  for (let y = (MAP / 2 - 20) | 0; y < MAP / 2 + 40; y++) {
    for (let x = (MAP / 2 - 20) | 0; x < MAP / 2 + 40; x++) {
      const t = level.tiles[x + y * MAP];
      if (t === Tile.grass) return { x: x * 16 + 8, y: y * 16 + 8 };
    }
  }
  for (let i = 0; i < MAP * MAP; i++) {
    if (level.tiles[i] === Tile.grass) {
      const x = i % MAP;
      const y = (i / MAP) | 0;
      return { x: x * 16 + 8, y: y * 16 + 8 };
    }
  }
  return { x: MAP * 8, y: MAP * 8 };
}
