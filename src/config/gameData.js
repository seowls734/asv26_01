const TOWER_DEFS = {
  archer: {
    name: '궁수탑', cost: 50, color: 0xaa7733,
    range: 192, damage: 15, rate: 1000, type: 'single', unlockWave: 0,
  },
  flame: {
    name: '화염탑', cost: 60, color: 0xff4400,
    range: 120, damage: 10, rate: 500, type: 'aoe', aoeRadius: 60,
    statusEffect: { type: 'burn', damage: 5, duration: 3000 }, unlockWave: 0,
  },
  ice: {
    name: '얼음탑', cost: 50, color: 0x44aaff,
    range: 192, damage: 8, rate: 1200, type: 'single',
    statusEffect: { type: 'slow', amount: 0.4, duration: 2000 }, unlockWave: 0,
  },
  poison: {
    name: '독탑', cost: 70, color: 0x44cc44,
    range: 130, damage: 5, rate: 3000, type: 'aoe', aoeRadius: 130,
    statusEffect: { type: 'poison', damage: 5, duration: 4000 }, unlockWave: 3,
  },
  cannon: {
    name: '포격탑', cost: 100, color: 0x888888,
    range: 216, damage: 60, rate: 2500, type: 'aoe', aoeRadius: 80, unlockWave: 5,
  },
  lightning: {
    name: '번개탑', cost: 150, color: 0xffff44,
    range: 168, damage: 20, rate: 700, type: 'chain', chainCount: 2,
    statusEffect: { type: 'stun', duration: 500 }, unlockWave: 10,
  },
};

const ENEMY_DEFS = {
  goblin:      { name: '고블린',      hp: 60,   speed: 90,  reward: 5,   baseDamage: 1,  color: 0x44bb44, size: 10 },
  orc:         { name: '오크',        hp: 250,  speed: 45,  reward: 15,  baseDamage: 3,  color: 0x88aa33, size: 14, armor: 0.2 },
  viper:       { name: '독사',        hp: 140,  speed: 65,  reward: 10,  baseDamage: 2,  color: 0x228833, size: 11 },
  shieldGoblin:{ name: '쉴드고블린', hp: 90,   speed: 60,  reward: 8,   baseDamage: 1,  color: 0x448844, size: 11, shieldCount: 3 },
  slime:       { name: '분열슬라임', hp: 200,  speed: 40,  reward: 20,  baseDamage: 2,  color: 0x88ee44, size: 15, splits: true },
  healerOrc:   { name: '힐러오크',   hp: 170,  speed: 60,  reward: 18,  baseDamage: 2,  color: 0x44cc88, size: 13, healer: true, healRadius: 120, healAmount: 30, healRate: 5000 },
  golem:       { name: '강철골렘',   hp: 1200, speed: 25,  reward: 100, baseDamage: 10, color: 0x888888, size: 20, armor: 0.25, boss: true },
};

const WAVE_DATA = [
  { enemies: [{ type: 'goblin', count: 10, interval: 1500 }], clearGold: 60 },
  { enemies: [{ type: 'goblin', count: 8, interval: 1500 }, { type: 'orc', count: 2, interval: 2500 }], clearGold: 70 },
  { enemies: [{ type: 'goblin', count: 10, interval: 1200 }, { type: 'orc', count: 3, interval: 2000 }], clearGold: 80, unlock: 'poison' },
  { enemies: [{ type: 'goblin', count: 6, interval: 1200 }, { type: 'orc', count: 4, interval: 2000 }, { type: 'viper', count: 2, interval: 3000 }], clearGold: 90 },
  { enemies: [{ type: 'goblin', count: 5, interval: 1000 }, { type: 'orc', count: 3, interval: 2000 }, { type: 'golem', count: 1, interval: 5000 }], clearGold: 150, boss: true, unlock: 'cannon' },
  { enemies: [{ type: 'orc', count: 5, interval: 2000 }, { type: 'viper', count: 3, interval: 2500 }, { type: 'shieldGoblin', count: 4, interval: 1500 }], clearGold: 110 },
  { enemies: [{ type: 'goblin', count: 8, interval: 1200 }, { type: 'shieldGoblin', count: 4, interval: 2000 }, { type: 'slime', count: 2, interval: 3000 }], clearGold: 120 },
  { enemies: [{ type: 'orc', count: 4, interval: 2000 }, { type: 'viper', count: 4, interval: 2000 }, { type: 'slime', count: 3, interval: 3000 }], clearGold: 130 },
  { enemies: [{ type: 'goblin', count: 6, interval: 1200 }, { type: 'shieldGoblin', count: 5, interval: 2000 }, { type: 'healerOrc', count: 2, interval: 4000 }], clearGold: 140 },
  { enemies: [{ type: 'orc', count: 4, interval: 2000 }, { type: 'healerOrc', count: 2, interval: 4000 }, { type: 'golem', count: 1, interval: 6000 }], clearGold: 200, boss: true, unlock: 'lightning' },
];
