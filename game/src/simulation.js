// Simulation: the whole game, fixed 1/60 s steps, apart from rendering.
// Player, bolts, gravity wells, enemies, pickups, waves, bosses, win/lose.
import { ARENA, DIFFICULTIES, ENEMY_KINDS, PLAYER, RELICS, ROUTES, STAR_POS, STEP, TOTAL_WAVES, UNLOCKS, UPGRADES, WAVE_NAMES, WAVES } from './config.js';
import { spawnAtEdge, spawnCluster, spawnEnemy, updateEnemy } from './enemies.js';
import { applyUpgrade, boltDamage, boltsPerShot, chainDamage, chainRadius, comboWindow, damageTakenMult, dashCooldown, fireInterval, hullRegen, ownedCount, playerSpeed, relicCount, rollChoices, scoreMultiplier, shardGain, starBurn, starDrainMult, starSiphonHeal, wellDamage, wellDuration, wellKillBonus, wellMaxCharges, wellPull, wellRadius, wellRechargeTime } from './upgrades.js';
import { makeRandom, pickRandom } from './random.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_WIN } from './state.js';

export function startWave(run, rng, waveNumber) {
  run.wave = waveNumber;
  run.realm = waveNumber >= 5 ? 2 : 1;
  run.waveState = 'spawning';
  run.escortsAdded = false;
  run.spawnCount = 0;
  run.escortTimer = 6;
  const def = WAVES[waveNumber - 1];
  run.spawnQueue = [];
  const count = Math.round(def.count * (run.nextWave ? run.nextWave.countMult : 1));
  for (let i = 0; i < count; i++) run.spawnQueue.push(pickRandom(rng, def.kinds));
  run.spawnTimer = 0.4;
  run.bannerText = WAVE_NAMES[waveNumber - 1];
  run.waveBanner = 2.6;
  run.message = ''; run.messageTimer = 0;
  if (waveNumber === 5) {
    run.message = 'ENTERING THE EMBER DEEP — FOES FASTER, WELLS HOTTER';
    run.messageTimer = 3.5;
  }
  if (waveNumber === 4 || waveNumber === 7) {
    run.player.hp = run.player.maxHp;
    run.starHp = run.starMaxHp;
  }
  return def;
}

export function beginRun(run, rng, meta) {
  // Difficulty sets the hull; permanent unlocks (from past runs) stack on top.
  const d = DIFFICULTIES[run.difficulty || 'normal'];
  run.player.maxHp = d.playerHp; run.player.hp = d.playerHp;
  if (meta) {
    if (UNLOCKS[0].check(meta)) { run.player.maxHp += 10; run.player.hp += 10; }
    if (UNLOCKS[1].check(meta)) run.wellCharges = wellMaxCharges(run) + 1;
    if (UNLOCKS[2].check(meta)) {
      const pool = UPGRADES.filter((u) => ownedCount(run, u.id) < u.max);
      if (pool.length) applyUpgrade(run, pool[Math.floor(rng() * pool.length)].id);
    }
    if (UNLOCKS[3].check(meta)) { run.starMaxHp += 20; run.starHp += 20; }
  }
  run.screen = SCREEN_PLAY;
  startWave(run, rng, 1);
}

// Roll the three road cards for the between-wave screen: every route kind,
// each carrying a different relic from the pool of six.
export function rollRoads(run, rng) {
  const relics = [...RELICS];
  run.roadChoices = ROUTES.map((route) => {
    const relic = relics.splice(Math.floor(rng() * relics.length), 1)[0];
    return { route, relic };
  });
  run.roadPicked = null;
  run.upgradePicked = null;
}

function addFloat(run, x, y, text, colour) {
  // Merge first: several bolts landing on the same target in the same
  // frame used to pile "-23 -23 -80" on one pixel, and a well-cluster
  // piled "+400 +380" the same way. Numbers of the same sign and colour
  // near each other now add up into one number that reads.
  if (text.startsWith('-') || text.startsWith('+')) {
    const sign = text[0];
    const n = parseInt(text.slice(1), 10);
    if (!Number.isNaN(n)) {
      for (const f of run.floats) {
        if (f.text.startsWith(sign) && f.colour === colour && Math.abs(f.x - x) < 40 && Math.abs(f.y - y) < 40) {
          const merged = parseInt(f.text.slice(1), 10) + n;
          f.text = `${sign}${merged}`;
          f.life = f.max;
          return;
        }
      }
    }
    if (sign === '-') {
      let dmgCount = 0;
      for (const f of run.floats) if (f.text.startsWith('-')) dmgCount += 1;
      if (dmgCount >= 10) return;
    }
  }
  // Jitter so the numbers that do show fan out instead of stacking.
  run.floats.push({ x: x + (run.rng() - 0.5) * 56, y: y + (run.rng() - 0.5) * 22, text, colour, life: 0.9, max: 0.9 });
}
function burst(run, x, y, colour, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = run.rng() * Math.PI * 2;
    run.particles.push({ x, y, vx: Math.cos(a) * speed * (0.4 + run.rng() * 0.8), vy: Math.sin(a) * speed * (0.4 + run.rng() * 0.8), life: 0.5 + run.rng() * 0.4, max: 0.9, colour, size: 2 + run.rng() * 4 });
  }
}
function ring(run, x, y, colour, maxR) {
  run.rings.push({ x, y, colour, r: 12, maxR, life: 0.5, max: 0.5 });
}

function damageEnemy(run, e, dmg, sound, fromWell) {
  const def = ENEMY_KINDS[e.kind];
  // Bolt armour: Hex Crabs shrug off plasma (10% damage). A well
  // detonation, chain nova or the star's corona do full damage — the well
  // is the answer to armour, not the gun.
  let taken = (!fromWell && def.boltArmour) ? dmg * (1 - def.boltArmour) : dmg;
  e.hp -= taken; e.flash = 1;
  run.stats.damageDealt += taken;
  if (!fromWell && def.boltArmour && run.rng() < 0.3) {
    addFloat(run, e.x, e.y - e.radius - 6, 'CLINK', '#c9c9d8');
  } else {
    addFloat(run, e.x, e.y - e.radius - 6, `-${Math.round(taken)}`, fromWell ? '#00e5ff' : '#ffe98a');
  }
  if (sound) sound.hit();
  if (e.hp <= 0) killEnemy(run, e, sound, fromWell);
}

function killEnemy(run, e, sound, fromWell) {
  if (e.dead) return;
  e.dead = true;
  run.kills += 1;
  if (fromWell) {
    run.stats.wellKills += 1;
    if (e.kind === 'crab') run.crabWellKills += 1;
  }
  run.combo += 1; run.comboTimer = comboWindow(run);
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  // A big combo gets a big callout, every 5 chain.
  if (run.combo > 0 && run.combo % 5 === 0) {
    run.comboCallout = `CHAIN x${run.combo}!`;
    run.comboCalloutTimer = 1.4;
  }
  const mult = 1 + Math.min(run.combo, 20) * 0.05;
  // Salvage: a well kill pays its bonus on top of the normal score.
  const gained = Math.round(e.score * mult * scoreMultiplier(run)) + (fromWell ? wellKillBonus(run) : 0);
  run.score += gained;
  addFloat(run, e.x, e.y, `+${gained}`, '#3dff9e');
  burst(run, e.x, e.y, e.colour, 16, 180);
  ring(run, e.x, e.y, e.colour, 60);
  if (e.splits) {
    spawnEnemy(run, 'shard', e.x - 18, e.y);
    spawnEnemy(run, 'shard', e.x + 18, e.y);
  }
  const chain = chainDamage(run);
  if (fromWell && chain > 0) {
    for (const o of run.enemies) {
      if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < chainRadius(run)) damageEnemy(run, o, chain, null, true);
    }
  }
  if (run.rng() < 0.12) {
    run.pickups.push({ x: e.x, y: e.y, kind: run.rng() < 0.5 ? 'heart' : 'starshard', life: 9 });
  }
  if (sound) sound.kill();
  run.shake = Math.max(run.shake, e.kind === 'hollowsun' || e.kind === 'voidmaw' ? 14 : 4);
  if (e.kind === 'voidmaw' || e.kind === 'hollowsun') {
    run.boss = null;
    if (e.kind === 'hollowsun') {
      run.won = true; run.screen = SCREEN_WIN;
      if (sound) sound.win();
    } else {
      // The midpoint: VOIDMAW's death is the halfway mark, and the star
      // flares to mark it — the run now has a middle, not just a grind.
      run.message = 'VOIDMAW SHATTERED — THE STAR HOLDS: 3 WAVES REMAIN';
      run.messageTimer = 3.5;
      run.starFlare = 1;
    }
  }
}

function hurtPlayer(run, dmg, sound) {
  const p = run.player;
  if (p.dashTimer > 0 || !p.alive || p.invuln > 0) return;
  // Bulwark blunts the hit — never below 1, a hit is still a hit.
  const taken = Math.max(1, Math.round(dmg * damageTakenMult(run)));
  p.hp -= taken; p.hurtFlash = 1; p.invuln = 0.8;
  run.stats.damageTaken += taken;
  run.combo = 0;
  run.shake = Math.max(run.shake, 7);
  addFloat(run, p.x, p.y - 24, `-${taken}`, '#ff3b5c');
  burst(run, p.x, p.y, '#ff3b5c', 8, 120);
  if (sound) sound.hurt();
  if (p.hp <= 30 && p.hp > 0) run.stats.closeCalls += 1;
  if (p.hp <= 0) {
    p.hp = 0; p.alive = false;
    run.lost = true; run.loseReason = 'Nova the skiff was torn apart in the dark.';
    run.screen = SCREEN_LOSE;
    if (sound) sound.lose();
  }
}

function hurtStar(run, dmg, sound) {
  // Starward slows the drain: the incoming bleed is reduced before the
  // per-second budget caps it, so the star loses less each second.
  const allowed = Math.min(dmg * starDrainMult(run), run.starDrainBudget);
  run.starDrainBudget -= allowed;
  run.starHp -= allowed; run.starFlash = 1;
  // No floating "-N STAR /s" text: it drifted up into the star's HP bar.
  // The star's flash + HP bar already show the drain.
  if (sound) sound.starHurt();
  if (run.starHp <= 0) {
    run.starHp = 0;
    run.lost = true; run.loseReason = 'The newborn star went dark — the forge is lost.';
    run.screen = SCREEN_LOSE;
    if (sound) sound.lose();
  }
}

function detonateWell(run, w, sound) {
  const dmg = wellDamage(run);
  const r = wellRadius(run);
  ring(run, w.x, w.y, '#00e5ff', r + 40);
  ring(run, w.x, w.y, '#fff6d8', r);
  burst(run, w.x, w.y, '#00e5ff', 26, 260);
  burst(run, w.x, w.y, '#ffd23e', 16, 200);
  run.shake = Math.max(run.shake, 9);
  if (sound) sound.wellBoom();
  const first = [...run.enemies];
  for (const e of first) {
    if (!e.dead && Math.hypot(e.x - w.x, e.y - w.y) < r + e.radius) damageEnemy(run, e, dmg, sound, true);
  }
  // Second pass: a Splitter killed by the blast drops two shards at its
  // position — inside the well — and the same detonation catches them.
  // That is what makes the well, not the gun, the answer to splitters.
  for (const e of run.enemies) {
    if (!first.includes(e) && !e.dead && Math.hypot(e.x - w.x, e.y - w.y) < r + e.radius) damageEnemy(run, e, dmg, sound, true);
  }
  // Star Siphon: every detonation feeds a little of the blast back into
  // the star — the well that saves the star also mends it.
  const siphon = starSiphonHeal(run);
  if (siphon > 0) {
    run.starHp = Math.min(run.starMaxHp, run.starHp + siphon);
    addFloat(run, STAR_POS.x, STAR_POS.y - 44, `+${siphon}`, '#3dff9e');
  }
  // A blast close to the star makes the star flare — bright, big, and
  // unmistakably the thing the whole fight is about.
  if (Math.hypot(w.x - STAR_POS.x, w.y - STAR_POS.y) < 320) run.starFlare = 1;
}

// One fixed step. `input` is a snapshot; `rng` is the run's seeded generator.
export function stepSimulation(run, input, rng, sound) {
  if (run.screen !== SCREEN_PLAY) return;
  // The run's seeded generator is the ONLY source of randomness in the
  // simulation, so a probe pass and its replay land on the same frame.
  if (!run.rng) run.rng = makeRandom(run.seed);
  const dt = STEP;
  run.time += dt;
  const p = run.player;
  p.hurtFlash = Math.max(0, p.hurtFlash - dt * 4);
  p.invuln = Math.max(0, p.invuln - dt);
  // Nanoweave: the hull knits itself back together while you fly.
  if (p.alive && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + hullRegen(run) * dt);
  run.starFlash = Math.max(0, run.starFlash - dt * 4);
  run.starDrainBudget = Math.min(6, run.starDrainBudget + 6 * dt);
  run.waveBanner = Math.max(0, run.waveBanner - dt);
  run.starFlare = Math.max(0, (run.starFlare || 0) - dt * 0.4);
  run.messageTimer = Math.max(0, run.messageTimer - dt);
  run.comboCalloutTimer = Math.max(0, (run.comboCalloutTimer || 0) - dt);
  run.minStarHp = Math.min(run.minStarHp, run.starHp);
  run.shake = Math.max(0, run.shake - dt * 22);
  if (run.comboTimer > 0) { run.comboTimer -= dt; if (run.comboTimer <= 0) run.combo = 0; }

  // Well recharge.
  if (run.wellCharges < wellMaxCharges(run)) {
    run.wellRecharge -= dt;
    if (run.wellRecharge <= 0) { run.wellCharges += 1; run.wellRecharge = wellRechargeTime(run); }
  } else run.wellRecharge = wellRechargeTime(run);

  // Movement + dash.
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  if (input.dash && p.dashCooldown <= 0 && (input.moveX !== 0 || input.moveY !== 0)) {
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = dashCooldown(run);
    p.dashX = input.moveX; p.dashY = input.moveY;
    run.stats.dashes += 1;
    if (sound) sound.dash();
  }
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
  } else {
    p.x += input.moveX * playerSpeed(run) * dt;
    p.y += input.moveY * playerSpeed(run) * dt;
  }
  p.x = Math.max(ARENA.x + p.radius, Math.min(ARENA.x + ARENA.width - p.radius, p.x));
  p.y = Math.max(ARENA.y + p.radius, Math.min(ARENA.y + ARENA.height - p.radius, p.y));
  p.aimX = input.aimX; p.aimY = input.aimY;

  // Throw a gravity well at the cursor.
  if (input.throwWell && run.wellCharges > 0) {
    const wx = Math.max(ARENA.x + 20, Math.min(ARENA.x + ARENA.width - 20, input.aimX));
    const wy = Math.max(ARENA.y + 20, Math.min(ARENA.y + ARENA.height - 20, input.aimY));
    const dur = wellDuration(run);
    run.wells.push({ x: wx, y: wy, radius: wellRadius(run), pull: wellPull(run), timer: dur, max: dur });
    run.wellCharges -= 1;
    run.stats.wellsThrown += 1;
    ring(run, wx, wy, '#00e5ff', 90);
    if (sound) sound.wellThrow();
  }

  // Wells age and detonate.
  for (const w of run.wells) { w.timer -= dt; if (w.timer <= 0) detonateWell(run, w, sound); }
  run.wells = run.wells.filter((w) => w.timer > 0);

  // Shooting.
  p.fireTimer -= dt;
  if (input.firing && p.fireTimer <= 0 && p.alive) {
    p.fireTimer = fireInterval(run);
    run.stats.shotsFired += 1;
    const n = boltsPerShot(run);
    const base = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.15;
      run.bolts.push({ x: p.x, y: p.y, vx: Math.cos(base + off) * PLAYER.boltSpeed, vy: Math.sin(base + off) * PLAYER.boltSpeed, radius: PLAYER.boltRadius, damage: boltDamage(run), life: 1.1 });
    }
    if (sound) sound.shoot();
  }

  // Wave spawning: two at a time on swarm waves, so the arena stays dense.
  if (run.waveState === 'spawning') {
    run.spawnTimer -= dt;
    if (run.spawnTimer <= 0 && run.spawnQueue.length > 0) {
      const def = WAVES[run.wave - 1];
      run.spawnCount += 1;
      // Cluster waves: every third spawn event drops up to three of one
      // kind at one edge point — a tight pack a gravity well is built to
      // punish. Same-kind extras are pulled out of the queue, so the
      // wave's total count and kind mix are preserved.
      if (def.cluster && run.spawnCount % 3 === 0) {
        const kind = run.spawnQueue.shift();
        let n = 1;
        for (let i = run.spawnQueue.length - 1; i >= 0 && n < 3; i--) {
          if (run.spawnQueue[i] === kind) { run.spawnQueue.splice(i, 1); n += 1; }
        }
        spawnCluster(run, rng, kind, n);
      } else {
        const burstN = 2; // boss waves too: escorts arrive as a real cluster
        for (let i = 0; i < burstN && run.spawnQueue.length > 0; i++) spawnAtEdge(run, rng, run.spawnQueue.shift());
      }
      if ((run.wave === 4 || run.wave === 7) && run.spawnQueue.length === 0 && !run.escortsAdded) {
        run.escortsAdded = true;
        for (let i = 0; i < 10; i++) run.spawnQueue.push(pickRandom(rng, def.escorts));
      }
      run.spawnTimer = def.gap;
    }
    if (run.spawnQueue.length === 0) run.waveState = 'fighting';
  }

  // Boss waves keep trickling escorts while the boss lives, so the boss
  // fight stays busy instead of emptying out once the first escorts die.
  if ((run.wave === 4 || run.wave === 7) && run.boss && run.waveState === 'fighting') {
    run.escortTimer -= dt;
    if (run.escortTimer <= 0 && run.enemies.length < 12) {
      const def = WAVES[run.wave - 1];
      for (let i = 0; i < 3; i++) spawnAtEdge(run, rng, pickRandom(rng, def.escorts));
      run.escortTimer = 4;
    }
  }

  // Enemies.
  for (const e of run.enemies) updateEnemy(run, e, dt, rng);
  for (const e of run.enemies) {
    if (e.dead) continue;
    const dStar = Math.hypot(STAR_POS.x - e.x, STAR_POS.y - e.y);
    if (dStar < 52 + e.radius) {
      hurtStar(run, e.kind === 'leech' ? e.damage * dt * 0.5 : e.damage * dt * 0.24, null);
      e.hp -= starBurn(run) * dt; // the star's own corona burns anything latched on
      if (e.hp <= 0 && !e.dead) killEnemy(run, e, null, false);
      e.x += (e.x - STAR_POS.x) / (dStar || 1) * 30 * dt;
    }
    const dP = Math.hypot(p.x - e.x, p.y - e.y);
    if (dP < p.radius + e.radius && p.alive) {
      hurtPlayer(run, e.damage, sound);
      e.x += (e.x - p.x) / (dP || 1) * 40 * dt;
      e.y += (e.y - p.y) / (dP || 1) * 40 * dt;
    }
  }
  run.enemies = run.enemies.filter((e) => !e.dead);

  // Player bolts vs enemies.
  for (const b of run.bolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
        damageEnemy(run, e, b.damage, sound, false);
        b.life = 0; break;
      }
    }
  }
  run.bolts = run.bolts.filter((b) => b.life > 0 && b.x > ARENA.x - 20 && b.x < ARENA.x + ARENA.width + 20 && b.y > ARENA.y - 20 && b.y < ARENA.y + ARENA.height + 20);

  // Enemy bolts vs player.
  for (const b of run.enemyBolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (p.alive && Math.hypot(p.x - b.x, p.y - b.y) < p.radius + b.radius) {
      hurtPlayer(run, b.damage, sound); b.life = 0;
    }
  }
  run.enemyBolts = run.enemyBolts.filter((b) => b.life > 0);

  // Pickups. The Magnet Coil relic pulls them toward the skiff.
  for (const pk of run.pickups) {
    pk.life -= dt;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (relicCount(run, 'magnet') > 0 && d < 220 && d > 1) {
      pk.x += (p.x - pk.x) / d * 120 * dt;
      pk.y += (p.y - pk.y) / d * 120 * dt;
    }
    if (d < PLAYER.pickupRadius + 10) {
      if (pk.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 18); addFloat(run, p.x, p.y - 24, '+18 HP', '#3dff9e'); }
      else { const sg = shardGain(run); run.score += 25; run.shards += sg; addFloat(run, p.x, p.y - 24, `+25  ◆+${sg}`, '#ffd23e'); }
      pk.life = 0; if (sound) sound.pickup();
    }
  }
  run.pickups = run.pickups.filter((pk) => pk.life > 0);

  // Particles, floats, rings.
  for (const pt of run.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.98; pt.vy *= 0.98; pt.life -= dt; }
  run.particles = run.particles.filter((pt) => pt.life > 0);
  for (const f of run.floats) { f.y -= 36 * dt; f.life -= dt; }
  run.floats = run.floats.filter((f) => f.life > 0);
  for (const r of run.rings) { r.r += (r.maxR - r.r) * dt * 6; r.life -= dt; }
  run.rings = run.rings.filter((r) => r.life > 0);

  // Wave cleared?
  if (run.waveState === 'fighting' && run.enemies.length === 0 && !run.won && !run.lost) {
    if (run.wave >= TOTAL_WAVES) return;
    run.waveState = 'done';
    run.score += 100 * run.wave;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 40);
    run.starHp = Math.min(run.starMaxHp, run.starHp + 40);
    run.wellCharges = wellMaxCharges(run);
    run.upgradeChoices = rollChoices(run, rng);
    rollRoads(run, rng);
    run.screen = SCREEN_UPGRADE;
    if (sound) sound.upgrade();
  }
}

// The between-wave screen needs TWO picks before the run moves on: one
// upgrade and one road. Each pick is applied the moment it is made; the
// next wave starts only once both are chosen.
export function chooseUpgrade(run, rng, index, sound) {
  if (run.upgradePicked !== null) return false;
  const choice = run.upgradeChoices[index];
  if (!choice) return false;
  if (!applyUpgrade(run, choice.id)) return false;
  run.upgradePicked = index;
  run.message = `${choice.name} — ${choice.desc}`;
  run.messageTimer = 3;
  if (sound) sound.upgrade();
  return maybeAdvance(run, rng, sound);
}

export function chooseRoad(run, rng, index, sound) {
  if (run.roadPicked !== null) return false;
  const pick = run.roadChoices[index];
  if (!pick) return false;
  run.roadPicked = index;
  const { route, relic } = pick;
  run.nextWave = { countMult: route.countMult, scoreMult: route.scoreMult, wellBonus: route.wellBonus, speedMult: route.speedMult };
  if (route.starHeal) run.starHp = Math.min(run.starMaxHp, run.starHp + route.starHeal);
  run.relics[relic.id] = (run.relics[relic.id] || 0) + 1;
  if (relic.id === 'iron') { run.player.maxHp += 20; run.player.hp = Math.min(run.player.maxHp, run.player.hp + 20); }
  run.message = `${route.name} — relic found: ${relic.name}`;
  run.messageTimer = 3;
  if (sound) sound.upgrade();
  return maybeAdvance(run, rng, sound);
}

function maybeAdvance(run, rng, sound) {
  if (run.upgradePicked === null || run.roadPicked === null) return false;
  run.upgradeChoices = [];
  run.roadChoices = [];
  if (run.wave >= TOTAL_WAVES) { run.screen = SCREEN_WIN; return true; }
  startWave(run, rng, run.wave + 1);
  run.screen = SCREEN_PLAY;
  if (sound) sound.waveHorn();
  return true;
}

// Rank and achievements, computed from the finished run.
export function runRank(run) {
  if (run.score >= 12000) return 'S';
  if (run.score >= 10500) return 'A';
  if (run.score >= 9000) return 'B';
  return 'C';
}

export function runAchievements(run) {
  const distinct = Object.keys(run.upgradesOwned).length;
  return [
    { name: 'FIRST LIGHT', desc: 'Clear wave 1', done: run.wave >= 2 || run.won },
    { name: 'WELL MASTER', desc: '100+ well kills in one run', done: run.stats.wellKills >= 100 },
    { name: 'CRAB BREAKER', desc: '10+ crabs killed by wells', done: run.crabWellKills >= 10 },
    { name: 'FULL FORGE', desc: 'Own 6 different upgrades', done: distinct >= 6 },
    { name: 'STAR KEEPER', desc: 'Star never fell below half', done: run.minStarHp >= run.starMaxHp / 2 },
    { name: 'COMBO KING', desc: 'Best combo x20 or more', done: run.bestCombo >= 20 },
  ];
}

export { makeRandom };
