/**
 * main.js
 * 入口：管理屏幕切换、资源清单定义及游戏生命周期
 */

// 1. 资源路径清单（请务必确保文件名与 GitHub 仓库一致，注意大小写）
const ASSET_MANIFEST = {
  images: {
    background: 'assets/images/backgrounds/bg.png',
    player:     'assets/images/player/player.png',
    normal:     'assets/images/monsters/normal.png',
    cloud:      'assets/images/monsters/cloud.png',
    boss:       'assets/images/monsters/boss.png'
  },
  audio: {
    bgm:  'assets/audio/bgm.mp3',   // 背景音乐
    hit:  'assets/audio/hit.mp3',   // 击中音效
    miss: 'assets/audio/miss.mp3'   // 漏怪音效
  }
};

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

  /* ── 屏幕切换函数 ── */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
  }

  /* ── 初始资源加载 ── */
  btnStart.textContent = '资源加载中…';
  btnStart.disabled = true;

  try {
    // 调用升级后的 AssetLoader.load
    await AssetLoader.load(ASSET_MANIFEST);
    console.log("所有资源加载成功");
  } catch (e) {
    console.error("资源加载出现部分错误:", e);
  }

  btnStart.textContent = '开始游戏';
  btnStart.disabled = false;

  /* ── Game 实例管理 ── */
  const canvas = document.getElementById('gameCanvas');
  const game   = new Game(canvas);

  game.onGameOver = () => {
    AssetLoader.stop('bgm'); // 游戏结束停止背景音乐
    const result = game.getResult();
    finalScore.textContent = result.score;
    finalCombo.textContent = result.maxCombo;
    showScreen('gameover');
  };

  /* ── 按钮事件绑定 ── */
  btnStart.addEventListener('click', () => {
    showScreen('game');
    // 关键：必须在用户点击后播放背景音乐
    AssetLoader.play('bgm', true); 
    game.start();
  });

  btnHowto.addEventListener('click', () => showScreen('howto'));
  btnBack.addEventListener('click',  () => showScreen('start'));

  btnRestart.addEventListener('click', () => {
    showScreen('game');
    AssetLoader.play('bgm', true);
    game.start();
  });

  btnMenu.addEventListener('click', () => {
    game.stop();
    AssetLoader.stop('bgm');
    showScreen('start');
  });

})();
