import { WEAPON_DEFS, getTierMultiplier, dist, clamp, ARENA_PADDING, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

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
    this.lifesteal = 0;

    this.weapons = [];
    this.materials = 0;
    this.kills = 0;
    this.vx = 0;
    this.vy = 0;
    this.invincible = 0;
    this.regenTimer = 0;
  }

  get speed() { return this.baseSpeed * this.speedMod; }

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
    if (this.invincible > 0) return;
    const reduced = Math.max(1, amount - this.armor * 0.5);
    this.hp -= reduced;
    this.invincible = 0.3;
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

    for (const w of this.weapons) w.update(dt, this);
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
    get damage() { return def.baseDamage * mult; },
    get range() { return def.range * (1 + (tier - 1) * 0.1); },
    get cd() { return def.cooldown / mult; },
    update(dt, player) {
      this.cooldown -= dt;
      if (this.cooldown > 0) return null;

      const target = findNearestEnemy(player);
      if (!target) return null;

      const range = this.range * player.rangeMod;
      if (dist(player.x, player.y, target.x, target.y) > range) return null;

      this.cooldown = this.cd / player.attackSpeedMod;
      return fireWeapon(this, player, target);
    },
  };
}

let enemyListRef = null;
export function setEnemyList(list) { enemyListRef = list; }

function findNearestEnemy(player) {
  if (!enemyListRef) return null;
  let nearest = null, minDist = Infinity;
  for (const e of enemyListRef) {
    if (e.dead) continue;
    const d = dist(player.x, player.y, e.x, e.y);
    if (d < minDist) { minDist = d; nearest = e; }
  }
  return nearest;
}

function fireWeapon(weapon, player, target) {
  const def = weapon.def;
  const dmgMod = def.type === 'melee' ? player.meleeDamageMod : player.rangedDamageMod;
  const damage = weapon.damage * player.damageMod * dmgMod;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const results = [];

  if (def.type === 'melee') {
    results.push({
      type: 'melee',
      x: player.x, y: player.y,
      angle, range: weapon.range * player.rangeMod,
      damage, sweep: def.sweep,
      life: 0.15, maxLife: 0.15,
      color: '#f4a261',
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
  return {
    type: 'projectile',
    x: player.x + Math.cos(angle) * 25,
    y: player.y + Math.sin(angle) * 25,
    vx: Math.cos(angle) * def.projectileSpeed,
    vy: Math.sin(angle) * def.projectileSpeed,
    damage,
    pierce: def.pierce || 0,
    homing: def.homing || false,
    life: def.range / def.projectileSpeed + 0.5,
    maxLife: def.range / def.projectileSpeed + 0.5,
    radius: 4,
    color: weapon.tier >= 3 ? '#60a5fa' : weapon.tier >= 2 ? '#4ade80' : '#f4a261',
    hitEnemies: new Set(),
  };
}

export class Enemy {
  constructor(type, wave, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.dead = false;
    const scale = 1 + (wave - 1) * 0.12;
    this.maxHp = Math.floor(type.baseHp * scale);
    this.hp = this.maxHp;
    this.speed = type.speed * (1 + (wave - 1) * 0.03);
    this.damage = Math.floor(type.damage * (1 + (wave - 1) * 0.08));
    this.radius = type.isBoss ? 35 : 14;
    this.hitFlash = 0;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    if (this.dead) return;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(angle) * this.speed * dt;
    this.y += Math.sin(angle) * this.speed * dt;
    this.wobble += dt * 3;

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(this.damage);
    }
    if (this.hitFlash > 0) this.hitFlash -= dt;
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
    ctx.font = `${this.radius * 1.6}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.emoji, this.x, this.y + bob);

    // HP bar
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW, 4);
      ctx.fillStyle = this.type.color;
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW * (this.hp / this.maxHp), 4);
    }
    ctx.restore();
  }
}

export class Material {
  constructor(x, y, amount) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.life = 8;
    this.collected = false;
    this.magnetRange = 80;
    this.magnetSpeed = 300;
  }

  update(dt, player) {
    if (this.collected) return;
    this.life -= dt;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d < this.magnetRange || d < 30) {
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const speed = d < 30 ? 600 : this.magnetSpeed;
      this.x += Math.cos(angle) * speed * dt;
      this.y += Math.sin(angle) * speed * dt;
    }
    if (d < player.radius + 10) {
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
    ctx.fillText('💰', this.x, this.y);
    ctx.restore();
  }
}

export class Particle {
  constructor(x, y, color, vx, vy, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color;
    this.radius = 2 + Math.random() * 3;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.vx *= 0.95;
    this.vy *= 0.95;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
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
