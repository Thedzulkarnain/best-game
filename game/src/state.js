// Run state: everything a fresh run needs, and the one reset that clears it all.
import { PLAYER, WELL } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

export function createRun(seed) {
  return {
    seed, rngState: seed,
    screen: SCREEN_TITLE, prevScreen: SCREEN_TITLE,
    time: 0, wave: 0, waveState: 'idle', escortsAdded: false, escortTimer: 6, spawnCount: 0,
    spawnQueue: [], spawnTimer: 0, waveBanner: 0, bannerText: '',
    score: 0, kills: 0, combo: 0, comboTimer: 0, bestCombo: 0,
    difficulty: 'normal', selectedDifficulty: 'normal', realm: 1,
    shards: 0, best: 0, relics: {}, roadChoices: [], upgradePicked: null, roadPicked: null,
    nextWave: { countMult: 1, scoreMult: 1, wellBonus: 0, speedMult: 1 },
    comboCallout: '', comboCalloutTimer: 0,
    crabWellKills: 0, minStarHp: 240,
    player: {
      x: 640, y: 580, radius: PLAYER.radius, hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      fireTimer: 0, dashTimer: 0, dashCooldown: 0, dashX: 0, dashY: 0,
      aimX: 640, aimY: 300, hurtFlash: 0, alive: true, invuln: 0,
    },
    starHp: 240, starMaxHp: 240, starFlash: 0, starDrainBudget: 6,
    wellCharges: WELL.maxCharges, wellRecharge: 0, wells: [],
    enemies: [], bolts: [], enemyBolts: [], particles: [], floats: [],
    pickups: [], rings: [], stars: [],
    upgradesOwned: {}, upgradeChoices: [], lastUpgradeName: '', lastUpgradeAt: 0,
    stats: { damageDealt: 0, damageTaken: 0, shotsFired: 0, wellsThrown: 0, wellKills: 0, dashes: 0, closeCalls: 0 },
    shake: 0, bossPhase: 0, boss: null, starFlare: 0,
    muted: false, won: false, lost: false, loseReason: '',
    message: '', messageTimer: 0,
  };
}

// Full reset: build a brand-new run object and copy it over the old one, so
// no flag, timer, list or frozen state can survive into the next run.
export function resetRun(run, seed) {
  const fresh = createRun(seed);
  for (const key of Object.keys(run)) delete run[key];
  Object.assign(run, fresh);
  return run;
}
