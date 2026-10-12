export class RNG {
  constructor(seed) {
    this.s = seed >>> 0 || 1;
  }

  next() {
    this.s += 0x6d2b79f5;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(n) {
    return (this.next() * n) | 0;
  }

  range(a, b) {
    return a + this.int(b - a + 1);
  }

  chance(p) {
    return this.next() < p;
  }

  pick(arr) {
    return arr[this.int(arr.length)];
  }
}

export function hash2(x, y, seed) {
  let h = seed | 0;
  h = Math.imul(h ^ Math.imul(x, 374761393), 668265263);
  h = Math.imul(h ^ Math.imul(y, 668265263), 374761393);
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967296;
}

export function valueNoise(x, y, seed, scale) {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const y0 = Math.floor(ny);
  const fx = nx - x0;
  const fy = ny - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sy;
}

export function fbm(x, y, seed, scale, octaves = 4) {
  let v = 0;
  let a = 1;
  let s = scale;
  let tot = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x, y, seed + i * 101, s) * a;
    tot += a;
    a *= 0.5;
    s *= 0.5;
  }
  return v / tot;
}
