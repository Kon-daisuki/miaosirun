/**
 * buffManager.js
 */
const BuffSystem = (() => {
  const allBuffs = [
    { id: 'dmg_up', name: '⚙️ 动能强化', desc: '基础点击伤害大幅提升（+2）', apply: (g) => g.stats.clickDamage += 2 },
    { id: 'combo_blade', name: '⚔️ 连击之刃', desc: '每保持 10 次连击，额外附加 1 点真实伤害', apply: (g) => g.stats.comboDamage = true },
    { id: 'execute', name: '☠️ 弱点击破', desc: 'Boss 生命低于 20% 时直接秒杀', apply: (g) => g.stats.execute += 0.20 },
    { id: 'time_slow', name: '⏳ 时间沼泽', desc: '降低怪物移速和难度增长 15%', apply: (g) => { g._speedMultiplier *= 0.85; g.stats.slowResist *= 0.85; } },
    { id: 'heal_max_hp', name: '❤️ 纳米修复', desc: '回满血，且最大生命上限 +1', apply: (g) => { g.player.maxHp += 1; g.player.hp = g.player.maxHp; } },
    { id: 'shield_gen', name: '🛡️ 电子护盾', desc: '每 30 秒生成一层护盾抵挡伤害', apply: (g) => { g.stats.shield += 1; g.stats.hasShieldRegen = true; } },
    { id: 'chain_lightning', name: '⚡ 闪电链', desc: '击杀小怪有 25% 概率秒杀同路另一只', apply: (g) => g.stats.chainLightning += 0.25 },
    { id: 'magnetic_field', name: '🌀 磁力场', desc: '增加攻击判定范围', apply: (g) => g.stats.hitRangeBonus += 40 },
    { id: 'frenzy_state', name: '🔥 狂热状态', desc: '30连击以上时，对 Boss 伤害额外 +3', apply: (g) => g.stats.frenzy = true },
    { id: 'critical_strike', name: '🎲 致命暴击', desc: '25% 概率触发 3 倍伤害', apply: (g) => g.stats.critChance += 0.25 }
  ];

  function showRandomBuffs(game, onSelectCallback) {
    const choices = [...allBuffs].sort(() => 0.5 - Math.random()).slice(0, 3);
    const modal = document.getElementById('buff-modal');
    const cardsContainer = document.getElementById('buff-cards');
    const confirmBtn = document.getElementById('btn-buff-confirm');
    
    if(!modal || !cardsContainer || !confirmBtn) {
        console.error("Buff UI elements not found!");
        return;
    }

    cardsContainer.innerHTML = '';
    confirmBtn.disabled = true;
    let selectedBuff = null;

    choices.forEach(buff => {
      const card = document.createElement('div');
      card.className = 'buff-card';
      card.innerHTML = `<h3>${buff.name}</h3><p>${buff.desc}</p>`;
      card.onclick = () => {
        // 这里的 Array.from 确保在不同浏览器都能运行
        const children = cardsContainer.getElementsByClassName('buff-card');
        for(let child of children) child.classList.remove('selected');
        
        card.classList.add('selected');
        selectedBuff = buff;
        confirmBtn.disabled = false;
      };
      cardsContainer.appendChild(card);
    });

    confirmBtn.onclick = () => {
      if (!selectedBuff) return;
      selectedBuff.apply(game);
      modal.classList.remove('active');
      // 清除点击事件防止重复触发
      confirmBtn.onclick = null; 
      onSelectCallback();
    };
    modal.classList.add('active');
  }

  return { showRandomBuffs, reset: () => {} };
})();
