import { CHARACTERS, MAX_WAVES } from './constants.js';
import { Game, GameState } from './game.js';
import {
  renderShopItems, renderWeaponSlots,
  renderStatsPanel, renderHudWeapons,
} from './shop.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

const menuScreen = document.getElementById('menuScreen');
const shopScreen = document.getElementById('shopScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const hud = document.getElementById('hud');

let selectedChar = 0;
let lastTime = 0;
let shopOpen = false;

fetch('./VERSION.json').then(r => r.json()).then(v => {
  const el = document.getElementById('versionBadge');
  if (el) el.textContent = 'v' + String(v.version).padStart(3, '0');
}).catch(() => {});

const charList = document.getElementById('charList');
CHARACTERS.forEach((c, i) => {
  const el = document.createElement('div');
  el.className = 'char-card' + (i === 0 ? ' selected' : '');
  el.innerHTML = `<span class="emoji">${c.emoji}</span><span class="name">${c.name}</span><span class="bonus">${c.bonus}</span>`;
  el.addEventListener('click', () => {
    selectedChar = i;
    document.querySelectorAll('.char-card').forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
  });
  charList.appendChild(el);
});

document.getElementById('startBtn').addEventListener('click', () => {
  menuScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  game.startSync(selectedChar);
  canvas.focus();
});
canvas.addEventListener('pointerdown', () => canvas.focus());

document.getElementById('nextWaveBtn').addEventListener('click', () => {
  shopScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  shopOpen = false;
  game.clearKeys();
  game.nextWave();
});

document.getElementById('rerollBtn').addEventListener('click', () => {
  const cost = game.shop.getRerollCost(game.wave);
  if (game.player.materials >= cost) {
    game.player.materials -= cost;
    game.shop.reroll(game.player, game.wave);
    refreshShop();
  }
});

document.getElementById('restartBtn').addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  hud.classList.add('hidden');
  game.state = GameState.MENU;
});

function refreshShop() {
  const shop = game.shop;
  const player = game.player;
  document.getElementById('shopWave').textContent = game.wave;
  document.getElementById('shopMaterials').textContent = player.materials;
  document.getElementById('weaponCount').textContent = player.weapons.length;
  document.getElementById('rerollCost').textContent = shop.getRerollCost(game.wave);
  const ch = document.getElementById('shopChapter');
  if (ch) ch.textContent = game.chapter ? `${game.chapter.emoji} ${game.chapter.name}` : '';
  renderShopItems(document.getElementById('shopItems'), shop, player, (item) => {
    shop.buy(item, player);
    refreshShop();
  });
  renderWeaponSlots(document.getElementById('weaponSlots'), player);
  renderStatsPanel(document.getElementById('statsPanel'), player);
}

function updateHud() {
  const data = game.getHudData();
  document.getElementById('hudHp').textContent = data.hp;
  document.getElementById('hudMaxHp').textContent = data.maxHp;
  document.getElementById('hudMaterials').textContent = data.materials;
  document.getElementById('hudWave').textContent = data.wave;
  const mw = document.getElementById('hudMaxWaves');
  if (mw) mw.textContent = data.maxWaves || MAX_WAVES;
  const hc = document.getElementById('hudChapter');
  if (hc) hc.textContent = data.chapter || '';
  document.getElementById('hudTimer').textContent = data.timer;
  document.getElementById('waveProgress').style.width = (data.progress * 100) + '%';
  if (game.player) renderHudWeapons(document.getElementById('hudWeapons'), game.player);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  const prevState = game.state;
  game.update(dt);
  game.draw();

  if (game.state === GameState.PLAYING || game.state === GameState.COLLECTING) updateHud();

  if (game.state === GameState.SHOP && !shopOpen) {
    shopOpen = true;
    hud.classList.add('hidden');
    shopScreen.classList.remove('hidden');
    refreshShop();
  }

  if (game.state === GameState.GAME_OVER && prevState !== GameState.GAME_OVER) {
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    document.getElementById('gameOverTitle').textContent = '游戏结束';
    document.getElementById('gameOverStats').innerHTML =
      `存活到第 <strong>${game.wave}</strong> 波<br>击杀 <strong>${game.totalKills}</strong><br>材料 <strong>${game.player?.materials || 0}</strong>`;
  }

  if (game.state === GameState.VICTORY && prevState !== GameState.VICTORY) {
    hud.classList.add('hidden');
    shopScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    document.getElementById('gameOverTitle').textContent = '胜利！';
    document.getElementById('gameOverStats').innerHTML =
      `通关全部 <strong>${MAX_WAVES}</strong> 波<br>击杀 <strong>${game.totalKills}</strong><br>剩余 <strong>${game.player?.materials || 0}</strong>`;
  }

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
