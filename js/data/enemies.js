/**
 * role: normal | fast | tank | ranged | swarm | miniboss | boss
 * minWave: 最早出现波次（渐进解锁，避免突然变难）
 */
export const ENEMY_TYPES = [
  // 普通
  { id: 'slime', role: 'normal', emoji: '👾', color: '#4ade80', minWave: 1,
    baseHp: 14, speed: 78, damage: 5, material: 1, radius: 14 },
  { id: 'zombie', role: 'normal', emoji: '🧟', color: '#86efac', minWave: 1,
    baseHp: 20, speed: 70, damage: 6, material: 1, radius: 15 },
  { id: 'grub', role: 'normal', emoji: '🐛', color: '#a3e635', minWave: 2,
    baseHp: 12, speed: 82, damage: 4, material: 1, radius: 12 },
  // 疾速
  { id: 'bat', role: 'fast', emoji: '🦇', color: '#a78bfa', minWave: 2,
    baseHp: 7, speed: 145, damage: 4, material: 1, radius: 12 },
  { id: 'spider', role: 'fast', emoji: '🕷️', color: '#c084fc', minWave: 3,
    baseHp: 9, speed: 135, damage: 5, material: 1, radius: 12 },
  { id: 'wisp', role: 'fast', emoji: '✨', color: '#f0abfc', minWave: 6,
    baseHp: 8, speed: 150, damage: 5, material: 2, radius: 11 },
  // 坦克
  { id: 'skull', role: 'tank', emoji: '💀', color: '#f87171', minWave: 3,
    baseHp: 42, speed: 48, damage: 8, material: 2, radius: 16 },
  { id: 'golem', role: 'tank', emoji: '🪨', color: '#a8a29e', minWave: 5,
    baseHp: 65, speed: 40, damage: 10, material: 3, radius: 22 },
  { id: 'shell', role: 'tank', emoji: '🐢', color: '#78716c', minWave: 8,
    baseHp: 80, speed: 36, damage: 9, material: 3, radius: 20 },
  // 远程
  { id: 'mage', role: 'ranged', emoji: '🧙', color: '#38bdf8', minWave: 4,
    baseHp: 16, speed: 58, damage: 4, material: 2, radius: 14, keepDistance: 200,
    ranged: { damage: 7, cooldown: 1.5, range: 300, projectileSpeed: 260, color: '#38bdf8' } },
  { id: 'eye', role: 'ranged', emoji: '👁️', color: '#f472b6', minWave: 5,
    baseHp: 12, speed: 68, damage: 3, material: 2, radius: 13, keepDistance: 220,
    ranged: { damage: 6, cooldown: 1.15, range: 320, projectileSpeed: 290, color: '#f472b6' } },
  { id: 'turretbug', role: 'ranged', emoji: '🪲', color: '#2dd4bf', minWave: 9,
    baseHp: 22, speed: 40, damage: 3, material: 2, radius: 14, keepDistance: 240,
    ranged: { damage: 8, cooldown: 1.8, range: 340, projectileSpeed: 300, color: '#2dd4bf' } },
  // 虫群
  { id: 'mite', role: 'swarm', emoji: '🐜', color: '#fbbf24', minWave: 7,
    baseHp: 5, speed: 125, damage: 3, material: 1, radius: 9 },
  // 小 Boss / Boss
  { id: 'miniboss', role: 'miniboss', emoji: '😈', color: '#fb923c', minWave: 5, isMiniBoss: true,
    baseHp: 130, speed: 72, damage: 12, material: 10, radius: 28,
    ranged: { damage: 10, cooldown: 1.8, range: 340, projectileSpeed: 280, color: '#fb923c' } },
  { id: 'boss', role: 'boss', emoji: '👹', color: '#ef4444', minWave: 20, isBoss: true,
    baseHp: 420, speed: 52, damage: 16, material: 30, radius: 36,
    ranged: { damage: 14, cooldown: 1.4, range: 400, projectileSpeed: 300, color: '#ef4444' } },
];

export function pickEnemyType(wave, { allowMiniBoss = true } = {}) {
  const weights = [];
  const add = (role, weight) => {
    for (const t of ENEMY_TYPES) {
      if (t.role !== role) continue;
      if ((t.minWave || 1) > wave) continue;
      if (t.isBoss) continue;
      weights.push({ type: t, weight });
    }
  };

  add('normal', 10);
  if (wave >= 2) add('fast', 5 + wave * 0.6);
  if (wave >= 3) add('tank', 3 + wave * 0.4);
  if (wave >= 4) add('ranged', 4 + wave * 0.5);
  if (wave >= 7) add('swarm', 3 + wave * 0.3);
  if (allowMiniBoss && wave >= 5) add('miniboss', 0.5 + wave * 0.06);

  const total = weights.reduce((s, w) => s + w.weight, 0) || 1;
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.type;
  }
  return weights[0]?.type || ENEMY_TYPES[0];
}
