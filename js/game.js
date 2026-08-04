import {
  CANVAS_WIDTH, CANVAS_HEIGHT, ARENA_PADDING,
  MAX_WAVES, ENEMY_TYPES, CHARACTERS, TERRAIN_TYPES, TILE,
  getWaveDuration, getWaveSpawnRate, getWaveMaxAlive, pickEnemyType, dist,
  getChapterForWave, getWavePowerScale, buildTerrainMap, sampleTerrain,
} from './constants.js';
import {
  Player, Enemy, Material, Particle,
  setEnemyList, spawnParticles, spawnBlood, angleDiff,
} from './entities.js';
import { Shop } from './shop.js';
import { drawAmbientDust, drawPlayerGlow, drawTerrain } from './render/fx.js';
import {
  applyLastStand, tickHitstop, onEnemyKilled, tickRage,
  maybeSpawnPortal, maybeSpawnCrate, updatePortal, updateCrates,
  drawTensionOverlays, getEliteType, comboTier,
} from './systems/tension.js';

export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  COLLECTING: 'collecting',
  SHOP: 'shop',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  CONTINUE_OFFER: 'continue_offer',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = GameState.MENU;
    this.keys = {};
    this.player = null;
    this.enemies = [];
    this.materials = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.particles = [];
    this.shop = new Shop();
    this.miniBossSpawnedThisWave = 0;

    this.wave = 1;
    this.waveTimer = 0;
    this.waveDuration = 20;
    this.enemiesSpawned = 0;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.8;

    this.selectedChar = 0;
    this.totalKills = 0;
    this.shake = 0;
    this.hurtVignette = 0;
    this.chapter = null;
    this.tiles = [];
    this.time = 0;
    this.continueUsed = false;
    this.cursedRun = false;
    this.enemySpeedCurse = 1;
    this.crates = [];
    this.challengePortal = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.rageTimer = 0;
    this.rageKillTimes = [];
    this.worldSlow = 1;
    this.lastStand = false;
    this.hitstop = 0;

    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _triggerHurtFeedback(hit) {
    const amp = Math.min(10, 3.5 + hit.amount * 0.35);
    this.shake = Math.max(this.shake, amp);
    this.hurtVignette = Math.max(this.hurtVignette, 0.4);
    this.impactZoom = Math.max(this.impactZoom || 0, 0.04);
    spawnBlood(this.particles, hit.x, hit.y, hit.amount);
  }

  _consumeHitFeedback() {
    if (this.player?.hitFeedback) {
      this._triggerHurtFeedback(this.player.hitFeedback);
      this.player.hitFeedback = null;
    }
  }

  resize() {
    const scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = CANVAS_WIDTH * scale + 'px';
    this.canvas.style.height = CANVAS_HEIGHT * scale + 'px';
    this.scale = scale;
  }

  _bindInput() {
    const moveKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (this.state !== GameState.PLAYING && this.state !== GameState.COLLECTING) return;
      if (moveKeys.has(e.code)) {
        this.keys[e.code] = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', e => {
      if (moveKeys.has(e.code)) {
        this.keys[e.code] = false;
        e.preventDefault();
      }
    });

    const clearKeys = () => { this.keys = {}; };
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearKeys();
    });
  }

  clearKeys() {
    this.keys = {};
  }

  startSync(charIndex) {
    this.keys = {};
    const char = CHARACTERS[charIndex];
    this.player = new Player(char);
    this.player.addWeapon(char.startWeapon || 'pistol', 1);
    this.enemies = [];
    this.materials = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.particles = [];
    this.crates = [];
    this.challengePortal = null;
    this.wave = 1;
    this.totalKills = 0;
    this.shake = 0;
    this.hurtVignette = 0;
    this.time = 0;
    this.continueUsed = false;
    this.cursedRun = false;
    this.enemySpeedCurse = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.rageTimer = 0;
    this.rageKillTimes = [];
    this.worldSlow = 1;
    this.lastStand = false;
    this.hitstop = 0;
    this.challengeActive = false;
    this.state = GameState.PLAYING;
    // Daily streak: consecutive calendar days → starting materials
    try {
      const key = 'yua_daily_streak';
      const today = new Date().toISOString().slice(0, 10);
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      let streak = 1;
      if (prev.day) {
        const d0 = new Date(prev.day), d1 = new Date(today);
        const diff = Math.round((d1 - d0) / 86400000);
        streak = diff === 1 ? (prev.streak || 1) + 1 : (diff === 0 ? (prev.streak || 1) : 1);
      }
      localStorage.setItem(key, JSON.stringify({ day: today, streak }));
      this.dailyStreak = streak;
      this.player.materials += Math.min(20, streak * 2);
      this.streakBanner = 2.5;
    } catch (e) { this.dailyStreak = 1; }
    this._startWave();
  }

  /** One-time cursed continue: half HP, enemies +20% speed */
  acceptCursedContinue() {
    if (this.continueUsed || !this.player) return false;
    this.continueUsed = true;
    this.cursedRun = true;
    this.enemySpeedCurse = 1.2;
    this.player.hp = Math.max(1, Math.floor(this.player.maxHp * 0.55));
    this.player.invincible = 2.0;
    this.player.damageMod = (this.player.damageMod || 1) * 1.1;
    this.enemies = [];
    this.enemyProjectiles = [];
    this.projectiles = [];
    this.hurtVignette = 0.6;
    this.shake = 8;
    this.state = GameState.PLAYING;
    this.keys = {};
    return true;
  }

  declineContinue() {
    this.state = GameState.GAME_OVER;
  }

  _startWave() {
    this.chapter = getChapterForWave(this.wave);
    const cols = Math.floor((CANVAS_WIDTH - ARENA_PADDING * 2) / TILE);
    const rows = Math.floor((CANVAS_HEIGHT - ARENA_PADDING * 2) / TILE);
    this.tiles = buildTerrainMap(this.chapter, cols, rows);
    this.powerScale = getWavePowerScale(this.wave);

    this.waveDuration = getWaveDuration(this.wave);
    this.waveTimer = this.waveDuration;
    this.enemiesSpawned = 0;
    this.spawnTimer = 0.4;
    this.spawnRate = getWaveSpawnRate(this.wave) * (this.riskWave ? 1.45 : 1);
    this.maxAlive = Math.floor(getWaveMaxAlive(this.wave) * (this.riskWave ? 1.35 : 1));
    this.riskWave = false;
    this.waveEnded = false;
    this.isBossWave = this.wave === MAX_WAVES || this.wave === 20 || this.wave === 10;
    this.miniBossSpawnedThisWave = 0;
    this.enemyProjectiles = [];
    this.crates = [];
    this.challengePortal = null;
    this.challengeActive = false;
    this.portalBanner = 0;
    if (this.isBossWave) {
      this.spawnTimer = 0;
      this._spawnEnemy(true);
    } else if (this.wave >= 5 && this.wave % 5 === 0) {
      this._spawnEnemy(false, true);
    }
    setEnemyList(this.enemies);
    this.chapterBanner = 2.2;
    this._eventPortalAt = this.isBossWave ? -1 : 2.5;
    this._eventCrateAt = this.isBossWave ? -1 : 2.8;
    this._eventCrate2At = this.isBossWave ? -1 : 7.0;
    this._waveElapsed = 0;
  }

  _aliveCount() {
    return this.enemies.filter(e => !e.dead).length;
  }

  _spawnEnemy(forceBoss = false, forceMiniBoss = false, x0 = null, y0 = null, challengeLoot = false) {
    let x = x0, y = y0;
    if (x == null || y == null) {
      const side = Math.floor(Math.random() * 4);
      const pad = ARENA_PADDING;
      switch (side) {
        case 0: x = pad + Math.random() * (CANVAS_WIDTH - pad * 2); y = pad - 10; break;
        case 1: x = CANVAS_WIDTH - pad + 10; y = pad + Math.random() * (CANVAS_HEIGHT - pad * 2); break;
        case 2: x = pad + Math.random() * (CANVAS_WIDTH - pad * 2); y = CANVAS_HEIGHT - pad + 10; break;
        default: x = pad - 10; y = pad + Math.random() * (CANVAS_HEIGHT - pad * 2);
      }
    }

    let type;
    if (forceBoss || this.isBossWave) {
      type = ENEMY_TYPES.find(t => t.isBoss);
    } else if (forceMiniBoss) {
      type = getEliteType();
      this.miniBossSpawnedThisWave++;
    } else {
      const aliveMini = this.enemies.filter(e => !e.dead && e.type.isMiniBoss).length;
      const allowMiniBoss = this.wave >= 5
        && this.miniBossSpawnedThisWave < (this.wave >= 12 ? 2 : 1)
        && aliveMini < 1;
      type = pickEnemyType(this.wave, { allowMiniBoss });
      if (type.isMiniBoss) this.miniBossSpawnedThisWave++;
    }

    const e = new Enemy(type, this.wave, x, y, this.powerScale || 1);
    e.speed *= this.enemySpeedCurse || 1;
    e.challengeLoot = challengeLoot;
    this.enemies.push(e);
    this.enemiesSpawned++;
  }

  _spawnChallengeElite(atPlayer, x, y) {
    this._spawnEnemy(false, true, x, y, true);
  }

  _trySpawn(dt) {
    if (this.isBossWave || this.waveEnded) return;

    this.spawnTimer -= dt;
    const interval = 1 / this.spawnRate;

    while (this.spawnTimer <= 0) {
      if (this._aliveCount() >= this.maxAlive) {
        this.spawnTimer = 0.15;
        break;
      }
      let batch = 1;
      if (this.wave >= 3 && Math.random() < 0.4) batch = 2;
      if (this.wave >= 8 && Math.random() < 0.45) batch = 3;
      if (this.wave >= 14 && Math.random() < 0.35) batch = 4;
      for (let i = 0; i < batch; i++) {
        if (this._aliveCount() >= this.maxAlive) break;
        this._spawnEnemy();
      }
      this.spawnTimer += interval;
    }

    const alive = this._aliveCount();
    if (alive <= 2 && this.enemiesSpawned > 0) {
      const refill = Math.min(3 + Math.floor(this.wave / 4), 6);
      for (let i = 0; i < refill; i++) {
        if (this._aliveCount() >= this.maxAlive) break;
        this._spawnEnemy();
      }
      this.spawnTimer = interval * 0.5;
    }
  }

  _clearRemainingEnemies() {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.dead = true;
      e.hp = 0;
      const amt = onEnemyKilled(this, e);
      this.materials.push(new Material(e.x, e.y, amt));
      spawnParticles(this.particles, e.x, e.y, e.type.color, 6);
      this.player.kills++;
      this.totalKills++;
    }
    this.enemies = [];
    this.enemyProjectiles = [];
  }

  _startCollecting() {
    this.keys = {};
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.challengePortal = null;
    this.collectTimer = 0;
    this.collectTimeout = 4;
    for (const m of this.materials) {
      m.vacuum = true;
      m.life = 99;
    }
    this.state = GameState.COLLECTING;
  }

  _enterShopOrVictory() {
    this.keys = {};
    this.materials = [];
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.crates = [];

    if (this.wave >= MAX_WAVES) {
      this.state = GameState.VICTORY;
      return;
    }
    this.state = GameState.SHOP;
    this.shop.generate(this.player, this.wave);
  }

  nextWave() {
    this.keys = {};
    this.shop.expireFlashDeal?.();
    this.wave++;
    if (this.wave > MAX_WAVES) {
      this.state = GameState.VICTORY;
      return;
    }
    this.state = GameState.PLAYING;
    // Daily streak: consecutive calendar days -> starting materials
    try {
      const key = 'yua_daily_streak';
      const today = new Date().toISOString().slice(0, 10);
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      let streak = 1;
      if (prev.day) {
        const d0 = new Date(prev.day), d1 = new Date(today);
        const diff = Math.round((d1 - d0) / 86400000);
        streak = diff === 1 ? (prev.streak || 1) + 1 : (diff === 0 ? (prev.streak || 1) : 1);
      }
      localStorage.setItem(key, JSON.stringify({ day: today, streak }));
      this.dailyStreak = streak;
      this.player.materials += Math.min(20, streak * 2);
      this.streakBanner = 2.5;
    } catch (e) { this.dailyStreak = 1; }
    this._startWave();
  }

  update(dt) {
    dt = Math.min(dt, 0.05);

    if (this.state === GameState.COLLECTING) {
      this.player.update(dt, this.keys);
      this.collectTimer += dt;
      for (const m of this.materials) m.update(dt, this.player);
      this.materials = this.materials.filter(m => !m.collected);
      for (const p of this.particles) p.update(dt);
      this.particles = this.particles.filter(p => p.life > 0);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);
      if (this.hurtVignette > 0) this.hurtVignette = Math.max(0, this.hurtVignette - dt * 1.8);
      if (this.materials.length === 0 || this.collectTimer >= this.collectTimeout) {
        for (const m of this.materials) {
          if (!m.collected) this.player.materials += m.amount;
        }
        this._enterShopOrVictory();
      }
      return;
    }

    if (this.state !== GameState.PLAYING) return;

    // Hitstop freezes world briefly on big kills
    if (tickHitstop(this, dt)) {
      this.drawReady = true;
      return;
    }

    applyLastStand(this, dt);
    const worldDt = dt * (this.worldSlow || 1);
    // Player stays responsive in last stand; world slows
    const playerDt = this.lastStand ? dt : worldDt;

    this.time += dt;
    if (this.tiles?.length) {
      const tile = sampleTerrain(this.tiles, this.player.x, this.player.y, ARENA_PADDING);
      this.player.terrainSpeed = tile.speed || 1;
      if (tile.hazard > 0) {
        this.player.hp -= tile.hazard * playerDt;
        this.hurtVignette = Math.max(this.hurtVignette, 0.2);
      }
    }
    this.player._gameRef = this;
    this.player.update(playerDt, this.keys);
    setEnemyList(this.enemies);
    tickRage(this, dt);

    if (!this.waveEnded) {
      this.waveTimer -= worldDt;
      if (this.waveTimer <= 0) {
        this.waveTimer = 0;
        this.waveEnded = true;
        if (!this.isBossWave) {
          this._clearRemainingEnemies();
          this._startCollecting();
          return;
        }
      } else {
        this._waveElapsed = (this._waveElapsed || 0) + worldDt;
        if (this._eventPortalAt > 0 && this._waveElapsed >= this._eventPortalAt) {
          this._eventPortalAt = -1;
          maybeSpawnPortal(this);
        }
        if (this._eventCrateAt > 0 && this._waveElapsed >= this._eventCrateAt) {
          this._eventCrateAt = -1;
          maybeSpawnCrate(this);
        }
        if (this._eventCrate2At > 0 && this._waveElapsed >= this._eventCrate2At) {
          this._eventCrate2At = -1;
          maybeSpawnCrate(this);
        }
        this._trySpawn(worldDt);
        updatePortal(this, worldDt, (elite, x, y) => this._spawnChallengeElite(elite, x, y));
        updateCrates(this, worldDt);
        if ((this.portalBanner || 0) > 0) this.portalBanner -= dt;
      }
      if (this.isBossWave && this._aliveCount() === 0 && this.enemiesSpawned > 0) {
        this.waveEnded = true;
        this.waveTimer = 0;
        this._startCollecting();
        return;
      }
    }

    for (const w of this.player.weapons) {
      const shots = w.update(playerDt, this.player);
      if (shots) {
        this.projectiles.push(...shots);
        this.muzzleFlashes = (this.muzzleFlashes || []).concat(
          shots.filter(s => s.type === 'projectile').map(s => ({
            x: s.x, y: s.y, angle: Math.atan2(s.vy, s.vx), life: 0.08,
          }))
        );
      }
    }

    for (const e of this.enemies) {
      const shots = e.update(worldDt, this.player);
      if (shots?.length) this.enemyProjectiles.push(...shots);
    }
    this._consumeHitFeedback();

    this._updateProjectiles(worldDt);
    this._updateEnemyProjectiles(worldDt);
    this._consumeHitFeedback();

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);
    if ((this.impactZoom || 0) > 0) this.impactZoom = Math.max(0, this.impactZoom - dt * 0.25);
    if ((this.chapterBanner || 0) > 0) this.chapterBanner -= dt;
    if ((this.comboTimer || 0) > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if ((this.closeCallFlash || 0) > 0) this.closeCallFlash = Math.max(0, this.closeCallFlash - dt);
    if (this.bossDefeatBurst) {
      this.bossDefeatBurst.life -= dt;
      if (this.bossDefeatBurst.life <= 0) this.bossDefeatBurst = null;
    }
    for (const m of (this.muzzleFlashes || [])) m.life -= dt;
    this.muzzleFlashes = (this.muzzleFlashes || []).filter(m => m.life > 0);
    if (this.hurtVignette > 0) this.hurtVignette = Math.max(0, this.hurtVignette - dt * 1.8);

    for (const m of this.materials) m.update(playerDt, this.player);
    this.materials = this.materials.filter(m => !m.collected && m.life > 0);

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.life > 0);

    const deadEnemies = this.enemies.filter(e => e.dead);
    for (const e of deadEnemies) {
      const amt = onEnemyKilled(this, e);
      if (this.challengeActive && e.challengeLoot) {
        this.player.heal(4); // challengeHealOnClear
      }
      this.materials.push(new Material(e.x, e.y, amt));
      spawnParticles(this.particles, e.x, e.y, e.type.color);
      this.player.kills++;
      this.totalKills++;
      if (this.player.lifesteal > 0) this.player.heal(this.player.lifesteal);
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.player.hp <= 0) {
      if (!this.continueUsed) {
        this.player.hp = 0;
        this.state = GameState.CONTINUE_OFFER;
      } else {
        this.state = GameState.GAME_OVER;
      }
    }
  }

  _hitWithProjectile(p, e) {
    p.hitEnemies.add(e);
    if (e.takeDamage(p.damage)) {
      spawnParticles(this.particles, e.x, e.y, p.color || '#f4a261', 5);
    }
    if (p.type === 'projectile') {
      if (p.pierce > 0) p.pierce--;
      else p.life = 0;
    }
  }

  _updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.type === 'pointblank') {
        p.life -= dt;
        const e = p.target;
        if (e && !e.dead && !p.hitEnemies.has(e)) {
          this._hitWithProjectile(p, e);
        }
        continue;
      }

      if (p.type === 'melee') {
        p.life -= dt;
        if (p.damage <= 0) continue;
        for (const e of this.enemies) {
          if (e.dead || p.hitEnemies.has(e)) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d > p.range + e.radius) continue;
          const pointBlank = d < this.player.radius + e.radius + 12 || p.pointBlank;
          const inArc = pointBlank || (p.sweep
            ? angleDiff(Math.atan2(e.y - p.y, e.x - p.x), p.angle) < 1.2
            : angleDiff(Math.atan2(e.y - p.y, e.x - p.x), p.angle) < 0.9);
          if (!inArc) continue;
          this._hitWithProjectile(p, e);
        }
      } else {
        if (p.homing) {
          const alive = this.enemies.filter(e => !e.dead && !p.hitEnemies.has(e));
          if (alive.length > 0) {
            let nearest = alive[0], minD = Infinity;
            for (const e of alive) {
              const d = Math.hypot(e.x - p.x, e.y - p.y);
              if (d < minD) { minD = d; nearest = e; }
            }
            const targetAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
            const currentAngle = Math.atan2(p.vy, p.vx);
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const newAngle = currentAngle + diff * 5 * dt;
            const speed = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(newAngle) * speed;
            p.vy = Math.sin(newAngle) * speed;
          }
        }

        const tryHit = () => {
          for (const e of this.enemies) {
            if (e.dead || p.hitEnemies.has(e) || p.life <= 0) continue;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < e.radius + p.radius + 4) this._hitWithProjectile(p, e);
          }
        };
        tryHit();
        if (p.life > 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          tryHit();
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
  }

  _updateEnemyProjectiles(dt) {
    for (const p of this.enemyProjectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const d = dist(p.x, p.y, this.player.x, this.player.y);
      // Perfect-dodge proximity flash while i-frames active
      if (this.player.invincible > 0 && d < this.player.radius + 40) {
        this.closeCallFlash = Math.max(this.closeCallFlash || 0, 0.28);
      }
      if (d < p.radius + this.player.radius) {
        this.player.takeDamage(p.damage);
        p.life = 0;
        spawnParticles(this.particles, p.x, p.y, p.color, 4);
      }
    }
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p.life > 0);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    if (this.shake > 0.2) {
      const sx = (Math.random() - 0.5) * this.shake * 2;
      const sy = (Math.random() - 0.5) * this.shake * 2;
      ctx.translate(sx, sy);
    }
    if ((this.impactZoom || 0) > 0.001) {
      const z = 1 + this.impactZoom;
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.scale(z, z);
      ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
    }

    const theme = this.chapter?.theme || { bg0: '#1a1a30', bg1: '#0d0d18', accent: '#f4a261', ambient: '#fff' };
    const grad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 520
    );
    grad.addColorStop(0, theme.bg0);
    grad.addColorStop(1, theme.bg1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawTerrain(ctx, this.tiles, ARENA_PADDING, TILE, TERRAIN_TYPES);
    drawAmbientDust(ctx, this.time || 0, theme.ambient);

    ctx.strokeStyle = theme.accent + '66';
    ctx.lineWidth = 3;
    ctx.strokeRect(ARENA_PADDING, ARENA_PADDING,
      CANVAS_WIDTH - ARENA_PADDING * 2, CANVAS_HEIGHT - ARENA_PADDING * 2);

    if (
      this.state !== GameState.PLAYING
      && this.state !== GameState.COLLECTING
      && this.state !== GameState.SHOP
      && this.state !== GameState.CONTINUE_OFFER
    ) {
      ctx.restore();
      return;
    }
    if (!this.player) {
      ctx.restore();
      return;
    }

    for (const m of this.materials) m.draw(ctx);

    for (const p of this.projectiles) {
      if (p.type === 'melee') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (p.sweep) ctx.arc(0, 0, p.range, -0.6, 0.6);
        else { ctx.moveTo(0, 0); ctx.lineTo(p.range, 0); }
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (const p of this.enemyProjectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const e of this.enemies) e.draw(ctx);
    for (const p of this.particles) p.draw(ctx);

    const glow = this.player.charDef?.color || '#f4a261';
    drawPlayerGlow(ctx, this.player.x, this.player.y, glow, this.player.rageActive ? 80 : 56);
    this.player.draw(ctx);

    if (this.hurtVignette > 0.01) {
      const a = Math.min(0.45, this.hurtVignette);
      const vg = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.2,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.75
      );
      vg.addColorStop(0, 'rgba(180,20,40,0)');
      vg.addColorStop(1, `rgba(180,20,40,${a})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    drawTensionOverlays(ctx, this);

    if ((this.chapterBanner || 0) > 0 && this.chapter) {
      const a = Math.min(1, this.chapterBanner);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, CANVAS_HEIGHT * 0.38, CANVAS_WIDTH, 70);
      ctx.fillStyle = this.chapter.theme?.accent || '#f4a261';
      ctx.font = 'bold 28px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.chapter.emoji} ${this.chapter.name}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.38 + 44);
      ctx.restore();
    }

    if (this.cursedRun) {
      ctx.save();
      ctx.fillStyle = 'rgba(168,85,247,0.85)';
      ctx.font = 'bold 12px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('☠️ CURSED', CANVAS_WIDTH - 16, 24);
      ctx.restore();
    }

    if (this.state === GameState.COLLECTING) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, 54);
      ctx.fillStyle = '#f4a261';
      ctx.font = 'bold 22px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💰 正在收集全部材料…', CANVAS_WIDTH / 2, 34);
      ctx.restore();
    }

    ctx.restore();
  }

  getHudData() {
    const tier = comboTier(this.combo || 0);
    return {
      hp: Math.ceil(this.player?.hp || 0),
      maxHp: this.player?.maxHp || 0,
      materials: this.player?.materials || 0,
      wave: this.wave,
      maxWaves: MAX_WAVES,
      chapter: this.chapter ? `${this.chapter.emoji} ${this.chapter.name}` : '',
      timer: this.state === GameState.COLLECTING ? 0 : Math.ceil(this.waveTimer),
      progress: this.state === GameState.COLLECTING
        ? 1
        : 1 - this.waveTimer / this.waveDuration,
      combo: this.combo || 0,
      comboMult: tier.label,
      rage: Math.max(0, this.rageTimer || 0),
      lastStand: !!this.lastStand,
      cursed: !!this.cursedRun,
    };
  }
}
