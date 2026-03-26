/**
 * effects.js
 * 粒子 / 云雾 / 打击 / 屏幕震动特效系统
 */

const Effects = (() => {
  const particles = [];   // 通用粒子池
  let shakeTimer = 0;
  let shakeIntensity = 0;

  /* ─── 屏幕震动 ─────────────────────────── */
  function shake(intensity = 8, duration = 300) {
    shakeIntensity = intensity;
    shakeTimer = duration;
  }

  function getShakeOffset() {
    if (shakeTimer <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * 2 * shakeIntensity,
      y: (Math.random() - 0.5) * 2 * shakeIntensity,
    };
  }

  /* ─── 云雾粒子（CloudMonster 用）──────── */
  function spawnCloud(cx, cy, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.6;
      particles.push({
        type: 'cloud',
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        radius: 18 + Math.random() * 22,
        alpha: 0.55 + Math.random() * 0.3,
        life: 1.0,
        decay: 0.008 + Math.random() * 0.006,
      });
    }
  }

  /* ─── 命中爆炸粒子 ───────────────────── */
  function spawnHit(cx, cy, color = '#00f0ff', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        type: 'hit',
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color,
        alpha: 1,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.03,
      });
    }
  }

  /* ─── Boss 警告闪光 ──────────────────── */
  function spawnBossWarning(cx, cy) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        type: 'boss_warn',
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6 + Math.random() * 8,
        alpha: 1,
        life: 1.0,
        decay: 0.015,
      });
    }
  }

  /* ─── 更新 ───────────────────────────── */
  function update(dt) {
    if (shakeTimer > 0) shakeTimer -= dt;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /* ─── 绘制 ───────────────────────────── */
  function draw(ctx) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'cloud') {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, 'rgba(200,220,255,0.7)');
        grad.addColorStop(0.5, 'rgba(160,180,255,0.3)');
        grad.addColorStop(1, 'rgba(120,140,220,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'hit') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'boss_warn') {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, 'rgba(255,100,0,0.9)');
        grad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function clear() { particles.length = 0; }

  return { shake, getShakeOffset, spawnCloud, spawnHit, spawnBossWarning, update, draw, clear };
})();
