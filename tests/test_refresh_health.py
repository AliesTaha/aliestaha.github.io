"""Refresh stages never publish after a failed export or expose child output."""
import importlib.util
import json
from pathlib import Path
import subprocess
from unittest.mock import Mock

SPEC = importlib.util.spec_from_file_location("refresh_health", Path(__file__).parents[1] / "scripts/refresh_health.py")
refresh = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(refresh)
EXPORT_SPEC = importlib.util.spec_from_file_location("export_health_errors", Path(__file__).parents[1] / "scripts/export_whoop.py")
exporter = importlib.util.module_from_spec(EXPORT_SPEC)
EXPORT_SPEC.loader.exec_module(exporter)
SECRET = "private child detail"


def child(code=0, body=None):
    return subprocess.CompletedProcess([], code, json.dumps(body or {}).encode(), SECRET.encode())


def test_auth_failure_stops_before_publisher_and_keeps_only_category(monkeypatch, tmp_path):
    command = Mock(return_value=child(1, {"error": {"code": "whoop_auth_failed", "detail": SECRET}}))
    monkeypatch.setattr(refresh.subprocess, "run", command)
    result = refresh.refresh(tmp_path, tmp_path / "snapshot.json", publish=True)
    assert result == {"status": "failed", "error": {"code": "whoop_auth_failed"}}
    assert command.call_count == 1 and command.call_args.kwargs["capture_output"] is True


def test_valid_publication_preserves_only_public_identifiers(monkeypatch, tmp_path):
    payload = {"published": True, "commit": "a" * 40, "generated_at": "2026-10-04T12:00:00Z", "secret": SECRET}
    command = Mock(side_effect=[child(), child(body=payload)])
    monkeypatch.setattr(refresh.subprocess, "run", command)
    result = refresh.refresh(tmp_path, tmp_path / "snapshot.json", publish=True)
    assert result == {key: payload[key] for key in ("published", "commit", "generated_at")}
    assert "--publish" in command.call_args.args[0]


def test_unknown_export_and_publisher_errors_stay_sanitized(monkeypatch, tmp_path):
    command = Mock(side_effect=[child(1, {"error": {"code": SECRET}}), child(), child(1, {"error": SECRET})])
    monkeypatch.setattr(refresh.subprocess, "run", command)
    assert refresh.refresh(tmp_path, tmp_path / "snapshot.json")["error"]["code"] == "export_failed"
    assert refresh.refresh(tmp_path, tmp_path / "snapshot.json")["error"]["code"] == "publication_failed"


def test_exporter_classifies_auth_network_provider_and_unknown_errors():
    assert exporter.failure_code(RuntimeError("WHOOP token refresh failed (400). " + SECRET)) == "whoop_auth_failed"
    assert exporter.failure_code(RuntimeError("WHOOP token refresh failed (503). " + SECRET)) == "whoop_unavailable"
    assert exporter.failure_code(RuntimeError("WHOOP token refresh failed (429). " + SECRET)) == "whoop_rate_limited"
    assert exporter.failure_code(RuntimeError("No refresh token stored. " + SECRET)) == "whoop_auth_failed"
    assert exporter.failure_code(TimeoutError(SECRET)) == "network_unavailable"
    assert exporter.failure_code(RuntimeError(SECRET)) == "export_failed"
