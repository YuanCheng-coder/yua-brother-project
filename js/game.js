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

export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  COLLECTING: 'collecting', // 波次结束：吸金币阶段
  SHOP: 'shop',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
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

    // 失焦时清空按键，避免 W/↑ 卡住导致一直往上走
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
    this.wave = 1;
    this.totalKills = 0;
    this.shake = 0;
    this.hurtVignette = 0;
    this.time = 0;
    this.state = GameState.PLAYING;
    this._startWave();
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
    this.spawnRate = getWaveSpawnRate(this.wave);
    this.maxAlive = getWaveMaxAlive(this.wave);
    this.waveEnded = false;
    this.isBossWave = this.wave === MAX_WAVES || this.wave === 20;
    this.miniBossSpawnedThisWave = 0;
    this.enemyProjectiles = [];
    if (this.isBossWave) {
      this.spawnTimer = 0;
      this._spawnEnemy(true);
    } else if (this.wave >= 5 && this.wave % 4 === 1) {
      this._spawnEnemy(false, true);
    }
    setEnemyList(this.enemies);
  }

  _aliveCount() {
    return this.enemies.filter(e => !e.dead).length;
  }

  _spawnEnemy(forceBoss = false, forceMiniBoss = false) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const pad = ARENA_PADDING;
    switch (side) {
      case 0: x = pad + Math.random() * (CANVAS_WIDTH - pad * 2); y = pad - 10; break;
      case 1: x = CANVAS_WIDTH - pad + 10; y = pad + Math.random() * (CANVAS_HEIGHT - pad * 2); break;
      case 2: x = pad + Math.random() * (CANVAS_WIDTH - pad * 2); y = CANVAS_HEIGHT - pad + 10; break;
      default: x = pad - 10; y = pad + Math.random() * (CANVAS_HEIGHT - pad * 2);
    }

    let type;
    if (forceBoss || this.isBossWave) {
      type = ENEMY_TYPES.find(t => t.isBoss);
    } else if (forceMiniBoss) {
      type = ENEMY_TYPES.find(t => t.isMiniBoss);
      this.miniBossSpawnedThisWave++;
    } else {
      const aliveMini = this.enemies.filter(e => !e.dead && e.type.isMiniBoss).length;
      const allowMiniBoss = this.wave >= 5
        && this.miniBossSpawnedThisWave < (this.wave >= 12 ? 2 : 1)
        && aliveMini < 1;
      type = pickEnemyType(this.wave, { allowMiniBoss });
      if (type.isMiniBoss) this.miniBossSpawnedThisWave++;
    }

    this.enemies.push(new Enemy(type, this.wave, x, y, this.powerScale || 1));
    this.enemiesSpawned++;
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
      // 中后期经常一次刷多只，堆密度
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

    // 场上稀少时立刻补怪，保持压迫
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

  /** 时间到：击杀场上剩余小怪并掉落材料 */
  _clearRemainingEnemies() {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.dead = true;
      e.hp = 0;
      this.materials.push(new Material(e.x, e.y, e.type.material));
      spawnParticles(this.particles, e.x, e.y, e.type.color, 6);
      this.player.kills++;
      this.totalKills++;
    }
    this.enemies = [];
    this.enemyProjectiles = [];
  }

  /** 进入收钱阶段：全图吸金币，吸完再进商店 */
  _startCollecting() {
    this.keys = {};
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.collectTimer = 0;
    this.collectTimeout = 4; // 安全上限，防止卡死
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

    if (this.wave >= MAX_WAVES) {
      this.state = GameState.VICTORY;
      return;
    }
    this.state = GameState.SHOP;
    this.shop.generate(this.player, this.wave);
  }

  nextWave() {
    this.keys = {};
    this.wave++;
    if (this.wave > MAX_WAVES) {
      this.state = GameState.VICTORY;
      return;
    }
    this.state = GameState.PLAYING;
    this._startWave();
  }

  update(dt) {
    dt = Math.min(dt, 0.05);

    // —— 收钱阶段：只吸材料，吸完进商店 ——
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
        // 超时则把剩余直接入账
        for (const m of this.materials) {
          if (!m.collected) this.player.materials += m.amount;
        }
        this._enterShopOrVictory();
      }
      return;
    }

    if (this.state !== GameState.PLAYING) return;

    this.time += dt;
    // 地形影响移速 / 熔岩伤害
    if (this.tiles?.length) {
      const tile = sampleTerrain(this.tiles, this.player.x, this.player.y, ARENA_PADDING);
      this.player.terrainSpeed = tile.speed || 1;
      if (tile.hazard > 0) {
        this.player.hp -= tile.hazard * dt;
        this.hurtVignette = Math.max(this.hurtVignette, 0.2);
      }
    }
    this.player.update(dt, this.keys);
    setEnemyList(this.enemies);

    // 倒计时内持续刷怪；时间到 → 清场后进入收钱
    if (!this.waveEnded) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveTimer = 0;
        this.waveEnded = true;
        // 普通波：时间到清场 → 收钱；Boss 波需亲手击杀
        if (!this.isBossWave) {
          this._clearRemainingEnemies();
          this._startCollecting();
          return;
        }
      } else {
        this._trySpawn(dt);
      }
      // Boss 波：击杀后进入收钱
      if (this.isBossWave && this._aliveCount() === 0 && this.enemiesSpawned > 0) {
        this.waveEnded = true;
        this.waveTimer = 0;
        this._startCollecting();
        return;
      }
    }

    // Weapon firing
    for (const w of this.player.weapons) {
      const shots = w.update(dt, this.player);
      if (shots) this.projectiles.push(...shots);
    }

    // Update enemies（收集敌方子弹）
    for (const e of this.enemies) {
      const shots = e.update(dt, this.player);
      if (shots?.length) this.enemyProjectiles.push(...shots);
    }
    this._consumeHitFeedback();

    // Update projectiles
    this._updateProjectiles(dt);
    this._updateEnemyProjectiles(dt);
    this._consumeHitFeedback();

    // 受击反馈衰减
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 28);
    }
    if (this.hurtVignette > 0) {
      this.hurtVignette = Math.max(0, this.hurtVignette - dt * 1.8);
    }

    // Update materials
    for (const m of this.materials) m.update(dt, this.player);
    this.materials = this.materials.filter(m => !m.collected && m.life > 0);

    // Update particles
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.life > 0);

    // Cleanup dead enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
    }
    const deadEnemies = this.enemies.filter(e => e.dead);
    for (const e of deadEnemies) {
      this.materials.push(new Material(e.x, e.y, e.type.material));
      spawnParticles(this.particles, e.x, e.y, e.type.color);
      this.player.kills++;
      this.totalKills++;
      if (this.player.lifesteal > 0) this.player.heal(this.player.lifesteal);
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    // Check death
    if (this.player.hp <= 0) {
      this.state = GameState.GAME_OVER;
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
        if (p.damage <= 0) continue; // 纯特效
        for (const e of this.enemies) {
          if (e.dead || p.hitEnemies.has(e)) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d > p.range + e.radius) continue;
          // 贴身敌人忽略角度，避免贴脸上却砍不中
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

        // 先判定再移动，避免高速弹一帧穿过贴身敌人
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
      if (dist(p.x, p.y, this.player.x, this.player.y) < p.radius + this.player.radius) {
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
    // 轻微屏幕抖动
    if (this.shake > 0.2) {
      const sx = (Math.random() - 0.5) * this.shake * 2;
      const sy = (Math.random() - 0.5) * this.shake * 2;
      ctx.translate(sx, sy);
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
    ) {
      ctx.restore();
      return;
    }
    if (!this.player) {
      ctx.restore();
      return;
    }

    // Materials
    for (const m of this.materials) m.draw(ctx);

    // Projectiles
    for (const p of this.projectiles) {
      if (p.type === 'melee') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (p.sweep) {
          ctx.arc(0, 0, p.range, -0.6, 0.6);
        } else {
          ctx.moveTo(0, 0);
          ctx.lineTo(p.range, 0);
        }
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

    // Enemy projectiles
    for (const p of this.enemyProjectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) e.draw(ctx);

    // Particles（含流血）
    for (const p of this.particles) p.draw(ctx);

    // Player + 光晕
    const glow = this.player.charDef?.color || '#f4a261';
    drawPlayerGlow(ctx, this.player.x, this.player.y, glow, 56);
    this.player.draw(ctx);

    // 受击红闪（轻微）
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

    // 收钱阶段提示
    if (this.state === GameState.COLLECTING) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, 54);
      ctx.fillStyle = '#f4a261';
      ctx.font = 'bold 22px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💰 正在收集材料…', CANVAS_WIDTH / 2, 34);
      ctx.restore();
    }

    ctx.restore();
  }

  getHudData() {
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
    };
  }
}
