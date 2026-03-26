/**
 * assetLoader.js
 * 统一管理图片资源加载
 * 
 * 使用方式：
 *   AssetLoader.load({ player: 'assets/images/player/run.png', ... })
 *   然后通过 AssetLoader.get('player') 取图
 *
 * 若图片不存在，会自动生成占位符，游戏不会崩溃
 */

const AssetLoader = (() => {
  const _cache = {};

  /**
   * 批量加载图片
   * @param {Object} manifest  key->url 的映射表
   * @returns {Promise<void>}
   */
  function load(manifest) {
    const promises = Object.entries(manifest).map(([key, url]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { _cache[key] = img; resolve(); };
        img.onerror = () => {
          // 生成占位符 Canvas
          _cache[key] = _makePlaceholder(key, 80, 80);
          resolve();
        };
        img.src = url;
      });
    });
    return Promise.all(promises);
  }

  /** 取图，找不到返回占位符 */
  function get(key) {
    return _cache[key] || _makePlaceholder(key, 80, 80);
  }

  /** 判断是否已加载 */
  function has(key) { return !!_cache[key]; }

  /**
   * 生成彩色占位符 Canvas（无图时显示）
   */
  function _makePlaceholder(label, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // 背景
    const hue = (label.charCodeAt(0) * 37) % 360;
    ctx.fillStyle = `hsl(${hue},60%,30%)`;
    ctx.fillRect(0, 0, w, h);
    // 边框
    ctx.strokeStyle = `hsl(${hue},80%,60%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(w / 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 6), w / 2, h / 2);
    return c;
  }

  return { load, get, has };
})();

/* ─── 资源清单 ───────────────────────────────────────────────────
   把你的图片放到 assets/images/ 对应目录下，
   修改下方路径即可，键名不要改（游戏代码依赖键名）。
─────────────────────────────────────────────────────────────── */
const ASSET_MANIFEST = {
  // 玩家 —— 建议尺寸：120×120 px 透明 PNG
  player:        'assets/images/player/player.png',

  // 背景 —— 横屏，建议 1920×1080
  background:    'assets/images/backgrounds/bg.png',

  // 普通怪 —— 建议 80×80
  monster_normal:'assets/images/monsters/normal.png',

  // 云雾怪 —— 建议 80×80
  monster_cloud: 'assets/images/monsters/cloud.png',

  // Boss 怪 —— 建议 160×160
  monster_boss:  'assets/images/monsters/boss.png',
};

