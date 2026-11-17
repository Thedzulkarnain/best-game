// Autopilot: a simple player that plays the real rules — used both for the
// deterministic screenshot scenes and for the full auto-play balance test.
// It defends the Heartseed first: any enemy close to the seed outranks one
// close to the player. It kites, keeps distance, shoots the priority
// target, and dashes away when something gets too close.
import { ARENA, SEED_POS } from './config.js';

export function autopilotInput(run) {
  const p = run.player;
  let moveX = 0, moveY = 0;
  // Priority target: the enemy closest to the Heartseed, if one is near it;
  // otherwise the enemy closest to the player.
  let target = null, targetD = Infinity;
  for (const e of run.enemies) {
    const dSeed = Math.hypot(e.x - SEED_POS.x, e.y - SEED_POS.y);
    if (dSeed < 200) {
      if (dSeed < targetD) { targetD = dSeed; target = e; }
    }
  }
  let nearest = null, nearestD = Infinity;
  for (const e of run.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) { nearestD = d; nearest = e; }
  }
  if (!target) { target = nearest; targetD = nearestD; }
  let aimX = p.aimX, aimY = p.aimY;
  if (target) { aimX = target.x; aimY = target.y; }
  // Movement. While the Rot King lives, ALWAYS orbit it — dodging is
  // independent of aiming, so escort mites near the seed never pull the
  // keeper out of its strafe and into a bolt spread. Otherwise: flee the
  // nearest enemy when it is very close, else close on the priority target.
  const boss = run.enemies.find((e) => e.kind === 'rotking');
  const seedThreat = run.enemies.some((e) => Math.hypot(e.x - SEED_POS.x, e.y - SEED_POS.y) < 200);
  const distSeed = Math.hypot(p.x - SEED_POS.x, p.y - SEED_POS.y);
  if (boss) {
    const dx = boss.x - p.x, dy = boss.y - p.y, d = Math.hypot(dx, dy);
    const orbit = Math.sin(run.time * 0.7) >= 0 ? 1 : -1;
    const px = -dy / (d || 1) * orbit, py = dx / (d || 1) * orbit;
    if (nearest && nearestD < 55) { moveX = (p.x - nearest.x) / (nearestD || 1); moveY = (p.y - nearest.y) / (nearestD || 1); }
    else if (d > 260) { moveX = dx / d + px * 0.5; moveY = dy / d + py * 0.5; }
    else if (d < 190) { moveX = -dx / d + px * 0.5; moveY = -dy / d + py * 0.5; }
    else { moveX = px; moveY = py; }
  } else if (nearest && nearestD < 120 && (!seedThreat || distSeed < 320) && !(seedThreat && nearestD > 50)) {
    moveX = (p.x - nearest.x) / (nearestD || 1);
    moveY = (p.y - nearest.y) / (nearestD || 1);
  } else if (target) {
    const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy);
    if (d > 60) { moveX = dx / d; moveY = dy / d; }
    else if (d < 45) { moveX = -dx / d; moveY = -dy / d; }
  } else {
    const dx = SEED_POS.x - p.x, dy = SEED_POS.y + 130 - p.y, d = Math.hypot(dx, dy);
    if (d > 24) { moveX = dx / d; moveY = dy / d; }
  }
  // Stay in the arena with a margin.
  if (p.x < ARENA.x + 60) moveX = Math.abs(moveX);
  if (p.x > ARENA.x + ARENA.width - 60) moveX = -Math.abs(moveX);
  if (p.y < ARENA.y + 60) moveY = Math.abs(moveY);
  if (p.y > ARENA.y + ARENA.height - 60) moveY = -Math.abs(moveY);
  const len = Math.hypot(moveX, moveY) || 1;
  const dash = nearestD < 90 && p.dashCooldown <= 0;
  return { moveX: moveX / len, moveY: moveY / len, aimX, aimY, firing: !!nearest, dash };
}

// Careless play: stand still in the open and never shoot. Must LOSE.
export function idleInput(run) {
  return { moveX: 0, moveY: 0, aimX: run.player.x + 10, aimY: run.player.y, firing: false, dash: false };
}
