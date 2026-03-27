/**
 * buffs/buffManager.js
 * 独立的肉鸽奖励系统，全面加强了攻击力相关的 Buff
 * 增加了“先选中、后确认”的二级确认机制
 */

const BuffSystem = (() => {
  // 定义所有可能的奖励池
  const allBuffs =[
    {
      id: 'dmg_up',
      name: '⚙️ 动能强化',
      desc: '基础点击伤害大幅提升（+2）',
      apply: (game) => game.stats.clickDamage += 2
    },
    {
      id: 'combo_blade',
      name: '⚔️ 连击之刃',
      desc: '每保持 10 次连击，额外附加 1 点真实伤害',
      apply: (game) => game.stats.comboDamage = true
    },
    {
      id: 'execute',
      name: '☠️ 弱点击破',
      desc: 'Boss 生命值低于 20% 时，下一次攻击直接将其秒杀',
      apply: (game) => game.stats.execute += 0.20
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
      desc: '击杀小怪时，有 25% 概率释放闪电，自动秒杀同泳道的另一只小怪',
      apply: (game) => game.stats.chainLightning += 0.25
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
      desc: '当你的连击数超过 30 后，进入狂热，对 Boss 的每次点击伤害额外 +3',
      apply: (game) => game.stats.frenzy = true
    },
    {
      id: 'critical_strike',
      name: '🎲 致命暴击',
      desc: '攻击 Boss 时，有 25% 概率触发致命一击，造成 3 倍伤害',
      apply: (game) => game.stats.critChance += 0.25
    }
  ];

  let activeBuffs =[]; // 记录本局已获得的 buff

  function showRandomBuffs(game, onSelectCallback) {
    // 1. 随机打乱并抽取 3 个
    const shuffled =[...allBuffs].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    const modal = document.getElementById('buff-modal');
    const cardsContainer = document.getElementById('buff-cards');
    const confirmBtn = document.getElementById('btn-buff-confirm'); // 获取确认按钮

    cardsContainer.innerHTML = ''; 
    let selectedBuff = null; // 用于存储当前选中的 Buff
    confirmBtn.disabled = true; // 初始状态禁用确认按钮

    // 2. 生成卡片
    choices.forEach(buff => {
      const card = document.createElement('div');
      card.className = 'buff-card';
      card.innerHTML = `
        <h3>${buff.name}</h3>
        <p>${buff.desc}</p>
      `;

      // 点击卡片时的逻辑：高亮并记录，不立即生效
      card.onclick = () => {
        // 清除其他卡片的选中状态
        Array.from(cardsContainer.children).forEach(c => c.classList.remove('selected'));
        // 给当前卡片添加选中状态
        card.classList.add('selected');
        
        selectedBuff = buff;      // 记录选中的 buff 数据
        confirmBtn.disabled = false; // 激活确认按钮
      };

      cardsContainer.appendChild(card);
    });

    // 3. 点击确认按钮的逻辑
    confirmBtn.onclick = () => {
      if (!selectedBuff) return;

      // 正式应用 Buff
      selectedBuff.apply(game);
      activeBuffs.push(selectedBuff.id);

      // 隐藏界面并恢复游戏
      modal.classList.remove('active');
      confirmBtn.onclick = null; // 清除本次点击事件，防止重复触发
      onSelectCallback(); 
    };

    modal.classList.add('active'); 
  }

  function reset() {
    activeBuffs =[];
  }

  return { showRandomBuffs, reset };
})();
