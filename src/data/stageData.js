// ── 스테이지 데이터 ──────────────────────────────────────────
// 맵 문자: . = 설치가능, # = 길(설치불가), E = 입구, B = 기지
//          $ = 상인노점(설치가능, 처치시 +5코인)
//          S = 방향표지판(설치불가), F = 도화선(설치불가)
// 각 행은 정확히 9글자 (GRID_COLS=9)
// 웨이포인트: [col, row] — 꺾이는 지점마다 기재

const STAGE_DATA = {

  // ───────────────────────────────────────────────────────────
  //  스테이지 1: 새벽 시장 골목
  // ───────────────────────────────────────────────────────────
  1: {
    name: '새벽 시장 골목',
    startCoins: 40,
    map: [
      "..E......",  // row  0   E=입구 col2
      "..#......",  // row  1
      "..#......",  // row  2
      "..#####..",  // row  3   path: col2→col6 (우) ← 첫 꺾임
      "......#..",  // row  4   path: col6 (하)
      ".....$#..",  // row  5   $=상인노점 col5
      "..#####..",  // row  6   path: col6→col2 (좌) ← 두번째 꺾임
      ".$#$.....",  // row  7   $=상인노점 col1,col3
      "..#......",  // row  8
      "..#####..",  // row  9   path: col2→col6 (우) ← 세번째 꺾임
      "......#..",  // row 10   path: col6 (하)
      ".....$#..",  // row 11   $=상인노점 col5
      "..#####..",  // row 12   path: col6→col2 (좌) ← 네번째 꺾임
      ".$#$.....",  // row 13   $=상인노점 col1,col3
      "..#......",  // row 14
      "..B......",  // row 15   B=기지 col2
    ],
    waypoints: [
      [2,  0],  // 입구
      [2,  3],  // ↓ → 우회전
      [6,  3],  // → ↓
      [6,  6],  // ↓ ← 좌회전
      [2,  6],  // ← ↓
      [2,  9],  // ↓ → 우회전
      [6,  9],  // → ↓
      [6, 12],  // ↓ ← 좌회전
      [2, 12],  // ← ↓
      [2, 15],  // 기지
    ],
    waves: [
      { startDelay:  500, enemies:[{ type:'pickpocket', count:5, interval:1500 }] },
      { startDelay: 2000, enemies:[{ type:'pickpocket', count:4, interval:1500 },
                                   { type:'bag_thief',  count:2, interval:2500 }] },
      { startDelay: 2000, enemies:[{ type:'bag_thief',  count:4, interval:2000 },
                                   { type:'pickpocket', count:3, interval:1200 }] },
      { startDelay: 2000, enemies:[{ type:'thug',       count:3, interval:2500 },
                                   { type:'pickpocket', count:5, interval:1000 }] },
      { startDelay: 2000, enemies:[{ type:'thug',       count:3, interval:2000 },
                                   { type:'bag_thief',  count:3, interval:2000 },
                                   { type:'thug_boss',  count:1, interval:5000 }] },
    ],
    pathOffsetX: 37,   // 배경 이미지 정렬용 픽셀 보정 (+오른쪽)
    pathOffsetY: 8,    // 배경 이미지 정렬용 픽셀 보정 (+아래)
    clearRewards: { firstGold:60, firstGem:15, retryGold:20, retryGem:0 },
  },

  // ───────────────────────────────────────────────────────────
  //  스테이지 2: 두 세력 교차로
  //  (웨이브1 특수 규칙은 추후 구현; 현재는 단일 경로로 동작)
  // ───────────────────────────────────────────────────────────
  2: {
    name: '두 세력 교차로',
    startCoins: 100,
    map: [
      "E.......E",  // row  0   입구 2개 (col0, col8)
      "#.......#",  // row  1
      "#.......#",  // row  2
      "#.......#",  // row  3
      "####.####",  // row  4   교차점 col4
      "....#....",  // row  5
      "....#....",  // row  6
      "....#....",  // row  7
      "....#....",  // row  8
      "....#....",  // row  9
      "....#....",  // row 10
      "....#....",  // row 11
      "....#....",  // row 12
      "....#....",  // row 13
      "....#....",  // row 14
      "....B....",  // row 15   기지 col4
    ],
    // 왼쪽 경로를 기본으로 사용 (GameScene은 'waypoints' 를 읽음)
    waypoints:  [[0,0],[0,4],[4,4],[4,15]],
    waypointsA: [[0,0],[0,4],[4,4],[4,15]],
    waypointsB: [[8,0],[8,4],[4,4],[4,15]],
    waves: [
      { startDelay:  500, enemies:[{ type:'thug',      count:4, interval:2000 },
                                   { type:'bag_thief', count:3, interval:1800 }] },
      { startDelay: 2000, enemies:[{ type:'thug',      count:4, interval:1800 },
                                   { type:'club_thug', count:2, interval:3000 }] },
      { startDelay: 2000, enemies:[{ type:'club_thug', count:3, interval:2500 },
                                   { type:'thug',      count:4, interval:1800 },
                                   { type:'thug_boss', count:1, interval:6000 }] },
    ],
    clearRewards: { firstGold:80, firstGem:20, retryGold:25, retryGem:0 },
  },

  // ───────────────────────────────────────────────────────────
  //  스테이지 3: 골목 미로
  //  (방향표지판 분기 로직은 추후 구현; 현재는 단일 경로)
  // ───────────────────────────────────────────────────────────
  3: {
    name: '골목 미로',
    startCoins: 100,
    map: [
      "..E......",  // row  0   E col2
      "..#......",  // row  1
      "..#......",  // row  2
      "..####...",  // row  3   path: col2→col5 (우)
      ".....#...",  // row  4
      "S....#...",  // row  5   S=방향표지판 col0
      ".....#...",  // row  6
      ".....####",  // row  7   path: col5→col8 (우)
      "........#",  // row  8
      "........#",  // row  9
      "..#######",  // row 10   path: col8→col2 (좌) ← col8도 '#' 포함
      "..#......",  // row 11
      "..#......",  // row 12
      "..####...",  // row 13   path: col2→col5 (우)
      ".....#...",  // row 14
      ".....B...",  // row 15   B col5
    ],
    waypoints: [
      [2,  0],  // 입구
      [2,  3],  // ↓ → 우회전
      [5,  3],  // → ↓
      [5,  7],  // ↓ → 우회전
      [8,  7],  // → ↓
      [8, 10],  // ↓ ← 좌회전
      [2, 10],  // ← ↓
      [2, 13],  // ↓ → 우회전
      [5, 13],  // → ↓
      [5, 15],  // 기지
    ],
    waves: [
      { startDelay:  500, enemies:[{ type:'pickpocket',  count:4, interval:1200 },
                                   { type:'swift_thief', count:2, interval:2000 }] },
      { startDelay: 2000, enemies:[{ type:'thug',        count:3, interval:2000 },
                                   { type:'swift_thief', count:3, interval:1500 }] },
      { startDelay: 2000, enemies:[{ type:'club_thug',   count:2, interval:3000 },
                                   { type:'swift_thief', count:4, interval:1200 }] },
      { startDelay: 2000, enemies:[{ type:'thug',        count:3, interval:1800 },
                                   { type:'club_thug',   count:2, interval:2500 },
                                   { type:'shadow_boss', count:1, interval:8000 }] },
    ],
    clearRewards: { firstGold:100, firstGem:25, retryGold:30, retryGem:0 },
  },

  // ───────────────────────────────────────────────────────────
  //  스테이지 4: 광산
  //  (도화선/폭파범 로직은 추후 구현; F 타일은 시각적 표시)
  //  주의: F 타일은 절대 경로('#') 위에 올 수 없음
  // ───────────────────────────────────────────────────────────
  4: {
    name: '광산',
    startCoins: 120,
    map: [
      "..E......",  // row  0   E col2
      "..#......",  // row  1
      "..#####..",  // row  2   path: col2→col6 (우)
      "......#..",  // row  3
      ".F....#F.",  // row  4   F col1,col7; path col6
      "......#..",  // row  5
      "....###..",  // row  6   path: col6→col4 (좌)
      ".F..#..F.",  // row  7   F col1,col7; path col4
      "....#....",  // row  8
      ".F..#..F.",  // row  9   F col1,col7; path col4
      "....#....",  // row 10
      "....#####",  // row 11   path: col4→col8 (우)
      "........#",  // row 12
      ".F....F.#",  // row 13   F col1,col6; path col8
      "........#",  // row 14
      "........B",  // row 15   B col8
    ],
    waypoints: [
      [2,  0],  // 입구
      [2,  2],  // ↓ → 우회전
      [6,  2],  // → ↓
      [6,  6],  // ↓ ← 좌회전
      [4,  6],  // ← ↓
      [4, 11],  // ↓ → 우회전
      [8, 11],  // → ↓
      [8, 15],  // 기지
    ],
    // 도화선 위치 정확히 8개 (경로 위 없음)
    fusePositions: [
      [1,4],[7,4],
      [1,7],[7,7],
      [1,9],[7,9],
      [1,13],[6,13],
    ],
    waves: [
      { startDelay:  500, enemies:[{ type:'pickpocket', count:3, interval:1500 },
                                   { type:'bomber',     count:2, interval:3000 }] },
      { startDelay: 2000, enemies:[{ type:'thug',       count:3, interval:2000 },
                                   { type:'bomber',     count:2, interval:2500 }] },
      { startDelay: 2000, enemies:[{ type:'club_thug',  count:2, interval:3000 },
                                   { type:'bomber',     count:3, interval:2000 }] },
      { startDelay: 2000, enemies:[{ type:'thug_boss',  count:1, interval:8000 },
                                   { type:'bomber',     count:4, interval:1800 },
                                   { type:'club_thug',  count:2, interval:2500 }] },
    ],
    clearRewards: { firstGold:150, firstGem:35, retryGold:40, retryGem:0 },
  },
};
