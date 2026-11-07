// ── 디자인 해상도 (세로 모드 우선) ──────────────────────────────
const DESIGN_WIDTH  = 360;
const DESIGN_HEIGHT = 740;
const TILE_SIZE     = 40;
const GRID_COLS     = 9;
const GRID_ROWS     = 16;
const HUD_HEIGHT    = 60;   // 상단 HUD
const GRID_Y        = HUD_HEIGHT;

// 타일 종류
const TILE = {
  GRASS:   '.',   // 설치 가능
  PATH:    '#',   // 길 (설치 불가)
  ENTER:   'E',   // 적 입구 (설치 불가)
  BASE:    'B',   // 기지 (설치 불가)
  STALL:   '$',   // 상인 노점 (설치 가능, 처치 시 동전 +5)
  PLAZA:   '+',   // 광장 (설치 불가, 이동 속도 감소)
  SIGN:    'S',   // 방향 표지판 (설치 불가)
  FUSE:    'F',   // 도화선 (설치 불가)
};

const NO_BUILD_TILES = new Set(['#','E','B','+','S','F']);

// 타일 픽셀 중심 좌표
function tileCenter(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: GRID_Y + row * TILE_SIZE + TILE_SIZE / 2
  };
}
