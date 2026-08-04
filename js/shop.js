import {
  WEAPON_DEFS, STAT_UPGRADES, ENCHANTMENTS,
  getWeaponPrice, getStatPrice, getUpgradeCost, getEnchantPrice, randomPick,
} from './constants.js';

export class Shop {
  constructor() {
    this.items = [];
    this.rerollCount = 0;
    this.rerollBaseCost = 2;
  }

  generate(player, wave) {
    this.items = [];
    this.rerollCount = 0;
    this._fillItems(player, wave);
  }

  _fillItems(player, wave) {
    const itemCount = wave >= 8 ? 6 : 5;
    const pool = [];
    const weaponIds = Object.keys(WEAPON_DEFS);

    for (const wid of weaponIds) {
      const maxTier = wave >= 10 ? 4 : wave >= 5 ? 3 : wave >= 2 ? 2 : 1;
      const tier = 1 + Math.floor(Math.random() * maxTier);
      const owned = player.weapons.some(w => w.id === wid);
      const weight = owned ? 3 : 1;
      for (let i = 0; i < weight; i++) {
        pool.push({ kind: 'weapon', weaponId: wid, tier, price: getWeaponPrice(wid, tier, wave) });
      }
    }

    for (const upgrade of STAT_UPGRADES) {
      pool.push({ kind: 'stat', upgrade, price: getStatPrice(upgrade, wave) });
    }

    for (const w of player.weapons) {
      pool.push({
        kind: 'upgrade',
        weaponUid: w.uid,
        weaponName: w.def.name,
        emoji: w.def.emoji,
        price: getUpgradeCost(w, wave),
      });
    }

    if (wave >= 3 && player.weapons.length) {
      for (const enchant of ENCHANTMENTS) {
        pool.push({ kind: 'enchant', enchant, price: getEnchantPrice(enchant, wave, player) });
      }
    }

    const picked = randomPick(pool, itemCount * 4, player.luck || 0);
    const seen = new Set();
    for (const item of picked) {
      let key = item.kind;
      if (item.kind === 'weapon') key = `w-${item.weaponId}-${item.tier}`;
      else if (item.kind === 'stat') key = `s-${item.upgrade.id}`;
      else if (item.kind === 'upgrade') key = `u-${item.weaponUid}`;
      else if (item.kind === 'enchant') key = `e-${item.enchant.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      this.items.push({ ...item, sold: false, key });
      if (this.items.length >= itemCount) break;
    }
  }

  getRerollCost(wave) {
    return this.rerollBaseCost + this.rerollCount + Math.floor(wave * 0.3);
  }

  reroll(player, wave) {
    this.rerollCount++;
    this.items = [];
    this._fillItems(player, wave);
  }

  buy(item, player) {
    if (item.sold) return { ok: false, msg: '已售出' };
    if (player.materials < item.price) return { ok: false, msg: '材料不足' };
    player.materials -= item.price;
    item.sold = true;

    if (item.kind === 'weapon') {
      const result = player.addWeapon(item.weaponId, item.tier);
      if (result === 'full') {
        player.materials += item.price;
        item.sold = false;
        return { ok: false, msg: '武器槽已满 (6/6)' };
      }
      return { ok: true, msg: result === 'merged' ? '武器合成升级！' : '购买成功' };
    }
    if (item.kind === 'stat') {
      item.upgrade.effect(player);
      return { ok: true, msg: '属性提升！' };
    }
    if (item.kind === 'upgrade') {
      const w = player.weapons.find(x => x.uid === item.weaponUid);
      if (!w) {
        player.materials += item.price;
        item.sold = false;
        return { ok: false, msg: '武器不存在' };
      }
      w.upgrade();
      return { ok: true, msg: `${w.def.name} → Lv${w.upgradeLevel}` };
    }
    if (item.kind === 'enchant') {
      const target = player.weapons.find(w => !w.enchants.includes(item.enchant.id)) || player.weapons[0];
      if (!target || target.enchants.includes(item.enchant.id)) {
        player.materials += item.price;
        item.sold = false;
        return { ok: false, msg: '无法附魔' };
      }
      item.enchant.apply(target);
      return { ok: true, msg: `${target.def.name} + ${item.enchant.name}` };
    }
    return { ok: false, msg: '未知错误' };
  }
}

export function renderShopItems(container, shop, player, onBuy) {
  container.innerHTML = '';
  for (const item of shop.items) {
    const el = document.createElement('div');
    el.className = 'shop-item' + (item.sold ? ' sold' : '');
    let name = '', desc = '', emoji = '';
    if (item.kind === 'weapon') {
      const def = WEAPON_DEFS[item.weaponId];
      emoji = def.emoji; name = `${def.name} T${item.tier}`; desc = `${def.desc} · 射程 ${def.range}`;
    } else if (item.kind === 'stat') {
      emoji = item.upgrade.emoji; name = item.upgrade.name; desc = item.upgrade.desc;
    } else if (item.kind === 'upgrade') {
      emoji = '⬆️'; name = `升级 ${item.emoji}${item.weaponName}`; desc = '提升该武器基础数值';
    } else if (item.kind === 'enchant') {
      emoji = item.enchant.emoji; name = `附魔 · ${item.enchant.name}`; desc = item.enchant.desc;
    }
    el.innerHTML = `<div class="info"><div class="name">${emoji} ${name}</div><div class="desc">${desc}</div></div><div class="price">${item.sold ? '已售' : item.price + ' 💰'}</div>`;
    if (!item.sold) el.addEventListener('click', () => onBuy(item));
    container.appendChild(el);
  }
}

export function renderWeaponSlots(container, player) {
  container.innerHTML = '';
  if (!player.weapons.length) {
    container.innerHTML = '<div style="color:#666;font-size:0.85rem">暂无武器</div>';
    return;
  }
  for (const w of player.weapons) {
    const el = document.createElement('div');
    el.className = 'weapon-slot';
    const ench = (w.enchants || []).map(id => ENCHANTMENTS.find(e => e.id === id)?.emoji || '').join('');
    el.innerHTML = `<span>${w.def.emoji} ${w.def.name} <span class="tier-${w.tier}">T${w.tier}</span> Lv${w.upgradeLevel || 0}${ench ? ' ' + ench : ''}</span><span style="color:#888">${Math.floor(w.damage)}伤</span>`;
    container.appendChild(el);
  }
}

export function renderStatsPanel(container, player) {
  container.innerHTML = `
    <div class="stat-row"><span>❤️ 生命</span><span>${Math.ceil(player.hp)}/${player.maxHp}</span></div>
    <div class="stat-row"><span>⚔️ 伤害</span><span>${(player.damageMod * 100).toFixed(0)}%</span></div>
    <div class="stat-row"><span>👟 移速</span><span>${(player.speedMod * 100).toFixed(0)}%</span></div>
    <div class="stat-row"><span>🛡️ 护甲</span><span>${player.armor}</span></div>
    <div class="stat-row"><span>🍀 幸运</span><span>${player.luck}</span></div>
    <div class="stat-row"><span>💥 暴击</span><span>${((player.crit || 0) * 100).toFixed(0)}%</span></div>
    <div class="stat-row"><span>🧛 偷取</span><span>${player.lifesteal}</span></div>
  `;
}

export function renderHudWeapons(container, player) {
  container.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div');
    el.className = 'hud-weapon';
    if (player.weapons[i]) {
      el.classList.add(`tier-${player.weapons[i].tier}`);
      el.textContent = player.weapons[i].def.emoji;
    }
    container.appendChild(el);
  }
}
