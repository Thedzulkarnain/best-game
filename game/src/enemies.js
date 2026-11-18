// Enemy spawning and movement. Each kind has one visible behaviour:
// chase the star, hunt the player, weave, spit, drain, or boss patterns.
import { ARENA, DIFFICULTIES, ENEMY_KINDS, STAR_POS } from './config.js';
import { makeRandom, pickRandom } from './random.js';

export function pickEdgePos(rng) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: ARENA.x + rng() * ARENA.width, y: ARENA.y + 14 };
  if (side === 1) return { x: ARENA.x + rng() * ARENA.width, y: ARENA.y + ARENA.height - 14 };
  if (side === 2) return { x: ARENA.x + 14, y: ARENA.y + rng() * ARENA.height };
  return { x: ARENA.x + ARENA.width - 14, y: ARENA.y + rng() * ARENA.height };
}

export function spawnAtEdge(run, rng, kind) {
  const pos = pickEdgePos(rng);
  spawnEnemy(run, kind, pos.x, pos.y);
}

// Spawn several of one kind at one edge point — the tight cluster that
// Wave 5 arrives in, and that a gravity well is built to punish.
export function spawnCluster(run, rng, kind, n) {
  const pos = pickEdgePos(rng);
  for (let i = 0; i < n; i++) {
    spawnEnemy(run, kind, pos.x + (rng() - 0.5) * 56, pos.y + (rng() - 0.5) * 56);
  }
}

export function spawnEnemy(run, kind, x, y) {
  if (!run.rng) run.rng = makeRandom(run.seed);
  const def = ENEMY_KINDS[kind];
  // Difficulty and realm scale the foe at spawn: harder runs, tougher and
  // faster enemies; the Ember Deep adds another 10% speed.
  const d = DIFFICULTIES[run.difficulty || 'normal'];
  const speedMult = d.enemySpeed * (run.realm === 2 ? 1.1 : 1) * (run.nextWave ? run.nextWave.speedMult : 1);
  const hp = Math.round(def.hp * d.enemyHp);
  const e = {
    kind, x, y, hp, maxHp: hp, speed: def.speed * speedMult, damage: Math.round(def.damage * d.enemyDmg),
    radius: def.radius, score: def.score, colour: def.colour, behaviour: def.behaviour,
    shoot: def.shoot || 0, shootTimer: 1.2 + run.rng() * 1.5,
    splits: !!def.splits, flash: 0, wobble: run.rng() * Math.PI * 2,
    phase: 1, dead: false, pulled: 0,
  };
  run.enemies.push(e);
  if (kind === 'voidmaw' || kind === 'hollowsun') {
    run.boss = e; run.bossPhase = 1;
    // The boss announces itself: its attack is named the moment it arrives.
    run.message = kind === 'voidmaw'
      ? 'VOIDMAW — THE MAW OPENS: THREE-BOLT SPREAD'
      : 'THE HOLLOW SUN AWAKENS — PHASE 1: THREE-BOLT SPREAD';
    run.messageTimer = 3;
  }
  return e;
}

export function updateEnemy(run, e, dt, rng) {
  e.flash = Math.max(0, e.flash - dt * 4);
  e.wobble += dt * 3;
  const p = run.player;
  const dxStar = STAR_POS.x - e.x, dyStar = STAR_POS.y - e.y;
  const dStar = Math.hypot(dxStar, dyStar) || 1;
  const dxP = p.x - e.x, dyP = p.y - e.y;
  const dP = Math.hypot(dxP, dyP) || 1;
  let mx = 0, my = 0, speed = e.speed;
  if (e.behaviour === 'chaseStar' || e.behaviour === 'drainStar') { mx = dxStar / dStar; my = dyStar / dStar; }
  else if (e.behaviour === 'huntPlayer') { mx = dxP / dP; my = dyP / dP; speed = e.speed * (dP < 220 ? 1.35 : 1); }
  else if (e.behaviour === 'weave') {
    mx = dxStar / dStar; my = dyStar / dStar;
    const perp = Math.sin(e.wobble * 1.4) * 0.9;
    mx += -dyStar / dStar * perp; my += dxStar / dStar * perp;
  } else if (e.behaviour === 'spitter') {
    if (dStar > 260) { mx = dxStar / dStar; my = dyStar / dStar; }
    else if (dStar < 180) { mx = -dxStar / dStar; my = -dyStar / dStar; }
  } else if (e.behaviour === 'boss') {
    // Bosses drift toward the star, slowly, and strafe in an arc.
    mx = dxStar / dStar + Math.cos(e.wobble * 0.5) * 0.4;
    my = dyStar / dStar + Math.sin(e.wobble * 0.5) * 0.4;
    const n = Math.hypot(mx, my) || 1; mx /= n; my /= n;
    if (e.kind === 'hollowsun') {
      const frac = e.hp / e.maxHp;
      const want = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
      if (want !== e.phase) {
        e.phase = want; run.bossPhase = want; run.shake = Math.max(run.shake, 10);
        // A phase change is a new threat, named out loud — not just a
        // number on the boss bar. Each phase changes what the boss does.
        run.message = want === 2
          ? 'THE HOLLOW SUN — PHASE 2: FIVE-BOLT SPREAD'
          : 'THE HOLLOW SUN — PHASE 3: ENRAGED — RAPID FIVE-BOLT SPREAD';
        run.messageTimer = 3;
      }
    }
  }
  // Gravity wells drag the enemy toward the well centre, hard: the pull
  // stays strong even at the rim, so a well thrown past the star yanks the
  // swarm across the star — and a well thrown between swarm and star pulls
  // it off the star. Placement is the decision.
  for (const w of run.wells) {
    const dx = w.x - e.x, dy = w.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < w.radius) {
      const pull = w.pull * (1 - (d / w.radius) * 0.5) * dt;
      e.x += (dx / d) * pull; e.y += (dy / d) * pull;
      e.pulled = 0.2;
    }
  }
  e.pulled = Math.max(0, e.pulled - dt);
  const slow = e.pulled > 0 ? 0.25 : 1;
  e.x += mx * speed * slow * dt;
  e.y += my * speed * slow * dt;
  e.x = Math.max(ARENA.x + 8, Math.min(ARENA.x + ARENA.width - 8, e.x));
  e.y = Math.max(ARENA.y + 8, Math.min(ARENA.y + ARENA.height - 8, e.y));

  // Spitters and bosses fire aimed bolts at the player / star.
  if (e.shoot > 0) {
    e.shootTimer -= dt;
    if (e.shootTimer <= 0) {
      // THE HOLLOW SUN's phases are real abilities: phase 1 throws 3
      // bolts, phase 2 throws 5, phase 3 throws 5 almost twice as fast.
      const rate = e.kind === 'hollowsun' ? (e.phase >= 3 ? 0.55 : e.phase === 2 ? 0.8 : 1) : 1;
      e.shootTimer = e.shoot * rate;
      const target = e.kind === 'orb' && rng() < 0.5 ? { x: STAR_POS.x, y: STAR_POS.y } : p;
      const a = Math.atan2(target.y - e.y, target.x - e.x);
      const n = e.kind === 'hollowsun' ? (e.phase >= 2 ? 5 : 3) : e.kind === 'voidmaw' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.35;
        run.enemyBolts.push({
          x: e.x, y: e.y,
          vx: Math.cos(a + off) * 230, vy: Math.sin(a + off) * 230,
          radius: 7, damage: e.kind === 'orb' ? 7 : 10, life: 4,
        });
      }
    }
  }
  void rng;
}
