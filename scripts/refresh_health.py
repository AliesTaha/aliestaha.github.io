#!/usr/bin/env python3
"""Refresh WHOOP's public snapshot; publication requires an explicit --publish."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    private = Path.home()/'.local/share/whoop-codex/health-cache'
    private.mkdir(parents=True, mode=0o700, exist_ok=True)
    os.chmod(private, 0o700)
    fd = os.open(private/'refresh.lock', os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(fd, 'w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(json.dumps({'status': 'skipped', 'reason': 'another refresh is running'}))
            return
        root = Path(__file__).resolve().parent
        snapshot = private/'public-snapshot.json'
        subprocess.run([sys.executable, str(root/'export_whoop.py'), '--output', str(snapshot)], check=True)
        command = [sys.executable, str(root/'publish_health.py'), '--snapshot', str(snapshot)]
        if args.publish:
            command.append('--publish')
        subprocess.run(command, check=True)


if __name__ == '__main__':
    main()
