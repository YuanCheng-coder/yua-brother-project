/** 附魔：可打在武器上，商店购买 */
export const ENCHANTMENTS = [
  {
    id: 'flame', name: '焰心', emoji: '🔥', color: '#f97316',
    desc: '伤害 +12%，附带灼烧观感',
    price: 12,
    apply: (w) => { w.enchantMods.damage = (w.enchantMods.damage || 1) * 1.12; w.enchants.push('flame'); },
  },
  {
    id: 'frost', name: '霜缚', emoji: '❄️', color: '#38bdf8',
    desc: '伤害 +8%，弹速/挥砍观感更冷',
    price: 11,
    apply: (w) => { w.enchantMods.damage = (w.enchantMods.damage || 1) * 1.08; w.enchants.push('frost'); },
  },
  {
    id: 'vampiric', name: '吸血', emoji: '🩸', color: '#e11d48',
    desc: '击杀额外回血 +1',
    price: 14,
    apply: (w) => { w.enchantMods.lifesteal = (w.enchantMods.lifesteal || 0) + 1; w.enchants.push('vampiric'); },
  },
  {
    id: 'swift', name: '迅疾', emoji: '💨', color: '#a3e635',
    desc: '攻速 +15%',
    price: 13,
    apply: (w) => { w.enchantMods.attackSpeed = (w.enchantMods.attackSpeed || 1) * 1.15; w.enchants.push('swift'); },
  },
  {
    id: 'pierce', name: '贯穿', emoji: '➡️', color: '#e2e8f0',
    desc: '远程穿透 +1（近战伤害 +10%）',
    price: 15,
    apply: (w) => {
      if (w.def.type === 'ranged') w.enchantMods.pierce = (w.enchantMods.pierce || 0) + 1;
      else w.enchantMods.damage = (w.enchantMods.damage || 1) * 1.1;
      w.enchants.push('pierce');
    },
  },
  {
    id: 'lucky', name: '幸运星', emoji: '⭐', color: '#fbbf24',
    desc: '暴击率 +10%',
    price: 12,
    apply: (w) => { w.enchantMods.crit = (w.enchantMods.crit || 0) + 0.1; w.enchants.push('lucky'); },
  },
  {
    id: 'boom', name: '爆裂', emoji: '💣', color: '#fb7185',
    desc: '伤害 +18%，冷却 +10%',
    price: 16,
    apply: (w) => {
      w.enchantMods.damage = (w.enchantMods.damage || 1) * 1.18;
      w.enchantMods.attackSpeed = (w.enchantMods.attackSpeed || 1) * 0.9;
      w.enchants.push('boom');
    },
  },
  {
    id: 'resonance', name: '共鸣', emoji: '🎵', color: '#c084fc',
    desc: '同标签武器伤害 +6%',
    price: 14,
    apply: (w) => { w.enchantMods.resonance = true; w.enchants.push('resonance'); },
  },
];

export function getEnchantPrice(ench, wave, player) {
  const discount = player?.charDef?.stats?.upgradeDiscount || 1;
  return Math.floor((ench.price + wave * 0.8) * discount);
}
