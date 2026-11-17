// SPOREKEEPER — Bloom Siege: every tunable number, colour and definition.
// One job: constants. No logic lives here, so balance can be read at a glance.
export const STEP = 1 / 60;
export const VIEW = { width: 1280, height: 720 };
export const ARENA = { x: 40, y: 96, width: 1200, height: 560 };
export const SEED_POS = { x: 640, y: 376 };
export const TOTAL_WAVES = 7;
export const WIN_KILLS_TARGET = 0; // win is killing the Wave 7 boss, not a kill count

export const PALETTE = {
  night: '#0b1f24', nightDeep: '#071418', grass: '#123527', grassLight: '#1d5c38',
  gold: '#ffd23e', goldSoft: '#ffe98a', leaf: '#7ee787', leafDeep: '#2fbf71',
  petal: '#ff8fb3', sky: '#8be9ff', cream: '#fff6d8', ink: '#0a1210',
  hurt: '#ff5a5a', spore: '#c9f27e', violet: '#b79cff',
};

export const PLAYER = {
  radius: 16, speed: 265, maxHp: 120, fireInterval: 0.34, boltSpeed: 620,
  boltDamage: 15, boltRadius: 5, dashSpeed: 720, dashTime: 0.16, dashCooldown: 2.2,
  pickupRadius: 26,
};

// Enemy kinds: name, look, behaviour. Seven kinds + the boss, all visibly distinct.
export const ENEMY_KINDS = {
  mite:     { name: 'Blight Mite',   hp: 18,  speed: 150, damage: 6,  radius: 11, score: 10, colour: '#ff9f43', behaviour: 'chaseSeed',  shoot: 0 },
  aphid:    { name: 'Sap Aphid',     hp: 30,  speed: 62,  damage: 10, radius: 14, score: 15, colour: '#e8ff6a', behaviour: 'drainSeed',  shoot: 0 },
  beetle:   { name: 'Thorn Beetle',  hp: 95,  speed: 52,  damage: 16, radius: 20, score: 30, colour: '#c77dff', behaviour: 'chaseSeed',  shoot: 0, armour: 0.35 },
  bat:      { name: 'Gloom Bat',     hp: 26,  speed: 185, damage: 8,  radius: 12, score: 20, colour: '#8be9ff', behaviour: 'huntPlayer', shoot: 0 },
  slug:     { name: 'Mould Slug',    hp: 60,  speed: 44,  damage: 12, radius: 18, score: 25, colour: '#7ee787', behaviour: 'chaseSeed',  shoot: 0, trail: true },
  hound:    { name: 'Bramble Hound', hp: 42,  speed: 120, damage: 12, radius: 15, score: 25, colour: '#ff6b81', behaviour: 'chargePlayer', shoot: 0 },
  leech:    { name: 'Wisp Leech',    hp: 34,  speed: 78,  damage: 6,  radius: 13, score: 25, colour: '#ffd23e', behaviour: 'spitter',    shoot: 2.4 },
  rotking:  { name: 'THE ROT KING',  hp: 1500, speed: 46,  damage: 22, radius: 52, score: 500, colour: '#b5179e', behaviour: 'boss', shoot: 1.8 },
};

// Wave composition: which kinds appear, how many, spawn gap. Wave 7 is the boss + escorts.
export const WAVES = [
  { kinds: ['mite', 'mite', 'aphid'], count: 10, gap: 1.5 },
  { kinds: ['mite', 'aphid', 'bat'], count: 16, gap: 1.25 },
  { kinds: ['mite', 'bat', 'slug', 'aphid'], count: 22, gap: 1.05 },
  { kinds: ['beetle', 'slug', 'hound', 'mite'], count: 26, gap: 0.95 },
  { kinds: ['hound', 'leech', 'bat', 'beetle'], count: 26, gap: 0.85 },
  { kinds: ['leech', 'beetle', 'slug', 'hound', 'bat'], count: 32, gap: 0.75 },
  { kinds: ['rotking'], count: 1, gap: 1.0, escorts: ['mite', 'bat'] },
];

// Upgrades offered between waves. Each id maps to one visible, lasting effect.
export const UPGRADES = [
  { id: 'thorn',  name: 'Thorn Vines',   icon: '🌵', desc: '+6 bolt damage', max: 3 },
  { id: 'twin',   name: 'Twin Bloom',    icon: '🌸', desc: '+1 bolt per shot', max: 2 },
  { id: 'swift',  name: 'Swift Petals',  icon: '💨', desc: 'Fire 18% faster', max: 3 },
  { id: 'roots',  name: 'Deep Roots',    icon: '🌱', desc: '+30 max HP, heal 30', max: 3 },
  { id: 'burst',  name: 'Pollen Burst',  icon: '💥', desc: 'Bolts splash 55 dmg', max: 2 },
  { id: 'dash',   name: 'Dash Bloom',    icon: '✨', desc: 'Dash recharges 40% faster', max: 2 },
  { id: 'nectar', name: 'Golden Nectar', icon: '🍯', desc: '+25% score, heal 4 on kill', max: 2 },
  { id: 'bark',   name: 'Heart Bark',    icon: '🛡️', desc: '+25 Heartseed max HP, heal 25', max: 2 },
];

export const CONTROLS = [
  ['WASD / Arrows', 'Move Pip the keeper'],
  ['Mouse', 'Aim — hold Click / Space to shoot pollen'],
  ['Shift', 'Dash (leaves a bloom trail)'],
  ['1 / 2 / 3', 'Pick an upgrade between waves'],
  ['P', 'Pause'],
  ['M', 'Mute'],
  ['R', 'Restart after win / loss'],
];

export const FEATURES = [
  '7 waves of blight — Wave 7: THE ROT KING',
  '7 enemy kinds + boss with 3 phases',
  '8 upgrades, pick 1 of 3 between waves',
  'Dash, splash bolts, combos & damage numbers',
  'Protect the Heartseed AND yourself — lose either, lose the run',
];
