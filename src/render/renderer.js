import { TILE, MAP, VIEW_W, VIEW_H, DIR } from "../constants.js";
import { Tile } from "../world/tiles.js";
import { C } from "./palette.js";
import { drawTile, drawFallBackground } from "./tileart.js";
import { sprite, furnitureSprite, icon } from "./sprites.js";
import { drawText } from "./font.js";
import { drawItem } from "./itemdraw.js";

// The bottom two text rows belong to the HUD; the world fills the rest.
export const HUD_H = 16;
export const WORLD_H = VIEW_H - HUD_H;

// Cave darkness is a 4x4 ordered dither: the dimmer the light at a pixel, the
// more of the pattern is painted black.
const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const DIR_NAME = ["down", "up", "side", "side"];
const SLASH_ANGLE = { [DIR.UP]: 0, [DIR.DOWN]: Math.PI, [DIR.LEFT]: -Math.PI / 2, [DIR.RIGHT]: Math.PI / 2 };
const SLASH_ICON = { [DIR.UP]: [4, -6], [DIR.DOWN]: [4, 14], [DIR.LEFT]: [-6, 4], [DIR.RIGHT]: [14, 4] };

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
    this.light = new Uint8Array(VIEW_W * WORLD_H);
    this.lightCanvas = document.createElement("canvas");
    this.lightCanvas.width = VIEW_W;
    this.lightCanvas.height = WORLD_H;
    this.lctx = this.lightCanvas.getContext("2d");
    this.lightImg = this.lctx.createImageData(VIEW_W, WORLD_H);
    this.cx = 0;
    this.cy = 0;
  }

  cam(player) {
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    this.cx = clamp(Math.floor(player.x - VIEW_W / 2), MAP * TILE - VIEW_W);
    this.cy = clamp(Math.floor(player.y - WORLD_H / 2), MAP * TILE - WORLD_H);
  }

  frame(game) {
    const ctx = this.bctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (!game.player || !game.player.level) return;
    const level = game.player.level;
    this.cam(game.player);
    const { cx, cy } = this;
    const tick = game.tick;

    if (level.id === 1) drawFallBackground(ctx, cx, cy, VIEW_W, WORLD_H);

    const tx1 = Math.floor((cx + VIEW_W - 1) / TILE);
    const ty1 = Math.floor((cy + WORLD_H - 1) / TILE);
    for (let ty = Math.floor(cy / TILE); ty <= ty1; ty++) {
      for (let tx = Math.floor(cx / TILE); tx <= tx1; tx++) {
        drawTile(ctx, level, tx, ty, tx * TILE - cx, ty * TILE - cy, tick);
      }
    }

    const onScreen = (e) => e.x > cx - 24 && e.x < cx + VIEW_W + 24 && e.y > cy - 32 && e.y < cy + WORLD_H + 24;
    const ents = level.entities.filter((e) => !e.removed && onScreen(e));
    if (!game.dead) ents.push(game.player);
    const overhead = (e) => e.type === "text" || e.type === "smash";
    ents.sort((a, b) => overhead(a) - overhead(b) || a.y - b.y);
    for (const e of ents) this.drawEntity(ctx, e, tick);

    if (level.id < 0) this.drawDarkness(ctx, game, level);
    this.drawHud(ctx, game);
  }

  drawEntity(ctx, e, tick) {
    const x = Math.floor(e.x - this.cx);
    const y = Math.floor(e.y - this.cy);
    switch (e.type) {
      case "player":
        this.drawPlayer(ctx, e, x - 8, y - 11, tick);
        break;
      case "mob": {
        const pal = e.hurtTime > 0 ? "white" : `${e.kind}_${e.color}`;
        if (e.kind === "slime") {
          const up = e.jumpTime > 0 ? 1 : 0;
          ctx.drawImage(sprite(`slime_${up}`, pal), x - 8, y - 11 - up * 4);
        } else {
          const name = `zombie_${DIR_NAME[e.dir]}_${(e.walk >> 3) & 1}`;
          ctx.drawImage(sprite(name, pal, e.dir === DIR.LEFT), x - 8, y - 11);
        }
        break;
      }
      case "wizard": {
        let pal = "wizard";
        if (e.hurtTime > 0) pal = "white";
        else if (e.health < e.maxHealth / 10 && (tick >> 2) & 1) pal = "wizardAngry";
        else if (e.health < e.maxHealth / 2 && (tick >> 4) % 4 === 0) pal = "wizardAngry";
        ctx.drawImage(sprite("wizard", pal), x - 8, y - 11);
        break;
      }
      case "spark": {
        if (e.time >= e.lifeTime - 120 && ((e.time / 6) | 0) % 2 === 0) return;
        const n = tick + e.time;
        ctx.drawImage(sprite("spark", "black", !!(n & 2), !!(n & 4)), x - 4, y - 2);
        ctx.drawImage(sprite("spark", "white", !!(n & 2), !!(n & 4)), x - 4, y - 4);
        break;
      }
      case "furniture":
        ctx.drawImage(furnitureSprite(e.kind), x - 8, y - 12);
        break;
      case "item": {
        if (e.time >= e.lifeTime - 120 && ((e.time / 6) | 0) % 2 === 0) return;
        ctx.drawImage(icon(e.itemId, true), x - 4, y - 4);
        ctx.drawImage(icon(e.itemId), x - 4, y - 4 - Math.floor(e.zz || 0));
        break;
      }
      case "text": {
        const tx = x - e.msg.length * 4;
        const ty = y - Math.floor(e.zz);
        drawText(ctx, e.msg, tx + 1, ty + 1, "#000");
        drawText(ctx, e.msg, tx, ty, e.col);
        break;
      }
      case "smash":
        ctx.drawImage(sprite("smash", "white"), x - 8, y - 8);
        break;
    }
  }

  drawPlayer(ctx, p, x, y, tick) {
    const pal = p.hurtTime > 0 ? "white" : "player";
    const body = sprite(`body_${DIR_NAME[p.dir]}_${(p.walk >> 3) & 1}`, pal, p.dir === DIR.LEFT);

    if (p.attackTime > 0 && p.attackDir === DIR.UP) this.drawSwing(ctx, p, x, y);

    if (p.swimming) {
      // Only the top half shows, bobbing in a ring of ripples.
      ctx.drawImage(body, 0, 0, 16, 8, x, y + 4, 16, 8);
      const f = (tick >> 3) & 1;
      ctx.fillStyle = C(115);
      ctx.fillRect(x + 2, y + 12, 12, 1);
      ctx.fillRect(x + 4, y + 13, 8, 1);
      ctx.fillStyle = C(555);
      ctx.fillRect(x + 2 + f * 2, y + 12, 3, 1);
      ctx.fillRect(x + 11 - f * 2, y + 12, 3, 1);
    } else {
      ctx.drawImage(body, x, y);
    }

    const held = p.activeItem();
    if (held && held.kind === "furniture" && !p.swimming) {
      // Furniture is carried overhead with both hands up.
      ctx.fillStyle = pal === "white" ? C(555) : C(532);
      ctx.fillRect(x + 3, y, 2, 3);
      ctx.fillRect(x + 11, y, 2, 3);
      ctx.drawImage(furnitureSprite(held.furniture), x, y - 12);
    }

    if (p.attackTime > 0 && p.attackDir !== DIR.UP) this.drawSwing(ctx, p, x, y);
  }

  drawSwing(ctx, p, x, y) {
    ctx.save();
    ctx.translate(x + 8, y + 8);
    ctx.rotate(SLASH_ANGLE[p.attackDir]);
    ctx.drawImage(sprite("slash", "white"), -8, -13);
    ctx.restore();
    if (p.attackItem) {
      const [ox, oy] = SLASH_ICON[p.attackDir];
      ctx.drawImage(icon(p.attackItem), x + ox, y + oy);
    }
  }

  addLight(lx, ly, r) {
    lx = Math.round(lx);
    ly = Math.round(ly);
    const L = this.light;
    const r2 = r * r;
    const x0 = Math.max(0, lx - r);
    const x1 = Math.min(VIEW_W - 1, lx + r);
    const y0 = Math.max(0, ly - r);
    const y1 = Math.min(WORLD_H - 1, ly + r);
    for (let y = y0; y <= y1; y++) {
      const dy2 = (y - ly) * (y - ly);
      for (let x = x0; x <= x1; x++) {
        const d2 = (x - lx) * (x - lx) + dy2;
        if (d2 >= r2) continue;
        const br = 255 - ((d2 * 255) / r2) | 0;
        const i = x + y * VIEW_W;
        if (L[i] < br) L[i] = br;
      }
    }
  }

  drawDarkness(ctx, game, level) {
    const { cx, cy } = this;
    this.light.fill(0);
    const p = game.player;
    const held = p.activeItem();
    this.addLight(p.x - cx, p.y - cy - 2, held && held.id === "lantern" ? 72 : 40);
    for (const e of level.entities) {
      if (e.type === "furniture" && e.kind === "lantern" && !e.removed) this.addLight(e.x - cx, e.y - cy, 64);
    }
    const tx1 = Math.floor((cx + VIEW_W) / TILE) + 1;
    const ty1 = Math.floor((cy + WORLD_H) / TILE) + 1;
    for (let ty = Math.floor(cy / TILE) - 1; ty <= ty1; ty++) {
      for (let tx = Math.floor(cx / TILE) - 1; tx <= tx1; tx++) {
        if (level.get(tx, ty) === Tile.lava) this.addLight(tx * TILE + 8 - cx, ty * TILE + 8 - cy, 28);
      }
    }
    const d = this.lightImg.data;
    const L = this.light;
    for (let y = 0; y < WORLD_H; y++) {
      const row = ((y + cy) & 3) << 2;
      for (let x = 0; x < VIEW_W; x++) {
        const i = x + y * VIEW_W;
        d[i * 4 + 3] = ((L[i] / 10) | 0) <= DITHER[((x + cx) & 3) + row] ? 255 : 0;
      }
    }
    this.lctx.putImageData(this.lightImg, 0, 0);
    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  drawHud(ctx, game) {
    const p = game.player;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, WORLD_H, VIEW_W, HUD_H);
    for (let i = 0; i < p.maxHealth; i++) {
      ctx.drawImage(sprite("heart", i < p.health ? "heart" : "heartEmpty"), i * 8, WORLD_H);
    }
    // Worn out: the whole stamina row flashes until it starts to refill.
    const wornOut = p.staminaRechargeDelay > 0;
    const flash = ((p.staminaRechargeDelay / 4) | 0) % 2 === 0 ? "boltFlash" : "boltEmpty";
    for (let i = 0; i < p.maxStamina; i++) {
      const pal = wornOut ? flash : i < p.stamina ? "bolt" : "boltEmpty";
      ctx.drawImage(sprite("bolt", pal), i * 8, WORLD_H + 8);
    }
    const slot = p.activeSlot();
    if (slot) drawItem(ctx, slot, 80, WORLD_H);
  }

  blit() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buf, 0, 0, this.canvas.width, this.canvas.height);
  }

  buffer() {
    return this.buf;
  }
}
