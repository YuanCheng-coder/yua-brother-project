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

export const WEAPON_DEFS = {
  pistol: {
    id: 'pistol', name: '手枪', emoji: '🔫', type: 'ranged',
    baseDamage: 8, cooldown: 0.6, range: 280, projectileSpeed: 500,
    desc: '基础远程武器',
  },
  smg: {
    id: 'smg', name: '冲锋枪', emoji: '🔫', type: 'ranged',
    baseDamage: 4, cooldown: 0.15, range: 220, projectileSpeed: 450,
    desc: '高射速低伤害',
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', emoji: '💥', type: 'ranged',
    baseDamage: 6, cooldown: 0.9, range: 180, projectileSpeed: 400, pellets: 5, spread: 0.4,
    desc: '散射多发弹丸',
  },
  laser: {
    id: 'laser', name: '激光', emoji: '✨', type: 'ranged',
    baseDamage: 15, cooldown: 1.2, range: 350, projectileSpeed: 800, pierce: 2,
    desc: '穿透敌人',
  },
  knife: {
    id: 'knife', name: '短刀', emoji: '🔪', type: 'melee',
    baseDamage: 12, cooldown: 0.5, range: 60,
    desc: '快速近战',
  },
  axe: {
    id: 'axe', name: '战斧', emoji: '🪓', type: 'melee',
    baseDamage: 22, cooldown: 0.9, range: 75, sweep: true,
    desc: '范围横扫',
  },
  spear: {
    id: 'spear', name: '长矛', emoji: '🗡️', type: 'melee',
    baseDamage: 18, cooldown: 0.7, range: 100,
    desc: '长距离突刺',
  },
  wand: {
    id: 'wand', name: '魔杖', emoji: '🪄', type: 'ranged',
    baseDamage: 10, cooldown: 0.8, range: 300, projectileSpeed: 350, homing: true,
    desc: '追踪弹',
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

export const ENEMY_TYPES = [
  { id: 'slime', emoji: '👾', color: '#4ade80', baseHp: 15, speed: 60, damage: 5, material: 1, xp: 1 },
  { id: 'bat', emoji: '🦇', color: '#a78bfa', baseHp: 10, speed: 120, damage: 4, material: 1, xp: 1 },
  { id: 'skull', emoji: '💀', color: '#f87171', baseHp: 25, speed: 45, damage: 8, material: 2, xp: 2 },
  { id: 'ghost', emoji: '👻', color: '#94a3b8', baseHp: 18, speed: 90, damage: 6, material: 2, xp: 2 },
  { id: 'boss', emoji: '👹', color: '#ef4444', baseHp: 200, speed: 35, damage: 15, material: 20, xp: 10, isBoss: true },
];

export function getWaveDuration(wave) {
  return Math.min(20 + wave * 2, 60);
}

export function getWaveEnemyCount(wave) {
  return Math.floor(8 + wave * 3 + wave * wave * 0.3);
}

export function getTierMultiplier(tier) {
  return [1, 1.5, 2.2, 3.5][tier - 1] || 1;
}

export function getWeaponPrice(weaponId, tier, wave) {
  const base = { pistol: 4, smg: 5, shotgun: 6, laser: 8, knife: 4, axe: 7, spear: 6, wand: 7 };
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
