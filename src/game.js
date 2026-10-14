// The game itself. It owns the world, the player and the screens, and runs the
// loop that moves everything forward 60 times a second.

import { LEVEL, MAP, TILE } from "./constants.js";
import { Input } from "./input.js";
import { AudioBus } from "./audio.js";
import { generateWorld, findSpawn } from "./world/generator.js";
import { Level } from "./world/level.js";
import { Player } from "./entities/player.js";
import { Mob, AirWizard } from "./entities/mobs.js";
import { Furniture } from "./entities/furniture.js";
import { ItemEntity } from "./entities/itemEntity.js";
import { Renderer } from "./render/renderer.js";
import { UI } from "./render/ui.js";
import { hasSave, writeSave, readSave, snapshotTiles, applyMutations } from "./save/save.js";
import { Inventory } from "./items/inventory.js";
import { checkProgress } from "./progression/progress.js";
import { Tile, walkable } from "./world/tiles.js";
import { Net } from "./net.js";

// A random whole number from 0 to n - 1.
const rnd = (n) => (Math.random() * n) | 0;

// What you carry in build mode. None of it runs out.
const BUILD_KIT = [
  "gemAxe",
  "gemShovel",
  "gemHoe",
  "powerGlove",
  "stone",
  "dirt",
  "sand",
  "cloud",
  "acorn",
  "flower",
  "cactus",
  "seeds",
  "workbench",
  "chest",
  "oven",
  "furnace",
  "anvil",
  "lantern",
];

// There is one Game, made in main.js.
export class Game {
  // Set everything up. No world exists until newGame() or load() is called.
  constructor(canvas) {
    this.canvas = canvas;
    // The helpers: input, sound, drawing and menus.
    this.input = new Input();
    this.audio = new AudioBus();
    this.renderer = new Renderer(canvas);
    this.ui = new UI();
    // Multiplayer. It sits idle unless the player hosts or joins a room.
    this.net = new Net(this);
    this.player = null;
    // The five levels by number (see LEVEL in constants.js), and a copy of
    // their tiles as first generated, which saving needs.
    this.levels = {};
    this.original = {};
    // Play time in ticks; it stops when you die or win.
    this.tick = 0;
    this.seed = 1;
    // deadTime and wonTimer hold back the end screens for a moment after dying
    // or winning.
    this.dead = false;
    this.deadTime = 0;
    this.won = false;
    this.wonTimer = 0;
    this.wizardDead = false;
    // Which hints have been shown (see progression/progress.js).
    this.flags = {};
    // Build mode: a world with no monsters, no damage and a full kit.
    this.build = false;
    // The world last written to, or read from, the save slot.
    this.savedWorld = null;
    // Used by loop() below to keep the game at the same speed on any screen.
    this.acc = 0;
    this.last = performance.now();
    canvas.addEventListener("pointerdown", () => this.audio.unlock());
    window.addEventListener("keydown", () => this.audio.unlock());
  }

  // Is there a saved game to continue?
  hasSave() {
    return hasSave();
  }

  // Start a fresh world from a seed number.
  newGame(seed, build = false) {
    this.build = build;
    // Force the seed to a whole number, and never 0.
    this.seed = seed >>> 0 || 1;
    const raw = generateWorld(this.seed);
    this.levels = {};
    for (const [id, data] of Object.entries(raw)) {
      const lv = new Level(Number(id), data);
      // In a room, every change to a tile is passed on to the other players.
      lv.onSet = (x, y, tile, extra) => this.net.tileChanged(lv, x, y, tile, extra);
      this.levels[id] = lv;
    }
    // Remember the untouched world, so a save only has to list what changed.
    this.original = snapshotTiles(this.levels);
    const spawn = findSpawn(this.levels[LEVEL.SURFACE]);
    this.player = new Player(spawn.x, spawn.y);
    this.player.level = this.levels[LEVEL.SURFACE];
    this.tick = 0;
    this.dead = false;
    this.deadTime = 0;
    this.won = false;
    this.wonTimer = 0;
    this.wizardDead = false;
    this.flags = {};
    this.ui.mode = "play";
    if (build) {
      this.player.build = true;
      this.player.held = { id: "gemPick", count: 1, extra: null };
      this.player.inv = new Inventory(BUILD_KIT.map((id) => ({ id, count: 1 })));
      for (const lv of Object.values(this.levels)) lv.instant = true;
      this.ui.toast("Build mode. Nothing can hurt you.");
      return;
    }
    this.ui.toast("Punch trees for wood. X opens your pack.");
    this.spawnWizard();
    // The world starts out populated, day or night.
    for (const lv of Object.values(this.levels)) this.trySpawn(lv, 5000);
  }

  // Continue the saved game.
  load() {
    const data = readSave();
    if (!data) return;
    this.restore(data);
    this.savedWorld = this.worldId();
    this.ui.toast("Loaded");
  }

  // Join a friend's game. `data` is the host's world, in the shape of a saved
  // game (see net.js). The guest arrives where the host is standing.
  joinWorld(data) {
    this.restore(data, true);
    this.savedWorld = null;
    this.ui.toast("You are in a friend's world");
  }

  // Rebuild a world from saved data: make it again from its seed, then put
  // everything the save recorded back on top. A `guest` is joining somebody
  // else's world, so they keep a fresh player of their own and take only the
  // position from the save.
  restore(data, guest = false) {
    this.newGame(data.seed, !!data.build);
    applyMutations(this.levels, data.mutations);
    for (const [id, cells] of Object.entries(data.tileData || {})) {
      const lv = this.levels[id];
      if (lv) for (const [i, v] of cells) lv.data[i] = v;
    }
    if (!data.version) {
      // Older saves recorded a crop only as one of four stages.
      for (const lv of Object.values(this.levels)) {
        for (let i = 0; i < lv.tiles.length; i++) {
          const stage = lv.tiles[i] - Tile.wheat0;
          if (stage >= 0 && stage <= 3 && !lv.data[i]) lv.data[i] = stage * 10;
        }
      }
    }
    for (const [id, list] of Object.entries(data.furniture || {})) {
      const lv = this.levels[id];
      if (!lv) continue;
      for (const f of list) {
        const made = new Furniture(f.x, f.y, f.kind, f.extra || []);
        // A guest must call each piece what the host calls it.
        if (guest && f.fid) made.fid = f.fid;
        lv.add(made);
      }
    }
    for (const [id, list] of Object.entries(data.items || {})) {
      const lv = this.levels[id];
      if (!lv) continue;
      for (const it of list) {
        const e = new ItemEntity(it.x, it.y, it.id, it.count);
        e.time = it.time || 0;
        e.xa = e.ya = e.za = e.zz = 0;
        lv.add(e);
      }
    }
    this.tick = data.tick || 0;
    this.won = !!data.won;
    this.wizardDead = !!data.wizardDead;
    this.flags = data.flags || {};

    const p = data.player;
    const me = this.player;
    me.x = p.x;
    me.y = p.y;
    if (!guest) {
      me.health = p.health;
      me.stamina = p.stamina;
      me.dir = p.dir;
      me.score = p.score || 0;
      me.inv = new Inventory(p.inv || []);
      if (p.held !== undefined) me.held = p.held;
      // Saves from before items were held in the hand marked one pack slot as active.
      else if (me.inv.slots[p.active]) me.held = me.inv.slots.splice(p.active, 1)[0];
    }
    me.level = this.levels[data.levelId] || this.levels[0];
    // Keep monsters that were placed before we knew where the player is at a distance.
    for (const e of me.level.entities) {
      if (e.type === "mob" && Math.hypot(e.x - me.x, e.y - me.y) < 80) e.removed = true;
    }
    me.level.removeDead();

    const wiz = this.levels[LEVEL.SKY].entities.find((e) => e.type === "wizard");
    if (wiz) {
      if (this.wizardDead) wiz.removed = true;
      else if (data.wizard) {
        wiz.x = data.wizard.x;
        wiz.y = data.wizard.y;
        wiz.health = data.wizard.health;
      }
    }
    this.ui.mode = "play";
  }

  // Write the game to the browser's storage. A guest never saves: the world
  // belongs to the host, and saving it here would wipe out the guest's own
  // game.
  save() {
    if (!this.player || this.net.isGuest) return;
    writeSave(this);
    this.savedWorld = this.worldId();
  }

  // Which world this is, to tell it apart from the one in the save slot.
  worldId() {
    return `${this.seed}:${this.build ? "build" : "normal"}`;
  }

  // Called when the page is hidden or closed, so progress since the last
  // autosave is not lost. A brand-new world does not replace a different
  // saved one until it has been played for as long as the autosave waits.
  saveOnLeave() {
    if (!this.player || this.dead) return;
    if (this.savedWorld === this.worldId() || !hasSave() || this.tick >= 7200) this.save();
  }

  // Back to the title screen, leaving any room on the way.
  toTitle() {
    this.net.leave();
    this.ui.mode = "title";
    this.ui.sel = 0;
  }

  // Come back to life where the world starts, with a full set of hearts and
  // everything you were carrying. This only happens in a room. Alone, dying
  // ends the game; in a room that would shut you out while your friends play
  // on, and a host dying would end the game for everybody.
  respawn() {
    const p = this.player;
    const spawn = findSpawn(this.levels[LEVEL.SURFACE]);
    p.level = this.levels[LEVEL.SURFACE];
    p.x = spawn.x;
    p.y = spawn.y;
    p.health = p.maxHealth;
    p.stamina = p.maxStamina;
    p.hurtTime = 0;
    p.xk = p.yk = 0;
    // Two seconds in which nothing can hurt you, to get your bearings.
    p.invuln = 120;
    this.dead = false;
    this.deadTime = 0;
    this.ui.mode = "play";
  }

  // Forget the world entirely. This is for a guest who has left a room: their
  // copy of the host's world must not linger, or it could be saved by mistake.
  dropWorld() {
    this.player = null;
    this.levels = {};
    this.original = {};
    this.savedWorld = null;
  }

  // Called by net.js when a guest is out of a room without having asked to
  // be: the host left, or the connection failed. `why` is shown on the title
  // screen.
  leftRoom(why) {
    this.dropWorld();
    this.ui.mode = "title";
    this.ui.sel = 0;
    this.net.note = why;
  }

  // Put the Air Wizard on a random cloud in the sky. After 80 failed tries he
  // goes in the middle of the map.
  spawnWizard() {
    const sky = this.levels[LEVEL.SKY];
    for (let i = 0; i < 80; i++) {
      const x = 16 + rnd(MAP - 32);
      const y = 16 + rnd(MAP - 32);
      if (sky.get(x, y) === Tile.cloud) {
        sky.add(new AirWizard(x * TILE + 8, y * TILE + 8));
        return;
      }
    }
    sky.add(new AirWizard(MAP * 8, MAP * 8));
  }

  // Try `count` times to put a monster on a random tile. Deeper levels get
  // tougher ones; the sky gets the toughest. A try fails if the spot is near
  // the player, crowded, or not somewhere a monster can stand.
  trySpawn(level, count) {
    const depth = level.id;
    // The range of monster levels for this level of the world: 1 on the
    // surface, up to 4 in the deepest cave, and always 4 in the sky.
    const min = depth > 0 ? 4 : 1;
    const max = depth > 0 ? 4 : depth < 0 ? 1 - depth : 1;
    // How much empty space a new monster needs around it. It is more on the
    // surface, which keeps things quieter up there.
    const room = (depth === 0 ? 8 : 4) * TILE;
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const lvl = rnd(max - min + 1) + min;
      const kind = rnd(2) === 0 ? "slime" : "zombie";
      const tx = rnd(MAP);
      const ty = rnd(MAP);
      const x = tx * TILE + 8;
      const y = ty * TILE + 8;
      if (p && p.level === level && (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < 80 * 80) continue;
      if (!walkable(level.get(tx, ty), false)) continue;
      if (level.entitiesIn(x - room, y - room, x + room, y + room).length) continue;
      level.add(new Mob(x, y, kind, lvl));
    }
  }

  // Stairs: same tile, one level up or down.
  changeLevel(dir) {
    const p = this.player;
    const next = this.levels[p.level.id + dir];
    if (!next) return;
    p.level = next;
    p.x = Math.floor(p.x / TILE) * TILE + 8;
    p.y = Math.floor(p.y / TILE) * TILE + 8;
    const names = { 1: "Sky", 0: "Surface", "-1": "Iron caves", "-2": "Water caves", "-3": "Lava caves" };
    this.ui.toast(names[next.id] || "Level");
  }

  // The menu key: open the furniture in front of the player, or the pack if
  // there is none.
  tryUseOrMenu() {
    if (this.ui.mode !== "play") return;
    if (this.player.use(this)) return;
    this.ui.openInventory(this.player);
  }

  // Open the screen for a workbench, chest or other furniture.
  openStation(furn) {
    this.ui.openStation(furn, this.player);
  }

  // Drop an item at the player's feet.
  dropAtPlayer(id, n) {
    this.player.level.add(new ItemEntity(this.player.x, this.player.y, id, n));
  }

  // Called when the Air Wizard dies. The win screen follows three seconds
  // later, and the player cannot be hurt in the meantime.
  wizardDefeated() {
    this.wizardDead = true;
    this.won = true;
    this.wonTimer = 180;
    this.player.invuln = 300;
    this.audio.win();
  }

  // One tick of the game: read input, move everything, then draw.
  step() {
    const modeAtStart = this.ui.mode;
    if (this.ui.mode === "play" && !this.dead && this.input.just("pause")) {
      this.ui.mode = "pause";
      this.ui.sel = 0;
    }

    this.net.tick();

    // The world only moves while playing. Any menu pauses it.
    if (this.ui.mode === "play" && this.player) {
      const running = !this.dead && !this.won;
      if (running) this.tick++;
      if (!this.dead) this.player.tick(this);
      const level = this.player.level;
      for (const e of level.entities) {
        if (!e.removed) e.tick(this);
      }
      level.removeDead();
      // In a room, one player per level grows and spreads things, and the
      // others are sent what changed.
      level.tickTiles(this.net.runsTiles(level));
      if (!this.build) this.trySpawn(level, 1);
      if (running) {
        checkProgress(this);
        // Autosave every two minutes of play, which is 7200 ticks.
        if (this.tick % 7200 === 0) this.save();
      }
      // The world carries on for a moment before the end screen appears.
      if (this.dead) {
        if (++this.deadTime > 60) this.ui.showEnd("dead");
      } else if (this.wonTimer > 0 && --this.wonTimer === 0) {
        this.ui.showEnd("won");
      }
    }

    // A menu opened this frame waits a frame before reading keys, otherwise the
    // press that opened it would close it again straight away.
    this.ui.tick(this, this.ui.mode === modeAtStart);
    this.renderer.frame(this);
    this.ui.draw(this, this.renderer);
    this.renderer.blit();
    this.input.endFrame();
  }

  // Called by the browser each time the screen is about to be redrawn. Screens
  // redraw at different rates (60, 120, 144 times a second and so on), so this
  // adds up the real time that has passed and runs one step() for every 1/60 of
  // a second of it. That keeps the game at the same speed everywhere.
  loop = (now) => {
    // Never count more than 50 milliseconds at once, so the game does not race
    // to catch up after the tab has been in the background.
    const dt = Math.min(50, now - this.last);
    this.last = now;
    this.acc += dt;
    while (this.acc >= 16.67) {
      this.step();
      this.acc -= 16.67;
    }
    requestAnimationFrame(this.loop);
  };

  // Begin the loop.
  start() {
    requestAnimationFrame(this.loop);
  }
}
