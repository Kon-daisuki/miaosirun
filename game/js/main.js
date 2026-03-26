/**
 * main.js
 */
(async () => {
  /* ── DOM 引用 ── */
  const screens = {
    start:    document.getElementById('screen-start'),
    howto:    document.getElementById('screen-howto'),
    game:     document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
    buff:     document.getElementById('buff-modal')
  };

  const btnStart   = document.getElementById('btn-start');
  const btnHowto   = document.getElementById('btn-howto');
  const btnBack    = document.getElementById('btn-back');
  const btnRestart = document.getElementById('btn-restart');
  const btnMenu    = document.getElementById('btn-menu');

  /* ── 屏幕切换函数 ── */
  function showScreen(name) {
    console.log("切换到屏幕:", name);
    // 隐藏所有屏幕
    Object.values(screens).forEach(s => {
      if(s) s.classList.remove('active');
    });
    // 显示目标屏幕
    if(screens[name]) {
      screens[name].classList.add('active');
    }
  }

  /* ── 资源加载 ── */
  if (btnStart) {
    btnStart.textContent = '加载中...';
    btnStart.disabled = true;
  }

  try {
    // 假设 ASSET_MANIFEST 在 assetLoader.js 里定义
    await AssetLoader.load(ASSET_MANIFEST);
    console.log("资源加载成功");
  } catch (e) {
    console.error("资源加载异常:", e);
  } finally {
    if (btnStart) {
      btnStart.textContent = '开始游戏';
      btnStart.disabled = false;
    }
  }

  /* ── 初始化游戏 ── */
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);

  game.onGameOver = () => {
    const result = game.getResult();
    document.getElementById('final-score').textContent = result.score;
    document.getElementById('final-combo').textContent = result.maxCombo;
    showScreen('gameover');
  };

  /* ── 按钮事件绑定 (增加空值保护) ── */
  if(btnStart) btnStart.onclick = () => { showScreen('game'); game.start(); };
  if(btnHowto) btnHowto.onclick = () => showScreen('howto');
  if(btnBack)  btnBack.onclick  = () => showScreen('start');
  if(btnRestart) btnRestart.onclick = () => { showScreen('game'); game.start(); };
  if(btnMenu) btnMenu.onclick = () => { game.stop(); showScreen('start'); };

  // 暴露给全局方便调试
  window.gameInstance = game;

  /* ── 基础交互保护 ── */
  document.addEventListener('contextmenu', e => e.preventDefault());
})();
