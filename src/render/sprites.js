// The pictures for everything that is not terrain: the player, monsters,
// furniture, item icons, and the hearts and bolts on the bottom bar.

import { C } from "./palette.js";
import { itemDef } from "../items/defs.js";
import { TOOL } from "../constants.js";

// Every sprite is a grid of palette letters ("." is see-through). The same
// drawing is reused with different palettes, e.g. the four zombie colours.

// The player's body facing down, up and sideways. o is hair, outline and boots,
// s is skin and c is clothes.
const BODY_DOWN_A = [
  "................",
  ".....oooooo.....",
  "....oooooooo....",
  "....osssssso....",
  "....sosssoss....",
  "....ssssssss....",
  ".....ssssss.....",
  "....cccccccc....",
  "...cccccccccc...",
  "...sccccccccs...",
  "...sccccccccs...",
  "....cccccccc....",
  "....oooooooo....",
  "....ooo..ooo....",
  "....ooo.........",
  "................",
];
const BODY_UP_A = [
  "................",
  ".....oooooo.....",
  "....oooooooo....",
  "....oooooooo....",
  "....oooooooo....",
  "....soooooos....",
  ".....ssssss.....",
  "....cccccccc....",
  "...cccccccccc...",
  "...sccccccccs...",
  "...sccccccccs...",
  "....cccccccc....",
  "....oooooooo....",
  "....ooo..ooo....",
  ".........ooo....",
  "................",
];
const BODY_SIDE_A = [
  "................",
  ".....oooooo.....",
  "....oooooooo....",
  "....oooossss....",
  "....ooosssos....",
  "....oossssss....",
  ".....osssss.....",
  ".....cccccc.....",
  "....cccccccc....",
  "....cccsscc.....",
  "....cccsscc.....",
  ".....cccccc.....",
  ".....oooooo.....",
  ".....ooooo......",
  ".....oo.oo......",
  "................",
];
// The second sideways walking frame: the same drawing with the legs apart.
const BODY_SIDE_B = [...BODY_SIDE_A.slice(0, 12), ".....oooooo.....", "....ooo..ooo....", "...ooo....ooo...", "................"];

// Second walking frame: the other foot is forward.
function otherFoot(rows) {
  const out = [...rows];
  out[14] = [...rows[14]].reverse().join("");
  return out;
}

// Zombies share the player's body but are bald. `eyes` lists the columns on
// row 4 that stay dark once the hair is gone.
function zombify(rows, eyes = []) {
  return rows.map((r, i) => {
    if (i < 1 || i > 6) return r;
    const bald = [...r.replaceAll("o", "s")];
    if (i === 4) for (const col of eyes) bald[col] = "o";
    return bald.join("");
  });
}

// A slime at rest and in mid-hop. o is the outline, b the body and e the eyes.
const SLIME_REST = [
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "...oobbbbbboo...",
  "..obbbbbbbbbbo..",
  "..obeebbbbeebo..",
  ".obbeobbbboebbo.",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  "..obbbbbbbbbbo..",
  "...oooooooooo...",
  "................",
];
const SLIME_JUMP = [
  "................",
  ".....oooooo.....",
  "....obbbbbbo....",
  "...obbbbbbbbo...",
  "...obeebbeebo...",
  "..obbeobboebbo..",
  "..obbbbbbbbbbo..",
  "..obbbbbbbbbbo..",
  "..obbbbbbbbbbo..",
  "..obbbbbbbbbbo..",
  "...obbbbbbbbo...",
  "...obbbbbbbbo...",
  "....oooooooo....",
  "................",
  "................",
  "................",
];

// The Air Wizard. o is the outline, r his robe and hat, w his beard and s skin.
const WIZARD = [
  ".......oo.......",
  "......orro......",
  ".....orrrro.....",
  "....orrrrrro....",
  "...oooooooooo...",
  "....osssssso....",
  "....sosssoss....",
  "....wwwwwwww....",
  "...rwwwwwwwwr...",
  "..rrrwwwwwwrrr..",
  "..rrrrwwwwrrrr..",
  "..srrrrwwrrrrs..",
  "...rrrrrrrrrr...",
  "...rrrrrrrrrr...",
  "..orrrrrrrrrro..",
  "..oooooooooooo..",
];

// Small effects, all drawn in white.
const SPARK = ["...w....", ".w.w.w..", "..www...", "wwwwwww.", "..www...", ".w.w.w..", "...w....", "........"];

const SMASH = [
  "................",
  ".w.....ww.....w.",
  "..w....ww....w..",
  "...w........w...",
  "....w......w....",
  "................",
  "................",
  ".ww..........ww.",
  ".ww..........ww.",
  "................",
  "................",
  "....w......w....",
  "...w........w...",
  "..w....ww....w..",
  ".w.....ww.....w.",
  "................",
];

// The arc drawn in front of the player while swinging (this one points up).
const SLASH = ["....wwwwwwww....", "..ww........ww..", ".w............w.", "w..............w"];

// Furniture.
const WORKBENCH = [
  "................",
  "................",
  "................",
  ".oooooooooooooo.",
  ".ollllllllllllo.",
  ".ollooolllllllo.",
  ".ollllllllllllo.",
  ".oooooooooooooo.",
  ".obbbbbbbbbbbbo.",
  ".obbbbbbbbbbbbo.",
  ".oooooooooooooo.",
  ".obbo......obbo.",
  ".obbo......obbo.",
  ".obbo......obbo.",
  ".oooo......oooo.",
  "................",
];
const CHEST = [
  "................",
  "................",
  "................",
  "..oooooooooooo..",
  ".olllllllllllbo.",
  ".olbbbbbbbbbbbo.",
  ".olbbbbbbbbbbbo.",
  ".oooooooooooooo.",
  ".ollllloyylllbo.",
  ".olbbbboyybbbbo.",
  ".olbbbbboobbbbo.",
  ".olbbbbbbbbbbbo.",
  ".olbbbbbbbbbbbo.",
  ".oooooooooooooo.",
  "................",
  "................",
];
const OVEN = [
  "................",
  "................",
  "..oooooooooooo..",
  ".oggggggggggggo.",
  ".oggggggggggggo.",
  ".ogddddddddddgo.",
  ".oggggggggggggo.",
  ".oggookkkkooggo.",
  ".oggokkkkkkoggo.",
  ".oggokkkkkkoggo.",
  ".oggokkkkkkoggo.",
  ".oggooooooooggo.",
  ".oggggggggggggo.",
  ".oooooooooooooo.",
  "................",
  "................",
];
const FURNACE = [
  "................",
  "................",
  "..oooooooooooo..",
  ".oggggggggggggo.",
  ".ogddggggggddgo.",
  ".oggggggggggggo.",
  ".oggooooooooggo.",
  ".oggokkrrkkoggo.",
  ".oggokryyrkoggo.",
  ".oggorryyrroggo.",
  ".oggooooooooggo.",
  ".oggggggggggggo.",
  ".ogddggggggddgo.",
  ".oooooooooooooo.",
  "................",
  "................",
];
const ANVIL = [
  "................",
  "................",
  "................",
  "................",
  ".oooooooooooo...",
  ".ohhhhhhhhhhmoo.",
  ".ommmmmmmmmmmmo.",
  "..oommmmmmmmoo..",
  "....ommmmmmo....",
  ".....ommmmo.....",
  ".....ommmmo.....",
  "....ommmmmmo....",
  "...ommmmmmmmo...",
  "...oddddddddo...",
  "...oooooooooo...",
  "................",
];
const LANTERN = [
  "................",
  "................",
  "................",
  "......oooo......",
  ".....ommmmo.....",
  "....oooooooo....",
  "....oyyyyyyo....",
  "....oywwyyyo....",
  "....oywwyyyo....",
  "....oyyyyyyo....",
  "....oyyyyyyo....",
  "....oooooooo....",
  ".....ommmmo.....",
  "....oooooooo....",
  "................",
  "................",
];

// The heart and the stamina bolt on the bottom bar.
const HEART = ["........", ".aa.aa..", "abbabba.", "abcbbba.", "abbbbba.", ".abbba..", "..aba...", "...a...."];
const BOLT = ["....aa..", "...aba..", "..abba..", ".abbbaaa", "aaabbba.", "..abba..", "..aba...", "..aa...."];

// 8x8 item icons.
// Shapes are shared: one "chunk" drawing serves stone, coal and both ores, each
// with its own colours (see ICONS below).
const ICON_SHAPES = {
  chunk: ["........", "..aaaa..", ".abbcba.", "abbcbbba", "abbbbbca", "abcbbbba", ".aaaaaa.", "........"],
  ingot: ["........", "...aaaa.", "..acccba", ".acccbba", "acccbba.", "abbbba..", ".aaaa...", "........"],
  gem: ["........", "..aaaa..", ".acccba.", "acccbbba", ".abbbba.", "..abba..", "...aa...", "........"],
  log: ["........", ".aaaaaa.", "abbbbbca", "abcbbbba", "abbbbcba", "abbcbbba", ".aaaaaa.", "........"],
  apple: ["....a...", "...a....", ".bbabb..", "bbcbbbb.", "bcbbbbb.", "bbbbbbb.", ".bbbbb..", "..b.b..."],
  bread: ["........", "..aaaa..", ".abbbba.", "abcbcbba", "abbbbbba", "abbbbbba", ".aaaaaa.", "........"],
  acorn: ["...a....", "..aaaa..", ".aaaaaa.", ".bbbbbb.", ".bcbbbb.", ".bbbbbb.", "..bbbb..", "...bb..."],
  flower: ["..bb....", ".bccb...", ".bccb...", "..bb.a..", "...aa...", "...a....", "..aa....", "...a...."],
  cactus: ["...aa...", "...ab.a.", ".a.ab.a.", ".a.abaa.", ".aaab...", "...ab...", "...ab...", "...ab..."],
  seeds: ["........", ".a...b..", "b...a...", "...b...a", ".a...b..", "b...a...", "...b....", "........"],
  wheat: ["..a.a.a.", "..a.a.a.", "..a.a.a.", "...aaa..", "...bbb..", "...aaa..", "..a.a.a.", ".a..a..a"],
  ball: ["........", "..aaaa..", ".abbbba.", ".abcbba.", ".abbbba.", ".abbbba.", "..aaaa..", "........"],
  cloth: ["........", ".aaaaaa.", ".abbbba.", ".acccca.", ".abbbba.", ".acccca.", ".aaaaaa.", "........"],
  pile: ["........", "........", "...bb...", "..bcbb..", ".bbbbcb.", "bbcbbbbb", "aaaaaaaa", "........"],
  glass: [".aaaaaa.", "abbcbbba", "abcbbbba", "abbbbbba", "abbbbcba", "abbbcbba", "abbbbbba", ".aaaaaa."],
  glove: ["..aaaa..", ".abbbba.", ".abbbbaa", ".abbbbba", ".abbbbba", "..abbba.", "..abbba.", "..aaaaa."],
  workbench: ["........", "aaaaaaaa", "abbbbbba", "aaaaaaaa", ".ac..ca.", ".ac..ca.", ".aa..aa.", "........"],
  chest: ["........", ".aaaaaa.", "abbbbbba", "aaaccaaa", "abbccbba", "abbbbbba", "aaaaaaaa", "........"],
  stove: ["........", ".aaaaaa.", "abbbbbba", "abcddcba", "abcddcba", "abbbbbba", "aaaaaaaa", "........"],
  anvil: ["........", "aaaaaaa.", "abbbbbba", ".aabbaa.", "..abba..", ".abbbba.", ".aaaaaa.", "........"],
  lantern: ["..aaaa..", "...aa...", "..aaaa..", "..abba..", "..abba..", "..abba..", "..aaaa..", "........"],
  shovel: [".....mm.", "....mmmm", "....mmmm", "...hmmm.", "..hh....", ".hh.....", "hh......", "........"],
  hoe: ["..mmmmh.", "..m..hh.", "....hh..", "...hh...", "..hh....", ".hh.....", "hh......", "........"],
  sword: ["......mm", ".....mmm", "....mmm.", "...mmm..", "h.mmm...", ".hhm....", ".hh.....", "h..h...."],
  pick: ["..mmmm..", ".m...hm.", "....hh.m", "...hh..m", "..hh....", ".hh.....", "hh......", "........"],
  axe: ["....mm..", "...mmmm.", "..mmmhmm", "...mhhm.", "...hh...", "..hh....", ".hh.....", "hh......"],
};

// Shorthand for a palette with the letters a, b and c, and sometimes d.
const abc = (a, b, c, d) => ({ a: C(a), b: C(b), c: C(c), d: d === undefined ? undefined : C(d) });

// Which shape and which colours each item's icon uses.
const ICONS = {
  powerGlove: ["glove", abc(100, 430, 430)],
  apple: ["apple", abc(110, 500, 533)],
  bread: ["bread", abc(110, 330, 550)],
  wood: ["log", abc(200, 531, 430)],
  acorn: ["acorn", abc(210, 531, 553)],
  cactus: ["cactus", abc(30, 50, 50)],
  flower: ["flower", abc(20, 555, 440)],
  seeds: ["seeds", abc(40, 252, 0)],
  wheat: ["wheat", abc(440, 220, 0)],
  slime: ["ball", abc(10, 30, 151)],
  cloth: ["cloth", abc(222, 444, 555)],
  sand: ["pile", abc(440, 550, 553)],
  dirt: ["pile", abc(100, 322, 433)],
  cloud: ["pile", abc(222, 555, 444)],
  stone: ["chunk", abc(111, 333, 555)],
  coal: ["chunk", abc(0, 111, 222)],
  ironOre: ["chunk", abc(100, 322, 544)],
  goldOre: ["chunk", abc(110, 440, 553)],
  gem: ["gem", abc(101, 404, 545)],
  iron: ["ingot", abc(100, 333, 555)],
  gold: ["ingot", abc(110, 440, 553)],
  glass: ["glass", abc(555, 335, 555)],
  workbench: ["workbench", abc(100, 431, 321)],
  chest: ["chest", abc(100, 431, 550)],
  oven: ["stove", abc(0, 332, 111, 111)],
  furnace: ["stove", abc(0, 222, 500, 550)],
  anvil: ["anvil", abc(0, 444, 0)],
  lantern: ["lantern", abc(111, 550, 0)],
};

// Tool icons are put together when asked for: the shape comes from the kind of
// tool and the colour of its head from what it is made of.
const TOOL_SHAPE = { [TOOL.SHOVEL]: "shovel", [TOOL.HOE]: "hoe", [TOOL.SWORD]: "sword", [TOOL.PICK]: "pick", [TOOL.AXE]: "axe" };
const TIER_HEAD = [431, 333, 555, 550, 55];

// The sets of colours for the drawings above, one colour per letter. "white"
// and "black" paint every letter the same colour, for hit flashes and shadows.
const PALETTES = {
  player: { o: C(100), s: C(532), c: C(220) },
  // The other players in a multiplayer game wear blue, red or purple, so you
  // can tell them from yourself and from each other.
  friend_0: { o: C(100), s: C(532), c: C(125) },
  friend_1: { o: C(100), s: C(532), c: C(411) },
  friend_2: { o: C(100), s: C(532), c: C(314) },
  zombie_g: { o: C(10), s: C(252), c: C(50) },
  zombie_r: { o: C(100), s: C(522), c: C(50) },
  zombie_w: { o: C(111), s: C(444), c: C(50) },
  zombie_b: { o: C(0), s: C(111), c: C(20) },
  slime_g: { o: C(10), b: C(252), e: C(555) },
  slime_r: { o: C(100), b: C(522), e: C(555) },
  slime_w: { o: C(111), b: C(444), e: C(555) },
  slime_b: { o: C(0), b: C(111), e: C(224) },
  wizard: { o: C(100), r: C(500), w: C(555), s: C(532) },
  wizardAngry: { o: C(100), r: C(555), w: C(500), s: C(532) },
  white: { w: C(555) },
  black: { w: "#000" },
  wood: { o: C(100), l: C(431), b: C(321), y: C(550) },
  stone: { o: C(0), g: C(332), d: C(221), k: C(111), r: C(500), y: C(550) },
  furnace: { o: C(0), g: C(222), d: C(111), k: C(111), r: C(500), y: C(550) },
  metal: { o: C(0), m: C(444), h: C(555), d: C(222) },
  lantern: { o: C(0), m: C(222), y: C(550), w: C(555) },
  heart: { a: C(200), b: C(500), c: C(533) },
  heartEmpty: { a: C(100), b: C(0), c: C(0) },
  bolt: { a: C(220), b: C(550) },
  boltEmpty: { a: C(110), b: C(0) },
  boltFlash: { a: C(555), b: C(555) },
};

// Every drawing, by name. The second walking frames and all the zombie frames
// are made from the player's body by the two functions above.
const SPRITES = {
  body_down_0: BODY_DOWN_A,
  body_down_1: otherFoot(BODY_DOWN_A),
  body_up_0: BODY_UP_A,
  body_up_1: otherFoot(BODY_UP_A),
  body_side_0: BODY_SIDE_A,
  body_side_1: BODY_SIDE_B,
  zombie_down_0: zombify(BODY_DOWN_A, [5, 9]),
  zombie_down_1: zombify(otherFoot(BODY_DOWN_A), [5, 9]),
  zombie_up_0: zombify(BODY_UP_A),
  zombie_up_1: zombify(otherFoot(BODY_UP_A)),
  zombie_side_0: zombify(BODY_SIDE_A, [10]),
  zombie_side_1: zombify(BODY_SIDE_B, [10]),
  slime_0: SLIME_REST,
  slime_1: SLIME_JUMP,
  wizard: WIZARD,
  spark: SPARK,
  smash: SMASH,
  slash: SLASH,
  workbench: WORKBENCH,
  chest: CHEST,
  oven: OVEN,
  furnace: FURNACE,
  anvil: ANVIL,
  lantern: LANTERN,
  heart: HEART,
  bolt: BOLT,
};

// Which palette each piece of furniture is painted with.
const FURNITURE_PAL = { workbench: "wood", chest: "wood", oven: "stone", furnace: "furnace", anvil: "metal", lantern: "lantern" };

// Throws if any drawing has a ragged row or uses a letter its palette lacks.
export function validateSprites() {
  const check = (name, rows) => {
    const w = rows[0].length;
    rows.forEach((r, i) => {
      if (r.length !== w) throw new Error(`sprite ${name} row ${i} is ${r.length} wide, expected ${w}`);
    });
  };
  for (const [name, rows] of Object.entries(SPRITES)) check(name, rows);
  for (const [name, rows] of Object.entries(ICON_SHAPES)) check(`icon ${name}`, rows);
  for (const [id, [shape, pal]] of Object.entries(ICONS)) {
    if (!ICON_SHAPES[shape]) throw new Error(`icon ${id} uses unknown shape ${shape}`);
    for (const ch of ICON_SHAPES[shape].join("")) {
      if (ch !== "." && !pal[ch]) throw new Error(`icon ${id} has no colour for "${ch}"`);
    }
  }
  return Object.keys(SPRITES).length + Object.keys(ICONS).length;
}

// Finished pictures, so each drawing is only turned into a picture once for
// each palette and flip.
const cache = new Map();

// Turn a drawing and a palette into a small picture, mirrored if asked. A
// letter missing from the palette comes out bright pink, so the mistake is easy
// to spot.
function bake(rows, pal, flipX, flipY) {
  const w = rows[0].length;
  const h = rows.length;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      ctx.fillStyle = pal === PALETTES.white || pal === PALETTES.black ? pal.w : pal[ch] || "#f0f";
      ctx.fillRect(flipX ? w - 1 - x : x, flipY ? h - 1 - y : y, 1, 1);
    }
  }
  return cv;
}

// A ready-to-draw canvas for a sprite in a given palette.
export function sprite(name, palName, flipX = false, flipY = false) {
  const key = `${name}|${palName}|${flipX ? 1 : 0}${flipY ? 1 : 0}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = bake(SPRITES[name], PALETTES[palName], flipX, flipY);
    cache.set(key, cv);
  }
  return cv;
}

// The picture for a piece of furniture.
export function furnitureSprite(kind, white = false) {
  return sprite(kind, white ? "white" : FURNITURE_PAL[kind] || "wood");
}

// The 8x8 icon for an inventory item. `shadow` gives an all-black copy.
export function icon(itemId, shadow = false) {
  const key = `icon|${itemId}|${shadow ? 1 : 0}`;
  let cv = cache.get(key);
  if (cv) return cv;
  let rows;
  let pal;
  const def = itemDef(itemId);
  if (ICONS[itemId]) {
    rows = ICON_SHAPES[ICONS[itemId][0]];
    pal = ICONS[itemId][1];
  } else if (def && def.tool !== undefined) {
    rows = ICON_SHAPES[TOOL_SHAPE[def.tool]];
    pal = { h: C(321), m: C(TIER_HEAD[def.tier] ?? 333) };
  } else {
    rows = ICON_SHAPES.chunk;
    pal = abc(111, 333, 555);
  }
  if (shadow) pal = Object.fromEntries(Object.keys(pal).map((k) => [k, "#000"]));
  cv = bake(rows, pal, false, false);
  cache.set(key, cv);
  return cv;
}
