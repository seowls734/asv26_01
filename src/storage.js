// ── 로컬스토리지 저장/불러오기 ───────────────────────────────
const SAVE_KEY = 'td_save_v1';

const DEFAULT_SAVE = {
  gold: 0,
  gems: 0,
  stages: {
    1: { unlocked: true,  cleared: false, stars: 0, firstClear: false },
    2: { unlocked: false, cleared: false, stars: 0, firstClear: false },
    3: { unlocked: false, cleared: false, stars: 0, firstClear: false },
    4: { unlocked: false, cleared: false, stars: 0, firstClear: false },
  },
  ownedTowers: ['torch_archer'],  // 기본 지급
  permUpgrades: {
    torch_archer: 0,
    knight_tower: 0,
    hacker: 0,
    mc_tower: 0,
  },
  lastStage: 1,
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    const loaded = JSON.parse(raw);
    // DEFAULT_SAVE 기준으로 누락 필드 보완 (버전 호환)
    const def = DEFAULT_SAVE;
    if (loaded.gold    === undefined) loaded.gold    = def.gold;
    if (loaded.gems    === undefined) loaded.gems    = def.gems;
    if (!loaded.stages)        loaded.stages        = JSON.parse(JSON.stringify(def.stages));
    if (!loaded.ownedTowers)   loaded.ownedTowers   = [...def.ownedTowers];
    if (!loaded.permUpgrades)  loaded.permUpgrades  = {...def.permUpgrades};
    if (!loaded.lastStage)     loaded.lastStage     = def.lastStage;
    // 각 스테이지 항목 보완
    Object.keys(def.stages).forEach(k => {
      if (!loaded.stages[k]) loaded.stages[k] = JSON.parse(JSON.stringify(def.stages[k]));
    });
    return loaded;
  } catch(e) {
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }
}

function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}
