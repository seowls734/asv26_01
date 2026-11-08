class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─────────────────────────────────────────────────────────
  //  초기화
  // ─────────────────────────────────────────────────────────
  init(data) {
    this.stageId   = (data && data.stageId) ? data.stageId : 1;
    this.saveData  = (data && data.save)    ? data.save    : loadSave();
    this.stageConf = STAGE_DATA[this.stageId];

    // 인게임 재화 / 상태
    this.coins      = this.stageConf.startCoins;
    this.waveIndex  = 0;
    this.waveActive = false;
    this.gameOver   = false;
    this.cleared    = false;
    this.pauseOpen  = false;

    // 오브젝트 목록
    this.towers   = [];
    this.enemies  = [];
    this.knights  = [];

    // 클리어 시 지급할 임시 보상
    this.pendingGold = 0;
    this.pendingGems = 0;

    // 스테이지 4: 도화선 상태 (index = fusePositions 인덱스)
    this.fuseStates = [];
    if (this.stageId === 4 && this.stageConf.fusePositions) {
      this.fuseStates = this.stageConf.fusePositions.map(() => ({
        ignited: false, igniting: false, igniteTimer: 0,
      }));
    }

    // 맵 타일 상태 (원본 복사본 — 타워 설치 시 'T' 로 덮음)
    this.mapState = this.stageConf.map.map(row => row.split(''));

    // 웨이포인트 → 픽셀 중심 좌표
    const rawWP = this.stageConf.waypoints || this.stageConf.waypointsA || [];
    this.waypoints = rawWP.map(([c, r]) => ({
      x: c * TILE_SIZE + TILE_SIZE / 2,
      y: GRID_Y + r * TILE_SIZE + TILE_SIZE / 2,
    }));

    // 스폰 큐
    this.spawnQueue    = [];
    this.spawnPointer  = 0;
    this.spawnStartTime = 0;

    // 팝업
    this.popupObjects  = [];
    this._popupHandled = false;   // 팝업 버튼 클릭 후 전역 입력 차단 플래그

    // 배속 (1 or 2)
    this.speedMultiplier = 1;

    // ID 카운터
    this.eidCounter = 0;
    this.tidCounter = 0;
  }

  // ─────────────────────────────────────────────────────────
  //  에셋 로드 (init 이후, create 이전)
  // ─────────────────────────────────────────────────────────
  preload() {
    // 스테이지 1 배경
    if (this.stageId === 1 && !this.textures.exists('stage1_bg')) {
      const bg = document.getElementById('img_stage1_bg');
      if (bg && bg.naturalWidth > 0) this.textures.addImage('stage1_bg', bg);
      else this.load.image('stage1_bg', 'src/assets/image.png');
    }
    // 타워 텍스처 (Canvas 모드: img 요소 직접 등록)
    if (!this.textures.exists('tower_torch')) {
      const t = document.getElementById('img_tower_torch');
      if (t && t.naturalWidth > 0) this.textures.addImage('tower_torch', t);
      else this.load.image('tower_torch', 'src/assets/tower_torch.png');
    }
    // 좀도둑 스프라이트 시트 — 흰 배경 제거를 위해 plain image로 먼저 로드
    if (!this.textures.exists('pickpocket_walk') && !this.textures.exists('pickpocket_walk_src')) {
      this.load.image('pickpocket_walk_src', 'src/assets/enemy_pickpocket_walk.png');
    }
    // 단일 프레임 폴백
    if (!this.textures.exists('pickpocket_still')) {
      const p = document.getElementById('img_enemy_pickpocket');
      if (p && p.naturalWidth > 0) this.textures.addImage('pickpocket_still', p);
      else this.load.image('pickpocket_still', 'src/assets/enemy_pickpocket.png');
    }
  }

  // ─────────────────────────────────────────────────────────
  //  씬 생성
  // ─────────────────────────────────────────────────────────
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    // 흰 배경 제거 처리 (에러 시 무시하고 계속)
    try { this.processSpritesheetBg(); } catch(e) { console.warn('processSpritesheetBg failed:', e); }
    this.renderMap();
    this.buildHUD();
    this.bindInput();
    this.showWaveButton();
    // 좀도둑 걷기 애니메이션 (processSpritesheetBg 이후)
    if (this.textures.exists('pickpocket_walk') && !this.anims.exists('pickpocket_walk')) {
      this.anims.create({
        key: 'pickpocket_walk',
        frames: this.anims.generateFrameNumbers('pickpocket_walk', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  //  스프라이트 흰 배경 제거
  // ─────────────────────────────────────────────────────────
  processSpritesheetBg() {
    const removeWhite = (source) => {
      const w = source.naturalWidth || source.width;
      const h = source.naturalHeight || source.height;
      if (!w || !h) return null;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(source, 0, 0);
      // getImageData는 file:// 에서 보안 에러가 날 수 있음 → 실패하면 null 반환
      let id;
      try { id = ctx.getImageData(0, 0, w, h); } catch(e) { return null; }
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 210 && d[i+1] > 210 && d[i+2] > 210) d[i+3] = 0;
      }
      ctx.putImageData(id, 0, 0);
      return c;
    };

    // 좀도둑 걷기 스프라이트 시트
    try {
      if (this.textures.exists('pickpocket_walk_src') && !this.textures.exists('pickpocket_walk')) {
        const img = this.textures.get('pickpocket_walk_src').source[0].image;
        const canvas = removeWhite(img);
        if (canvas) {
          const fw = Math.floor(canvas.width / 4);
          this.textures.addSpriteSheet('pickpocket_walk', canvas, { frameWidth: fw, frameHeight: canvas.height });
        }
      }
    } catch(e) { console.warn('pickpocket_walk bg removal failed:', e); }

    // 횃불 궁수 타워
    try {
      if (this.textures.exists('tower_torch')) {
        const img = this.textures.get('tower_torch').source[0].image;
        const canvas = removeWhite(img);
        if (canvas) {
          this.textures.remove('tower_torch');
          this.textures.addCanvas('tower_torch', canvas);
        }
      }
    } catch(e) { console.warn('tower_torch bg removal failed:', e); }

    // 좀도둑 단일 이미지
    try {
      if (this.textures.exists('pickpocket_still')) {
        const img = this.textures.get('pickpocket_still').source[0].image;
        const canvas = removeWhite(img);
        if (canvas) {
          this.textures.remove('pickpocket_still');
          this.textures.addCanvas('pickpocket_still', canvas);
        }
      }
    } catch(e) { console.warn('pickpocket_still bg removal failed:', e); }
  }

  // ─────────────────────────────────────────────────────────
  //  매 프레임 업데이트
  // ─────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.gameOver || this.cleared || this.pauseOpen) return;
    const spd = this.speedMultiplier;
    this.stepSpawn(time);
    this.stepEnemies(delta * spd);
    this.stepTowers(time);
    this.stepKnights(time, delta * spd);
    if (this.stageId === 4) this.stepFuses(delta * spd);
    this.checkWaveEnd();
  }

  // ─────────────────────────────────────────────────────────
  //  맵 렌더링
  // ─────────────────────────────────────────────────────────
  renderMap() {
    this.tileGraphics = [];
    // 배경 이미지가 실제로 로드된 경우에만 이미지 맵 모드 사용
    const isImgMap = (this.stageId === 1) && this.textures.exists('stage1_bg');

    // ── 스테이지 1: 픽셀아트 배경 이미지 (텍스처 존재 확인 후 표시)
    if (isImgMap && this.textures.exists('stage1_bg')) {
      this.add.image(
        DESIGN_WIDTH / 2,
        GRID_Y + (GRID_ROWS * TILE_SIZE) / 2,
        'stage1_bg'
      )
      .setDisplaySize(DESIGN_WIDTH, GRID_ROWS * TILE_SIZE)
      .setDepth(-1);
    }

    // ── 베이스 타일
    // 이미지 맵이면 완전 투명(이미지가 배경), 아니면 불투명한 색상 블록
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const ch = this.stageConf.map[r][c];
        const cx = c * TILE_SIZE + TILE_SIZE / 2;
        const cy = GRID_Y + r * TILE_SIZE + TILE_SIZE / 2;
        const rect = this.add.rectangle(
          cx, cy, TILE_SIZE, TILE_SIZE,
          this.tileColor(ch, c, r),
          isImgMap ? 0 : 1
        ).setDepth(0);
        this.tileGraphics.push({ rect, col: c, row: r });
      }
    }

    // ── 장식 레이어
    this.drawMapDecorations();

    // ── 그리드 라인 (이미지 맵에서는 매우 연하게)
    const gl = this.add.graphics().setDepth(2);
    gl.lineStyle(1, 0x000000, isImgMap ? 0.07 : 0.22);
    for (let c = 0; c <= GRID_COLS; c++)
      gl.lineBetween(c * TILE_SIZE, GRID_Y, c * TILE_SIZE, GRID_Y + GRID_ROWS * TILE_SIZE);
    for (let r = 0; r <= GRID_ROWS; r++)
      gl.lineBetween(0, GRID_Y + r * TILE_SIZE, GRID_COLS * TILE_SIZE, GRID_Y + r * TILE_SIZE);

    // ── 입구/기지 라벨 (스테이지2 입구 2개 대응)
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const ch = this.stageConf.map[r][c];
        const px = c * TILE_SIZE + TILE_SIZE / 2;
        const py = GRID_Y + r * TILE_SIZE + TILE_SIZE / 2;
        if (ch === 'E') this.add.text(px, py + 10, '입구', { fontSize:'8px', color:'#ccffcc', fontFamily:'Arial', fontStyle:'bold' }).setOrigin(0.5).setDepth(3);
        if (ch === 'B') this.add.text(px, py + 10, '기지', { fontSize:'8px', color:'#ffcccc', fontFamily:'Arial', fontStyle:'bold' }).setOrigin(0.5).setDepth(3);
      }
    }
  }

  tileColor(ch, c, r) {
    switch (ch) {
      case '#': return 0x9e876a;    // 콘크리트/골목길
      case 'E': return 0x1a7a2e;    // 진한 초록 입구
      case 'B': return 0x8a1818;    // 진한 빨강 기지
      case '$': return 0x7a5000;    // 어두운 황토 노점
      case '+': return 0x8a7860;    // 광장
      case 'S': return 0x1a3388;    // 진한 파랑 표지판
      case 'F': return 0x6a2800;    // 어두운 주황-갈색 도화선
      default:  return (c + r) % 2 === 0 ? 0x1c2e3c : 0x162434; // 도시 블록 (짙은 남색)
    }
  }

  drawMapDecorations() {
    const map      = this.stageConf.map;
    const isImgMap = (this.stageId === 1) && this.textures.exists('stage1_bg');
    // 이미지 맵에서는 픽셀아트가 모든 시각 정보를 제공 → 장식 스킵
    if (isImgMap) return;
    const dg = this.add.graphics().setDepth(1);

    const isPath = (r, c) => {
      if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return false;
      const ch = map[r][c];
      return ch === '#' || ch === 'E' || ch === 'B';
    };

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const ch = map[r][c];
        const tx = c * TILE_SIZE;             // 타일 좌상단 x
        const ty = GRID_Y + r * TILE_SIZE;    // 타일 좌상단 y
        const mx = tx + TILE_SIZE / 2;        // 중심 x
        const my = ty + TILE_SIZE / 2;        // 중심 y

        // ─── 경로(#): 이미지 맵에서는 스킵
        if (ch === '#' && !isImgMap) {
          const up    = isPath(r - 1, c);
          const down  = isPath(r + 1, c);
          const left  = isPath(r, c - 1);
          const right = isPath(r, c + 1);

          // 상단·좌측 하이라이트
          dg.fillStyle(0xd4b080, 0.55);
          if (!up)   dg.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, 3);
          if (!left) dg.fillRect(tx + 2, ty + 2, 3, TILE_SIZE - 4);
          // 하단·우측 그림자
          dg.fillStyle(0x443322, 0.55);
          if (!down)  dg.fillRect(tx + 2, ty + TILE_SIZE - 5, TILE_SIZE - 4, 3);
          if (!right) dg.fillRect(tx + TILE_SIZE - 5, ty + 2, 3, TILE_SIZE - 4);

          // 직선 구간에만 중앙 점선
          const hLine = (left || right) && !up && !down;
          const vLine = (up || down) && !left && !right;
          dg.fillStyle(0xc8a870, 0.28);
          if (hLine) dg.fillRect(tx + 2, my - 1, TILE_SIZE - 4, 2);
          if (vLine) dg.fillRect(mx - 1, ty + 2, 2, TILE_SIZE - 4);
        }

        // ─── 입구(E): 초록 테두리 + 아래방향 화살표
        if (ch === 'E') {
          dg.lineStyle(2, 0x55ff88, 0.9);
          dg.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          dg.fillStyle(0x88ffaa, 0.95);
          dg.fillTriangle(mx - 7, my - 7, mx + 7, my - 7, mx, my + 2);
        }

        // ─── 기지(B): 빨강 테두리 + 방패 모양
        if (ch === 'B') {
          dg.lineStyle(2, 0xff5555, 0.9);
          dg.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          dg.fillStyle(0xff9999, 0.95);
          dg.fillRect(mx - 7, my - 8, 14, 10);
          dg.fillTriangle(mx - 7, my + 2, mx + 7, my + 2, mx, my + 10);
        }

        // ─── 노점($): 황금 테두리 + 동전 기호
        if (ch === '$') {
          dg.lineStyle(2, 0xffcc44, 0.9);
          dg.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          // 동전 외곽
          dg.fillStyle(0xffdd55, 0.9);
          dg.fillCircle(mx, my - 2, 7);
          dg.fillStyle(0x7a5000, 1.0);
          dg.fillCircle(mx, my - 2, 4);
          // ₩ 대신 세로줄
          dg.fillStyle(0xffdd55, 0.9);
          dg.fillRect(mx - 1, my - 8, 2, 12);
          dg.fillRect(mx - 4, my + 4, 8, 2);
        }

        // ─── 표지판(S): 파란 테두리 + 화살표
        if (ch === 'S') {
          dg.lineStyle(2, 0x88aaff, 0.9);
          dg.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          dg.fillStyle(0x88aaff, 0.95);
          dg.fillRect(mx - 8, my - 1, 11, 2);
          dg.fillTriangle(mx + 2, my - 5, mx + 10, my, mx + 2, my + 5);
        }

        // ─── 도화선(F): 주황 테두리 + 지그재그 선
        if (ch === 'F') {
          dg.lineStyle(2, 0xff8800, 0.9);
          dg.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          dg.lineStyle(2, 0xffaa44, 0.9);
          dg.beginPath();
          dg.moveTo(tx + 5,  my + 2);
          dg.lineTo(tx + 12, my - 5);
          dg.lineTo(tx + 19, my + 2);
          dg.lineTo(tx + 26, my - 5);
          dg.lineTo(tx + 33, my + 2);
          dg.strokePath();
        }

        // ─── 건물 타일(.): 이미지 맵에서는 스킵
        if (ch === '.' && !isImgMap) {
          dg.lineStyle(1, 0x000000, 0.12);
          dg.strokeRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        }
      }
    }
  }

  findTile(ch) {
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < GRID_COLS; c++)
        if (this.stageConf.map[r][c] === ch)
          return { col: c, row: r,
            px: c * TILE_SIZE + TILE_SIZE / 2,
            py: GRID_Y + r * TILE_SIZE + TILE_SIZE / 2 };
    return null;
  }

  getTileAt(col, row) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
    return this.mapState[row][col];
  }

  canBuild(col, row) {
    const ch = this.getTileAt(col, row);
    return ch !== null && !NO_BUILD_TILES.has(ch) && ch !== 'T';
  }

  // ─────────────────────────────────────────────────────────
  //  HUD
  // ─────────────────────────────────────────────────────────
  buildHUD() {
    const W = DESIGN_WIDTH;
    // 상단 HUD 배경
    this.add.rectangle(W / 2, HUD_HEIGHT / 2, W, HUD_HEIGHT, 0x0d0d1f).setDepth(10);

    // 일시정지 버튼
    const exitBtn = this.add.text(26, HUD_HEIGHT / 2, '일시정지', {
      fontSize: '11px', color: '#ff6666', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.onPause());

    // 코인 표시
    this.coinText = this.add.text(W / 2, HUD_HEIGHT / 2, `코인: ${this.coins}`, {
      fontSize: '16px', color: '#ffd700', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(11);

    // 웨이브 카운터
    this.waveText = this.add.text(W - 8, HUD_HEIGHT / 2,
      `웨이브 0/${this.stageConf.waves.length}`, {
        fontSize: '13px', color: '#aabbff', fontFamily: 'Arial',
      }
    ).setOrigin(1, 0.5).setDepth(11);

    // 스테이지 4: 도화선 카운터
    if (this.stageId === 4) {
      this.fuseCountText = this.add.text(W / 2, HUD_HEIGHT / 2 + 16,
        '도화선 0/8', {
          fontSize: '12px', color: '#ff6600', fontFamily: 'Arial', fontStyle: 'bold',
        }
      ).setOrigin(0.5).setDepth(11);
    }

    // 하단 버튼 Y (그리드 아래 중앙)
    this.bottomBarY = GRID_Y + GRID_ROWS * TILE_SIZE + 20;

    // 2배속 버튼 (우하단)
    const speedY = this.bottomBarY;
    const speedX = DESIGN_WIDTH - 28;
    this.speedBtn = this.add.text(speedX, speedY, '2x', {
      fontSize: '14px', color: '#aaaaff', fontFamily: 'Arial', fontStyle: 'bold',
      backgroundColor: '#1a1a3a', padding: { x: 7, y: 5 },
    }).setOrigin(0.5).setDepth(15).setInteractive({ useHandCursor: true });
    this.speedBtn.on('pointerdown', () => this.toggleSpeed());
  }

  toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    if (this.speedMultiplier === 2) {
      this.speedBtn.setText('1x');
      this.speedBtn.setColor('#ffff44');
    } else {
      this.speedBtn.setText('2x');
      this.speedBtn.setColor('#aaaaff');
    }
  }

  updateHUD() {
    this.coinText.setText(`코인: ${this.coins}`);
    this.waveText.setText(`웨이브 ${this.waveIndex}/${this.stageConf.waves.length}`);
    if (this.fuseCountText) {
      const lit = this.fuseStates.filter(f => f.ignited).length;
      this.fuseCountText.setText(`도화선 ${lit}/8`);
      this.fuseCountText.setColor(lit >= 6 ? '#ff2200' : '#ff6600');
    }
  }

  showWaveButton() {
    this.hideWaveButton();
    const W = DESIGN_WIDTH, y = this.bottomBarY;
    const bg  = this.add.rectangle(W / 2, y, 190, 42, 0x1a4499).setDepth(15).setInteractive({ useHandCursor: true });
    const txt = this.add.text(W / 2, y, `웨이브 ${this.waveIndex + 1} 시작 ▶`, {
      fontSize: '15px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(16);
    bg.on('pointerdown', () => this.startNextWave());
    this.waveBtnObj = [bg, txt];
  }

  hideWaveButton() {
    if (this.waveBtnObj) {
      this.waveBtnObj.forEach(o => o.destroy());
      this.waveBtnObj = null;
    }
  }

  // ─────────────────────────────────────────────────────────
  //  입력 바인딩
  // ─────────────────────────────────────────────────────────
  bindInput() {
    // 전역 포인터다운 — 타일 탭 처리
    // 팝업 버튼이 먼저 처리 → _popupHandled=true 설정 후 여기서 차단
    this.input.on('pointerdown', (ptr) => {
      if (this.gameOver || this.cleared || this.pauseOpen) return;

      // 팝업 버튼 클릭 직후라면 타일 처리 건너뜀
      if (this._popupHandled) {
        this._popupHandled = false;
        return;
      }

      // 팝업이 열려있으면 닫기만 (오버레이가 직접 닫지 못한 경우 대비)
      if (this.popupObjects.length > 0) {
        this.closePopup();
        return;
      }

      // 그리드 영역 체크
      const col = Math.floor(ptr.x / TILE_SIZE);
      const row = Math.floor((ptr.y - GRID_Y) / TILE_SIZE);
      if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;

      const ch = this.getTileAt(col, row);
      if (ch === 'T') {
        // 기존 타워 → 업그레이드/판매 팝업
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower) this.showTowerPopup(tower);
      } else if (this.canBuild(col, row)) {
        // 빈 타일 → 타워 설치 팝업
        this.showBuildPopup(col, row);
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  팝업 공통
  // ─────────────────────────────────────────────────────────
  closePopup() {
    this.popupObjects.forEach(o => { if (o && o.active) o.destroy(); });
    this.popupObjects = [];
  }

  // 팝업 버튼 클릭 시 호출 — 전역 입력 한 번 차단
  _closedByButton() {
    this.closePopup();
    this._popupHandled = true;
  }

  // ─────────────────────────────────────────────────────────
  //  타워 설치 팝업
  // ─────────────────────────────────────────────────────────
  showBuildPopup(col, row) {
    this.closePopup();
    const W  = DESIGN_WIDTH;
    const tx = col * TILE_SIZE + TILE_SIZE / 2;
    const ty = GRID_Y + row * TILE_SIZE + TILE_SIZE / 2;

    // 반투명 오버레이 (클릭 시 닫기)
    const overlay = this.add.rectangle(W / 2, DESIGN_HEIGHT / 2, W, DESIGN_HEIGHT, 0x000000, 0.45)
      .setDepth(20).setInteractive();
    overlay.on('pointerdown', () => this.closePopup());
    this.popupObjects.push(overlay);

    const available = (this.saveData.ownedTowers || []).map(id => TOWER_DEFS[id]).filter(Boolean);
    if (available.length === 0) return;

    const panelH = available.length * 56 + 16;
    let panelX = W / 2;
    let panelY = ty - panelH / 2;
    panelY = Math.max(panelY, GRID_Y + 10);
    panelY = Math.min(panelY, DESIGN_HEIGHT - panelH - 10);

    const panelBg = this.add.rectangle(panelX, panelY + panelH / 2, 174, panelH, 0x101030, 0.95)
      .setDepth(21);
    this.popupObjects.push(panelBg);

    available.forEach((td, i) => {
      const by = panelY + 8 + i * 56 + 28;
      const canAfford = this.coins >= td.cost;
      const btnBg = this.add.rectangle(panelX, by, 162, 48, canAfford ? 0x1a3a5a : 0x2e1a1a)
        .setDepth(22).setInteractive({ useHandCursor: canAfford });
      const ico  = this.add.circle(panelX - 62, by, 16, td.color).setDepth(23);
      const name = this.add.text(panelX - 42, by - 11, td.name, {
        fontSize: '12px', color: '#ffffff', fontFamily: 'Arial',
      }).setDepth(23);
      const price = this.add.text(panelX - 42, by + 3, `코인 ${td.cost}`, {
        fontSize: '11px', color: canAfford ? '#ffd700' : '#ff5555', fontFamily: 'Arial',
      }).setDepth(23);
      this.popupObjects.push(btnBg, ico, name, price);

      if (canAfford) {
        btnBg.on('pointerdown', () => {
          this.buildTower(col, row, td.id);
          this._closedByButton();
        });
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  타워 업그레이드/판매 팝업
  // ─────────────────────────────────────────────────────────
  showTowerPopup(tower) {
    this.closePopup();
    const W  = DESIGN_WIDTH;
    const tx = tower.col * TILE_SIZE + TILE_SIZE / 2;
    const ty = GRID_Y + tower.row * TILE_SIZE + TILE_SIZE / 2;
    const td = TOWER_DEFS[tower.type];
    const lv = tower.inGameLevel;
    const maxLv = td.upgrades ? td.upgrades.length - 1 : 0;

    const overlay = this.add.rectangle(W / 2, DESIGN_HEIGHT / 2, W, DESIGN_HEIGHT, 0x000000, 0.45)
      .setDepth(20).setInteractive();
    overlay.on('pointerdown', () => this.closePopup());
    this.popupObjects.push(overlay);

    let panelX = W / 2;
    let panelY = ty - 70;
    panelY = Math.max(panelY, GRID_Y + 10);
    panelY = Math.min(panelY, DESIGN_HEIGHT - 160);

    const panelBg = this.add.rectangle(panelX, panelY + 65, 174, 130, 0x101030, 0.95).setDepth(21);
    const title   = this.add.text(panelX, panelY + 10, `${td.name} Lv.${lv + 1}`, {
      fontSize: '13px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(22);
    this.popupObjects.push(panelBg, title);

    // 업그레이드 버튼
    if (lv < maxLv) {
      const upgCost = td.upgrades[lv + 1].cost;
      const canUpg  = this.coins >= upgCost;
      const upgBg  = this.add.rectangle(panelX, panelY + 55, 154, 36, canUpg ? 0x1a3a1a : 0x2e1a1a).setDepth(22).setInteractive({ useHandCursor: canUpg });
      const upgTxt = this.add.text(panelX, panelY + 55, `업그레이드  코인 ${upgCost}`, {
        fontSize: '11px', color: canUpg ? '#88ff88' : '#ff5555', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(23);
      this.popupObjects.push(upgBg, upgTxt);
      if (canUpg) {
        upgBg.on('pointerdown', () => {
          this.upgradeTower(tower);
          this._closedByButton();
        });
      }
    } else {
      const maxTxt = this.add.text(panelX, panelY + 55, '최대 레벨', {
        fontSize: '12px', color: '#ffaa44', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(22);
      this.popupObjects.push(maxTxt);
    }

    // 판매 버튼 (설치 비용의 50% 환급)
    const sellAmt = Math.floor(td.cost / 2);
    const sellBg  = this.add.rectangle(panelX, panelY + 100, 154, 36, 0x3a1010).setDepth(22).setInteractive({ useHandCursor: true });
    const sellTxt = this.add.text(panelX, panelY + 100, `판매 (+코인 ${sellAmt})`, {
      fontSize: '11px', color: '#ff8888', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(23);
    this.popupObjects.push(sellBg, sellTxt);
    sellBg.on('pointerdown', () => {
      this.sellTower(tower);
      this._closedByButton();
    });
  }

  // ─────────────────────────────────────────────────────────
  //  타워 설치 / 업그레이드 / 판매
  // ─────────────────────────────────────────────────────────
  buildTower(col, row, typeId) {
    const td = TOWER_DEFS[typeId];
    if (!td || this.coins < td.cost) return;

    this.coins -= td.cost;
    this.mapState[row][col] = 'T';
    this.updateHUD();

    // 타일 색 업데이트 + 장식 레이어 덮기 (depth 2 오버레이)
    const tg = this.tileGraphics.find(t => t.col === col && t.row === row);
    if (tg) tg.rect.setFillStyle(0x243040);
    const coverX = col * TILE_SIZE + TILE_SIZE / 2;
    const coverY = GRID_Y + row * TILE_SIZE + TILE_SIZE / 2;
    const coverAlpha = (this.stageId === 1) ? 0.55 : 1;
    const coverRect = this.add.rectangle(coverX, coverY, TILE_SIZE, TILE_SIZE, 0x243040, coverAlpha).setDepth(2);

    const permLv = (this.saveData.permUpgrades || {})[typeId] || 0;
    const tower = {
      id: this.tidCounter++,
      type: typeId,
      col, row,
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: GRID_Y + row * TILE_SIZE + TILE_SIZE / 2,
      inGameLevel: permLv,
      lastFire:   0,
      lastSummon: this.time.now,   // 첫 소환을 summonInterval 뒤로 미룸
      lastHack:   this.time.now,
      lastBlock:  this.time.now,
      isStallTile: (this.stageConf.map[row][col] === '$'),
      coverRect,
      graphics: [],
    };
    this.towers.push(tower);
    this.drawTower(tower);
  }

  drawTower(tower) {
    tower.graphics.forEach(g => { if (g && g.active) g.destroy(); });
    tower.graphics = [];

    const td = TOWER_DEFS[tower.type];
    const { x, y, inGameLevel: lv } = tower;

    const size = TILE_SIZE - 4;  // 36px

    // 텍스처 이미지가 있는 타워 (torch_archer)
    if (tower.type === 'torch_archer' && this.textures.exists('tower_torch')) {
      const img = this.add.image(x, y, 'tower_torch')
        .setDisplaySize(size, size).setDepth(5);
      const lvBg  = this.add.circle(x + 10, y + 10, 7, 0x000000, 0.75).setDepth(6);
      const lvTxt = this.add.text(x + 10, y + 10, String(lv + 1), {
        fontSize: '10px', color: '#ffdd55', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7);
      tower.graphics.push(img, lvBg, lvTxt);
      return;
    }

    // 그 외 타워: 도형으로 그림
    const ringColor = td.rarity === 'rare' ? 0x8899ff : 0xaaaacc;
    const ring = this.add.circle(x, y, 18, ringColor).setDepth(5);
    const body = this.add.circle(x, y, 15, td.color).setDepth(5);
    const iconGfx = this.add.graphics().setDepth(6);
    this.drawTowerIcon(iconGfx, tower.type, x, y);
    const lvBg  = this.add.circle(x + 10, y + 10, 7, 0x000000, 0.75).setDepth(6);
    const lvTxt = this.add.text(x + 10, y + 10, String(lv + 1), {
      fontSize: '10px', color: '#ffdd55', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7);

    tower.graphics.push(ring, body, iconGfx, lvBg, lvTxt);
  }

  drawTowerIcon(gfx, type, x, y) {
    switch (type) {
      case 'torch_archer':
        // 불꽃 (삼각형 3겹)
        gfx.fillStyle(0xffee00, 1);
        gfx.fillTriangle(x, y - 10, x - 6, y + 2, x + 6, y + 2);
        gfx.fillStyle(0xff7700, 1);
        gfx.fillTriangle(x, y - 7, x - 4, y + 2, x + 4, y + 2);
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillTriangle(x, y - 3, x - 2, y + 2, x + 2, y + 2);
        break;
      case 'knight_tower':
        // 검 (날 + 가드 + 손잡이)
        gfx.fillStyle(0xddeeff, 1);
        gfx.fillRect(x - 2, y - 10, 4, 14);  // 날
        gfx.fillStyle(0x9999bb, 1);
        gfx.fillRect(x - 8, y + 1, 16, 3);   // 가드
        gfx.fillStyle(0x775533, 1);
        gfx.fillRect(x - 1, y + 4, 3, 5);    // 손잡이
        break;
      case 'hacker':
        // 모니터 화면 + 커서
        gfx.fillStyle(0x001a11, 1);
        gfx.fillRect(x - 8, y - 7, 16, 11);  // 화면
        gfx.fillStyle(0x00ff88, 1);
        gfx.fillRect(x - 6, y - 5, 9, 2);    // 텍스트줄 1
        gfx.fillRect(x - 6, y - 2, 6, 2);    // 텍스트줄 2
        gfx.fillRect(x - 6, y + 1, 4, 2);    // 텍스트줄 3
        gfx.fillStyle(0x00ffcc, 1);
        gfx.fillRect(x + 2, y + 1, 2, 3);    // 커서
        break;
      case 'mc_tower':
        // 벽돌 2×2
        gfx.fillStyle(0xcc9966, 1);
        gfx.fillRect(x - 8, y - 7, 7, 6);
        gfx.fillRect(x + 1, y - 7, 7, 6);
        gfx.fillRect(x - 8, y + 0, 7, 6);
        gfx.fillRect(x + 1, y + 0, 7, 6);
        gfx.lineStyle(1, 0x000000, 0.4);
        gfx.strokeRect(x - 8, y - 7, 16, 13);
        gfx.lineBetween(x - 8, y, x + 8, y);
        gfx.lineBetween(x, y - 7, x, y + 6);
        break;
    }
  }

  upgradeTower(tower) {
    const td = TOWER_DEFS[tower.type];
    const lv = tower.inGameLevel;
    if (lv >= td.upgrades.length - 1) return;
    const cost = td.upgrades[lv + 1].cost;
    if (this.coins < cost) return;
    this.coins -= cost;
    tower.inGameLevel++;
    this.updateHUD();
    this.drawTower(tower);
  }

  sellTower(tower) {
    const td = TOWER_DEFS[tower.type];
    this.coins += Math.floor(td.cost / 2);

    // 타일 원상복구
    const origCh = this.stageConf.map[tower.row][tower.col];
    this.mapState[tower.row][tower.col] = origCh;
    const tg = this.tileGraphics.find(t => t.col === tower.col && t.row === tower.row);
    if (tg) tg.rect.setFillStyle(this.tileColor(origCh, tower.col, tower.row));

    if (tower.coverRect && tower.coverRect.active) tower.coverRect.destroy();
    tower.graphics.forEach(g => { if (g && g.active) g.destroy(); });
    this.towers = this.towers.filter(t => t.id !== tower.id);
    this.updateHUD();
  }

  // ─────────────────────────────────────────────────────────
  //  웨이브 관리
  // ─────────────────────────────────────────────────────────
  startNextWave() {
    if (this.waveActive) return;
    if (this.waveIndex >= this.stageConf.waves.length) return;

    this.hideWaveButton();
    this.waveActive = true;
    this.waveIndex++;
    this.updateHUD();

    const wave = this.stageConf.waves[this.waveIndex - 1];
    this.spawnQueue   = [];
    this.spawnPointer = 0;

    let delay = (wave.startDelay || 0);
    (wave.enemies || []).forEach(group => {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({ type: group.type, time: delay });
        delay += group.interval;
      }
    });
    this.spawnQueue.sort((a, b) => a.time - b.time);
    this.spawnStartTime = this.time.now;
  }

  stepSpawn(now) {
    if (!this.waveActive) return;
    const elapsed = now - this.spawnStartTime;
    while (this.spawnPointer < this.spawnQueue.length &&
           elapsed >= this.spawnQueue[this.spawnPointer].time) {
      this.spawnEnemy(this.spawnQueue[this.spawnPointer].type);
      this.spawnPointer++;
    }
  }

  spawnEnemy(typeId) {
    const def = ENEMY_DEFS[typeId];
    if (!def) { console.warn('Unknown enemy type:', typeId); return; }

    const wp0 = this.waypoints[0];
    const enemy = {
      id: this.eidCounter++,
      type: typeId,
      def,
      x: wp0.x, y: wp0.y,
      waypointIdx: 1,
      hp: def.hp, maxHp: def.hp,
      burnTimer:       0,
      burnDps:         0,
      hacked:          false,
      hackAttackTimer: 0,
      dying:           false,
      gfx:    null,
      hpBar:  null,
    };

    enemy.facing = 'right';  // 방향 추적

    if (typeId === 'pickpocket') {
      const displaySize = def.size * 3;
      if (this.textures.exists('pickpocket_walk')) {
        // 스프라이트 시트 애니메이션
        const sp = this.add.sprite(wp0.x, wp0.y, 'pickpocket_walk')
          .setDisplaySize(displaySize, displaySize).setDepth(7);
        sp.play('pickpocket_walk');
        enemy.gfx = sp;
      } else if (this.textures.exists('pickpocket_still')) {
        // 단일 이미지
        const img = this.add.image(wp0.x, wp0.y, 'pickpocket_still')
          .setDisplaySize(displaySize, displaySize).setDepth(7);
        enemy.gfx = img;
      } else {
        // 폴백: 그래픽
        const egfx = this.add.graphics().setDepth(7);
        this.drawEnemyShape(egfx, typeId, def);
        egfx.setPosition(wp0.x, wp0.y);
        enemy.gfx = egfx;
      }
    } else {
      const egfx = this.add.graphics().setDepth(7);
      this.drawEnemyShape(egfx, typeId, def);
      egfx.setPosition(wp0.x, wp0.y);
      enemy.gfx = egfx;
    }
    enemy.hpBar = this.add.rectangle(wp0.x, wp0.y - def.size - 5, def.size * 2, 4, 0x00ff00).setDepth(8);
    this.enemies.push(enemy);
  }

  drawEnemyShape(gfx, typeId, def) {
    const r = def.size;
    gfx.fillStyle(def.color, 1);
    switch (typeId) {
      case 'pickpocket':
        // 다이아몬드
        gfx.fillTriangle(0, -r, -r, 0, r, 0);
        gfx.fillTriangle(-r, 0, r, 0, 0, r);
        break;
      case 'bag_thief':
        // 오각형 느낌 원 + 가방 사각
        gfx.fillCircle(0, 0, r);
        gfx.fillStyle(0x000000, 0.35);
        gfx.fillRect(-Math.round(r*0.4), Math.round(r*0.1), Math.round(r*0.8), Math.round(r*0.6));
        break;
      case 'thug':
        // 사각형 (두꺼운 체형)
        gfx.fillRect(-r, -r, r * 2, r * 2);
        gfx.fillStyle(0x000000, 0.25);
        gfx.fillRect(-r + 2, -r + 2, r * 2 - 4, r * 2 - 4);
        break;
      case 'thug_boss':
        // 큰 원 + 가시 4방향
        gfx.fillCircle(0, 0, r);
        gfx.fillStyle(0xffffff, 0.45);
        gfx.fillTriangle(0, -r - 5, -4, -r + 2, 4, -r + 2);
        gfx.fillTriangle(0, r + 5, -4, r - 2, 4, r - 2);
        gfx.fillTriangle(-r - 5, 0, -r + 2, -4, -r + 2, 4);
        gfx.fillTriangle(r + 5, 0, r - 2, -4, r - 2, 4);
        break;
      case 'club_thug':
        // 삼각형 (망치형)
        gfx.fillTriangle(0, -r, -r, r, r, r);
        break;
      case 'swift_thief':
        // 화살 쐐기
        gfx.fillTriangle(r, 0, -r, -Math.round(r * 0.7), -r, Math.round(r * 0.7));
        gfx.fillStyle(0xffffff, 0.5);
        gfx.fillTriangle(r - 4, 0, -r + 2, -Math.round(r * 0.4), -r + 2, Math.round(r * 0.4));
        break;
      case 'bomber':
        // 원 + 도화선 + 불꽃
        gfx.fillCircle(0, 2, r);
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillRect(-2, -r, 4, r);
        gfx.fillStyle(0xffee00, 1);
        gfx.fillCircle(0, -r - 3, 3);
        break;
      case 'shadow_boss':
        // 큰 원 + 반달 그림자
        gfx.fillCircle(0, 0, r);
        gfx.fillStyle(0x000000, 0.6);
        gfx.fillCircle(-Math.round(r * 0.25), -Math.round(r * 0.1), Math.round(r * 0.72));
        break;
      default:
        gfx.fillCircle(0, 0, r);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  적 이동
  // ─────────────────────────────────────────────────────────
  stepEnemies(delta) {
    const dt = delta / 1000;

    this.enemies.forEach(en => {
      if (en.dying) return;

      // 화상 틱
      if (en.burnTimer > 0) {
        en.burnTimer -= delta;
        en.hp -= en.burnDps * dt;
        if (en.hp <= 0) { this.killEnemy(en, null); return; }
      }

      if (en.hacked) {
        this.stepHackedEnemy(en, dt);
      } else {
        // 기지 도달 체크
        if (en.waypointIdx >= this.waypoints.length) {
          en.dying = true;
          if (en.gfx)         en.gfx.destroy();
          if (en.hpBar)       en.hpBar.destroy();
          if (en.hackOverlay) en.hackOverlay.destroy();
          if (en.burnOverlay) en.burnOverlay.destroy();
          this.onBaseReached();
          return;
        }

        // 웨이포인트 이동
        const wp   = this.waypoints[en.waypointIdx];
        const dx   = wp.x - en.x, dy = wp.y - en.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spd  = en.def.speed * TILE_SIZE * dt;

        // 방향 갱신 (수평 이동 시에만)
        if (Math.abs(dx) > 2) en.facing = dx > 0 ? 'right' : 'left';

        if (dist <= spd) {
          en.x = wp.x; en.y = wp.y;
          en.waypointIdx++;
        } else {
          en.x += (dx / dist) * spd;
          en.y += (dy / dist) * spd;
        }
      }

      // 그래픽 갱신
      if (en.gfx) {
        en.gfx.setPosition(en.x, en.y);
        // 좀도둑 텍스처면 방향에 따라 플립
        if (en.type === 'pickpocket' && en.gfx.setFlipX) {
          en.gfx.setFlipX(en.facing === 'left');
        }
      }
      if (en.hackOverlay && en.hackOverlay.active) en.hackOverlay.setPosition(en.x, en.y);
      if (en.burnOverlay && en.burnOverlay.active) en.burnOverlay.setPosition(en.x, en.y);
      if (en.hpBar) {
        const r = Math.max(0, en.hp / en.maxHp);
        en.hpBar.setPosition(en.x, en.y - en.def.size - 5);
        en.hpBar.setSize(en.def.size * 2 * r, 4);
        en.hpBar.setFillStyle(r > 0.5 ? 0x00ff00 : r > 0.25 ? 0xffaa00 : 0xff0000);
      }
    });

    this.enemies = this.enemies.filter(en => !en.dying);
  }

  stepHackedEnemy(en, dt) {
    // 역방향 이동
    const prevIdx = en.waypointIdx - 2;
    if (prevIdx < 0) {
      en.dying = true;
      if (en.gfx)        en.gfx.destroy();
      if (en.hpBar)       en.hpBar.destroy();
      if (en.hackOverlay) en.hackOverlay.destroy();
      if (en.burnOverlay) en.burnOverlay.destroy();
      return;
    }
    const wp   = this.waypoints[Math.max(0, prevIdx)];
    const dx   = wp.x - en.x, dy = wp.y - en.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spd  = en.def.speed * TILE_SIZE * dt;
    if (dist <= spd) {
      en.x = wp.x; en.y = wp.y;
      en.waypointIdx = Math.max(0, en.waypointIdx - 1);
    } else {
      en.x += (dx / dist) * spd;
      en.y += (dy / dist) * spd;
    }

    // 역행 중 주변 적 공격 (2초마다, 근접 1타일 내 1마리)
    en.hackAttackTimer += dt;
    if (en.hackAttackTimer >= 2.0) {
      en.hackAttackTimer = 0;
      const nearby = this.enemies.find(
        t => !t.dying && !t.hacked && t !== en &&
             Math.hypot(t.x - en.x, t.y - en.y) < TILE_SIZE * 1.5
      );
      if (nearby) {
        this.applyDamage(nearby, en.def.hp * 0.1 + 5, null);
        this.showHitEffect(nearby.x, nearby.y, 0x00ffaa);
      }
    }
  }

  onBaseReached() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.enemies.forEach(en => {
      en.dying = true;
      if (en.gfx)   en.gfx.destroy();
      if (en.hpBar) en.hpBar.destroy();
    });
    this.knights.forEach(k => { if (k.gfx && k.gfx.active) k.gfx.destroy(); });
    this.showGameOver();
  }

  // ─────────────────────────────────────────────────────────
  //  타워 공격 로직
  // ─────────────────────────────────────────────────────────
  stepTowers(now) {
    this.towers.forEach(tower => {
      switch (tower.type) {
        case 'torch_archer': this.stepTorchArcher(tower, now); break;
        case 'knight_tower': this.stepKnightTower(tower, now); break;
        case 'hacker':       this.stepHacker(tower, now);      break;
      }
    });
  }

  stepTorchArcher(tower, now) {
    const td  = TOWER_DEFS.torch_archer;
    const lv  = tower.inGameLevel;
    if (now - tower.lastFire < td.fireInterval) return;

    const range  = td.range * TILE_SIZE;
    const target = this.mostAdvancedEnemyInRange(tower.x, tower.y, range);
    if (!target) return;

    tower.lastFire = now;
    this.applyDamage(target, td.upgrades[lv].damage, tower);
    this.applyBurn(target, td.burnDuration, td.burnDps);

    // 번짐: 인접 1마리에게도 화상
    if (td.spreadCount > 0) {
      this.enemies
        .filter(en => !en.dying && !en.hacked && en !== target &&
                      Math.hypot(en.x - target.x, en.y - target.y) < TILE_SIZE * 1.8)
        .slice(0, td.spreadCount)
        .forEach(en => this.applyBurn(en, td.burnDuration, td.burnDps));
    }

    this.showLineEffect(tower.x, tower.y, target.x, target.y, 0xff6600);
  }

  stepKnightTower(tower, now) {
    const td = TOWER_DEFS.knight_tower;
    if (now - tower.lastSummon < td.summonInterval) return;
    tower.lastSummon = now;

    const knight = {
      id: this.eidCounter++,
      towerRef: tower,
      x: tower.x, y: tower.y,
      birthTime: now,
      lastAttack: now,
      lv: tower.inGameLevel,
      gfx: this.add.rectangle(tower.x, tower.y, 18, 22, 0x8899ff).setDepth(7),
    };
    this.knights.push(knight);
  }

  stepHacker(tower, now) {
    const td    = TOWER_DEFS.hacker;
    const lv    = tower.inGameLevel;
    const intv  = td.upgrades[lv].hackInterval;
    if (now - tower.lastHack < intv) return;

    // 보스 제외 비해킹 적 중 랜덤 선택
    const eligible = this.enemies.filter(en => !en.dying && !en.hacked && !en.def.isBoss);
    if (eligible.length === 0) return;

    tower.lastHack = now;
    const tgt = eligible[Math.floor(Math.random() * eligible.length)];
    tgt.hacked = true;
    // Graphics objects don't have setFillStyle; use an overlay circle instead
    if (tgt.hackOverlay) tgt.hackOverlay.destroy();
    tgt.hackOverlay = this.add.circle(tgt.x, tgt.y, (tgt.def.size || 12) + 3, 0x00ffaa, 0.4).setDepth(8);
    this.showFloatingText(tgt.x, tgt.y, 'HACK!', '#00ffaa');
  }

  // ─────────────────────────────────────────────────────────
  //  기사 로직
  // ─────────────────────────────────────────────────────────
  stepKnights(now, delta) {
    const dt = delta / 1000;
    const td = TOWER_DEFS.knight_tower;

    this.knights = this.knights.filter(k => {
      // 수명 초과 → 제거
      if (now - k.birthTime > td.knightDuration) {
        if (k.gfx && k.gfx.active) k.gfx.destroy();
        return false;
      }

      const range  = td.range * TILE_SIZE;
      const target = this.mostAdvancedEnemyInRange(k.x, k.y, range);

      if (target) {
        // 적 추적
        const dx = target.x - k.x, dy = target.y - k.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spd  = 2.5 * TILE_SIZE * dt;
        if (dist > TILE_SIZE * 0.5) {
          k.x += (dx / dist) * spd;
          k.y += (dy / dist) * spd;
        }
        // 근접 공격
        if (now - k.lastAttack >= td.knightFireInterval) {
          k.lastAttack = now;
          this.applyDamage(target, td.upgrades[k.lv].knightDamage, null);
          this.showHitEffect(target.x, target.y, 0x8899ff);
        }
      }

      if (k.gfx && k.gfx.active) k.gfx.setPosition(k.x, k.y);
      return true;
    });
  }

  // ─────────────────────────────────────────────────────────
  //  대미지 / 상태이상
  // ─────────────────────────────────────────────────────────
  applyDamage(enemy, dmg, tower) {
    if (!enemy || enemy.dying) return;
    enemy.hp -= dmg;
    if (enemy.hp <= 0) this.killEnemy(enemy, tower);
  }

  applyBurn(enemy, duration, dps) {
    if (!enemy || enemy.dying) return;
    enemy.burnTimer = Math.max(enemy.burnTimer, duration);
    enemy.burnDps   = Math.max(enemy.burnDps, dps);
    // Graphics objects don't have setStrokeStyle; use an overlay circle
    if (!enemy.burnOverlay) {
      enemy.burnOverlay = this.add.circle(enemy.x, enemy.y, (enemy.def.size || 12) + 2, 0xff4400, 0.3).setDepth(8);
    }
  }

  killEnemy(enemy, tower) {
    if (enemy.dying) return;
    enemy.dying = true;
    if (enemy.gfx         && enemy.gfx.active)         enemy.gfx.destroy();
    if (enemy.hpBar       && enemy.hpBar.active)        enemy.hpBar.destroy();
    if (enemy.hackOverlay && enemy.hackOverlay.active)  enemy.hackOverlay.destroy();
    if (enemy.burnOverlay && enemy.burnOverlay.active)  enemy.burnOverlay.destroy();

    const def = enemy.def;
    this.coins += def.coinReward;

    // 노점 보너스 (+5 코인)
    if (tower && tower.isStallTile) {
      this.coins += 5;
      this.showFloatingText(tower.x, tower.y - 20, '+5', '#ffcc00');
    }

    // 골드 / 보석 (클리어 시 지급)
    if (def.goldReward > 0 && Math.random() < (def.goldDropChance || 1)) {
      this.pendingGold += def.goldReward;
      this.showFloatingText(enemy.x, enemy.y - 20, `G+${def.goldReward}`, '#ffd700');
    }
    if (def.gemReward > 0) {
      this.pendingGems += def.gemReward;
    }

    this.updateHUD();
    this.showDeathEffect(enemy.x, enemy.y, def.color);
  }

  // 사거리 내에서 가장 많이 진행한(웨이포인트 번호 높은) 적 반환
  mostAdvancedEnemyInRange(ox, oy, range) {
    let best = null, bestIdx = -1;
    this.enemies.forEach(en => {
      if (en.dying || en.hacked) return;
      if (Math.hypot(en.x - ox, en.y - oy) <= range && en.waypointIdx > bestIdx) {
        best = en; bestIdx = en.waypointIdx;
      }
    });
    return best;
  }

  // ─────────────────────────────────────────────────────────
  //  웨이브 종료 체크
  // ─────────────────────────────────────────────────────────
  checkWaveEnd() {
    if (!this.waveActive) return;
    // 아직 스폰할 적이 남아있으면 대기
    if (this.spawnPointer < this.spawnQueue.length) return;
    // 살아있는 (해킹 제외) 적이 있으면 대기
    const alive = this.enemies.filter(en => !en.dying && !en.hacked);
    if (alive.length > 0) return;

    this.waveActive = false;

    if (this.waveIndex >= this.stageConf.waves.length) {
      this.onAllWavesCleared();
    } else {
      this.showWaveButton();
    }
  }

  // ─────────────────────────────────────────────────────────
  //  비주얼 이펙트
  // ─────────────────────────────────────────────────────────
  showLineEffect(x1, y1, x2, y2, color) {
    const g = this.add.graphics().setDepth(9);
    g.lineStyle(2, color, 0.9);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    this.time.delayedCall(80, () => { if (g.active) g.destroy(); });
  }

  showHitEffect(x, y, color) {
    const c = this.add.circle(x, y, 8, color, 0.8).setDepth(9);
    this.tweens.add({ targets: c, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
      onComplete: () => { if (c.active) c.destroy(); } });
  }

  showDeathEffect(x, y, color) {
    const c = this.add.circle(x, y, 12, color, 0.9).setDepth(9);
    this.tweens.add({ targets: c, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 300,
      onComplete: () => { if (c.active) c.destroy(); } });
  }

  showFloatingText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontSize: '12px', color: color || '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900,
      onComplete: () => { if (t.active) t.destroy(); } });
  }

  // ─────────────────────────────────────────────────────────
  //  스테이지 4: 도화선
  // ─────────────────────────────────────────────────────────
  stepFuses(delta) {
    const fp = this.stageConf.fusePositions;
    if (!fp) return;

    fp.forEach((pos, i) => {
      const fs = this.fuseStates[i];
      if (fs.ignited) return;

      // 폭파범이 이 도화선 옆에 있으면 점화 시작
      const [fc, fr] = pos;
      const fpx = fc * TILE_SIZE + TILE_SIZE / 2;
      const fpy = GRID_Y + fr * TILE_SIZE + TILE_SIZE / 2;

      const bomber = this.enemies.find(en =>
        !en.dying && !en.hacked && en.type === 'bomber' &&
        Math.hypot(en.x - fpx, en.y - fpy) < TILE_SIZE * 1.2
      );

      if (bomber && !fs.igniting) {
        fs.igniting = true;
        fs.igniteTimer = 0;
      }
      if (!bomber && fs.igniting) {
        // 폭파범 사라지면 점화 중단
        fs.igniting = false;
        fs.igniteTimer = 0;
      }
      if (fs.igniting) {
        fs.igniteTimer += delta;
        if (fs.igniteTimer >= 3000) {
          fs.igniting = false;
          fs.ignited  = true;
          this.updateHUD();
          // 도화선 타일 위에 덮어씌우는 오버레이 (장식 레이어를 가림)
          const fpx2 = fc * TILE_SIZE + TILE_SIZE / 2;
          const fpy2 = GRID_Y + fr * TILE_SIZE + TILE_SIZE / 2;
          this.add.rectangle(fpx2, fpy2, TILE_SIZE, TILE_SIZE, 0xff2200).setDepth(3);
          this.add.text(fpx2, fpy2, '🔥', { fontSize: '18px' }).setOrigin(0.5).setDepth(4);

          // 8개 모두 점화 → 패배
          if (this.fuseStates.every(f => f.ignited)) {
            this.showFloatingText(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 60, '폭발!!', '#ff2200');
            this.time.delayedCall(600, () => this.onBaseReached());
          }
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  클리어
  // ─────────────────────────────────────────────────────────
  onAllWavesCleared() {
    this.cleared = true;
    const sv      = this.saveData.stages[this.stageId];
    const isFirst = !sv.firstClear;
    const rew     = this.stageConf.clearRewards;
    const gold    = (isFirst ? rew.firstGold : rew.retryGold) + this.pendingGold;
    const gems    = (isFirst ? rew.firstGem  : rew.retryGem)  + this.pendingGems;

    // 저장 업데이트
    sv.cleared    = true;
    sv.firstClear = true;
    sv.stars      = Math.min(3, (sv.stars || 0) + 1);
    this.saveData.gold += gold;
    this.saveData.gems += gems;
    // 다음 스테이지 해금
    const nextSv = this.saveData.stages[this.stageId + 1];
    if (nextSv) nextSv.unlocked = true;
    writeSave(this.saveData);

    this.showClearScreen(gold, gems, isFirst);
  }

  showClearScreen(gold, gems, isFirst) {
    const W = DESIGN_WIDTH, H = DESIGN_HEIGHT;
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78).setDepth(30);
    this.add.text(W/2, H/2 - 110, 'CLEAR!', {
      fontSize: '44px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    if (isFirst) {
      this.add.text(W/2, H/2 - 60, '첫 클리어!', {
        fontSize: '18px', color: '#88ffaa', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(31);
    }

    let ry = H/2 - 20;
    if (gold > 0) {
      this.add.text(W/2, ry, `골드 +${gold}`, { fontSize:'18px', color:'#ffd700', fontFamily:'Arial' }).setOrigin(0.5).setDepth(31);
      ry += 32;
    }
    if (gems > 0) {
      this.add.text(W/2, ry, `보석 +${gems}`, { fontSize:'18px', color:'#88eeff', fontFamily:'Arial' }).setOrigin(0.5).setDepth(31);
      ry += 32;
    }

    // 로비 버튼
    const lobbyBg = this.add.rectangle(W/2, H/2 + 90, 190, 46, 0x1a4499)
      .setDepth(31).setInteractive({ useHandCursor: true });
    this.add.text(W/2, H/2 + 90, '로비로 돌아가기', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(32);
    lobbyBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () =>
        this.scene.start('LobbyScene', { lastStage: this.stageId })
      );
    });
  }

  // ─────────────────────────────────────────────────────────
  //  패배
  // ─────────────────────────────────────────────────────────
  showGameOver() {
    const W = DESIGN_WIDTH, H = DESIGN_HEIGHT;
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78).setDepth(30);
    this.add.text(W/2, H/2 - 70, '패배...', {
      fontSize: '38px', color: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W/2, H/2 - 20, '적이 기지에 도달했습니다', {
      fontSize: '14px', color: '#ffaaaa', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(31);

    const retryBg = this.add.rectangle(W/2, H/2 + 45, 160, 46, 0x3a1010)
      .setDepth(31).setInteractive({ useHandCursor: true });
    this.add.text(W/2, H/2 + 45, '다시 시도', {
      fontSize: '17px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(32);
    retryBg.on('pointerdown', () =>
      this.scene.restart({ stageId: this.stageId, save: this.saveData })
    );

    const lobbyBg = this.add.rectangle(W/2, H/2 + 105, 160, 46, 0x1a3a66)
      .setDepth(31).setInteractive({ useHandCursor: true });
    this.add.text(W/2, H/2 + 105, '로비로', {
      fontSize: '17px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(32);
    lobbyBg.on('pointerdown', () =>
      this.scene.start('LobbyScene', { lastStage: this.stageId })
    );
  }

  // ─────────────────────────────────────────────────────────
  //  일시정지
  // ─────────────────────────────────────────────────────────
  onPause() {
    if (this.pauseOpen || this.gameOver || this.cleared) return;
    this.pauseOpen = true;

    // 모든 움직임 / 트윈 정지
    this.tweens.pauseAll();

    const W = DESIGN_WIDTH, H = DESIGN_HEIGHT;
    const objs = [];

    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.65)
      .setDepth(40).setInteractive();
    objs.push(overlay);

    objs.push(this.add.text(W/2, H/2 - 65, '일시정지', {
      fontSize: '26px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41));

    const closeAll = () => {
      objs.forEach(o => { if (o && o.active) o.destroy(); });
      this.tweens.resumeAll();
      this.pauseOpen = false;
    };

    // 계속하기
    const resumeBg = this.add.rectangle(W/2, H/2 + 5, 170, 46, 0x1a4499)
      .setDepth(41).setInteractive({ useHandCursor: true });
    const resumeTxt = this.add.text(W/2, H/2 + 5, '계속하기', {
      fontSize: '17px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(42);
    resumeBg.on('pointerdown', closeAll);
    objs.push(resumeBg, resumeTxt);

    // 로비로 나가기
    const exitBg = this.add.rectangle(W/2, H/2 + 65, 170, 46, 0x3a1010)
      .setDepth(41).setInteractive({ useHandCursor: true });
    const exitTxt = this.add.text(W/2, H/2 + 65, '나가기 (로비)', {
      fontSize: '15px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(42);
    exitBg.on('pointerdown', () =>
      this.scene.start('LobbyScene', { lastStage: this.stageId })
    );
    objs.push(exitBg, exitTxt);
  }
}
