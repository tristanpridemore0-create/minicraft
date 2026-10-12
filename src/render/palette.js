// Minicraft-style colours: a three-digit number, one digit (0-5) each for
// red, green and blue, e.g. 141 is the grass green and 5 is pure blue (005).
// Every colour is pulled halfway toward its own grey level, which is what
// gives the 2011 game its muted look.
const cache = new Map();

// Turn a colour number into the "rgb(...)" text the browser understands.
export function C(n) {
  // Each colour is worked out once and remembered, because the same few are
  // asked for thousands of times a second.
  let v = cache.get(n);
  if (v) return v;
  // Pull the three digits apart and scale each from 0-5 up to 0-255.
  const rr = ((((n / 100) | 0) % 10) * 255) / 5;
  const gg = ((((n / 10) | 0) % 10) * 255) / 5;
  const bb = ((n % 10) * 255) / 5;
  // How bright the colour looks overall. Eyes are most sensitive to green and
  // least to blue, which is why the three are weighted differently.
  const mid = (rr * 30 + gg * 59 + bb * 11) / 100;
  // Move each part halfway toward that brightness, then squeeze it into 10-240
  // so nothing is pure black or pure white.
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
