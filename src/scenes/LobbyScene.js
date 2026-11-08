class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this.save = null;
    this.currentTab = 'home';
    this.currentStageIdx = 1;
    this.tabObjects = [];
    this.contentObjects = [];
  }

  init(data) {
    this.save = loadSave();
    if (data && data.lastStage) this.currentStageIdx = data.lastStage;
    else this.currentStageIdx = this.save.lastStage || 1;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.drawTopBar();
    this.drawTabBar();
    this.showTab(this.currentTab);
    // 흰색 원형 커서
    this.cursorCircle = this.add.circle(0, 0, 7, 0xffffff, 0.9).setDepth(999);
    this.input.on('pointermove', (ptr) => {
      this.cursorCircle.setPosition(ptr.x, ptr.y);
    });
  }

  // ── 상단 재화 바 ──────────────────────────────────────────
  drawTopBar() {
    const W = DESIGN_WIDTH;
    // 배경
    this.add.rectangle(W/2, 25, W, 50, 0x0d0d1f).setDepth(10);
    // 골드
    this.goldIcon = this.add.text(10, 12, '🟡', {fontSize:'18px'}).setDepth(11);
    this.goldText = this.add.text(32, 12, `${this.save.gold}`, {
      fontSize:'16px', color:'#ffd700', fontFamily:'Arial'
    }).setDepth(11);
    // 보석
    this.gemIcon = this.add.text(W/2+10, 12, '💎', {fontSize:'18px'}).setDepth(11);
    this.gemText = this.add.text(W/2+32, 12, `${this.save.gems}`, {
      fontSize:'16px', color:'#88eeff', fontFamily:'Arial'
    }).setDepth(11);
  }

  refreshTopBar() {
    this.goldText.setText(`${this.save.gold}`);
    this.gemText.setText(`${this.save.gems}`);
  }

  // ── 하단 탭 바 ───────────────────────────────────────────
  drawTabBar() {
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;
    const barY = H - 44;
    const tabW = W / 3;

    this.add.rectangle(W/2, H-22, W, 44, 0x0d0d1f).setDepth(10);

    const tabs = [
      { id:'shop', label:'상점', x: tabW*0.5 },
      { id:'home', label:'홈',   x: tabW*1.5 },
      { id:'tower',label:'타워', x: tabW*2.5 },
    ];

    this.tabBtns = {};
    tabs.forEach(t => {
      const bg = this.add.rectangle(t.x, H-22, tabW-4, 40, 0x222244).setDepth(11).setInteractive();
      const lbl = this.add.text(t.x, H-22, t.label, {
        fontSize:'15px', color:'#aabbff', fontFamily:'Arial'
      }).setOrigin(0.5).setDepth(12);
      bg.on('pointerdown', () => this.showTab(t.id));
      this.tabBtns[t.id] = { bg, lbl };
    });
    this.highlightTab(this.currentTab);
  }

  highlightTab(id) {
    Object.entries(this.tabBtns).forEach(([tid, {bg, lbl}]) => {
      if (tid === id) {
        bg.setFillStyle(0x334488);
        lbl.setColor('#ffffff');
      } else {
        bg.setFillStyle(0x222244);
        lbl.setColor('#aabbff');
      }
    });
  }

  // ── 탭 전환 ──────────────────────────────────────────────
  showTab(id) {
    this.currentTab = id;
    this.highlightTab(id);
    this.contentObjects.forEach(o => o.destroy());
    this.contentObjects = [];

    if (id === 'home')  this.buildHomeTab();
    if (id === 'shop')  this.buildShopTab();
    if (id === 'tower') this.buildTowerTab();
  }

  // ── 홈 탭 ────────────────────────────────────────────────
  buildHomeTab() {
    const W = DESIGN_WIDTH;
    const contentTop = 55;
    const contentBot = DESIGN_HEIGHT - 50;
    const midX = W / 2;

    const stageCount = Object.keys(STAGE_DATA).length;
    // 스테이지 카드 영역 (중앙)
    const cardY = contentTop + 60;
    const cardH = 240;

    // 좌우 화살표
    const prevBtn = this.add.text(18, cardY + cardH/2, '◀', {
      fontSize:'28px', color:'#aabbff', fontFamily:'Arial'
    }).setOrigin(0.5).setInteractive();
    prevBtn.on('pointerdown', () => {
      if (this.currentStageIdx > 1) { this.currentStageIdx--; this.showTab('home'); }
    });
    this.contentObjects.push(prevBtn);

    const nextBtn = this.add.text(W-18, cardY + cardH/2, '▶', {
      fontSize:'28px', color:'#aabbff', fontFamily:'Arial'
    }).setOrigin(0.5).setInteractive();
    nextBtn.on('pointerdown', () => {
      if (this.currentStageIdx < stageCount) { this.currentStageIdx++; this.showTab('home'); }
    });
    this.contentObjects.push(nextBtn);

    // 스테이지 카드
    const si = this.currentStageIdx;
    const st = STAGE_DATA[si];
    const sv = this.save.stages[si];
    const isLocked = !sv.unlocked;

    const cardBg = this.add.rectangle(midX, cardY + cardH/2, W-60, cardH, isLocked ? 0x222222 : 0x162040).setDepth(1);
    this.contentObjects.push(cardBg);

    // 맵 미니 프리뷰
    this.drawMiniMap(midX, cardY + 80, si, isLocked);

    // 스테이지 번호/이름
    const nameCol = isLocked ? '#555566' : '#ffffff';
    const stageLabel = this.add.text(midX, cardY + cardH - 70,
      `스테이지 ${si}`, { fontSize:'14px', color:'#aabbff', fontFamily:'Arial' }
    ).setOrigin(0.5).setDepth(2);
    this.contentObjects.push(stageLabel);

    const stageName = this.add.text(midX, cardY + cardH - 50,
      st.name, { fontSize:'18px', color: nameCol, fontFamily:'Arial', fontStyle:'bold' }
    ).setOrigin(0.5).setDepth(2);
    this.contentObjects.push(stageName);

    // 별 표시
    const stars = sv.stars || 0;
    const starStr = '★'.repeat(stars) + '☆'.repeat(3-stars);
    const starText = this.add.text(midX, cardY + cardH - 24,
      starStr, { fontSize:'20px', color:'#ffd700', fontFamily:'Arial' }
    ).setOrigin(0.5).setDepth(2);
    this.contentObjects.push(starText);

    if (isLocked) {
      const lockText = this.add.text(midX, cardY + 80,
        '🔒', { fontSize:'48px' }
      ).setOrigin(0.5).setDepth(3);
      this.contentObjects.push(lockText);
    }

    // PLAY 버튼
    const playY = cardY + cardH + 50;
    const playBg = this.add.rectangle(midX, playY, 160, 50,
      isLocked ? 0x333333 : 0x2255cc
    ).setDepth(2);
    const playText = this.add.text(midX, playY,
      isLocked ? '잠김' : 'PLAY', {
        fontSize:'22px',
        color: isLocked ? '#555555' : '#ffffff',
        fontFamily:'Arial', fontStyle:'bold'
      }
    ).setOrigin(0.5).setDepth(3);

    if (!isLocked) {
      playBg.setInteractive();
      playBg.on('pointerover', () => playBg.setFillStyle(0x3366ee));
      playBg.on('pointerout',  () => playBg.setFillStyle(0x2255cc));
      playBg.on('pointerdown', () => {
        this.save.lastStage = si;
        writeSave(this.save);
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
          this.scene.start('GameScene', { stageId: si, save: this.save });
        });
      });
    } else {
      playBg.setInteractive();
      playBg.on('pointerdown', () => this.showToast('이전 스테이지를 클리어하세요'));
    }
    this.contentObjects.push(playBg, playText);
  }

  drawMiniMap(cx, cy, stageId, isLocked) {
    const st = STAGE_DATA[stageId];
    if (!st) return;
    const rows = st.map;
    const cols = rows[0].length;
    const tileW = Math.floor(140 / cols);
    const tileH = Math.floor(100 / rows.length);
    const startX = cx - (cols * tileW) / 2;
    const startY = cy - (rows.length * tileH) / 2;

    rows.forEach((rowStr, r) => {
      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        let color = 0x334433;
        if (ch === '#') color = 0xaa8844;
        if (ch === 'E') color = 0x44ff44;
        if (ch === 'B') color = 0xff4444;
        if (ch === '$') color = 0xffaa22;
        if (ch === 'S') color = 0x4444ff;
        if (ch === 'F') color = 0xff6600;
        if (isLocked) color = 0x111111;
        const rect = this.add.rectangle(
          startX + c * tileW + tileW/2,
          startY + r * tileH + tileH/2,
          tileW-1, tileH-1, color
        ).setDepth(2);
        this.contentObjects.push(rect);
      }
    });
  }

  // ── 상점 탭 ──────────────────────────────────────────────
  buildShopTab() {
    const W = DESIGN_WIDTH;
    const title = this.add.text(W/2, 70, '상점', {
      fontSize:'20px', color:'#ffffff', fontFamily:'Arial', fontStyle:'bold'
    }).setOrigin(0.5);
    this.contentObjects.push(title);

    const shopTowers = Object.values(TOWER_DEFS).filter(t => t.shopCost > 0);
    let cardY = 110;

    shopTowers.forEach(td => {
      const owned = this.save.ownedTowers.includes(td.id);
      const canAfford = this.save.gems >= td.shopCost;
      this.buildShopCard(W/2, cardY, td, owned, canAfford);
      cardY += 110;
    });
  }

  buildShopCard(x, y, td, owned, canAfford) {
    const W = DESIGN_WIDTH - 40;
    const bgColor = owned ? 0x2a2a2a : (canAfford ? 0x1a2a3a : 0x2a1a1a);
    const bg = this.add.rectangle(x, y, W, 95, bgColor).setDepth(1);
    this.contentObjects.push(bg);

    // 타워 아이콘
    const ico = this.add.circle(x - W/2 + 35, y, 28, td.color).setDepth(2);
    this.contentObjects.push(ico);

    const rarityColor = td.rarity === 'rare' ? '#88aaff' : '#aabbcc';
    const nameText = this.add.text(x - W/2 + 70, y - 22, td.name, {
      fontSize:'16px', color:'#ffffff', fontFamily:'Arial', fontStyle:'bold'
    }).setDepth(2);
    const rarityText = this.add.text(x - W/2 + 70, y, `[${td.rarity === 'rare' ? '레어' : '보통'}]`, {
      fontSize:'12px', color: rarityColor, fontFamily:'Arial'
    }).setDepth(2);
    this.contentObjects.push(nameText, rarityText);

    if (owned) {
      const ownedTxt = this.add.text(x + W/2 - 10, y, '보유중', {
        fontSize:'13px', color:'#88ff88', fontFamily:'Arial'
      }).setOrigin(1, 0.5).setDepth(2);
      this.contentObjects.push(ownedTxt);
    } else {
      const priceTxt = this.add.text(x + W/2 - 10, y, `💎 ${td.shopCost}`, {
        fontSize:'15px', color: canAfford ? '#88eeff' : '#ff6666', fontFamily:'Arial'
      }).setOrigin(1, 0.5).setDepth(2);
      this.contentObjects.push(priceTxt);

      bg.setInteractive();
      bg.on('pointerdown', () => this.onShopBuy(td));
    }
  }

  onShopBuy(td) {
    if (this.save.ownedTowers.includes(td.id)) {
      this.showToast('이미 보유 중입니다');
      return;
    }
    if (this.save.gems < td.shopCost) {
      this.showToast('보석이 부족합니다');
      return;
    }
    // 확인
    this.showConfirm(`보석 ${td.shopCost}개로 ${td.name}를 구매할까요?`, () => {
      this.save.gems -= td.shopCost;
      this.save.ownedTowers.push(td.id);
      writeSave(this.save);
      this.refreshTopBar();
      this.showTab('shop');
      this.showToast(`${td.name} 구매 완료!`);
    });
  }

  // ── 타워 탭 ──────────────────────────────────────────────
  buildTowerTab() {
    const W = DESIGN_WIDTH;
    const title = this.add.text(W/2, 70, '내 타워', {
      fontSize:'20px', color:'#ffffff', fontFamily:'Arial', fontStyle:'bold'
    }).setOrigin(0.5);
    this.contentObjects.push(title);

    const allTowers = Object.values(TOWER_DEFS);
    let cardY = 115;
    allTowers.forEach(td => {
      const owned = this.save.ownedTowers.includes(td.id);
      this.buildTowerCard(W/2, cardY, td, owned);
      cardY += 110;
    });
  }

  buildTowerCard(x, y, td, owned) {
    const W = DESIGN_WIDTH - 40;
    const lv = this.save.permUpgrades[td.id] || 0;
    const maxLv = td.upgrades ? td.upgrades.length - 1 : 0;
    const bgColor = owned ? 0x1a2a3a : 0x222222;
    const bg = this.add.rectangle(x, y, W, 95, bgColor).setDepth(1);
    this.contentObjects.push(bg);

    const ico = this.add.circle(x - W/2 + 35, y, 28, owned ? td.color : 0x444444).setDepth(2);
    this.contentObjects.push(ico);

    const nameCol = owned ? '#ffffff' : '#666666';
    const nameText = this.add.text(x - W/2 + 70, y - 20, td.name, {
      fontSize:'15px', color: nameCol, fontFamily:'Arial', fontStyle:'bold'
    }).setDepth(2);
    this.contentObjects.push(nameText);

    if (!owned) {
      const lockTxt = this.add.text(x - W/2 + 70, y + 2, '상점에서 구매', {
        fontSize:'12px', color:'#666688', fontFamily:'Arial'
      }).setDepth(2);
      this.contentObjects.push(lockTxt);
    } else {
      const lvTxt = this.add.text(x - W/2 + 70, y + 2, `Lv. ${lv+1}`, {
        fontSize:'13px', color:'#aaccff', fontFamily:'Arial'
      }).setDepth(2);
      this.contentObjects.push(lvTxt);

      if (lv < maxLv) {
        const upgCost = td.upgrades[lv+1].cost;
        const canUpg = this.save.gold >= upgCost;
        const upgBtn = this.add.rectangle(x + W/2 - 55, y, 90, 34,
          canUpg ? 0x224422 : 0x222222
        ).setDepth(2);
        const upgTxt = this.add.text(x + W/2 - 55, y, `업그레이드\n🟡${upgCost}`, {
          fontSize:'11px', color: canUpg ? '#88ff88' : '#555555',
          fontFamily:'Arial', align:'center'
        }).setOrigin(0.5).setDepth(3);
        this.contentObjects.push(upgBtn, upgTxt);

        if (canUpg) {
          upgBtn.setInteractive();
          upgBtn.on('pointerdown', () => this.onPermUpgrade(td));
        }
      } else {
        const maxTxt = this.add.text(x + W/2 - 55, y, '최대 레벨', {
          fontSize:'12px', color:'#ffaa44', fontFamily:'Arial'
        }).setOrigin(0.5).setDepth(2);
        this.contentObjects.push(maxTxt);
      }
    }
  }

  onPermUpgrade(td) {
    const lv = this.save.permUpgrades[td.id] || 0;
    const maxLv = td.upgrades ? td.upgrades.length - 1 : 0;
    if (lv >= maxLv) return;
    const cost = td.upgrades[lv+1].cost;
    if (this.save.gold < cost) { this.showToast('골드가 부족합니다'); return; }
    this.save.gold -= cost;
    this.save.permUpgrades[td.id] = lv + 1;
    writeSave(this.save);
    this.refreshTopBar();
    this.showTab('tower');
    this.showToast(`${td.name} 업그레이드 완료!`);
  }

  // ── 토스트 / 확인 팝업 ───────────────────────────────────
  showToast(msg) {
    const toast = this.add.text(DESIGN_WIDTH/2, DESIGN_HEIGHT - 100, msg, {
      fontSize:'14px', color:'#ffffff', backgroundColor:'#333355',
      padding:{x:14,y:8}, fontFamily:'Arial'
    }).setOrigin(0.5).setDepth(99);
    this.time.delayedCall(2000, () => { if (toast.active) toast.destroy(); });
  }

  showConfirm(msg, onYes) {
    const W = DESIGN_WIDTH, H = DESIGN_HEIGHT;
    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.6).setDepth(50).setInteractive();
    const box = this.add.rectangle(W/2, H/2, 280, 160, 0x1a1a3a).setDepth(51);
    const txt = this.add.text(W/2, H/2 - 30, msg, {
      fontSize:'14px', color:'#ffffff', fontFamily:'Arial',
      wordWrap:{width:250}, align:'center'
    }).setOrigin(0.5).setDepth(52);
    const yesBtn = this.add.rectangle(W/2 - 60, H/2 + 45, 100, 36, 0x224488).setDepth(51).setInteractive();
    const yesTxt = this.add.text(W/2 - 60, H/2 + 45, '확인', {
      fontSize:'15px', color:'#ffffff', fontFamily:'Arial'
    }).setOrigin(0.5).setDepth(52);
    const noBtn = this.add.rectangle(W/2 + 60, H/2 + 45, 100, 36, 0x442222).setDepth(51).setInteractive();
    const noTxt = this.add.text(W/2 + 60, H/2 + 45, '취소', {
      fontSize:'15px', color:'#ffffff', fontFamily:'Arial'
    }).setOrigin(0.5).setDepth(52);

    const closeAll = () => [overlay,box,txt,yesBtn,yesTxt,noBtn,noTxt].forEach(o=>o.destroy());
    yesBtn.on('pointerdown', () => { closeAll(); onYes(); });
    noBtn.on('pointerdown', closeAll);
    overlay.on('pointerdown', closeAll);
  }
}
