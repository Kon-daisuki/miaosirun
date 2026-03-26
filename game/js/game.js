class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.player   = new Player(canvas);
    this.monsters = [];
    this.boss     = null;
    this.score    = 0; this.combo = 0; this.maxCombo = 0;
    this._running = false;
    this._isBuffSelecting = false; // 新状态：Buff选择中
    this.stats = this._getDefaultStats();

    document.addEventListener('touchstart', e => this._onTouch(e), { passive: false });
    document.addEventListener('mousedown',  e => this._onMouse(e));
  }

  _getDefaultStats() {
    return { clickDamage: 1, comboDamage: false, execute: 0, slowResist: 1.0, scoreMultiplier: 1, 
             shield: 0, hasShieldRegen: false, shieldTimer: 0, chainLightning: 0, 
             hitRangeBonus: 0, frenzy: false, critChance: 0 };
  }

  start() {
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.monsters = []; this.boss = null;
    this._spawnTimer = 0; this._spawnInterval = 2200; this._bossTimer = 0; this._bossInterval = 28000;
    this._diffTimer = 0; this._speedMultiplier = 1.0; this._isBuffSelecting = false;
    this.stats = this._getDefaultStats();
    this.player = new Player(this.canvas);
    Effects.clear(); UI.clear();
    this._running = true; this._lastTime = performance.now();
    if (window.AudioSys) AudioSys.playBgm();
    this._loop(this._lastTime);
  }

  _loop(now) {
    if (!this._running) return;
    const dt = Math.min(now - this._lastTime, 50);
    this._lastTime = now;
    this._update(dt);
    this._draw();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    // 即使在选 Buff，也要更新特效和玩家呼吸动画，这样震屏才会平息，画面才不会卡死
    this.player.update(dt);
    Effects.update(dt);
    UI.update(dt);

    // 如果正在选择 Buff，拦截所有会导致物体移动和生成的逻辑
    if (this._isBuffSelecting) return;

    // --- 以下为正常游戏逻辑 ---
    this._diffTimer += dt;
    if (this._diffTimer >= 15000) {
      this._diffTimer = 0;
      this._spawnInterval = Math.max(600, this._spawnInterval - 150);
      this._speedMultiplier += (0.15 * this.stats.slowResist);
    }

    if (this.stats.hasShieldRegen) {
      this.stats.shieldTimer += dt;
      if (this.stats.shieldTimer >= 30000) {
        this.stats.shieldTimer = 0; this.stats.shield++;
        UI.spawnComboAnim(this.canvas.width/2, this.canvas.height/2, "🛡️护盾+1", "#00f0ff");
      }
    }

    this._bossTimer += dt;
    if (this._bossTimer >= this._bossInterval && this._spawnBoss()) this._bossTimer = 0;

    this._spawnTimer += dt;
    if (this._spawnTimer >= this._spawnInterval) { this._spawnTimer = 0; this._spawnMonster(); }

    this.monsters.forEach(m => {
      m.update(dt, this.player.x);
      if (m.passed && !m._damageDone) {
        m._damageDone = true;
        if (this.stats.shield > 0) { this.stats.shield--; UI.spawnComboAnim(this.player.x, 200, "免疫", "#00f0ff"); }
        else { this.player.hit(); this.combo = 0; if (window.AudioSys) AudioSys.playMiss(); }
      }
    });

    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.killed) this._onBossKilled();
      else if (this.boss.failed) {
        if (this.stats.shield > 0) { this.stats.shield--; this.boss = null; }
        else { this.player.hit(); this.combo = 0; this.boss = null; }
      }
    }
    this.monsters = this.monsters.filter(m => !m.dead);
    if (this.player.isDead()) this._gameOver();
  }

  _onBossKilled() {
    const bonus = 500 + this.combo * 10;
    this.score += bonus; this.combo += 5;
    UI.spawnComboAnim(this.canvas.width/2, this.canvas.height/2-40, `BOSS +${bonus}`, '#ffd700');
    Effects.shake(15, 600); // 剧烈震动
    this.boss = null;
    this._isBuffSelecting = true; // 立即拦截怪物逻辑

    // 延迟 600ms 等震动平息后再显示 UI
    setTimeout(() => {
      BuffSystem.showRandomBuffs(this, () => {
        this._isBuffSelecting = false;
        this._lastTime = performance.now();
      });
    }, 600);
  }

  _handleTap(cx, cy) {
    if (!this._running || this._isBuffSelecting) return;
    const lane = cy < this.canvas.height / 2 ? 'top' : 'bottom';
    
    if (this.boss && !this.boss._entering && this.boss.isInLane(lane)) {
      let dmg = this.stats.clickDamage;
      if (this.stats.frenzy && this.combo >= 30) dmg += 3;
      if (this.stats.comboDamage) dmg += Math.floor(this.combo / 10);
      let isCrit = this.stats.critChance > 0 && Math.random() < this.stats.critChance;
      if (isCrit) dmg *= 3;
      
      this.boss.click();
      if (dmg > 1) this.boss.hp -= (dmg - 1);
      if (this.stats.execute > 0 && (this.boss.hp / this.boss.maxHp) <= this.stats.execute) this.boss.hp = 0;
      if (this.boss.hp <= 0) this.boss.killed = true;

      this.combo++; this.score += 10;
      if (isCrit) UI.spawnComboAnim(cx, cy - 50, "暴击!", "#ff3aff");
      if (window.AudioSys) AudioSys.playHit();
      return;
    }

    this.player.attack(lane);
    const inLane = this.monsters.filter(m => m.lane === lane && !m.dead).sort((a,b)=>a.x-b.x);
    if (inLane.length > 0) {
      const m = inLane[0];
      if (m.x < (this.player.x || 120) + 160 + this.stats.hitRangeBonus) {
        m.hit(); this.combo++;
        let p = (m.type==='cloud'?150:100) * this.stats.scoreMultiplier;
        this.score += p;
        if (window.AudioSys) AudioSys.playHit();
        if (this.stats.chainLightning > 0 && Math.random() < this.stats.chainLightning) {
          const m2 = this.monsters.find(mx => mx.lane === lane && !mx.dead && mx !== m);
          if (m2) { m2.hit(); UI.spawnComboAnim(m2.x, m2.y, "⚡", "#00f0ff"); }
        }
      } else { this.combo = 0; }
    } else { this.combo = 0; }
  }

  _draw() {
    const ctx = this.ctx; const cw = this.canvas.width; const ch = this.canvas.height;
    const shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    ctx.drawImage(AssetLoader.get('background'), 0, 0, cw, ch);
    
    Effects.draw(ctx);
    this.monsters.forEach(m => m.draw(ctx));
    if (this.boss) this.boss.draw(ctx);
    this.player.draw(ctx);
    UI.draw(ctx, { cw, ch, score: this.score, combo: this.combo, hp: this.player.hp, maxHp: this.player.maxHp, boss: this.boss });
    
    if (this.stats.shield > 0) {
      ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 18px Orbitron';
      ctx.fillText(`🛡️ SHIELD: ${this.stats.shield}`, 20, 85);
    }
    ctx.restore();
  }

  _spawnMonster() {
    let lane = Math.random() < 0.5 ? 'top' : 'bottom';
    if (this.boss && this.boss.lane === lane) return;
    const speed = (0.1 + Math.random() * 0.07) * this._speedMultiplier;
    const opts = { lane, canvasW: this.canvas.width, canvasH: this.canvas.height, speed };
    this.monsters.push(Math.random() < 0.55 ? new NormalMonster(opts) : new CloudMonster(opts));
  }

  _spawnBoss() {
    if (this.boss) return false;
    const lane = Math.random() < 0.5 ? 'top' : 'bottom';
    const hp = Math.floor(15 + 10 * this._speedMultiplier + this.score / 500);
    this.boss = new BossMonster({ lane, canvasW: this.canvas.width, canvasH: this.canvas.height, maxHp: hp, timeLimit: 12000 });
    return true;
  }

  _gameOver() { this._running = false; if (window.AudioSys) AudioSys.stopBgm(); if (this.onGameOver) this.onGameOver(); }
  _resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; if (this.player) this.player.resize(this.canvas); }
  _onTouch(e) { e.preventDefault(); Array.from(e.changedTouches).forEach(t => this._handleTap(t.clientX, t.clientY)); }
  _onMouse(e) { if (e.button === 0) this._handleTap(e.clientX, e.clientY); }
}
