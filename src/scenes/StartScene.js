class StartScene extends Phaser.Scene {
  constructor() { super({ key: 'StartScene' }); }

  create() {
    const W = DESIGN_WIDTH, H = DESIGN_HEIGHT;

    // ── 배경 ──────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x0d1a3a, 0x0d1a3a, 1);
    bg.fillRect(0, 0, W, H);

    // 별 파티클
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H - UI_HEIGHT);
      const r = Math.random() < 0.3 ? 2 : 1;
      const alpha = 0.3 + Math.random() * 0.7;
      const star = this.add.graphics();
      star.fillStyle(0xffffff, alpha);
      star.fillCircle(x, y, r);
      this.tweens.add({
        targets: star, alpha: { from: alpha, to: alpha * 0.2 },
        duration: 1000 + Math.random() * 2000,
        yoyo: true, repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Sine.InOut'
      });
    }

    // ── 제목 ──────────────────────────────────────────────────
    const titleGlow = this.add.graphics();
    const tg = { t: 0 };
    this.tweens.add({
      targets: tg, t: 1, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      onUpdate: () => {
        titleGlow.clear();
        titleGlow.fillStyle(0x4466ff, 0.06 + tg.t * 0.08);
        titleGlow.fillEllipse(W / 2, 150, 600, 120);
      }
    });

    this.add.text(W / 2, 110, 'TOWER', {
      fontSize: '72px', fill: '#ffffff',
      fontFamily: 'Arial Black, Arial',
      stroke: '#2244aa', strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(W / 2, 185, 'DEFENSE', {
      fontSize: '72px', fill: '#ffcc00',
      fontFamily: 'Arial Black, Arial',
      stroke: '#884400', strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(W / 2, 248, '왕국을 지켜라!', {
      fontSize: '22px', fill: '#aabbff',
      fontFamily: 'Arial Black, Arial',
      stroke: '#000033', strokeThickness: 4,
    }).setOrigin(0.5);

    // ── 타워 미리보기 ──────────────────────────────────────────
    const previewY = 320;
    const towerIcons = [
      { label: '궁수탑', color: 0xaa7733, desc: '단일 공격' },
      { label: '화염탑', color: 0xff4400, desc: '범위 화상' },
      { label: '얼음탑', color: 0x44aaff, desc: '감속 지원' },
    ];
    towerIcons.forEach((t, i) => {
      const ix = W / 2 - 160 + i * 160;
      const ig = this.add.graphics();
      ig.fillStyle(0xffffff, 0.07); ig.fillRoundedRect(ix - 48, previewY - 36, 96, 72, 10);
      ig.fillStyle(t.color, 0.9); ig.fillCircle(ix, previewY - 10, 22);
      ig.fillStyle(0xffffff, 0.3); ig.fillCircle(ix - 7, previewY - 17, 7);
      this.add.text(ix, previewY + 24, t.label, { fontSize: '13px', fill: '#ffffff', fontFamily: 'Arial' }).setOrigin(0.5);
      this.add.text(ix, previewY + 40, t.desc, { fontSize: '11px', fill: '#aaaaff', fontFamily: 'Arial' }).setOrigin(0.5);
      this.tweens.add({ targets: ig, y: { from: 0, to: -4 }, duration: 1200 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    });

    this.add.text(W / 2, previewY + 65, '+ 포격탑, 독탑, 번개탑 웨이브 클리어 시 해금', {
      fontSize: '12px', fill: '#7788aa', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // ── 게임 정보 ──────────────────────────────────────────────
    const infoY = 435;
    const infos = [
      { icon: '⚔', text: `${WAVE_DATA.length}개 웨이브`, col: W / 2 - 200 },
      { icon: '🏰', text: '기지 체력 20', col: W / 2 },
      { icon: '👾', text: '7종 적 등장', col: W / 2 + 200 },
    ];
    infos.forEach(({ icon, text, col }) => {
      this.add.text(col, infoY, icon + '  ' + text, {
        fontSize: '14px', fill: '#ccddff', fontFamily: 'Arial',
      }).setOrigin(0.5);
    });

    // ── 시작 버튼 ──────────────────────────────────────────────
    const btnX = W / 2, btnY = 510;
    const btnW = 220, btnH = 60;
    const btnBg = this.add.graphics();
    const bs = { t: 0 };

    this.tweens.add({
      targets: bs, t: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      onUpdate: () => {
        btnBg.clear();
        const glow = 0.15 + bs.t * 0.2;
        btnBg.fillStyle(0x44ff88, glow);
        btnBg.fillRoundedRect(btnX - btnW / 2 - 6, btnY - btnH / 2 - 6, btnW + 12, btnH + 12, 16);
        btnBg.fillStyle(0x1a6633, 1);
        btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
        btnBg.lineStyle(3, 0x44ff88, 0.9);
        btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
      }
    });

    const btnTxt = this.add.text(btnX, btnY, '게임 시작', {
      fontSize: '30px', fill: '#88ffcc',
      fontFamily: 'Arial Black, Arial',
      stroke: '#003322', strokeThickness: 5,
    }).setOrigin(0.5);

    const zone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive();
    zone.on('pointerover', () => btnTxt.setColor('#ffffff'));
    zone.on('pointerout',  () => btnTxt.setColor('#88ffcc'));
    zone.on('pointerdown', () => {
      this.tweens.killAll();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('GameScene'));
    });

    // ── 조작 힌트 ──────────────────────────────────────────────
    this.add.text(W / 2, 572, '타워 선택 → 잔디 위 탭/클릭으로 배치', {
      fontSize: '13px', fill: '#556677', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // 페이드인
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }
}
