import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

export function drawAmbientDust(ctx, t, color = '#ffffff') {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97 + t * 12) % (CANVAS_WIDTH + 40)) - 20;
    const y = ((i * 53 + Math.sin(t * 0.4 + i) * 30) % (CANVAS_HEIGHT + 40));
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPlayerGlow(ctx, x, y, color, radius = 50) {
  const g = ctx.createRadialGradient(x, y, 8, x, y, radius);
  g.addColorStop(0, color + '55');
  g.addColorStop(0.5, color + '18');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTerrain(ctx, tiles, pad, tileSize, types) {
  if (!tiles?.length) return;
  for (let ty = 0; ty < tiles.length; ty++) {
    for (let tx = 0; tx < tiles[ty].length; tx++) {
      const key = tiles[ty][tx];
      const def = types[key] || types.grass;
      const x = pad + tx * tileSize;
      const y = pad + ty * tileSize;
      ctx.fillStyle = ((tx + ty) % 2 === 0) ? def.color : def.alt;
      ctx.fillRect(x, y, tileSize + 0.5, tileSize + 0.5);
      if (key === 'lava') {
        ctx.fillStyle = `rgba(255,100,40,${0.15 + Math.sin(Date.now() / 200 + tx + ty) * 0.08})`;
        ctx.fillRect(x, y, tileSize, tileSize);
      } else if (key === 'water') {
        ctx.fillStyle = `rgba(80,180,255,${0.08 + Math.sin(Date.now() / 300 + tx) * 0.04})`;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }
}

export function drawMuzzleFlash(ctx, x, y, angle, life) {
  if (life <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = Math.min(1, life * 8);
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(8, -6);
  ctx.lineTo(8, 6);
  ctx.fill();
  ctx.restore();
}
// auto-v65068 camera impact zoom on hit
// auto-v65210 camera impact zoom on hit
// auto-v65248 camera impact zoom on hit
