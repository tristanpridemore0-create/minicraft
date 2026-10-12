import { VIEW_W, VIEW_H } from "../constants.js";
import { drawText, textWidth } from "./font.js";
import { displayName } from "../items/inventory.js";
import { itemDef } from "../items/defs.js";
import { recipesFor } from "../crafting/recipes.js";

export class UI {
  constructor() {
    this.mode = "title";
    this.sel = 0;
    this.seedText = String((Math.random() * 1e9) | 0);
    this.msg = "";
    this.msgTime = 0;
    this.rebindAction = null;
    this.station = null;
  }

  toast(text) {
    this.msg = text;
    this.msgTime = 180;
  }

  tick(game) {
    if (this.msgTime > 0) this.msgTime--;
    if (this.mode === "play") return;
    const in_ = game.input;
    if (this.mode === "title") this.tickTitle(game, in_);
    else if (this.mode === "pause") this.tickPause(game, in_);
    else if (this.mode === "inventory") this.tickInv(game, in_);
    else if (this.mode === "craft") this.tickCraft(game, in_);
    else if (this.mode === "chest") this.tickChest(game, in_);
    else if (this.mode === "binds") this.tickBinds(game, in_);
    else if (this.mode === "dead" || this.mode === "won") this.tickEnd(game, in_);
  }

  tickTitle(game, in_) {
    const items = game.hasSave() ? ["Continue", "New world", "Seed", "Controls"] : ["New world", "Seed", "Controls"];
    if (in_.just("up")) this.sel = (this.sel + items.length - 1) % items.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % items.length;
    if (in_.just("attack") || in_.just("menu")) {
      const it = items[this.sel];
      if (it === "Continue") game.load();
      if (it === "New world") game.newGame(Number(this.seedText) || Date.now());
      if (it === "Seed") {
        const s = prompt("World seed (number):", this.seedText);
        if (s != null) this.seedText = s;
      }
      if (it === "Controls") {
        this.mode = "binds";
        this.sel = 0;
      }
    }
  }

  tickPause(game, in_) {
    const items = ["Resume", "Save", "Controls", "Title"];
    if (in_.just("up")) this.sel = (this.sel + items.length - 1) % items.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % items.length;
    if (in_.just("pause")) {
      this.mode = "play";
      return;
    }
    if (in_.just("attack") || in_.just("menu")) {
      const it = items[this.sel];
      if (it === "Resume") this.mode = "play";
      if (it === "Save") {
        game.save();
        this.toast("Saved");
        this.mode = "play";
      }
      if (it === "Controls") {
        this.mode = "binds";
        this.sel = 0;
      }
      if (it === "Title") this.mode = "title";
    }
  }

  tickInv(game, in_) {
    const n = game.player.inv.slots.length || 1;
    if (in_.just("up")) game.player.active = (game.player.active + n - 1) % n;
    if (in_.just("down")) game.player.active = (game.player.active + 1) % n;
    if (in_.just("menu") || in_.just("pause")) this.mode = "play";
    if (in_.just("attack")) this.mode = "play";
    if (in_.just("drop")) {
      const s = game.player.inv.takeAt(game.player.active);
      if (s) {
        game.dropAtPlayer(s.id, 1);
        if (game.player.active >= game.player.inv.slots.length) game.player.active = Math.max(0, game.player.inv.slots.length - 1);
      }
    }
  }

  tickCraft(game, in_) {
    const list = recipesFor(this.station.kind === "player" ? "player" : this.station.kind);
    if (!list.length) {
      this.mode = "play";
      return;
    }
    if (in_.just("up")) this.sel = (this.sel + list.length - 1) % list.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % list.length;
    if (in_.just("menu") || in_.just("pause")) this.mode = "play";
    if (in_.just("attack")) {
      const r = list[this.sel];
      if (game.player.inv.pay(r.cost)) {
        game.player.inv.add(r.result, r.count);
        game.audio.craft();
        this.toast(`Crafted ${itemDef(r.result).name}`);
      } else this.toast("Need more materials");
    }
  }

  tickChest(game, in_) {
    const chest = this.station.inv.slots;
    const player = game.player.inv.slots;
    const total = chest.length + player.length + 2;
    if (in_.just("up")) this.sel = (this.sel + total - 1) % Math.max(1, total);
    if (in_.just("down")) this.sel = (this.sel + 1) % Math.max(1, total);
    if (in_.just("menu") || in_.just("pause")) this.mode = "play";
    if (in_.just("attack")) {
      if (this.sel < chest.length) {
        const s = this.station.inv.takeAt(this.sel);
        if (s) game.player.inv.add(s.id, s.count, s.extra);
      } else if (this.sel >= chest.length + 1 && this.sel < chest.length + 1 + player.length) {
        const i = this.sel - chest.length - 1;
        const s = game.player.inv.takeAt(i);
        if (s) this.station.inv.add(s.id, s.count, s.extra);
      }
    }
  }

  tickBinds(game, in_) {
    if (game.input.waiting) return;
    const actions = Object.keys(game.input.binds);
    if (in_.just("up")) this.sel = (this.sel + actions.length - 1) % actions.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % actions.length;
    if (in_.just("pause") || in_.just("menu")) {
      this.mode = game.player ? "pause" : "title";
      this.sel = 0;
    }
    if (in_.just("attack")) game.input.startRebind(actions[this.sel], 0);
  }

  tickEnd(game, in_) {
    if (in_.just("attack") || in_.just("menu")) {
      this.mode = "title";
      this.sel = 0;
    }
  }

  draw(game, r) {
    const ctx = r.buffer().getContext("2d");
    if (this.mode === "play") {
      const slot = game.player.activeSlot();
      if (slot) drawText(ctx, displayName(slot), 4, VIEW_H - 8, "#ffffff");
      if (this.msgTime) drawText(ctx, this.msg, 4, VIEW_H - 16, "#ffe680");
      if (game.player.level.id === 1 && game.levels[1]) {
        const w = game.player.level.entities.find((e) => e.type === "wizard" && !e.removed);
        if (w) drawText(ctx, `WIZ ${w.health}`, 100, 12, "#a0d0ff");
      }
      return;
    }
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.mode === "title") this.drawTitle(ctx, game);
    if (this.mode === "pause") this.drawMenu(ctx, ["Resume", "Save", "Controls", "Title"], "Paused");
    if (this.mode === "inventory") this.drawInv(ctx, game);
    if (this.mode === "craft") this.drawCraft(ctx, game);
    if (this.mode === "chest") this.drawChest(ctx, game);
    if (this.mode === "binds") this.drawBinds(ctx, game);
    if (this.mode === "dead") this.drawCenter(ctx, "You died!", "Attack to continue");
    if (this.mode === "won") this.drawCenter(ctx, "You won!", "The air wizard is gone");
    if (this.msgTime) drawText(ctx, this.msg, 4, VIEW_H - 8, "#ffe680");
  }

  drawTitle(ctx, game) {
    drawText(ctx, "MINICRAFT", 44, 18, "#7fc238", 2);
    drawText(ctx, "LD22 RECREATION", 38, 40, "#c0c080");
    const items = game.hasSave() ? ["Continue", "New world", "Seed", "Controls"] : ["New world", "Seed", "Controls"];
    items.forEach((it, i) => {
      const c = i === this.sel ? "#ffffff" : "#888888";
      drawText(ctx, (i === this.sel ? "> " : "  ") + it, 40, 58 + i * 10, c);
    });
    drawText(ctx, `SEED ${this.seedText}`, 20, 108, "#666666");
  }

  drawMenu(ctx, items, title) {
    drawText(ctx, title, 50, 24, "#ffffff");
    items.forEach((it, i) => {
      const c = i === this.sel ? "#ffffff" : "#888888";
      drawText(ctx, (i === this.sel ? "> " : "  ") + it, 40, 48 + i * 10, c);
    });
  }

  drawInv(ctx, game) {
    drawText(ctx, "INVENTORY", 8, 8, "#ffe680");
    drawText(ctx, "Attack equip  Q drop", 8, 18, "#888888");
    const slots = game.player.inv.slots;
    if (!slots.length) drawText(ctx, "(empty)", 16, 36, "#888");
    slots.forEach((s, i) => {
      const c = i === game.player.active ? "#ffffff" : "#a0a0a0";
      drawText(ctx, (i === game.player.active ? "> " : "  ") + displayName(s), 8, 30 + i * 8, c);
    });
  }

  drawCraft(ctx, game) {
    const list = recipesFor(this.station.kind);
    drawText(ctx, this.station.kind.toUpperCase(), 8, 8, "#ffe680");
    const start = Math.max(0, this.sel - 6);
    list.slice(start, start + 8).forEach((r, j) => {
      const i = start + j;
      const can = game.player.inv.canPay(r.cost);
      const c = i === this.sel ? (can ? "#ffffff" : "#ff8080") : can ? "#a0c0a0" : "#666";
      const def = itemDef(r.result);
      drawText(ctx, (i === this.sel ? ">" : " ") + def.name, 4, 20 + j * 10, c);
    });
    const r = list[this.sel];
    if (r) {
      const cost = Object.entries(r.cost)
        .map(([k, v]) => `${v} ${itemDef(k).name}`)
        .join(", ");
      drawText(ctx, cost, 4, 108, "#c0c080");
    }
  }

  drawChest(ctx, game) {
    drawText(ctx, "CHEST", 8, 6, "#ffe680");
    let y = 16;
    this.station.inv.slots.forEach((s, i) => {
      drawText(ctx, (this.sel === i ? ">" : " ") + displayName(s), 4, y, this.sel === i ? "#fff" : "#aaa");
      y += 8;
    });
    y += 4;
    drawText(ctx, "YOU", 8, y, "#ffe680");
    y += 10;
    const base = this.station.inv.slots.length + 1;
    game.player.inv.slots.forEach((s, i) => {
      drawText(ctx, (this.sel === base + i ? ">" : " ") + displayName(s), 4, y, this.sel === base + i ? "#fff" : "#aaa");
      y += 8;
    });
  }

  drawBinds(ctx, game) {
    drawText(ctx, "CONTROLS", 8, 8, "#ffe680");
    drawText(ctx, game.input.waiting ? "Press a key..." : "Attack to rebind", 8, 18, "#888");
    Object.entries(game.input.binds).forEach(([k, v], i) => {
      const c = i === this.sel ? "#fff" : "#aaa";
      drawText(ctx, (i === this.sel ? ">" : " ") + k + " " + v[0], 4, 30 + i * 9, c);
    });
  }

  drawCenter(ctx, a, b) {
    drawText(ctx, a, (VIEW_W - textWidth(a)) / 2, 48, "#ff8080");
    drawText(ctx, b, (VIEW_W - textWidth(b)) / 2, 68, "#cccccc");
  }
}
