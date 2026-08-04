#!/bin/bash
# Robust overnight supervisor — keeps HTTP :8765 + overnight_iterate alive until deadline/v100.
ROOT="/Users/yuancheng/yua-brother-project"
LOG="/tmp/yua-overnight.log"
HTTP_LOG="/tmp/yua-http.log"
SUP_LOG="/tmp/yua-supervise.log"
cd "$ROOT" || exit 1

DEADLINE=$(date -j -f "%Y-%m-%d %H:%M:%S" "2026-08-05 22:00:00" "+%s" 2>/dev/null || echo 1783706400)

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$SUP_LOG" >>"$LOG"; }

ensure_http() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://127.0.0.1:8765/" 2>/dev/null || echo "000")
  if [ "$code" != "200" ]; then
    log "http down (code=$code) — restarting :8765"
    lsof -ti:8765 2>/dev/null | xargs kill -9 2>/dev/null || true
    sleep 0.4
    nohup python3 -u -m http.server 8765 --bind 127.0.0.1 >>"$HTTP_LOG" 2>&1 &
    echo $! > /tmp/yua-http.pid
    sleep 1.2
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://127.0.0.1:8765/" 2>/dev/null || echo "000")
    log "http restart result code=$code"
  fi
}

ensure_iterate() {
  if ! pgrep -f "scripts/overnight_iterate.py" >/dev/null 2>&1; then
    local VER
    VER=$(python3 -c "import json;print(json.load(open('VERSION.json'))['version'])" 2>/dev/null || echo 0)
    log "overnight dead — restarting at v$VER"
    # Prevent duplicate zombies
    pkill -f "scripts/overnight_iterate.py" 2>/dev/null || true
    sleep 0.3
    nohup python3 -u scripts/overnight_iterate.py >>"$LOG" 2>&1 &
    echo $! > /tmp/yua-overnight.pid
    log "overnight pid=$(cat /tmp/yua-overnight.pid)"
  fi
}

# Self-pid lock
echo $$ > /tmp/yua-supervise.pid
log "supervisor start pid=$$"

while true; do
  NOW=$(date "+%s")
  if [ "$NOW" -ge "$DEADLINE" ]; then
    log "deadline reached — stopping"
    break
  fi
  VER=$(python3 -c "import json;print(json.load(open('VERSION.json'))['version'])" 2>/dev/null || echo 0)
  if [ "$VER" -ge 100 ]; then
    log "v$VER done — stopping"
    break
  fi

  ensure_http
  ensure_iterate

  # If iterate pid file exists but process dead, force restart next loop
  if [ -f /tmp/yua-overnight.pid ]; then
    OPID=$(cat /tmp/yua-overnight.pid 2>/dev/null)
    if [ -n "$OPID" ] && ! kill -0 "$OPID" 2>/dev/null; then
      log "stale overnight pid $OPID"
      rm -f /tmp/yua-overnight.pid
    fi
  fi

  sleep 20
done

log "supervisor exit"
