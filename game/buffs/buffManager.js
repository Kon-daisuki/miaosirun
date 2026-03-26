/**
 * buffs/buffManager.js
 * 独立的肉鸽奖励系统，避免数值膨胀，多用机制类加成
 */

const BuffSystem = (() => {
  // 定义所有可能的奖励池
  const allBuffs =[
    {
      id: 'dmg_up',
      name: '⚙️ 动能强化',
      desc: '基础点击伤害 +1',
      apply: (game) => game.stats.clickDamage += 1
    },
    {
      id: 'combo_blade',
      name: '⚔️ 连击之刃',
      desc: '每保持 15 次连击，额外造成 1 点真实伤害',
      apply: (game) => game.stats.comboDamage = true
    },
    {
      id: 'execute',
      name: '☠️ 弱点击破',
      desc: 'Boss 生命值低于 15% 时，下一次攻击直接将其秒杀',
      apply: (game) => game.stats.execute += 0.15
    },
    {
      id: 'time_slow',
      name: '⏳ 时间沼泽',
      desc: '降低全局怪物移动速度和难度递增速度 15%',
      apply: (game) => {
        game._speedMultiplier *= 0.85; 
        game.stats.slowResist *= 0.85; 
      }
    },
    {
      id: 'heal_max_hp',
      name: '❤️ 纳米修复',
      desc: '恢复所有生命值，并且最大生命值上限 +1',
      apply: (game) => {
        game.player.maxHp += 1;
        game.player.hp = game.player.maxHp;
      }
    },
    {
      id: 'score_bonus',
      name: '💎 赏金猎人',
      desc: '击杀普通怪物获得的分数翻倍，加速发育',
      apply: (game) => game.stats.scoreMultiplier += 1
    },
    // ---- 以下为新增的 5 个机制 Buff ----
    {
      id: 'shield_gen',
      name: '🛡️ 电子护盾',
      desc: '获得 1 层护盾，此后每 30 秒生成一层，可抵挡一次怪物漏掉的伤害（保全连击和血量）',
      apply: (game) => {
        game.stats.shield += 1;
        game.stats.hasShieldRegen = true;
      }
    },
    {
      id: 'chain_lightning',
      name: '⚡ 闪电链',
      desc: '击杀小怪时，有 20% 概率释放闪电，自动秒杀同泳道的另一只小怪',
      apply: (game) => game.stats.chainLightning += 0.20 // 选两次变 40%
    },
    {
      id: 'magnetic_field',
      name: '🌀 磁力场',
      desc: '增加武器的判定范围，即使怪物离得稍远也能命中',
      apply: (game) => game.stats.hitRangeBonus += 40 
    },
    {
      id: 'frenzy_state',
      name: '🔥 狂热状态',
      desc: '当你的连击数超过 50 后，进入狂热，对 Boss 的每次点击伤害额外 +1',
      apply: (game) => game.stats.frenzy = true
    },
    {
      id: 'critical_strike',
      name: '🎲 致命暴击',
      desc: '攻击 Boss 时，有 20% 概率触发致命一击，造成双倍伤害',
      apply: (game) => game.stats.critChance += 0.20
    }
  ];

  let activeBuffs =[]; // 记录本局已获得的 buff

  /**
   * 触发三选一 UI
   */
  function showRandomBuffs(game, onSelectCallback) {
    const shuffled =[...allBuffs].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    const modal = document.getElementById('buff-modal');
    const cardsContainer = document.getElementById('buff-cards');
    cardsContainer.innerHTML = ''; 

    choices.forEach(buff => {
      const card = document.createElement('div');
      card.className = 'buff-card';
      card.innerHTML = `
        <h3>${buff.name}</h3>
        <p>${buff.desc}</p>
      `;
      card.onclick = () => {
        buff.apply(game);
        activeBuffs.push(buff.id);
        modal.classList.remove('active');
        onSelectCallback(); 
      };
      cardsContainer.appendChild(card);
    });

    modal.classList.add('active'); 
  }

  function reset() {
    activeBuffs =[];
  }

  return { showRandomBuffs, reset };
})();
