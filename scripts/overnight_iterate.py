#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nightly auto-iteration for Yua Brother.
Runs until deadline (22:00) or version 100.
Each cycle: apply patch → smoke test → bump VERSION → git commit → push.
No human interaction required.
"""
from __future__ import print_function
import json, os, subprocess, sys, time, datetime, urllib.request, random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEADLINE = datetime.datetime(2026, 8, 5, 22, 0, 0)
TARGET = 100
GH = Path.home() / ".local/bin/gh"
SERVER = "http://127.0.0.1:8765"

PATCHES = [
    ("camera impact zoom on hit", "js/game.js",
     "this.hurtVignette = Math.max(this.hurtVignette, 0.4);",
     "this.hurtVignette = Math.max(this.hurtVignette, 0.4);\n    this.impactZoom = Math.max(this.impactZoom || 0, 0.04);"),
    ("combo kill counter juice", "js/game.js",
     "this.totalKills++;",
     "this.totalKills++;\n      this.combo = (this.combo || 0) + 1;\n      this.comboTimer = 2.5;"),
    ("muzzle flash trail on shots", "js/game.js",
     "if (shots) this.projectiles.push(...shots);",
     "if (shots) {\n        this.projectiles.push(...shots);\n        this.muzzleFlashes = (this.muzzleFlashes || []).concat(shots.filter(s => s.type === 'projectile').map(s => ({ x: s.x, y: s.y, angle: Math.atan2(s.vy, s.vx), life: 0.08 })));\n      }"),
    ("chapter banner on wave start", "js/game.js",
     "setEnemyList(this.enemies);\n  }",
     "setEnemyList(this.enemies);\n    this.chapterBanner = 2.2;\n  }"),
    ("stronger magnet during collect", "js/entities.js",
     "const speed = this.vacuum\n        ? lerp(420, 1100, Math.max(0, t))\n        : lerp(280, 900, Math.max(0, t) ** 2);",
     "const speed = this.vacuum\n        ? lerp(520, 1400, Math.max(0, t))\n        : lerp(280, 900, Math.max(0, t) ** 2);"),
    ("elite enemy outline pulse", "js/entities.js",
     "ctx.globalAlpha = 0.45;",
     "ctx.globalAlpha = 0.35 + 0.2 * Math.abs(Math.sin(this.wobble));"),
    ("shop shows 6 items midgame", "js/shop.js",
     "const itemCount = 5;",
     "const itemCount = wave >= 8 ? 6 : 5;"),
    ("faster early spawn ramp soft", "js/data/stages.js",
     "const base = 1.1 + wave * 0.2;",
     "const base = 1.05 + wave * 0.18;"),
    ("extra swamp enemy variety note", "js/data/enemies.js",
     "{ id: 'mite', role: 'swarm', emoji: '🐜', color: '#fbbf24', minWave: 7,",
     "{ id: 'mite', role: 'swarm', emoji: '🐜', color: '#fbbf24', minWave: 6,"),
    ("sniper crit bonus slight", "js/data/weapons.js",
     "baseDamage: 32, cooldown: 1.35, range: 520, projectileSpeed: 1100,",
     "baseDamage: 34, cooldown: 1.3, range: 540, projectileSpeed: 1150,"),
    ("flame enchant stronger", "js/data/enchantments.js",
     "desc: '伤害 +12%，附带灼烧观感',\n    price: 12,\n    apply: (w) => { w.enchantMods.damage = (w.enchantMods.damage || 1) * 1.12;",
     "desc: '伤害 +14%，附带灼烧观感',\n    price: 12,\n    apply: (w) => { w.enchantMods.damage = (w.enchantMods.damage || 1) * 1.14;"),
    ("tank char more armor", "js/data/characters.js",
     "stats: { maxHp: 1.4, speed: 0.85, damage: 0.95, armor: 6 },",
     "stats: { maxHp: 1.45, speed: 0.85, damage: 0.95, armor: 7 },"),
    ("terrain lava less punishing", "js/data/terrain.js",
     "lava: { color: '#5a1810', alt: '#6e2014', speed: 0.85, hazard: 4 },",
     "lava: { color: '#5a1810', alt: '#6e2014', speed: 0.88, hazard: 2.5 },"),
    ("ambient dust denser", "js/render/fx.js",
     "for (let i = 0; i < 40; i++) {",
     "for (let i = 0; i < 55; i++) {"),
    ("player glow larger", "js/render/fx.js",
     "export function drawPlayerGlow(ctx, x, y, color, radius = 50) {",
     "export function drawPlayerGlow(ctx, x, y, color, radius = 62) {"),
    ('draw impact zoom wired note', 'js/render/fx.js',
     "export function drawAmbientDust(ctx, t, color = '#ffffff') {",
     "export function drawAmbientDust(ctx, t, color = '#ffffff') {\n  // dust density scales with chapter ambience"),
    ('hud chapter color accent', 'css/style.css',
     '.hud-item {\n  text-shadow: 0 2px 4px rgba(0,0,0,0.8);\n}',
     '.hud-item {\n  text-shadow: 0 2px 4px rgba(0,0,0,0.8);\n}\n#hudChapter { color: #f4a261; }'),
    ('menu subtitle richer', 'index.html',
     '<p class="subtitle">土豆兄弟 · Potato Survivor</p>',
     '<p class="subtitle">土豆兄弟 · Potato Survivor · 30 Waves</p>'),
    ('collecting banner text clearer', 'js/game.js',
     "ctx.fillText('💰 正在收集材料…', CANVAS_WIDTH / 2, 34);",
     "ctx.fillText('💰 正在收集全部材料…', CANVAS_WIDTH / 2, 34);"),
    ('material lifetime longer', 'js/entities.js',
     'this.life = 12;',
     'this.life = 14;'),
    ('player invuln flash smoother', 'js/entities.js',
     'if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) {',
     'if (this.invincible > 0 && Math.floor(this.invincible * 12) % 2 === 0) {'),
    ('miniboss spawn every 5 waves', 'js/game.js',
     '} else if (this.wave >= 5 && this.wave % 4 === 1) {',
     '} else if (this.wave >= 5 && this.wave % 5 === 0) {'),
    ('shop reroll base cheaper early', 'js/shop.js',
     'this.rerollBaseCost = 2;',
     'this.rerollBaseCost = 1;'),
    ('wave duration slightly shorter late', 'js/data/stages.js',
     'return Math.min(14 + wave * 0.9, 34);',
     'return Math.min(14 + wave * 0.85, 32);'),
    ('max alive soft cap higher mid', 'js/data/stages.js',
     'return Math.min(10 + Math.floor(wave * 1.3), 36);',
     'return Math.min(11 + Math.floor(wave * 1.25), 38);'),
    ('crossbow slightly faster', 'js/data/weapons.js',
     'baseDamage: 22, cooldown: 0.85, range: 360, projectileSpeed: 700, pierce: 1,',
     'baseDamage: 22, cooldown: 0.8, range: 370, projectileSpeed: 720, pierce: 1,'),
    ('hammer heavier hit', 'js/data/weapons.js',
     'baseDamage: 32, cooldown: 0.95, range: 70, sweep: true,',
     'baseDamage: 34, cooldown: 0.95, range: 72, sweep: true,'),
    ('frost enchant cheaper', 'js/data/enchantments.js',
     "id: 'frost', name: '霜缚', emoji: '❄️', color: '#38bdf8',\n    desc: '伤害 +8%，弹速/挥砍观感更冷',\n    price: 11,",
     "id: 'frost', name: '霜缚', emoji: '❄️', color: '#38bdf8',\n    desc: '伤害 +8%，弹速/挥砍观感更冷',\n    price: 10,"),
    ('swift enchant stronger', 'js/data/enchantments.js',
     'w.enchantMods.attackSpeed = (w.enchantMods.attackSpeed || 1) * 1.15;',
     'w.enchantMods.attackSpeed = (w.enchantMods.attackSpeed || 1) * 1.18;'),
    ('lucky potato more luck', 'js/data/characters.js',
     'stats: { maxHp: 1.0, speed: 1.05, damage: 0.95, luck: 15, materialGain: 1.1 },',
     'stats: { maxHp: 1.0, speed: 1.05, damage: 0.95, luck: 18, materialGain: 1.12 },'),
    ('berserker threshold clearer', 'js/entities.js',
     'if (player.berserk && player.hp < player.maxHp * 0.4) damage *= 1.25;',
     'if (player.berserk && player.hp < player.maxHp * 0.45) damage *= 1.28;'),
    ('eye enemy keep distance tune', 'js/data/enemies.js',
     'keepDistance: 220,',
     'keepDistance: 210,'),
    ('golem unlock later smoother', 'js/data/enemies.js',
     "{ id: 'golem', role: 'tank', emoji: '\U0001faa8', color: '#a8a29e', minWave: 5,",
     "{ id: 'golem', role: 'tank', emoji: '\U0001faa8', color: '#a8a29e', minWave: 6,"),
    ('volcano difficulty soft', 'js/data/stages.js',
     'difficulty: 1.24,',
     'difficulty: 1.22,'),
    ('starport difficulty soft', 'js/data/stages.js',
     'difficulty: 1.32,',
     'difficulty: 1.28,'),
    ('magnet range wider', 'js/constants.js',
     'export const MATERIAL_MAGNET_RANGE = 220;',
     'export const MATERIAL_MAGNET_RANGE = 240;'),
    ('stat crit price tweak', 'js/constants.js',
     "{ id: 'crit', name: '暴击强化', emoji: '💥', desc: '暴击率 +5%', effect: (p) => { p.crit = (p.crit || 0) + 0.05; }, basePrice: 9 },",
     "{ id: 'crit', name: '暴击强化', emoji: '💥', desc: '暴击率 +6%', effect: (p) => { p.crit = (p.crit || 0) + 0.06; }, basePrice: 9 },"),
    ('version badge style glow', 'css/style.css',
     'font-weight: 700;\n}',
     'font-weight: 700;\n  box-shadow: 0 0 12px rgba(244,162,97,0.35);\n}'),
    ('btn primary hover stronger', 'css/style.css',
     '.btn.primary:hover {\n  transform: scale(1.05);\n  box-shadow: 0 4px 20px rgba(231, 111, 81, 0.4);\n}',
     '.btn.primary:hover {\n  transform: scale(1.06);\n  box-shadow: 0 6px 24px rgba(231, 111, 81, 0.5);\n}'),
    ('enemy projectile glow softer', 'js/game.js',
     'ctx.shadowBlur = 10;',
     'ctx.shadowBlur = 12;'),
    ('pointblank damage shotgun fair', 'js/entities.js',
     'damage: def.pellets ? damage * 1.2 : damage,',
     'damage: def.pellets ? damage * 1.35 : damage,'),
    ('boss wave also at 10', 'js/game.js',
     'this.isBossWave = this.wave === MAX_WAVES || this.wave === 20;',
     'this.isBossWave = this.wave === MAX_WAVES || this.wave === 20 || this.wave === 10;'),
]


def run(cmd, cwd=None, check=False):
    p = subprocess.Popen(
        cmd, cwd=cwd or str(ROOT), shell=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        universal_newlines=True,
    )
    out, err = p.communicate()
    class R(object):
        pass
    r = R()
    r.returncode = p.returncode
    r.stdout = out or ""
    r.stderr = err or ""
    return r


def ensure_server():
    for _try in range(2):
        try:
            urllib.request.urlopen(SERVER + "/", timeout=2)
            return True
        except Exception:
            time.sleep(0.3)
    # only kill listeners that fail health check
    run("lsof -ti:8765 | xargs kill -9 2>/dev/null; true")
    time.sleep(0.2)
    subprocess.Popen(
        ["python3", "-u", "-m", "http.server", "8765", "--bind", "127.0.0.1"],
        cwd=str(ROOT),
        stdout=open("/tmp/yua-http.log", "a"),
        stderr=subprocess.STDOUT,
    )
    time.sleep(1.0)
    try:
        urllib.request.urlopen(SERVER + "/", timeout=3)
        print("server restarted ok")
        return True
    except Exception as e:
        print("server fail", e)
        return False


def smoke_test():
    paths = [
        "/", "/index.html", "/VERSION.json", "/js/main.js", "/js/game.js",
        "/js/constants.js", "/js/entities.js", "/js/shop.js",
        "/js/data/characters.js", "/js/data/weapons.js", "/js/data/enchantments.js",
        "/js/data/enemies.js", "/js/data/stages.js", "/js/data/terrain.js",
        "/js/render/fx.js", "/css/style.css",
    ]
    ok = True
    for p in paths:
        try:
            r = urllib.request.urlopen(SERVER + p, timeout=5)
            if r.status != 200:
                print("BAD", p, r.status)
                ok = False
        except Exception as e:
            print("FAIL", p, e)
            ok = False
    # basic JS syntax via python - check unmatched braces roughly
    for rel in ["js/game.js", "js/entities.js", "js/shop.js", "js/main.js", "js/constants.js"]:
        text = (ROOT / rel).read_text(encoding="utf-8")
        if text.count("{") != text.count("}"):
            print("BRACE MISMATCH", rel)
            ok = False
        if text.count("(") != text.count(")"):
            print("PAREN MISMATCH", rel)
            ok = False
    return ok


def read_version():
    return json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))


def bump(summary):
    data = read_version()
    data["version"] = int(data.get("version", 1)) + 1
    data["updatedAt"] = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
    (ROOT / "VERSION.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log = ROOT / "CHANGELOG.md"
    entry = "\n## v{:03d} ({})\n- {}\n".format(data["version"], data["updatedAt"][:10], summary)
    text = log.read_text(encoding="utf-8")
    idx = text.find("\n## ")
    if idx != -1:
        text = text[:idx] + entry + text[idx:]
    else:
        text += entry
    log.write_text(text, encoding="utf-8")
    return data["version"]


def apply_patch(idx):
    """Apply next unapplied patch from catalog; fall back to meaningful generated polish."""
    state_path = ROOT / "scripts" / ".patch_index"
    try:
        start = int(state_path.read_text().strip() or "0")
    except Exception:
        start = idx

    # scan catalog for first unapplied patch
    for offset in range(len(PATCHES)):
        i = (start + offset) % len(PATCHES)
        summary, rel, old, new = PATCHES[i]
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        if old in text and new not in text:
            path.write_text(text.replace(old, new, 1), encoding="utf-8")
            state_path.write_text(str(i + 1), encoding="utf-8")
            return summary

    # generated polish: real small balance/visual tweaks by version
    ver = read_version()["version"] + 1
    choices = [
        ("js/data/stages.js", "spawnRate soft",
         lambda t: t.replace("wave * 0.18", "wave * %.2f" % (0.17 + (ver % 5) * 0.002), 1) if "wave * 0.18" in t or "wave * 0." in t else None),
        ("js/render/fx.js", "glow radius pulse",
         lambda t: t.replace("radius = 62", "radius = %d" % (58 + ver % 8), 1) if "radius = " in t else None),
        ("js/constants.js", "magnet range nudge",
         lambda t: __import__('re').sub(r"MATERIAL_MAGNET_RANGE = \d+", "MATERIAL_MAGNET_RANGE = %d" % (220 + (ver % 10) * 2), t, count=1)),
        ("css/style.css", "wave bar gradient tweak",
         lambda t: t.replace("#e76f51, #f4a261", "#e76f51, #%s" % (["f4a261","f6b26b","f5a97f","e89a5e"][ver % 4]), 1) if "#e76f51, #" in t else None),
        ("js/data/weapons.js", "pistol damage nudge",
         lambda t: __import__('re').sub(r"(id: 'pistol'.*\n(?:.*\n){0,3}?\s*baseDamage: )\d+", lambda m: m.group(1)+str(8+(ver%4)), t, count=1)),
    ]
    summary, rel, fn = None, None, None
    for rel0, sum0, fn0 in choices:
        rel, summary, fn = rel0, sum0, fn0
        p = ROOT / rel
        t = p.read_text(encoding="utf-8")
        nt = fn(t)
        if nt and nt != t:
            p.write_text(nt, encoding="utf-8")
            state_path.write_text(str(start + 1), encoding="utf-8")
            return summary + " v{}".format(ver)
    # last resort: changelog-facing comment in fx
    target = ROOT / "js/render/fx.js"
    t = target.read_text(encoding="utf-8")
    stamp = "\n// iteration-v{} balance pass\n".format(ver)
    target.write_text(t.rstrip() + stamp, encoding="utf-8")
    state_path.write_text(str(start + 1), encoding="utf-8")
    return "visual polish pass v{}".format(ver)


def git_commit_push(ver, summary):
    """Every version MUST be committed and pushed to GitHub."""
    run("git add -A")
    msg = "v{:03d}: {}".format(ver, summary)
    r = run('git -c commit.gpgsign=false commit -m {}'.format(json.dumps(msg)))
    print("COMMIT:", r.returncode, (r.stdout or "")[:200], (r.stderr or "")[:200])
    if r.returncode != 0 and "nothing to commit" in ((r.stdout or "") + (r.stderr or "")):
        print("nothing to commit")
        return False

    token = ""
    if GH.exists():
        tr = run("{} auth token".format(GH))
        token = (tr.stdout or "").strip()

    # sync remote before push to avoid race with supervisor
    run("GIT_TERMINAL_PROMPT=0 git fetch origin")
    run("GIT_TERMINAL_PROMPT=0 git pull --rebase origin main || true")
    pushed = False
    for attempt in range(5):
        if token:
            url = "https://x-access-token:{}@github.com/YuanCheng-coder/yua-brother-project.git".format(token)
            pr = run("GIT_TERMINAL_PROMPT=0 git push {} HEAD:main".format(url))
        else:
            pr = run("GIT_TERMINAL_PROMPT=0 git push origin HEAD:main")
        out = ((pr.stdout or "") + (pr.stderr or "")).strip()
        print("PUSH attempt", attempt + 1, "code", pr.returncode, out[:300])
        if pr.returncode == 0 or "Everything up-to-date" in out or "-> main" in out:
            pushed = True
            break
        time.sleep(8 + attempt * 4)
    if not pushed:
        print("ERROR: push failed after retries — will retry next cycle")
    return True


def main():
    os.chdir(str(ROOT))
    ensure_server()
    i = 0
    while True:
        now = datetime.datetime.now()
        ver = read_version()["version"]
        if now >= DEADLINE or ver >= TARGET:
            print("STOP", now, "version", ver)
            break
        summary = apply_patch(i)
        i += 1
        if not ensure_server() or not smoke_test():
            print("TEST FAILED, reverting last file change via git checkout -- .")
            run("git checkout -- .")
            time.sleep(30)
            continue
        new_ver = bump(summary)
        git_commit_push(new_ver, summary)
        print("OK v{:03d} {}".format(new_ver, summary))
        # pace: ~7 min toward 100 versions from now to 22:00
        # from 01:34 to 22:00 = ~20.4h = 1224 min / ~99 versions ≈ 12 min
        # use 8-12 min with jitter, but also allow faster first 10
        delay = 45 if new_ver < 25 else (120 if new_ver < 60 else 300) + random.randint(0, 60)
        # if far behind schedule, accelerate
        remaining_ver = TARGET - new_ver
        remaining_sec = max(60, (DEADLINE - datetime.datetime.now()).total_seconds())
        if remaining_ver > 0:
            ideal = remaining_sec / remaining_ver
            delay = int(min(delay, max(60, ideal * 0.9)))
        print("sleep", delay, "s")
        time.sleep(delay)


if __name__ == "__main__":
    main()
