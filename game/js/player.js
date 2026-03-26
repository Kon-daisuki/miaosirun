/**
 * player.js
 * 玩家角色：固定在屏幕左侧中间，展示动画帧
 */

class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.w = 120;
    this.h = 120;
    this.x = 80;          // 固定 X（左侧）
    this.y = canvas.height / 2;  // 中间
    this.hp = 3;          // 玩家血量（被怪物穿越时扣血）
    this.maxHp = 3;

    // 受击闪烁
    this._hitFlash = 0;
    this._flashDuration = 600; // ms

    // 轻微上下浮动动画
    this._bobTimer = 0;
    this._bobAmp   = 6;
    this._bobSpeed = 0.002;
  }

  resize(canvas) {
    this.canvas = canvas;
    this.x = 80;
    this.y = canvas.height / 2;
  }

  /** 玩家受击 */
  hit() {
    this.hp = Math.max(0, this.hp - 1);
    this._hitFlash = this._flashDuration;
    Effects.shake(6, 300);
  }

  isDead() { return this.hp <= 0; }

  update(dt) {
    this._bobTimer += dt;
    if (this._hitFlash > 0) this._hitFlash -= dt;
  }

  draw(ctx) {
    const bobY = Math.sin(this._bobTimer * this._bobSpeed * Math.PI * 2) * this._bobAmp;
    const drawY = this.y + bobY;

    ctx.save();

    // 受击红色闪烁
    if (this._hitFlash > 0) {
      const t = this._hitFlash / this._flashDuration;
      if (Math.floor(t * 10) % 2 === 0) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ff2222';
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.w * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const img = AssetLoader.get('player');
    ctx.drawImage(img, this.x - this.w / 2, drawY - this.h / 2, this.w, this.h);

    ctx.restore();
  }
}
