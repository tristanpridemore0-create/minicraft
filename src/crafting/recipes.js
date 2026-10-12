// What can be crafted, where, and for how much.

import { TIER, TOOL } from "../constants.js";
import { TOOL_ITEMS, toolCost } from "../items/defs.js";

// Make the recipes for all five tools in each of the given materials, at one
// kind of furniture.
function toolRecipes(station, tiers) {
  const out = [];
  for (const tier of tiers) {
    for (const tool of Object.values(TOOL)) {
      const item = Object.values(TOOL_ITEMS).find((t) => t.tier === tier && t.tool === tool);
      out.push({
        station,
        result: item.id,
        count: 1,
        cost: toolCost(tier),
      });
    }
  }
  return out;
}

// Every recipe. `station` is the furniture you must be standing at, `result` is
// the id of the item you get and `cost` is what it takes from your pack.
export const RECIPES = [
  // Left over from an earlier version: nothing opens a "player" crafting list
  // now.
  { station: "player", result: "workbench", count: 1, cost: { wood: 20 } },

  { station: "workbench", result: "workbench", count: 1, cost: { wood: 20 } },
  { station: "workbench", result: "chest", count: 1, cost: { wood: 20 } },
  { station: "workbench", result: "oven", count: 1, cost: { stone: 15 } },
  { station: "workbench", result: "furnace", count: 1, cost: { stone: 20 } },
  { station: "workbench", result: "anvil", count: 1, cost: { iron: 5 } },
  { station: "workbench", result: "lantern", count: 1, cost: { wood: 5, slime: 10, glass: 4 } },
  ...toolRecipes("workbench", [TIER.WOOD, TIER.ROCK]),

  { station: "oven", result: "bread", count: 1, cost: { wheat: 4 } },

  { station: "furnace", result: "iron", count: 1, cost: { ironOre: 4, coal: 1 } },
  { station: "furnace", result: "gold", count: 1, cost: { goldOre: 4, coal: 1 } },
  { station: "furnace", result: "glass", count: 1, cost: { sand: 4, coal: 1 } },

  ...toolRecipes("anvil", [TIER.IRON, TIER.GOLD, TIER.GEM]),
];

// The recipes on offer at one kind of furniture.
export function recipesFor(station) {
  return RECIPES.filter((r) => r.station === station);
}
