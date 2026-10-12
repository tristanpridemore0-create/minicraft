import { TIER, TOOL } from "../constants.js";

export const ITEMS = {
  powerGlove: { id: "powerGlove", name: "Pow glove", kind: "tool", sprite: "glove" },
  apple: { id: "apple", name: "Apple", kind: "food", heal: 1, staminaCost: 5, sprite: "apple" },
  bread: { id: "bread", name: "Bread", kind: "food", heal: 2, staminaCost: 5, sprite: "bread" },
  wood: { id: "wood", name: "Wood", kind: "resource", sprite: "wood" },
  acorn: { id: "acorn", name: "Acorn", kind: "place", place: "sapling", sprite: "acorn" },
  cactus: { id: "cactus", name: "Cactus", kind: "place", place: "cactusSapling", sprite: "cactusItem" },
  flower: { id: "flower", name: "Flower", kind: "place", place: "flower", sprite: "flowerItem" },
  seeds: { id: "seeds", name: "Seeds", kind: "place", place: "wheat0", sprite: "seeds" },
  wheat: { id: "wheat", name: "Wheat", kind: "resource", sprite: "wheat" },
  slime: { id: "slime", name: "Slime", kind: "resource", sprite: "slime" },
  cloth: { id: "cloth", name: "Cloth", kind: "resource", sprite: "cloth" },
  sand: { id: "sand", name: "Sand", kind: "place", place: "sand", sprite: "sandItem" },
  dirt: { id: "dirt", name: "Dirt", kind: "place", place: "dirt", sprite: "dirtItem" },
  stone: { id: "stone", name: "Stone", kind: "resource", sprite: "stone" },
  coal: { id: "coal", name: "Coal", kind: "resource", sprite: "coal" },
  ironOre: { id: "ironOre", name: "I.Ore", kind: "resource", sprite: "ironOre" },
  goldOre: { id: "goldOre", name: "G.Ore", kind: "resource", sprite: "goldOre" },
  gem: { id: "gem", name: "Gem", kind: "resource", sprite: "gem" },
  iron: { id: "iron", name: "Iron", kind: "resource", sprite: "iron" },
  gold: { id: "gold", name: "Gold", kind: "resource", sprite: "gold" },
  glass: { id: "glass", name: "Glass", kind: "resource", sprite: "glass" },
  cloud: { id: "cloud", name: "Cloud", kind: "place", place: "cloud", sprite: "cloudItem" },
  workbench: { id: "workbench", name: "Workbench", kind: "furniture", furniture: "workbench", sprite: "workbench" },
  chest: { id: "chest", name: "Chest", kind: "furniture", furniture: "chest", sprite: "chest" },
  oven: { id: "oven", name: "Oven", kind: "furniture", furniture: "oven", sprite: "oven" },
  furnace: { id: "furnace", name: "Furnace", kind: "furniture", furniture: "furnace", sprite: "furnace" },
  anvil: { id: "anvil", name: "Anvil", kind: "furniture", furniture: "anvil", sprite: "anvil" },
  lantern: { id: "lantern", name: "Lantern", kind: "furniture", furniture: "lantern", light: 8, sprite: "lantern" },
};

const TIER_NAME = ["Wood", "Rock", "Iron", "Gold", "Gem"];
const TOOL_ID = ["shovel", "hoe", "sword", "pick", "axe"];
const TOOL_NAME = ["Shvl", "Hoe", "Swrd", "Pick", "Axe"];
const TIER_COST = {
  [TIER.WOOD]: { wood: 5 },
  [TIER.ROCK]: { wood: 5, stone: 5 },
  [TIER.IRON]: { wood: 5, iron: 5 },
  [TIER.GOLD]: { wood: 5, gold: 5 },
  [TIER.GEM]: { wood: 5, gem: 50 },
};

export const TOOL_ITEMS = {};

for (const [tierName, tier] of Object.entries(TIER)) {
  for (const [toolName, tool] of Object.entries(TOOL)) {
    const id = `${tierName.toLowerCase()}${capitalize(TOOL_ID[tool])}`;
    TOOL_ITEMS[id] = {
      id,
      name: `${TIER_NAME[tier]} ${TOOL_NAME[tool]}`,
      kind: "tool",
      tool,
      tier,
      sprite: id,
    };
    ITEMS[id] = TOOL_ITEMS[id];
  }
}

function capitalize(s) {
  return s[0].toUpperCase() + s.slice(1);
}

export function itemDef(id) {
  return ITEMS[id];
}

export function toolCost(tier) {
  return { ...TIER_COST[tier] };
}

// Extra damage a tool adds to a hit on a monster, on top of the 1-3 of a
// bare punch. Swords and axes are weapons; other tools add 1.
export function attackBonus(item) {
  if (!item || item.tool === undefined) return 0;
  const lvl = item.tier;
  if (item.tool === TOOL.AXE) return (lvl + 1) * 2 + ((Math.random() * 4) | 0);
  if (item.tool === TOOL.SWORD) return (lvl + 1) * 3 + ((Math.random() * (2 + lvl * lvl * 2)) | 0);
  return 1;
}
