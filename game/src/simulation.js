// Simulation: the whole game, fixed 1/60 s steps, apart from rendering.
// Player, bolts, enemies, pickups, waves, boss, win and lose all live here.
// Nothing here touches the canvas or the DOM.
import { ARENA, ENEMY_KINDS, PLAYER, SEED_POS, STEP, TOTAL_WAVES, WAVES } from './config.js';
import { spawnAtEdge, spawnEnemy, updateEnemy } from './enemies.js';
import { applyUpgrade, boltDamage, boltsPerShot, dashCooldown, fireInterval, healOnKill, rollChoices, scoreMultiplier, splashDamage } from './upgrades.js';
import { makeRandom, pickRandom } from './random.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';

export function startWave(run, rng, waveNumber) {
  run.wave = waveNumber;
  run.waveState = 'spawning';
  const def = WAVES[waveNumber - 1];
  run.spawnQueue = [];
  for (let i = 0; i < def.count; i++) run.spawnQueue.push(pickRandom(rng, def.kinds));
  run.spawnTimer = 0.5;
  run.bannerText = waveNumber === TOTAL_WAVES ? 'WAVE 7 — THE ROT KING' : `WAVE ${waveNumber} / ${TOTAL_WAVES}`;
  run.waveBanner = 2.6;
  run.message = ''; run.messageTimer = 0;
  if (waveNumber === TOTAL_WAVES) {
    // Final stand: the Heartseed flares and fully mends Pip and itself,
    // so the boss duel starts fresh instead of inheriting wave-6 attrition.
    run.player.hp = run.player.maxHp;
    run.seedHp = run.seedMaxHp;
  }
  return def;
}

export function beginRun(run, rng) {
  run.screen = SCREEN_PLAY;
  startWave(run, rng, 1);
}

function addFloat(run, x, y, text, colour) {
  run.floats.push({ x, y, text, colour, life: 0.9, max: 0.9 });
}

function burst(run, x, y, colour, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    run.particles.push({ x, y, vx: Math.cos(a) * speed * (0.4 + Math.random() * 0.8), vy: Math.sin(a) * speed * (0.4 + Math.random() * 0.8), life: 0.5 + Math.random() * 0.4, max: 0.9, colour, size: 2 + Math.random() * 3 });
  }
}

function damageEnemy(run, e, dmg, sound) {
  const def = ENEMY_KINDS[e.kind];
  let taken = def.armour ? dmg * (1 - def.armour) : dmg;
  // The Heartseed's thorns bite back: enemies latched onto it take +50%.
  if (Math.hypot(SEED_POS.x - e.x, SEED_POS.y - e.y) < 110) taken *= 1.5;
  e.hp -= taken; e.flash = 1;
  run.stats.damageDealt += taken;
  addFloat(run, e.x, e.y - e.radius - 6, `-${Math.round(taken)}`, '#ffe98a');
  if (sound) sound.hit();
  if (e.hp <= 0) killEnemy(run, e, sound);
}

function killEnemy(run, e, sound) {
  e.dead = true;
  run.kills += 1;
  run.combo += 1; run.comboTimer = 3;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  const mult = 1 + Math.min(run.combo, 20) * 0.05;
  const gained = Math.round(e.score * mult * scoreMultiplier(run));
  run.score += gained;
  addFloat(run, e.x, e.y, `+${gained}`, '#7ee787');
  burst(run, e.x, e.y, e.colour, 14, 160);
  if (healOnKill(run) > 0) run.player.hp = Math.min(run.player.maxHp, run.player.hp + healOnKill(run));
  if (Math.random() < 0.12) {
    run.pickups.push({ x: e.x, y: e.y, kind: Math.random() < 0.5 ? 'heart' : 'nectar', life: 9 });
  }
  if (sound) sound.kill();
  run.shake = Math.max(run.shake, e.kind === 'rotking' ? 14 : 4);
  if (e.kind === 'rotking') {
    run.won = true; run.screen = SCREEN_WIN;
    if (sound) sound.win();
  }
}

function hurtPlayer(run, dmg, sound) {
  const p = run.player;
  if (p.dashTimer > 0 || !p.alive || p.invuln > 0) return;
  p.hp -= dmg; p.hurtFlash = 1; p.invuln = 0.8;
  run.stats.damageTaken += dmg;
  run.combo = 0;
  run.shake = Math.max(run.shake, 7);
  addFloat(run, p.x, p.y - 24, `-${dmg}`, '#ff5a5a');
  burst(run, p.x, p.y, '#ff5a5a', 8, 120);
  if (sound) sound.hurt();
  if (p.hp <= 30 && p.hp > 0) run.stats.closeCalls += 1;
  if (p.hp <= 0) {
    p.hp = 0; p.alive = false;
    run.lost = true; run.loseReason = 'Pip the keeper fell in the dark garden.';
    run.screen = SCREEN_LOSE;
    if (sound) sound.lose();
  }
}

function hurtSeed(run, dmg, sound) {
  // Cap total seed drain at 6 HP/s no matter how many enemies latch on:
  // a swarm must not melt the seed faster than a player can respond.
  const allowed = Math.min(dmg, run.seedDrainBudget);
  run.seedDrainBudget -= allowed;
  run.seedHp -= allowed; run.seedFlash = 1;
  if (Math.random() < 0.08) addFloat(run, SEED_POS.x, SEED_POS.y - 58, `-${Math.round(allowed * 60)} SEED /s`, '#ff5a5a');
  if (sound) sound.seedHurt();
  if (run.seedHp <= 0) {
    run.seedHp = 0;
    run.lost = true; run.loseReason = 'The Heartseed went dark — the garden is lost.';
    run.screen = SCREEN_LOSE;
    if (sound) sound.lose();
  }
}

// One fixed step. `input` is a snapshot (see input.js); `rng` is the run's
// seeded generator; `sound` may be null in headless tests.
export function stepSimulation(run, input, rng, sound) {
  if (run.screen !== SCREEN_PLAY) return;
  const dt = STEP;
  run.time += dt;
  const p = run.player;
  p.hurtFlash = Math.max(0, p.hurtFlash - dt * 4);
  p.invuln = Math.max(0, p.invuln - dt);
  run.seedFlash = Math.max(0, run.seedFlash - dt * 4);
  run.seedDrainBudget = Math.min(6, run.seedDrainBudget + 6 * dt);
  run.waveBanner = Math.max(0, run.waveBanner - dt);
  run.messageTimer = Math.max(0, run.messageTimer - dt);
  run.shake = Math.max(0, run.shake - dt * 22);
  if (run.comboTimer > 0) { run.comboTimer -= dt; if (run.comboTimer <= 0) run.combo = 0; }

  // --- Player movement + dash ---
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  if (input.dash && p.dashCooldown <= 0 && (input.moveX !== 0 || input.moveY !== 0)) {
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = dashCooldown(run);
    p.dashX = input.moveX; p.dashY = input.moveY;
    run.stats.dashes += 1;
    run.trails.push({ x: p.x, y: p.y, life: 0.4 });
    if (sound) sound.dash();
  }
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
    if (Math.random() < 0.6) run.trails.push({ x: p.x, y: p.y, life: 0.35 });
  } else {
    p.x += input.moveX * PLAYER.speed * dt;
    p.y += input.moveY * PLAYER.speed * dt;
  }
  p.x = Math.max(ARENA.x + p.radius, Math.min(ARENA.x + ARENA.width - p.radius, p.x));
  p.y = Math.max(ARENA.y + p.radius, Math.min(ARENA.y + ARENA.height - p.radius, p.y));
  p.aimX = input.aimX; p.aimY = input.aimY;

  // --- Shooting ---
  p.fireTimer -= dt;
  if (input.firing && p.fireTimer <= 0 && p.alive) {
    p.fireTimer = fireInterval(run);
    run.stats.shotsFired += 1;
    const n = boltsPerShot(run);
    const base = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.14;
      run.bolts.push({ x: p.x, y: p.y, vx: Math.cos(base + off) * PLAYER.boltSpeed, vy: Math.sin(base + off) * PLAYER.boltSpeed, radius: PLAYER.boltRadius, damage: boltDamage(run), life: 1.1 });
    }
    if (sound) sound.shoot();
  }

  // --- Wave spawning ---
  if (run.waveState === 'spawning') {
    run.spawnTimer -= dt;
    if (run.spawnTimer <= 0 && run.spawnQueue.length > 0) {
      const def = WAVES[run.wave - 1];
      spawnAtEdge(run, rng, run.spawnQueue.shift());
      if (run.wave === TOTAL_WAVES && run.spawnQueue.length === 0) {
        // Boss escorts trickle in behind it.
        for (let i = 0; i < 4; i++) run.spawnQueue.push(pickRandom(rng, def.escorts));
      }
      run.spawnTimer = def.gap;
    }
    if (run.spawnQueue.length === 0) run.waveState = 'fighting';
  }

  // --- Enemies ---
  for (const e of run.enemies) updateEnemy(run, e, dt, rng);
  for (const e of run.enemies) {
    if (e.dead) continue;
    // Touching the Heartseed hurts it; aphids drain faster.
    const dSeed = Math.hypot(SEED_POS.x - e.x, SEED_POS.y - e.y);
    if (dSeed < 46 + e.radius) {
      hurtSeed(run, e.kind === 'aphid' ? e.damage * dt * 0.45 : e.damage * dt * 0.22, null);
      // The Heartseed's own thorns: a latched enemy takes 8 damage/s, so
      // a swarm left alone still dies — it just takes a while, and the
      // player who defends actively clears it far faster.
      e.hp -= 8 * dt;
      if (Math.random() < dt * 2) burst(run, e.x, e.y, '#7ee787', 2, 60);
      if (e.hp <= 0 && !e.dead) killEnemy(run, e, null);
      e.x += (e.x - SEED_POS.x) / (dSeed || 1) * 30 * dt;
    }
    const dP = Math.hypot(p.x - e.x, p.y - e.y);
    if (dP < p.radius + e.radius && p.alive) {
      hurtPlayer(run, e.damage, sound);
      e.x += (e.x - p.x) / (dP || 1) * 40 * dt;
      e.y += (e.y - p.y) / (dP || 1) * 40 * dt;
    }
    // Slug trails damage the player standing in them.
    if (e.kind === 'slug' && Math.random() < dt * 6) {
      run.trails.push({ x: e.x, y: e.y, life: 1.2, slime: true });
    }
  }
  run.enemies = run.enemies.filter((e) => !e.dead);

  // --- Player bolts vs enemies ---
  for (const b of run.bolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
        damageEnemy(run, e, b.damage, sound);
        const splash = splashDamage(run);
        if (splash > 0) {
          burst(run, b.x, b.y, '#ffd23e', 8, 140);
          for (const o of run.enemies) {
            if (o !== e && !o.dead && Math.hypot(o.x - b.x, o.y - b.y) < 70) damageEnemy(run, o, splash * 0.4, null);
          }
        }
        b.life = 0; break;
      }
    }
  }
  run.bolts = run.bolts.filter((b) => b.life > 0 && b.x > ARENA.x - 20 && b.x < ARENA.x + ARENA.width + 20 && b.y > ARENA.y - 20 && b.y < ARENA.y + ARENA.height + 20);

  // --- Enemy bolts vs player ---
  for (const b of run.enemyBolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (p.alive && Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius) {
      hurtPlayer(run, b.damage, sound); b.life = 0;
    }
  }
  run.enemyBolts = run.enemyBolts.filter((b) => b.life > 0);

  // --- Pickups ---
  for (const pk of run.pickups) {
    pk.life -= dt;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < PLAYER.pickupRadius + 10) {
      if (pk.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 18); addFloat(run, p.x, p.y - 24, '+18 HP', '#7ee787'); }
      else { run.score += 25; addFloat(run, p.x, p.y - 24, '+25', '#ffd23e'); }
      pk.life = 0; if (sound) sound.pickup();
    }
  }
  run.pickups = run.pickups.filter((pk) => pk.life > 0);

  // --- Slime trails hurt the player ---
  for (const t of run.trails) {
    t.life -= dt;
    if (t.slime && p.alive && Math.hypot(p.x - t.x, p.y - t.y) < 18) hurtPlayer(run, 6, null);
  }
  run.trails = run.trails.filter((t) => t.life > 0);

  // --- Particles + floats ---
  for (const pt of run.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  run.particles = run.particles.filter((pt) => pt.life > 0);
  for (const f of run.floats) { f.y -= 34 * dt; f.life -= dt; }
  run.floats = run.floats.filter((f) => f.life > 0);

  // --- Wave cleared? ---
  if (run.waveState === 'fighting' && run.enemies.length === 0 && !run.won && !run.lost) {
    if (run.wave >= TOTAL_WAVES) return; // boss death already set WIN
    run.waveState = 'done';
    run.score += 100 * run.wave;
    // Breather between waves: the garden mends Pip and the Heartseed.
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 40);
    run.seedHp = Math.min(run.seedMaxHp, run.seedHp + 40);
    run.upgradeChoices = rollChoices(run, rng);
    run.screen = SCREEN_UPGRADE;
    if (sound) sound.upgrade();
  }
}

// Called from the upgrade screen when the player picks choice `index`.
export function chooseUpgrade(run, rng, index, sound) {
  const choice = run.upgradeChoices[index];
  if (!choice) return false;
  if (!applyUpgrade(run, choice.id)) return false;
  run.message = `${choice.name} — ${choice.desc}`;
  run.messageTimer = 3;
  run.upgradeChoices = [];
  if (run.wave >= TOTAL_WAVES) { run.screen = SCREEN_WIN; return true; }
  startWave(run, rng, run.wave + 1);
  run.screen = SCREEN_PLAY;
  if (sound) { sound.upgrade(); sound.waveHorn(); }
  return true;
}

export { makeRandom };
