/**
 * assetLoader.js
 * 统一管理图片与音频资源加载
 * * 使用方式：
 * AssetLoader.load(ASSET_MANIFEST, AUDIO_MANIFEST).then(() => { ... })
 * 播放音效：AssetLoader.play('hit')
 * 获取图片：AssetLoader.get('player')
 */

const AssetLoader = (() => {
  const _cache = {};      // 图片缓存
  const _audioCache = {}; // 音频缓存

  /**
   * 批量加载图片与音频
   * @param {Object} imageManifest  图片 key->url 的映射表
   * @param {Object} audioManifest  音频 key->url 的映射表
   * @returns {Promise<void>}
   */
  function load(imageManifest, audioManifest = {}) {
    // 1. 加载图片资源
    const imagePromises = Object.entries(imageManifest).map(([key, url]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { _cache[key] = img; resolve(); };
        img.onerror = () => {
          // 若图片不存在，生成占位符
          _cache[key] = _makePlaceholder(key, 80, 80);
          resolve();
        };
        img.src = url;
      });
    });

    // 2. 加载音频资源 (参考图片加载逻辑扩展)
    const audioPromises = Object.entries(audioManifest).map(([key, url]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.oncanplaythrough = () => { 
          _audioCache[key] = audio; 
          resolve(); 
        };
        audio.onerror = () => {
          console.warn(`音频加载失败: ${url}`);
          _audioCache[key] = null; // 音频失败不设占位符，仅设为空防止报错
          resolve();
        };
        audio.src = url;
        audio.load(); 
      });
    });

    return Promise.all([...imagePromises, ...audioPromises]);
  }

  /** 取图，找不到返回占位符 */
  function get(key) {
    return _cache[key] || _makePlaceholder(key, 80, 80);
  }

  /** * 播放音效 
   * @param {string} key 音频键名
   * @param {boolean} loop 是否循环播放
   */
  function play(key, loop = false) {
    const sound = _audioCache[key];
    if (sound) {
      sound.loop = loop;
      sound.currentTime = 0; // 重置进度，支持连续快速触发
      sound.play().catch(e => {
        // 自动播放政策限制：通常需要用户产生点击交互后才能播放音频
        console.warn("音频播放被拦截:", e);
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

  /** 判断资源是否已加载 */
  function has(key) { 
    return !!_cache[key] || !!_audioCache[key]; 
  }

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

  return { load, get, play, stop, has };
})();

/* ─── 图片资源清单 ─────────────────────────────────────────────────── */
const ASSET_MANIFEST = {
  player:        'assets/images/player/player.png',
  background:    'assets/images/backgrounds/bg.png',
  monster_normal:'assets/images/monsters/normal.png',
  monster_cloud: 'assets/images/monsters/cloud.png',
  monster_boss:  'assets/images/monsters/boss.png',
};

/* ─── 音频资源清单 (根据目录截图匹配) ────────────────────────────────── */
const AUDIO_MANIFEST = {
  bgm:  'assets/audio/bgm.mp3',
  hit:  'assets/audio/hit.mp3',
  miss: 'assets/audio/miss.mp3',
};
