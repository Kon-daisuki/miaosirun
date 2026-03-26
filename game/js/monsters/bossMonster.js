/**
 * monsters/bossMonster.js
 * Boss怪：大型，需要在限定时间内狂点对应区域消耗血量
 * 血条显示在屏幕上方中间
 */

class BossMonster {
  /**
   * @param {Object} opts
   * @param {'top'|'bottom'} opts.lane
   * @param {number} opts.canvasW
   * @param {number} opts.canvasH
   * @param {number} opts.maxHp       默认 30
   * @param {number} opts.timeLimit   ms，默认 10000
   */
  constructor({ lane, canvasW, canvasH, maxHp = 30, timeLimit = 10000 }) {
    this.type      = 'boss';
    this.lane      = lane;
    this.canvasW   = canvasW;
    this.canvasH   = canvasH;
    this.w         = 160;
    this.h         = 160;
    this.maxHp     = maxHp;
    this.hp        = maxHp;
    this.timeLimit = timeLimit;
    this.timer     = 0;

    this.dead      = false;
    this.killed    = false;   // 血量归零 = 成功击杀
    this.failed    = false;   // 时间耗尽 = 失败

    // Boss 位置：从右侧滑入后停在屏幕右 1/3 处
    this.targetX = canvasW * 0.68;
    this.x       = canvasW + this.w;
    this.y       = lane === 'top' ? canvasH * 0.25 : canvasH * 0.75;

    // 滑入动画
    this._entering = true;
    this._enterSpeed = 0.8; // px/ms

    // 警告闪烁
    this._warnTimer   = 0;
    this._warnInterval= 120;
    this._warnCount   = 6;
    this._warnDone    = false;

    // 受击闪光
    this._hitFlash = 0;

    // 震动
    this._shakeX = 0;
  }

  /** 玩家点击对应区域，扣一滴血 */
  click() {
    if (this.dead || this._entering) return;
    this.hp = Math.max(0, this.hp - 1);
    this._hitFlash = 80;
    Effects.shake(3, 80);
    if (this.hp === 0) {
      this.dead   = true;
      this.killed = true;
      Effects.spawnHit(this.x, this.y, '#ff6600', 30);
      Effects.shake(14, 500);
    }
  }

  update(dt) {
    if (this.dead) return;

    // 滑入
    if (this._entering) {
      this.x -= this._enterSpeed * dt;
      if (this.x <= this.targetX) {
        this.x = this.targetX;
        this._entering = false;
        // 入场警告粒子
        Effects.spawnBossWarning(this.x, this.y);
      }
      return;
    }

    // 计时
    this.timer += dt;
    if (this.timer >= this.timeLimit && !this.dead) {
      this.dead   = true;
      this.failed = true;
    }

    // 受击闪光
    if (this._hitFlash > 0) this._hitFlash -= dt;

    // 随机轻微震动
    this._shakeX = Math.sin(Date.now() * 0.01) * 2;
  }

  draw(ctx) {
    if (this.dead) return;

    ctx.save();

    const drawX = this.x + this._shakeX;

    // 警告光晕（时间不多时加强）
    const urgency = this._entering ? 0 : this.timer / this.timeLimit;
    const glowR = 0.5 + urgency * 0.5;
    const grd = ctx.createRadialGradient(drawX, this.y, 20, drawX, this.y, this.w * glowR);
    grd.addColorStop(0, `rgba(255,80,0,${0.15 + urgency * 0.25})`);
    grd.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(drawX, this.y, this.w * glowR, 0, Math.PI * 2);
    ctx.fill();

    // 受击白闪
    if (this._hitFlash > 0) {
      ctx.globalAlpha = this._hitFlash / 80 * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(drawX, this.y, this.w * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const img = AssetLoader.get('monster_boss');
    ctx.drawImage(img, drawX - this.w / 2, this.y - this.h / 2, this.w, this.h);

    ctx.restore();
  }

  /** 绘制屏幕顶部血条（由 UI 调用） */
  drawHpBar(ctx, cw) {
    if (this.dead || this._entering) return;

    const barW  = Math.min(cw * 0.55, 480);
    const barH  = 22;
    const barX  = (cw - barW) / 2;
    const barY  = 16;
    const ratio = this.hp / this.maxHp;
    const timeRatio = 1 - this.timer / this.timeLimit;

    // 背景
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    _roundRect(ctx, barX - 12, barY - 10, barW + 24, barH + 36, 8);
    ctx.fill();

    // "BOSS" 标签
    ctx.fillStyle = '#ff4400';
    ctx.font = 'bold 13px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BOSS', cw / 2, barY + 2);

    // 血条底
    ctx.fillStyle = '#330000';
    _roundRect(ctx, barX, barY + 10, barW, barH, 4);
    ctx.fill();

    // 血条填充（颜色随血量变化）
    const hpColor = ratio > 0.5 ? '#ff4400' : ratio > 0.25 ? '#ff8800' : '#ff0000';
    ctx.fillStyle = hpColor;
    _roundRect(ctx, barX, barY + 10, barW * ratio, barH, 4);
    ctx.fill();

    // 时间条
    ctx.fillStyle = '#003322';
    _roundRect(ctx, barX, barY + 36, barW, 6, 3);
    ctx.fill();
    ctx.fillStyle = timeRatio > 0.3 ? '#00ffaa' : '#ffaa00';
    _roundRect(ctx, barX, barY + 36, barW * timeRatio, 6, 3);
    ctx.fill();

    ctx.restore();
  }

  /** 触控区域判断 */
  isInLane(lane) { return this.lane === lane; }
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
