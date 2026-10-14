// Shared monsters, for multiplayer. net.js hands this file every message about
// monsters and calls its tick() every game tick.
//
// The idea: on each level, exactly one player's browser "runs" the monsters.
// It moves them, decides who they chase, and tells the other players on that
// level where they are, about ten times a second. Everybody else on the level
// is "watching": the monsters on their screen are ghosts that only follow
// those reports. A ghost that is hit sends the hit to the runner, who decides
// what it did.
//
// Who runs a level? The first player to be there. Anyone who arrives later
// watches. When the runner leaves the level, opens a menu, or goes quiet, one
// of the watchers takes over and the ghosts on their screen become real. If
// two players ever both think they are running a level, the one with the
// lower player number keeps it.
//
// Monsters far from every player are not sent at all. Each browser keeps its
// own set for the parts of a level nobody is looking at, and puts them to
// sleep while it is watching somebody else's.

import { LEVEL } from "./constants.js";
import { Mob, Spark } from "./entities/mobs.js";
import { dropItems } from "./entities/itemEntity.js";
import { TextParticle } from "./entities/particles.js";
import { C } from "./render/palette.js";
import { whole, isLevel, onMap } from "./netChecks.js";

// A report goes out every 6 ticks (ten times a second) while there is a
// monster to report, and every 30 ticks otherwise, just to say "still here".
const REPORT_EVERY = 6;
const QUIET_EVERY = 30;
// A watcher that hears nothing for 90 ticks (a second and a half) decides the
// runner has gone.
const LOST_AFTER = 90;
// On arriving at a level that has people on it, wait up to a second to hear
// from its runner before taking it on.
const LISTEN = 60;
// How close to a watcher a monster must be to be reported: a screen's width
// and height, and a little more.
const NEAR_X = 176;
const NEAR_Y = 136;

const rnd = (n) => (Math.random() * n) | 0;

// The Air Wizard on a level, if he is there and alive.
function wizardOn(level) {
  return level.entities.find((e) => e.type === "wizard" && !e.removed);
}

// There is one MobShare, owned by the Net.
export class MobShare {
  constructor(net) {
    this.net = net;
    this.game = net.game;
    this.reset();
  }

  // Forget everything, ready for the next room.
  reset() {
    // The level our player was on when we last looked. When it changes, we
    // have walked through a staircase and must sort out who runs the new one.
    this.seat = null;
    // Are we watching somebody else run this level?
    this.watching = false;
    // The number of the player running this level: ours, another player's, or
    // 0 while we are waiting to find out.
    this.runnerId = 0;
    // Ticks left to wait before taking the level on ourselves.
    this.listen = 0;
    // Ticks since the runner's last report.
    this.heard = 0;
    // The ghosts on this level, by monster name (see `mid` in mobs.js).
    this.ghosts = new Map();
    // Sparks the Air Wizard has thrown since our last report.
    this.sparks = [];
    this.clock = 0;
    this.sentWizard = -1;
    // How many other players were on this level at our last look. When it
    // goes up, somebody has just arrived and is waiting to hear from us.
    this.audience = 0;
  }

  // Does this browser run the level its player is on? Alone, always.
  runs() {
    return !this.net.inRoom || !this.watching;
  }

  // The other players who are on a level.
  othersOn(level) {
    return [...this.net.peers.values()].filter((o) => o.levelId === level.id);
  }

  // Could anybody else be on this level? This also counts players we have not
  // heard from yet, who might be.
  maybeOthersOn(level) {
    return [...this.net.peers.values()].some((o) => o.levelId === level.id || o.levelId === null);
  }

  // Called by net.js every game tick.
  tick() {
    const game = this.game;
    const p = game.player;
    if (!this.net.inRoom || !p) return;
    this.clock++;
    const level = p.level;
    if (level !== this.seat) this.arrive(level);
    const others = this.othersOn(level);

    if (!this.watching) {
      // Running. A runner who is in a menu or dead is not moving anything, so
      // if somebody else is here to do it, hand the level over.
      if (others.length && (game.ui.mode !== "play" || game.dead)) this.stepDown(level);
      else this.report(level, others);
      return;
    }

    // Watching. Has the runner gone: left the room, left the level, or gone
    // quiet?
    if (this.runnerId) {
      const r = this.net.peers.get(this.runnerId);
      const elsewhere = r && r.levelId !== null && r.levelId !== level.id;
      if (!r || elsewhere || ++this.heard > LOST_AFTER) this.runnerLost(level);
    }
    // Nobody has claimed it in time, or there is nobody who could: take it
    // on, if we are in a state to.
    if (!this.runnerId && (--this.listen <= 0 || !this.maybeOthersOn(level))) {
      if (game.ui.mode === "play" && !game.dead) this.takeOver(level);
      else this.listen = LISTEN;
    }
  }

  // Our player is on a different level from last time.
  arrive(level) {
    // Tidy the level we left: its ghosts were somebody else's monsters.
    if (this.seat && this.watching) this.wake(this.seat, false);
    this.seat = level;
    this.heard = 0;
    this.sentWizard = -1;
    this.sparks = [];
    this.audience = 0;
    if (!this.maybeOthersOn(level)) {
      // Nobody here. It is ours, with our own monsters as they stand.
      this.watching = false;
      this.runnerId = this.net.id;
      return;
    }
    // Somebody is here already. Put our own monsters away and wait to be told
    // about theirs.
    this.sleep(level);
    this.watching = true;
    this.runnerId = 0;
    this.listen = LISTEN;
  }

  // The runner has gone. The watchers each wait a moment before taking over,
  // the lowest player number waiting least, so that they do not all jump at
  // once.
  runnerLost(level) {
    const ahead = this.othersOn(level).filter((o) => o.id < this.net.id && o.id !== this.runnerId).length;
    this.runnerId = 0;
    this.listen = 4 + 10 * ahead;
  }

  // Stop running this level and say so, so that a watcher takes over at once.
  // One last report goes first, so that they have every monster where it is.
  stepDown(level) {
    this.report(level, this.othersOn(level), true);
    this.net.send({ t: "mq", l: level.id });
    this.sleep(level);
    this.watching = true;
    this.runnerId = 0;
    this.listen = LISTEN * 2;
  }

  // Start running this level. The ghosts become real monsters, exactly where
  // they stand.
  takeOver(level) {
    this.wake(level, true);
    this.watching = false;
    this.runnerId = this.net.id;
  }

  // Put our own monsters on a level away, because somebody else's are about
  // to be shown instead. They wait in `level.asleep`. Our Air Wizard stays,
  // as a ghost: there is only one of him.
  sleep(level) {
    const keep = [];
    for (const e of level.entities) {
      if (e.type === "mob" && !e.ghost) level.asleep.push(e);
      else if (e.type !== "spark") keep.push(e);
      if (e.type === "wizard") {
        e.ghost = true;
        e.goalX = e.x;
        e.goalY = e.y;
      }
    }
    level.entities = keep;
  }

  // The opposite of sleep(). If we are `taking` the level over, the ghosts
  // become real and carry on; otherwise they were never ours and are removed.
  // Our own monsters come back, except, when taking over, any that would
  // appear from nowhere right beside a player.
  wake(level, taking) {
    for (const e of level.entities) {
      if (e.type === "wizard") e.ghost = false;
      else if (e.type === "mob" && e.ghost) {
        if (taking) e.ghost = false;
        else e.removed = true;
      } else if (e.type === "spark" && e.remote) {
        if (taking) e.remote = false;
        else e.removed = true;
      }
    }
    const players = taking ? [this.game.player, ...this.othersOn(level)] : [];
    const near = (m) => players.some((o) => Math.abs(o.x - m.x) < NEAR_X && Math.abs(o.y - m.y) < NEAR_Y);
    for (const m of level.asleep) {
      if (!near(m)) level.entities.push(m);
    }
    level.asleep = [];
    this.ghosts.clear();
    level.removeDead();
  }

  // Called by net.js when we leave the room. If we were watching, keep the
  // monsters that are on screen by making them ours.
  leaveRoom() {
    if (this.seat && this.watching) this.wake(this.seat, true);
    this.reset();
  }

  // Running: tell the watchers about the monsters near any player, ourselves
  // included. They need the ones near us too, in case they take the level
  // over. `now` sends a report whether or not one is due.
  report(level, others, now = false) {
    // The Air Wizard's health goes to everybody, wherever they are, once a
    // second when it has changed. That way whoever next runs the sky starts
    // with him as hurt as he really is.
    if (level.id === LEVEL.SKY && this.clock % 60 === 0) {
      const w = wizardOn(level);
      if (w && w.health !== this.sentWizard) {
        this.sentWizard = w.health;
        this.net.send({ t: "wz", x: w.x | 0, y: w.y | 0, h: w.health });
      }
    }
    // Somebody has just arrived: do not keep them waiting.
    if (others.length > this.audience) now = true;
    this.audience = others.length;
    if (!others.length) {
      this.sparks = [];
      return;
    }
    if (!now && this.clock % REPORT_EVERY !== 0) return;
    const me = this.game.player;
    const players = [[me.x, me.y], ...others.map((o) => [o.goalX, o.goalY])];
    const near = (m) => players.some(([x, y]) => Math.abs(x - m.x) < NEAR_X && Math.abs(y - m.y) < NEAR_Y);
    // One short list per monster: name, kind (0 zombie, 1 slime), level,
    // position, facing, health, and two yes/no flags packed into one number
    // (1 for "flashing from a hit", 2 for "in mid hop").
    const list = [];
    for (const e of level.entities) {
      if (e.type !== "mob" || e.removed || !near(e)) continue;
      const flags = (e.hurtTime > 0 ? 1 : 0) | (e.jumpTime > 0 ? 2 : 0);
      list.push([e.mid, e.kind === "slime" ? 1 : 0, e.lvl, e.x | 0, e.y | 0, e.dir, e.health, flags]);
    }
    const w = wizardOn(level);
    const busy = list.length || w || this.sparks.length;
    if (!busy && !now && this.clock % QUIET_EVERY !== 0) return;
    const m = { t: "m", l: level.id, list };
    if (w) m.w = [w.x | 0, w.y | 0, w.dir, w.health, w.hurtTime > 0 ? 1 : 0];
    if (this.sparks.length) m.s = this.sparks.splice(0);
    this.net.send(m);
  }

  // Called by the Air Wizard when he throws a spark, so that the watchers can
  // be sent it with the next report.
  sparkThrown(spark) {
    if (!this.net.inRoom || this.watching || this.sparks.length >= 60) return;
    const round = (v) => Math.round(v * 1000) / 1000;
    this.sparks.push([spark.x | 0, spark.y | 0, round(spark.xa), round(spark.ya), spark.lifeTime]);
  }

  // A message about monsters has arrived.
  handle(m) {
    if (m.t === "m") this.onReport(m);
    else if (m.t === "mq") this.onStepDown(m);
    else if (m.t === "mh") this.onHit(m);
    else if (m.t === "mk") this.onKill(m);
    else if (m.t === "wz") this.onWizard(m);
    else if (m.t === "won") this.onWon(m);
  }

  // A runner's report. If it is for the level we are on, show what it says.
  onReport(m) {
    const p = this.game.player;
    const level = this.seat;
    if (!p || !level || p.level !== level || level.id !== m.l || !this.net.peers.has(m.from)) return;
    if (!this.watching) {
      // Two of us are running this level. The lower number keeps it.
      if (m.from > this.net.id) return;
      this.sleep(level);
      this.watching = true;
    } else if (this.runnerId && this.runnerId !== m.from && m.from > this.runnerId) {
      return;
    }
    this.runnerId = m.from;
    this.heard = 0;

    // The monsters. Any ghost the report no longer mentions has died or
    // wandered out of range.
    const seen = new Set();
    for (const e of Array.isArray(m.list) ? m.list.slice(0, 300) : []) {
      if (!Array.isArray(e)) continue;
      const [mid, kind, lvl, x, y, dir, health, flags] = e;
      if (typeof mid !== "string" || mid.length > 24 || !whole(kind, 0, 1) || !whole(lvl, 1, 4)) continue;
      if (!onMap(x) || !onMap(y) || !whole(dir, 0, 3) || !Number.isFinite(health)) continue;
      let ghost = this.ghosts.get(mid);
      if (!ghost) {
        ghost = new Mob(x, y, kind ? "slime" : "zombie", lvl);
        ghost.mid = mid;
        ghost.ghost = true;
        level.add(ghost);
        this.ghosts.set(mid, ghost);
      }
      seen.add(mid);
      this.steer(ghost, x, y, dir, health, flags);
      ghost.jumpTime = flags & 2 ? 1 : 0;
    }
    for (const [mid, ghost] of this.ghosts) {
      if (seen.has(mid)) continue;
      ghost.removed = true;
      this.ghosts.delete(mid);
    }

    // The Air Wizard: [x, y, facing, health, flashing].
    const w = wizardOn(level);
    if (w && Array.isArray(m.w) && onMap(m.w[0]) && onMap(m.w[1]) && whole(m.w[2], 0, 3) && Number.isFinite(m.w[3])) {
      this.steer(w, m.w[0], m.w[1], m.w[2], m.w[3], m.w[4]);
    }

    // New sparks: [x, y, speed across, speed down, how long it lasts].
    for (const s of Array.isArray(m.s) ? m.s.slice(0, 60) : []) {
      if (!Array.isArray(s) || !onMap(s[0]) || !onMap(s[1]) || !whole(s[4], 1, 700)) continue;
      if (!Number.isFinite(s[2]) || !Number.isFinite(s[3]) || Math.abs(s[2]) > 2 || Math.abs(s[3]) > 2) continue;
      const spark = new Spark({ x: s[0], y: s[1] }, s[2], s[3]);
      spark.lifeTime = s[4];
      spark.remote = true;
      level.add(spark);
    }
  }

  // Point a ghost at where its runner says it is. It walks there (see glide
  // in mobs.js) unless it is a long way off, when it jumps.
  steer(ghost, x, y, dir, health, flags) {
    ghost.goalX = x;
    ghost.goalY = y;
    if (Math.abs(x - ghost.x) > 32 || Math.abs(y - ghost.y) > 32) {
      ghost.x = x;
      ghost.y = y;
    }
    ghost.dir = dir;
    ghost.health = health;
    if (flags & 1 && ghost.hurtTime < 3) ghost.hurtTime = 3;
  }

  // Our runner says they have stopped. Somebody must take over, soon.
  onStepDown(m) {
    if (this.watching && this.seat && this.seat.id === m.l && m.from === this.runnerId) this.runnerLost(this.seat);
  }

  // Our player hit a ghost (Mob.hurt and AirWizard.hurt call this). Show the
  // hit here straight away, and send it to the runner to be made real.
  // Returns false while the ghost is still flashing from the last hit, as a
  // real monster would.
  hit(mob, amt, dir) {
    if (mob.hurtTime > 0) return false;
    mob.level.add(new TextParticle(amt, mob.x, mob.y, C(500)));
    mob.hurtTime = 10;
    if (this.runnerId) {
      const id = mob.type === "wizard" ? "wizard" : mob.mid;
      this.net.send({ t: "mh", to: this.runnerId, l: mob.level.id, id, a: amt, d: dir });
    }
    return true;
  }

  // Running: a watcher hit one of our monsters. The biggest blow in the game
  // is about 50, so anything over 60 is not a real one.
  onHit(m) {
    const level = this.seat;
    if (!level || this.watching || level.id !== m.l || !whole(m.a, 0, 60) || !whole(m.d, 0, 3)) return;
    const target = m.id === "wizard" ? wizardOn(level) : level.entities.find((e) => e.type === "mob" && !e.removed && e.mid === m.id);
    if (!target || target.ghost) return;
    // If this blow kills it, die() needs to know whose kill it was.
    target.killer = m.from;
    try {
      target.hurt(m.a, m.d, this.game);
    } finally {
      target.killer = 0;
    }
  }

  // Running: a monster died to another player's blow (Mob.die calls this).
  // The drops and the points are theirs, so tell them.
  killedFor(killer, mob) {
    this.net.send({ t: "mk", to: killer, l: mob.level.id, x: mob.x | 0, y: mob.y | 0, k: mob.kind === "slime" ? 1 : 0, v: mob.lvl });
  }

  // We killed a monster that somebody else was running: here are the drops
  // and the points, the same as Mob.die gives.
  onKill(m) {
    const game = this.game;
    if (!game.player || !this.net.peers.has(m.from) || !isLevel(m.l) || !onMap(m.x) || !onMap(m.y)) return;
    if (!whole(m.k, 0, 1) || !whole(m.v, 1, 4)) return;
    dropItems(game.levels[m.l], m.x, m.y, [{ id: m.k ? "slime" : "cloth", n: rnd(2) + 1 }]);
    game.player.score += (m.k ? 25 : 50) * m.v;
  }

  // The Air Wizard's health, from whoever is running the sky. Kept up to date
  // on our own copy of him unless we are there ourselves, where the reports
  // (or we) are in charge of him.
  onWizard(m) {
    const p = this.game.player;
    if (!p || p.level.id === LEVEL.SKY || !this.net.peers.has(m.from)) return;
    if (!onMap(m.x) || !onMap(m.y) || !Number.isFinite(m.h) || m.h <= 0 || m.h > 2000) return;
    const w = wizardOn(this.game.levels[LEVEL.SKY]);
    if (!w) return;
    w.x = m.x;
    w.y = m.y;
    w.health = m.h;
  }

  // Running: the Air Wizard has died (AirWizard.die calls this). Everybody
  // wins; `killer` is the player who landed the blow, or 0 if it was us.
  wizardKilled(killer) {
    if (this.net.inRoom) this.net.send({ t: "won", by: killer || this.net.id });
  }

  // Somebody beat the Air Wizard. The win is everybody's, and the points go
  // to the player who landed the last blow.
  onWon(m) {
    const game = this.game;
    if (!game.player || game.wizardDead || !this.net.peers.has(m.from)) return;
    const w = wizardOn(game.levels[LEVEL.SKY]);
    if (w) w.removed = true;
    if (m.by === this.net.id) game.player.score += 1000;
    game.wizardDefeated();
  }
}
