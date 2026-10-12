// The kinds of tile the map is made of, and simple facts about them. A level
// stores one of these numbers for every square of the map.

// Each kind of tile and its number. The numbers are written into saved games,
// so never renumber an existing tile; add new ones at the end.
export const Tile = {
  grass: 1,
  dirt: 2,
  sand: 3,
  water: 4,
  lava: 5,
  rock: 6,
  hardRock: 7,
  tree: 8,
  flower: 9,
  cactus: 10,
  // Dug with a shovel. Nothing can walk over it.
  hole: 11,
  // The bare floor of the caves.
  stoneFloor: 12,
  ironOre: 13,
  goldOre: 14,
  gemOre: 15,
  stairsDown: 16,
  stairsUp: 17,
  // Ground turned with a hoe, ready for seeds, then wheat at its four stages of
  // growth.
  farm: 18,
  wheat0: 19,
  wheat1: 20,
  wheat2: 21,
  wheat3: 22,
  sapling: 23,
  cactusSapling: 24,
  cloud: 25,
  // The open air between clouds on the sky level.
  fall: 26,
  cloudCactus: 27,
};

// The reverse lookup, number to name. Not used at the moment, but handy when
// debugging.
export const NAMES = Object.fromEntries(Object.entries(Tile).map(([k, v]) => [v, k]));

// Tiles nothing can walk through.
export function solid(id) {
  return (
    id === Tile.rock ||
    id === Tile.hardRock ||
    id === Tile.tree ||
    id === Tile.cactus ||
    id === Tile.ironOre ||
    id === Tile.goldOre ||
    id === Tile.gemOre ||
    id === Tile.cloudCactus
  );
}

// Tiles you swim in.
export function liquid(id) {
  return id === Tile.water || id === Tile.lava;
}

// Gaps in the ground. Nothing can walk over them.
export function holeLike(id) {
  return id === Tile.hole || id === Tile.fall;
}

// Can something stand on this tile? `canSwim` is true for the player and false
// for monsters, so water and lava stop monsters but not you.
export function walkable(id, canSwim) {
  if (solid(id) || holeLike(id)) return false;
  if (liquid(id) && !canSwim) return false;
  return true;
}

// The next four functions (floorOf, tileHp, harvestKind and lightEmit) are left
// over from an earlier version and are not used at the moment. The rules they
// describe now live in level.js.
export function floorOf(id) {
  if (id === Tile.grass || id === Tile.flower || id === Tile.tree || id === Tile.sapling || id === Tile.farm) return Tile.dirt;
  if (id === Tile.cactus || id === Tile.cactusSapling) return Tile.sand;
  if (id === Tile.rock || id === Tile.hardRock || id === Tile.ironOre || id === Tile.goldOre || id === Tile.gemOre)
    return Tile.stoneFloor;
  if (id === Tile.cloudCactus) return Tile.cloud;
  return Tile.dirt;
}

// Not used at the moment (see the note above floorOf).
export function tileHp(id) {
  switch (id) {
    case Tile.tree:
      return 20;
    case Tile.rock:
      return 50;
    case Tile.hardRock:
      return 200;
    case Tile.cactus:
    case Tile.cloudCactus:
      return 10;
    case Tile.ironOre:
    case Tile.goldOre:
    case Tile.gemOre:
      return 40;
    default:
      return 1;
  }
}

// Not used at the moment (see the note above floorOf).
export function harvestKind(id) {
  if (id === Tile.tree) return "tree";
  if (id === Tile.rock || id === Tile.hardRock) return "rock";
  if (id === Tile.ironOre || id === Tile.goldOre || id === Tile.gemOre) return "ore";
  if (id === Tile.grass || id === Tile.dirt || id === Tile.sand || id === Tile.stoneFloor || id === Tile.cloud) return "floor";
  if (id === Tile.farm) return "farm";
  return "other";
}

// Not used at the moment (see the note above floorOf).
export function lightEmit(id) {
  if (id === Tile.lava) return 6;
  return 0;
}

// How much it hurts to walk into this tile. Used by bump() in
// entities/player.js.
export function contactDamage(id) {
  if (id === Tile.cactus) return 1;
  if (id === Tile.cloudCactus || id === Tile.ironOre || id === Tile.goldOre || id === Tile.gemOre) return 3;
  if (id === Tile.lava) return 3;
  return 0;
}
