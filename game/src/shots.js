// Screenshot scenes behind ?shot=cover|title|boss|upgrade. Each one plays
// the real rules forward from a fresh seeded run with the autopilot, for a
// fixed number of steps, so the frame is what a real game looks like and the
// same seed always gives the same frame. No mockups, no staged art.
import { STEP } from './config.js';
import { autopilotInput } from './autopilot.js';
import { beginRun, chooseRoad, chooseUpgrade, startWave, stepSimulation } from './simulation.js';
import { makeRandom } from './random.js';
import { createRun } from './state.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';

function runSteps(run, rng, steps) {
  for (let i = 0; i < steps; i++) {
    if (run.screen === SCREEN_UPGRADE) { chooseUpgrade(run, rng, 0, null); chooseRoad(run, rng, 0, null); continue; }
    if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) break;
    if (run.screen === SCREEN_PLAY) stepSimulation(run, autopilotInput(run), rng, null);
    else break;
  }
}

function runStepsStopAtUpgrade(run, rng, steps) {
  for (let i = 0; i < steps; i++) {
    if (run.screen !== SCREEN_PLAY) break;
    stepSimulation(run, autopilotInput(run), rng, null);
  }
}

export function stageShot(name, run) {
  const seed = name === 'boss' ? 777 : name === 'cover' ? 42 : 7;
  const rng = makeRandom(seed);
  const fresh = createRun(seed);
  for (const key of Object.keys(run)) delete run[key];
  Object.assign(run, fresh);
  run.rng = rng;
  if (name === 'title') {
    beginRun(run, rng);
    runSteps(run, rng, Math.floor(5 / STEP));
    run.screen = SCREEN_TITLE;
    return SCREEN_TITLE;
  }
  if (name === 'upgrade') {
    // Play Wave 1 for real until it clears and the upgrade screen opens.
    beginRun(run, rng);
    for (let i = 0; i < 60; i++) {
      runStepsStopAtUpgrade(run, rng, 60);
      if (run.screen === SCREEN_UPGRADE) return SCREEN_UPGRADE;
      if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) break;
    }
    return run.screen;
  }
  if (name === 'boss') {
    // Play a real full run to Wave 7 (real score, real build), then fight
    // the boss for 8 s — so this shot shows the boss with the run behind it.
    const best = findBossStep(seed);
    const rng2 = makeRandom(seed);
    const fresh2 = createRun(seed);
    for (const key of Object.keys(run)) delete run[key];
    Object.assign(run, fresh2);
    run.rng = rng2;
    beginRun(run, rng2);
    runSteps(run, rng2, best);
    return run.screen;
  }
  if (name === 'win') {
    // Play a real full run to the end with the autopilot — the WIN screen
    // with the real score, time and build behind it.
    beginRun(run, rng);
    runSteps(run, rng, 60000);
    return run.screen;
  }
  // cover: play a REAL full run from Wave 1 to the Wave 7 boss with the
  // autopilot (real score in the thousands, real upgrades owned, real
  // combo), then take the densest moment of the boss fight — boss alive,
  // a gravity well detonating a cluster, escorts around it. Two
  // deterministic passes over the same seed: the first finds that step,
  // the second replays to it, so the cover is a real frame, never a lull.
  const best = findCoverStep(seed);
  const rng2 = makeRandom(seed);
  const fresh2 = createRun(seed);
  for (const key of Object.keys(run)) delete run[key];
  Object.assign(run, fresh2);
  run.rng = rng2;
  beginRun(run, rng2);
  runSteps(run, rng2, best);
  return run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE ? run.screen : SCREEN_PLAY;
}

function densityScore(probe) {
  // Particles (a detonation in progress) and combo count most: they are
  // what separates a mid-action frame from a lull between explosions.
  let score = probe.enemies.length * 5 + probe.bolts.length + probe.particles.length * 2
    + probe.wells.length * 6 + probe.enemyBolts.length + (probe.boss ? 40 : 0)
    + probe.combo * 2;
  // A dead combo (x0) reads as a lull even in a dense frame.
  if (probe.combo === 0) score -= 25;
  // Composition: the boss and the wells must be in the open centre of the
  // frame, not hiding behind a side panel or at an edge. An edge boss is
  // penalised hard, however dense the rest of the frame is.
  if (probe.boss) {
    if (probe.boss.x > 300 && probe.boss.x < 980 && probe.boss.y > 180 && probe.boss.y < 560) score += 40;
    else score -= 80;
  }
  for (const w of probe.wells) {
    if (w.x > 300 && w.x < 980 && w.y > 180 && w.y < 560) score += 15;
    else score -= 10;
  }
  return score;
}

function playToWaveSeven(probe, rng) {
  let steps = 0;
  // The loop must not stop on an upgrade screen: runSteps handles the
  // pick and keeps playing, but a 60-step chunk can end exactly on the
  // upgrade screen, and the old `screen === SCREEN_PLAY` condition then
  // returned early with wave < 7 — a wave-3 "cover". Only win/lose stops it.
  while (probe.wave < 7 && probe.screen !== SCREEN_WIN && probe.screen !== SCREEN_LOSE && steps < 20000) {
    runSteps(probe, rng, 60);
    steps += 60;
  }
  return steps;
}

function findBossStep(seed) {
  const rng = makeRandom(seed);
  const probe = createRun(seed);
  probe.rng = rng;
  beginRun(probe, rng);
  const steps = playToWaveSeven(probe, rng);
  return steps + Math.floor(8 / STEP);
}

function findCoverStep(seed) {
  const rng = makeRandom(seed);
  const probe = createRun(seed);
  probe.rng = rng;
  beginRun(probe, rng);
  let steps = playToWaveSeven(probe, rng);
  // Sample the boss fight every quarter second for 16 s.
  let bestStep = steps, bestScore = -1;
  for (let s = 0; s < Math.floor(16 / STEP); s += 15) {
    runSteps(probe, rng, 15);
    steps += 15;
    if (probe.screen !== SCREEN_PLAY) break;
    const score = densityScore(probe);
    if (score > bestScore) { bestScore = score; bestStep = steps; }
  }
  return bestStep;
}

export { SCREEN_TITLE };
