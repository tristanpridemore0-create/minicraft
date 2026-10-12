// Things you can put down, push around and pick up again: the workbench, chest,
// oven, furnace, anvil and lantern.

import { Entity } from "./entity.js";
import { Inventory } from "../items/inventory.js";

// How far one push moves it, for each direction the pusher may be facing (down,
// up, left, right).
const STEP = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

// One piece of furniture. `kind` says which, for example "chest".
export class Furniture extends Entity {
  // `chestSlots` is what a chest starts with inside it.
  constructor(x, y, kind, chestSlots = []) {
    super(x, y);
    this.type = "furniture";
    this.kind = kind;
    // Solid: other things cannot walk through it.
    this.blocks = true;
    this.xr = 3;
    this.yr = 3;
    this.pushTime = 0;
    this.pushDir = -1;
    // Only a chest has contents.
    this.inv = kind === "chest" ? new Inventory(chestSlots) : null;
  }

  // Leaning on furniture shoves it one pixel, at most once every ten ticks.
  touchedBy(e) {
    if (e.type === "player" && this.pushTime === 0) {
      this.pushDir = e.dir;
      this.pushTime = 10;
    }
  }

  // Carry out a push that was asked for, then count down the wait before the
  // next.
  tick() {
    if (this.pushDir >= 0) {
      const [dx, dy] = STEP[this.pushDir];
      this.move(dx, dy);
      this.pushDir = -1;
    }
    if (this.pushTime > 0) this.pushTime--;
  }

  // Furniture cannot be pushed into water.
  canSwim() {
    return false;
  }
}
