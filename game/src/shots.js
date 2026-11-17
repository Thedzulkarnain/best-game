// Screenshot scenes behind ?shot=cover|title|boss. Each one plays the real
// rules forward from a fresh seeded run with the autopilot, for a fixed
// number of steps, so the frame is what a real game looks like and the same
// seed always gives the same frame. No mockups, no staged art.
import { STEP } from './config.js';
import { autopilotInput } from './autopilot.js';
import { beginRun, chooseUpgrade, startWave, stepSimulation } from './simulation.js';
import { applyUpgrade } from './upgrades.js';
import { makeRandom } from './random.js';
import { createRun } from './state.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';

function runSteps(run, rng, steps) {
  for (let i = 0; i < steps; i++) {
    if (run.screen === SCREEN_UPGRADE) { chooseUpgrade(run, rng, 0, null); continue; }
    if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) break;
    if (run.screen === SCREEN_PLAY) stepSimulation(run, autopilotInput(run), rng, null);
    else break;
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
    // A garden already alive behind the title: 5 s of ambient play first.
    beginRun(run, rng);
    runSteps(run, rng, Math.floor(5 / STEP));
    run.screen = SCREEN_TITLE;
    return SCREEN_TITLE;
  }
  if (name === 'boss') {
    // Jump the real game to Wave 7 with a battle-tested keeper (the upgrades
    // a wave-6 survivor would own), then fight the Rot King for ~10 s.
    beginRun(run, rng);
    for (const id of ['thorn', 'thorn', 'twin', 'swift', 'swift', 'burst', 'roots', 'bark']) applyUpgrade(run, id);
    run.player.hp = run.player.maxHp; run.seedHp = run.seedMaxHp;
    run.enemies = []; run.bolts = []; run.enemyBolts = [];
    startWave(run, rng, 7);
    runSteps(run, rng, Math.floor(10 / STEP));
    return run.screen;
  }
  // cover: the densest action moment in the first 70 s. Two deterministic
  // passes over the same seed: the first finds the step with the most
  // enemies + bolts + particles on screen, the second replays to it, so
  // the cover is a real frame, never a lull between waves.
  const best = findDensestStep(seed);
  const rng2 = makeRandom(seed);
  const fresh2 = createRun(seed);
  for (const key of Object.keys(run)) delete run[key];
  Object.assign(run, fresh2);
  run.rng = rng2;
  beginRun(run, rng2);
  runSteps(run, rng2, best);
  return run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE ? run.screen : SCREEN_PLAY;
}

function findDensestStep(seed) {
  const rng = makeRandom(seed);
  const probe = createRun(seed);
  probe.rng = rng;
  beginRun(probe, rng);
  let bestStep = 0, bestScore = -1;
  const total = Math.floor(70 / STEP);
  for (let s = 0; s < total; s += 60) {
    runSteps(probe, rng, 60);
    if (probe.screen !== SCREEN_PLAY) break;
    const score = probe.enemies.length * 2 + probe.bolts.length + probe.particles.length + probe.enemyBolts.length;
    if (score > bestScore) { bestScore = score; bestStep = s + 60; }
  }
  return bestStep;
}

export { SCREEN_TITLE };
