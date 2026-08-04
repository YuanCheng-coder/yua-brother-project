export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;
export const ARENA_PADDING = 40;

export const MAX_WAVES = 20;
export const MAX_WEAPONS = 6;

export const TIER_COLORS = ['#aaa', '#4ade80', '#60a5fa', '#c084fc'];
export const TIER_NAMES = ['普通', '精良', '稀有', '史诗'];

export const CHARACTERS = [
  {
    id: 'well_rounded',
    name: '均衡土豆',
    emoji: '🥔',
    bonus: '全属性 +5%',
    stats: { maxHp: 1.05, speed: 1.05, damage: 1.05, armor: 1, luck: 1 },
  },
  {
    id: 'brawler',
    name: '斗士土豆',
    emoji: '💪',
    bonus: '生命 +30% · 近战 +25%',
    stats: { maxHp: 1.3, speed: 0.95, damage: 1.1, meleeDamage: 1.25, armor: 2 },
  },
  {
    id: 'ranger',
    name: '射手土豆',
    emoji: '🎯',
    bonus: '远程 +30% · 射程 +20%',
    stats: { maxHp: 0.9, speed: 1.05, damage: 1.0, rangedDamage: 1.3, range: 1.2 },
  },
  {
    id: 'speedy',
    name: '疾风土豆',
    emoji: '⚡',
    bonus: '移速 +40% · 攻速 +15%',
    stats: { maxHp: 0.85, speed: 1.4, damage: 0.95, attackSpeed: 1.15 },
  },
];

// 射程刻度（画布约 960 宽）：
// 近战 50~115 | 短枪 170~250 | 中距枪 280~340 | 长距 380~420 | 狙击 520
export const WEAPON_DEFS = {
  // —— 近战：贴身，彼此有明显距离差 ——
  knife: {
    id: 'knife', name: '短刀', emoji: '🔪', type: 'melee',
    baseDamage: 14, cooldown: 0.35, range: 52,
    desc: '贴身速砍 · 射程极近',
  },
  axe: {
    id: 'axe', name: '战斧', emoji: '🪓', type: 'melee',
    baseDamage: 24, cooldown: 0.7, range: 78, sweep: true,
    desc: '中距横扫 · 比短刀远',
  },
  spear: {
    id: 'spear', name: '长矛', emoji: '🗡️', type: 'melee',
    baseDamage: 20, cooldown: 0.55, range: 115,
    desc: '突刺 · 近战中最远',
  },
  // —— 远程：枪械由近到远 ——
  shotgun: {
    id: 'shotgun', name: '霰弹枪', emoji: '💥', type: 'ranged',
    baseDamage: 7, cooldown: 0.85, range: 170, projectileSpeed: 400, pellets: 5, spread: 0.45,
    desc: '近距散射 · 射程较短',
  },
  smg: {
    id: 'smg', name: '冲锋枪', emoji: '🔫', type: 'ranged',
    baseDamage: 4, cooldown: 0.12, range: 230, projectileSpeed: 480,
    desc: '中近距扫射 · 射速极快',
  },
  pistol: {
    id: 'pistol', name: '手枪', emoji: '🔫', type: 'ranged',
    baseDamage: 9, cooldown: 0.4, range: 290, projectileSpeed: 560,
    desc: '中距点射 · 均衡射程',
  },
  wand: {
    id: 'wand', name: '魔杖', emoji: '🪄', type: 'ranged',
    baseDamage: 11, cooldown: 0.6, range: 320, projectileSpeed: 360, homing: true,
    desc: '中距追踪 · 弹速较慢',
  },
  laser: {
    id: 'laser', name: '激光', emoji: '✨', type: 'ranged',
    baseDamage: 16, cooldown: 0.95, range: 400, projectileSpeed: 900, pierce: 2,
    desc: '远距穿透 · 射程较长',
  },
  sniper: {
    id: 'sniper', name: '狙击枪', emoji: '🎯', type: 'ranged',
    baseDamage: 32, cooldown: 1.35, range: 520, projectileSpeed: 1100,
    desc: '超远狙击 · 射程最远',
  },
};

export const STAT_UPGRADES = [
  { id: 'hp', name: '生命强化', emoji: '❤️', desc: '最大生命 +15', effect: (p) => { p.maxHp += 15; p.hp += 15; }, basePrice: 5 },
  { id: 'damage', name: '伤害强化', emoji: '⚔️', desc: '伤害 +10%', effect: (p) => { p.damageMod *= 1.1; }, basePrice: 6 },
  { id: 'speed', name: '移速强化', emoji: '👟', desc: '移速 +8%', effect: (p) => { p.speedMod *= 1.08; }, basePrice: 5 },
  { id: 'armor', name: '护甲强化', emoji: '🛡️', desc: '护甲 +3', effect: (p) => { p.armor += 3; }, basePrice: 7 },
  { id: 'luck', name: '幸运强化', emoji: '🍀', desc: '幸运 +5', effect: (p) => { p.luck += 5; }, basePrice: 8 },
  { id: 'regen', name: '生命恢复', emoji: '💚', desc: '每秒回血 +1', effect: (p) => { p.regen += 1; }, basePrice: 10 },
  { id: 'lifesteal', name: '生命偷取', emoji: '🧛', desc: '击杀回血 +2', effect: (p) => { p.lifesteal += 2; }, basePrice: 12 },
  { id: 'range', name: '射程强化', emoji: '📡', desc: '射程 +10%', effect: (p) => { p.rangeMod *= 1.1; }, basePrice: 6 },
];

/**
 * role: normal | fast | tank | ranged | miniboss | boss
 * ranged: 远程攻击配置；keepDistance: 远程怪试图保持的距离
 */
// 玩家基础移速约 180：小怪必须更慢，才能靠走位风筝；
// 疾速怪接近但仍低于玩家，站桩会挨打，持续移动可拉开。
export const ENEMY_TYPES = [
  // —— 普通 ——
  {
    id: 'slime', role: 'normal', emoji: '👾', color: '#4ade80',
    baseHp: 14, speed: 78, damage: 5, material: 1, radius: 14,
  },
  {
    id: 'zombie', role: 'normal', emoji: '🧟', color: '#86efac',
    baseHp: 20, speed: 70, damage: 6, material: 1, radius: 15,
  },
  // —— 速度快 · 血薄（需要走位，但可拉开）——
  {
    id: 'bat', role: 'fast', emoji: '🦇', color: '#a78bfa',
    baseHp: 7, speed: 145, damage: 4, material: 1, radius: 12,
  },
  {
    id: 'spider', role: 'fast', emoji: '🕷️', color: '#c084fc',
    baseHp: 9, speed: 135, damage: 5, material: 1, radius: 12,
  },
  // —— 血厚 · 慢 ——
  {
    id: 'skull', role: 'tank', emoji: '💀', color: '#f87171',
    baseHp: 42, speed: 48, damage: 8, material: 2, radius: 16,
  },
  {
    id: 'golem', role: 'tank', emoji: '🪨', color: '#a8a29e',
    baseHp: 65, speed: 40, damage: 10, material: 3, radius: 22,
  },
  // —— 远程攻击 ——
  {
    id: 'mage', role: 'ranged', emoji: '🧙', color: '#38bdf8',
    baseHp: 16, speed: 58, damage: 4, material: 2, radius: 14, keepDistance: 200,
    ranged: { damage: 7, cooldown: 1.5, range: 300, projectileSpeed: 260, color: '#38bdf8' },
  },
  {
    id: 'eye', role: 'ranged', emoji: '👁️', color: '#f472b6',
    baseHp: 12, speed: 68, damage: 3, material: 2, radius: 13, keepDistance: 220,
    ranged: { damage: 6, cooldown: 1.15, range: 320, projectileSpeed: 290, color: '#f472b6' },
  },
  // —— 小 Boss ——
  {
    id: 'miniboss', role: 'miniboss', emoji: '😈', color: '#fb923c',
    baseHp: 130, speed: 72, damage: 12, material: 10, radius: 28, isMiniBoss: true,
    ranged: { damage: 10, cooldown: 1.8, range: 340, projectileSpeed: 280, color: '#fb923c' },
  },
  // —— 最终 Boss ——
  {
    id: 'boss', role: 'boss', emoji: '👹', color: '#ef4444',
    baseHp: 420, speed: 52, damage: 16, material: 30, radius: 36, isBoss: true,
    ranged: { damage: 14, cooldown: 1.4, range: 400, projectileSpeed: 300, color: '#ef4444' },
  },
];

/** 按波次权重抽取一只普通怪（不含最终 Boss） */
export function pickEnemyType(wave, { allowMiniBoss = true } = {}) {
  const weights = [];

  const add = (role, weight) => {
    for (const t of ENEMY_TYPES) {
      if (t.role === role) weights.push({ type: t, weight });
    }
  };

  add('normal', 10);
  if (wave >= 2) add('fast', 6 + wave);
  if (wave >= 3) add('tank', 4 + Math.floor(wave * 0.5));
  if (wave >= 4) add('ranged', 5 + Math.floor(wave * 0.6));

  // 小 Boss：中后期低概率，且场上一般不刷太多（由调用方控制）
  if (allowMiniBoss && wave >= 5) {
    add('miniboss', 0.6 + wave * 0.08);
  }

  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.type;
  }
  return weights[0]?.type || ENEMY_TYPES[0];
}

export function getWaveDuration(wave) {
  return Math.min(15 + wave * 1.1, 36);
}

/** 每秒刷怪数量：更高密度，制造紧张感 */
export function getWaveSpawnRate(wave) {
  return 1.5 + wave * 0.28;
}

/** 同时场上敌人软上限 */
export function getWaveMaxAlive(wave) {
  return Math.min(14 + Math.floor(wave * 1.8), 42);
}

/** 材料吸附半径（进入此距离会被吸向角色） */
export const MATERIAL_MAGNET_RANGE = 220;

export function getTierMultiplier(tier) {
  return [1, 1.5, 2.2, 3.5][tier - 1] || 1;
}

export function getWeaponPrice(weaponId, tier, wave) {
  const base = {
    knife: 4, axe: 6, spear: 6,
    shotgun: 5, smg: 5, pistol: 4, wand: 7, laser: 8, sniper: 10,
  };
  return Math.floor((base[weaponId] || 5) * getTierMultiplier(tier) + wave * 0.5);
}

export function getStatPrice(upgrade, wave) {
  return Math.floor(upgrade.basePrice + wave * 0.8);
}

export function randomPick(arr, count, luck = 0) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5 + luck * 0.01);
  return shuffled.slice(0, count);
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
