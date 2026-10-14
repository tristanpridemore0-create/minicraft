// Checks for values that arrive from another player's browser. Nothing in a
// multiplayer message is trusted, so net.js and netMobs.js run every value
// through one of these before using it.

import { MAP, TILE, LEVEL } from "./constants.js";
import { NAMES } from "./world/tiles.js";
import { ITEMS } from "./items/defs.js";

// Is v a whole number from min to max?
export function whole(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

// Is v the id of a real item, or the number of a real tile or level? These
// look the thing up by its own name only. A plain `ITEMS[v]` would also say
// yes to words every JavaScript object answers to, such as "constructor".
export function isItem(v) {
  return typeof v === "string" && Object.hasOwn(ITEMS, v);
}

export function isTile(v) {
  return whole(v, 1, 255) && Object.hasOwn(NAMES, v);
}

export function isLevel(v) {
  return whole(v, LEVEL.CAVE3, LEVEL.SKY);
}

// Is v a position, in pixels, that is on the map?
export function onMap(v) {
  return Number.isFinite(v) && v >= 0 && v < MAP * TILE;
}
