#!/usr/bin/env python3
"""Install the existing hourly health publisher as a per-user macOS LaunchAgent."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile

LABEL = "com.aliestaha.health-sync"
SCRIPTS = ("scheduled_health.py", "refresh_health.py", "export_whoop.py", "export_hevy.py", "publish_health.py")


def atomic_write(path, content, mode=0o600):
    fd, temporary = tempfile.mkstemp(prefix=".install-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), mode)
            stream.write(content)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def configuration(home, interpreter, gh):
    runtime = home / ".local/share/whoop-codex/health-sync"
    cache = home / ".local/share/whoop-codex/health-cache"
    return {
        "Label": LABEL,
        "ProgramArguments": [str(interpreter), str(runtime / "scripts/scheduled_health.py")],
        "WorkingDirectory": str(runtime),
        "EnvironmentVariables": {
            "PATH": f"{gh.parent}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
            "PYTHONUNBUFFERED": "1",
            "GH_PROMPT_DISABLED": "1",
        },
        # Calendar ticks coalesce during sleep and run on wake. The runner gates
        # these cheap checks to hourly refreshes, new wakes, and failure retries.
        "StartCalendarInterval": [{"Minute": minute} for minute in range(60)],
        "RunAtLoad": True,
        "ProcessType": "Background",
        "Umask": 0o077,
        "StandardOutPath": str(cache / "launchd-output.log"),
        "StandardErrorPath": str(cache / "launchd-error.log"),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true", help="Install and start the hourly job")
    args = parser.parse_args()
    if sys.platform != "darwin":
        parser.error("This installer requires macOS.")
    home = Path.home()
    interpreter = home / ".local/share/whoop-codex/.venv/bin/python"
    gh_command = shutil.which("gh")
    if not interpreter.is_file() or not gh_command:
        parser.error("The existing WHOOP Python environment and GitHub CLI are required.")
    source = Path(__file__).resolve().parent
    for name in SCRIPTS:
        if not (source / name).is_file():
            parser.error(f"Required runner script is missing: {name}")
    runtime = home / ".local/share/whoop-codex/health-sync"
    cache = home / ".local/share/whoop-codex/health-cache"
    agents = home / "Library/LaunchAgents"
    plist = agents / f"{LABEL}.plist"
    config = configuration(home, interpreter, Path(gh_command))
    if not args.install:
        print(json.dumps({"installed": False, "label": LABEL, "schedule": "minute checks; hourly, wake, and retry refreshes", "plist": str(plist)}))
        return 0

    # The installed copy avoids Desktop-folder permissions and does not depend
    # on a Codex checkout or an open app. Credentials remain in their old paths.
    for directory in (runtime, runtime / "scripts", cache):
        directory.mkdir(parents=True, mode=0o700, exist_ok=True)
        os.chmod(directory, 0o700)
    agents.mkdir(parents=True, exist_ok=True)
    replacements = {runtime / "scripts" / name: (source / name).read_bytes() for name in SCRIPTS}
    replacements[plist] = plistlib.dumps(config)
    previous = {path: path.read_bytes() if path.exists() else None for path in replacements}
    # Validate and stage every replacement before stopping an existing service.
    with tempfile.TemporaryDirectory(prefix=".install-", dir=runtime) as staged:
        for path, content in replacements.items():
            atomic_write(Path(staged) / path.name, content)
        subprocess.run(["/usr/bin/plutil", "-lint", str(Path(staged) / plist.name)], check=True, capture_output=True)
    target = f"gui/{os.getuid()}/{LABEL}"
    loaded = subprocess.run(["/bin/launchctl", "print", target], capture_output=True).returncode == 0
    for name in ("launchd-output.log", "launchd-error.log"):
        path = cache / name
        path.touch(mode=0o600, exist_ok=True)
        os.chmod(path, 0o600)
    if loaded:
        subprocess.run(["/bin/launchctl", "bootout", target], check=True, capture_output=True)
    try:
        for path, content in replacements.items():
            atomic_write(path, content)
        subprocess.run(["/bin/launchctl", "enable", target], check=True, capture_output=True)
        subprocess.run(["/bin/launchctl", "bootstrap", f"gui/{os.getuid()}", str(plist)], check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        for path, content in previous.items():
            if content is None:
                path.unlink(missing_ok=True)
            else:
                atomic_write(path, content)
        if loaded:
            subprocess.run(["/bin/launchctl", "bootstrap", f"gui/{os.getuid()}", str(plist)], check=True, capture_output=True)
        raise
    print(json.dumps({"installed": True, "label": LABEL, "plist": str(plist), "runtime": str(runtime)}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError):
        print(json.dumps({"installed": False, "error": "Could not install or start the macOS health agent. Check its launchctl status before relying on scheduled updates; keep any existing fallback schedule active."}))
        sys.exit(1)
