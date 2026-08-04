import {
  WEAPON_DEFS, getTierMultiplier, dist, clamp, lerp,
  ARENA_PADDING, CANVAS_WIDTH, CANVAS_HEIGHT, MATERIAL_MAGNET_RANGE,
} from './constants.js';

let nextId = 1;
export function uid() { return nextId++; }

export class Player {
  constructor(charDef) {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT / 2;
    this.radius = 22;
    this.charDef = charDef;
    const s = charDef.stats;

    this.maxHp = Math.floor(100 * (s.maxHp || 1));
    this.hp = this.maxHp;
    this.baseSpeed = 180 * (s.speed || 1);
    this.speedMod = 1;
    this.damageMod = s.damage || 1;
    this.meleeDamageMod = s.meleeDamage || 1;
    this.rangedDamageMod = s.rangedDamage || 1;
    this.rangeMod = s.range || 1;
    this.attackSpeedMod = s.attackSpeed || 1;
    this.armor = s.armor || 0;
    this.luck = s.luck || 0;
    this.regen = 0;
    this.lifesteal = s.lifesteal || 0;
    this.crit = s.crit || 0;
    this.materialGain = s.materialGain || 1;
    this.elementalMod = s.elemental || 1;
    this.iFramesMult = s.iFrames || 1;
    this.berserk = !!s.berserk;
    this.terrainSpeed = 1;

    this.weapons = [];
    this.materials = 0;
    this.kills = 0;
    this.vx = 0;
    this.vy = 0;
    this.invincible = 0;
    this.regenTimer = 0;
  }

  get speed() { return this.baseSpeed * this.speedMod * (this.terrainSpeed || 1); }

  addWeapon(weaponId, tier = 1) {
    const existing = this.weapons.find(w => w.id === weaponId && w.tier === tier);
    if (existing && tier < 4) {
      this.weapons = this.weapons.filter(w => w !== existing);
      this.weapons.push(createWeapon(weaponId, tier + 1));
      return 'merged';
    }
    if (this.weapons.length >= 6) return 'full';
    this.weapons.push(createWeapon(weaponId, tier));
    return 'added';
  }

  takeDamage(amount) {
    if (this.invincible > 0) return 0;
    const reduced = Math.max(1, amount - this.armor * 0.5);
    this.hp -= reduced;
    this.invincible = 0.35 * this.iFramesMult;
    this.hitFeedback = { amount: reduced, x: this.x, y: this.y };
    return reduced;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt, keys) {
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
    }

    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;
    this.x = clamp(this.x, ARENA_PADDING + this.radius, CANVAS_WIDTH - ARENA_PADDING - this.radius);
    this.y = clamp(this.y, ARENA_PADDING + this.radius, CANVAS_HEIGHT - ARENA_PADDING - this.radius);

    if (this.invincible > 0) this.invincible -= dt;
    if (this.regen > 0) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1) {
        this.regenTimer = 0;
        this.heal(this.regen);
      }
    }
    // 武器开火只在 Game.update 里处理，避免重复调用导致攻击丢失
  }

  draw(ctx) {
    ctx.save();
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 18, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const grad = ctx.createRadialGradient(this.x - 5, this.y - 5, 2, this.x, this.y, this.radius);
    grad.addColorStop(0, '#f4c97a');
    grad.addColorStop(0.7, '#d4a056');
    grad.addColorStop(1, '#a67c3a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(this.x - 8, this.y - 4, 4, 0, Math.PI * 2);
    ctx.arc(this.x + 8, this.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(this.x - 6, this.y - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function createWeapon(weaponId, tier = 1) {
  const def = WEAPON_DEFS[weaponId];
  if (!def) return null;
  const mult = getTierMultiplier(tier);
  return {
    uid: uid(),
    id: weaponId,
    tier,
    def,
    cooldown: 0,
    upgradeLevel: 0,
    enchants: [],
    enchantMods: { damage: 1, attackSpeed: 1, pierce: 0, crit: 0, lifesteal: 0 },
    get damage() {
      const up = (def.upgrade?.damage || 0) * this.upgradeLevel;
      return (def.baseDamage + up) * mult * (this.enchantMods.damage || 1);
    },
    get range() {
      const up = (def.upgrade?.range || 0) * this.upgradeLevel;
      return (def.range + up) * (1 + (tier - 1) * 0.1);
    },
    get cd() {
      const up = (def.upgrade?.cooldown || 0) * this.upgradeLevel;
      return Math.max(0.05, (def.cooldown + up) / mult / (this.enchantMods.attackSpeed || 1));
    },
    upgrade() {
      this.upgradeLevel += 1;
    },
    update(dt, player) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (this.cooldown > 0) return null;

      const range = this.range * player.rangeMod;
      const target = findNearestEnemyInRange(player, range);
      if (!target) return null;

      this.cooldown = this.cd / player.attackSpeedMod;
      return fireWeapon(this, player, target);
    },
  };
}

let enemyListRef = null;
export function setEnemyList(list) { enemyListRef = list; }

function findNearestEnemyInRange(player, range) {
  if (!enemyListRef) return null;
  let nearest = null, minDist = Infinity;
  for (const e of enemyListRef) {
    if (e.dead) continue;
    const d = dist(player.x, player.y, e.x, e.y) - e.radius;
    if (d <= range && d < minDist) {
      minDist = d;
      nearest = e;
    }
  }
  return nearest;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function fireWeapon(weapon, player, target) {
  const def = weapon.def;
  const dmgMod = def.type === 'melee' ? player.meleeDamageMod : player.rangedDamageMod;
  let damage = weapon.damage * player.damageMod * dmgMod;
  if (def.tags?.includes('magic') || def.tags?.includes('elemental')) {
    damage *= player.elementalMod || 1;
  }
  if (player.berserk && player.hp < player.maxHp * 0.4) damage *= 1.25;
  const critChance = (player.crit || 0) + (weapon.enchantMods?.crit || 0);
  if (Math.random() < critChance) damage *= 1.75;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const targetDist = dist(player.x, player.y, target.x, target.y);
  const touchDist = player.radius + target.radius + 10;
  const results = [];

  // 贴身必中：子弹若从身前生成会直接越过敌人，导致“贴脸打不到”
  if (targetDist <= touchDist) {
    results.push({
      type: 'pointblank',
      x: target.x,
      y: target.y,
      damage: def.pellets ? damage * 1.2 : damage,
      life: 0.05,
      maxLife: 0.05,
      color: '#f4a261',
      target,
      hitEnemies: new Set(),
    });
    if (def.type === 'melee') {
      results.push({
        type: 'melee',
        x: player.x, y: player.y,
        angle, range: weapon.range * player.rangeMod,
        damage: 0, // 伤害已由 pointblank 结算
        sweep: true, // 贴身挥砍用大角度，方便打到周围贴脸怪
        pointBlank: true,
        life: 0.1, maxLife: 0.1,
        color: '#f4a261',
        hitEnemies: new Set([target]),
      });
    }
    return results;
  }

  if (def.type === 'melee') {
    results.push({
      type: 'melee',
      x: player.x, y: player.y,
      angle, range: weapon.range * player.rangeMod,
      damage, sweep: def.sweep,
      life: 0.12, maxLife: 0.12,
      color: '#f4a261',
      hitEnemies: new Set(),
    });
  } else if (def.pellets) {
    for (let i = 0; i < def.pellets; i++) {
      const spread = (Math.random() - 0.5) * def.spread;
      results.push(createProjectile(player, angle + spread, damage * 0.7, def, weapon));
    }
  } else {
    results.push(createProjectile(player, angle, damage, def, weapon));
  }
  return results;
}

function createProjectile(player, angle, damage, def, weapon) {
  const travelRange = weapon.range * player.rangeMod;
  const life = travelRange / def.projectileSpeed;
  // 贴身生成偏移要小，避免出生点落在敌人外侧
  const muzzle = 8;
  return {
    type: 'projectile',
    x: player.x + Math.cos(angle) * muzzle,
    y: player.y + Math.sin(angle) * muzzle,
    vx: Math.cos(angle) * def.projectileSpeed,
    vy: Math.sin(angle) * def.projectileSpeed,
    damage,
    pierce: (def.pierce || 0) + (weapon.enchantMods?.pierce || 0),
    homing: def.homing || false,
    life,
    maxLife: life,
    radius: def.id === 'sniper' ? 5 : 4,
    color: weapon.enchants?.includes('flame') ? '#f97316'
      : weapon.enchants?.includes('frost') ? '#38bdf8'
      : weapon.tier >= 3 ? '#60a5fa' : weapon.tier >= 2 ? '#4ade80' : '#f4a261',
    hitEnemies: new Set(),
    lifestealBonus: weapon.enchantMods?.lifesteal || 0,
  };
}

export class Enemy {
  constructor(type, wave, x, y, powerScale = 1) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.dead = false;
    const scale = powerScale || (1 + (wave - 1) * 0.035);
    const eliteMult = type.isMiniBoss ? 1.15 : type.isBoss ? 1.25 : 1;
    this.maxHp = Math.floor(type.baseHp * scale * eliteMult);
    this.hp = this.maxHp;
    this.speed = type.speed * (1 + Math.min(wave - 1, 12) * 0.015);
    this.damage = Math.floor(type.damage * (0.95 + scale * 0.08));
    this.radius = type.radius || (type.isBoss ? 36 : type.isMiniBoss ? 28 : 14);
    this.hitFlash = 0;
    this.wobble = Math.random() * Math.PI * 2;
    this.shootCd = 0.4 + Math.random() * 0.8;
  }

  /** @returns {Array} 本帧射出的敌方子弹 */
  update(dt, player) {
    const shots = [];
    if (this.dead) return shots;

    const d = dist(this.x, this.y, player.x, player.y);
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.wobble += dt * (this.type.role === 'fast' ? 5 : 3);

    // 移动：远程怪保持距离，其余追击
    let moveAngle = angle;
    let moveSpeed = this.speed;
    if (this.type.keepDistance) {
      const ideal = this.type.keepDistance;
      if (d < ideal - 30) {
        moveAngle = angle + Math.PI; // 后退
        moveSpeed = this.speed * 0.9;
      } else if (d > ideal + 40) {
        moveAngle = angle;
        moveSpeed = this.speed;
      } else {
        // 侧向游走，避免站桩
        moveAngle = angle + Math.PI / 2 * (Math.sin(this.wobble) > 0 ? 1 : -1);
        moveSpeed = this.speed * 0.55;
      }
    }

    this.x += Math.cos(moveAngle) * moveSpeed * dt;
    this.y += Math.sin(moveAngle) * moveSpeed * dt;
    this.x = clamp(this.x, ARENA_PADDING + this.radius, CANVAS_WIDTH - ARENA_PADDING - this.radius);
    this.y = clamp(this.y, ARENA_PADDING + this.radius, CANVAS_HEIGHT - ARENA_PADDING - this.radius);

    // 远程开火
    if (this.type.ranged) {
      this.shootCd -= dt;
      const rd = this.type.ranged;
      if (this.shootCd <= 0 && d <= rd.range && d > this.radius + player.radius) {
        this.shootCd = rd.cooldown * (0.85 + Math.random() * 0.3);
        shots.push(createEnemyProjectile(this, player, rd));
      }
    }

    // 接触伤害
    if (d < this.radius + player.radius) {
      player.takeDamage(this.damage);
    }
    if (this.hitFlash > 0) this.hitFlash -= dt;
    return shots;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.1;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    if (this.hitFlash > 0) ctx.filter = 'brightness(2)';

    const bob = Math.sin(this.wobble) * 2;

    // 小 Boss / Boss 外圈光环
    if (this.type.isMiniBoss || this.type.isBoss) {
      ctx.strokeStyle = this.type.color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bob, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.font = `${this.radius * 1.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.emoji, this.x, this.y + bob);

    // 血条：精英怪始终显示
    if (this.hp < this.maxHp || this.type.isMiniBoss || this.type.isBoss) {
      const barW = Math.max(this.radius * 2, 28);
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, 4);
      ctx.fillStyle = this.type.color;
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * (this.hp / this.maxHp), 4);
    }
    ctx.restore();
  }
}

function createEnemyProjectile(enemy, player, rd) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const life = rd.range / rd.projectileSpeed;
  return {
    type: 'enemy',
    x: enemy.x + Math.cos(angle) * (enemy.radius + 4),
    y: enemy.y + Math.sin(angle) * (enemy.radius + 4),
    vx: Math.cos(angle) * rd.projectileSpeed,
    vy: Math.sin(angle) * rd.projectileSpeed,
    damage: rd.damage,
    life,
    maxLife: life,
    radius: enemy.type.isBoss ? 7 : 5,
    color: rd.color || '#f87171',
  };
}

export class Material {
  constructor(x, y, amount) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.life = 12;
    this.collected = false;
    this.magnetRange = MATERIAL_MAGNET_RANGE;
    this.vacuum = false; // 波次结束全图吸附
  }

  update(dt, player) {
    if (this.collected) return;
    if (!this.vacuum) this.life -= dt;
    const d = dist(this.x, this.y, player.x, player.y);

    // 普通：一定距离吸附；收钱阶段：全图吸向角色
    const range = this.vacuum ? 9999 : this.magnetRange;
    if (d < range) {
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const t = this.vacuum ? Math.min(1, 1 - d / 500) : (1 - d / this.magnetRange);
      const speed = this.vacuum
        ? lerp(420, 1100, Math.max(0, t))
        : lerp(280, 900, Math.max(0, t) ** 2);
      this.x += Math.cos(angle) * speed * dt;
      this.y += Math.sin(angle) * speed * dt;
    }

    if (d < player.radius + 18) {
      this.collected = true;
      player.materials += this.amount;
    }
  }

  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life);
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', this.x, this.y);
    ctx.restore();
  }
}

export class Particle {
  constructor(x, y, color, vx, vy, life, opts = {}) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color;
    this.radius = opts.radius ?? (2 + Math.random() * 3);
    this.gravity = opts.gravity ?? 0;
    this.drag = opts.drag ?? 0.95;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnParticles(list, x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    list.push(new Particle(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.3 + Math.random() * 0.3));
  }
}

/** 受击流血粒子 */
export function spawnBlood(list, x, y, amount = 1) {
  const count = Math.min(14, 8 + Math.floor(amount * 0.4));
  const colors = ['#ef4444', '#dc2626', '#b91c1c', '#f87171'];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // 偏上溅射
    const speed = 60 + Math.random() * 180;
    list.push(new Particle(
      x + (Math.random() - 0.5) * 10,
      y + (Math.random() - 0.5) * 10,
      colors[Math.floor(Math.random() * colors.length)],
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0.35 + Math.random() * 0.45,
      { radius: 1.5 + Math.random() * 3.5, gravity: 280, drag: 0.92 }
    ));
  }
}
