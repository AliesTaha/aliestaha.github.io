"""Publisher tests use synthetic health values and mocked gh subprocesses only."""
import base64
import copy
import importlib.util
import json
import stat
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

SPEC = importlib.util.spec_from_file_location("publish_health", Path(__file__).parents[1] / "scripts/publish_health.py")
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)


def snapshot(age_hours=0):
    generated = (datetime.now(timezone.utc) - timedelta(hours=age_hours)).replace(microsecond=0)
    day = (generated - timedelta(days=1)).date().isoformat()
    row = dict.fromkeys(publisher.RANGES)
    row.update(date=day, sleep_state="SCORED", recovery_state="SCORED", cycle_state="SCORED",
               cycle_complete=True, sleep_hours=7.5, steps=7000, recovery=70, strain=10)
    return {"schema_version": 1, "generated_at": generated.isoformat().replace("+00:00", "Z"),
            "timezone": "recorded local offset", "daily": [row],
            "coverage": {"first_date": day, "last_date": day, "days": 1},
            "methodology": copy.deepcopy(publisher.METHODOLOGY),
            "unavailable": copy.deepcopy(publisher.UNAVAILABLE), "quality": {}}


def response(status=200, body=None):
    return subprocess.CompletedProcess([], 0 if status < 400 else 1,
        stdout=f"HTTP/2.0 {status} Test\r\nContent-Type: application/json\r\n\r\n{json.dumps(body)}\n",
        stderr="untrusted secret error body never print this" if status >= 400 else "")


def remote(value, sha="a" * 40):
    return {"type": "file", "encoding": "base64", "path": publisher.DESTINATION, "sha": sha,
            "content": base64.b64encode(publisher.canonical(value)).decode()}


def mock_gh(monkeypatch, replies, capture=None):
    commands = []
    def fake_run(command, **kwargs):
        commands.append(command)
        assert command[:3] == ["gh", "api", "--include"]
        assert kwargs["capture_output"] and kwargs["timeout"] == 90
        if "--input" in command:
            path = Path(command[command.index("--input") + 1])
            assert stat.S_IMODE(path.stat().st_mode) == 0o600
            assert path.parent.name == "cache"
            request = json.loads(path.read_text())
            assert request["branch"] == "main"
            assert command[5] == publisher.ENDPOINT
            if capture is not None:
                capture.append(request)
        assert replies, "Unexpected GitHub request"
        return replies.pop(0)
    monkeypatch.setattr(publisher.subprocess, "run", fake_run)
    return commands


@pytest.mark.parametrize("field,value", [
    ("access_token", "synthetic-secret"), ("email", "private@example.test"),
    ("user_id", 123), ("cycle_id", 456), ("start", "2026-01-01T01:23:45Z"),
])
def test_rejects_unreviewed_daily_fields(field, value):
    data = snapshot()
    data["daily"][0][field] = value
    with pytest.raises(publisher.PublishError, match="daily"):
        publisher.validate_snapshot(data)


@pytest.mark.parametrize("key,value", [
    ("recovery", 101), ("strain", -1), ("sleep_hours", float("nan")),
    ("hrv_ms", float("inf")), ("steps", 1.2), ("resting_hr", True),
    ("workouts", "private@example.test"),
])
def test_rejects_invalid_metrics(key, value):
    data = snapshot()
    data["daily"][0][key] = value
    with pytest.raises(publisher.PublishError):
        publisher.validate_snapshot(data)


def test_rejects_metadata_secrets_and_duplicate_json_fields():
    data = snapshot()
    data["methodology"]["dates"] = "synthetic-secret"
    with pytest.raises(publisher.PublishError, match="metadata"):
        publisher.validate_snapshot(data)
    with pytest.raises(publisher.PublishError, match="Duplicate"):
        publisher.decode_snapshot(b'{"schema_version":1,"schema_version":1}')


def test_rejects_dates_coverage_empty_and_huge_snapshots(tmp_path):
    data = snapshot()
    data["daily"].append(copy.deepcopy(data["daily"][0]))
    with pytest.raises(publisher.PublishError, match="unique"):
        publisher.validate_snapshot(data)
    data = snapshot()
    data["coverage"]["days"] = 2
    with pytest.raises(publisher.PublishError, match="Coverage"):
        publisher.validate_snapshot(data)
    data = snapshot()
    data["daily"] = []
    with pytest.raises(publisher.PublishError, match="nonempty"):
        publisher.validate_snapshot(data)
    path = tmp_path / "huge.json"
    path.write_bytes(b" " * (publisher.MAX_BYTES + 1))
    with pytest.raises(publisher.PublishError, match="size"):
        publisher.read_snapshot(path)


def test_invalid_source_does_not_invoke_gh(monkeypatch, tmp_path):
    commands = mock_gh(monkeypatch, [])
    data = snapshot()
    data["token"] = "synthetic-secret"
    with pytest.raises(publisher.PublishError):
        publisher.publish(data, enabled=True, cache=tmp_path / "cache")
    assert not commands


def test_default_dry_run_only_reads(monkeypatch, tmp_path):
    commands = mock_gh(monkeypatch, [response(404)])
    result = publisher.publish(snapshot(), cache=tmp_path / "cache")
    assert result["published"] is False and result["would_publish"] is True
    assert len(commands) == 1 and commands[0][4] == "GET"
    assert commands[0][5].endswith("?ref=main")


def test_publication_uses_expected_sha_private_payload_and_cleans_up(monkeypatch, tmp_path):
    data, old = snapshot(), snapshot(age_hours=2)
    # Keep observations identical so only the freshness timestamp changes.
    old["daily"] = copy.deepcopy(data["daily"])
    old["coverage"] = copy.deepcopy(data["coverage"])
    requests = []
    commands = mock_gh(monkeypatch, [response(body=remote(old)), response(body={"commit": {"sha": "b" * 40}})], requests)
    result = publisher.publish(data, enabled=True, cache=tmp_path / "cache")
    assert result == {"published": True, "commit": "b" * 40, "generated_at": data["generated_at"]}
    assert requests[0]["sha"] == "a" * 40
    assert json.loads(base64.b64decode(requests[0]["content"])) == data
    assert [command[4] for command in commands] == ["GET", "PUT"]
    assert not list((tmp_path / "cache").glob(".publish-*"))
    assert stat.S_IMODE((tmp_path / "cache/publish.lock").stat().st_mode) == 0o600


def test_does_not_overwrite_newer_snapshot(monkeypatch, tmp_path):
    commands = mock_gh(monkeypatch, [response(body=remote(snapshot()))])
    with pytest.raises(publisher.PublishError, match="newer"):
        publisher.publish(snapshot(age_hours=1), enabled=True, cache=tmp_path / "cache")
    assert len(commands) == 1


def test_identical_timestamp_and_snapshot_is_noop(monkeypatch, tmp_path):
    data = snapshot()
    commands = mock_gh(monkeypatch, [response(body=remote(data))])
    result = publisher.publish(data, enabled=True, cache=tmp_path / "cache")
    assert not result["published"] and result["reason"] == "already_current"
    assert len(commands) == 1


def test_conflict_rereads_sha_once(monkeypatch, tmp_path):
    requests = []
    commands = mock_gh(monkeypatch, [
        response(body=remote(snapshot(age_hours=2), "a" * 40)), response(409),
        response(body=remote(snapshot(age_hours=1), "c" * 40)),
        response(body={"commit": {"sha": "d" * 40}}),
    ], requests)
    result = publisher.publish(snapshot(), enabled=True, cache=tmp_path / "cache")
    assert result["published"] and result["commit"] == "d" * 40
    assert [request["sha"] for request in requests] == ["a" * 40, "c" * 40]
    assert len(commands) == 4


def test_conflict_with_newer_snapshot_stops_without_second_put(monkeypatch, tmp_path):
    commands = mock_gh(monkeypatch, [
        response(body=remote(snapshot(age_hours=3))), response(409),
        response(body=remote(snapshot())),
    ])
    with pytest.raises(publisher.PublishError, match="newer"):
        publisher.publish(snapshot(age_hours=1), enabled=True, cache=tmp_path / "cache")
    assert [command[4] for command in commands] == ["GET", "PUT", "GET"]


def test_invalid_remote_is_not_replaced(monkeypatch, tmp_path):
    invalid = snapshot()
    invalid["daily"][0]["email"] = "private@example.test"
    commands = mock_gh(monkeypatch, [response(body=remote(invalid))])
    with pytest.raises(publisher.PublishError):
        publisher.publish(snapshot(), enabled=True, cache=tmp_path / "cache")
    assert len(commands) == 1


def test_errors_do_not_log_api_body_or_snapshot(monkeypatch, tmp_path, capsys):
    path = tmp_path / "public.json"
    path.write_bytes(publisher.canonical(snapshot()))
    mock_gh(monkeypatch, [response(404), response(403, {"secret": "must-not-appear"})])
    original = publisher.publish
    monkeypatch.setattr(publisher, "publish", lambda data, *, enabled=False:
                        original(data, enabled=enabled, cache=tmp_path / "cache"))
    assert publisher.main(["--snapshot", str(path), "--publish"]) == 1
    output = capsys.readouterr()
    result = json.loads(output.out)
    assert result == {"published": False, "error": "GitHub request failed with HTTP 403"}
    assert not output.err
    assert not list((tmp_path / "cache").glob(".publish-*"))


def test_conflict_retry_is_bounded(monkeypatch, tmp_path):
    commands = mock_gh(monkeypatch, [
        response(body=remote(snapshot(age_hours=2))), response(409),
        response(body=remote(snapshot(age_hours=1))), response(409),
    ])
    with pytest.raises(publisher.PublishError, match="did not accept"):
        publisher.publish(snapshot(), enabled=True, cache=tmp_path / "cache")
    assert len(commands) == 4
    assert not list((tmp_path / "cache").glob(".publish-*"))
