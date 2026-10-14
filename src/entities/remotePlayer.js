// Somebody else's player, as shown on this screen in a multiplayer game. The
// real one lives in their browser. This is only a picture of it, kept up to
// date by the messages they send about ten times a second (see net.js).

import { DIR } from "../constants.js";
import { itemDef } from "../items/defs.js";

// One other player. `id` is the number the server gave them.
export class RemotePlayer {
  constructor(id) {
    this.id = id;
    // The renderer draws anything of type "player" as a person. `remote` tells
    // it to use a different colour of clothes.
    this.type = "player";
    this.remote = true;
    // Where they are drawn, and where they last said they were. The drawing
    // walks toward the report instead of jumping to it, so movement looks
    // smooth between messages.
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    // The number of the level they are on, or null until we first hear from
    // them. They are only drawn when it matches the level being shown.
    this.levelId = null;
    this.dir = DIR.DOWN;
    this.walk = 0;
    this.swimming = false;
    // The id of the item in their hand, or null.
    this.heldId = null;
    // Are they carrying a lantern, in hand or pack? It decides how much light
    // they give off in a cave.
    this.lantern = false;
    // The same three as on Player: they make the swing show.
    this.attackTime = 0;
    this.attackDir = DIR.DOWN;
    this.attackItem = null;
    // How many times they have attacked. When it goes up, they just swung.
    this.attacks = 0;
    this.hurtTime = 0;
    // True while they are dead and waiting to come back.
    this.down = false;
  }

  // The full description of the item in their hand, for drawing.
  activeItem() {
    return this.heldId ? itemDef(this.heldId) : null;
  }

  // Take in a report. net.js has already checked every value in it.
  update(r) {
    const first = this.levelId === null;
    const far = Math.abs(r.x - this.x) > 48 || Math.abs(r.y - this.y) > 48;
    this.goalX = r.x;
    this.goalY = r.y;
    // Arriving, changing level or falling far behind: jump straight there.
    if (first || r.level !== this.levelId || far) {
      this.x = r.x;
      this.y = r.y;
    }
    this.levelId = r.level;
    this.dir = r.dir;
    this.swimming = r.swimming;
    this.down = r.down;
    this.heldId = r.held;
    // Players on an older copy of the game only say what is in their hand.
    this.lantern = r.lantern || r.held === "lantern";
    if (r.attacks !== this.attacks) {
      this.attacks = r.attacks;
      if (!first) {
        this.attackTime = 10;
        this.attackDir = r.dir;
        this.attackItem = r.held;
      }
    }
  }

  // Called every game tick: walk a pixel toward where they said they were,
  // which is the speed a player really walks at, or faster to catch up.
  tick() {
    if (this.attackTime > 0) this.attackTime--;
    const dx = this.goalX - this.x;
    const dy = this.goalY - this.y;
    if (dx === 0 && dy === 0) return;
    const reach = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    this.x += Math.max(-reach, Math.min(reach, dx));
    this.y += Math.max(-reach, Math.min(reach, dy));
    this.walk++;
  }
}
