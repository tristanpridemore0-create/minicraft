import { SAVE_KEY, MAP, LEVEL } from "../constants.js";

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
  const p = game.player;
  const data = {
    version: 2,
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
