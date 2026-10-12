import { LEVEL, MAP, TILE } from "./constants.js";
import { Input } from "./input.js";
import { AudioBus } from "./audio.js";
import { generateWorld, findSpawn } from "./world/generator.js";
import { Level } from "./world/level.js";
import { Player } from "./entities/player.js";
import { Mob, AirWizard, spawnColorForLevel } from "./entities/mobs.js";
import { Furniture } from "./entities/furniture.js";
import { ItemEntity } from "./entities/itemEntity.js";
import { Renderer } from "./render/renderer.js";
import { UI } from "./render/ui.js";
import { hasSave, writeSave, readSave, snapshotTiles, applyMutations } from "./save/save.js";
import { Inventory } from "./items/inventory.js";
import { checkProgress } from "./progression/progress.js";
import { Tile } from "./world/tiles.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input();
    this.audio = new AudioBus();
    this.renderer = new Renderer(canvas);
    this.ui = new UI();
    this.player = null;
    this.levels = {};
    this.original = {};
    this.tick = 0;
    this.dayTime = 0;
    this.seed = 1;
    this.dead = false;
    this.won = false;
    this.wizardDead = false;
    this.stairLock = 0;
    this.flags = {};
    this.acc = 0;
    this.last = performance.now();
    canvas.addEventListener("pointerdown", () => this.audio.unlock());
    window.addEventListener("keydown", () => this.audio.unlock());
  }

  hasSave() {
    return hasSave();
  }

  newGame(seed) {
    this.seed = seed >>> 0 || 1;
    const raw = generateWorld(this.seed);
    this.levels = {};
    for (const [id, data] of Object.entries(raw)) {
      this.levels[id] = new Level(Number(id), data);
    }
    for (const lv of Object.values(this.levels)) lv.entities = [];
    this.original = snapshotTiles(this.levels);
    const spawn = findSpawn(this.levels[LEVEL.SURFACE]);
    this.player = new Player(spawn.x, spawn.y);
    this.player.level = this.levels[LEVEL.SURFACE];
    this.tick = 0;
    this.dayTime = 0;
    this.dead = false;
    this.won = false;
    this.wizardDead = false;
    this.flags = {};
    this.ui.mode = "play";
    this.ui.toast("Gather wood. Place your workbench.");
    this.spawnWizard();
  }

  load() {
    const data = readSave();
    if (!data) return;
    this.newGame(data.seed);
    applyMutations(this.levels, data.mutations);
    for (const [id, list] of Object.entries(data.furniture || {})) {
      const lv = this.levels[id];
      if (!lv) continue;
      for (const f of list) lv.add(new Furniture(f.x, f.y, f.kind, f.extra || []));
    }
    this.tick = data.tick || 0;
    this.dayTime = data.day || 0;
    this.won = !!data.won;
    this.wizardDead = !!data.wizardDead;
    const p = data.player;
    this.player.x = p.x;
    this.player.y = p.y;
    this.player.health = p.health;
    this.player.stamina = p.stamina;
    this.player.dir = p.dir;
    this.player.active = p.active || 0;
    this.player.inv = new Inventory(p.inv || []);
    const lv = this.levels[data.levelId] || this.levels[0];
    this.player.level = lv;
    if (this.wizardDead) {
      for (const e of this.levels[LEVEL.SKY].entities) if (e.type === "wizard") e.removed = true;
    }
    this.ui.mode = "play";
    this.ui.toast("Loaded");
  }

  save() {
    if (!this.player) return;
    writeSave(this);
  }

  spawnWizard() {
    const sky = this.levels[LEVEL.SKY];
    for (let i = 0; i < 80; i++) {
      const x = 16 + ((Math.random() * (MAP - 32)) | 0);
      const y = 16 + ((Math.random() * (MAP - 32)) | 0);
      if (sky.get(x, y) === Tile.cloud) {
        sky.add(new AirWizard(x * TILE + 8, y * TILE + 8));
        return;
      }
    }
    sky.add(new AirWizard(MAP * 8, MAP * 8));
  }

  changeLevel(id, x, y) {
    if (this.stairLock > 0) return;
    this.player.level = this.levels[id];
    this.player.x = x;
    this.player.y = y;
    this.stairLock = 1;
    const names = { 1: "Sky", 0: "Surface", "-1": "Iron caves", "-2": "Water caves", "-3": "Lava caves" };
    this.ui.toast(names[id] || "Level");
  }

  tryUseOrMenu() {
    if (this.ui.mode !== "play") return;
    if (this.player.useFacing(this)) return;
    this.ui.openInventory(this.player);
  }

  openStation(furn) {
    this.ui.openStation(furn, this.player);
  }

  dropAtPlayer(id, n) {
    this.player.level.add(new ItemEntity(this.player.x, this.player.y, id, n));
  }

  isNight() {
    const t = this.dayTime % 10000;
    return t > 6500;
  }

  spawnMobs() {
    const level = this.player.level;
    const mobs = level.entities.filter((e) => e.type === "mob" && !e.removed).length;
    const max = 12;
    if (mobs >= max) return;
    if (level.id === 0 && !this.isNight()) return;
    if (Math.random() > 0.04) return;
    const colors = spawnColorForLevel(level.id);
    const px = this.player.x + (Math.random() * 160 - 80);
    const py = this.player.y + (Math.random() * 160 - 80);
    if (Math.hypot(px - this.player.x, py - this.player.y) < 48) return;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    const tile = level.get(tx, ty);
    if (level.blocked(px, py, 6, 6, false)) return;
    const kind = Math.random() < 0.5 ? "slime" : "zombie";
    const color = colors[(Math.random() * colors.length) | 0];
    level.add(new Mob(px, py, kind, color));
  }

  step() {
    const modeAtStart = this.ui.mode;
    if (this.ui.mode === "play" && this.input.just("pause")) {
      this.ui.mode = "pause";
      this.ui.sel = 0;
    }

    if (this.ui.mode === "play" && this.player && !this.dead && !this.won) {
      this.tick++;
      this.dayTime++;
      const level = this.player.level;
      level.tick = this.tick;
      this.player.tick(this);
      for (const e of level.entities) {
        if (!e.removed) e.tick(this);
      }
      level.removeDead();
      if (this.tick % 20 === 0) level.grow();
      this.spawnMobs();
      checkProgress(this);
      if (this.tick % 7200 === 0) this.save();
      if (this.won) {
        this.wizardDead = true;
        this.ui.mode = "won";
      }
      if (this.dead) this.ui.mode = "dead";
    }

    // A menu opened this frame waits a frame before reading keys, otherwise the
    // press that opened it would close it again straight away.
    this.ui.tick(this, this.ui.mode === modeAtStart);
    this.renderer.frame(this);
    this.ui.draw(this, this.renderer);
    this.renderer.blit();
    this.input.endFrame();
  }

  loop = (now) => {
    const dt = Math.min(50, now - this.last);
    this.last = now;
    this.acc += dt;
    while (this.acc >= 16.67) {
      this.step();
      this.acc -= 16.67;
    }
    requestAnimationFrame(this.loop);
  };

  start() {
    requestAnimationFrame(this.loop);
  }
}
