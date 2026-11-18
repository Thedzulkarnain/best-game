// STARWELL — Gravity Forge: every tunable number, colour and definition.
// One job: constants. No logic lives here, so balance can be read at a glance.
export const STEP = 1 / 60;
export const VIEW = { width: 1280, height: 720 };
export const ARENA = { x: 36, y: 92, width: 1208, height: 564 };
export const STAR_POS = { x: 640, y: 380 };
export const TOTAL_WAVES = 7;

export const PALETTE = {
  space: '#070a1e', spaceDeep: '#04050f', nebulaPink: '#ff2e88', nebulaCyan: '#00e5ff',
  nebulaViolet: '#7b2fff', starGold: '#ffd23e', starWhite: '#fff6d8', hull: '#8be9ff',
  hullDeep: '#1b6fff', ember: '#ff6b35', hurt: '#ff3b5c', mint: '#3dff9e',
  violet: '#c77dff', cream: '#fff6d8', ink: '#04050f', slate: '#9db4d6',
};

export const PLAYER = {
  radius: 15, speed: 295, maxHp: 120, fireInterval: 0.30, boltSpeed: 680,
  boltDamage: 16, boltRadius: 6, dashSpeed: 780, dashTime: 0.15, dashCooldown: 2.0,
  pickupRadius: 30,
};

export const WELL = {
  radius: 175, pull: 340, armTime: 2.2, damage: 95, maxCharges: 3, recharge: 4.0,
};

// Enemy kinds: name, look, behaviour. Seven kinds + two bosses, all visibly distinct.
// No faces: geometric hulls, a single glowing eye-dot, hard outlines.
export const ENEMY_KINDS = {
  shard:   { name: 'Shardling',   hp: 20,  speed: 165, damage: 6,  radius: 12, score: 10, colour: '#ff6b35', behaviour: 'chaseStar',  shoot: 0 },
  orb:     { name: 'Spitter Orb', hp: 32,  speed: 70,  damage: 7,  radius: 14, score: 20, colour: '#ff2e88', behaviour: 'spitter',    shoot: 2.6 },
  crab:    { name: 'Hex Crab',    hp: 90,  speed: 55,  damage: 15, radius: 21, score: 30, colour: '#c77dff', behaviour: 'chaseStar',  shoot: 0, boltArmour: 0.9 },
  serpent: { name: 'Void Serpent',hp: 46,  speed: 130, damage: 10, radius: 14, score: 25, colour: '#3dff9e', behaviour: 'weave',      shoot: 0 },
  darter:  { name: 'Darter',      hp: 24,  speed: 210, damage: 8,  radius: 11, score: 20, colour: '#00e5ff', behaviour: 'huntPlayer', shoot: 0 },
  leech:   { name: 'Drain Leech', hp: 38,  speed: 82,  damage: 9,  radius: 13, score: 25, colour: '#ffd23e', behaviour: 'drainStar',  shoot: 0 },
  splitter:{ name: 'Splitter',   hp: 52,  speed: 88,  damage: 11, radius: 17, score: 30, colour: '#ff8fb3', behaviour: 'chaseStar',  shoot: 0, splits: true },
  voidmaw: { name: 'VOIDMAW',    hp: 1150, speed: 58,  damage: 20, radius: 46, score: 400, colour: '#ff2e88', behaviour: 'boss',       shoot: 1.9 },
  hollowsun:{ name: 'THE HOLLOW SUN', hp: 2400, speed: 62, damage: 24, radius: 56, score: 600, colour: '#7b2fff', behaviour: 'boss', shoot: 1.6 },
};

// Wave names — the arc, named out loud as it opens, so the run reads as
// a beginning, a middle and an end instead of a grind.
export const WAVE_NAMES = [
  'WAVE 1 — FIRST LIGHT',
  'WAVE 2 — THE SWARM QUICKENS',
  'WAVE 3 — THEY SPLIT',
  'WAVE 4 — VOIDMAW',
  'WAVE 5 — THE TIDE IN CLUSTERS',
  'WAVE 6 — EVERYTHING AT ONCE',
  'WAVE 7 — THE HOLLOW SUN',
];

// Wave composition — each wave forces the well in a different way.
// W1 meets the armoured crab early. W2 is too fast to shoot one-by-one.
// W3 splitters multiply if shot. W5 arrives in tight clusters the well is
// built to punish. W6 is all three problems at once. Waves 4 and 7 are
// boss waves.
export const WAVES = [
  { kinds: ['shard', 'shard', 'shard', 'orb', 'crab'], count: 18, gap: 0.65 },
  { kinds: ['darter', 'darter', 'shard', 'orb'], count: 28, gap: 0.5 },
  { kinds: ['splitter', 'splitter', 'shard', 'darter'], count: 30, gap: 0.5 },
  { kinds: ['voidmaw'], count: 1, gap: 1.0, escorts: ['shard', 'darter'] },
  { kinds: ['crab', 'serpent', 'leech', 'shard'], count: 38, gap: 0.45, cluster: true },
  { kinds: ['splitter', 'darter', 'leech', 'crab', 'orb'], count: 46, gap: 0.38 },
  { kinds: ['hollowsun'], count: 1, gap: 1.0, escorts: ['shard', 'orb', 'darter'] },
];

// Difficulties: one run, three weights. Foes scale; the skiff's hull does too.
export const DIFFICULTIES = {
  easy:   { name: 'EASY',   desc: 'Foes weaker · Hull 150', enemyHp: 0.8,  enemyDmg: 0.8,  enemySpeed: 0.9,  playerHp: 150 },
  normal: { name: 'NORMAL', desc: 'The forge as built · Hull 120', enemyHp: 1,    enemyDmg: 1,    enemySpeed: 1,    playerHp: 120 },
  hard:   { name: 'HARD',   desc: 'Foes hit harder · Hull 100', enemyHp: 1.3,  enemyDmg: 1.3,  enemySpeed: 1.1,  playerHp: 100 },
};

// Realms: the arc has two halves. Waves 1–4 are the NEBULA REACH; from
// wave 5 the road drops into the EMBER DEEP — hotter colours, and one new
// rule: foes are 10% faster, but the forge burns hotter and wells hit 10%
// harder. The star stays gold: one focal light against the dark.
export const REALMS = {
  1: { name: 'NEBULA REACH', rule: '' },
  2: { name: 'EMBER DEEP', rule: 'Foes +10% speed · Wells +10% dmg' },
};

// Relics: six permanent finds, one granted by each road card between waves.
// A relic is a lasting passive — its bonus is in the derived numbers.
export const RELICS = [
  { id: 'ember',  name: 'Ember Core',  icon: '✹', desc: 'Wells +20 dmg' },
  { id: 'lens',   name: 'Star Lens',   icon: '◎', desc: 'Star corona +5 dmg/s' },
  { id: 'fins',   name: 'Swift Fins',  icon: '»', desc: 'Skiff +15% speed' },
  { id: 'magnet', name: 'Magnet Coil', icon: '◉', desc: 'Pickups drift to you' },
  { id: 'iron',   name: 'Iron Hull',   icon: '⬢', desc: '+20 max HP, heal 20' },
  { id: 'spark',  name: 'Chain Spark', icon: '✦', desc: 'Chain +20 dmg · +40 reach' },
];

// Roads: between waves you pick where the run goes next. Each card is a
// real modifier on the next wave, and it carries one relic with it.
export const ROUTES = [
  { id: 'safe',  name: 'SAFE ROAD',  icon: '⬢', desc: 'Fewer foes next wave · star mends +40', countMult: 0.8, starHeal: 40, scoreMult: 1, wellBonus: 0, speedMult: 1 },
  { id: 'rich',  name: 'RICH ROAD',  icon: '◆', desc: 'More foes next wave · +50% score', countMult: 1.25, starHeal: 0, scoreMult: 1.5, wellBonus: 0, speedMult: 1 },
  { id: 'ember', name: 'EMBER ROAD', icon: '✹', desc: 'Wells +25 dmg · foes +15% speed', countMult: 1, starHeal: 0, scoreMult: 1, wellBonus: 25, speedMult: 1.15 },
];

// Permanent unlocks (the workshop): earned by what past runs proved, kept
// in localStorage, applied at the start of every new run.
export const UNLOCKS = [
  { id: 'veteran', name: 'VETERAN HULL',   icon: '⬢', desc: 'Win once: +10 max HP', check: (m) => m.wins >= 1 },
  { id: 'pockets', name: 'DEEP POCKETS',   icon: '◉', desc: 'Best 10,000+: +1 well charge', check: (m) => m.best >= 10000 },
  { id: 'blessing', name: 'FORGE BLESSING', icon: '✦', desc: '200 well kills: start with an upgrade', check: (m) => m.totalWellKills >= 200 },
  { id: 'warden',  name: 'STARWARDEN',     icon: '★', desc: 'Star-keeper win: +20 star HP', check: (m) => m.starKeeperWins >= 1 },
];

// Upgrades offered between waves. Each id maps to one visible, lasting effect.
export const UPGRADES = [
  { id: 'wellwide', name: 'Wide Well',    icon: '◎', desc: 'Well pull radius +45', max: 3 },
  { id: 'wellboom', name: 'Nova Burst',   icon: '✹', desc: 'Well detonation +55 dmg', max: 3 },
  { id: 'wellmore', name: 'Twin Wells',   icon: '◉', desc: '+1 well charge, faster recharge', max: 2 },
  { id: 'plasma',   name: 'Hot Plasma',   icon: '▲', desc: '+7 bolt damage', max: 3 },
  { id: 'twinbolt', name: 'Split Cannon', icon: '◆', desc: '+1 bolt per shot', max: 2 },
  { id: 'rapid',    name: 'Overclock',    icon: '»', desc: 'Fire 18% faster', max: 3 },
  { id: 'hull',     name: 'Aegis Hull',   icon: '⬢', desc: '+30 max HP, heal 30', max: 3 },
  { id: 'chain',    name: 'Chain Nova',   icon: '✦', desc: 'Well kills chain +40 dmg nearby', max: 2 },
];

export const CONTROLS = [
  ['WASD / Arrows', 'Fly Nova the skiff'],
  ['Mouse + Left-click', 'Aim and fire plasma (hold to fire)'],
  ['Right-click / E', 'Throw a GRAVITY WELL at the cursor'],
  ['Shift', 'Dash (brief invulnerability)'],
  ['1 / 2 / 3', 'Pick an upgrade between waves'],
  ['P', 'Pause'],
  ['M', 'Mute'],
  ['R', 'Restart after win / loss'],
];

export const FEATURES = [
  'THE WELL IS THE WEAPON: shooting thins the swarm — only a well kills',
  'HEX CRABS wear bolt-proof armour: plasma does 10%. Wells break them',
  'Splitters multiply if shot — group them in a well and detonate together',
  'Wave 5 arrives in tight clusters; a well past the star drags the swarm',
  '7 waves — Wave 4: VOIDMAW, Wave 7: THE HOLLOW SUN (3 phases)',
  '7 enemy kinds + 2 bosses, 8 upgrades pick 1 of 3 between waves',
  'Defend the newborn star AND your skiff — lose either, lose the run',
];
