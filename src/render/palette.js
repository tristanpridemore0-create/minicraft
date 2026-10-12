// Minicraft-style colours: a three-digit number, one digit (0-5) each for
// red, green and blue, e.g. 141 is the grass green and 5 is pure blue (005).
// Every colour is pulled halfway toward its own grey level, which is what
// gives the 2011 game its muted look.
const cache = new Map();

export function C(n) {
  let v = cache.get(n);
  if (v) return v;
  const rr = ((((n / 100) | 0) % 10) * 255) / 5;
  const gg = ((((n / 10) | 0) % 10) * 255) / 5;
  const bb = ((n % 10) * 255) / 5;
  const mid = (rr * 30 + gg * 59 + bb * 11) / 100;
  const f = (c) => ((((c + mid) / 2) * 230) / 255 + 10) | 0;
  v = `rgb(${f(rr)},${f(gg)},${f(bb)})`;
  cache.set(n, v);
  return v;
}

// Colour of bare ground on each level; terrain edges fade into it.
export function dirtColor(levelId) {
  if (levelId < 0) return 222;
  if (levelId === 1) return 444;
  return 322;
}
