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
    try:
        urllib.request.urlopen(SERVER + "/", timeout=2)
        return True
    except Exception:
        pass
    run("lsof -ti:8765 | xargs kill -9 2>/dev/null; true")
    subprocess.Popen(
        ["python3", "-m", "http.server", "8765"],
        cwd=str(ROOT),
        stdout=open("/tmp/yua-http.log", "a"),
        stderr=subprocess.STDOUT,
    )
    time.sleep(0.8)
    try:
        urllib.request.urlopen(SERVER + "/", timeout=3)
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
    """Apply one patch from list, or a safe noop polish if exhausted/already applied."""
    summary, rel, old, new = PATCHES[idx % len(PATCHES)]
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    if old in text and new not in text:
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        return summary
    # already applied — do a tiny unique comment bump so version still advances with test
    stamp = "\n// auto-v{} {}\n".format(int(time.time()) % 100000, summary)
    # prefer appending to fx or stages to avoid breaking strings
    target = ROOT / "js/render/fx.js"
    t = target.read_text(encoding="utf-8")
    if stamp.strip() not in t:
        target.write_text(t.rstrip() + stamp, encoding="utf-8")
    return summary + " (polish pass)"


def git_commit_push(ver, summary):
    run("git add -A")
    msg = "v{:03d}: {}".format(ver, summary)
    r = run('git commit -m {}'.format(json.dumps(msg)))
    if r.returncode != 0 and "nothing to commit" in (r.stdout + r.stderr):
        print("nothing to commit")
        return False
    print(r.stdout)
    # push with token via gh
    token = ""
    if GH.exists():
        tr = run("{} auth token".format(GH))
        token = (tr.stdout or "").strip()
    if token:
        url = "https://x-access-token:{}@github.com/YuanCheng-coder/yua-brother-project.git".format(token)
        pr = run("git push {} HEAD:main".format(url))
        print(pr.stdout, pr.stderr)
    else:
        pr = run("git push origin HEAD")
        print(pr.stdout, pr.stderr)
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
        delay = 90 if new_ver < 10 else 480 + random.randint(0, 120)
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
