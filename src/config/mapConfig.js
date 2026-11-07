const TILE_SIZE = 48;
const MAP_COLS = 20;
const MAP_ROWS = 12;
const DESIGN_WIDTH = 960;
const UI_HEIGHT = 64;
const DESIGN_HEIGHT = MAP_ROWS * TILE_SIZE + UI_HEIGHT;

const TILE = { GRASS: 0, PATH: 1, SPAWN: 2, BASE: 3, TREE: 4 };

const MAP_DATA = [
  [0,0,4,0,0,0,0,0,4,0,0,0,0,4,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0],
  [2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,4,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,4,0,0],
  [0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,4,1,0,4,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,1,0,4,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,3],
  [0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,4,0,0],
];

const PATH_WAYPOINTS = [
  { col: 0,  row: 3 },
  { col: 4,  row: 3 },
  { col: 4,  row: 8 },
  { col: 9,  row: 8 },
  { col: 9,  row: 4 },
  { col: 14, row: 4 },
  { col: 14, row: 9 },
  { col: 19, row: 9 },
];

function buildPathDirections() {
  const dirs = {};
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const from = PATH_WAYPOINTS[i], to = PATH_WAYPOINTS[i + 1];
    if (from.row === to.row) {
      const dir = to.col > from.col ? 'right' : 'left';
      for (let c = Math.min(from.col, to.col); c <= Math.max(from.col, to.col); c++) dirs[`${c},${from.row}`] = dir;
    } else {
      const dir = to.row > from.row ? 'down' : 'up';
      for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r++) dirs[`${from.col},${r}`] = dir;
    }
  }
  return dirs;
}
const PATH_DIRECTIONS = buildPathDirections();
