/**
 * game.js
 * 优化点：
 * 1. 限制 Boss 同时只能存在一个。
 * 2. 【新增】Boss 出现后，其所在的泳道不再生成普通小怪直到 Boss 死亡。
 * 3. 【新增】加入音频管理，实现 BGM、击中和扣血音效。
 * 4. 【新增】随时间推移难度逐渐增加（刷怪更快、怪物移速更快、Boss血量更高）。
 * 5. 【新增】Boss 必须在完全没有普通怪物的空闲泳道才能生成。
 */

// --- 独立的音频管理对象 ---
const AudioSys = {
  bgm: new Audio('assets/audio/bgm.mp3'),
  hit: new Audio('assets/audio/hit.mp3'),
  miss: new Audio('assets/audio/miss.mp3'),
  playBgm() {
    this.bgm.loop = true;      
    this.bgm.currentTime = 0;
    this.bgm.play().catch(e => console.warn('BGM无法自动播放:', e));
  },
  stopBgm() {
    this.bgm.pause();
  },
  playHit() {
    const s = this.hit.cloneNode();
    s.play().catch(e => console.warn('Hit音效播放失败:', e));
  },
  playMiss() {
    const s = this.miss.cloneNode();
    s.play().catch(e => console.warn('Miss音效播放失败:', e));
  }
};
// --------------------------------------------------------

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.player   = new Player(canvas);
    this.monsters =[];
    this.boss     = null;

    this.score    = 0;
    this.combo    = 0;
    this.maxCombo = 0;

    this._spawnTimer      = 0;
    this._spawnInterval   = 2200;
    this._bossTimer       = 0;
    this._bossInterval    = 28000;
    this._diffTimer       = 0;
    this._speedMultiplier = 1.0;  // 【新增】难度倍率
    this._tapFlash        = null;

    this._running  = false;
    this._lastTime = 0;
    this._rafId    = null;

    document.addEventListener('touchstart', e => this._onTouch(e), { passive: false });
    document.addEventListener('mousedown',  e => this._onMouse(e));
  }

  start() {
    this.score    = 0; this.combo = 0; this.maxCombo = 0;
    this.monsters =[]; this.boss = null;
    
    this._spawnTimer      = 0;
    this._spawnInterval   = 2200;
    this._bossTimer       = 0;
    this._diffTimer       = 0;
    this._speedMultiplier = 1.0;  // 重置难度
    this._tapFlash        = null;
    
    this.player = new Player(this.canvas);
    Effects.clear();
    UI.clear();

    this._running  = true;
    this._lastTime = performance.now();
    
    AudioSys.playBgm();
    this._loop(this._lastTime);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    AudioSys.stopBgm();
  }

  getResult() { return { score: this.score, maxCombo: this.maxCombo }; }

  _loop(now) {
    if (!this._running) return;
    const dt = Math.min(now - this._lastTime, 50);
    this._lastTime = now;
    this._update(dt);
    this._draw();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    // 【修改】随着时间推移，不断增加难度
    this._diffTimer += dt;
    if (this._diffTimer >= 15000) { // 每15秒提升一次难度
      this._diffTimer = 0;
      // 刷怪间隔越来越短 (极限为 600ms)
      this._spawnInterval = Math.max(600, this._spawnInterval - 150);
      // 怪物移动速度倍率提升
      this._speedMultiplier += 0.15; 
    }

    this.player.update(dt);
    Effects.update(dt);
    UI.update(dt);

    if (this._tapFlash) {
      this._tapFlash.timer -= dt;
      if (this._tapFlash.timer <= 0) this._tapFlash = null;
    }

    // 【修改】Boss生成逻辑：如果满足条件才重置时间
    this._bossTimer += dt;
    if (this._bossTimer >= this._bossInterval) {
      if (this._spawnBoss()) {
        this._bossTimer = 0; // 生成成功才重新计时
      }
    }

    this._spawnTimer += dt;
    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this._spawnMonster();
    }

    for (const m of this.monsters) {
      m.update(dt, this.player.x);
      if ((m.type === 'normal' || m.type === 'cloud') && m.passed && !m._damageDone) {
        m._damageDone = true;
        this.player.hit();
        this.combo = 0;
        AudioSys.playMiss();
        if (this.player.isDead()) this._gameOver();
      }
    }

    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.killed) {
        this._onBossKilled();
      } else if (this.boss.failed) {
        this.player.hit();
        this.combo = 0;
        this.boss  = null;
        AudioSys.playMiss();
        if (this.player.isDead()) this._gameOver();
      }
    }

    this.monsters = this.monsters.filter(m => !m.dead);
  }

  _spawnMonster() {
    let availableLanes = ['top', 'bottom'];

    // 只要有 Boss，就在可用泳道里把 Boss 所在的泳道踢掉，做到不刷小怪
    if (this.boss) {
      availableLanes = availableLanes.filter(l => l !== this.boss.lane);
    }

    if (availableLanes.length === 0) return;

    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    // 【修改】基础移速叠加难度倍率
    const baseSpeed = 0.10 + Math.random() * 0.07;
    const speed = baseSpeed * this._speedMultiplier; 
    
    const opts = { lane, canvasW: this.canvas.width, canvasH: this.canvas.height, speed };
    
    this.monsters.push(Math.random() < 0.55 ? new NormalMonster(opts) : new CloudMonster(opts));
  }

  /**
   * 【修改】更严格的 Boss 生成条件
   * @returns {Boolean} 是否成功生成
   */
  _spawnBoss() {
    if (this.boss) return false; 

    // 获取当前仍然存活的普通怪所在的泳道
    const occupiedLanes = new Set(this.monsters.filter(m => !m.dead).map(m => m.lane));
    // 找出【完全被清理干净】的空路
    const availableLanes =['top', 'bottom'].filter(l => !occupiedLanes.has(l));

    if (availableLanes.length === 0) {
      // 如果没有空路（两条路都还有怪），返回 false，游戏会在下一帧继续尝试，直到某条路被打空
      return false; 
    }

    // 从空闲的泳道中挑选一个出 Boss
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    // 【修改】Boss血量随速度倍率(难度)和分数提升
    const dynamicHp = Math.floor(25 * this._speedMultiplier + this.score / 200);

    this.boss = new BossMonster({
      lane, 
      canvasW: this.canvas.width, 
      canvasH: this.canvas.height,
      maxHp: dynamicHp, 
      timeLimit: 12000,
    });

    return true; // 成功生成
  }

  _onBossKilled() {
    const bonus = 500 + this.combo * 10;
    this.score += bonus;
    this.combo += 5;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    UI.spawnComboAnim(this.canvas.width / 2, this.canvas.height / 2 - 40, `BOSS +${bonus}`, '#ffd700');
    Effects.shake(12, 600);
    this.boss = null;
  }

  _toCanvas(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  _onTouch(e) {
    if (!this._running) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const { x, y } = this._toCanvas(t.clientX, t.clientY);
      this._handleTap(x, y);
    }
  }

  _onMouse(e) {
    if (!this._running) return;
    const { x, y } = this._toCanvas(e.clientX, e.clientY);
    this._handleTap(x, y);
  }

  _handleTap(cx, cy) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cx < 0 || cx > cw || cy < 0 || cy > ch) return;

    const lane = cy < ch / 2 ? 'top' : 'bottom';
    this._tapFlash = { lane, timer: 200 };

    if (this.boss && !this.boss._entering && this.boss.isInLane(lane)) {
      this.boss.click();
      this.player.bossHit(lane);
      this.score += 10;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      AudioSys.playHit();
      return;
    }

    this.player.attack(lane);

    let hit = false;
    const inLane = this.monsters
      .filter(m => m.lane === lane && !m.dead && (m.alpha === undefined || m.alpha > 0.05))
      .sort((a, b) => a.x - b.x);

    if (inLane.length > 0) {
      const m = inLane[0]; 
      const HIT_RANGE = 160; 
      const playerPos = this.player.x || 120;

      if (m.x < playerPos + HIT_RANGE) {
        m.hit();
        hit = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const pts = m.type === 'cloud' ? 150 : 100;
        this.score += pts + (this.combo > 5 ? this.combo * 5 : 0);
        AudioSys.playHit();
        UI.spawnComboAnim(m.x, m.y - 50, `+${pts}`, m.type === 'cloud' ? '#cc88ff' : '#00f0ff');
        
        if (this.combo % 5 === 0) {
          UI.spawnComboAnim(cw / 2, ch * 0.12, `${this.combo} COMBO!!`, '#ffd700');
        }
      }
    }

    if (!hit && !this.boss) {
      this.combo = 0;
    }
  }

  _gameOver() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    AudioSys.stopBgm();
    if (typeof this.onGameOver === 'function') this.onGameOver();
  }

  _draw() {
    const ctx = this.ctx;
    const cw  = this.canvas.width;
    const ch  = this.canvas.height;

    const shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    ctx.drawImage(AssetLoader.get('background'), 0, 0, cw, ch);

    ctx.fillStyle = 'rgba(0,200,255,0.04)';
    ctx.fillRect(0, 0, cw, ch / 2);
    ctx.fillStyle = 'rgba(255,100,200,0.04)';
    ctx.fillRect(0, ch / 2, cw, ch / 2);

    if (this._tapFlash) {
      const a = (this._tapFlash.timer / 200) * 0.22;
      ctx.fillStyle = this._tapFlash.lane === 'top'
        ? `rgba(0,220,255,${a})` : `rgba(255,120,220,${a})`;
      ctx.fillRect(0, this._tapFlash.lane === 'top' ? 0 : ch / 2, cw, ch / 2);
    }

    ctx.save();
    ctx.setLineDash([16, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ch / 2);
    ctx.lineTo(cw, ch / 2);
    ctx.stroke();
    ctx.restore();

    Effects.draw(ctx);
    for (const m of this.monsters) m.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
    this.player.draw(ctx);

    UI.draw(ctx, { cw, ch, score: this.score, combo: this.combo,
      maxCombo: this.maxCombo, hp: this.player.hp, maxHp: this.player.maxHp, boss: this.boss });

    ctx.restore();
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width        = w;
    this.canvas.height       = h;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.player) this.player.resize(this.canvas);
  }
      }
