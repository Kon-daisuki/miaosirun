/**
 * player.js
 * 玩家角色：固定左侧，点击上/下区域时冲向对应泳道攻击后弹回原位
 */

class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.w = 120;
    this.h = 120;
    this.x = 80;

    this.baseY = canvas.height / 2;
    this.y     = this.baseY;

    this.hp    = 3;
    this.maxHp = 3;

    this._hitFlash      = 0;
    this._flashDuration = 600;
    this._bobTimer      = 0;

    // 攻击状态机: 'idle' | 'dash' | 'return'
    this._phase     = 'idle';
    this._targetY   = this.baseY;
    this._dashSpeed = 0;
  }

  resize(canvas) {
    this.canvas = canvas;
    this.baseY  = canvas.height / 2;
    if (this._phase === 'idle') this.y = this.baseY;
  }

  /** 触发攻击动画 */
  attack(lane) {
    if (this._phase !== 'idle') return;
    this._phase     = 'dash';
    this._targetY   = lane === 'top'
      ? this.canvas.height * 0.25
      : this.canvas.height * 0.75;
    this._dashSpeed = Math.abs(this._targetY - this.y) / 80;
  }

  /** Boss 连击时小抖动 */
  bossHit(lane) {
    this.y          = lane === 'top'
      ? this.canvas.height * 0.25
      : this.canvas.height * 0.75;
    this._phase     = 'return';
    this._targetY   = this.baseY;
    this._dashSpeed = Math.abs(this.baseY - this.y) / 120;
  }

  hit() {
    this.hp = Math.max(0, this.hp - 1);
    this._hitFlash = this._flashDuration;
    Effects.shake(6, 300);
  }

  isDead() { return this.hp <= 0; }

  update(dt) {
    this._bobTimer += dt;
    if (this._hitFlash > 0) this._hitFlash -= dt;
    if (this._phase === 'idle') return;

    const dir = Math.sign(this._targetY - this.y);
    this.y   += dir * this._dashSpeed * dt;

    const arrived = dir > 0 ? this.y >= this._targetY : this.y <= this._targetY;
    if (arrived || dir === 0) {
      this.y = this._targetY;
      if (this._phase === 'dash') {
        this._phase     = 'return';
        this._targetY   = this.baseY;
        this._dashSpeed = Math.abs(this.baseY - this.y) / 140;
      } else {
        this._phase = 'idle';
        this.y      = this.baseY;
      }
    }
  }

  draw(ctx) {
    const bobY  = this._phase === 'idle' ? Math.sin(this._bobTimer * 0.004) * 5 : 0;
    const drawY = this.y + bobY;

    ctx.save();

    // 受击红闪
    if (this._hitFlash > 0) {
      const t = this._hitFlash / this._flashDuration;
      if (Math.floor(t * 10) % 2 === 0) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle   = '#ff2222';
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.w * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // 冲刺时横向拉伸
    if (this._phase !== 'idle') {
      const span = Math.abs(this._targetY - this.baseY) || 1;
      const prog = 1 - Math.abs(this.y - (this._phase === 'dash' ? this.baseY : this._targetY)) / span;
      const sx = 1 + 0.25 * Math.sin(prog * Math.PI);
      const sy = 1 - 0.15 * Math.sin(prog * Math.PI);
      ctx.translate(this.x, drawY);
      ctx.scale(sx, sy);
      ctx.translate(-this.x, -drawY);
    }

    const img = AssetLoader.get('player');
    ctx.drawImage(img, this.x - this.w / 2, drawY - this.h / 2, this.w, this.h);
    ctx.restore();
  }
}
