const SIZE = 16;
const keys = [];
const map = new Map();

function pal(p, x, y, c) {
  if (c == null) return;
  p[y * SIZE + x] = c;
}

function box(p, x, y, w, h, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pal(p, x + i, y + j, c);
}

function make(name, draw) {
  const p = new Array(SIZE * SIZE).fill(null);
  draw(p);
  keys.push(name);
  map.set(name, p);
}

function blob(p, cx, cy, r, c) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) pal(p, x, y, c);
    }
  }
}

export function buildSprites() {
  if (map.size) return { keys, map };

  make("player_down", (p) => {
    box(p, 5, 2, 6, 5, "#e0b080");
    box(p, 4, 7, 8, 6, "#6b3a18");
    pal(p, 6, 4, "#202020");
    pal(p, 9, 4, "#202020");
    box(p, 4, 13, 3, 2, "#3a220c");
    box(p, 9, 13, 3, 2, "#3a220c");
  });
  make("player_up", (p) => {
    box(p, 5, 2, 6, 5, "#e0b080");
    box(p, 4, 7, 8, 6, "#6b3a18");
    box(p, 4, 13, 3, 2, "#3a220c");
    box(p, 9, 13, 3, 2, "#3a220c");
  });
  make("player_left", (p) => {
    box(p, 5, 2, 6, 5, "#e0b080");
    box(p, 4, 7, 8, 6, "#6b3a18");
    pal(p, 6, 4, "#202020");
    box(p, 4, 13, 3, 2, "#3a220c");
    box(p, 9, 13, 3, 2, "#3a220c");
  });
  make("player_right", (p) => {
    box(p, 5, 2, 6, 5, "#e0b080");
    box(p, 4, 7, 8, 6, "#6b3a18");
    pal(p, 9, 4, "#202020");
    box(p, 4, 13, 3, 2, "#3a220c");
    box(p, 9, 13, 3, 2, "#3a220c");
  });

  make("slime_g", (p) => {
    blob(p, 8, 10, 6, "#4caf20");
    pal(p, 6, 8, "#102010");
    pal(p, 10, 8, "#102010");
  });
  make("slime_r", (p) => {
    blob(p, 8, 10, 6, "#c03020");
    pal(p, 6, 8, "#200808");
    pal(p, 10, 8, "#200808");
  });
  make("slime_w", (p) => {
    blob(p, 8, 10, 6, "#d8d8e8");
    pal(p, 6, 8, "#303040");
    pal(p, 10, 8, "#303040");
  });
  make("slime_b", (p) => {
    blob(p, 8, 10, 6, "#303038");
    pal(p, 6, 8, "#e8e8e8");
    pal(p, 10, 8, "#e8e8e8");
  });

  const zombie = (name, shirt, pants) =>
    make(name, (p) => {
      box(p, 5, 1, 6, 5, "#7cb050");
      box(p, 4, 6, 8, 6, shirt);
      box(p, 5, 12, 2, 3, pants);
      box(p, 9, 12, 2, 3, pants);
      pal(p, 6, 3, "#102010");
      pal(p, 9, 3, "#102010");
    });
  zombie("zombie_g", "#2f6b20", "#243018");
  zombie("zombie_r", "#8a2020", "#401010");
  zombie("zombie_w", "#d0d0dc", "#686878");
  zombie("zombie_b", "#202028", "#101014");

  make("wizard", (p) => {
    box(p, 5, 1, 6, 5, "#e8e0c0");
    box(p, 3, 6, 10, 8, "#4060c0");
    box(p, 6, 0, 4, 3, "#304090");
    pal(p, 6, 3, "#202040");
    pal(p, 9, 3, "#202040");
  });

  make("spark", (p) => {
    blob(p, 8, 8, 3, "#c0e8ff");
    blob(p, 8, 8, 1, "#ffffff");
  });

  const itemBox = (name, c, inner) =>
    make(name, (p) => {
      box(p, 4, 4, 8, 8, c);
      if (inner) box(p, 6, 6, 4, 4, inner);
    });

  itemBox("wood", "#8a5a28", "#c09050");
  itemBox("stone", "#808080", "#b0b0b0");
  itemBox("dirtItem", "#6b4420", "#8a5a30");
  itemBox("sandItem", "#d8c060", "#f0e090");
  itemBox("coal", "#202020", "#505050");
  itemBox("ironOre", "#8a6040", "#c0a070");
  itemBox("goldOre", "#c0a020", "#f0d040");
  itemBox("gem", "#20a0c0", "#80e0ff");
  itemBox("iron", "#b0b8c0", "#e8eef0");
  itemBox("gold", "#e0c020", "#fff070");
  itemBox("glass", "#a0d0e0", "#e8ffff");
  itemBox("slime", "#40b030", "#80e060");
  itemBox("cloth", "#b0b0c0", "#e0e0e8");
  itemBox("wheat", "#c8b040", "#efe070");
  itemBox("seeds", "#90a040", "#c0d060");
  itemBox("acorn", "#704018", "#a06030");
  itemBox("apple", "#c03020", "#e05040");
  itemBox("bread", "#d0a050", "#f0d080");
  itemBox("flowerItem", "#e8e8e8", "#f0d040");
  itemBox("cactusItem", "#208020", "#40c040");
  itemBox("cloudItem", "#e8e8f8", "#ffffff");
  itemBox("glove", "#c0a070", "#ffe0b0");

  make("workbench", (p) => {
    box(p, 1, 6, 14, 8, "#8a5a28");
    box(p, 2, 4, 12, 4, "#c09050");
  });
  make("chest", (p) => {
    box(p, 2, 5, 12, 9, "#8a5a20");
    box(p, 2, 8, 12, 2, "#c09040");
    pal(p, 8, 10, "#d0b030");
  });
  make("oven", (p) => {
    box(p, 3, 3, 10, 12, "#606060");
    box(p, 5, 7, 6, 5, "#202020");
    box(p, 6, 8, 4, 3, "#e05020");
  });
  make("furnace", (p) => {
    box(p, 2, 2, 12, 13, "#707078");
    box(p, 5, 7, 6, 5, "#e04010");
  });
  make("anvil", (p) => {
    box(p, 2, 6, 12, 4, "#909098");
    box(p, 6, 10, 4, 5, "#606068");
  });
  make("lantern", (p) => {
    box(p, 6, 2, 4, 3, "#808088");
    box(p, 5, 5, 6, 8, "#f0d040");
    box(p, 6, 6, 4, 5, "#fff0a0");
  });

  const toolSpr = (id, head, shaft = "#8a5a28") =>
    make(id, (p) => {
      box(p, 7, 4, 2, 10, shaft);
      box(p, 4, 3, 8, 4, head);
    });

  const heads = { wood: "#c09050", rock: "#909090", iron: "#c8d0d8", gold: "#f0d040", gem: "#40e0ff" };
  for (const [tier, col] of Object.entries(heads)) {
    for (const t of ["Shovel", "Hoe", "Sword", "Pick", "Axe"]) toolSpr(`${tier}${t}`, col);
  }

  return { keys, map };
}

export function spritePixels(name) {
  buildSprites();
  return map.get(name);
}
