// Saving and loading. The saved game is one piece of text (JSON) kept in the
// browser's localStorage, so it stays on this device and in this browser.

import { SAVE_KEY, MAP, LEVEL } from "../constants.js";

// Is there a saved game?
export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

// The world is rebuilt from its seed on load, so a save only records what has
// changed since: edited tiles, tile ages, and the things lying or standing
// about. Monsters are not saved; the world repopulates itself.
export function writeSave(game) {
  const mutations = {};
  const tileData = {};
  const furniture = {};
  const items = {};
  // For each level: the tiles that differ from the freshly generated world, the
  // extra number of any tile that has one, and the furniture and dropped items.
  for (const [id, level] of Object.entries(game.levels)) {
    const diffs = [];
    const cells = [];
    const orig = game.original[id];
    for (let i = 0; i < MAP * MAP; i++) {
      if (level.tiles[i] !== orig[i]) diffs.push([i, level.tiles[i]]);
      if (level.data[i]) cells.push([i, level.data[i]]);
    }
    mutations[id] = diffs;
    tileData[id] = cells;
    const live = level.entities.filter((e) => !e.removed);
    furniture[id] = live
      .filter((e) => e.type === "furniture")
      .map((e) => ({ x: e.x, y: e.y, kind: e.kind, extra: e.inv ? e.inv.toJSON() : null }));
    items[id] = live.filter((e) => e.type === "item").map((e) => ({ x: e.x, y: e.y, id: e.itemId, count: e.count, time: e.time }));
  }
  const wiz = game.levels[LEVEL.SKY].entities.find((e) => e.type === "wizard" && !e.removed);
  // Build mode has no wizard, so there is nothing to record for him.
  const p = game.player;
  // Everything that goes into the save. `version` lets a newer game recognise
  // an older save and convert it (see Game.load).
  const data = {
    version: 2,
    build: game.build,
    seed: game.seed,
    tick: game.tick,
    won: game.won,
    wizardDead: game.wizardDead,
    wizard: wiz ? { x: wiz.x, y: wiz.y, health: wiz.health } : null,
    flags: game.flags,
    levelId: p.level.id,
    player: {
      x: p.x,
      y: p.y,
      health: p.health,
      stamina: p.stamina,
      dir: p.dir,
      score: p.score,
      held: p.held,
      inv: p.inv.toJSON(),
    },
    mutations,
    tileData,
    furniture,
    items,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

// Read the save back, or null if there is none or it is damaged.
export function readSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

// Copy every level's tiles as they were generated, so writeSave can later tell
// what the player changed.
export function snapshotTiles(levels) {
  const out = {};
  for (const [id, level] of Object.entries(levels)) out[id] = new Uint8Array(level.tiles);
  return out;
}

// Put saved tile changes back on top of a freshly generated world.
export function applyMutations(levels, mutations) {
  if (!mutations) return;
  for (const [id, diffs] of Object.entries(mutations)) {
    const lv = levels[id];
    if (!lv) continue;
    for (const [i, t] of diffs) lv.tiles[i] = t;
  }
}
