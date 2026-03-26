/**
 * main.js
 * 入口：屏幕切换 + 资源加载 + Game 实例管理
 */

(async () => {
  /* ── DOM 引用 ── */
  const screens = {
    start:    document.getElementById('screen-start'),
    howto:    document.getElementById('screen-howto'),
    game:     document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
  };

  const btnStart   = document.getElementById('btn-start');
  const btnHowto   = document.getElementById('btn-howto');
  const btnBack    = document.getElementById('btn-back');
  const btnRestart = document.getElementById('btn-restart');
  const btnMenu    = document.getElementById('btn-menu');
  const finalScore = document.getElementById('final-score');
  const finalCombo = document.getElementById('final-combo');

  /* ── 屏幕切换 ── */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  /* ── 资源加载 ── */
  btnStart.textContent = '加载中…';
  btnStart.disabled = true;

  try {
    await AssetLoader.load(ASSET_MANIFEST);
  } catch (e) {
    console.warn('资源加载失败（将使用占位符）', e);
  }

  btnStart.textContent = '开始游戏';
  btnStart.disabled = false;

  /* ── Game 实例 ── */
  const canvas = document.getElementById('gameCanvas');
  const game   = new Game(canvas);

  game.onGameOver = () => {
    const result = game.getResult();
    finalScore.textContent = result.score;
    finalCombo.textContent = result.maxCombo;
    showScreen('gameover');
  };

  /* ── 按钮绑定 ── */
  btnStart.addEventListener('click', () => {
    showScreen('game');
    game.start();
  });

  btnHowto.addEventListener('click', () => showScreen('howto'));
  btnBack.addEventListener('click',  () => showScreen('start'));

  btnRestart.addEventListener('click', () => {
    showScreen('game');
    game.start();
  });

  btnMenu.addEventListener('click', () => {
    game.stop();
    showScreen('start');
  });

  /* ── 防止移动端默认滚动 ── */
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
})();
