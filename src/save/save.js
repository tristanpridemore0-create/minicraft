import { SAVE_KEY, MAP } from "../constants.js";
import { Tile } from "../world/tiles.js";

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function writeSave(game) {
  const mutations = {};
  for (const [id, level] of Object.entries(game.levels)) {
    const diffs = [];
    const orig = game.original[id];
    for (let i = 0; i < MAP * MAP; i++) {
      if (level.tiles[i] !== orig[i]) diffs.push([i, level.tiles[i]]);
    }
    mutations[id] = diffs;
  }
  const furniture = {};
  for (const [id, level] of Object.entries(game.levels)) {
    furniture[id] = level.entities
      .filter((e) => e.type === "furniture" && !e.removed)
      .map((e) => ({
        x: e.x,
        y: e.y,
        kind: e.kind,
        extra: e.inv ? e.inv.toJSON() : null,
      }));
  }
  const data = {
    seed: game.seed,
    tick: game.tick,
    day: game.dayTime,
    won: game.won,
    wizardDead: game.wizardDead,
    levelId: game.player.level.id,
    player: {
      x: game.player.x,
      y: game.player.y,
      health: game.player.health,
      stamina: game.player.stamina,
      dir: game.player.dir,
      active: game.player.active,
      inv: game.player.inv.toJSON(),
    },
    mutations,
    furniture,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function readSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function snapshotTiles(levels) {
  const out = {};
  for (const [id, level] of Object.entries(levels)) out[id] = new Uint8Array(level.tiles);
  return out;
}

export function applyMutations(levels, mutations) {
  if (!mutations) return;
  for (const [id, diffs] of Object.entries(mutations)) {
    const lv = levels[id];
    if (!lv) continue;
    for (const [i, t] of diffs) lv.tiles[i] = t;
  }
}

export { Tile };
