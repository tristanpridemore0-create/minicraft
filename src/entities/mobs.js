// The creatures: zombies and slimes (one Mob class covers both), the Air
// Wizard, and the sparks he throws.

import { Entity } from "./entity.js";
import { MAP, TILE } from "../constants.js";
import { dropItems } from "./itemEntity.js";
import { Tile } from "../world/tiles.js";

const rnd = (n) => (Math.random() * n) | 0;

// Every monster gets a name of its own, such as "k3x9q1:12", so that in
// multiplayer two browsers can say which one they mean. The first part is
// picked at random when the page loads, and the second counts up.
const TAG = Math.random().toString(36).slice(2, 8);
let made = 0;

// In multiplayer a monster may be a "ghost": one that another player's browser
// is running (see netMobs.js). A ghost does no thinking here. Each tick it
// only walks toward where its runner last said it was: a pixel at a time, or
// faster if it has fallen behind.
function glide(e) {
  const dx = e.goalX - e.x;
  const dy = e.goalY - e.y;
  if (dx === 0 && dy === 0) return;
  const reach = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  e.x += Math.max(-reach, Math.min(reach, dx));
  e.y += Math.max(-reach, Math.min(reach, dy));
  e.walk++;
}

// Mob levels 1-4 are drawn in these four colour sets.
const COLORS = ["g", "r", "w", "b"];

// A zombie or a slime. `kind` says which.
export class Mob extends Entity {
  // `lvl` runs from 1 (surface) to 4 (deepest caves and the sky).
  constructor(x, y, kind, lvl) {
    super(x, y);
    this.type = "mob";
    this.kind = kind;
    this.lvl = lvl;
    this.color = COLORS[lvl - 1] || "g";
    // Health and damage grow with level: a level 1 slime has 5 health and a
    // level 4 zombie has 160.
    this.maxHealth = this.health = lvl * lvl * (kind === "slime" ? 5 : 10);
    this.dmg = kind === "slime" ? lvl : lvl + 1;
    this.xr = 4;
    this.yr = 3;
    // The direction it is heading: -1, 0 or 1 across, and the same up and down.
    this.xa = 0;
    this.ya = 0;
    this.tickTime = 0;
    this.jumpTime = 0;
    this.randomWalkTime = 0;
    // Multiplayer (see the note above glide): its name, whether it is a ghost,
    // and where a ghost is heading.
    this.mid = `${TAG}:${++made}`;
    this.ghost = false;
    this.goalX = x;
    this.goalY = y;
    // The number of the other player whose blow is being dealt right now, or
    // 0. If the blow kills, the drops and points are theirs (see die below).
    this.killer = 0;
  }

  // Monsters cannot cross water.
  canSwim() {
    return false;
  }

  // One tick: move, burn in lava, and hurt the player on contact.
  tick(game) {
    super.tick();
    if (this.ghost) {
      glide(this);
    } else {
      this.tickTime++;
      // Chase the nearest living player. In a room that may be somebody else's.
      const p = game.nearestPlayer(this);
      if (this.kind === "slime") this.tickSlime(p);
      else this.tickZombie(p);
      // Lava burns monsters too.
      if (this.level.tileAtPixel(this.x, this.y) === Tile.lava) this.hurt(4, this.dir ^ 1, game);
    }
    // Touching our own player hurts them. Every browser checks this for its
    // own player, whoever is running the monster.
    const me = game.dead ? null : game.player;
    if (me && !this.removed && this.overlaps(me)) me.hurtFrom(this.dmg, this.dir, game, true);
  }

  // A ghost cannot be hurt here. The blow is sent to the player running it.
  hurt(amt, dir, game) {
    if (this.ghost) return game.net.mobs.hit(this, amt, dir);
    return super.hurt(amt, dir, game);
  }

  // Zombies walk at half speed straight at a player within 50 pixels, and
  // wander for a second whenever they get stuck.
  tickZombie(p) {
    if (p && this.randomWalkTime === 0) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (dx * dx + dy * dy < 50 * 50) {
        this.xa = Math.sign(dx);
        this.ya = Math.sign(dy);
      }
    }
    // `& 1` is 1 on odd ticks and 0 on even ones, so it steps every other tick:
    // half speed.
    const speed = this.tickTime & 1;
    // If the way is blocked, or once in a while anyway, wander in a random
    // direction for a second.
    if (!this.walkMove(this.xa * speed, this.ya * speed) || rnd(200) === 0) {
      this.randomWalkTime = 60;
      this.xa = (rnd(3) - 1) * rnd(2);
      this.ya = (rnd(3) - 1) * rnd(2);
    }
    if (this.randomWalkTime > 0) this.randomWalkTime--;
  }

  // Slimes hop: ten ticks of movement, then at least ten of rest.
  tickSlime(p) {
    if (!this.walkMove(this.xa, this.ya) || rnd(40) === 0) {
      // Rested long enough: choose a direction for the next hop, toward the
      // player if they are close.
      if (this.jumpTime <= -10) {
        this.xa = rnd(3) - 1;
        this.ya = rnd(3) - 1;
        if (p) {
          const dx = p.x - this.x;
          const dy = p.y - this.y;
          if (dx * dx + dy * dy < 50 * 50) {
            if (dx) this.xa = Math.sign(dx);
            if (dy) this.ya = Math.sign(dy);
          }
        }
        if (this.xa || this.ya) this.jumpTime = 10;
      }
    }
    // jumpTime runs from 10 down to 0 during a hop, then on down to -10 while
    // resting.
    this.jumpTime--;
    if (this.jumpTime === 0) this.xa = this.ya = 0;
  }

  // Drop 1-2 items (slime or cloth) and score points: more for zombies, and
  // more for higher levels.
  die(game) {
    super.die();
    // Killed by another player's blow: the drops and the points go to them.
    if (this.killer && game) {
      game.net.mobs.killedFor(this.killer, this);
      return;
    }
    const n = rnd(2) + 1;
    if (this.kind === "slime") dropItems(this.level, this.x, this.y, [{ id: "slime", n }]);
    else dropItems(this.level, this.x, this.y, [{ id: "cloth", n }]);
    if (game && game.player) game.player.score += (this.kind === "slime" ? 25 : 50) * this.lvl;
  }
}

// One of the Air Wizard's sparks.
export class Spark extends Entity {
  // `owner` is the wizard that threw it. xa and ya are its speed across and
  // down.
  constructor(owner, xa, ya) {
    super(owner.x, owner.y);
    this.type = "spark";
    this.xr = 0;
    this.yr = 0;
    this.xx = owner.x;
    this.yy = owner.y;
    this.xa = xa;
    this.ya = ya;
    this.time = 0;
    // Sparks last about ten seconds.
    this.lifeTime = 600 + rnd(30);
    // Multiplayer: true for a spark thrown by a wizard that another player's
    // browser is running. It can sting our player but not the monsters, which
    // are that browser's business.
    this.remote = false;
  }

  // Sparks drift in a straight line through everything and sting whatever
  // they pass over, monsters included.
  tick(game) {
    if (++this.time >= this.lifeTime) {
      this.removed = true;
      return;
    }
    this.xx += this.xa;
    this.yy += this.ya;
    this.x = this.xx | 0;
    this.y = this.yy | 0;
    // Is the spark inside this thing's box?
    const over = (e) => Math.abs(e.x - this.x) <= e.xr && Math.abs(e.y - this.y) <= e.yr;
    const p = game.player;
    if (p && !game.dead && over(p)) p.hurtFrom(1, p.dir ^ 1, game, true);
    if (this.remote) return;
    for (const e of this.level.entities) {
      if (e.type === "mob" && !e.removed && over(e)) e.hurt(1, e.dir ^ 1, game);
    }
  }
}

// The boss, who lives on the sky level. Beating him wins the game.
export class AirWizard extends Entity {
  // He has 2000 health, far more than anything else in the game.
  constructor(x, y) {
    super(x, y);
    this.type = "wizard";
    this.maxHealth = this.health = 2000;
    this.xr = 4;
    this.yr = 3;
    this.xa = 0;
    this.ya = 0;
    this.tickTime = 0;
    this.randomWalkTime = 0;
    // attackDelay counts down the wind-up before an attack, attackTime counts
    // down the attack itself, and attackType (0, 1 or 2) sets how fast the
    // sparks fly.
    this.attackDelay = 0;
    this.attackTime = 0;
    this.attackType = 0;
    // Multiplayer, as for Mob: is another player's browser running him, where
    // is he heading if so, and whose blow is being dealt.
    this.ghost = false;
    this.goalX = x;
    this.goalY = y;
    this.killer = 0;
  }

  // He flies: only the edge of the map stops him.
  blocked(px, py) {
    const max = MAP * TILE - 16;
    return px < 16 || py < 16 || px > max || py > max;
  }

  // ...and he never swims.
  isSwimming() {
    return false;
  }

  // One tick. He is always doing one of three things: winding up, throwing
  // sparks, or moving about.
  tick(game) {
    super.tick();
    // Our own player, if alive: the only one this browser may hurt.
    const me = game.dead ? null : game.player;
    if (this.ghost) {
      glide(this);
      if (me && this.overlaps(me)) me.hurtFrom(3, this.dir, game, true);
      return;
    }
    this.tickTime++;

    // Wind-up: two seconds standing still before the sparks start.
    if (this.attackDelay > 0) {
      this.attackDelay--;
      if (this.attackDelay === 0) {
        this.attackType = this.health < 200 ? 2 : this.health < 1000 ? 1 : 0;
        this.attackTime = 120;
      }
      return;
    }

    // One spark a tick for two seconds, fanning out in two counter-rotating
    // spirals. They fly faster as he gets weaker.
    if (this.attackTime > 0) {
      this.attackTime--;
      // The angle grows as the attack goes on and its sign flips every tick,
      // which gives two spirals turning opposite ways.
      const angle = this.attackTime * 0.25 * ((this.attackTime % 2) * 2 - 1);
      const speed = 0.7 + this.attackType * 0.2;
      const spark = new Spark(this, Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.level.add(spark);
      game.net.mobs.sparkThrown(spark);
      return;
    }

    // He keeps his distance from the nearest living player, who in a room may
    // be somebody else's.
    const p = game.nearestPlayer(this);
    // d2 is the distance to the player, squared. Comparing squared distances
    // avoids working out a square root.
    let d2 = Infinity;
    if (p) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      d2 = dx * dx + dy * dy;
      if (this.randomWalkTime === 0) {
        if (d2 < 32 * 32) {
          // Too close: back away.
          this.xa = -Math.sign(dx);
          this.ya = -Math.sign(dy);
        } else if (d2 > 80 * 80) {
          this.xa = Math.sign(dx);
          this.ya = Math.sign(dy);
        }
      }
    }

    // He moves on three ticks out of every four.
    const speed = this.tickTime % 4 === 0 ? 0 : 1;
    if (!this.walkMove(this.xa * speed, this.ya * speed) || rnd(100) === 0) {
      this.randomWalkTime = 30;
      this.xa = rnd(3) - 1;
      this.ya = rnd(3) - 1;
    }
    if (this.randomWalkTime > 0) {
      this.randomWalkTime--;
      // At the end of a wander, one time in four, he starts an attack if the
      // player is within 50 pixels.
      if (p && this.randomWalkTime === 0 && rnd(4) === 0 && d2 < 50 * 50) this.attackDelay = 120;
    }

    if (me && this.overlaps(me)) me.hurtFrom(3, this.dir, game, true);
  }

  // Being hit provokes an attack if one is not already under way. As a ghost
  // he cannot be hurt here: the blow is sent to the player running him.
  hurt(amt, dir, game) {
    if (this.ghost) return game.net.mobs.hit(this, amt, dir);
    const landed = super.hurt(amt, dir, game);
    if (landed && this.attackDelay === 0 && this.attackTime === 0) this.attackDelay = 120;
    return landed;
  }

  // Worth 1000 points, and the game is won. In a room the win is everybody's
  // and the points go to whoever landed the last blow.
  die(game) {
    super.die();
    if (!game) return;
    if (!this.killer && game.player) game.player.score += 1000;
    game.net.mobs.wizardKilled(this.killer);
    game.wizardDefeated();
  }
}
