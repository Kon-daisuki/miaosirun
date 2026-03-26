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
      desc: '每保持 15 次连击，额外造成 1 点真实伤害（鼓励不失误）',
      apply: (game) => game.stats.comboDamage = true
    },
    {
      id: 'execute',
      name: '☠️ 弱点击破',
      desc: 'Boss 生命值低于 15% 时，下一次攻击直接将其秒杀',
      apply: (game) => game.stats.execute = 0.15
    },
    {
      id: 'time_slow',
      name: '⏳ 时间沼泽',
      desc: '降低全局怪物移动速度和难度递增速度 15%',
      apply: (game) => {
        game._speedMultiplier *= 0.85; // 减速当前
        game.stats.slowResist *= 0.85; // 减速未来的难度成长
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
    }
  ];

  let activeBuffs =[]; // 记录本局已获得的 buff

  /**
   * 触发三选一 UI
   * @param {Object} game - 当前游戏实例
   * @param {Function} onSelectCallback - 选完后的回调（恢复游戏）
   */
  function showRandomBuffs(game, onSelectCallback) {
    // 随机打乱并抽取 3 个不重复的 Buff
    const shuffled = [...allBuffs].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    const modal = document.getElementById('buff-modal');
    const cardsContainer = document.getElementById('buff-cards');
    cardsContainer.innerHTML = ''; // 清空上次的卡片

    choices.forEach(buff => {
      const card = document.createElement('div');
      card.className = 'buff-card';
      card.innerHTML = `
        <h3>${buff.name}</h3>
        <p>${buff.desc}</p>
      `;
      // 点击卡片后应用奖励并关闭界面
      card.onclick = () => {
        buff.apply(game);
        activeBuffs.push(buff.id);
        modal.classList.remove('active');
        onSelectCallback(); // 恢复游戏
      };
      cardsContainer.appendChild(card);
    });

    modal.classList.add('active'); // 显示界面
  }

  function reset() {
    activeBuffs =[];
  }

  return { showRandomBuffs, reset };
})();
