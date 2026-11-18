// Boot + frame loop for STARWELL — Gravity Forge.
// Fixed-step simulation (1/60 s) apart from rendering; the canvas is scaled
// to the window while the game itself always plays at 1280x720.
import { STEP, VIEW } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { createRun, resetRun, SCREEN_LOSE, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';
import { beginRun, chooseRoad, chooseUpgrade, runAchievements, runRank, stepSimulation } from './simulation.js';
import { makeRandom } from './random.js';
import { renderGame } from './render.js';
import { stageShot } from './shots.js';
import { autopilotInput, idleInput } from './autopilot.js';
import { applyUpgrade, boltDamage, boltsPerShot, chainDamage, fireInterval, wellDamage, wellMaxCharges, wellRadius } from './upgrades.js';
import { loadMeta, recordRun } from './meta.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width; canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = (Date.now() % 100000) | 0;
const run = createRun(shotName ? (shotName === 'boss' ? 777 : shotName === 'cover' ? 42 : 7) : seed);
run.rng = makeRandom(run.seed);
const input = new Input(canvas);
const sound = new SoundBank();
const meta = loadMeta();
run.best = meta.best;
let selectedDifficulty = 'normal';
run.selectedDifficulty = selectedDifficulty;
let accumulator = 0;
let lastTime = performance.now();
let t = 0;

function startGame() {
  resetRun(run, (Date.now() % 100000) | 0);
  run.rng = makeRandom(run.seed);
  run.difficulty = selectedDifficulty;
  run.selectedDifficulty = selectedDifficulty;
  run.best = meta.best;
  beginRun(run, run.rng, meta);
  sound.ensure(); sound.startMusic();
  sound.waveHorn();
}

function goTitle() {
  resetRun(run, (Date.now() % 100000) | 0);
  run.rng = makeRandom(run.seed);
  run.selectedDifficulty = selectedDifficulty;
  run.best = meta.best;
  run.screen = SCREEN_TITLE;
}

canvas.addEventListener('click', () => {
  if (run.screen === SCREEN_TITLE) {
    // Difficulty buttons select only; PLAY (or anywhere else) starts.
    const mx = input.mouseX, my = input.mouseY;
    if (my > 272 && my < 320) {
      const idx = Math.floor((mx - 365) / 190);
      if (idx >= 0 && idx < 3) {
        selectedDifficulty = ['easy', 'normal', 'hard'][idx];
        run.selectedDifficulty = selectedDifficulty;
        sound.click();
        return;
      }
    }
    sound.click(); startGame();
  }
  else if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) { sound.click(); startGame(); }
  else if (run.screen === SCREEN_UPGRADE) {
    // Card picks use the DOM click event, not the per-frame mouseDown
    // poll: a fast click can press and release between two frames, and
    // the poll would never see it.
    const mx = input.mouseX, my = input.mouseY;
    if (my > 180 && my < 380) {
      const idx = Math.floor((mx - 190) / 320);
      if (idx >= 0 && idx < run.upgradeChoices.length) chooseUpgrade(run, run.rng, idx, sound);
    } else if (my > 430 && my < 580) {
      const idx = Math.floor((mx - 190) / 320);
      if (idx >= 0 && idx < run.roadChoices.length) chooseRoad(run, run.rng, idx, sound);
    }
  }
});
canvas.addEventListener('mousedown', () => { if (run.screen === SCREEN_TITLE) return; sound.ensure(); });

function handleKeys() {
  if (input.wasPressed('m')) { run.muted = sound.toggleMute(); }
  if (input.wasPressed('p') && (run.screen === SCREEN_PLAY || run.screen === SCREEN_PAUSE)) {
    run.screen = run.screen === SCREEN_PLAY ? SCREEN_PAUSE : SCREEN_PLAY;
    sound.click();
  }
  if (input.wasPressed('r') && (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE || run.screen === SCREEN_PAUSE)) startGame();
  if (input.wasPressed('t') && (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE || run.screen === SCREEN_PAUSE)) { sound.click(); goTitle(); }
  if (input.wasPressed('enter') && run.screen === SCREEN_TITLE) startGame();
  if (run.screen === SCREEN_UPGRADE) {
    if (input.wasPressed('1')) chooseUpgrade(run, run.rng, 0, sound);
    if (input.wasPressed('2')) chooseUpgrade(run, run.rng, 1, sound);
    if (input.wasPressed('3')) chooseUpgrade(run, run.rng, 2, sound);
    if (input.wasPressed('4')) chooseRoad(run, run.rng, 0, sound);
    if (input.wasPressed('5')) chooseRoad(run, run.rng, 1, sound);
    if (input.wasPressed('6')) chooseRoad(run, run.rng, 2, sound);
  }
  if (run.screen === SCREEN_UPGRADE && input.mouseDown) {
    const mx = input.mouseX, my = input.mouseY;
    if (my > 180 && my < 380) {
      const idx = Math.floor((mx - 190) / 320);
      if (idx >= 0 && idx < run.upgradeChoices.length) chooseUpgrade(run, run.rng, idx, sound);
    } else if (my > 430 && my < 580) {
      const idx = Math.floor((mx - 190) / 320);
      if (idx >= 0 && idx < run.roadChoices.length) chooseRoad(run, run.rng, idx, sound);
    }
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now; t += dt;
  handleKeys();
  // A finished run is recorded once, into the persistent meta (best
  // score, last runs, lifetime totals for the workshop unlocks).
  if ((run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) && !run._recorded) {
    run._recorded = true;
    recordRun(meta, run);
    run.best = meta.best;
  }
  if (run.screen === SCREEN_PLAY) {
    accumulator += dt;
    let guard = 0;
    // One snapshot per frame, and the well-throw edge is consumed by the
    // first step: without this, a frame that catches up two fixed steps
    // throws two wells from one press of E / one right-click.
    const snap = input.snapshot();
    while (accumulator >= STEP && guard < 8) {
      stepSimulation(run, snap, run.rng, sound);
      snap.throwWell = false;
      accumulator -= STEP; guard += 1;
    }
    if (guard >= 8) accumulator = 0;
  }
  renderGame(ctx, run, t);
  const status = document.getElementById('status');
  if (status) status.textContent = `Score ${run.score}, wave ${run.wave}, Hull ${Math.ceil(run.player.hp)}, Star ${Math.ceil(run.starHp)}, ${run.screen}`;
  input.endFrame();
  requestAnimationFrame(frame);
}

// Debug handle for live verification (upgrade tests, auto-play, audits):
// window.__game exposes the run, a step helper, and the derived numbers.
window.__game = {
  run, input, sound,
  start: startGame,
  setDifficulty: (d) => { selectedDifficulty = d; run.selectedDifficulty = d; },
  rank: () => runRank(run),
  achievements: () => runAchievements(run),
  pickUpgrade: (i) => chooseUpgrade(run, run.rng, i, null),
  pickRoad: (i) => chooseRoad(run, run.rng, i, null),
  // Step without auto-picking on the upgrade screen, so a test can
  // observe the between-wave screen itself before choosing.
  stepRaw: (n, mode) => {
    for (let i = 0; i < n; i++) {
      if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) break;
      if (run.screen === SCREEN_PLAY) stepSimulation(run, mode === 'idle' ? idleInput(run) : autopilotInput(run), run.rng, null);
      else break;
    }
    return { screen: run.screen, score: run.score, wave: run.wave, kills: run.kills, hp: run.player.hp, starHp: run.starHp };
  },
  step: (n, mode) => {
    for (let i = 0; i < n; i++) {
      if (run.screen === SCREEN_UPGRADE) { chooseUpgrade(run, run.rng, 0, null); chooseRoad(run, run.rng, 0, null); }
      if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) break;
      if (run.screen === SCREEN_PLAY) stepSimulation(run, mode === 'idle' ? idleInput(run) : autopilotInput(run), run.rng, null);
    }
    return { screen: run.screen, score: run.score, wave: run.wave, kills: run.kills, hp: run.player.hp, starHp: run.starHp };
  },
  applyUpgrade: (id) => applyUpgrade(run, id),
  derived: () => ({ boltDamage: boltDamage(run), boltsPerShot: boltsPerShot(run), fireInterval: fireInterval(run), wellDamage: wellDamage(run), wellRadius: wellRadius(run), wellMaxCharges: wellMaxCharges(run), chainDamage: chainDamage(run), owned: { ...run.upgradesOwned } }),
  autoplay: (maxSeconds) => {
    const steps = Math.floor((maxSeconds || 600) / STEP);
    return window.__game.step(steps, 'auto');
  },
};

if (shotName) {
  stageShot(shotName, run);
  renderGame(ctx, run, 2);
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
