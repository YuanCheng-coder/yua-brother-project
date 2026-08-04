/** 章节：主题色、地形偏好、波次区间、难度倍率（平滑） */
export const CHAPTERS = [
  {
    id: 'grove', name: '暮色林地', emoji: '🌲',
    waves: [1, 5],
    difficulty: 1.0,
    theme: { bg0: '#142018', bg1: '#0a100c', accent: '#4ade80', ambient: '#86efac' },
    terrain: ['grass', 'dirt', 'bush'],
    blurb: '学习走位与基础构筑',
  },
  {
    id: 'ruins', name: '荒废街垒', emoji: '🏚️',
    waves: [6, 10],
    difficulty: 1.08,
    theme: { bg0: '#1a1820', bg1: '#0e0c12', accent: '#94a3b8', ambient: '#cbd5e1' },
    terrain: ['stone', 'crack', 'rubble'],
    blurb: '坦克与远程开始出现',
  },
  {
    id: 'marsh', name: '雾沼禁地', emoji: '🌫️',
    waves: [11, 15],
    difficulty: 1.16,
    theme: { bg0: '#121a22', bg1: '#080e14', accent: '#2dd4bf', ambient: '#5eead4' },
    terrain: ['mud', 'water', 'reed'],
    blurb: '减速地形与虫群压力',
  },
  {
    id: 'volcano', name: '熔心火谷', emoji: '🌋',
    waves: [16, 20],
    difficulty: 1.24,
    theme: { bg0: '#221210', bg1: '#120808', accent: '#f97316', ambient: '#fb923c' },
    terrain: ['basalt', 'lava', 'ash'],
    blurb: '高温危险区与精英压迫',
  },
  {
    id: 'starport', name: '裂空星港', emoji: '🚀',
    waves: [21, 30],
    difficulty: 1.32,
    theme: { bg0: '#101428', bg1: '#070812', accent: '#818cf8', ambient: '#a5b4fc' },
    terrain: ['metal', 'circuit', 'void'],
    blurb: '终局挑战（无尽扩展区）',
  },
];

export const MAX_WAVES = 30;

export function getChapterForWave(wave) {
  return CHAPTERS.find(c => wave >= c.waves[0] && wave <= c.waves[1]) || CHAPTERS[CHAPTERS.length - 1];
}

/** 平滑难度：生命/伤害倍率，避免突变 */
export function getWavePowerScale(wave) {
  const chapter = getChapterForWave(wave);
  const local = wave - chapter.waves[0];
  const span = chapter.waves[1] - chapter.waves[0] + 1;
  const t = local / span;
  // 章内缓升 + 章间衔接，不做台阶跳变
  return chapter.difficulty * (1 + t * 0.08) * (1 + (wave - 1) * 0.035);
}

export function getWaveDuration(wave) {
  return Math.min(14 + wave * 0.9, 34);
}

export function getWaveSpawnRate(wave) {
  // 缓慢增加密度，前几波友好
  const base = 1.1 + wave * 0.2;
  return Math.min(base, 5.5);
}

export function getWaveMaxAlive(wave) {
  return Math.min(10 + Math.floor(wave * 1.3), 36);
}
