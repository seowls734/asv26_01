window.onload = function () {
  const config = {
    type: Phaser.CANVAS,  // Canvas 모드: file:// 로컬 이미지 CORS 제한 없음
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: '#0d0d1f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: document.body,
    },
    scene: [LobbyScene, GameScene],
  };
  new Phaser.Game(config);
};
