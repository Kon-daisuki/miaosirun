/**
 * assetLoader.js
 * 统一管理图片与音频资源加载
 */
const AssetLoader = (() => {
  const _imgCache = {};
  const _audioCache = {};

  /**
   * 批量加载资源
   * @param {Object} manifest { images: {}, audio: {} }
   */
  async function load(manifest) {
    // 1. 加载图片
    const imgPromises = Object.entries(manifest.images || {}).map(([key, url]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { _imgCache[key] = img; resolve(); };
        img.onerror = () => {
          console.warn(`图片加载失败: ${url}`);
          _imgCache[key] = _makePlaceholder(key, 80, 80);
          resolve();
        };
        img.src = url;
      });
    });

    // 2. 加载音频
    const audioPromises = Object.entries(manifest.audio || {}).map(([key, url]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.oncanplaythrough = () => { _audioCache[key] = audio; resolve(); };
        audio.onerror = () => {
          console.warn(`音频加载失败: ${url}`);
          resolve();
        };
        audio.src = url;
        audio.load();
      });
    });

    return Promise.all([...imgPromises, ...audioPromises]);
  }

  /** 获取图片 */
  function get(key) {
    return _imgCache[key] || _makePlaceholder(key, 80, 80);
  }

  /** 播放音频 */
  function play(key, loop = false) {
    const ad = _audioCache[key];
    if (ad) {
      ad.loop = loop;
      ad.currentTime = 0;
      ad.play().catch(e => console.warn("音频播放被拦截:", e));
    }
  }

  /** 停止音频 */
  function stop(key) {
    if (_audioCache[key]) {
      _audioCache[key].pause();
      _audioCache[key].currentTime = 0;
    }
  }

  function _makePlaceholder(label, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const hue = (label.charCodeAt(0) * 37) % 360;
    ctx.fillStyle = `hsl(${hue},60%,30%)`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(w / 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 6), w / 2, h / 2);
    return c;
  }

  return { load, get, play, stop };
})();
