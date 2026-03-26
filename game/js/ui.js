/**
 * ui.js
 * HUD：分数、连击、生命值、分隔线、触控区提示
 */

const UI = (() => {
  // 连击数字飘字动画
  const _comboAnims = [];

  function spawnComboAnim(x, y, text, color = '#00f0ff') {
    _comboAnims.push({ x, y, text, color, alpha: 1, vy: -1.2, life: 1 });
  }

  function update(dt) {
    for (let i = _comboAnims.length - 1; i >= 0; i--) {
      const a = _comboAnims[i];
      a.y  += a.vy;
      a.life -= 0.015;
      a.alpha = Math.max(0, a.life);
      if (a.life <= 0) _comboAnims.splice(i, 1);
    }
  }

  function draw(ctx, state) {
    const { cw, ch, score, combo, maxCombo, hp, maxHp, boss } = state;

    /* ── 中线分隔 ── */
    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, ch / 2);
    ctx.lineTo(cw, ch / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    /* ── 触控区提示文字（半透明） ── */
    ctx.save();
    ctx.font = '14px Noto Sans SC, sans-serif';
    ctx.textAlign = 'center';

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('点击上方区域', cw / 2, ch * 0.25);
    ctx.fillText('点击下方区域', cw / 2, ch * 0.75);
    ctx.globalAlpha = 1;
    ctx.restore();

    /* ── 分数（右上角）── */
    ctx.save();
    ctx.font = 'bold 28px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur  = 12;
    ctx.fillText(score.toString().padStart(6, '0'), cw - 20, 44);
    ctx.restore();

    /* ── 连击（居中上方）── */
    if (combo >= 2) {
      ctx.save();
      const scale = 1 + Math.min(combo / 20, 0.6);
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.floor(22 * scale)}px Orbitron, sans-serif`;

      const hue  = (combo * 8) % 360;
      ctx.fillStyle   = `hsl(${hue},100%,65%)`;
      ctx.shadowColor = `hsl(${hue},100%,50%)`;
      ctx.shadowBlur  = 16;

      ctx.fillText(`${combo} COMBO`, cw / 2, 78);
      ctx.restore();
    }

    /* ── 生命值（左上角，用❤图标）── */
    ctx.save();
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < maxHp; i++) {
      ctx.globalAlpha = i < hp ? 1 : 0.2;
      ctx.fillText('❤', 16 + i * 30, 38);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    /* ── 飘字动画 ── */
    for (const a of _comboAnims) {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 10;
      ctx.fillText(a.text, a.x, a.y);
      ctx.restore();
    }

    /* ── Boss 血条（由 Boss 对象自己绘制）── */
    if (boss) boss.drawHpBar(ctx, cw);
  }

  function clear() { _comboAnims.length = 0; }

  return { spawnComboAnim, update, draw, clear };
})();
