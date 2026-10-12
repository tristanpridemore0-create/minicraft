import { itemDef } from "./defs.js";

export class Inventory {
  constructor(slots = []) {
    this.slots = slots.map((s) => ({ id: s.id, count: s.count, extra: s.extra || null }));
  }

  add(id, count = 1, extra = null) {
    if (extra) {
      this.slots.push({ id, count, extra });
      return;
    }
    const found = this.slots.find((s) => s.id === id && !s.extra);
    if (found) found.count += count;
    else this.slots.push({ id, count, extra: null });
  }

  count(id) {
    return this.slots.filter((s) => s.id === id).reduce((n, s) => n + s.count, 0);
  }

  has(id, n = 1) {
    return this.count(id) >= n;
  }

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

  canPay(cost) {
    return Object.entries(cost).every(([id, n]) => this.has(id, n));
  }

  pay(cost) {
    if (!this.canPay(cost)) return false;
    for (const [id, n] of Object.entries(cost)) this.remove(id, n);
    return true;
  }

  toJSON() {
    return this.slots.map((s) => ({ ...s }));
  }
}

export function displayName(slot) {
  const d = itemDef(slot.id);
  const n = d ? d.name : slot.id;
  return slot.count > 1 ? `${n} ${slot.count}` : n;
}
