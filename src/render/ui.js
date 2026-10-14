// The screens that sit on top of the world: title, pause, the pack, crafting,
// chests, key settings and the end screens. `mode` says which one is showing,
// and "play" means none of them. Each screen has a tick...() method that reacts
// to keys and a draw...() method that draws it.

import { VIEW_W, VIEW_H } from "../constants.js";
import { C } from "./palette.js";
import { drawText, drawTextShadow, drawFrame, textWidth, wrapText } from "./font.js";
import { drawItem } from "./itemdraw.js";
import { icon } from "./sprites.js";
import { itemDef } from "../items/defs.js";
import { recipesFor } from "../crafting/recipes.js";

// Friendlier names for keys on the Controls screen: "KeyW" becomes "W" and
// "ArrowUp" becomes "UP".
const KEY_NAMES = { Escape: "ESC", ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" };
// The name to show for a key code.
function keyName(code) {
  if (!code) return "";
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  return code.replace(/^Key|^Digit/, "").toUpperCase();
}

// Turn a number of ticks into text such as "3m 07s", or "1h 05m" once past an
// hour.
function playTime(ticks) {
  const s = (ticks / 60) | 0;
  const h = (s / 3600) | 0;
  const m = ((s / 60) | 0) % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}h ${pad(m)}m` : `${m}m ${pad(s % 60)}s`;
}

// There is one UI, owned by the Game.
export class UI {
  // The game opens on the title screen.
  constructor() {
    this.mode = "title";
    // Which line of the current menu the cursor is on.
    this.sel = 0;
    // The seed for the next new world. It starts out random, and the Seed
    // option lets the player type one in.
    this.seedText = String((Math.random() * 1e9) | 0);
    // The hint message at the top of the screen, and how many ticks it has
    // left.
    this.msg = "";
    this.msgTime = 0;
    // The furniture whose screen is open, and the recipes it offers.
    this.station = null;
    this.recipes = [];
    // In the chest screen: which side is active (0 is the chest, 1 is the pack)
    // and where the cursor is on each side.
    this.chestWindow = 0;
    this.chestSel = [0, 0];
    // Which screen to go back to from Controls.
    this.bindsFrom = "title";
    this.endDelay = 0;
  }

  // Show a message at the top of the screen for four seconds.
  toast(text) {
    this.msg = text;
    this.msgTime = 240;
  }

  // The title menu. "Continue" only appears when there is a saved game.
  titleItems(game) {
    const items = ["New world", "Build mode", "Join game", "Seed", "Controls"];
    return game.hasSave() ? ["Continue", ...items] : items;
  }

  // The pause menu. It changes with multiplayer: alone you can open a room, a
  // host can close theirs, and a guest can only leave, because the world is
  // not theirs to save.
  pauseItems(game) {
    if (game.net.isGuest) return ["Resume", "Controls", "Leave game"];
    return ["Resume", "Save", game.net.ws ? "Close room" : "Host game", "Controls", "Title"];
  }

  // Open the pack.
  openInventory(player) {
    // Whatever was in hand goes back to the top of the pack while you choose.
    player.inv.putFront(player.held);
    player.held = null;
    this.mode = "inventory";
    this.sel = 0;
  }

  // Show the death or win screen. `mode` is "dead" or "won".
  showEnd(mode) {
    this.mode = mode;
    this.sel = 0;
    // A second of grace so a stray key press does not skip the screen.
    this.endDelay = 60;
  }

  // Open the screen for a piece of furniture: the chest view for a chest, and
  // the crafting list for anything else.
  openStation(furn, player) {
    this.station = furn;
    this.sel = 0;
    if (furn.kind === "chest") {
      this.mode = "chest";
      this.chestWindow = 0;
      this.chestSel = [0, 0];
      return;
    }
    // Things you can afford right now are listed first.
    const list = recipesFor(furn.kind);
    this.recipes = [...list].sort((a, b) => player.inv.canPay(b.cost) - player.inv.canPay(a.cost));
    this.mode = "craft";
  }

  // `acceptInput` is false on the frame a menu opens, so the key press that
  // opened it is not also read as the key press that closes it.
  tick(game, acceptInput = true) {
    if (this.msgTime > 0) this.msgTime--;
    if (this.mode === "play" || !acceptInput) return;
    const in_ = game.input;
    if (this.mode === "title") this.tickTitle(game, in_);
    else if (this.mode === "pause") this.tickPause(game, in_);
    else if (this.mode === "inventory") this.tickInv(game, in_);
    else if (this.mode === "craft") this.tickCraft(game, in_);
    else if (this.mode === "chest") this.tickChest(game, in_);
    else if (this.mode === "binds") this.tickBinds(game, in_);
    else if (this.mode === "dead" || this.mode === "won") this.tickEnd(game, in_);
  }

  // Up and down move the cursor (the `%` makes it wrap round at the ends), and
  // attack or menu chooses.
  tickTitle(game, in_) {
    // Nothing to choose while waiting to get into a room.
    if (game.net.joining) return;
    const items = this.titleItems(game);
    if (in_.just("up")) this.sel = (this.sel + items.length - 1) % items.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % items.length;
    if (in_.just("attack") || in_.just("menu")) {
      const it = items[this.sel];
      // Any choice clears an old message about a room.
      game.net.note = "";
      if (it === "Continue") game.load();
      if (it === "New world") game.newGame(Number(this.seedText) || Date.now());
      if (it === "Build mode") game.newGame(Number(this.seedText) || Date.now(), true);
      if (it === "Join game") {
        const code = prompt("Room code (4 letters):", "");
        if (code != null) game.net.join(code);
        // The browser swallows key-up events while the prompt is open.
        in_.down.clear();
      }
      if (it === "Seed") {
        const s = prompt("World seed (number):", this.seedText);
        if (s != null) this.seedText = s;
        // The browser swallows key-up events while the prompt is open.
        in_.down.clear();
      }
      if (it === "Controls") {
        this.bindsFrom = this.mode;
        this.mode = "binds";
        this.sel = 0;
      }
    }
  }

  // The pause menu.
  tickPause(game, in_) {
    const items = this.pauseItems(game);
    this.sel = Math.min(this.sel, items.length - 1);
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
      if (it === "Host game") {
        game.net.host();
        this.mode = "play";
      }
      if (it === "Close room") {
        game.net.leave();
        this.toast("Room closed");
        this.mode = "play";
      }
      if (it === "Controls") {
        this.bindsFrom = this.mode;
        this.mode = "binds";
        this.sel = 0;
      }
      if (it === "Title" || it === "Leave game") game.toTitle();
    }
  }

  // The pack: choose an item to hold, or drop one with the drop key.
  tickInv(game, in_) {
    const p = game.player;
    if (in_.just("menu") || in_.just("pause")) {
      this.mode = "play";
      return;
    }
    const n = p.inv.slots.length;
    if (!n) return;
    this.sel = Math.min(this.sel, n - 1);
    if (in_.just("up")) this.sel = (this.sel + n - 1) % n;
    if (in_.just("down")) this.sel = (this.sel + 1) % n;
    if (in_.just("attack")) {
      // Take the chosen item in hand.
      p.held = p.inv.slots.splice(this.sel, 1)[0];
      this.mode = "play";
      return;
    }
    if (in_.just("drop")) {
      const s = p.inv.takeAt(this.sel);
      if (s) game.dropAtPlayer(s.id, 1);
      this.sel = Math.max(0, Math.min(this.sel, p.inv.slots.length - 1));
    }
  }

  // Crafting: attack makes the chosen recipe, if you can afford it.
  tickCraft(game, in_) {
    const list = this.recipes;
    if (!list.length || in_.just("menu") || in_.just("pause")) {
      this.mode = "play";
      return;
    }
    if (in_.just("up")) this.sel = (this.sel + list.length - 1) % list.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % list.length;
    if (in_.just("attack")) {
      const r = list[this.sel];
      if (game.player.inv.pay(r.cost)) {
        game.player.inv.add(r.result, r.count);
        game.audio.craft();
      }
    }
  }

  // A chest: left and right switch between the chest and your pack, and attack
  // moves the chosen stack across to the other side.
  tickChest(game, in_) {
    if (in_.just("menu") || in_.just("pause")) {
      this.mode = "play";
      return;
    }
    if (in_.just("left")) this.chestWindow = 0;
    if (in_.just("right")) this.chestWindow = 1;
    const w = this.chestWindow;
    const from = w === 0 ? this.station.inv : game.player.inv;
    const to = w === 0 ? game.player.inv : this.station.inv;
    const n = from.slots.length;
    if (n) {
      this.chestSel[w] = Math.min(this.chestSel[w], n - 1);
      if (in_.just("up")) this.chestSel[w] = (this.chestSel[w] + n - 1) % n;
      if (in_.just("down")) this.chestSel[w] = (this.chestSel[w] + 1) % n;
      if (in_.just("attack")) {
        const [s] = from.slots.splice(this.chestSel[w], 1);
        to.add(s.id, s.count, s.extra);
        // In a room, the others need to know what is in the chest now.
        game.net.chestChanged(this.station);
        this.chestSel[w] = Math.max(0, Math.min(this.chestSel[w], from.slots.length - 1));
      }
    }
  }

  // Controls: attack on an action, then press the key you want for it.
  tickBinds(game, in_) {
    if (game.input.waiting) return;
    const actions = Object.keys(game.input.binds);
    if (in_.just("up")) this.sel = (this.sel + actions.length - 1) % actions.length;
    if (in_.just("down")) this.sel = (this.sel + 1) % actions.length;
    if (in_.just("pause") || in_.just("menu")) {
      this.mode = this.bindsFrom;
      this.sel = 0;
    }
    if (in_.just("attack")) game.input.startRebind(actions[this.sel], 0);
  }

  // The death and win screens: attack or menu goes back to the title. Dying in
  // a multiplayer room is different: you come back to life and carry on.
  tickEnd(game, in_) {
    if (this.endDelay > 0) {
      this.endDelay--;
      return;
    }
    if (in_.just("attack") || in_.just("menu")) {
      if (this.mode === "dead" && game.net.inRoom) game.respawn();
      else game.toTitle();
    }
  }

  // Draw whichever screen is showing, then the hint message on top.
  draw(game, r) {
    const ctx = r.buffer().getContext("2d");
    if (this.mode === "title") this.drawTitle(ctx, game);
    else if (this.mode === "pause") this.drawPause(ctx, game);
    else if (this.mode === "inventory") this.drawInv(ctx, game);
    else if (this.mode === "craft") this.drawCraft(ctx, game);
    else if (this.mode === "chest") this.drawChest(ctx, game);
    else if (this.mode === "binds") this.drawBinds(ctx, game);
    else if (this.mode === "dead") this.drawEnd(ctx, game, "You died! Aww!", game.net.inRoom ? "Press C to go on" : "Press C to lose");
    else if (this.mode === "won") this.drawEnd(ctx, game, "You won! Yay!", "Press C to win");

    let top = 2;
    if (this.mode === "play" && game.player.level.id === 1) {
      const w = game.player.level.entities.find((e) => e.type === "wizard" && !e.removed);
      if (w) {
        // Boss health bar across the top of the sky level.
        ctx.fillStyle = "#000";
        ctx.fillRect(29, 2, 102, 5);
        ctx.fillStyle = C(100);
        ctx.fillRect(30, 3, 100, 3);
        ctx.fillStyle = C(500);
        ctx.fillRect(30, 3, Math.ceil((100 * Math.max(0, w.health)) / w.maxHealth), 3);
        top = 10;
      }
    }
    if (this.msgTime && (this.mode === "play" || this.mode === "pause")) {
      wrapText(this.msg, 20).forEach((line, i) => {
        drawTextShadow(ctx, line, (VIEW_W - textWidth(line)) / 2, top + i * 9, C(550));
      });
    }
  }

  // Darken the world behind a menu.
  dim(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // A menu list centred on the screen, with "> <" around the chosen entry.
  drawOptions(ctx, items, y0) {
    items.forEach((it, i) => {
      const on = i === this.sel;
      const text = on ? `> ${it} <` : it;
      drawText(ctx, text, (VIEW_W - textWidth(text)) / 2, y0 + i * 10, on ? C(555) : C(222));
    });
  }

  // The title screen. The logo is drawn three times, slightly offset, which
  // gives it a shadow.
  drawTitle(ctx, game) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, "MINICRAFT", 10, 16, C(10), 2);
    drawText(ctx, "MINICRAFT", 9, 15, C(131), 2);
    drawText(ctx, "MINICRAFT", 8, 14, C(551), 2);
    this.drawOptions(ctx, this.titleItems(game), 36);
    // Under the menu: news about joining a room if there is any, and
    // otherwise the seed of the next new world.
    const note = game.net.note;
    const line = (note || `Seed ${this.seedText}`).slice(0, 20);
    drawText(ctx, line, (VIEW_W - textWidth(line)) / 2, 98, note ? C(550) : C(222));
    drawText(ctx, "(Arrow keys,X and C)", 0, 110, C(111));
  }

  // The pause menu, over a darkened world. In a room, the code and the number
  // of players are shown underneath, for reading out to a friend.
  drawPause(ctx, game) {
    this.dim(ctx);
    drawFrame(ctx, "paused", 3, 3, 16, 10);
    this.drawOptions(ctx, this.pauseItems(game), 36);
    if (game.net.inRoom) {
      const line = `Room ${game.net.room}: ${game.net.count} here`;
      drawTextShadow(ctx, line, (VIEW_W - textWidth(line)) / 2, 94, C(550));
    }
  }

  // Scrolling list of inventory rows inside a frame.
  drawItemList(ctx, slots, x0, y0, x1, y1, sel, focused) {
    const rows = y1 - y0 - 1;
    // Scroll so the chosen row stays near the middle. `rows >> 1` is half of
    // rows, rounded down.
    const top = Math.max(0, Math.min(sel - (rows >> 1), slots.length - rows));
    for (let i = 0; i < rows && top + i < slots.length; i++) {
      drawItem(ctx, slots[top + i], (x0 + 1) * 8, (y0 + 1 + i) * 8);
    }
    if (focused && slots.length) {
      const y = (y0 + 1 + sel - top) * 8;
      drawText(ctx, ">", x0 * 8, y, C(555));
      drawText(ctx, "<", x1 * 8, y, C(555));
    }
  }

  // The pack.
  drawInv(ctx, game) {
    drawFrame(ctx, "inventory", 1, 1, 12, 11);
    this.drawItemList(ctx, game.player.inv.slots, 1, 1, 12, 11, this.sel, true);
  }

  // Crafting has three boxes: the recipes on the left (dimmed if you cannot
  // afford them), how many of the chosen item you already have, and what it
  // costs.
  drawCraft(ctx, game) {
    const inv = game.player.inv;
    drawFrame(ctx, "have", 12, 1, 19, 3);
    drawFrame(ctx, "cost", 12, 4, 19, 11);
    drawFrame(ctx, "crafting", 0, 1, 11, 11);
    const list = this.recipes;
    const rows = 9;
    const top = Math.max(0, Math.min(this.sel - (rows >> 1), list.length - rows));
    for (let i = 0; i < rows && top + i < list.length; i++) {
      const r = list[top + i];
      const y = (2 + i) * 8;
      ctx.drawImage(icon(r.result), 8, y);
      drawText(ctx, itemDef(r.result).name, 16, y, inv.canPay(r.cost) ? C(555) : C(222));
    }
    const y = (2 + this.sel - top) * 8;
    drawText(ctx, ">", 0, y, C(555));
    drawText(ctx, "<", 11 * 8, y, C(555));

    const r = list[this.sel];
    if (!r) return;
    ctx.drawImage(icon(r.result), 13 * 8, 2 * 8);
    drawText(ctx, String(Math.min(999, inv.count(r.result))), 14 * 8, 2 * 8, C(555));
    Object.entries(r.cost).forEach(([id, need], i) => {
      const have = inv.count(id);
      const yy = (5 + i) * 8;
      ctx.drawImage(icon(id), 13 * 8, yy);
      drawText(ctx, `${need}/${Math.min(99, have)}`, 14 * 8, yy, have >= need ? C(555) : C(222));
    });
  }

  // Chest on the left, your pack on the right; the one in use slides into view.
  drawChest(ctx, game) {
    const w = this.chestWindow;
    ctx.save();
    if (w === 1) ctx.translate(-48, 0);
    drawFrame(ctx, "chest", 1, 1, 12, 11);
    this.drawItemList(ctx, this.station.inv.slots, 1, 1, 12, 11, this.chestSel[0], w === 0);
    drawFrame(ctx, "inventory", 13, 1, 24, 11);
    this.drawItemList(ctx, game.player.inv.slots, 13, 1, 24, 11, this.chestSel[1], w === 1);
    ctx.restore();
  }

  // The Controls screen: each action and its keys.
  drawBinds(ctx, game) {
    this.dim(ctx);
    drawFrame(ctx, "controls", 0, 0, 19, 12);
    Object.entries(game.input.binds).forEach(([action, keys], i) => {
      const on = i === this.sel;
      const y = (2 + i) * 8;
      if (on) drawText(ctx, ">", 8, y, C(555));
      drawText(ctx, action, 16, y, on ? C(555) : C(333));
      drawText(ctx, keys.map(keyName).join("/"), 80, y, on ? C(550) : C(333));
    });
    drawText(ctx, game.input.waiting ? "Press a key..." : "Attack: change", 16, 11 * 8, C(444));
  }

  // The box shown on dying or winning, with play time and score.
  drawEnd(ctx, game, line, hint) {
    drawFrame(ctx, "", 1, 3, 18, 9);
    drawText(ctx, line, 16, 32, C(555));
    drawText(ctx, "Time:", 16, 40, C(555));
    drawText(ctx, playTime(game.tick), 56, 40, C(550));
    drawText(ctx, "Score:", 16, 48, C(555));
    drawText(ctx, String(game.player.score), 64, 48, C(550));
    drawText(ctx, hint, 16, 64, C(333));
  }
}
