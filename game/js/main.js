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

  // 定义音频清单 (匹配 assets/audio 目录)
  const AUDIO_MANIFEST = {
    bgm:  'assets/audio/bgm.mp3',
    hit:  'assets/audio/hit.mp3',
    miss: 'assets/audio/miss.mp3',
  };

  try {
    // 传入两个清单进行加载
    await AssetLoader.load(ASSET_MANIFEST, AUDIO_MANIFEST);
  } catch (e) {
    console.warn('资源加载失败（将使用占位符）', e);
  }

  btnStart.textContent = '开始游戏';
  btnStart.disabled = false;

  /* ── Game 实例 ── */
  const canvas = document.getElementById('gameCanvas');
  const game   = new Game(canvas);

  game.onGameOver = () => {
    AssetLoader.stop('bgm'); // 游戏结束停止 BGM
    const result = game.getResult();
    finalScore.textContent = result.score;
    finalCombo.textContent = result.maxCombo;
    showScreen('gameover');
  };

  /* ── 按钮绑定 ── */
  btnStart.addEventListener('click', () => {
    showScreen('game');
    AssetLoader.play('bgm', true); // 用户点击后播放 BGM 以绕过浏览器限制
    game.start();
  });

  btnHowto.addEventListener('click', () => showScreen('howto'));
  btnBack.addEventListener('click',  () => showScreen('start'));

  btnRestart.addEventListener('click', () => {
    showScreen('game');
    AssetLoader.play('bgm', true); // 重开时确保 BGM 播放
    game.start();
  });

  btnMenu.addEventListener('click', () => {
    game.stop();
    AssetLoader.stop('bgm'); // 返回菜单停止 BGM
    showScreen('start');
  });

  /* ── 防止移动端默认滚动 ── */
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
})();
