/**
 * assetLoader.js
 * 统一管理图片与音频资源加载
 */
const AssetLoader = (() => {
  const _imgCache = {};
  const _audioCache = {};

  /**
   * 批量加载资源
   * @param {Object} manifest 包含 images 和 audio 的对象
   */
  async function load(manifest) {
    // 1. 处理图片加载
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

    // 2. 处理音频加载
    const audioPromises = Object.entries(manifest.audio || {}).map(([key, url]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        // 移动端兼容性：使用 canplaythrough 确保加载完成
        audio.oncanplaythrough = () => { _audioCache[key] = audio; resolve(); };
        audio.onerror = () => {
          console.warn(`音频加载失败: ${url}`);
          resolve();
        };
        audio.src = url;
        audio.load(); // 显式触发加载
      });
    });

    return Promise.all([...imgPromises, ...audioPromises]);
  }

  /** 获取图片对象 */
  function get(key) {
    return _imgCache[key] || _makePlaceholder(key, 80, 80);
  }

  /** * 播放音效或BGM
   * @param {string} key 资源ID
   * @param {boolean} loop 是否循环
   */
  function play(key, loop = false) {
    const ad = _audioCache[key];
    if (ad) {
      ad.loop = loop;
      ad.currentTime = 0; // 每次播放从头开始（解决音效重叠）
      ad.play().catch(e => {
        // 捕获浏览器自动播放拦截错误
        console.warn("音频播放被浏览器拦截，请确保先点击页面", e);
      });
    }
  }

  /** 停止音频 */
  function stop(key) {
    if (_audioCache[key]) {
      _audioCache[key].pause();
      _audioCache[key].currentTime = 0;
    }
  }

  /** 占位符生成逻辑 */
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
