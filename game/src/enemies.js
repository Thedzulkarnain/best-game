// Enemies: spawning at the arena edge and one update per kind.
// Behaviours are visibly different: chasers, drainers, hunters, chargers,
// spitters and the three-phase boss — never a standing-still target.
import { ARENA, ENEMY_KINDS, SEED_POS } from './config.js';
import { pickRandom, rangeRandom } from './random.js';

let nextId = 1;

export function spawnEnemy(run, rng, kindId, x, y) {
  const def = ENEMY_KINDS[kindId];
  // The boss is already the final wall: it does not take the wave HP scale.
  const hpScale = kindId === 'rotking' ? 1 : 1 + (run.wave - 1) * 0.09;
  const enemy = {
    id: nextId++, kind: kindId, x, y,
    hp: Math.round(def.hp * hpScale), maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * rangeRandom(rng, 0.9, 1.1),
    radius: def.radius, damage: def.damage, score: def.score,
    colour: def.colour, behaviour: def.behaviour, shootTimer: def.shoot || 0,
    flash: 0, wobble: rng() * Math.PI * 2, chargeTimer: 0, charging: false,
    chargeX: 0, chargeY: 0, phase: 0, spawnTimer: 0,
  };
  run.enemies.push(enemy);
  return enemy;
}

export function spawnAtEdge(run, rng, kindId) {
  const side = Math.floor(rng() * 4);
  let x, y;
  if (side === 0) { x = rangeRandom(rng, ARENA.x, ARENA.x + ARENA.width); y = ARENA.y + 8; }
  else if (side === 1) { x = rangeRandom(rng, ARENA.x, ARENA.x + ARENA.width); y = ARENA.y + ARENA.height - 8; }
  else if (side === 2) { x = ARENA.x + 8; y = rangeRandom(rng, ARENA.y, ARENA.y + ARENA.height); }
  else { x = ARENA.x + ARENA.width - 8; y = rangeRandom(rng, ARENA.y, ARENA.y + ARENA.height); }
  return spawnEnemy(run, rng, kindId, x, y);
}

function moveToward(e, tx, ty, dt, speed) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  e.x += (dx / d) * speed * dt; e.y += (dy / d) * speed * dt;
}

export function updateEnemy(run, e, dt, rng) {
  e.flash = Math.max(0, e.flash - dt * 6);
  e.wobble += dt * 3;
  const p = run.player;
  const distPlayer = Math.hypot(p.x - e.x, p.y - e.y);
  const distSeed = Math.hypot(SEED_POS.x - e.x, SEED_POS.y - e.y);
  switch (e.behaviour) {
    case 'chaseSeed':
      moveToward(e, SEED_POS.x, SEED_POS.y, dt, e.speed);
      break;
    case 'drainSeed': {
      if (distSeed < SEED_POS.x * 0 + 70) { /* latched on, handled in sim */ }
      moveToward(e, SEED_POS.x, SEED_POS.y, dt, e.speed);
      break;
    }
    case 'huntPlayer':
      e.x += Math.sin(e.wobble * 1.7) * 40 * dt;
      moveToward(e, p.x, p.y, dt, e.speed);
      break;
    case 'chargePlayer': {
      e.chargeTimer -= dt;
      if (!e.charging && distPlayer < 260 && e.chargeTimer <= 0) {
        e.charging = true; e.chargeX = p.x; e.chargeY = p.y;
      }
      if (e.charging) {
        moveToward(e, e.chargeX, e.chargeY, dt, e.speed * 2.6);
        if (Math.hypot(e.chargeX - e.x, e.chargeY - e.y) < 18) { e.charging = false; e.chargeTimer = 1.6; }
      } else moveToward(e, SEED_POS.x, SEED_POS.y, dt, e.speed);
      break;
    }
    case 'spitter': {
      if (distPlayer < 320) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = ENEMY_KINDS.leech.shoot;
          const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
          run.enemyBolts.push({ x: e.x, y: e.y, vx: (p.x - e.x) / d * 210, vy: (p.y - e.y) / d * 210, radius: 7, damage: e.damage, life: 4 });
        }
      } else moveToward(e, p.x, p.y, dt, e.speed);
      break;
    }
    case 'boss': {
      // The Rot King duels the PLAYER, not the seed: phase 1-2 it advances
      // on Pip with aimed shots; phase 3 it charges Pip with rapid fire.
      // Its mite escorts still go for the seed, so both bars stay live.
      const frac = e.hp / e.maxHp;
      e.phase = frac < 0.33 ? 3 : frac < 0.66 ? 2 : 1;
      run.bossPhase = e.phase;
      const speed = e.speed * (e.phase === 3 ? 1.9 : e.phase === 2 ? 1.3 : 1);
      moveToward(e, p.x, p.y, dt, speed);
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = e.phase === 3 ? 1.2 : 2.0;
        const bolts = e.phase === 3 ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
        for (const k of bolts) {
          const ang = Math.atan2(p.y - e.y, p.x - e.x) + k * 0.24;
          run.enemyBolts.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, radius: 8, damage: 8, life: 4 });
        }
      }
      e.spawnTimer -= dt;
      if (e.phase >= 2 && e.spawnTimer <= 0) {
        e.spawnTimer = 6;
        const mites = run.enemies.filter((o) => o.kind === 'mite').length;
        if (mites < 4) {
          spawnEnemy(run, rng, 'mite', e.x + 60, e.y);
          spawnEnemy(run, rng, 'mite', e.x - 60, e.y);
        }
      }
      break;
    }
    default:
      moveToward(e, SEED_POS.x, SEED_POS.y, dt, e.speed);
  }
  // Keep inside the arena.
  e.x = Math.max(ARENA.x + e.radius, Math.min(ARENA.x + ARENA.width - e.radius, e.x));
  e.y = Math.max(ARENA.y + e.radius, Math.min(ARENA.y + ARENA.height - e.radius, e.y));
}
