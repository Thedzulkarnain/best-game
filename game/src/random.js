// Seeded random: deterministic runs for screenshots and tests.
export function makeRandom(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function pickRandom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
