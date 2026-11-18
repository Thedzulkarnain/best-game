// Upgrades: what each pick changes, and the derived numbers the game reads
// every frame. Derived values are computed FROM the owned counts, so a pick
// can never be erased by a per-frame recompute — the count IS the state.
import { PLAYER, UPGRADES, WELL } from './config.js';

export function ownedCount(run, id) { return run.upgradesOwned[id] || 0; }
export function relicCount(run, id) { return (run.relics && run.relics[id]) || 0; }
export function boltDamage(run) { return PLAYER.boltDamage + 7 * ownedCount(run, 'plasma') + 3 * relicCount(run, 'coil'); }
export function boltsPerShot(run) { return 1 + ownedCount(run, 'twinbolt'); }
export function fireInterval(run) { return PLAYER.fireInterval * Math.pow(0.82, ownedCount(run, 'rapid')); }
export function dashCooldown(run) { return PLAYER.dashCooldown * Math.pow(0.75, ownedCount(run, 'slipstream')); }
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
export function starBurn(run) { return 9 + 5 * relicCount(run, 'lens') + 6 * ownedCount(run, 'flare'); }
// Star Siphon: each owned level feeds 12 star HP back on every well
// detonation, capped at the star's max HP by the detonation code.
export function starSiphonHeal(run) { return 12 * ownedCount(run, 'siphon'); }
// Event Horizon pulls harder; the Void Anchor relic anchors the pull too.
// The number is set on the well when it is thrown, and the pull code in
// enemies.js reads the well's own pull — so a stronger well drags harder
// from the moment it lands.
export function wellPull(run) { return 340 + 60 * ownedCount(run, 'horizon') + 40 * relicCount(run, 'anchor'); }
// Long Fuse: a well hangs in the arena longer before it detonates —
// more time to drag the swarm into its ring.
export function wellDuration(run) { return 2.2 + 0.8 * ownedCount(run, 'longfuse'); }
// Nanoweave: the hull knits itself back together, slowly, while you fly.
export function hullRegen(run) { return 0.8 * ownedCount(run, 'nanoweave'); }
// Hot Streak: the combo window stays open longer after a kill, so the
// chain survives the flight between kills.
export function comboWindow(run) { return 3 + 1.5 * ownedCount(run, 'streak'); }
// Coin Purse: every starshard pickup is worth one shard more.
// Salvage: every well kill pays a little extra score.
export function shardGain(run) { return 1 + relicCount(run, 'purse'); }
export function wellKillBonus(run) { return 5 * relicCount(run, 'salvage'); }
// Bulwark: incoming damage is blunted (never below 1 — a hit is a hit).
// Starward: the star's drain is slowed — latched leeches bleed it less.
export function damageTakenMult(run) { return 1 - 0.12 * relicCount(run, 'bulwark'); }
export function starDrainMult(run) { return 1 - 0.15 * relicCount(run, 'starward'); }
export function scoreMultiplier(run) { return (run.nextWave ? run.nextWave.scoreMult : 1) * (1 + 0.15 * ownedCount(run, 'bounty')); }

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
