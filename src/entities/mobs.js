import { Entity } from "./entity.js";
import { DIR } from "../constants.js";
import { dropItems } from "./itemEntity.js";
import { liquid, holeLike } from "../world/tiles.js";

const SLIME = {
  g: { hp: 5, dmg: 1, sprite: "slime_g" },
  r: { hp: 20, dmg: 2, sprite: "slime_r" },
  w: { hp: 45, dmg: 3, sprite: "slime_w" },
  b: { hp: 80, dmg: 4, sprite: "slime_b" },
};
const ZOMBIE = {
  g: { hp: 10, dmg: 2, sprite: "zombie_g" },
  r: { hp: 40, dmg: 3, sprite: "zombie_r" },
  w: { hp: 90, dmg: 4, sprite: "zombie_w" },
  b: { hp: 160, dmg: 5, sprite: "zombie_b" },
};

export class Mob extends Entity {
  constructor(x, y, kind, color) {
    super(x, y);
    this.type = "mob";
    this.kind = kind;
    this.color = color;
    const spec = kind === "slime" ? SLIME[color] : ZOMBIE[color];
    this.health = spec.hp;
    this.maxHealth = spec.hp;
    this.dmg = spec.dmg;
    this.sprite = spec.sprite;
    this.dir = DIR.DOWN;
    this.walk = 0;
    this.xa = 0;
    this.ya = 0;
    this.jump = 0;
  }

  canSwim() {
    return false;
  }

  tick(game) {
    super.tick(game);
    const p = game.player;
    if (!p) return;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (this.kind === "slime") {
      if (this.jump > 0) {
        this.jump--;
        this.move(this.xa, this.ya);
      } else if (Math.random() < 0.02) {
        this.jump = 12;
        if (dist < 80) {
          this.xa = Math.sign(dx);
          this.ya = Math.sign(dy);
        } else {
          this.xa = (Math.random() * 3 - 1) | 0;
          this.ya = (Math.random() * 3 - 1) | 0;
        }
      }
    } else {
      if (dist < 96) {
        this.xa = Math.sign(dx);
        this.ya = Math.sign(dy);
      } else if (Math.random() < 0.05) {
        this.xa = (Math.random() * 3 - 1) | 0;
        this.ya = (Math.random() * 3 - 1) | 0;
      }
      if (this.level.tick % 2 === 0 && this.move(this.xa, this.ya)) this.walk += 2;
    }
    if (this.ya > 0) this.dir = DIR.DOWN;
    else if (this.ya < 0) this.dir = DIR.UP;
    else if (this.xa < 0) this.dir = DIR.LEFT;
    else if (this.xa > 0) this.dir = DIR.RIGHT;
    if (this.overlaps(p) && this.hurtTime === 0) {
      p.hurtFrom(this.dmg, this.x, this.y, game);
    }
    const t = this.level.tileAtPixel(this.x, this.y);
    if (liquid(t) || holeLike(t)) this.die(game);
  }

  die(game) {
    super.die();
    if (this.kind === "slime") dropItems(this.level, this.x, this.y, [{ id: "slime", n: (Math.random() * 3) | 0 }]);
    else dropItems(this.level, this.x, this.y, [{ id: "cloth", n: (Math.random() * 3) | 0 }]);
  }
}

export class Spark extends Entity {
  constructor(x, y, vx, vy) {
    super(x, y);
    this.type = "spark";
    this.xr = 3;
    this.yr = 3;
    this.vx = vx;
    this.vy = vy;
    this.life = 120;
  }

  tick(game) {
    super.tick();
    this.life--;
    this.x += this.vx;
    this.y += this.vy;
    if (this.life <= 0) this.removed = true;
    if (game.player && this.overlaps(game.player)) {
      game.player.hurtFrom(1, this.x, this.y, game);
      this.removed = true;
    }
  }
}

export class AirWizard extends Entity {
  constructor(x, y) {
    super(x, y);
    this.type = "wizard";
    this.health = 2000;
    this.maxHealth = 2000;
    this.dir = DIR.DOWN;
    this.atk = 0;
    this.xr = 8;
    this.yr = 8;
    this.phase = 0;
  }

  canSwim() {
    return true;
  }

  tick(game) {
    super.tick();
    const p = game.player;
    if (!p) return;
    this.phase++;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (this.phase % 2 === 0) this.move(Math.sign(dx), Math.sign(dy));
    if (this.overlaps(p)) p.hurtFrom(3, this.x, this.y, game);
    if (this.phase % 40 === 0) {
      const ang = Math.atan2(dy, dx);
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.4;
        this.level.add(new Spark(this.x, this.y, Math.cos(a) * 0.9, Math.sin(a) * 0.9));
      }
    }
  }

  die(game) {
    super.die();
    if (!game) return;
    game.won = true;
    game.audio.win();
  }
}

export function spawnColorForLevel(levelId) {
  if (levelId === 0) return ["g"];
  if (levelId === -1) return ["g", "r"];
  if (levelId === -2) return ["g", "r", "w"];
  return ["g", "r", "w", "b"];
}

export { SLIME, ZOMBIE };
