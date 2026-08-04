export const WEAPON_DEFS = {
  // 近战
  knife: {
    id: 'knife', name: '短刀', emoji: '🔪', type: 'melee', tags: ['blade'],
    baseDamage: 14, cooldown: 0.35, range: 52,
    desc: '贴身速砍 · 射程极近', upgrade: { damage: 2, cooldown: -0.01 },
  },
  axe: {
    id: 'axe', name: '战斧', emoji: '🪓', type: 'melee', tags: ['blade', 'heavy'],
    baseDamage: 24, cooldown: 0.7, range: 78, sweep: true,
    desc: '中距横扫', upgrade: { damage: 3, range: 2 },
  },
  spear: {
    id: 'spear', name: '长矛', emoji: '🗡️', type: 'melee', tags: ['blade'],
    baseDamage: 20, cooldown: 0.55, range: 115,
    desc: '突刺 · 近战最远', upgrade: { damage: 2.5, range: 3 },
  },
  hammer: {
    id: 'hammer', name: '战锤', emoji: '🔨', type: 'melee', tags: ['heavy'],
    baseDamage: 32, cooldown: 0.95, range: 70, sweep: true,
    desc: '重击震退', upgrade: { damage: 4 },
  },
  // 远程枪械
  shotgun: {
    id: 'shotgun', name: '霰弹枪', emoji: '💥', type: 'ranged', tags: ['gun'],
    baseDamage: 7, cooldown: 0.85, range: 170, projectileSpeed: 400, pellets: 5, spread: 0.45,
    desc: '近距散射', upgrade: { damage: 1, pellets: 0.2 },
  },
  smg: {
    id: 'smg', name: '冲锋枪', emoji: '🔫', type: 'ranged', tags: ['gun'],
    baseDamage: 4, cooldown: 0.12, range: 230, projectileSpeed: 480,
    desc: '中近距扫射', upgrade: { damage: 0.6, cooldown: -0.005 },
  },
  pistol: {
    id: 'pistol', name: '手枪', emoji: '🔫', type: 'ranged', tags: ['gun'],
    baseDamage: 9, cooldown: 0.4, range: 290, projectileSpeed: 560,
    desc: '中距点射', upgrade: { damage: 1.2, range: 5 },
  },
  wand: {
    id: 'wand', name: '魔杖', emoji: '🪄', type: 'ranged', tags: ['magic'],
    baseDamage: 11, cooldown: 0.6, range: 320, projectileSpeed: 360, homing: true,
    desc: '中距追踪', upgrade: { damage: 1.5, cooldown: -0.02 },
  },
  laser: {
    id: 'laser', name: '激光', emoji: '✨', type: 'ranged', tags: ['energy'],
    baseDamage: 16, cooldown: 0.95, range: 400, projectileSpeed: 900, pierce: 2,
    desc: '远距穿透', upgrade: { damage: 2, pierce: 0.25 },
  },
  sniper: {
    id: 'sniper', name: '狙击枪', emoji: '🎯', type: 'ranged', tags: ['gun'],
    baseDamage: 32, cooldown: 1.35, range: 520, projectileSpeed: 1100,
    desc: '超远狙击', upgrade: { damage: 4, range: 8 },
  },
  flamethrower: {
    id: 'flamethrower', name: '喷火器', emoji: '🔥', type: 'ranged', tags: ['elemental', 'fire'],
    baseDamage: 3, cooldown: 0.08, range: 150, projectileSpeed: 320, pellets: 2, spread: 0.35,
    desc: '近距火焰雨', upgrade: { damage: 0.4, range: 3 },
  },
  crossbow: {
    id: 'crossbow', name: '弩', emoji: '🏹', type: 'ranged', tags: ['gun'],
    baseDamage: 22, cooldown: 0.85, range: 360, projectileSpeed: 700, pierce: 1,
    desc: '中远距穿透弩箭', upgrade: { damage: 2.5, pierce: 0.2 },
  },
};

export function getWeaponPrice(weaponId, tier, wave) {
  const base = {
    knife: 4, axe: 6, spear: 6, hammer: 8,
    shotgun: 5, smg: 5, pistol: 4, wand: 7, laser: 8, sniper: 10,
    flamethrower: 9, crossbow: 8,
  };
  const tierMult = [1, 1.5, 2.2, 3.5][tier - 1] || 1;
  return Math.floor((base[weaponId] || 5) * tierMult + wave * 0.5);
}

export function getUpgradeCost(weapon, wave) {
  const level = weapon.upgradeLevel || 0;
  return Math.floor(6 + level * 4 + wave * 0.6);
}
