/**
 * Addictive tension systems — real gameplay loops, not polish.
 */
import { CANVAS_WIDTH, CANVAS_HEIGHT, ARENA_PADDING, ENEMY_TYPES } from '../constants.js';
import { Material, spawnParticles } from '../entities.js';

export const TENSION = {
  lastStandHp: 0.25,
  lastStandSlow: 0.5,
  lastStandDmg: 1.4,
  rageKillsNeeded: 12,
  rageWindow: 7,
  rageDuration: 7,
  rageDmg: 1.5,
  rageSpeed: 1.25,
  rageFire: 1.35,
  hitstopBig: 0.08,
  hitstopBoss: 0.18,
  portalMinWave: 3,
  crateMinWave: 2,
  perfectDodgeIFrames: 0.45,
};

export function comboTier(combo = 0) {
  if (combo >= 12) return { mult: 3, label: 'x3' };
  if (combo >= 6) return { mult: 2, label: 'x2' };
  if (combo >= 3) return { mult: 1.5, label: 'x1.5' };
  return { mult: 1, label: 'x1' };
}

export function applyLastStand(game, dt) {
  const p = game.player;
  if (!p || p.hp <= 0) {
    game.lastStand = false;
    game.worldSlow = 1;
    return;
  }
  const ratio = p.hp / p.maxHp;
  if (ratio > 0 && ratio <= TENSION.lastStandHp) {
    game.lastStand = true;
    game.worldSlow = TENSION.lastStandSlow;
    game.lastStandPulse = (game.lastStandPulse || 0) + dt;
    p.lastStandActive = true;
  } else {
    game.lastStand = false;
    game.worldSlow = 1;
    p.lastStandActive = false;
    game.lastStandPulse = 0;
  }
}

export function tickHitstop(game, dt) {
  if ((game.hitstop || 0) > 0) {
    game.hitstop -= dt;
    return true;
  }
  return false;
}

export function registerKillForRage(game) {
  const now = game.time || 0;
  game.rageKillTimes = (game.rageKillTimes || []).filter(t => now - t <= TENSION.rageWindow);
  game.rageKillTimes.push(now);
  if (game.rageKillTimes.length >= TENSION.rageKillsNeeded && (game.rageTimer || 0) <= 0) {
    game.rageTimer = TENSION.rageDuration;
    game.rageKillTimes = [];
    game.rageBanner = 1.8;
    game.shake = Math.max(game.shake || 0, 7);
  }
}

export function onEnemyKilled(game, enemy) {
  game.combo = (game.combo || 0) + 1;
  game.comboTimer = 2.8;
  game.comboPeak = Math.max(game.comboPeak || 0, game.combo);
  registerKillForRage(game);

  if (enemy.type.isBoss) {
    game.hitstop = Math.max(game.hitstop || 0, TENSION.hitstopBoss);
    game.shake = Math.max(game.shake || 0, 16);
    game.bossDefeatBurst = { x: enemy.x, y: enemy.y, life: 0.85 };
    for (let i = 0; i < 40; i++) spawnParticles(game.particles, enemy.x, enemy.y, '#fbbf24', 1);
  } else if (enemy.type.isMiniBoss || enemy.maxHp >= 80) {
    game.hitstop = Math.max(game.hitstop || 0, TENSION.hitstopBig);
    game.shake = Math.max(game.shake || 0, 9);
  } else if ((game.combo || 0) >= 5) {
    game.shake = Math.max(game.shake || 0, 2 + Math.min(5, game.combo * 0.12));
  }

  const tier = comboTier(game.combo);
  const rageBonus = (game.rageTimer || 0) > 0 ? 1.25 : 1;
  const challengeBonus = enemy.challengeLoot ? 2.5 : 1;
  return Math.max(1, Math.ceil(
    enemy.type.material * tier.mult * rageBonus * challengeBonus * (game.player?.materialGain || 1)
  ));
}

export function tickRage(game, dt) {
  if ((game.rageTimer || 0) > 0) {
    game.rageTimer -= dt;
    if (game.player) {
      game.player.rageActive = game.rageTimer > 0;
      game.player.attackSpeedModRage = game.rageTimer > 0 ? TENSION.rageFire : 1;
      game.player.speedModRage = game.rageTimer > 0 ? TENSION.rageSpeed : 1;
      game.player.damageModRage = game.rageTimer > 0 ? TENSION.rageDmg : 1;
    }
  } else if (game.player) {
    game.player.rageActive = false;
    game.player.attackSpeedModRage = 1;
    game.player.speedModRage = 1;
    game.player.damageModRage = 1;
  }
  if ((game.rageBanner || 0) > 0) game.rageBanner -= dt;
}

export function maybeSpawnPortal(game) {
  if (game.wave < TENSION.portalMinWave || game.challengePortal || game.isBossWave) return;
  if (Math.random() > 0.6) return;
  const pad = ARENA_PADDING + 70;
  game.challengePortal = {
    x: pad + Math.random() * (CANVAS_WIDTH - pad * 2),
    y: pad + Math.random() * (CANVAS_HEIGHT - pad * 2),
    life: 10,
    taken: false,
  };
  game.portalBanner = 2.2;
}

export function maybeSpawnCrate(game) {
  if (game.wave < TENSION.crateMinWave || game.isBossWave) return;
  if (Math.random() > 0.45) return;
  const pad = ARENA_PADDING + 55;
  game.crates = game.crates || [];
  game.crates.push({
    x: pad + Math.random() * (CANVAS_WIDTH - pad * 2),
    y: pad + Math.random() * (CANVAS_HEIGHT - pad * 2),
    reveal: 0,
    opening: 0,
    opened: false,
    prize: null,
  });
}

export function updatePortal(game, dt, spawnFn) {
  const p = game.challengePortal;
  if (!p || p.taken) return;
  p.life -= dt;
  if (p.life <= 0) {
    game.challengePortal = null;
    return;
  }
  if (Math.hypot(game.player.x - p.x, game.player.y - p.y) < 30) {
    p.taken = true;
    game.challengePortal = null;
    game.portalBanner = 1.8;
    game.shake = Math.max(game.shake || 0, 8);
    game.challengeActive = true;
    const count = 3 + Math.floor(game.wave / 7);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count;
      spawnFn(true, game.player.x + Math.cos(ang) * 100, game.player.y + Math.sin(ang) * 100);
    }
    game.materials.push(new Material(p.x, p.y, 6 + game.wave));
  }
}

export function updateCrates(game, dt) {
  if (!game.crates?.length) return;
  for (const c of game.crates) {
    if (c.opened) {
      c.reveal -= dt;
      continue;
    }
    if (c.opening > 0) {
      c.opening -= dt;
      if (c.opening <= 0) {
        c.opened = true;
        c.reveal = 1.6;
        const roll = Math.random();
        const luck = (game.player.luck || 0) / 100;
        if (roll < 0.12) {
          c.prize = { label: '💣 陷阱！' };
          game.player.takeDamage(10 + game.wave * 0.8);
          game.shake = Math.max(game.shake || 0, 11);
        } else if (roll < 0.5) {
          const amt = Math.ceil((5 + game.wave) * (1 + luck));
          c.prize = { label: `💰 x${amt}` };
          game.materials.push(new Material(c.x, c.y, amt));
        } else if (roll < 0.82) {
          const amt = Math.ceil((12 + game.wave * 1.8) * (1 + luck));
          c.prize = { label: `✨ 大奖 ${amt}` };
          game.materials.push(new Material(c.x, c.y, amt));
          game.shake = Math.max(game.shake || 0, 6);
        } else {
          game.player.heal(Math.ceil(game.player.maxHp * 0.22));
          c.prize = { label: '❤️ 回复' };
        }
      }
      continue;
    }
    if (Math.hypot(game.player.x - c.x, game.player.y - c.y) < 28) {
      c.opening = 0.85; // suspense reveal
    }
  }
  game.crates = game.crates.filter(c => !c.opened || c.reveal > 0);
}

export function waveIntensity(game) {
  if (!game.waveDuration) return 0;
  return Math.max(0, Math.min(1, 1 - game.waveTimer / game.waveDuration));
}

export function drawTensionOverlays(ctx, game) {
  const intensity = waveIntensity(game);
  if (intensity > 0.2 && (game.state === 'playing')) {
    const pulse = 0.5 + 0.5 * Math.sin((game.time || 0) * (1.5 + intensity * 7));
    const a = intensity * 0.45 * pulse;
    ctx.save();
    ctx.strokeStyle = `rgba(231,111,81,${a})`;
    ctx.lineWidth = 3 + intensity * 8;
    ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);
    ctx.restore();
  }

  if (game.lastStand) {
    const pulse = 0.4 + 0.25 * Math.abs(Math.sin((game.lastStandPulse || 0) * 7));
    const vg = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.72
    );
    vg.addColorStop(0, 'rgba(220,40,40,0)');
    vg.addColorStop(1, `rgba(160,10,30,${pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = `rgba(255,90,90,${0.75 + pulse * 0.25})`;
    ctx.font = 'bold 24px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ LAST STAND', CANVAS_WIDTH / 2, 56);
  }

  if ((game.rageTimer || 0) > 0) {
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin((game.time || 0) * 12);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 22px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🔥 RAGE ${game.rageTimer.toFixed(1)}s`, CANVAS_WIDTH / 2, 84);
    ctx.restore();
  }

  if ((game.closeCallFlash || 0) > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, game.closeCallFlash * 1.5);
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  if (game.challengePortal && !game.challengePortal.taken) {
    const p = game.challengePortal;
    const spin = (game.time || 0) * 4;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(spin * 2);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 14, spin, spin + Math.PI * 1.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌀', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '12px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`精英挑战 ${Math.ceil(p.life)}s`, p.x, p.y + 36);
  }

  if ((game.portalBanner || 0) > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.portalBanner);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 18px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.challengeActive ? '⚔️ 精英挑战开始！奖励翻倍' : '🌀 精英挑战信标出现 — 踩入开战', CANVAS_WIDTH / 2, 110);
    ctx.restore();
  }

  for (const c of (game.crates || [])) {
    ctx.save();
    if (!c.opened) {
      const bounce = c.opening > 0 ? Math.sin((0.85 - c.opening) * 20) * 4 : Math.sin((game.time || 0) * 5) * 3;
      ctx.font = c.opening > 0 ? '28px serif' : '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.opening > 0 ? '🎁' : '📦', c.x, c.y + bounce);
      if (c.opening > 0) {
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 14px Segoe UI, system-ui, sans-serif';
        ctx.fillText('开启中…', c.x, c.y - 28);
      }
    } else if (c.prize) {
      ctx.globalAlpha = Math.min(1, c.reveal);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 18px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.prize.label, c.x, c.y - 12);
    }
    ctx.restore();
  }

  if (game.bossDefeatBurst && game.bossDefeatBurst.life > 0) {
    const b = game.bossDefeatBurst;
    const t = 1 - b.life / 0.85;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 30 + t * 160, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 10 + t * 220, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const tier = comboTier(game.combo || 0);
  if ((game.combo || 0) >= 3) {
    const scale = 1 + Math.min(0.4, (game.combo || 0) * 0.02);
    ctx.save();
    ctx.translate(36, 100);
    ctx.scale(scale, scale);
    ctx.fillStyle = tier.mult >= 3 ? '#ef4444' : tier.mult >= 2 ? '#f97316' : '#fbbf24';
    ctx.font = 'bold 24px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.fillText(`COMBO ${tier.label}`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.font = '13px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`${game.combo} 连击 · 材料 ${tier.label}`, 0, 20);
    ctx.restore();
  }
}

export function getEliteType() {
  return ENEMY_TYPES.find(t => t.isMiniBoss)
    || ENEMY_TYPES.find(t => t.role === 'tank')
    || ENEMY_TYPES[0];
}
