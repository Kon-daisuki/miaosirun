/**
 * main.js
 */
const ASSET_MANIFEST = {
  images: {
    background: 'assets/images/backgrounds/bg.png',
    player:     'assets/images/player/player.png',
    // 修复关键：去掉 monster_ 前缀，确保与 game.js 逻辑匹配
    normal:     'assets/images/monsters/normal.png', 
    cloud:      'assets/images/monsters/cloud.png',
    boss:       'assets/images/monsters/boss.png'
  },
  audio: {
    bgm:  'assets/audio/bgm.mp3',
    hit:  'assets/audio/hit.mp3',
    miss: 'assets/audio/miss.mp3'
  }
};

(async () => {
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

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
  }

  btnStart.textContent = '加载中…';
  btnStart.disabled = true;

  try {
    await AssetLoader.load(ASSET_MANIFEST);
  } catch (e) {
    console.warn('部分资源加载失败', e);
  }

  btnStart.textContent = '开始游戏';
  btnStart.disabled = false;

  const canvas = document.getElementById('gameCanvas');
  const game   = new Game(canvas);

  game.onGameOver = () => {
    AssetLoader.stop('bgm'); // 停止音乐
    const result = game.getResult();
    finalScore.textContent = result.score;
    finalCombo.textContent = result.maxCombo;
    showScreen('gameover');
  };

  btnStart.addEventListener('click', () => {
    showScreen('game');
    AssetLoader.play('bgm', true); // 触发BGM
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

  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
})();
