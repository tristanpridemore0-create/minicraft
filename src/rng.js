// Random numbers that can be repeated. Math.random() gives different numbers
// every time the game runs. These give the same numbers for the same seed,
// which is how one seed always builds the same world.

// A small random number generator (the method is known as mulberry32). Each
// call to next() scrambles the stored number `s` and returns a fraction from 0
// up to, but not including, 1.
export class RNG {
  // `>>> 0` turns the seed into a whole number between 0 and about 4 billion. A
  // seed of 0 becomes 1.
  constructor(seed) {
    this.s = seed >>> 0 || 1;
  }

  // The next random fraction, from 0 up to but not including 1.
  next() {
    this.s += 0x6d2b79f5;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // A whole number from 0 to n - 1. `| 0` chops off the fraction.
  int(n) {
    return (this.next() * n) | 0;
  }

  // A whole number from a to b, including both ends.
  range(a, b) {
    return a + this.int(b - a + 1);
  }

  // True with probability p, so 0.25 means one time in four. Not used at the
  // moment.
  chance(p) {
    return this.next() < p;
  }

  // A random entry from a list. Not used at the moment.
  pick(arr) {
    return arr[this.int(arr.length)];
  }
}

// Turns a position (x, y) and a seed into a fraction from 0 to 1 that looks
// random but is always the same for the same inputs. Unlike RNG it remembers
// nothing, so any tile can be asked about in any order.
//
// Math.imul multiplies whole numbers the way a 32-bit computer does, letting
// them overflow. That overflow is what does the scrambling.
export function hash2(x, y, seed) {
  let h = seed | 0;
  h = Math.imul(h ^ Math.imul(x, 374761393), 668265263);
  h = Math.imul(h ^ Math.imul(y, 668265263), 374761393);
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967296;
}

// Smooth random values. hash2 alone gives every tile an unrelated number, like
// television static. This picks random values only at the corners of a coarse
// grid, `scale` tiles apart, and blends between them, which gives gentle hills
// instead of static.
export function valueNoise(x, y, seed, scale) {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const y0 = Math.floor(ny);
  const fx = nx - x0;
  const fy = ny - y0;
  // Ease the blend so it levels off near each grid corner (a curve called
  // smoothstep) instead of changing direction sharply there.
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  // The random values at the four grid corners around this point.
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);
  // Blend along the top edge and along the bottom edge, then between the two.
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sy;
}

// Layered noise. Adds up several layers of valueNoise: each layer uses a grid
// half the size of the one before, for finer detail, and counts half as much.
// The first layer gives the large shapes and the later ones roughen the edges.
// Dividing by the total weight keeps the answer between 0 and 1.
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
