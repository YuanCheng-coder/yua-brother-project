#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Smoke-test local game server: HTTP assets + import graph + export markers."""
import re, sys, urllib.request
from pathlib import Path

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
ROOT = Path(__file__).resolve().parents[1]
import_re = re.compile(r"""from\s+['\"](\.?\.?/?[^'\"]+)['\"]""")

def main():
    missing = []
    for f in (ROOT / 'js').rglob('*.js'):
        text = f.read_text(encoding='utf-8')
        for m in import_re.finditer(text):
            spec = m.group(1)
            if not spec.startswith('.'):
                continue
            target = (f.parent / spec).resolve()
            if not target.exists():
                missing.append('%s -> %s' % (f.relative_to(ROOT), spec))
        rel = str(f.relative_to(ROOT)).replace('\\', '/')
        try:
            code = urllib.request.urlopen(BASE + rel, timeout=5).getcode()
            if code != 200:
                missing.append('HTTP %s %s' % (code, rel))
        except Exception as e:
            missing.append('HTTP fail %s: %s' % (rel, e))

    html = urllib.request.urlopen(BASE, timeout=5).read().decode('utf-8')
    if 'js/main.js' not in html:
        missing.append('index missing main.js')

    checks = [
        ('export const CHARACTERS', 'js/data/characters.js'),
        ('export const WEAPON_DEFS', 'js/data/weapons.js'),
        ('export const ENCHANTMENTS', 'js/data/enchantments.js'),
        ('export function pickEnemyType', 'js/data/enemies.js'),
        ('export const CHAPTERS', 'js/data/stages.js'),
        ('export function buildTerrainMap', 'js/data/terrain.js'),
        ('export class Game', 'js/game.js'),
        ('export class Shop', 'js/shop.js'),
        ('export class Player', 'js/entities.js'),
        ('kind: \'enchant\'', 'js/shop.js'),
        ('kind: \'upgrade\'', 'js/shop.js'),
        ('drawTerrain', 'js/game.js'),
        ('getChapterForWave', 'js/game.js'),
    ]
    for needle, path in checks:
        t = (ROOT / path).read_text(encoding='utf-8')
        if needle not in t:
            missing.append('missing %r in %s' % (needle, path))

    if missing:
        print('SMOKE_FAIL')
        for m in missing:
            print(' -', m)
        sys.exit(1)
    print('SMOKE_OK')
    return 0

if __name__ == '__main__':
    sys.exit(main() or 0)
