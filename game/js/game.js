/**
 * game.js
 * 核心逻辑：
 * 1. 结合 Buff 系统进行伤害计算（暴击、狂热、连击加成）。
 * 2. 削弱 Boss 血量成长，提升后期爽感。
 * 3. 护盾逻辑：漏怪不扣血、不掉连击。
 */

// --- 音频管理对象 ---
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
    this._speedMultiplier = 1.0;  
    this._tapFlash        = null;

    this._running  = false;
    this._paused   = false; 
    this._lastTime = 0;
    this._rafId    = null;

    // 初始化属性面板
    this.stats = this._getDefaultStats();

    document.addEventListener('touchstart', e => this._onTouch(e), { passive: false });
    document.addEventListener('mousedown',  e => this._onMouse(e));
  }

  // 默认属性
  _getDefaultStats() {
    return {
      clickDamage: 1,        // 基础点击伤害
      comboDamage: false,    // 连击附伤开关
      execute: 0,            // 斩杀百分比
      slowResist: 1.0,       // 难度增长减缓
      scoreMultiplier: 1,    // 分数倍率
      shield: 0,             // 当前护盾
      hasShieldRegen: false, // 护盾回复开关
      shieldTimer: 0,        // 护盾计时
      chainLightning: 0,     // 闪电链概率
      hitRangeBonus: 0,      // 判定范围加成
      frenzy: false,         // 狂热开关
      critChance: 0          // 暴击率
    };
  }

  start() {
    this.score    = 0; this.combo = 0; this.maxCombo = 0;
    this.monsters =[]; this.boss = null;
    
    this._spawnTimer      = 0;
    this._spawnInterval   = 2200;
    this._bossTimer       = 0;
    this._diffTimer       = 0;
    this._speedMultiplier = 1.0;  
    this._tapFlash        = null;
    
    this.stats = this._getDefaultStats();
    if (typeof BuffSystem !== 'undefined') BuffSystem.reset();

    this.player = new Player(this.canvas);
    Effects.clear();
    UI.clear();

    this._running  = true;
    this._paused   = false;
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
    
    if (!this._paused) {
      this._update(dt);
    }
    
    this._draw();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    // 难度随时间增长
    this._diffTimer += dt;
    if (this._diffTimer >= 15000) { 
      this._diffTimer = 0;
      this._spawnInterval = Math.max(600, this._spawnInterval - 150);
      this._speedMultiplier += (0.15 * this.stats.slowResist); 
    }

    // 护盾回复逻辑
    if (this.stats.hasShieldRegen) {
      this.stats.shieldTimer += dt;
      if (this.stats.shieldTimer >= 30000) { 
        this.stats.shieldTimer = 0;
        this.stats.shield += 1;
        UI.spawnComboAnim(this.canvas.width / 2, this.canvas.height / 2, `🛡️护盾 +1`, '#00f0ff');
      }
    }

    this.player.update(dt);
    Effects.update(dt);
    UI.update(dt);

    if (this._tapFlash) {
      this._tapFlash.timer -= dt;
      if (this._tapFlash.timer <= 0) this._tapFlash = null;
    }

    // Boss 生成计时
    this._bossTimer += dt;
    if (this._bossTimer >= this._bossInterval) {
      if (this._spawnBoss()) {
        this._bossTimer = 0; 
      }
    }

    // 小怪生成计时
    this._spawnTimer += dt;
    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this._spawnMonster();
    }

    // 怪物穿透判定
    for (const m of this.monsters) {
      m.update(dt, this.player.x);
      if ((m.type === 'normal' || m.type === 'cloud') && m.passed && !m._damageDone) {
        m._damageDone = true;
        
        // 护盾抵挡逻辑
        if (this.stats.shield > 0) {
          this.stats.shield -= 1;
          UI.spawnComboAnim(this.player.x || 120, this.canvas.height / 2, `免疫!`, '#00f0ff');
        } else {
          this.player.hit();
          this.combo = 0;
          AudioSys.playMiss();
          if (this.player.isDead()) this._gameOver();
        }
      }
    }

    // Boss 状态判定
    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.killed) {
        this._onBossKilled();
      } else if (this.boss.failed) {
        // 护盾也可以抵挡 Boss 失败的惩罚
        if (this.stats.shield > 0) {
          this.stats.shield -= 1;
          UI.spawnComboAnim(this.player.x || 120, this.canvas.height / 2, `免疫!`, '#00f0ff');
          this.boss = null;
        } else {
          this.player.hit();
          this.combo = 0;
          this.boss  = null;
          AudioSys.playMiss();
          if (this.player.isDead()) this._gameOver();
        }
      }
    }

    this.monsters = this.monsters.filter(m => !m.dead);
  }

  _spawnMonster() {
    let availableLanes = ['top', 'bottom'];
    if (this.boss) {
      availableLanes = availableLanes.filter(l => l !== this.boss.lane);
    }
    if (availableLanes.length === 0) return;

    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    const baseSpeed = 0.10 + Math.random() * 0.07;
    const speed = baseSpeed * this._speedMultiplier; 
    
    const opts = { lane, canvasW: this.canvas.width, canvasH: this.canvas.height, speed };
    this.monsters.push(Math.random() < 0.55 ? new NormalMonster(opts) : new CloudMonster(opts));
  }

  _spawnBoss() {
    if (this.boss) return false; 
    const occupiedLanes = new Set(this.monsters.filter(m => !m.dead).map(m => m.lane));
    const availableLanes =['top', 'bottom'].filter(l => !occupiedLanes.has(l));

    if (availableLanes.length === 0) return false; 

    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    // 【削弱公式】：基础15 + 难度成长 + 分数/500（原为200）
    const dynamicHp = Math.floor(15 + 10 * this._speedMultiplier + this.score / 500);

    this.boss = new BossMonster({
      lane, 
      canvasW: this.canvas.width, 
      canvasH: this.canvas.height,
      maxHp: dynamicHp, 
      timeLimit: 12000,
    });
    return true; 
  }

  _onBossKilled() {
    const bonus = 500 + this.combo * 10;
    this.score += bonus;
    this.combo += 5;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    UI.spawnComboAnim(this.canvas.width / 2, this.canvas.height / 2 - 40, `BOSS +${bonus}`, '#ffd700');
    Effects.shake(12, 600);
    this.boss = null;

    // 暂停并显示三选一 Buff
    if (typeof BuffSystem !== 'undefined') {
      this._paused = true;
      BuffSystem.showRandomBuffs(this, () => {
        this._paused = false; 
        this._lastTime = performance.now(); 
      });
    }
  }

  _toCanvas(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  _onTouch(e) {
    if (!this._running || this._paused) return; 
    e.preventDefault();
    for (const t of e.changedTouches) {
      const { x, y } = this._toCanvas(t.clientX, t.clientY);
      this._handleTap(x, y);
    }
  }

  _onMouse(e) {
    if (!this._running || this._paused) return; 
    const { x, y } = this._toCanvas(e.clientX, e.clientY);
    this._handleTap(x, y);
  }

  _handleTap(cx, cy) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cx < 0 || cx > cw || cy < 0 || cy > ch) return;

    const lane = cy < ch / 2 ? 'top' : 'bottom';
    this._tapFlash = { lane, timer: 200 };

    // ======= 打 BOSS 核心计算逻辑 =======
    if (this.boss && !this.boss._entering && this.boss.isInLane(lane)) {
      
      let damage = this.stats.clickDamage;
      
      // 狂热：连击 >= 30, 额外 +3
      if (this.stats.frenzy && this.combo >= 30) {
        damage += 3;
      }
      
      // 连击附伤：每 10 连击 +1
      if (this.stats.comboDamage) {
        damage += Math.floor(this.combo / 10);
      }

      // 致命暴击：25% 概率触发 3 倍伤害
      let isCrit = false;
      if (this.stats.critChance > 0 && Math.random() < this.stats.critChance) {
        damage *= 3; 
        isCrit = true;
      }

      this.boss.click(); // 执行原有的点击动画效果
      
      // 额外扣除 Buff 带来的血量伤害（扣除原有默认的1点后剩余的部分）
      if (damage > 1 && this.boss.hp > 0) {
        this.boss.hp -= (damage - 1);
      }

      // 弱点击破：斩杀逻辑
      if (this.stats.execute > 0 && this.boss.hp > 0) {
        if (this.boss.hp / this.boss.maxHp <= this.stats.execute) {
           this.boss.hp = 0;
        }
      }

      // 死亡判定
      if (this.boss.hp <= 0) {
        this.boss.hp = 0;
        this.boss.killed = true;
      }

      this.player.bossHit(lane);
      this.score += 10;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      AudioSys.playHit();
      
      if (isCrit) {
        UI.spawnComboAnim(cx, cy - 50, `暴击!`, '#ff3aff');
      }
      return;
    }

    // ======= 打小怪 核心逻辑 =======
    this.player.attack(lane);

    let hit = false;
    const inLane = this.monsters
      .filter(m => m.lane === lane && !m.dead && (m.alpha === undefined || m.alpha > 0.05))
      .sort((a, b) => a.x - b.x);

    if (inLane.length > 0) {
      const m = inLane[0]; 
      
      const HIT_RANGE = 160 + this.stats.hitRangeBonus; 
      const playerPos = this.player.x || 120;

      if (m.x < playerPos + HIT_RANGE) {
        m.hit();
        hit = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        const pts = (m.type === 'cloud' ? 150 : 100) * this.stats.scoreMultiplier;
        this.score += pts + (this.combo > 5 ? this.combo * 5 : 0);
        
        AudioSys.playHit();
        UI.spawnComboAnim(m.x, m.y - 50, `+${pts}`, m.type === 'cloud' ? '#cc88ff' : '#00f0ff');
        
        // 闪电链触发
        if (this.stats.chainLightning > 0 && Math.random() < this.stats.chainLightning) {
          const nextM = this.monsters.find(mx => mx.lane === lane && !mx.dead && mx !== m);
          if (nextM && nextM.x < cw) { 
            nextM.hit();
            UI.spawnComboAnim(nextM.x, nextM.y - 50, `⚡`, '#00f0ff');
          }
        }
        
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

    // 绘制护盾 UI
    if (this.stats.shield > 0) {
      ctx.save();
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 18px Orbitron';
      ctx.textAlign = 'left';
      ctx.fillText(`🛡️ SHIELD: ${this.stats.shield}`, 20, 85); 
      ctx.restore();
    }

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
