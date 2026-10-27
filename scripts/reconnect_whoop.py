#!/usr/bin/env python3
"""Reconnect the existing private WHOOP integration, then verify publication."""
import json
from pathlib import Path
import subprocess
import sys

import scheduled_health


def main():
    connector = Path.home() / ".local/share/whoop-codex/whoop_mcp_server.py"
    print("Opening WHOOP sign-in in your browser. Complete sign-in and grant the existing integration access.", flush=True)
    try:
        # The connector opens the browser itself. Its OAuth URL and provider
        # diagnostics must never enter public logs or the repository.
        result = subprocess.run([sys.executable, str(connector), "auth"], capture_output=True, timeout=360)
    except (OSError, subprocess.TimeoutExpired):
        print("WHOOP sign-in did not complete. Run this command again when ready.")
        return 1
    if result.returncode:
        print("WHOOP sign-in did not complete. Run this command again when ready.")
        return 1
    print("WHOOP connected. Refreshing data and verifying the live site…", flush=True)
    result = scheduled_health.run()
    health = result.get("datasets", {}).get("health", {})
    if health.get("status") == "success":
        print(json.dumps({"status": "success", "generated_at": health.get("generated_at"), "site": "https://alibytes.com/#body"}))
        return 0
    if result.get("reason") == "scheduler_in_progress":
        print("WHOOP connected. The active updater will finish; the next minute check detects the new credentials if needed.")
        return 0
    print(json.dumps({"status": "failed", "error": health.get("error") or result.get("error") or {"code": "refresh_failed"}}))
    return 1


if __name__ == "__main__":
    sys.exit(main())
