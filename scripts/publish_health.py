#!/usr/bin/env python3
"""Validate and optionally publish approved daily WHOOP or Hevy summaries.

Dry-run is the default. --publish is required to change GitHub. The repository,
branch, and destination are fixed; credentials and raw WHOOP records are never
read. stdout contains one small status object, never the snapshot or API body.
"""
from __future__ import annotations

import argparse
import base64
import binascii
import fcntl
import json
import math
import os
import re
import stat
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

REPOSITORY = "AliesTaha/aliestaha.github.io"
BRANCH = "main"
DESTINATION = "assets/data/health.json"
ENDPOINT = f"repos/{REPOSITORY}/contents/{DESTINATION}"
DESTINATIONS = {"health": DESTINATION, "lifting": "assets/data/lifting.json"}
CACHE = Path.home() / ".local/share/whoop-codex/health-cache"
MAX_BYTES = 8 * 1024 * 1024
MAX_DAYS = 12_000
TOP_KEYS = {"schema_version", "generated_at", "coverage", "timezone", "daily",
            "unavailable", "methodology", "quality"}
STATES = {"SCORED", "PENDING_SCORE", "UNSCORABLE", "MISSING"}
RANGES = {
    "sleep_hours": (0, 48), "deep_hours": (0, 48), "rem_hours": (0, 48),
    "light_hours": (0, 48), "nap_hours": (0, 48), "sleep_no_data_hours": (0, 48),
    "sleep_performance": (0, 100), "sleep_efficiency": (0, 100),
    "sleep_consistency": (0, 100), "sleep_debt_hours": (0, 168),
    "hrv_ms": (0, 1000), "resting_hr": (0, 300), "recovery": (0, 100),
    "strain": (0, 21), "avg_hr": (0, 300), "max_hr": (0, 300),
    "respiratory_rate": (0, 100), "spo2": (0, 100), "skin_temp": (-20, 60),
    "workout_minutes": (0, 2880), "workouts": (0, 1000),
    "steps": (0, 500_000), "energy_kcal": (0, 100_000),
}
DAILY_KEYS = {"date", "sleep_state", "recovery_state", "cycle_state", "cycle_complete", *RANGES}
QUALITY_KEYS = {
    "cycles_without_local_date", "recoveries_without_cycle", "sleeps_without_local_date",
    "workouts_without_local_date", "days_with_multiple_cycles", "days_with_multiple_main_sleeps",
    "cycles_using_start_date_fallback",
}
# Fixed explanatory text prevents arbitrary strings (including credentials or
# personal identifiers) from entering the public file through metadata fields.
UNAVAILABLE = {
    "biological_age": "Not supplied by the official WHOOP API.",
    "continuous_hr": "The official WHOOP API provides cycle averages and maxima, not continuous heart-rate samples.",
}
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
LIFTING_TOP_KEYS = {"schema_version", "generated_at", "timezone", "coverage", "daily", "methodology"}
LIFTING_RANGES = {"sessions": (0, 1000), "minutes": (0, 10080), "working_sets": (0, 10000), "volume_kg": (0, 1_000_000_000)}
LIFTING_METHODOLOGY = {
    "dates": "Sessions are grouped by their start date in America/Toronto, including daylight saving time. Every calendar day from the first logged session through the last refresh date is retained. With no logged sessions, the current date is shown as zero.",
    "sessions": "Count of workouts logged in Hevy. These are separate from WHOOP workouts and must not be added to them.",
    "minutes": "Summed elapsed workout time, including rests, from logged start and end times. A missing or invalid duration makes the daily total unknown.",
    "working_sets": "Count of logged normal, dropset, and failure sets across all exercises. Warmup sets are excluded; this is a log count, not a physiological workload score.",
    "volume_kg": "External-load volume sums logged weight in kilograms times repetitions for normal, dropset, and failure sets in exercises classified by Hevy as weight_reps. Warmup, bodyweight, assisted, timed, and distance exercises are excluded. No body mass or unlogged load is estimated.",
    "missing": "Zero means no logged activity or no eligible sets that day. Null means a required value or exercise classification is missing or invalid. A failed refresh preserves the last successful snapshot.",
}


class PublishError(Exception):
    """A safe error message suitable for status output without source values."""


def exact_keys(value, expected, label):
    if not isinstance(value, dict) or set(value) != expected:
        raise PublishError(f"Unexpected {label} fields")


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise PublishError("Invalid calendar date")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise PublishError("Invalid calendar date") from None


def timestamp(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value):
        raise PublishError("Invalid generated_at timestamp")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise PublishError("Invalid generated_at timestamp") from None


def validate_lifting_snapshot(snapshot, now=None):
    exact_keys(snapshot, LIFTING_TOP_KEYS, "lifting snapshot")
    if type(snapshot["schema_version"]) is not int or snapshot["schema_version"] != 1:
        raise PublishError("Unsupported lifting schema version")
    generated = timestamp(snapshot["generated_at"])
    now = now or datetime.now(timezone.utc)
    if generated > now + timedelta(minutes=15) or generated.year < 2010:
        raise PublishError("Snapshot generation timestamp is outside safe bounds")
    if snapshot["timezone"] != "America/Toronto" or snapshot["methodology"] != LIFTING_METHODOLOGY:
        raise PublishError("Unreviewed lifting metadata")
    rows = snapshot["daily"]
    if not isinstance(rows, list) or len(rows) > MAX_DAYS:
        raise PublishError("Lifting history exceeds its bounds")
    dates = []
    for row in rows:
        exact_keys(row, {"date", *LIFTING_RANGES}, "lifting daily")
        day = valid_date(row["date"])
        if day < date(2010, 1, 1) or day > generated.date() + timedelta(days=1):
            raise PublishError("Observation date is outside safe bounds")
        dates.append(day)
        for key, (lower, upper) in LIFTING_RANGES.items():
            value = row[key]
            if value is None and key != "sessions":
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lower <= value <= upper:
                raise PublishError("Lifting metrics must be bounded numbers or permitted nulls")
            if key in ("sessions", "working_sets") and value != int(value):
                raise PublishError("Lifting counts must be whole numbers")
        if row["sessions"] == 0 and any(row[key] != 0 for key in ("minutes", "working_sets", "volume_kg")):
            raise PublishError("A day without logged sessions must have zero totals")
    if dates != sorted(set(dates)):
        raise PublishError("Daily dates must be unique and sorted")
    coverage = snapshot["coverage"]
    exact_keys(coverage, {"first_date", "last_date", "days"}, "coverage")
    if not dates:
        if coverage != {"first_date": None, "last_date": None, "days": 0} or type(coverage["days"]) is not int:
            raise PublishError("Empty lifting coverage is invalid")
    elif (coverage["first_date"] != dates[0].isoformat() or coverage["last_date"] != dates[-1].isoformat()
          or type(coverage["days"]) is not int or coverage["days"] != len(rows)
          or len(rows) != (dates[-1] - dates[0]).days + 1):
        raise PublishError("Coverage does not match lifting history")
    return generated


def destination(dataset):
    if dataset not in DESTINATIONS:
        raise PublishError("Unknown public dataset")
    return DESTINATIONS[dataset]


def validate_snapshot(snapshot, now=None, dataset="health"):
    destination(dataset)
    if dataset == "lifting":
        return validate_lifting_snapshot(snapshot, now)
    exact_keys(snapshot, TOP_KEYS, "snapshot")
    if type(snapshot["schema_version"]) is not int or snapshot["schema_version"] != 1:
        raise PublishError("Unsupported public schema version")
    generated = timestamp(snapshot["generated_at"])
    now = now or datetime.now(timezone.utc)
    if generated > now + timedelta(minutes=15) or generated.year < 2010:
        raise PublishError("Snapshot generation timestamp is outside safe bounds")
    if snapshot["timezone"] != "recorded local offset":
        raise PublishError("Unexpected timezone metadata")
    if snapshot["unavailable"] != UNAVAILABLE or snapshot["methodology"] != METHODOLOGY:
        raise PublishError("Unreviewed public metadata text")
    quality = snapshot["quality"]
    if not isinstance(quality, dict) or not set(quality).issubset(QUALITY_KEYS):
        raise PublishError("Unexpected quality metadata")
    if any(type(value) is not int or not 0 <= value <= 1_000_000 for value in quality.values()):
        raise PublishError("Invalid quality counts")
    rows = snapshot["daily"]
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_DAYS:
        raise PublishError("Snapshot must contain a bounded nonempty daily history")
    dates = []
    for row in rows:
        exact_keys(row, DAILY_KEYS, "daily")
        day = valid_date(row["date"])
        if day < date(2010, 1, 1) or day > generated.date() + timedelta(days=1):
            raise PublishError("Observation date is outside safe bounds")
        dates.append(day)
        for key in ("sleep_state", "recovery_state", "cycle_state"):
            if not isinstance(row[key], str) or row[key] not in STATES:
                raise PublishError("Invalid measurement state")
        if row["cycle_complete"] is not None and type(row["cycle_complete"]) is not bool:
            raise PublishError("Invalid cycle completion state")
        for key, (lower, upper) in RANGES.items():
            value = row[key]
            if value is None:
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)) or (isinstance(value, float) and not math.isfinite(value)):
                raise PublishError("Public metrics must be finite numbers or null")
            if not lower <= value <= upper:
                raise PublishError("Public metric is outside safe bounds")
            if key in ("workouts", "steps") and value != int(value):
                raise PublishError("Counts must be whole numbers")
    if dates != sorted(set(dates)):
        raise PublishError("Daily dates must be unique and sorted")
    coverage = snapshot["coverage"]
    exact_keys(coverage, {"first_date", "last_date", "days"}, "coverage")
    if (coverage["first_date"] != dates[0].isoformat()
            or coverage["last_date"] != dates[-1].isoformat()
            or type(coverage["days"]) is not int or coverage["days"] != len(rows)):
        raise PublishError("Coverage does not match daily history")
    if len(rows) != (dates[-1] - dates[0]).days + 1:
        raise PublishError("Daily history must retain missing dates as rows")
    return generated


def _no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise PublishError("Duplicate JSON field")
        result[key] = value
    return result


def decode_snapshot(raw, dataset="health"):
    if len(raw) > MAX_BYTES:
        raise PublishError("Snapshot exceeds size limit")
    try:
        snapshot = json.loads(raw, object_pairs_hook=_no_duplicate_keys)
    except (ValueError, UnicodeError, RecursionError):
        raise PublishError("Snapshot is not valid JSON") from None
    validate_snapshot(snapshot, dataset=dataset)
    return snapshot


def read_snapshot(path, dataset="health"):
    try:
        with path.open("rb") as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise PublishError("Snapshot must be a regular file")
            raw = stream.read(MAX_BYTES + 1)
    except OSError:
        raise PublishError("Cannot read snapshot") from None
    return decode_snapshot(raw, dataset)


def canonical(snapshot):
    return (json.dumps(snapshot, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


@contextmanager
def publish_lock(cache=CACHE):
    cache.mkdir(mode=0o700, parents=True, exist_ok=True)
    if cache.is_symlink() or not cache.is_dir():
        raise PublishError("Publish cache must be a private real directory")
    os.chmod(cache, 0o700)
    fd = os.open(cache / "publish.lock", os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600)
    try:
        os.fchmod(fd, 0o600)
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def gh_api(method, endpoint, input_path=None):
    command = ["gh", "api", "--include", "--method", method, endpoint,
               "--header", "Accept: application/vnd.github+json"]
    if input_path is not None:
        command += ["--input", str(input_path)]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=90, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise PublishError("GitHub request failed or timed out") from None
    raw = result.stdout.replace("\r\n", "\n")
    headers, separator, body = raw.partition("\n\n")
    first = headers.split("\n", 1)[0]
    match = re.fullmatch(r"HTTP/\S+ (\d{3})(?: .*)?", first)
    if not match or not separator:
        raise PublishError("GitHub returned an unreadable response")
    status = int(match.group(1))
    if status not in (200, 201, 404, 409):
        raise PublishError(f"GitHub request failed with HTTP {status}")
    if status in (404, 409):
        return status, None
    if result.returncode != 0:
        raise PublishError("GitHub command failed")
    try:
        data = json.loads(body)
    except (ValueError, RecursionError):
        raise PublishError("GitHub returned invalid JSON") from None
    return status, data


def read_remote(dataset="health"):
    target = destination(dataset)
    endpoint = f"repos/{REPOSITORY}/contents/{target}"
    status, result = gh_api("GET", endpoint + "?ref=" + BRANCH)
    if status == 404:
        return None, None
    if status != 200 or not isinstance(result, dict):
        raise PublishError("Cannot inspect current public snapshot")
    if (result.get("type") != "file" or result.get("encoding") != "base64"
            or result.get("path") != target
            or not re.fullmatch(r"[0-9a-f]{40}", str(result.get("sha", "")))
            or not isinstance(result.get("content"), str)):
        raise PublishError("Unexpected public file response")
    content = "".join(result["content"].split())
    if len(content) > (MAX_BYTES + 2) // 3 * 4:
        raise PublishError("Remote snapshot exceeds size limit")
    try:
        raw = base64.b64decode(content, validate=True)
    except (ValueError, binascii.Error):
        raise PublishError("Remote snapshot encoding is invalid") from None
    return decode_snapshot(raw, dataset), result["sha"]


def publish(snapshot, *, enabled=False, cache=CACHE, dataset="health"):
    target = destination(dataset)
    endpoint = f"repos/{REPOSITORY}/contents/{target}"
    generated = validate_snapshot(snapshot, dataset=dataset)
    content = canonical(snapshot)
    if len(content) > MAX_BYTES:
        raise PublishError("Snapshot exceeds size limit")
    with publish_lock(cache):
        for attempt in range(2):
            previous, sha = read_remote(dataset)
            if previous is not None:
                previous_time = timestamp(previous["generated_at"])
                if generated < previous_time:
                    raise PublishError("Refusing to replace a newer public snapshot")
                if generated == previous_time:
                    if canonical(previous) != content:
                        raise PublishError("Conflicting snapshots share a generation timestamp")
                    return {"published": False, "reason": "already_current", "commit": None,
                            "generated_at": snapshot["generated_at"]}
            if not enabled:
                return {"published": False, "would_publish": True, "reason": "dry_run", "commit": None,
                        "generated_at": snapshot["generated_at"]}
            label = "WHOOP health" if dataset == "health" else "Hevy lifting"
            request = {"message": f"Update public {label} snapshot", "branch": BRANCH,
                       "content": base64.b64encode(content).decode("ascii")}
            if sha:
                request["sha"] = sha
            fd, filename = tempfile.mkstemp(prefix=".publish-", suffix=".json", dir=cache)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    os.fchmod(stream.fileno(), 0o600)
                    json.dump(request, stream)
                status, result = gh_api("PUT", endpoint, Path(filename))
            finally:
                Path(filename).unlink(missing_ok=True)
            if status == 409 and attempt == 0:
                continue
            if status not in (200, 201) or not isinstance(result, dict):
                raise PublishError("GitHub did not accept the snapshot update")
            commit_data = result.get("commit")
            commit = commit_data.get("sha") if isinstance(commit_data, dict) else None
            if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
                raise PublishError("GitHub update response did not contain a commit")
            return {"published": True, "commit": commit, "generated_at": snapshot["generated_at"]}
    raise PublishError("Snapshot publication failed")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", choices=tuple(DESTINATIONS), default="health")
    parser.add_argument("--snapshot", required=True, type=Path)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Inspect without writing (default)")
    mode.add_argument("--publish", action="store_true", help="Publish the validated snapshot to the fixed public destination")
    args = parser.parse_args(argv)
    try:
        result = publish(read_snapshot(args.snapshot, args.dataset), enabled=args.publish, dataset=args.dataset)
    except PublishError as exc:
        result = {"published": False, "error": str(exc)}
        print(json.dumps(result, sort_keys=True))
        return 1
    except (OSError, ValueError, TypeError, OverflowError):
        print(json.dumps({"published": False, "error": "Local publication validation or storage failed"}))
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
