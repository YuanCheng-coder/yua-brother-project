/** 地形瓦片类型 */
export const TERRAIN_TYPES = {
  grass: { color: '#1f3d2a', alt: '#244832', speed: 1, hazard: 0 },
  dirt: { color: '#2a241c', alt: '#322a20', speed: 1, hazard: 0 },
  bush: { color: '#163524', alt: '#1a3d2a', speed: 0.92, hazard: 0 },
  stone: { color: '#2a2a32', alt: '#32323c', speed: 1, hazard: 0 },
  crack: { color: '#1e1e26', alt: '#26262e', speed: 1, hazard: 0 },
  rubble: { color: '#333038', alt: '#3a3740', speed: 0.9, hazard: 0 },
  mud: { color: '#1a2820', alt: '#203028', speed: 0.78, hazard: 0 },
  water: { color: '#143044', alt: '#183850', speed: 0.7, hazard: 0 },
  reed: { color: '#1a3028', alt: '#204038', speed: 0.85, hazard: 0 },
  basalt: { color: '#2a1c1c', alt: '#322222', speed: 1, hazard: 0 },
  lava: { color: '#5a1810', alt: '#6e2014', speed: 0.85, hazard: 4 },
  ash: { color: '#2a2220', alt: '#322826', speed: 0.95, hazard: 0 },
  metal: { color: '#1c2438', alt: '#243048', speed: 1.05, hazard: 0 },
  circuit: { color: '#182440', alt: '#203050', speed: 1, hazard: 0 },
  void: { color: '#101018', alt: '#141420', speed: 1, hazard: 0 },
};

export const TILE = 40;

export function buildTerrainMap(chapter, cols, rows) {
  const palette = chapter.terrain || ['grass', 'dirt'];
  const tiles = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      // 噪声式分布，边缘更可能是主地形
      const edge = x < 2 || y < 2 || x > cols - 3 || y > rows - 3;
      let key = palette[0];
      const r = Math.random();
      if (!edge && r > 0.55) key = palette[Math.floor(Math.random() * palette.length)];
      else if (r > 0.82) key = palette[Math.min(1, palette.length - 1)];
      // 熔岩/水面少而聚集
      if ((key === 'lava' || key === 'water') && Math.random() > 0.35) key = palette[0];
      row.push(key);
    }
    tiles.push(row);
  }
  return tiles;
}

export function sampleTerrain(tiles, worldX, worldY, pad) {
  const tx = Math.floor((worldX - pad) / TILE);
  const ty = Math.floor((worldY - pad) / TILE);
  if (!tiles[ty] || !tiles[ty][tx]) return TERRAIN_TYPES.grass;
  return TERRAIN_TYPES[tiles[ty][tx]] || TERRAIN_TYPES.grass;
}
