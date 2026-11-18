// Autopilot: plays the real game for screenshots and verification.
// It kites toward the nearest enemy, fires at it, throws a well at the
// densest cluster when one is ready, and dashes away when hurt.
import { STAR_POS } from './config.js';

export function idleInput(run) {
  return { moveX: 0, moveY: 0, aimX: run.player.x, aimY: run.player.y - 100, firing: false, dash: false, throwWell: false };
}

export function autopilotInput(run) {
  const p = run.player;
  // Shooting: plasma is wasted on armoured Hex Crabs (10% damage), so aim
  // at the nearest enemy that bolts can actually hurt; only shoot a crab
  // when nothing else is left.
  let target = null; let best = Infinity;
  for (const e of run.enemies) {
    if (e.kind === 'crab') continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) { best = d; target = e; }
  }
  if (!target) {
    for (const e of run.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < best) { best = d; target = e; }
    }
  }
  // Densest cluster for a well: the enemy with the most neighbours near
  // it. A Hex Crab counts double — crabs are the reason to throw a well,
  // so a small crab pack is worth a charge even before a big swarm forms.
  // If only crabs remain, any crab is a well target.
  let wellTarget = null; let wellScore = 0; let wellCount = 0;
  const onlyCrabs = run.enemies.length > 0 && run.enemies.every((e) => e.kind === 'crab');
  for (const e of run.enemies) {
    let n = 0; let s = 0;
    for (const o of run.enemies) {
      if (Math.hypot(o.x - e.x, o.y - e.y) < 170) { n += 1; s += o.kind === 'crab' ? 2 : 1; }
    }
    if (s > wellScore) { wellScore = s; wellCount = n; wellTarget = e; }
  }
  const throwWell = run.wellCharges > 0 && wellTarget
    && (wellCount >= 3 || wellScore >= 4 || onlyCrabs) && run.wells.length < 2;
  const aim = throwWell ? wellTarget : target;
  // Kite: stay ~260 from the target, drift toward the star when far from it.
  let mx = 0, my = 0;
  if (target) {
    const dx = p.x - target.x, dy = p.y - target.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = d < 200 ? 1 : d > 320 ? -1 : 0;
    mx = (dx / d) * want; my = (dy / d) * want;
    // Orbit sideways so the ship never sits still.
    mx += (-dy / d) * 0.5; my += (dx / d) * 0.5;
  }
  const dStar = Math.hypot(STAR_POS.x - p.x, STAR_POS.y - p.y);
  if (dStar > 420) { mx += (STAR_POS.x - p.x) / dStar * 0.6; my += (STAR_POS.y - p.y) / dStar * 0.6; }
  const len = Math.hypot(mx, my) || 1;
  return {
    moveX: mx / len, moveY: my / len,
    aimX: aim ? aim.x : p.x, aimY: aim ? aim.y : p.y - 100,
    firing: !!target,
    dash: p.hp < 45 && best < 90,
    throwWell,
  };
}
