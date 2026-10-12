import { Entity } from "./entity.js";
import { Inventory } from "../items/inventory.js";

export class Furniture extends Entity {
  constructor(x, y, kind, chestSlots = []) {
    super(x, y);
    this.type = "furniture";
    this.kind = kind;
    this.blocks = true;
    this.xr = 7;
    this.yr = 6;
    this.health = 20;
    this.inv = kind === "chest" ? new Inventory(chestSlots) : null;
  }

  tick() {
    super.tick();
  }

  die() {
    this.removed = true;
  }

  toItem() {
    return { id: this.kind, extra: this.kind === "chest" ? this.inv.toJSON() : null };
  }
}

export function makeFurniture(kind, x, y, extra) {
  return new Furniture(x, y, kind, extra || []);
}
