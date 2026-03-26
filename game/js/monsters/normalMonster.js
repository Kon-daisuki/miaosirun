/**
 * monsters/normalMonster.js
 * 普通怪：随机上下生成，全程可见，直接点击消灭
 */

class NormalMonster {
  /**
   * @param {Object} opts
   * @param {'top'|'bottom'} opts.lane   所在泳道
   * @param {number}  opts.canvasW
   * @param {number}  opts.canvasH
   * @param {number}  opts.speed         像素/ms
   */
  constructor({ lane, canvasW, canvasH, speed = 0.12 }) {
    this.type  = 'normal';
    this.lane  = lane;
    this.w     = 80;
    this.h     = 80;
    this.speed = speed;

    // 初始位置：屏幕右侧外
    this.x = canvasW + this.w;
    this.y = lane === 'top'
      ? canvasH * 0.25
      : canvasH * 0.75;

    // 普通怪始终完全可见，无隐身
    this.alpha   = 1;
    this.dead    = false;    // 被击中 or 穿越玩家
    this.scored  = false;    // 是否已被玩家消灭（计分用）
    this.passed  = false;    // 是否已穿越玩家（扣血用）
  }

  /** 被玩家点击命中 */
  hit() {
    this.dead   = true;
    this.scored = true;
    Effects.spawnHit(this.x, this.y, '#00f0ff');
  }

  update(dt, playerX) {
    if (this.dead) return;

    this.x -= this.speed * dt;

    // 完全穿越玩家：扣血
    if (this.x < playerX - this.w && !this.passed) {
      this.passed = true;
      this.dead   = true;
    }
  }

  draw(ctx) {
    if (this.dead) return;

    ctx.save();
    const img = AssetLoader.get('monster_normal');
    ctx.drawImage(img, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.restore();
  }

  /** 检查点击是否命中该怪 */
  checkClick(cx, cy) {
    if (this.dead) return false;
    const hw = this.w * 0.6, hh = this.h * 0.6;
    return Math.abs(cx - this.x) < hw && Math.abs(cy - this.y) < hh;
  }
}
