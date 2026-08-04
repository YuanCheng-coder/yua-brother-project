/** 可玩角色 — 逐步解锁感靠商店提示，全部可选 */
export const CHARACTERS = [
  {
    id: 'well_rounded', name: '均衡土豆', emoji: '🥔', unlockWave: 1,
    bonus: '全属性 +5%', color: '#d4a056',
    stats: { maxHp: 1.05, speed: 1.05, damage: 1.05, armor: 1, luck: 1 },
    startWeapon: 'pistol',
  },
  {
    id: 'brawler', name: '斗士土豆', emoji: '💪', unlockWave: 1,
    bonus: '生命 +30% · 近战 +25%', color: '#e76f51',
    stats: { maxHp: 1.3, speed: 0.95, damage: 1.1, meleeDamage: 1.25, armor: 2 },
    startWeapon: 'knife',
  },
  {
    id: 'ranger', name: '射手土豆', emoji: '🎯', unlockWave: 1,
    bonus: '远程 +30% · 射程 +20%', color: '#60a5fa',
    stats: { maxHp: 0.9, speed: 1.05, damage: 1.0, rangedDamage: 1.3, range: 1.2 },
    startWeapon: 'pistol',
  },
  {
    id: 'speedy', name: '疾风土豆', emoji: '⚡', unlockWave: 1,
    bonus: '移速 +40% · 攻速 +15%', color: '#facc15',
    stats: { maxHp: 0.85, speed: 1.4, damage: 0.95, attackSpeed: 1.15 },
    startWeapon: 'smg',
  },
  {
    id: 'tank', name: '要塞土豆', emoji: '🛡️', unlockWave: 1,
    bonus: '护甲 +6 · 生命 +40% · 移速-15%', color: '#94a3b8',
    stats: { maxHp: 1.4, speed: 0.85, damage: 0.95, armor: 6 },
    startWeapon: 'axe',
  },
  {
    id: 'mage', name: '奥术土豆', emoji: '🔮', unlockWave: 1,
    bonus: '元素伤 +35% · 附魔折扣', color: '#c084fc',
    stats: { maxHp: 0.88, speed: 1.0, damage: 1.05, elemental: 1.35, luck: 5 },
    startWeapon: 'wand',
  },
  {
    id: 'lucky', name: '幸运土豆', emoji: '🍀', unlockWave: 1,
    bonus: '幸运 +15 · 材料 +10%', color: '#4ade80',
    stats: { maxHp: 1.0, speed: 1.05, damage: 0.95, luck: 15, materialGain: 1.1 },
    startWeapon: 'pistol',
  },
  {
    id: 'vampire', name: '血族土豆', emoji: '🧛', unlockWave: 1,
    bonus: '偷取 +3 · 生命-10%', color: '#f43f5e',
    stats: { maxHp: 0.9, speed: 1.05, damage: 1.05, lifesteal: 3 },
    startWeapon: 'knife',
  },
  {
    id: 'engineer', name: '工兵土豆', emoji: '🔧', unlockWave: 1,
    bonus: '武器升级费 -20% · 射速 +10%', color: '#fb923c',
    stats: { maxHp: 1.0, speed: 1.0, damage: 1.0, attackSpeed: 1.1, upgradeDiscount: 0.8 },
    startWeapon: 'smg',
  },
  {
    id: 'sniper', name: '鹰眼土豆', emoji: '🦅', unlockWave: 1,
    bonus: '暴击 +15% · 射程 +30%', color: '#38bdf8',
    stats: { maxHp: 0.85, speed: 0.95, damage: 1.1, range: 1.3, crit: 0.15 },
    startWeapon: 'sniper',
  },
  {
    id: 'berserker', name: '狂战土豆', emoji: '🔥', unlockWave: 1,
    bonus: '低血量伤害提升 · 近战 +20%', color: '#ef4444',
    stats: { maxHp: 1.1, speed: 1.1, damage: 1.05, meleeDamage: 1.2, berserk: true },
    startWeapon: 'axe',
  },
  {
    id: 'ghost', name: '幽影土豆', emoji: '👻', unlockWave: 1,
    bonus: '短暂无敌更长 · 移速 +20%', color: '#a78bfa',
    stats: { maxHp: 0.8, speed: 1.2, damage: 1.0, iFrames: 1.4 },
    startWeapon: 'laser',
  },
];
