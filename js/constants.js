export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;
export const ARENA_PADDING = 40;
export const MAX_WEAPONS = 6;

export const TIER_COLORS = ['#aaa', '#4ade80', '#60a5fa', '#c084fc'];
export const TIER_NAMES = ['普通', '精良', '稀有', '史诗'];

export { CHARACTERS } from './data/characters.js';
export { WEAPON_DEFS, getWeaponPrice, getUpgradeCost } from './data/weapons.js';
export { ENCHANTMENTS, getEnchantPrice } from './data/enchantments.js';
export { ENEMY_TYPES, pickEnemyType } from './data/enemies.js';
export {
  CHAPTERS, MAX_WAVES, getChapterForWave, getWavePowerScale,
  getWaveDuration, getWaveSpawnRate, getWaveMaxAlive,
} from './data/stages.js';
export { TERRAIN_TYPES, TILE, buildTerrainMap, sampleTerrain } from './data/terrain.js';

export const STAT_UPGRADES = [
  { id: 'hp', name: '生命强化', emoji: '❤️', desc: '最大生命 +15', effect: (p) => { p.maxHp += 15; p.hp += 15; }, basePrice: 5 },
  { id: 'damage', name: '伤害强化', emoji: '⚔️', desc: '伤害 +10%', effect: (p) => { p.damageMod *= 1.1; }, basePrice: 6 },
  { id: 'speed', name: '移速强化', emoji: '👟', desc: '移速 +8%', effect: (p) => { p.speedMod *= 1.08; }, basePrice: 5 },
  { id: 'armor', name: '护甲强化', emoji: '🛡️', desc: '护甲 +3', effect: (p) => { p.armor += 3; }, basePrice: 7 },
  { id: 'luck', name: '幸运强化', emoji: '🍀', desc: '幸运 +5', effect: (p) => { p.luck += 5; }, basePrice: 8 },
  { id: 'regen', name: '生命恢复', emoji: '💚', desc: '每秒回血 +1', effect: (p) => { p.regen += 1; }, basePrice: 10 },
  { id: 'lifesteal', name: '生命偷取', emoji: '🧛', desc: '击杀回血 +2', effect: (p) => { p.lifesteal += 2; }, basePrice: 12 },
  { id: 'range', name: '射程强化', emoji: '📡', desc: '射程 +10%', effect: (p) => { p.rangeMod *= 1.1; }, basePrice: 6 },
  { id: 'crit', name: '暴击强化', emoji: '💥', desc: '暴击率 +5%', effect: (p) => { p.crit = (p.crit || 0) + 0.05; }, basePrice: 9 },
  { id: 'atkspd', name: '攻速强化', emoji: '⏱️', desc: '攻速 +8%', effect: (p) => { p.attackSpeedMod *= 1.08; }, basePrice: 7 },
];

export const MATERIAL_MAGNET_RANGE = 220;

export function getTierMultiplier(tier) {
  return [1, 1.5, 2.2, 3.5][tier - 1] || 1;
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
