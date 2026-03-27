/**
 * game.js
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

    // 默认给个占位，真正的实例化在 start() 里
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

    this.stats = this._getDefaultStats();

    document.addEventListener('touchstart', e => this._onTouch(e), { passive: false });
    document.addEventListener('mousedown',  e => this._onMouse(e));
  }

  _getDefaultStats() {
    return {
      clickDamage: 1,        
      comboDamage: false,    
      execute: 0,            
      slowResist: 1.0,       
      scoreMultiplier: 1,    
      shield: 0,             
      hasShieldRegen: false, 
      shieldTimer: 0,        
      chainLightning: 0,     
      hitRangeBonus: 0,      
      frenzy: false,         
      critChance: 0          
    };
  }

  start() {
    this.score = 0; this.combo = 0; this.maxCombo = 0;
    this.monsters =[]; this.boss = null;
    this._spawnTimer = 0; this._spawnInterval = 2200; this._bossTimer = 0;
    this._diffTimer = 0; this._speedMultiplier = 1.0; this._tapFlash = null;
    
    this.stats = this._getDefaultStats();
    if (typeof BuffSystem !== 'undefined') BuffSystem.reset();

    // 【选人功能】从全局变量读取用户在开始界面选择的角色 ID，并传入 Player
    const selectedCharId = window.selectedPlayerKey || 'player';
    this.player = new Player(this.canvas, selectedCharId);
    
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
    this._diffTimer += dt;
    if (this._diffTimer >= 15000) { 
      this._diffTimer = 0;
      this._spawnInterval = Math.max(600, this._spawnInterval - 150);
      this._speedMultiplier += (0.15 * this.stats.slowResist); 
    }

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

    this._bossTimer += dt;
    if (this._bossTimer >= this._bossInterval && this._spawnBoss()) {
      this._bossTimer = 0; 
    }

    this._spawnTimer += dt;
    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      this._spawnMonster();
    }

    for (const m of this.monsters) {
      m.update(dt, this.player.x);
      if (m.passed && !m._damageDone) {
        m._damageDone = true;
        if (this.stats.shield > 0) {
          this.stats.shield -= 1;
          UI.spawnComboAnim(this.player.x, this.canvas.height / 2, `免疫!`, '#00f0ff');
        } else {
          this.player.hit();
          this.combo = 0;
          AudioSys.playMiss();
        }
      }
    }

    if (this.boss) {
      this.boss.update(dt);
      if (this.boss.killed) {
        this._onBossKilled();
      } else if (this.boss.failed) {
        if (this.stats.shield > 0) {
          this.stats.shield -= 1;
          this.boss = null;
        } else {
          this.player.hit();
          this.combo = 0;
          this.boss  = null;
          AudioSys.playMiss();
        }
      }
    }

    this.monsters = this.monsters.filter(m => !m.dead);
    if (this.player.isDead()) this._gameOver();
  }

  _spawnMonster() {
    let lane = Math.random() < 0.5 ? 'top' : 'bottom';
    if (this.boss && this.boss.lane === lane) return;
    
    const speed = (0.10 + Math.random() * 0.07) * this._speedMultiplier; 
    const opts = { lane, canvasW: this.canvas.width, canvasH: this.canvas.height, speed };
    this.monsters.push(Math.random() < 0.55 ? new NormalMonster(opts) : new CloudMonster(opts));
  }

  _spawnBoss() {
    if (this.boss) return false; 
    const lane = Math.random() < 0.5 ? 'top' : 'bottom';
    const dynamicHp = Math.floor(15 + 10 * this._speedMultiplier + this.score / 500);
    this.boss = new BossMonster({ lane, canvasW: this.canvas.width, canvasH: this.canvas.height, maxHp: dynamicHp, timeLimit: 12000 });
    return true; 
  }

  _onBossKilled() {
    const bonus = 500 + this.combo * 10;
    this.score += bonus;
    this.combo += 5;
    UI.spawnComboAnim(this.canvas.width / 2, this.canvas.height / 2 - 40, `BOSS +${bonus}`, '#ffd700');
    this.boss = null;

    if (typeof BuffSystem !== 'undefined') {
      this._paused = true;
      BuffSystem.showRandomBuffs(this, () => {
        this._paused = false; 
        this._lastTime = performance.now(); 
      });
    }
  }

  // --- 【修改点】核心判定重构，解决攻击 Boss 没有动画和打不到小怪的问题 ---
  _handleTap(cx, cy) {
    if (!this._running || this._paused) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const lane = cy < ch / 2 ? 'top' : 'bottom';
    
    // 触发点击位置的闪烁特效
    this._tapFlash = { lane, timer: 200 };

    // 1. 获取该泳道存活的小怪，并按距离(x坐标)从小到大排序
    const inLaneMonsters = this.monsters.filter(m => m.lane === lane && !m.dead).sort((a, b) => a.x - b.x);
    const closestMonster = inLaneMonsters.length > 0 ? inLaneMonsters[0] : null;
    
    // 2. 计算玩家的攻击范围
    const hitRange = (this.player.x || 120) + 160 + this.stats.hitRangeBonus;
    
    // 3. 判断是否能打到小怪 (有小怪且在攻击范围内)
    const canHitMonster = closestMonster && closestMonster.x < hitRange;
    
    // 4. 判断当前点击泳道是否可以攻击 Boss
    const isBossVulnerable = this.boss && !this.boss._entering && this.boss.isInLane(lane);

    // --- 核心逻辑：判定优先级 ---
    if (canHitMonster) {
      // 【优先级1：面前有小怪，必须优先清理小怪】
      this.player.attack(lane); // 播放满幅度的冲刺攻击动画
      
      closestMonster.hit();
      this.combo++; 
      if (this.combo > this.maxCombo) this.maxCombo = this.combo; // 更新最高连击
      this.score += (closestMonster.type === 'cloud' ? 150 : 100) * this.stats.scoreMultiplier;
      AudioSys.playHit();
      
      // 闪电链特效
      if (this.stats.chainLightning > 0 && Math.random() < this.stats.chainLightning) {
        const m2 = this.monsters.find(mx => mx.lane === lane && !mx.dead && mx !== closestMonster);
        if (m2) { m2.hit(); UI.spawnComboAnim(m2.x, m2.y, `⚡`, '#00f0ff'); }
      }

    } else if (isBossVulnerable) {
      // 【优先级2：面前没有小怪了，并且 Boss 在此泳道，则攻击 Boss】
      this.player.bossHit(lane); // 调用专门的 Boss 连击抖动动画

      // 计算伤害
      let dmg = this.stats.clickDamage;
      if (this.stats.frenzy && this.combo >= 30) dmg += 3;
      if (this.stats.comboDamage) dmg += Math.floor(this.combo / 10);
      let isCrit = this.stats.critChance > 0 && Math.random() < this.stats.critChance;
      if (isCrit) dmg *= 3;

      // 对 Boss 造成伤害
      this.boss.click(); 
      if (dmg > 1 && this.boss.hp > 0) this.boss.hp -= (dmg - 1);
      if (this.stats.execute > 0 && (this.boss.hp / this.boss.maxHp) <= this.stats.execute) this.boss.hp = 0;
      if (this.boss.hp <= 0) this.boss.killed = true;

      this.score += 10; 
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo; // 更新最高连击
      AudioSys.playHit();
      if (isCrit) UI.spawnComboAnim(cx, cy - 50, `暴击!`, '#ff3aff');

    } else {
      // 【优先级3：范围内既没有小怪，也不是可以攻击的 Boss，判定为 Miss】
      this.player.attack(lane); // 冲刺出去，但是挥空了
      this.combo = 0; // 断连击
    }
  }

  _draw() {
    const ctx = this.ctx; const cw = this.canvas.width; const ch = this.canvas.height;
    ctx.save();
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

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.player) this.player.resize(this.canvas);
  }

  _gameOver() {
    this._running = false;
    AudioSys.stopBgm();
    if (this.onGameOver) this.onGameOver();
  }

  _onTouch(e) {
    if (!this._running || this._paused) return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => this._handleTap(t.clientX, t.clientY));
  }

  _onMouse(e) {
    if (!this._running || this._paused) return;
    this._handleTap(e.clientX, e.clientY);
  }
}
