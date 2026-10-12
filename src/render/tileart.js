// Draws the terrain: grass, sand, water, rock and everything else the map is
// made of.

import { Tile } from "../world/tiles.js";
import { C, dirtColor } from "./palette.js";
import { hash2 } from "../rng.js";

// Tiles are drawn as four 8x8 quarters. Each quarter looks at its neighbours
// and picks a piece: plain fill, a straight edge, an outer corner or an inner
// corner. That is what makes grass, sand, water and rock blend into each other
// instead of sitting in a checkerboard. Pieces are painted once into an atlas.

// The atlas: one big hidden picture holding every 8x8 piece painted so far, 64
// across and 64 down. `slots` remembers where each piece is, by name.
const COLS = 64;
const ROWS = 64;
let atlas = null;
let actx = null;
let next = 0;
const slots = new Map();

// Get the atlas position of a piece, painting it first if this is the first
// time it has been asked for. `key` is a name that describes the piece exactly,
// and `makePaint` returns a function that gives the colour of each pixel, or
// nothing for a see-through one.
function piece(key, makePaint) {
  let s = slots.get(key);
  if (s !== undefined) return s;
  if (!atlas) {
    atlas = document.createElement("canvas");
    atlas.width = COLS * 8;
    atlas.height = ROWS * 8;
    actx = atlas.getContext("2d");
  }
  // The atlas is full: start again from the beginning. Pieces are repainted as
  // they are needed.
  if (next >= COLS * ROWS) {
    slots.clear();
    next = 0;
  }
  s = next++;
  const ox = (s % COLS) * 8;
  const oy = ((s / COLS) | 0) * 8;
  const paint = makePaint();
  actx.clearRect(ox, oy, 8, 8);
  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < 8; px++) {
      const c = paint(px, py);
      if (!c) continue;
      actx.fillStyle = c;
      actx.fillRect(ox + px, oy + py, 1, 1);
    }
  }
  slots.set(key, s);
  return s;
}

// Copy one piece from the atlas to the screen at (x, y).
function blit(ctx, s, x, y) {
  ctx.drawImage(atlas, (s % COLS) * 8, ((s / COLS) | 0) * 8, 8, 8, x, y, 8, 8);
}

// base: fill colour. speck: scattered detail. outline: line where the terrain
// stops. margin: how many pixels of bare ground show outside that line.
// hi/lo: light and shadow just inside the outline, for raised terrain.
// diag: also notch inner corners.
const MAT = {
  grass: { base: 141, speck: 252, d1: 0.05, outline: 30, margin: 2, seed: 11 },
  sand: { base: 550, speck: 440, d1: 0.06, outline: 440, margin: 2, seed: 23 },
  water: { base: 5, speck: 115, d1: 0.09, outline: 3, margin: 2, seed: 37, animated: true },
  lava: { base: 500, speck: 520, d1: 0.12, speck2: 550, d2: 0.03, outline: 300, margin: 2, seed: 41, animated: true },
  hole: { base: 111, speck: 0, d1: 0.08, outline: 0, margin: 2, seed: 53 },
  rock: { base: 444, speck: 333, d1: 0.05, outline: 111, margin: 1, hi: 555, lo: 333, diag: true, seed: 67 },
  hardRock: { base: 334, speck: 223, d1: 0.08, outline: 1, margin: 1, hi: 445, lo: 223, diag: true, seed: 71 },
  cloud: { base: 444, speck: 555, d1: 0.04, outline: 333, margin: 1, diag: true, seed: 83 },
};

// The pixel colours for one quarter of a terrain tile. qx and qy say which
// quarter (0 or 1 across, 0 or 1 down). hOpen and vOpen say whether the tile
// beside it, and the tile above or below it, is a different kind of terrain,
// and dOpen says the same for the diagonal one.
//
// `d` comes out as how many pixels this pixel is from the nearest open edge.
// Small values become bare ground, then the outline, then a highlight, then the
// fill.
function terrainPaint(m, qx, qy, hOpen, vOpen, dOpen, variant, out) {
  const M = m.margin;
  return (px, py) => {
    // Distance from this quarter's two outside edges.
    const ex = qx ? 7 - px : px;
    const ey = qy ? 7 - py : py;
    let d = 99;
    if (hOpen) d = ex;
    if (vOpen) d = Math.min(d, ey);
    if (hOpen && vOpen) d = Math.min(d, ex + ey - M - 2);
    if (dOpen) d = Math.max(ex, ey);
    if (d < M) return out ? (out.inner && d === M - 1 ? out.inner : out.fill) : null;
    if (d === M) return C(m.outline);
    if (d === M + 1 && m.hi !== undefined) {
      let lit;
      if (dOpen) lit = !qx && !qy;
      else if (hOpen && vOpen) lit = ex <= ey ? !qx : !qy;
      else if (hOpen) lit = !qx;
      else lit = !qy;
      return C(lit ? m.hi : m.lo);
    }
    // The fill: mostly the base colour, with specks scattered by a repeatable
    // random number.
    const h = hash2(qx * 8 + px + variant * 37, qy * 8 + py + variant * 91, m.seed);
    if (h < m.d1) return C(m.speck);
    if (m.speck2 !== undefined && h > 1 - m.d2) return C(m.speck2);
    return C(m.base);
  };
}

// For each kind of terrain, the neighbouring tiles it joins up with, so that no
// edge is drawn between them. A tree stands on grass, so grass joins to it.
const connGrass = (t) => t === Tile.grass || t === Tile.tree || t === Tile.flower || t === Tile.sapling;
const sandy = (t) => t === Tile.sand || t === Tile.cactus || t === Tile.cactusSapling;
const connSand = (t) => sandy(t) || t === Tile.water || t === Tile.lava || t === Tile.hole;
const connWater = (t) => t === Tile.water || t === Tile.hole;
const connLava = (t) => t === Tile.lava || t === Tile.hole;
const connHole = (t) => t === Tile.hole || t === Tile.water || t === Tile.lava;
const connRock = (t) => t === Tile.rock;
const connHard = (t) => t === Tile.hardRock;
const connCloud = (t) => t === Tile.cloud || t === Tile.cloudCactus || t === Tile.stairsDown;
const connTree = (t) => t === Tile.tree;

// Draw a terrain tile at screen position (sx, sy) as four quarters. `conn` is
// one of the functions above. `shore` is for water, lava and holes, whose edges
// show wet ground or beach.
function ground(ctx, level, tx, ty, sx, sy, name, conn, tick, shore = false) {
  const m = MAT[name];
  const dc = dirtColor(level.id);
  for (let q = 0; q < 4; q++) {
    // q counts the quarters 0 to 3. qx is 0 for the left ones and 1 for the
    // right; qy is 0 for the top and 1 for the bottom. dx and dy point at the
    // neighbouring tile on that side.
    const qx = q & 1;
    const qy = q >> 1;
    const dx = qx ? 1 : -1;
    const dy = qy ? 1 : -1;
    const th = level.get(tx + dx, ty);
    const tv = level.get(tx, ty + dy);
    const hOpen = !conn(th);
    const vOpen = !conn(tv);
    const dOpen = !!m.diag && !hOpen && !vOpen && !conn(level.get(tx + dx, ty + dy));
    // What shows outside the outline: nothing (clouds), bare ground, or a beach.
    let outKind = name === "cloud" ? "n" : shore ? "l" : "d";
    if (shore && ((hOpen && sandy(th)) || (vOpen && sandy(tv)))) outKind = "s";
    // Plain inside pieces come in four speckle patterns, so large areas do not
    // look tiled. For water and lava the pattern changes over time, which makes
    // them shimmer.
    let variant = 0;
    if (!hOpen && !vOpen && !dOpen) {
      const cell = hash2(tx * 2 + qx, ty * 2 + qy, 99);
      const t = m.animated ? ((tick + cell * 48) / 48) | 0 : 0;
      variant = ((cell * 4 + t) | 0) & 3;
    }
    // Everything that affects how this piece looks goes into its name, so each
    // different-looking piece is painted exactly once.
    const key = `${name}:${dc}${outKind}${q}${hOpen ? 1 : 0}${vOpen ? 1 : 0}${dOpen ? 1 : 0}${variant}`;
    const s = piece(key, () => {
      let out = null;
      if (outKind === "d") out = { fill: C(dc) };
      else if (outKind === "l") out = { fill: C(dc), inner: C(dc - 111) };
      else if (outKind === "s") out = { fill: C(550), inner: C(440) };
      return terrainPaint(m, qx, qy, hOpen, vOpen, dOpen, variant, out);
    });
    blit(ctx, s, sx + qx * 8, sy + qy * 8);
  }
}

// Plain ground with a few specks: dirt, cave floor, the base under stairs.
function flat(ctx, tx, ty, sx, sy, base, speck, d1 = 0.06) {
  for (let q = 0; q < 4; q++) {
    const qx = q & 1;
    const qy = q >> 1;
    const variant = (hash2(tx * 2 + qx, ty * 2 + qy, 5) * 4) | 0;
    const s = piece(`flat:${base}:${speck}:${q}${variant}`, () => (px, py) =>
      hash2(qx * 8 + px + variant * 37, qy * 8 + py + variant * 91, 7) < d1 ? C(speck) : C(base)
    );
    blit(ctx, s, sx + qx * 8, sy + qy * 8);
  }
}

// A 16x16 drawing with see-through gaps, laid over the ground.
function overlay(ctx, name, sx, sy, pix) {
  for (let q = 0; q < 4; q++) {
    const qx = q & 1;
    const qy = q >> 1;
    const s = piece(`ov:${name}:${q}`, () => (px, py) => pix(qx * 8 + px, qy * 8 + py));
    blit(ctx, s, sx + qx * 8, sy + qy * 8);
  }
}

// Turn a drawing made of rows of letters, and a palette saying what colour each
// letter is, into a pixel-colour function for overlay().
const fromRows = (rows, pal) => (x, y) => pal[rows[y][x]] || null;

// A single tree: a round crown with a dark rim and some highlights toward the
// top left, on a short trunk.
function treePix(x, y) {
  const dx = x - 7.5;
  const dy = y - 6.5;
  const r2 = dx * dx + dy * dy;
  if (r2 <= 42) {
    if (r2 > 30) return C(10);
    const h = hash2(x, y, 77);
    if (dx + dy < -3 && h < 0.5) return C(151);
    if (h > 0.85) return C(10);
    return C(30);
  }
  if (y >= 12 && x >= 6 && x <= 9) return x >= 8 ? C(320) : C(430);
  return null;
}

// Trees that touch on three sides merge into solid canopy.
function drawTree(ctx, level, tx, ty, sx, sy) {
  for (let q = 0; q < 4; q++) {
    const qx = q & 1;
    const qy = q >> 1;
    const dx = qx ? 1 : -1;
    const dy = qy ? 1 : -1;
    const full = connTree(level.get(tx + dx, ty)) && connTree(level.get(tx, ty + dy)) && connTree(level.get(tx + dx, ty + dy));
    const s = full
      ? piece(`treefull:${q}`, () => (px, py) => {
          const ex = qx ? 7 - px : px;
          const ey = qy ? 7 - py : py;
          if (ex + ey <= 1) return C(10);
          const h = hash2(qx * 8 + px, qy * 8 + py, 78);
          if (h < 0.1) return C(151);
          if (h > 0.82) return C(10);
          return C(30);
        })
      : piece(`ov:tree:${q}`, () => (px, py) => treePix(qx * 8 + px, qy * 8 + py));
    blit(ctx, s, sx + qx * 8, sy + qy * 8);
  }
}

// Drawings as rows of letters. `.` is see-through and the other letters are
// looked up in the palettes below.
const CACTUS = [
  "................",
  "......oooo......",
  ".....obbbbo.....",
  ".....obcbbo.....",
  ".ooo.obcbbo.....",
  ".obo.obcbbo.ooo.",
  ".obo.obcbbo.obo.",
  ".obooobcbbo.obo.",
  ".obbbbbcbbooobo.",
  "..oooobcbbbbbbo.",
  ".....obcbboooo..",
  ".....obcbbo.....",
  ".....obcbbo.....",
  ".....obcbbo.....",
  ".....oooooo.....",
  "................",
];
const SAPLING = [
  "................",
  "................",
  "................",
  "................",
  "......oooo......",
  ".....obbbbo.....",
  ".....obcbbo.....",
  ".....obbbbo.....",
  "......oooo......",
  ".......tt.......",
  ".......tt.......",
  ".......tt.......",
  "................",
  "................",
  "................",
  "................",
];
const CACTUS_SAPLING = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......oooo......",
  "......obco......",
  "......obco......",
  "......obco......",
  "......obco......",
  "......oooo......",
  "................",
  "................",
  "................",
  "................",
];

const cactusPal = { o: C(20), b: C(40), c: C(50) };
const cloudCactusPal = { o: C(111), b: C(555), c: C(333) };
const saplingPal = { o: C(10), b: C(30), c: C(151), t: C(430) };

// Two small flowers. `flip` mirrors where they sit, so neighbouring flower
// tiles do not all match.
function flowerPix(flip) {
  const spots = flip ? [[11, 4], [4, 11]] : [[4, 4], [11, 11]];
  return (x, y) => {
    for (const [cx, cy] of spots) {
      if (x === cx && y === cy) return C(550);
      if (Math.abs(x - cx) + Math.abs(y - cy) === 1) return C(555);
      if (y === cy + 2 && (x === cx || x === cx - 1)) return C(30);
    }
    return null;
  };
}

// Where the coloured nuggets sit on an ore rock, and the light and dark shade
// for each ore.
const NUGGETS = [[4, 7], [5, 7], [5, 8], [8, 5], [9, 5], [9, 6], [10, 9], [11, 9], [10, 10], [6, 10], [7, 10], [7, 11]];
const ORE_COL = { [Tile.ironOre]: [544, 322], [Tile.goldOre]: [553, 440], [Tile.gemOre]: [545, 404] };

// A rounded grey boulder with nuggets in it.
function orePix(light, dark) {
  return (x, y) => {
    const dx = x - 7.5;
    const dy = y - 8;
    const e = (dx * dx) / 42 + (dy * dy) / 30;
    if (e > 1) return null;
    if (e > 0.72) return C(111);
    const n = NUGGETS.findIndex(([nx, ny]) => nx === x && ny === y);
    if (n >= 0) return C(n % 3 === 0 ? light : dark);
    return dx + dy < -4 ? C(444) : C(333);
  };
}

// A staircase seen from above: four steps in a dark frame. Stairs up get darker
// toward the bottom; stairs down are darker throughout and sink into shadow on
// the left.
function stairsPix(up) {
  const cols = up ? [555, 444, 333, 222] : [333, 222, 111, 0];
  return (x, y) => {
    if (x < 1 || x > 14 || y < 1 || y > 14) return null;
    if (x === 1 || x === 14 || y === 1 || y === 14) return C(0);
    const step = ((y - 2) / 3) | 0;
    if (!up && x - 2 < step) return C(0);
    if ((y - 2) % 3 === 2) return C(up ? 111 : Math.max(0, cols[step] - 111));
    return C(cols[step]);
  };
}

// Two prints left in sand that was walked on a moment ago.
function footprintPix(x, y) {
  const mark = (cx, cy) => (x === cx || x === cx + 1) && y >= cy && y <= cy + 2;
  return mark(3, 2) || mark(11, 10) ? C(440) : null;
}

// Farmland: ploughed rows, with a dark furrow every fourth line.
function farmPix(dc) {
  return (x, y) => {
    const r = y % 4;
    if (r === 0) return C(dc - 111);
    if (r === 2 && hash2(x, y, 3) > 0.25) return C(dc + 111);
    return C(dc);
  };
}

// Wheat stalks, taller and yellower at each of the four stages, with pale heads
// when ripe.
function wheatPix(stage) {
  const stalk = [40, 50, 340, 440][stage];
  const h = 2 + stage * 3;
  return (x, y) => {
    if (x % 3 !== 2) return null;
    const bottom = 13 + (x % 2);
    if (y > bottom || y <= bottom - h) return null;
    if (stage === 3 && y <= bottom - h + 2) return C(550);
    return C(stalk);
  };
}

// The far-away ground seen through gaps in the clouds; it drifts slowly.
export function drawFallBackground(ctx, cx, cy, w, h) {
  const s = piece("fallbg", () => (px, py) => (hash2(px, py, 91) < 0.08 ? C(123) : C(12)));
  const ox = (cx >> 2) & 7;
  const oy = (cy >> 2) & 7;
  for (let y = -oy; y < h; y += 8) for (let x = -ox; x < w; x += 8) blit(ctx, s, x, y);
}

// Draw the tile at map position (tx, ty) at screen position (sx, sy). Most
// tiles are a layer of ground, sometimes with a drawing laid over it.
export function drawTile(ctx, level, tx, ty, sx, sy, tick) {
  const id = level.get(tx, ty);
  const dc = dirtColor(level.id);
  switch (id) {
    case Tile.grass:
      ground(ctx, level, tx, ty, sx, sy, "grass", connGrass, tick);
      break;
    case Tile.tree:
      ground(ctx, level, tx, ty, sx, sy, "grass", connGrass, tick);
      drawTree(ctx, level, tx, ty, sx, sy);
      break;
    case Tile.flower: {
      ground(ctx, level, tx, ty, sx, sy, "grass", connGrass, tick);
      const flip = (tx + ty) & 1;
      overlay(ctx, `flower${flip}`, sx, sy, flowerPix(flip));
      break;
    }
    case Tile.sapling:
      ground(ctx, level, tx, ty, sx, sy, "grass", connGrass, tick);
      overlay(ctx, "sapling", sx, sy, fromRows(SAPLING, saplingPal));
      break;
    case Tile.sand:
      ground(ctx, level, tx, ty, sx, sy, "sand", connSand, tick);
      if (level.getData(tx, ty) > 0) overlay(ctx, "footprint", sx, sy, footprintPix);
      break;
    case Tile.cactus:
      ground(ctx, level, tx, ty, sx, sy, "sand", connSand, tick);
      overlay(ctx, "cactus", sx, sy, fromRows(CACTUS, cactusPal));
      break;
    case Tile.cactusSapling:
      ground(ctx, level, tx, ty, sx, sy, "sand", connSand, tick);
      overlay(ctx, "cactusSapling", sx, sy, fromRows(CACTUS_SAPLING, cactusPal));
      break;
    case Tile.water:
      ground(ctx, level, tx, ty, sx, sy, "water", connWater, tick, true);
      break;
    case Tile.lava:
      ground(ctx, level, tx, ty, sx, sy, "lava", connLava, tick, true);
      break;
    case Tile.hole:
      ground(ctx, level, tx, ty, sx, sy, "hole", connHole, tick, true);
      break;
    case Tile.rock:
      ground(ctx, level, tx, ty, sx, sy, "rock", connRock, tick);
      break;
    case Tile.hardRock:
      ground(ctx, level, tx, ty, sx, sy, "hardRock", connHard, tick);
      break;
    case Tile.dirt:
    case Tile.stoneFloor:
      flat(ctx, tx, ty, sx, sy, dc, dc - 111);
      break;
    case Tile.farm:
      overlay(ctx, `farm${dc}`, sx, sy, farmPix(dc));
      break;
    case Tile.wheat0:
    case Tile.wheat1:
    case Tile.wheat2:
    case Tile.wheat3:
      overlay(ctx, `farm${dc}`, sx, sy, farmPix(dc));
      overlay(ctx, `wheat${id - Tile.wheat0}`, sx, sy, wheatPix(id - Tile.wheat0));
      break;
    case Tile.ironOre:
    case Tile.goldOre:
    case Tile.gemOre:
      flat(ctx, tx, ty, sx, sy, dc, dc - 111);
      overlay(ctx, `ore${id}`, sx, sy, orePix(ORE_COL[id][0], ORE_COL[id][1]));
      break;
    case Tile.stairsDown:
    case Tile.stairsUp:
      if (level.id === 1) flat(ctx, tx, ty, sx, sy, 444, 555, 0.04);
      else flat(ctx, tx, ty, sx, sy, dc, dc - 111);
      overlay(ctx, id === Tile.stairsUp ? "stairsUp" : "stairsDown", sx, sy, stairsPix(id === Tile.stairsUp));
      break;
    case Tile.cloud:
      ground(ctx, level, tx, ty, sx, sy, "cloud", connCloud, tick);
      break;
    case Tile.cloudCactus:
      ground(ctx, level, tx, ty, sx, sy, "cloud", connCloud, tick);
      overlay(ctx, "cloudCactus", sx, sy, fromRows(CACTUS, cloudCactusPal));
      break;
    // Open air: the sky background drawn earlier shows through.
    case Tile.fall:
      break;
    default:
      ctx.fillStyle = "#000";
      ctx.fillRect(sx, sy, 16, 16);
  }
}
