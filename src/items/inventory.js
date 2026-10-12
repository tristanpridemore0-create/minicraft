// A list of item stacks: the player's pack, or what is inside a chest. Each
// entry (a "slot") is { id, count, extra }. `extra` is only used for a chest
// that is being carried: it holds the chest's contents.

import { itemDef } from "./defs.js";

// See the top of this file for what a slot is.
export class Inventory {
  // Start from a plain list of slots, copying each one.
  constructor(slots = []) {
    this.slots = slots.map((s) => ({ id: s.id, count: s.count, extra: s.extra || null }));
  }

  // Add items. They join an existing stack of the same thing if there is one,
  // and otherwise start a new slot at the end. Anything with `extra` always
  // gets a slot of its own.
  add(id, count = 1, extra = null) {
    if (extra) {
      this.slots.push({ id, count, extra });
      return;
    }
    const found = this.slots.find((s) => s.id === id && !s.extra);
    if (found) found.count += count;
    else this.slots.push({ id, count, extra: null });
  }

  // Put a slot back at the top of the pack, stacking onto a matching pile.
  putFront(slot) {
    if (!slot) return;
    const found = !slot.extra && this.slots.find((s) => s.id === slot.id && !s.extra);
    if (found) found.count += slot.count;
    else this.slots.unshift({ id: slot.id, count: slot.count, extra: slot.extra || null });
  }

  // How many of an item there are, across all stacks.
  count(id) {
    return this.slots.filter((s) => s.id === id).reduce((n, s) => n + s.count, 0);
  }

  // Are there at least n of an item?
  has(id, n = 1) {
    return this.count(id) >= n;
  }

  // Take n of an item out, emptying stacks as it goes. Returns true if there
  // were enough.
  remove(id, n = 1) {
    let left = n;
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (s.id !== id || s.extra) continue;
      const take = Math.min(s.count, left);
      s.count -= take;
      left -= take;
    }
    this.slots = this.slots.filter((s) => s.count > 0);
    return left === 0;
  }

  // Take one item out of the slot at this position and return it. A slot with
  // `extra` (a carried chest) comes out whole.
  takeAt(index) {
    const s = this.slots[index];
    if (!s) return null;
    if (s.extra) {
      this.slots.splice(index, 1);
      return s;
    }
    s.count--;
    const out = { id: s.id, count: 1, extra: null };
    if (s.count <= 0) this.slots.splice(index, 1);
    return out;
  }

  // `cost` is a recipe's price, such as { wood: 5, stone: 5 }. True if all of
  // it can be afforded.
  canPay(cost) {
    return Object.entries(cost).every(([id, n]) => this.has(id, n));
  }

  // Pay a price in full, or take nothing and return false.
  pay(cost) {
    if (!this.canPay(cost)) return false;
    for (const [id, n] of Object.entries(cost)) this.remove(id, n);
    return true;
  }

  // A plain copy of the slots, for saving.
  toJSON() {
    return this.slots.map((s) => ({ ...s }));
  }
}

// An item's name with its count, such as "Wood 12". Not used at the moment;
// render/itemdraw.js draws item rows instead.
export function displayName(slot) {
  const d = itemDef(slot.id);
  const n = d ? d.name : slot.id;
  return slot.count > 1 ? `${n} ${slot.count}` : n;
}
