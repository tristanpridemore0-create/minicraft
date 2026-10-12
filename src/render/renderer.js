import { TILE, VIEW_W, VIEW_H, SCALE, DIR } from "../constants.js";
import { Tile } from "../world/tiles.js";
import { spritePixels, buildSprites } from "./sprites.js";
import { itemDef } from "../items/defs.js";

function itemSprite(id) {
  const d = itemDef(id);
  return d && d.sprite ? d.sprite : id;
}

const TILE_COL = {
  [Tile.grass]: ["#4c9a20", "#3d8218"],
  [Tile.dirt]: ["#8a5a30", "#6e4624"],
  [Tile.sand]: ["#e0c860", "#c8b048"],
  [Tile.water]: ["#1a64c8", "#1450a8"],
  [Tile.lava]: ["#e05010", "#a02808"],
  [Tile.rock]: ["#7a7a7a", "#5a5a5a"],
  [Tile.hardRock]: ["#505060", "#303040"],
  [Tile.stoneFloor]: ["#6a6a6a", "#585858"],
  [Tile.hole]: ["#1a120c", "#100c08"],
  [Tile.fall]: ["#000008", "#000010"],
  [Tile.cloud]: ["#e8e8f8", "#d0d0e8"],
  [Tile.flower]: ["#4c9a20", "#3d8218"],
  [Tile.tree]: ["#4c9a20", "#3d8218"],
  [Tile.cactus]: ["#e0c860", "#c8b048"],
  [Tile.farm]: ["#6e4624", "#5a381c"],
  [Tile.ironOre]: ["#8a7060", "#6a5040"],
  [Tile.goldOre]: ["#8a7a40", "#6a5a28"],
  [Tile.gemOre]: ["#406878", "#284858"],
  [Tile.stairsDown]: ["#6a6a6a", "#404040"],
  [Tile.stairsUp]: ["#6a6a6a", "#909090"],
  [Tile.sapling]: ["#4c9a20", "#3d8218"],
  [Tile.cactusSapling]: ["#e0c860", "#c8b048"],
  [Tile.wheat0]: ["#6e4624", "#5a381c"],
  [Tile.wheat1]: ["#6e4624", "#5a381c"],
  [Tile.wheat2]: ["#6e4624", "#5a381c"],
  [Tile.wheat3]: ["#6e4624", "#5a381c"],
  [Tile.cloudCactus]: ["#e8e8f8", "#d0d0e8"],
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.buf = document.createElement("canvas");
    this.buf.width = VIEW_W;
    this.buf.height = VIEW_H;
    this.bctx = this.buf.getContext("2d");
    this.bctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    buildSprites();
    this.spriteCache = new Map();
  }

  cam(player) {
    let cx = Math.floor(player.x - VIEW_W / 2);
    let cy = Math.floor(player.y - VIEW_H / 2);
    return { cx, cy };
  }

  frame(game) {
    const ctx = this.bctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!game.player || !game.player.level) return;
    const level = game.player.level;
    const { cx, cy } = this.cam(game.player);
    const t0x = Math.floor(cx / TILE);
    const t0y = Math.floor(cy / TILE);
    const tick = game.tick;

    for (let ty = t0y; ty <= t0y + 9; ty++) {
      for (let tx = t0x; tx <= t0x + 11; tx++) {
        this.drawTile(ctx, level, tx, ty, cx, cy, tick);
      }
    }

    const ents = [...level.entities, game.player].sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (e.removed) continue;
      this.drawEntity(ctx, e, cx, cy, tick);
    }

    this.drawFog(ctx, level, cx, cy);
    this.drawHud(ctx, game);
  }

  drawTile(ctx, level, tx, ty, cx, cy, tick) {
    const id = level.get(tx, ty);
    const x = tx * TILE - cx;
    const y = ty * TILE - cy;
    const pal = TILE_COL[id] || ["#222", "#111"];
    const wob = id === Tile.water || id === Tile.lava ? ((tx + ty + (tick >> 4)) & 1) : (tx + ty) & 1;
    ctx.fillStyle = pal[wob];
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = pal[1 - wob];
    ctx.fillRect(x + 2, y + 2, 3, 3);
    ctx.fillRect(x + 9, y + 8, 4, 3);

    if (id === Tile.tree) {
      ctx.fillStyle = "#3a220c";
      ctx.fillRect(x + 7, y + 10, 3, 6);
      ctx.fillStyle = "#2e7a18";
      ctx.fillRect(x + 3, y + 1, 10, 10);
      ctx.fillStyle = "#246014";
      ctx.fillRect(x + 5, y + 3, 6, 6);
    } else if (id === Tile.flower) {
      ctx.fillStyle = "#f0f0e0";
      ctx.fillRect(x + 4, y + 5, 2, 2);
      ctx.fillStyle = "#f0d040";
      ctx.fillRect(x + 10, y + 8, 2, 2);
    } else if (id === Tile.cactus || id === Tile.cloudCactus) {
      ctx.fillStyle = "#2a8a28";
      ctx.fillRect(x + 6, y + 2, 4, 12);
      ctx.fillRect(x + 3, y + 5, 3, 3);
      ctx.fillRect(x + 10, y + 8, 3, 3);
    } else if (id === Tile.sapling) {
      ctx.fillStyle = "#3a7a18";
      ctx.fillRect(x + 7, y + 8, 2, 6);
      ctx.fillRect(x + 6, y + 6, 4, 3);
    } else if (id === Tile.cactusSapling) {
      ctx.fillStyle = "#2a8a28";
      ctx.fillRect(x + 7, y + 8, 2, 6);
    } else if (id === Tile.wheat0 || id === Tile.wheat1 || id === Tile.wheat2 || id === Tile.wheat3) {
      const h = 4 + (id - Tile.wheat0) * 3;
      ctx.fillStyle = id === Tile.wheat3 ? "#d8c050" : "#88a038";
      ctx.fillRect(x + 4, y + 14 - h, 2, h);
      ctx.fillRect(x + 8, y + 15 - h, 2, h - 1);
      ctx.fillRect(x + 11, y + 14 - h, 2, h);
    } else if (id === Tile.ironOre) {
      ctx.fillStyle = "#c0a090";
      ctx.fillRect(x + 5, y + 5, 3, 3);
      ctx.fillRect(x + 10, y + 9, 3, 3);
    } else if (id === Tile.goldOre) {
      ctx.fillStyle = "#f0d040";
      ctx.fillRect(x + 5, y + 5, 3, 3);
      ctx.fillRect(x + 10, y + 9, 3, 3);
    } else if (id === Tile.gemOre) {
      ctx.fillStyle = "#40e0ff";
      ctx.fillRect(x + 5, y + 5, 3, 3);
      ctx.fillRect(x + 10, y + 9, 3, 3);
    } else if (id === Tile.stairsDown) {
      ctx.fillStyle = "#202020";
      ctx.fillRect(x + 3, y + 3, 10, 10);
      ctx.fillStyle = "#505050";
      ctx.fillRect(x + 4, y + 4, 8, 2);
      ctx.fillRect(x + 5, y + 7, 6, 2);
      ctx.fillRect(x + 6, y + 10, 4, 2);
    } else if (id === Tile.stairsUp) {
      ctx.fillStyle = "#d0d0d0";
      ctx.fillRect(x + 3, y + 3, 10, 10);
      ctx.fillStyle = "#808080";
      ctx.fillRect(x + 6, y + 4, 4, 2);
      ctx.fillRect(x + 5, y + 7, 6, 2);
      ctx.fillRect(x + 4, y + 10, 8, 2);
    } else if (id === Tile.rock || id === Tile.hardRock) {
      ctx.fillStyle = "#9a9a9a";
      ctx.fillRect(x + 1, y + 2, 14, 3);
      ctx.fillStyle = "#404040";
      ctx.fillRect(x + 2, y + 11, 12, 3);
    }
  }

  drawEntity(ctx, e, cx, cy, tick) {
    const x = Math.floor(e.x - cx) - 8;
    const y = Math.floor(e.y - cy) - 8;
    let name = "player_down";
    if (e.type === "player") {
      const names = ["player_down", "player_up", "player_left", "player_right"];
      name = names[e.dir] || name;
    } else if (e.type === "mob") name = e.sprite;
    else if (e.type === "wizard") name = "wizard";
    else if (e.type === "spark") name = "spark";
    else if (e.type === "furniture") name = e.kind;
    else if (e.type === "item") {
      const def = itemSprite(e.itemId);
      name = spritePixels(def) ? def : "wood";
      const blink = e.life < 120 && (tick & 4);
      if (blink) return;
    }
    if (e.hurtTime && tick % 2 === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 4, y + 4, 8, 10);
      return;
    }
    this.blitSprite(ctx, name, x, y);
    if (e.type === "player" && e.attackTime > 0) {
      ctx.fillStyle = "#fff8e0";
      const d = e.dir;
      if (d === DIR.DOWN) ctx.fillRect(x + 6, y + 14, 4, 6);
      if (d === DIR.UP) ctx.fillRect(x + 6, y - 2, 4, 6);
      if (d === DIR.LEFT) ctx.fillRect(x - 2, y + 6, 6, 4);
      if (d === DIR.RIGHT) ctx.fillRect(x + 12, y + 6, 6, 4);
    }
  }

  blitSprite(ctx, name, x, y) {
    const px = spritePixels(name);
    if (!px) return;
    for (let i = 0; i < 256; i++) {
      const c = px[i];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + (i % 16), y + ((i / 16) | 0), 1, 1);
    }
  }

  drawFog(ctx, level, cx, cy) {
    if (level.id === 0 || level.id === 1) return;
    const t0x = Math.floor(cx / TILE);
    const t0y = Math.floor(cy / TILE);
    for (let ty = t0y; ty <= t0y + 9; ty++) {
      for (let tx = t0x; tx <= t0x + 11; tx++) {
        if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) continue;
        const L = level.light[level.idx(tx, ty)];
        if (L >= 8) continue;
        const a = 1 - L / 8;
        ctx.fillStyle = `rgba(0,0,0,${a.toFixed(2)})`;
        ctx.fillRect(tx * TILE - cx, ty * TILE - cy, TILE, TILE);
      }
    }
  }

  drawHud(ctx, game) {
    const p = game.player;
    ctx.fillStyle = "#000000aa";
    ctx.fillRect(0, 0, VIEW_W, 10);
    for (let i = 0; i < p.maxHealth; i++) {
      ctx.fillStyle = i < p.health ? "#d02020" : "#401010";
      ctx.fillRect(2 + i * 8, 2, 7, 6);
    }
    for (let i = 0; i < p.maxStamina; i++) {
      ctx.fillStyle = i < p.stamina ? "#f0d040" : "#404010";
      ctx.fillRect(82 + i * 8, 2, 7, 6);
    }
    const slot = p.activeSlot();
    if (slot) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(2, VIEW_H - 9, 2, 2);
    }
  }

  blit() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buf, 0, 0, this.canvas.width, this.canvas.height);
  }

  buffer() {
    return this.buf;
  }
}
