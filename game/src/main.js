// Boot + frame loop for SPOREKEEPER — Bloom Siege.
// Fixed-step simulation (1/60 s) apart from rendering; the canvas is scaled
// to the window while the game itself always plays at 1280x720.
import { STEP, VIEW } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { createRun, resetRun, SCREEN_LOSE, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';
import { beginRun, chooseUpgrade, stepSimulation } from './simulation.js';
import { makeRandom } from './random.js';
import { renderGame } from './render.js';
import { stageShot } from './shots.js';
import { autopilotInput, idleInput } from './autopilot.js';
import { applyUpgrade, boltDamage, boltsPerShot, fireInterval, splashDamage } from './upgrades.js';

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
let accumulator = 0;
let lastTime = performance.now();
let t = 0;

function startGame() {
  resetRun(run, (Date.now() % 100000) | 0);
  run.rng = makeRandom(run.seed);
  beginRun(run, run.rng);
  sound.ensure(); sound.startMusic();
  sound.waveHorn();
}

canvas.addEventListener('click', () => {
  if (run.screen === SCREEN_TITLE) { sound.click(); startGame(); }
  else if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) { sound.click(); startGame(); }
  else if (run.screen === SCREEN_UPGRADE) {
    const rect = canvas.getBoundingClientRect();
    void rect;
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
  if (input.wasPressed('enter') && run.screen === SCREEN_TITLE) startGame();
  if (run.screen === SCREEN_UPGRADE) {
    if (input.wasPressed('1')) chooseUpgrade(run, run.rng, 0, sound);
    if (input.wasPressed('2')) chooseUpgrade(run, run.rng, 1, sound);
    if (input.wasPressed('3')) chooseUpgrade(run, run.rng, 2, sound);
  }
  // Click an upgrade card.
  if (run.screen === SCREEN_UPGRADE && input.mouseDown) {
    const mx = input.mouseX, my = input.mouseY;
    if (my > 240 && my < 480) {
      const idx = Math.floor((mx - 190) / 320);
      if (idx >= 0 && idx < run.upgradeChoices.length) chooseUpgrade(run, run.rng, idx, sound);
    }
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now; t += dt;
  handleKeys();
  if (run.screen === SCREEN_PLAY) {
    accumulator += dt;
    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      stepSimulation(run, input.snapshot(), run.rng, sound);
      accumulator -= STEP; guard += 1;
    }
    if (guard >= 8) accumulator = 0;
  }
  renderGame(ctx, run, t);
  const status = document.getElementById('status');
  if (status) status.textContent = `Score ${run.score}, wave ${run.wave}, Pip HP ${Math.ceil(run.player.hp)}, Heartseed ${Math.ceil(run.seedHp)}, ${run.screen}`;
  input.endFrame();
  requestAnimationFrame(frame);
}

// Debug handle for live verification (upgrade tests, auto-play, audits):
// window.__game exposes the run, a step helper, and the derived numbers.
window.__game = {
  run, input, sound,
  start: startGame,
  step: (n, mode) => {
    for (let i = 0; i < n; i++) {
      if (run.screen === SCREEN_UPGRADE) chooseUpgrade(run, run.rng, 0, null);
      if (run.screen === SCREEN_WIN || run.screen === SCREEN_LOSE) break;
      if (run.screen === SCREEN_PLAY) stepSimulation(run, mode === 'idle' ? idleInput(run) : autopilotInput(run), run.rng, null);
    }
    return { screen: run.screen, score: run.score, wave: run.wave, kills: run.kills, hp: run.player.hp, seedHp: run.seedHp };
  },
  applyUpgrade: (id) => applyUpgrade(run, id),
  derived: () => ({ boltDamage: boltDamage(run), boltsPerShot: boltsPerShot(run), fireInterval: fireInterval(run), splashDamage: splashDamage(run), owned: { ...run.upgradesOwned } }),
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
