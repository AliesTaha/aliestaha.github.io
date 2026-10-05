#!/usr/bin/env python3
"""Refresh the public WHOOP and Hevy snapshots; use --publish to publish."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys

EXPORT_ERRORS = {"whoop_auth_failed", "whoop_rate_limited", "whoop_unavailable", "network_unavailable", "export_failed",
                 "hevy_auth_failed", "hevy_rate_limited", "hevy_unavailable", "hevy_export_failed"}


def final_result(output):
    try:
        result = json.loads(next(line for line in reversed(output.decode("utf-8").splitlines()) if line.strip()))
        return result if isinstance(result, dict) else {}
    except (ValueError, UnicodeError, StopIteration):
        return {}


def refresh(root, snapshot, publish=False, dataset="health"):
    """Keep child diagnostics private and emit only allowlisted result fields."""
    try:
        exporter = 'export_hevy.py' if dataset == 'lifting' else 'export_whoop.py'
        exported = subprocess.run([sys.executable, str(root/exporter), '--output', str(snapshot)], capture_output=True)
        if exported.returncode:
            code = final_result(exported.stdout).get('error', {})
            code = code.get('code') if isinstance(code, dict) else None
            return {'status': 'failed', 'error': {'code': code if isinstance(code, str) and code in EXPORT_ERRORS else 'export_failed'}}
        command = [sys.executable, str(root/'publish_health.py'), '--snapshot', str(snapshot), '--dataset', dataset]
        if publish:
            command.append('--publish')
        published = subprocess.run(command, capture_output=True)
        result = final_result(published.stdout)
        if published.returncode == 0:
            stamp, commit = result.get('generated_at'), result.get('commit')
            if isinstance(stamp, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', stamp):
                if result.get('published') is True and isinstance(commit, str) and re.fullmatch(r'[0-9a-f]{40}', commit):
                    return {'published': True, 'commit': commit, 'generated_at': stamp}
                if result.get('published') is False and result.get('reason') in {'already_current', 'dry_run'}:
                    return {'published': False, 'reason': result['reason'], 'commit': None, 'generated_at': stamp}
        return {'status': 'failed', 'error': {'code': 'publication_failed'}}
    except OSError:
        return {'status': 'failed', 'error': {'code': 'refresh_failed'}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--dataset', choices=('health', 'lifting', 'all'), default='all')
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
        datasets = ('health', 'lifting') if args.dataset == 'all' else (args.dataset,)
        results = {}
        for dataset in datasets:
            snapshot = private/('lifting-snapshot.json' if dataset == 'lifting' else 'public-snapshot.json')
            results[dataset] = refresh(root, snapshot, args.publish, dataset)
        result = results if args.dataset == 'all' else results[args.dataset]
        print(json.dumps(result))
        return 1 if any(item.get('status') == 'failed' for item in results.values()) else 0


if __name__ == '__main__':
    sys.exit(main())
