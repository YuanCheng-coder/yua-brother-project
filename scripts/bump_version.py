#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bump VERSION.json and append CHANGELOG. Usage: bump_version.py "summary" """
import json, sys, datetime
from pathlib import Path
root = Path(__file__).resolve().parents[1]
ver_path = root / 'VERSION.json'
log_path = root / 'CHANGELOG.md'
data = json.loads(ver_path.read_text(encoding='utf-8'))
data['version'] = int(data.get('version', 1)) + 1
data['updatedAt'] = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
summary = sys.argv[1] if len(sys.argv) > 1 else 'Incremental polish'
ver_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
v = data['version']
entry = f"\n## v{v:03d} ({data['updatedAt'][:10]})\n- {summary}\n"
text = log_path.read_text(encoding='utf-8')
# insert after title block
marker = '# Yua Brother — Changelog'
if marker in text:
    parts = text.split('\n', 3)
    # find first ## after header
    idx = text.find('\n## ')
    if idx != -1:
        text = text[:idx] + entry + text[idx:]
    else:
        text = text + entry
else:
    text = text + entry
log_path.write_text(text, encoding='utf-8')
print(f"Bumped to v{v:03d}: {summary}")
