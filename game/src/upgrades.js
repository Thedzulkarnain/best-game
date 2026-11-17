// Upgrades: what each one does, and the derived combat numbers the
// simulation reads every frame. The derived values are computed from the
// OWNED counts stored on the run — never from a base that a frame-by-frame
// recompute would erase. That is the silent-upgrade bug, fixed by design:
// applyUpgrade writes the owned count, and the getters read that count.
import { PLAYER, UPGRADES } from './config.js';

export function ownedCount(run, id) { return run.upgradesOwned[id] || 0; }

export function boltDamage(run) {
  return PLAYER.boltDamage + 6 * ownedCount(run, 'thorn');
}
export function boltsPerShot(run) { return 1 + ownedCount(run, 'twin'); }
export function fireInterval(run) {
  return PLAYER.fireInterval * Math.pow(0.82, ownedCount(run, 'swift'));
}
export function splashDamage(run) {
  return ownedCount(run, 'burst') > 0 ? 55 * ownedCount(run, 'burst') : 0;
}
export function dashCooldown(run) {
  return PLAYER.dashCooldown * Math.pow(0.6, ownedCount(run, 'dash'));
}
export function scoreMultiplier(run) { return 1 + 0.25 * ownedCount(run, 'nectar'); }
export function healOnKill(run) { return 4 * ownedCount(run, 'nectar'); }

export function applyUpgrade(run, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  if (ownedCount(run, id) >= def.max) return false;
  run.upgradesOwned[id] = ownedCount(run, id) + 1;
  if (id === 'roots') {
    run.player.maxHp += 30;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 30);
  }
  if (id === 'bark') {
    run.seedMaxHp += 25;
    run.seedHp = Math.min(run.seedMaxHp, run.seedHp + 25);
  }
  run.lastUpgradeName = def.name;
  run.lastUpgradeAt = run.time;
  return true;
}

// Pick 3 distinct upgrades the player has not maxed out, for the choice screen.
export function rollChoices(run, rng) {
  const avail = UPGRADES.filter((u) => ownedCount(run, u.id) < u.max);
  const choices = [];
  while (choices.length < 3 && avail.length > 0) {
    const i = Math.floor(rng() * avail.length);
    choices.push(avail.splice(i, 1)[0]);
  }
  return choices;
}
