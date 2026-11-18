// Upgrades: what each pick changes, and the derived numbers the game reads
// every frame. Derived values are computed FROM the owned counts, so a pick
// can never be erased by a per-frame recompute — the count IS the state.
import { PLAYER, UPGRADES, WELL } from './config.js';

export function ownedCount(run, id) { return run.upgradesOwned[id] || 0; }
export function relicCount(run, id) { return (run.relics && run.relics[id]) || 0; }
export function boltDamage(run) { return PLAYER.boltDamage + 7 * ownedCount(run, 'plasma'); }
export function boltsPerShot(run) { return 1 + ownedCount(run, 'twinbolt'); }
export function fireInterval(run) { return PLAYER.fireInterval * Math.pow(0.82, ownedCount(run, 'rapid')); }
export function dashCooldown(run) { return PLAYER.dashCooldown; }
export function playerSpeed(run) { return PLAYER.speed * (1 + 0.15 * relicCount(run, 'fins')); }
export function wellRadius(run) { return WELL.radius + 45 * ownedCount(run, 'wellwide'); }
export function wellDamage(run) {
  // Ember realm burns hotter (+10%), road and relic bonuses stack on top.
  const base = WELL.damage + 55 * ownedCount(run, 'wellboom') + 20 * relicCount(run, 'ember') + (run.nextWave ? run.nextWave.wellBonus : 0);
  return Math.round(base * (run.realm === 2 ? 1.1 : 1));
}
export function wellMaxCharges(run) { return WELL.maxCharges + ownedCount(run, 'wellmore'); }
export function wellRechargeTime(run) { return WELL.recharge * Math.pow(0.75, ownedCount(run, 'wellmore')); }
export function chainDamage(run) { return 40 * ownedCount(run, 'chain') + 20 * relicCount(run, 'spark'); }
export function chainRadius(run) { return 110 + 40 * relicCount(run, 'spark'); }
export function starBurn(run) { return 9 + 5 * relicCount(run, 'lens'); }
export function scoreMultiplier(run) { return run.nextWave ? run.nextWave.scoreMult : 1; }

export function applyUpgrade(run, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  if (ownedCount(run, id) >= def.max) return false;
  run.upgradesOwned[id] = ownedCount(run, id) + 1;
  run.lastUpgradeName = def.name; run.lastUpgradeAt = run.time;
  if (id === 'hull') {
    run.player.maxHp += 30;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + 30);
  }
  return true;
}

export function rollChoices(run, rng) {
  const pool = UPGRADES.filter((u) => ownedCount(run, u.id) < u.max);
  const out = [];
  while (out.length < 3 && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
