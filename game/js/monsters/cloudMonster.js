/**
 * monsters/cloudMonster.js
 * 云雾隐身怪：全程有云雾环绕特效，接近玩家时逐渐隐身直到彻底消失
 */

class CloudMonster {
  constructor({ lane, canvasW, canvasH, speed = 0.10 }) {
    this.type  = 'cloud';
    this.lane  = lane;
    this.w     = 80;
    this.h     = 80;
    this.speed = speed;

    this.x = canvasW + this.w;
    this.y = lane === 'top'
      ? canvasH * 0.25
      : canvasH * 0.75;

    // 隐身阈值：距离玩家 280px 开始淡出，给云雾充分的展示时间
    this.invisThreshold = 280;
    this.alpha   = 1;
    this.dead    = false;
    this.scored  = false;
    this.passed  = false;

    // 云雾粒子持续喷射（每 180ms 一次），全程有效
    this._cloudTimer    = 0;
    this._cloudInterval = 180;
  }

  hit() {
    this.dead   = true;
    this.scored = true;
    Effects.spawnHit(this.x, this.y, '#aa88ff', 16);
  }

  update(dt, playerX) {
    if (this.dead) return;

    this.x -= this.speed * dt;
    const dist = this.x - playerX;

    // 接近玩家时线性淡出直到彻底消失
    if (dist < this.invisThreshold) {
      this.alpha = Math.max(0, dist / this.invisThreshold);
    }

    // 只在可见阶段持续生成云雾粒子
    if (this.alpha > 0.05) {
      this._cloudTimer += dt;
      if (this._cloudTimer >= this._cloudInterval) {
        this._cloudTimer = 0;
        Effects.spawnCloud(this.x, this.y, 5);
      }
    }

    // 穿越玩家：扣血
    if (this.x < playerX - this.w && !this.passed) {
      this.passed = true;
      this.dead   = true;
    }
  }

  draw(ctx) {
    // alpha 归零后彻底不渲染（完全隐身）
    if (this.dead || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // 云雾光晕底层（随 alpha 同步消退）
    const grd = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, this.w * 0.9);
    grd.addColorStop(0, `rgba(180,160,255,${0.30 * this.alpha})`);
    grd.addColorStop(1, 'rgba(120,100,220,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.w * 0.9, 0, Math.PI * 2);
    ctx.fill();

    const img = AssetLoader.get('monster_cloud');
    ctx.drawImage(img, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);

    ctx.restore();
  }

  // 完全隐身后无法被点击
  checkClick(cx, cy) {
    if (this.dead || this.alpha <= 0) return false;
    const hw = this.w * 0.65, hh = this.h * 0.65;
    return Math.abs(cx - this.x) < hw && Math.abs(cy - this.y) < hh;
  }
}
