import {
  CANVAS_WIDTH, CANVAS_HEIGHT, ARENA_PADDING,
  MAX_WAVES, ENEMY_TYPES, CHARACTERS,
  getWaveDuration, getWaveEnemyCount,
} from './constants.js';
import {
  Player, Enemy, Material, Particle,
  setEnemyList, spawnParticles,
} from './entities.js';
import { Shop } from './shop.js';

export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
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
    this.particles = [];
    this.shop = new Shop();

    this.wave = 1;
    this.waveTimer = 0;
    this.waveDuration = 20;
    this.enemiesSpawned = 0;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.8;

    this.selectedChar = 0;
    this.totalKills = 0;

    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
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
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  startSync(charIndex) {
    this.player = new Player(CHARACTERS[charIndex]);
    this.enemies = [];
    this.materials = [];
    this.projectiles = [];
    this.particles = [];
    this.wave = 1;
    this.totalKills = 0;
    this.state = GameState.PLAYING;
    this._startWave();
  }

  _startWave() {
    this.waveDuration = getWaveDuration(this.wave);
    this.waveTimer = this.waveDuration;
    this.enemiesSpawned = 0;
    this.enemiesToSpawn = getWaveEnemyCount(this.wave);
    if (this.wave === MAX_WAVES) this.enemiesToSpawn = 1;
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(0.2, 0.8 - this.wave * 0.02);
    setEnemyList(this.enemies);
  }

  _spawnEnemy() {
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
    if (this.wave === MAX_WAVES) {
      type = ENEMY_TYPES.find(t => t.isBoss);
    } else {
      const pool = ENEMY_TYPES.filter(t => !t.isBoss);
      const idx = Math.min(Math.floor(this.wave / 5), pool.length - 1);
      type = pool[Math.floor(Math.random() * (idx + 1))];
    }

    this.enemies.push(new Enemy(type, this.wave, x, y));
    this.enemiesSpawned++;
  }

  enterShop() {
    this.state = GameState.SHOP;
    this.enemies = [];
    this.projectiles = [];
    this.materials = [];
    this.shop.generate(this.player, this.wave);
    return this.shop;
  }

  nextWave() {
    this.wave++;
    if (this.wave > MAX_WAVES) {
      this.state = GameState.VICTORY;
      return;
    }
    this.state = GameState.PLAYING;
    this._startWave();
  }

  update(dt) {
    if (this.state !== GameState.PLAYING) return;

    dt = Math.min(dt, 0.05);
    this.player.update(dt, this.keys);
    setEnemyList(this.enemies);

    // Spawn enemies
    if (this.enemiesSpawned < this.enemiesToSpawn) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnEnemy();
        this.spawnTimer = this.spawnInterval;
      }
    }

    // Wave timer
    this.waveTimer -= dt;
    if (this.waveTimer <= 0 && this.enemies.every(e => e.dead)) {
      if (this.wave >= MAX_WAVES) {
        this.state = GameState.VICTORY;
      } else {
        this.state = GameState.SHOP;
        this.shop.generate(this.player, this.wave);
      }
      return;
    }

    // Weapon firing
    for (const w of this.player.weapons) {
      const shots = w.update(dt, this.player);
      if (shots) this.projectiles.push(...shots);
    }

    // Update enemies
    for (const e of this.enemies) e.update(dt, this.player);

    // Update projectiles
    this._updateProjectiles(dt);

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

  _updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.type === 'melee') {
        p.life -= dt;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < p.range + e.radius) {
            if (p.sweep || Math.abs(Math.atan2(e.y - p.y, e.x - p.x) - p.angle) < 0.8) {
              if (e.takeDamage(p.damage)) {
                spawnParticles(this.particles, e.x, e.y, '#f4a261', 5);
              }
            }
          }
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

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        for (const e of this.enemies) {
          if (e.dead || p.hitEnemies.has(e)) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < e.radius + p.radius) {
            p.hitEnemies.add(e);
            if (e.takeDamage(p.damage)) {
              spawnParticles(this.particles, e.x, e.y, p.color, 5);
            }
            if (p.pierce > 0) {
              p.pierce--;
            } else {
              p.life = 0;
            }
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Arena background
    const grad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500
    );
    grad.addColorStop(0, '#1a1a30');
    grad.addColorStop(1, '#0d0d18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Arena border
    ctx.strokeStyle = '#2a2a40';
    ctx.lineWidth = 3;
    ctx.strokeRect(ARENA_PADDING, ARENA_PADDING,
      CANVAS_WIDTH - ARENA_PADDING * 2, CANVAS_HEIGHT - ARENA_PADDING * 2);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = ARENA_PADDING; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, ARENA_PADDING); ctx.lineTo(x, CANVAS_HEIGHT - ARENA_PADDING); ctx.stroke();
    }
    for (let y = ARENA_PADDING; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath(); ctx.moveTo(ARENA_PADDING, y); ctx.lineTo(CANVAS_WIDTH - ARENA_PADDING, y); ctx.stroke();
    }

    if (this.state !== GameState.PLAYING && this.state !== GameState.SHOP) return;
    if (!this.player) return;

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

    // Enemies
    for (const e of this.enemies) e.draw(ctx);

    // Particles
    for (const p of this.particles) p.draw(ctx);

    // Player
    this.player.draw(ctx);
  }

  getHudData() {
    return {
      hp: Math.ceil(this.player?.hp || 0),
      maxHp: this.player?.maxHp || 0,
      materials: this.player?.materials || 0,
      wave: this.wave,
      timer: Math.ceil(this.waveTimer),
      progress: 1 - this.waveTimer / this.waveDuration,
    };
  }
}
