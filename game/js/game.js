/**
 * game.js
 * 游戏主循环、怪物生成、碰撞、计分
 */

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.player   = new Player(canvas);
    this.monsters = [];
    this.boss     = null;

    // 计分 & 连击
    this.score    = 0;
    this.combo    = 0;
    this.maxCombo = 0;

    // 生成计时器
    this._spawnTimer    = 0;
    this._spawnInterval = 2200;   // ms，逐渐缩短
    this._bossTimer     = 0;
    this._bossInterval  = 28000;  // 每 28 秒出一次 Boss
    this._diffTimer     = 0;

    this._running  = false;
    this._lastTime = 0;
    this._rafId    = null;

    // 触控
    canvas.addEventListener('touchstart', e => this._onTouch(e), { passive: false });
    canvas.addEventListener('mousedown',  e => this._onMouse(e));
  }

  /* ─── 公共 API ─────────────────────────── */

  start() {
    this.score    = 0; this.combo = 0; this.maxCombo = 0;
    this.monsters = []; this.boss = null;
    this._spawnTimer    = 0;
    this._spawnInterval = 2200;
    this._bossTimer     = 0;
    this._diffTimer     = 0;
    this.player         = new Player(this.canvas);
    Effects.clear();
    UI.clear();

    this._running  = true;
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  getResult() {
    return { score: this.score, maxCombo: this.maxCombo };
  }

  /* ─── 主循环 ───────────────────────────── */

  _loop(now) {
    if (!this._running) return;
    const dt = Math.min(now - this._lastTime, 50); // 最大 delta 50ms
    this._lastTime = now;

    this._update(dt);
    this._draw();

    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  /* ─── 更新 ─────────────────────────────── */

  _update(dt) {
    // 难度递增：每 15 秒缩短生成间隔
    this._diffTimer += dt;
    if (this._diffTimer >= 15000) {
      this._diffTimer = 0;
      this._spawnInterval = Math.max(900, this._spawnInterval - 200);
    }

    this.player.update(dt);
    Effects.update(dt);
    UI.update(dt);

    // Boss 计时
    if (!this.boss) {
      this._bossTimer += dt;
      if (this._bossTimer >= this._bossInterval) {
        this._bossTimer = 0;
        this._spawnBoss();
      }
    }

    // 普通/云雾怪生成（Boss 期间暂停生成小怪）
    if (!this.boss) {
      this._spawnTimer += dt;
      if (this._spawnTimer >= this._spawnInterval) {
        this._spawnTimer = 0;
        this._spawnMonster();
      }
    }

    // 更新怪物
    for (const m of this.monsters) {
      m.update(dt, this.player.x);

      // 普通怪 / 云雾怪穿越玩家
      if ((m.type === 'normal' || m.type === 'cloud') && m.passed && !m._damageDone) {
        m._damageDone = true;
        this.player.hit();
        this.combo = 0;
        if (this.player.isDead()) this._gameOver();
      }
    }

    // Boss 更新
    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.killed) {
        this._onBossKilled();
      } else if (this.boss.failed) {
        // Boss 时间耗尽，扣一滴血
        this.player.hit();
        this.combo = 0;
        this.boss  = null;
        if (this.player.isDead()) this._gameOver();
      }
    }

    // 清理死亡怪物
    this.monsters = this.monsters.filter(m => !m.dead);
  }

  /* ─── 生成 ─────────────────────────────── */

  _spawnMonster() {
    const lane  = Math.random() < 0.5 ? 'top' : 'bottom';
    const roll  = Math.random();
    const speed = 0.10 + Math.random() * 0.07;

    const opts = { lane, canvasW: this.canvas.width, canvasH: this.canvas.height, speed };

    if (roll < 0.55) {
      this.monsters.push(new NormalMonster(opts));
    } else {
      this.monsters.push(new CloudMonster(opts));
    }
  }

  _spawnBoss() {
    const lane = Math.random() < 0.5 ? 'top' : 'bottom';
    this.boss = new BossMonster({
      lane,
      canvasW: this.canvas.width,
      canvasH: this.canvas.height,
      maxHp: 25 + Math.floor(this.score / 200),  // 越打越难
      timeLimit: 12000,
    });
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

  /* ─── 输入处理 ──────────────────────────── */

  _onTouch(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this._handleTap(
        (t.clientX - rect.left) * scaleX,
        (t.clientY - rect.top)  * scaleY,
      );
    }
  }

  _onMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width  / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this._handleTap(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    );
  }

  _handleTap(cx, cy) {
    if (!this._running) return;

    const lane = cy < this.canvas.height / 2 ? 'top' : 'bottom';

    // Boss 连击
    if (this.boss && !this.boss._entering && this.boss.isInLane(lane)) {
      this.boss.click();
      this.score += 10;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      return;
    }

    // 小怪点击
    let hit = false;
    for (const m of this.monsters) {
      if (m.lane === lane && m.checkClick(cx, cy)) {
        m.hit();
        hit = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const pts = m.type === 'cloud' ? 150 : 100;
        this.score += pts + (this.combo > 5 ? this.combo * 5 : 0);
        UI.spawnComboAnim(m.x, m.y - 50, `+${pts}`, m.type === 'cloud' ? '#cc88ff' : '#00f0ff');
        if (this.combo % 5 === 0) {
          UI.spawnComboAnim(this.canvas.width / 2, 110, `${this.combo} COMBO!!`, '#ffd700');
        }
        break;
      }
    }

    // 点击区域没有怪物，连击中断
    if (!hit && !this.boss) {
      if (this.combo > 0) this.combo = 0;
    }
  }

  /* ─── 结束 ─────────────────────────────── */

  _gameOver() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    // 触发主逻辑的 gameOver 回调（main.js 注入）
    if (typeof this.onGameOver === 'function') this.onGameOver();
  }

  /* ─── 绘制 ─────────────────────────────── */

  _draw() {
    const ctx = this.ctx;
    const { width: cw, height: ch } = this.canvas;

    const shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // 背景
    const bg = AssetLoader.get('background');
    ctx.drawImage(bg, 0, 0, cw, ch);

    // 上下触控区域轻微着色（点击时闪光在 _tapFlash 中处理）
    ctx.fillStyle = 'rgba(0,200,255,0.03)';
    ctx.fillRect(0, 0, cw, ch / 2);
    ctx.fillStyle = 'rgba(255,100,200,0.03)';
    ctx.fillRect(0, ch / 2, cw, ch / 2);

    // 特效（云雾粒子在怪物层下面）
    Effects.draw(ctx);

    // 怪物
    for (const m of this.monsters) m.draw(ctx);
    if (this.boss) this.boss.draw(ctx);

    // 玩家
    this.player.draw(ctx);

    // HUD
    UI.draw(ctx, {
      cw, ch,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      boss: this.boss,
    });

    ctx.restore();
  }

  /* ─── 辅助 ─────────────────────────────── */

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width  = window.innerWidth  * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    if (this.player) this.player.resize(this.canvas);
  }
}
