// ── 타워 정의 ────────────────────────────────────────────────
const TOWER_DEFS = {
  torch_archer: {
    id: 'torch_archer',
    name: '횃불 궁수대',
    rarity: 'common',
    cost: 20,          // 동전 (인게임 설치 비용)
    shopCost: 0,       // 보석 (상점 구매 비용, 0=기본 지급)
    range: 3.0,        // 타일 단위
    fireInterval: 2000,// ms
    damage: 6,
    burnDuration: 6000,// 화상 지속 ms
    burnDps: 3,        // 화상 초당 피해
    spreadCount: 1,    // 번짐 대상 수
    color: 0xff6600,
    upgrades: [
      { damage: 6, cost: 0  },   // Lv1 기본
      { damage: 6, cost: 15 },   // Lv2
      { damage: 8, cost: 25 },   // Lv3
    ],
  },
  knight_tower: {
    id: 'knight_tower',
    name: '기사 탑',
    rarity: 'common',
    cost: 30,
    shopCost: 20,      // 보석
    range: 2.0,
    summonInterval: 30000, // 30초마다 기사 소환
    knightDuration: 10000, // 기사 10초 유지
    knightDamage: 10,
    knightFireInterval: 2000,
    color: 0x4488ff,
    upgrades: [
      { knightDamage: 10, cost: 0  },
      { knightDamage: 15, cost: 20 },
      { knightDamage: 20, cost: 35 },
    ],
  },
  hacker: {
    id: 'hacker',
    name: '해커',
    rarity: 'rare',
    cost: 50,
    shopCost: 40,
    hackInterval: 60000, // 60초 쿨타임
    color: 0x00ffaa,
    upgrades: [
      { hackInterval: 60000, cost: 0  },
      { hackInterval: 45000, cost: 30 },
      { hackInterval: 30000, cost: 50 },
    ],
  },
  mc_tower: {
    id: 'mc_tower',
    name: '마인크래프트 타워',
    rarity: 'rare',
    cost: 50,
    shopCost: 40,
    blockInterval: 150000, // 2분 30초
    blockTypes: ['iron','diamond','netherite','obsidian'],
    color: 0x44aa44,
    upgrades: [
      { blockInterval: 150000, cost: 0  },
      { blockInterval: 100000, cost: 30 },
      { blockInterval:  60000, cost: 50 },
    ],
  },
};
