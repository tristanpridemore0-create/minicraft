import { Entity } from "./entity.js";
import { Inventory } from "../items/inventory.js";

const STEP = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

export class Furniture extends Entity {
  constructor(x, y, kind, chestSlots = []) {
    super(x, y);
    this.type = "furniture";
    this.kind = kind;
    this.blocks = true;
    this.xr = 3;
    this.yr = 3;
    this.pushTime = 0;
    this.pushDir = -1;
    this.inv = kind === "chest" ? new Inventory(chestSlots) : null;
  }

  // Leaning on furniture shoves it one pixel, at most once every ten ticks.
  touchedBy(e) {
    if (e.type === "player" && this.pushTime === 0) {
      this.pushDir = e.dir;
      this.pushTime = 10;
    }
  }

  tick() {
    if (this.pushDir >= 0) {
      const [dx, dy] = STEP[this.pushDir];
      this.move(dx, dy);
      this.pushDir = -1;
    }
    if (this.pushTime > 0) this.pushTime--;
  }

  canSwim() {
    return false;
  }
}
