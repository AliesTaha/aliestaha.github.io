#!/usr/bin/env python3
"""Export a deliberately small PUBLIC WHOOP dataset using the private local connector.

Run with ~/.local/share/whoop-codex/.venv/bin/python. No credentials or raw
records belong in this repository. Raw history is cached in a mode-700 directory
outside the repository; only explicitly named daily measurements are exported.
The first run and weekly refreshes paginate all available history. Other runs
replace the recent 30-day window, including deletions and rescored records.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import logging
import math
import os
import re
import sys
import tempfile
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
CONNECTOR = Path.home() / ".local/share/whoop-codex/whoop_mcp_server.py"
CACHE = Path.home() / ".local/share/whoop-codex/health-cache"
ENDPOINTS = {
    "cycles": "/v2/cycle", "recoveries": "/v2/recovery",
    "sleeps": "/v2/activity/sleep", "workouts": "/v2/activity/workout",
}
METRICS = (
    "sleep_hours", "deep_hours", "rem_hours", "light_hours", "nap_hours",
    "sleep_no_data_hours", "sleep_performance", "sleep_efficiency",
    "sleep_consistency", "sleep_debt_hours", "hrv_ms", "resting_hr",
    "recovery", "strain", "avg_hr", "max_hr", "respiratory_rate", "spo2",
    "skin_temp", "workout_minutes", "workouts", "steps", "energy_kcal",
)
STATES = {"SCORED", "PENDING_SCORE", "UNSCORABLE"}
DAILY_KEYS = {"date", "sleep_state", "recovery_state", "cycle_state", "cycle_complete", *METRICS}
METHODOLOGY = {
    "dates": "Dates use each record's WHOOP timezone offset. Main sleep, its recovery, and its physiological cycle share the main sleep's local wake date. Cycles without an associated main sleep fall back to their local start date. Workouts use their local start date.",
    "sleep_hours": "Hours actually asleep in the latest main sleep ending that day: light + deep + REM. Excludes naps, awake time, and intervals without data. All three stages must be present.",
    "sleep_stages": "Deep, REM, light, no-data time, and sleep scores describe that same main sleep. Sleep debt is WHOOP's sleep-needed contribution from prior sleep debt.",
    "nap_hours": "Sum of scored nap sleep ending that day; unknown if any nap has incomplete stages. Zero means no recorded nap.",
    "recovery": "WHOOP recovery, resting heart rate, HRV (RMSSD), SpO2, and skin temperature are joined by cycle ID, never by record creation date.",
    "cycles": "Strain, average and maximum heart rate, steps, and energy describe the physiological cycle beginning with that main sleep, which may cross midnight. If multiple cycles map to one day, a cycle linked to main sleep takes priority, then the latest cycle is used; strain is never added. An open cycle is provisional. Energy converts WHOOP kilojoules to kcal using 4.184 kJ per kcal.",
    "workouts": "Count and summed elapsed minutes of recorded workouts starting that day. Zero means no recorded workout; not proof of no exercise. Minutes are unknown if any recorded workout is incomplete.",
    "missing": "Null means no measurement or not yet scored, never zero. Missing calendar days remain visible as gaps. Biological age and continuous heart-rate samples are not supplied by this API.",
}


def parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result if result.tzinfo is not None else None
    except ValueError:
        return None


def local_day(record: dict, field: str = "start") -> str | None:
    instant = parse_time(record.get(field))
    offset = record.get("timezone_offset")
    if offset == "Z":
        offset = "+00:00"
    if not instant or not isinstance(offset, str) or not re.fullmatch(r"[+-]\d{2}:\d{2}", offset):
        return None
    hours, minutes = (int(part) for part in offset[1:].split(":"))
    if hours > 23 or minutes > 59:
        return None
    delta = timedelta(hours=hours, minutes=minutes)
    if offset[0] == "-":
        delta = -delta
    return instant.astimezone(timezone(delta)).date().isoformat()


def number(value: Any, digits: int = 2) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    return round(value, digits)


def hours(value: Any) -> float | None:
    if number(value) is None or value < 0:
        return None
    return round(value / 3_600_000, 4)


def score(record: dict) -> dict:
    value = record.get("score")
    return value if record.get("score_state") == "SCORED" and isinstance(value, dict) else {}


def state(record: dict | None) -> str:
    value = (record or {}).get("score_state")
    return value if value in STATES else "MISSING"


def asleep_milliseconds(record: dict) -> float | None:
    stages = score(record).get("stage_summary") or {}
    values = [stages.get(key) for key in (
        "total_light_sleep_time_milli", "total_slow_wave_sleep_time_milli",
        "total_rem_sleep_time_milli",
    )]
    if any(number(value) is None or value < 0 for value in values):
        return None
    return sum(values)


def sort_time(record: dict, field: str = "start") -> datetime:
    return parse_time(record.get(field)) or datetime.min.replace(tzinfo=timezone.utc)


def normalize(collections: dict[str, list[dict]], now: datetime | None = None) -> dict:
    """Project raw records into an allowlist; never propagate upstream dictionaries."""
    now = now or datetime.now(timezone.utc)
    cycles_by_day: dict[str, list[dict]] = defaultdict(list)
    cycles_by_id = {}
    sleeps_by_day: dict[str, list[dict]] = defaultdict(list)
    workouts_by_day: dict[str, list[dict]] = defaultdict(list)
    recoveries_by_cycle = {}
    quality = Counter()
    cycles_by_id = {str(record.get("id")): record for record in collections.get("cycles", [])}
    sleeps_by_id = {str(record.get("id")): record for record in collections.get("sleeps", [])}
    for record in collections.get("recoveries", []):
        key = str(record.get("cycle_id"))
        previous = recoveries_by_cycle.get(key)
        if previous is None or sort_time(record, "updated_at") >= sort_time(previous, "updated_at"):
            recoveries_by_cycle[key] = record
        if key not in cycles_by_id:
            quality["recoveries_without_cycle"] += 1
    main_by_cycle = {}
    cycles_with_main_sleep = set()
    for record in collections.get("sleeps", []):
        if record.get("nap") is not False or not local_day(record, "end"):
            continue
        key = str(record.get("cycle_id"))
        previous = main_by_cycle.get(key)
        if previous is None or sort_time(record, "end") >= sort_time(previous, "end"):
            main_by_cycle[key] = record
    for record in collections.get("cycles", []):
        key = str(record.get("id"))
        sleep = main_by_cycle.get(key)
        if sleep is None:
            recovery = recoveries_by_cycle.get(key, {})
            candidate = sleeps_by_id.get(str(recovery.get("sleep_id")))
            if candidate and candidate.get("nap") is False:
                sleep = candidate
        day = local_day(sleep, "end") if sleep else None
        if day is not None:
            cycles_with_main_sleep.add(key)
        if day is None:
            day = local_day(record)
            quality["cycles_using_start_date_fallback"] += 1
        if day:
            cycles_by_day[day].append(record)
        else:
            quality["cycles_without_local_date"] += 1
    for name, field, grouped in (
        ("sleeps", "end", sleeps_by_day), ("workouts", "start", workouts_by_day),
    ):
        for record in collections.get(name, []):
            day = local_day(record, field)
            if day:
                grouped[day].append(record)
            else:
                quality[f"{name}_without_local_date"] += 1
    observed = sorted(set(cycles_by_day) | set(sleeps_by_day) | set(workouts_by_day))
    rows = []
    if observed:
        day = datetime.fromisoformat(observed[0]).date()
        last = datetime.fromisoformat(observed[-1]).date()
        while day <= last:
            key = day.isoformat()
            row = {"date": key, **dict.fromkeys(METRICS)}
            cycle_options = cycles_by_day.get(key, [])
            cycle = max(cycle_options, key=lambda record: (str(record.get("id")) in cycles_with_main_sleep, sort_time(record))) if cycle_options else None
            if len(cycle_options) > 1:
                quality["days_with_multiple_cycles"] += 1
            recovery = recoveries_by_cycle.get(str(cycle.get("id"))) if cycle else None
            row.update(cycle_state=state(cycle), recovery_state=state(recovery),
                       cycle_complete=bool(cycle.get("end")) if cycle else None)
            if cycle:
                s = score(cycle)
                energy = s.get("kilojoule")
                row.update(strain=number(s.get("strain")), avg_hr=number(s.get("average_heart_rate")), max_hr=number(s.get("max_heart_rate")), steps=number(cycle.get("step_count")), energy_kcal=number(energy / 4.184) if number(energy) is not None else None)
            if recovery:
                s = score(recovery)
                row.update(hrv_ms=number(s.get("hrv_rmssd_milli")), resting_hr=number(s.get("resting_heart_rate")), recovery=number(s.get("recovery_score")), spo2=number(s.get("spo2_percentage")), skin_temp=number(s.get("skin_temp_celsius")))
            daily_sleeps = sleeps_by_day.get(key, [])
            main = [record for record in daily_sleeps if record.get("nap") is False]
            sleep = max(main, key=lambda record: sort_time(record, "end")) if main else None
            if len(main) > 1:
                quality["days_with_multiple_main_sleeps"] += 1
            row["sleep_state"] = state(sleep)
            if sleep:
                s = score(sleep)
                stages = s.get("stage_summary") or {}
                need = s.get("sleep_needed") or {}
                row.update(sleep_hours=hours(asleep_milliseconds(sleep)), deep_hours=hours(stages.get("total_slow_wave_sleep_time_milli")), rem_hours=hours(stages.get("total_rem_sleep_time_milli")), light_hours=hours(stages.get("total_light_sleep_time_milli")), sleep_no_data_hours=hours(stages.get("total_no_data_time_milli")), sleep_performance=number(s.get("sleep_performance_percentage")), sleep_efficiency=number(s.get("sleep_efficiency_percentage")), sleep_consistency=number(s.get("sleep_consistency_percentage")), sleep_debt_hours=hours(need.get("need_from_sleep_debt_milli")), respiratory_rate=number(s.get("respiratory_rate")))
            naps = [asleep_milliseconds(record) for record in daily_sleeps if record.get("nap") is True]
            row["nap_hours"] = hours(sum(naps)) if all(value is not None for value in naps) else None
            workouts = workouts_by_day.get(key, [])
            durations = []
            for workout in workouts:
                start, end = parse_time(workout.get("start")), parse_time(workout.get("end"))
                durations.append((end - start).total_seconds() / 60 if start and end and end >= start else None)
            row["workouts"] = len(workouts)
            row["workout_minutes"] = number(sum(durations)) if all(value is not None for value in durations) else None
            rows.append(row)
            day += timedelta(days=1)
    result = {
        "schema_version": 1,
        "generated_at": now.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "timezone": "recorded local offset",
        "coverage": {"first_date": observed[0] if observed else None, "last_date": observed[-1] if observed else None, "days": len(rows)},
        "daily": rows,
        "unavailable": {"biological_age": "Not supplied by the official WHOOP API.", "continuous_hr": "The official WHOOP API provides cycle averages and maxima, not continuous heart-rate samples."},
        "methodology": METHODOLOGY,
        "quality": dict(sorted(quality.items())),
    }
    validate_public(result)
    return result


def validate_public(payload: dict) -> None:
    """Fail closed when a future change introduces unreviewed output fields."""
    expected = {"schema_version", "generated_at", "timezone", "coverage", "daily", "unavailable", "methodology", "quality"}
    if set(payload) != expected:
        raise ValueError("Unexpected public metadata field")
    for row in payload["daily"]:
        if set(row) != DAILY_KEYS or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row["date"]):
            raise ValueError("Unexpected public daily field")
        for key in METRICS:
            if row[key] is not None and number(row[key]) is None:
                raise ValueError("Public metrics must be finite numbers or null")


def fetch_pages(get: Callable, path: str, start: str | None = None, pause: Callable = time.sleep) -> list[dict]:
    result, seen = [], set()
    token = None
    while True:
        params: dict[str, Any] = {"limit": 25}
        if start:
            params["start"] = start
        if token:
            params["nextToken"] = token
        pause(0.8)
        page = get(path, params)
        if not isinstance(page, dict) or not isinstance(page.get("records"), list):
            raise RuntimeError("Invalid WHOOP collection response")
        if any(not isinstance(record, dict) for record in page["records"]):
            raise RuntimeError("Invalid WHOOP record")
        result.extend(page["records"])
        token = page.get("next_token")
        if not token:
            return result
        if not isinstance(token, str) or token in seen:
            raise RuntimeError("WHOOP pagination repeated a page token")
        seen.add(token)


def merge_recent(old: list[dict], new: list[dict], kind: str, since: datetime, all_old: dict) -> list[dict]:
    """Drop old recent-window entries before merging, so upstream deletions stick."""
    sleeps = {str(r.get("id")): r for r in all_old.get("sleeps", [])}
    cycles = {str(r.get("id")): r for r in all_old.get("cycles", [])}
    kept = []
    for record in old:
        reference = record
        if kind == "recoveries":
            reference = sleeps.get(str(record.get("sleep_id"))) or cycles.get(str(record.get("cycle_id"))) or record
        instant = parse_time(reference.get("start")) or parse_time(record.get("created_at"))
        # WHOOP includes records crossing the lower bound as well as starting in it.
        end = parse_time(reference.get("end"))
        if instant and instant < since and (end is None or end < since):
            kept.append(record)
    unique = {}
    for record in kept + new:
        key = record.get("cycle_id") if kind == "recoveries" else record.get("id")
        if key is None:
            raise RuntimeError("WHOOP record lacks a stable identifier")
        unique[str(key)] = record
    return list(unique.values())


def atomic_json(path: Path, payload: dict, private: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700 if private else 0o755)
    if path.is_symlink() or path.parent.is_symlink():
        raise RuntimeError("Refusing symlink output")
    if private:
        os.chmod(path.parent, 0o700)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            os.fchmod(stream.fileno(), 0o600 if private else 0o644)
            json.dump(payload, stream, separators=(",", ":"), allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def run(output: Path, cache: Path = CACHE, full: bool = False, offline: bool = False, connector: Path = CONNECTOR) -> dict:
    cache = cache.expanduser().resolve()
    if cache == ROOT or ROOT in cache.parents:
        raise RuntimeError("Raw WHOOP cache must stay outside the public repository")
    cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(cache, 0o700)
    cache_file = cache / "history.json"
    previous = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    now = datetime.now(timezone.utc)
    last_full = parse_time(previous.get("last_full_refresh"))
    full = full or not last_full or now - last_full > timedelta(days=7)
    collections = previous.get("collections", {})
    if offline:
        if not collections:
            raise RuntimeError("No private history cache exists")
        # Rendering cached data must not falsely claim that the WHOOP API was refreshed.
        now = parse_time(previous.get("fetched_at")) or now
    else:
        spec = importlib.util.spec_from_file_location("whoop_local_connector", connector)
        if not spec or not spec.loader:
            raise RuntimeError("Cannot load local WHOOP connector")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        # The MCP dependency configures INFO logging; do not log API URLs/cursors.
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        since = now - timedelta(days=30)
        start = None if full else since.isoformat(timespec="milliseconds").replace("+00:00", "Z")
        fetched = {}
        for kind, path in ENDPOINTS.items():
            fetched[kind] = fetch_pages(module._get, path, start)
            print(f"Fetched {kind}: {len(fetched[kind])} records", flush=True)
        collections = fetched if full else {kind: merge_recent(collections.get(kind, []), rows, kind, since, collections) for kind, rows in fetched.items()}
        # Cache commits only after all four endpoints succeed, preventing partial refreshes.
        atomic_json(cache_file, {"schema_version": 1, "fetched_at": now.isoformat(), "last_full_refresh": now.isoformat() if full else previous["last_full_refresh"], "collections": collections}, private=True)
    payload = normalize(collections, now)
    if not payload["daily"]:
        raise RuntimeError("WHOOP returned no dated records; previous public output preserved")
    atomic_json(output, payload)
    return {"coverage": payload["coverage"], "records": {kind: len(records) for kind, records in collections.items()}, "quality": payload["quality"], "public_bytes": output.stat().st_size, "full_refresh": full and not offline}


def failure_code(exc: Exception) -> str:
    """Classify privately; never return exception text, URLs, or provider data."""
    message = str(exc)
    status = getattr(getattr(exc, "response", None), "status_code", None)
    if (re.search(r"WHOOP token refresh failed \((400|401|403)\)", message)
            or message.startswith(("Not connected to WHOOP", "No refresh token stored"))
            or status in (401, 403)):
        return "whoop_auth_failed"
    if status == 429 or message.startswith(("WHOOP rate limit reached", "WHOOP token refresh failed (429)")):
        return "whoop_rate_limited"
    if status is not None and status >= 500 or re.search(r"WHOOP token refresh failed \(5\d\d\)", message):
        return "whoop_unavailable"
    names = {base.__name__ for base in type(exc).__mro__}
    if names & {"TransportError", "TimeoutException", "ConnectionError", "TimeoutError"}:
        return "network_unavailable"
    return "export_failed"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "assets/data/health.json")
    parser.add_argument("--cache", type=Path, default=CACHE)
    parser.add_argument("--connector", type=Path, default=CONNECTOR)
    parser.add_argument("--full", action="store_true")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    try:
        summary = run(args.output, args.cache, args.full, args.offline, args.connector)
    except Exception as exc:
        # Exception details and HTTP URLs can contain private record IDs. Do not log them.
        print(json.dumps({"status": "failed", "error": {"code": failure_code(exc)}}))
        return 1
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
