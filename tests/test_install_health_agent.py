"""LaunchAgent installation tests use a temporary home and mock launchctl."""
import importlib.util
from pathlib import Path
import plistlib
import stat
import subprocess

import pytest

SPEC = importlib.util.spec_from_file_location("install_health_agent", Path(__file__).parents[1] / "scripts/install_health_agent.py")
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


@pytest.fixture
def local_install(monkeypatch, tmp_path):
    monkeypatch.setattr(installer.Path, "home", lambda: tmp_path)
    monkeypatch.setattr(installer.sys, "platform", "darwin")
    monkeypatch.setattr(installer.sys, "argv", ["install_health_agent.py", "--install"])
    monkeypatch.setattr(installer.shutil, "which", lambda _: "/opt/homebrew/bin/gh")
    monkeypatch.setattr(installer, "SCRIPTS", ("refresh_health.py",))
    interpreter = tmp_path / ".local/share/whoop-codex/.venv/bin/python"
    interpreter.parent.mkdir(parents=True)
    interpreter.touch()
    runtime = tmp_path / ".local/share/whoop-codex/health-sync/scripts"
    runtime.mkdir(parents=True)
    agents = tmp_path / "Library/LaunchAgents"
    agents.mkdir(parents=True)
    return runtime / "refresh_health.py", agents / f"{installer.LABEL}.plist"


def test_install_sets_independent_calendar_service(monkeypatch, local_install):
    script, plist = local_install
    calls = []
    def command(args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(args, 1 if args[1] == "print" else 0)
    monkeypatch.setattr(installer.subprocess, "run", command)
    assert installer.main() == 0
    config = plistlib.loads(plist.read_bytes())
    assert config["RunAtLoad"] is True
    assert config["StartCalendarInterval"] == [{"Minute": minute} for minute in range(60)]
    assert config["ProgramArguments"][1].endswith("health-sync/scripts/scheduled_health.py")
    assert config["EnvironmentVariables"]["GH_PROMPT_DISABLED"] == "1"
    assert stat.S_IMODE(script.stat().st_mode) == 0o600
    assert stat.S_IMODE(plist.stat().st_mode) == 0o600
    assert any(args[1] == "bootstrap" for args in calls)
    assert not any(args[1] == "bootout" for args in calls)


def test_failed_update_restores_existing_service(monkeypatch, local_install):
    script, plist = local_install
    script.write_bytes(b"previous script")
    plist.write_bytes(b"previous plist")
    launches = []
    def command(args, **kwargs):
        if args[1] == "bootstrap":
            launches.append(args)
            if len(launches) == 1:
                raise subprocess.CalledProcessError(5, args)
        return subprocess.CompletedProcess(args, 0)
    monkeypatch.setattr(installer.subprocess, "run", command)
    with pytest.raises(subprocess.CalledProcessError):
        installer.main()
    assert script.read_bytes() == b"previous script"
    assert plist.read_bytes() == b"previous plist"
    assert len(launches) == 2


def test_invalid_staged_plist_keeps_existing_service_loaded(monkeypatch, local_install):
    script, plist = local_install
    script.write_bytes(b"previous script")
    plist.write_bytes(b"previous plist")
    calls = []
    def command(args, **kwargs):
        calls.append(args)
        if args[1] == "-lint":
            raise subprocess.CalledProcessError(1, args)
        return subprocess.CompletedProcess(args, 0)
    monkeypatch.setattr(installer.subprocess, "run", command)
    with pytest.raises(subprocess.CalledProcessError):
        installer.main()
    assert not any(args[1] == "bootout" for args in calls)
    assert script.read_bytes() == b"previous script"
    assert plist.read_bytes() == b"previous plist"
