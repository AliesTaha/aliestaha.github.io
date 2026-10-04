"""The background runner is tested with mocked children, network, and temp files."""
import importlib.util
import json
from pathlib import Path
import signal
import ssl
import stat
import subprocess
from unittest.mock import Mock

import pytest


SPEC = importlib.util.spec_from_file_location("scheduled_health", Path(__file__).parents[1] / "scripts/scheduled_health.py")
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)
STAMP = "2026-09-30T15:00:00Z"
OLDER = "2026-09-30T14:00:00Z"
COMMIT = "b" * 40
SECRET = "never log this raw secret"


def publication(**changes):
    result = {"published": True, "commit": COMMIT, "generated_at": STAMP}
    result.update(changes)
    return (json.dumps({"exported": True, "private": SECRET}) + "\n" + json.dumps(result) + "\n").encode()


def workflow(status="completed", conclusion="success", **changes):
    result = {"id": 42, "name": runner.WORKFLOW, "head_sha": COMMIT,
              "status": status, "conclusion": conclusion, "run_attempt": 1}
    result.update(changes)
    return result


def fake_clock(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr(runner.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(runner.time, "sleep", lambda seconds: clock.__setitem__(0, clock[0] + seconds))
    return clock


def commands(monkeypatch, replies):
    calls = []
    def execute(command, timeout, failure_code, timeout_code):
        calls.append(command)
        assert timeout > 0
        answer = replies.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer
    monkeypatch.setattr(runner, "run_command", execute)
    return calls


def gh_runs(*runs):
    return json.dumps({"workflow_runs": list(runs)}).encode()


def saved(cache):
    return json.loads((cache / "scheduled-status.json").read_text())


def seed_success(cache):
    cache.mkdir()
    (cache / "scheduled-status.json").write_text(json.dumps({"last_success_at": OLDER, "untrusted": SECRET}))


def test_success_requires_deployment_then_matching_public_timestamp(monkeypatch, tmp_path):
    fake_clock(monkeypatch)
    replies = [publication(), gh_runs(workflow("in_progress", None)), gh_runs(workflow())]
    calls = commands(monkeypatch, replies)
    fetch = Mock(side_effect=lambda timeout: STAMP if len(calls) == 3 else pytest.fail("Fetched before deployment succeeded"))
    monkeypatch.setattr(runner, "public_timestamp", fetch)
    cache = tmp_path / "cache"
    result = runner.run(cache, budget=60)
    assert result["status"] == "success"
    assert result["last_success_at"] == result["finished_at"]
    assert result["commit"] == COMMIT and result["generated_at"] == STAMP
    assert calls[0] == [runner.sys.executable, str(Path(runner.__file__).with_name("refresh_health.py")), "--publish"]
    assert calls[1][0:2] == ["gh", "api"] and f"head_sha={COMMIT}" in calls[1][2]
    assert saved(cache) == result
    assert fetch.call_count == 1
    assert stat.S_IMODE(cache.stat().st_mode) == 0o700
    for path in cache.iterdir():
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
        assert SECRET not in path.read_text()


@pytest.mark.parametrize("raw,reason", [
    (json.dumps({"status": "skipped", "reason": "another refresh is running"}).encode(), "refresh_in_progress"),
    (publication(published=False, reason="already_current", commit=None), "already_current"),
])
def test_benign_skips_keep_last_success_and_do_not_verify(monkeypatch, tmp_path, raw, reason):
    cache = tmp_path / "cache"
    seed_success(cache)
    calls = commands(monkeypatch, [raw])
    monkeypatch.setattr(runner, "public_timestamp", lambda timeout: pytest.fail("Unexpected network request"))
    result = runner.run(cache)
    assert result["status"] == "skipped" and result["reason"] == reason
    assert result["last_success_at"] == OLDER
    assert len(calls) == 1 and saved(cache) == result
    assert SECRET not in (cache / "scheduled.log").read_text()


def test_scheduler_overlap_preserves_active_status(monkeypatch, tmp_path):
    cache = tmp_path / "cache"
    seed_success(cache)
    before = (cache / "scheduled-status.json").read_bytes()
    monkeypatch.setattr(runner.fcntl, "flock", Mock(side_effect=BlockingIOError))
    monkeypatch.setattr(runner, "run_command", lambda *args: pytest.fail("Overlapping refresh"))
    result = runner.run(cache)
    assert result["status"] == "skipped" and result["reason"] == "scheduler_in_progress"
    assert result["last_success_at"] == OLDER
    assert (cache / "scheduled-status.json").read_bytes() == before


@pytest.mark.parametrize("last_run", [workflow(conclusion="failure"), workflow(conclusion="cancelled")])
def test_failed_deployment_never_fetches_or_advances_last_success(monkeypatch, tmp_path, last_run):
    cache = tmp_path / "cache"
    seed_success(cache)
    commands(monkeypatch, [publication(), gh_runs(workflow(id=40), last_run)])
    monkeypatch.setattr(runner, "public_timestamp", lambda timeout: pytest.fail("Fetched failed deployment"))
    result = runner.run(cache)
    assert result["status"] == "failed" and result["error"]["code"] == "deployment_failed"
    assert result["last_success_at"] == OLDER and result["commit"] == COMMIT


def test_wrong_commit_and_other_workflows_do_not_count_as_deployment(monkeypatch, tmp_path):
    fake_clock(monkeypatch)
    commands(monkeypatch, [publication(), gh_runs(workflow(head_sha="a" * 40), workflow(name="tests"))])
    result = runner.run(tmp_path / "cache", budget=15)
    assert result["status"] == "failed" and result["error"]["code"] == "deployment_timeout"
    assert result["last_success_at"] is None


def test_public_mismatch_retries_and_cannot_report_success(monkeypatch, tmp_path):
    fake_clock(monkeypatch)
    commands(monkeypatch, [publication(), gh_runs(workflow())])
    fetch = Mock(return_value=OLDER)
    monkeypatch.setattr(runner, "public_timestamp", fetch)
    result = runner.run(tmp_path / "cache", budget=30)
    assert result["status"] == "failed" and result["error"]["code"] == "public_snapshot_mismatch"
    assert result["last_success_at"] is None and fetch.call_count == 2


def test_transient_network_and_cache_delay_recover_within_deadline(monkeypatch, tmp_path):
    fake_clock(monkeypatch)
    commands(monkeypatch, [publication(), runner.SyncError("github_unavailable"), gh_runs(workflow())])
    fetch = Mock(side_effect=[runner.SyncError("public_unavailable"), OLDER, STAMP])
    monkeypatch.setattr(runner, "public_timestamp", fetch)
    result = runner.run(tmp_path / "cache", budget=60)
    assert result["status"] == "success" and fetch.call_count == 3


@pytest.mark.parametrize("output", [b"", b"raw secret", b"{}", b"[]", publication(commit=SECRET),
    publication(generated_at="2026-02-30T15:00:00Z"), publication(published=False, reason="dry_run")])
def test_invalid_child_results_are_sanitized(monkeypatch, tmp_path, output):
    commands(monkeypatch, [output])
    result = runner.run(tmp_path / "cache")
    assert result["status"] == "failed" and result["error"]["code"] == "invalid_publication"
    assert SECRET not in json.dumps(result)


def test_child_failure_is_private_and_preserves_previous_success(monkeypatch, tmp_path):
    process = Mock(returncode=1)
    process.communicate.return_value = (SECRET.encode(), SECRET.encode())
    popen = Mock(return_value=process)
    monkeypatch.setattr(runner.subprocess, "Popen", popen)
    cache = tmp_path / "cache"
    seed_success(cache)
    result = runner.run(cache)
    assert result["error"]["code"] == "refresh_failed" and result["last_success_at"] == OLDER
    assert popen.call_args.kwargs["start_new_session"] is True
    assert popen.call_args.kwargs["stderr"] == subprocess.PIPE
    assert SECRET not in (cache / "scheduled.log").read_text()


def test_timeout_stops_and_reaps_entire_child_process_group(monkeypatch):
    process = Mock(pid=4321, returncode=-9)
    process.communicate.side_effect = [subprocess.TimeoutExpired("secret command", 1),
        subprocess.TimeoutExpired("secret command", 2), (b"", b"")]
    monkeypatch.setattr(runner.subprocess, "Popen", Mock(return_value=process))
    kill = Mock()
    monkeypatch.setattr(runner.os, "killpg", kill)
    with pytest.raises(runner.SyncError) as caught:
        runner.run_command(["synthetic-command"], 1, "refresh_failed", "refresh_timeout")
    assert caught.value.code == "refresh_timeout"
    assert [call.args for call in kill.call_args_list] == [(4321, signal.SIGTERM), (4321, signal.SIGKILL)]
    assert process.communicate.call_count == 3


def test_sigterm_cleans_up_child_and_saves_sanitized_interruption(monkeypatch, tmp_path):
    cache = tmp_path / "cache"
    seed_success(cache)
    previous_handler = signal.getsignal(signal.SIGTERM)
    process = Mock(pid=4321, returncode=-15)
    calls = []
    def communicate(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            handler = signal.getsignal(signal.SIGTERM)
            assert handler is runner.handle_termination
            handler(signal.SIGTERM, None)
        return (SECRET.encode(), SECRET.encode())
    process.communicate.side_effect = communicate
    monkeypatch.setattr(runner.subprocess, "Popen", Mock(return_value=process))
    kill = Mock()
    monkeypatch.setattr(runner.os, "killpg", kill)
    result = runner.run(cache)
    assert result["status"] == "failed" and result["error"]["code"] == "interrupted"
    assert result["last_success_at"] == OLDER and result["finished_at"]
    assert saved(cache) == result
    assert [call.args for call in kill.call_args_list] == [(4321, signal.SIGTERM), (4321, signal.SIGKILL)]
    assert len(calls) == 3
    assert signal.getsignal(signal.SIGTERM) is previous_handler
    assert SECRET not in (cache / "scheduled.log").read_text()


@pytest.mark.parametrize("stage", ["deployment", "publication"])
def test_polling_propagates_interruption_without_retry(monkeypatch, stage):
    clock = fake_clock(monkeypatch)
    interrupted = Mock(side_effect=runner.SyncError("interrupted"))
    if stage == "deployment":
        monkeypatch.setattr(runner, "run_command", interrupted)
        verify = lambda: runner.wait_for_deployment(COMMIT, 160)
    else:
        monkeypatch.setattr(runner, "public_timestamp", interrupted)
        verify = lambda: runner.wait_for_publication(STAMP, 160)
    with pytest.raises(runner.SyncError) as caught:
        verify()
    assert caught.value.code == "interrupted"
    assert interrupted.call_count == 1 and clock[0] == 100


def test_public_request_uses_verified_tls_and_bounded_response(monkeypatch):
    response = Mock(status=200, url=runner.PUBLIC_URL)
    response.__enter__ = Mock(return_value=response)
    response.__exit__ = Mock(return_value=False)
    response.read.return_value = json.dumps({"generated_at": STAMP}).encode()
    opener = Mock()
    opener.open.return_value = response
    build = Mock(return_value=opener)
    monkeypatch.setattr(runner.request, "build_opener", build)
    assert runner.public_timestamp(12) == STAMP
    context = build.call_args.args[0]._context
    assert context.check_hostname is True and context.verify_mode == ssl.CERT_REQUIRED
    req = opener.open.call_args.args[0]
    assert req.full_url == runner.PUBLIC_URL and opener.open.call_args.kwargs["timeout"] == 12
    response.read.assert_called_once_with(runner.MAX_RESPONSE + 1)


@pytest.mark.parametrize("url", ["http://aliestaha.com/assets/data/health.json", "https://example.test/health.json"])
def test_public_redirect_cannot_downgrade_or_change_host(url):
    with pytest.raises(runner.SyncError) as caught:
        runner.SecureRedirect().redirect_request(None, None, 302, "", {}, url)
    assert caught.value.code == "public_unavailable"


def test_private_log_rotates_and_status_keeps_latest_result(monkeypatch, tmp_path):
    monkeypatch.setattr(runner, "LOG_LIMIT", 1)
    cache = tmp_path / "cache"
    commands(monkeypatch, [publication(published=False, reason="already_current", commit=None)] * 4)
    for _ in range(4):
        result = runner.run(cache)
    assert saved(cache) == result
    assert sorted(path.name for path in cache.glob("scheduled.log*")) == ["scheduled.log", "scheduled.log.1", "scheduled.log.2"]
    for path in cache.glob("scheduled.log*"):
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
        assert SECRET not in path.read_text()


def test_runner_does_not_follow_cache_symlink(tmp_path):
    target = tmp_path / "target"
    target.mkdir()
    link = tmp_path / "cache"
    link.symlink_to(target, target_is_directory=True)
    result = runner.run(link)
    assert result["status"] == "failed" and result["error"]["code"] == "storage_failed"
    assert not list(target.iterdir())


@pytest.mark.parametrize("status,age,wake_age,expected", [
    ("success", 3599, None, (False, "hourly")),
    ("success", 3600, None, (True, "hourly")),
    ("success", 600, 45, (True, "wake")),
    ("success", 600, 10, (False, "wake_settling")),
    ("failed", 299, 600, (False, "retry")),
    ("failed", 300, 600, (True, "retry")),
    ("failed", 600, 45, (True, "wake")),
    ("running", 300, None, (True, "retry")),
    ("success", -60, None, (True, "clock_changed")),
])
def test_due_gate_hourly_wake_retry_and_clock_change(status, age, wake_age, expected):
    now = runner.timestamp_seconds(STAMP)
    stamp = runner.datetime.fromtimestamp(now - age, runner.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    previous = {"status": status, "started_at": stamp, "last_success_at": stamp}
    assert runner.refresh_due(previous, now, now - wake_age if wake_age is not None else None) == expected


def test_idle_tick_preserves_failure_and_does_not_delay_retry(monkeypatch, tmp_path):
    cache = tmp_path / "cache"
    cache.mkdir()
    prior = {"status": "failed", "started_at": STAMP, "last_success_at": OLDER,
             "error": {"code": "whoop_auth_failed"}}
    path = cache / "scheduled-status.json"
    path.write_text(json.dumps(prior))
    before = path.read_bytes()
    monkeypatch.setattr(runner.time, "time", lambda: runner.timestamp_seconds(STAMP) + 120)
    monkeypatch.setattr(runner, "latest_wake", lambda: runner.timestamp_seconds(OLDER))
    monkeypatch.setattr(runner, "run_command", lambda *args: pytest.fail("Idle tick requested network work"))
    result = runner.run(cache, respect_schedule=True)
    assert result["status"] == "skipped" and result["reason"] == "retry"
    assert path.read_bytes() == before and not (cache / "scheduled.log").exists()


def test_long_failed_attempt_waits_five_minutes_after_finishing():
    started = runner.timestamp_seconds(OLDER)
    finished = runner.timestamp_seconds(STAMP)
    previous = {"status": "failed", "started_at": OLDER, "finished_at": STAMP}
    assert finished > started
    assert runner.refresh_due(previous, finished + 299) == (False, "retry")
    assert runner.refresh_due(previous, finished + 300) == (True, "retry")


def test_native_wake_uses_newest_wake_or_boot_and_missing_clock_falls_back(monkeypatch):
    command = Mock(return_value=subprocess.CompletedProcess([], 0,
        b"kern.waketime: { sec = 100, usec = 0 }\nkern.boottime: { sec = 200, usec = 0 }"))
    monkeypatch.setattr(runner.subprocess, "run", command)
    assert runner.latest_wake() == 200
    assert command.call_args.args[0] == ["/usr/sbin/sysctl", "kern.waketime", "kern.boottime"]
    command.side_effect = OSError(SECRET)
    assert runner.latest_wake() is None


@pytest.mark.parametrize("code", ["whoop_auth_failed", "network_unavailable", SECRET])
def test_refresh_error_codes_are_allowlisted_not_raw_child_details(monkeypatch, code):
    process = Mock(returncode=1)
    process.communicate.return_value = (json.dumps({"status": "failed", "error": {"code": code, "detail": SECRET}}).encode(), SECRET.encode())
    monkeypatch.setattr(runner.subprocess, "Popen", Mock(return_value=process))
    with pytest.raises(runner.SyncError) as caught:
        runner.run_command(["synthetic"], 5, "refresh_failed", "refresh_timeout")
    assert caught.value.code == ("refresh_failed" if code == SECRET else code)
