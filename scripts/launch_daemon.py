#!/usr/bin/env python3
"""Detach overnight supervisor so it survives agent shell exits."""
from __future__ import print_function
import os, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(str(ROOT))

def pgrep(pat):
    r = subprocess.run(["pgrep", "-f", pat], stdout=subprocess.PIPE)
    return r.returncode == 0

# HTTP
if not pgrep("http.server 8765"):
    subprocess.Popen(
        ["python3", "-u", "-m", "http.server", "8765", "--bind", "127.0.0.1"],
        stdout=open("/tmp/yua-http.log", "a"),
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    time.sleep(1)

# Supervisor
if not pgrep("supervise_overnight.sh"):
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    p = subprocess.Popen(
        ["bash", "scripts/supervise_overnight.sh"],
        stdout=open("/tmp/yua-supervise.log", "a"),
        stderr=subprocess.STDOUT,
        start_new_session=True,
        env=env,
    )
    print("supervisor launched", p.pid)
else:
    print("supervisor already running")

time.sleep(2)
print("http", pgrep("http.server 8765"))
print("sup", pgrep("supervise_overnight.sh"))
print("iter", pgrep("scripts/overnight_iterate.py"))
sys.exit(0)
