#!/bin/bash
ROOT="/Users/yuancheng/yua-brother-project"
LOG="/tmp/yua-overnight.log"
HTTP_LOG="/tmp/yua-http.log"
cd "$ROOT" || exit 1
DEADLINE=$(date -j -f "%Y-%m-%d %H:%M:%S" "2026-08-05 22:00:00" "+%s" 2>/dev/null || echo 1783706400)

ensure_http() {
  if ! curl -s -o /dev/null --connect-timeout 2 "http://127.0.0.1:8765/"; then
    lsof -ti:8765 | xargs kill -9 2>/dev/null || true
    nohup python3 -m http.server 8765 >>"$HTTP_LOG" 2>&1 &
    sleep 1
  fi
}

push_all() {
  TOKEN=$("$HOME/.local/bin/gh" auth token 2>/dev/null || true)
  if [ -n "$TOKEN" ]; then
    GIT_TERMINAL_PROMPT=0 git push "https://x-access-token:${TOKEN}@github.com/YuanCheng-coder/yua-brother-project.git" HEAD:main >>"$LOG" 2>&1 || true
  fi
}

while true; do
  NOW=$(date "+%s")
  [ "$NOW" -ge "$DEADLINE" ] && echo "$(date) deadline" >>"$LOG" && break
  VER=$(python3 -c "import json;print(json.load(open('VERSION.json'))['version'])" 2>/dev/null || echo 0)
  [ "$VER" -ge 100 ] && echo "$(date) v$VER done" >>"$LOG" && break
  ensure_http
  if ! pgrep -f "scripts/overnight_iterate.py" >/dev/null 2>&1; then
    echo "$(date) restart overnight ver=$VER" >>"$LOG"
    nohup python3 -u scripts/overnight_iterate.py >>"$LOG" 2>&1 &
    echo $! > /tmp/yua-overnight.pid
  fi
  push_all
  sleep 45
done
