/**
 * assetLoader.js
 * 统一管理图片资源加载
 */

const AssetLoader = (() => {
  const _cache = {};
  const _isReal = {}; // 【新增】记录该图片是否真实存在

  function load(manifest) {
    // 【新增】自动将 player1 到 player20 塞入探测清单
    for(let i = 1; i <= 20; i++) {
      if(!manifest[`player${i}`]) {
        manifest[`player${i}`] = `assets/images/player/player${i}.png`;
      }
    }
    // 确保默认 player 存在
    if(!manifest['player']) manifest['player'] = 'assets/images/player/player.png';

    const promises = Object.entries(manifest).map(([key, url]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { 
          _cache[key] = img; 
          _isReal[key] = true; // 存在
          resolve(); 
        };
        img.onerror = () => {
          _cache[key] = _makePlaceholder(key, 80, 80);
          _isReal[key] = false; // 不存在，被替换为占位符
          resolve();
        };
        img.src = url;
      });
    });

    return Promise.all(promises).then(() => {
       // 【新增】加载完成后，调用我们在 index.html 中定义的 UI 初始化方法
       if(typeof window.initCharSelectUI === 'function') {
         window.initCharSelectUI();
       }
    });
  }

  function get(key) {
    return _cache[key] || _makePlaceholder(key, 80, 80);
  }

  function has(key) { return !!_cache[key]; }

  // 【新增】返回所有真实存在的角色 ID
  function getValidPlayers() {
    let players = [];
    if (_isReal['player']) players.push('player');
    for(let i = 1; i <= 20; i++) {
      if (_isReal[`player${i}`]) players.push(`player${i}`);
    }
    return players;
  }

  function _makePlaceholder(label, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const hue = (label.charCodeAt(0) * 37) % 360;
    ctx.fillStyle = `hsl(${hue},60%,30%)`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `hsl(${hue},80%,60%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(w / 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 6), w / 2, h / 2);
    return c;
  }

  return { load, get, has, getValidPlayers };
})();

// 生成 1 到 4 的随机整数
const randomBgIndex = Math.floor(Math.random() * 4) + 1;

const ASSET_MANIFEST = {
  background:    `assets/images/backgrounds/bg${randomBgIndex}.png`,
  monster_normal:'assets/images/monsters/normal.png',
  monster_cloud: 'assets/images/monsters/cloud.png',
  monster_boss:  'assets/images/monsters/boss.png',
  // player 的路径探测已在上面的 load 函数内自动进行
};
