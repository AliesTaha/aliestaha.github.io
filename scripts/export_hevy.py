#!/usr/bin/env python3
"""Export approved daily lifting totals using the existing private Hevy connector.

Full pagination refreshes edits and deletions without a second event subsystem.
The private cache contains only fields needed for aggregation, never workout
titles or notes. Public output contains daily totals and five fixed exercises'
best contributing sets, with exercise identities pinned only in the private cache.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import tempfile
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from publish_health import (LIFTING_METHODOLOGY_V2, LIFTING_STRENGTH,
                            hevy_estimated_1rm, validate_lifting_snapshot)

ROOT = Path(__file__).resolve().parents[1]
CONNECTOR = Path.home() / ".local/share/hevy-codex/hevy_connector.py"
CACHE = Path.home() / ".local/share/hevy-codex/health-cache"
LOCAL_ZONE = ZoneInfo("America/Toronto")
WORKING_TYPES = {"normal", "dropset", "failure"}
NON_VOLUME_TYPES = {"reps_only", "bodyweight_reps", "bodyweight_assisted_reps", "duration", "weight_duration", "distance_duration", "short_distance_weight"}


class ExportError(Exception):
    """Only a fixed error category is emitted by the CLI."""


def instant(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo is not None else None
    except ValueError:
        return None


def numeric(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value) and value >= 0


def paginated(api_get, path, field, page_size):
    records = []
    pages = None
    for page in range(1, 1001):
        time.sleep(0.8)
        response = api_get(path, {"page": page, "pageSize": page_size})
        count = response.get("page_count")
        batch = response.get(field)
        if (response.get("page") != page or type(count) is not int or not 0 <= count <= 1000
                or not isinstance(batch, list) or len(batch) > page_size
                or any(not isinstance(row, dict) for row in batch)):
            raise ExportError("Invalid pagination")
        if pages is None:
            pages = count
        if count != pages or (page < pages and len(batch) != page_size):
            raise ExportError("Collection changed during pagination")
        records.extend(batch)
        if page >= pages:
            return records
    raise ExportError("Pagination limit exceeded")


def private_workout(record):
    """Immediately discard notes, names, routine IDs, and unnecessary fields."""
    try:
        identifier = str(UUID(record.get("id")))
    except (ValueError, TypeError, AttributeError):
        raise ExportError("Missing workout identity") from None
    exercises = record.get("exercises")
    clean = [] if isinstance(exercises, list) else None
    for exercise in exercises if isinstance(exercises, list) else []:
        if not isinstance(exercise, dict):
            clean.append(None)
            continue
        sets = exercise.get("sets")
        clean.append({
            "exercise_template_id": exercise.get("exercise_template_id"),
            "sets": [{key: entry.get(key) for key in ("type", "weight_kg", "reps")} if isinstance(entry, dict) else None
                     for entry in sets] if isinstance(sets, list) else None,
        })
    return {"id": identifier, "start_time": record.get("start_time"), "end_time": record.get("end_time"), "exercises": clean}


def workout_totals(workout, template_types):
    start, end = instant(workout.get("start_time")), instant(workout.get("end_time"))
    minutes = (end - start).total_seconds() / 60 if start and end and end >= start else None
    sets_total, volume = 0, 0.0
    sets_known = volume_known = True
    exercises = workout.get("exercises")
    if not isinstance(exercises, list):
        return minutes, None, None
    for exercise in exercises:
        if not isinstance(exercise, dict) or not isinstance(exercise.get("sets"), list):
            sets_known = volume_known = False
            continue
        exercise_type = template_types.get(str(exercise.get("exercise_template_id")))
        for entry in exercise["sets"]:
            if not isinstance(entry, dict):
                sets_known = volume_known = False
                continue
            kind = entry.get("type")
            if kind == "warmup":
                continue
            if kind not in WORKING_TYPES:
                sets_known = volume_known = False
                continue
            sets_total += 1
            if exercise_type in NON_VOLUME_TYPES:
                continue
            if exercise_type != "weight_reps":
                volume_known = False
                continue
            weight, reps = entry.get("weight_kg"), entry.get("reps")
            if not numeric(weight) or not numeric(reps) or reps != int(reps):
                volume_known = False
                continue
            volume += weight * reps
    return minutes, sets_total if sets_known else None, volume if volume_known else None


def select_strength_templates(catalog, previous=None):
    """Pin one exact template per family; never silently switch variants."""
    previous = previous or {}
    if not isinstance(previous, dict) or not set(previous).issubset({item["key"] for item in LIFTING_STRENGTH}):
        raise ExportError("Invalid private strength selection")
    selected = {}
    for exercise in LIFTING_STRENGTH:
        key = exercise["key"]
        kind = "reps_only" if exercise["unit"] == "reps" else "weight_reps"
        expected = {"title": exercise["variant"], "type": kind}
        identifier = previous.get(key)
        if identifier is not None:
            if not isinstance(identifier, str) or catalog.get(identifier) != expected:
                raise ExportError("A pinned strength exercise changed classification or name")
            selected[key] = identifier
            continue
        matches = [identifier for identifier, metadata in catalog.items() if metadata == expected]
        if len(matches) > 1:
            raise ExportError("Strength exercise selection is ambiguous")
        if matches:
            selected[key] = matches[0]
    return selected


def strength_history(workouts, selected):
    histories = {exercise["key"]: {} for exercise in LIFTING_STRENGTH}
    definitions = {selected[item["key"]]: item for item in LIFTING_STRENGTH if item["key"] in selected}
    for workout in workouts:
        day = instant(workout.get("start_time")).astimezone(LOCAL_ZONE).date().isoformat()
        exercises = workout.get("exercises")
        for exercise in exercises if isinstance(exercises, list) else []:
            if not isinstance(exercise, dict):
                continue
            definition = definitions.get(exercise.get("exercise_template_id"))
            if definition is None:
                continue
            history = histories[definition["key"]]
            history.setdefault(day, {"date": day, "value": None, "weight_kg": None, "reps": None})
            sets = exercise.get("sets")
            for entry in sets if isinstance(sets, list) else []:
                if not isinstance(entry, dict) or entry.get("type") not in WORKING_TYPES:
                    continue
                reps, weight = entry.get("reps"), entry.get("weight_kg")
                if not numeric(reps) or not 1 <= reps <= 10_000 or reps != int(reps):
                    continue
                reps = int(reps)
                if definition["unit"] == "reps":
                    # A newly logged added load cannot masquerade as bodyweight progress.
                    if weight is not None and (not numeric(weight) or weight != 0):
                        continue
                    value, weight = reps, None
                else:
                    if not numeric(weight) or not 0 < weight <= 10_000:
                        continue
                    value = hevy_estimated_1rm(weight, reps)
                candidate = {"date": day, "value": value, "weight_kg": weight, "reps": reps}
                current = history[day]
                rank = (value, weight or 0, reps)
                current_rank = (current["value"] or 0, current["weight_kg"] or 0, current["reps"] or 0)
                if rank > current_rank:
                    history[day] = candidate
    return [{**exercise, "series": [histories[exercise["key"]][day] for day in sorted(histories[exercise["key"]])]}
            for exercise in LIFTING_STRENGTH]


def normalize(workouts, template_types, fetched_at, selected):
    days = defaultdict(list)
    today = fetched_at.astimezone(LOCAL_ZONE).date()
    for workout in workouts:
        start = instant(workout.get("start_time"))
        if start is None:
            raise ExportError("A session has no usable local date")
        day = start.astimezone(LOCAL_ZONE).date()
        if day.year < 2010 or day > today:
            raise ExportError("A session date is outside supported coverage")
        days[day].append(workout_totals(workout, template_types))
    rows = []
    if days:
        day = min(days)
        while day <= today:
            values = days.get(day, [])
            row = {"date": day.isoformat(), "sessions": len(values)}
            for index, key in enumerate(("minutes", "working_sets", "volume_kg")):
                measurements = [item[index] for item in values]
                row[key] = round(sum(measurements), 2) if all(value is not None for value in measurements) else None
            rows.append(row)
            day += timedelta(days=1)
    else:
        rows.append({"date": today.isoformat(), "sessions": 0, "minutes": 0, "working_sets": 0, "volume_kg": 0})
    payload = {
        "schema_version": 2,
        "generated_at": fetched_at.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "timezone": "America/Toronto",
        "coverage": {"first_date": rows[0]["date"] if rows else None, "last_date": rows[-1]["date"] if rows else None, "days": len(rows)},
        "daily": rows,
        "methodology": LIFTING_METHODOLOGY_V2,
        "strength": strength_history(workouts, selected),
    }
    validate_lifting_snapshot(payload)
    return payload


def write_json(path, payload, private=False):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700 if private else 0o755)
    if path.is_symlink() or path.parent.is_symlink():
        raise ExportError("Output must not be a symlink")
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
        Path(temporary).unlink(missing_ok=True)


def run(output, offline=False):
    if CACHE.is_symlink() or ROOT == CACHE.resolve() or ROOT in CACHE.resolve().parents:
        raise ExportError("Private cache location is invalid")
    CACHE.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(CACHE, 0o700)
    cached = CACHE / "history.json"
    if cached.is_symlink():
        raise ExportError("Private cache must not be a symlink")
    private = json.loads(cached.read_text()) if cached.exists() else {}
    if offline:
        fetched_at = instant(private.get("fetched_at"))
        if fetched_at is None:
            raise ExportError("Cached collection has no refresh timestamp")
        workouts, template_types = private["workouts"], private["template_types"]
        catalog = private["template_catalog"]
    else:
        spec = importlib.util.spec_from_file_location("local_hevy_connector", CONNECTOR)
        if not spec or not spec.loader:
            raise ExportError("Local connector is unavailable")
        connector = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(connector)
        initial_count = connector.api_get("/v1/workouts/count")["workout_count"]
        workouts = [private_workout(record) for record in paginated(connector.api_get, "/v1/workouts", "workouts", 10)]
        identifiers = {record["id"] for record in workouts}
        if len(identifiers) != len(workouts) or len(workouts) != initial_count:
            raise ExportError("Workout collection changed during export")
        templates = paginated(connector.api_get, "/v1/exercise_templates", "exercise_templates", 100)
        template_types = {str(record["id"]): record.get("type") for record in templates if isinstance(record.get("id"), str)}
        catalog = {record["id"]: {"title": record.get("title"), "type": record.get("type")}
                   for record in templates if isinstance(record.get("id"), str)}
        time.sleep(0.8)
        if connector.api_get("/v1/workouts/count")["workout_count"] != initial_count:
            raise ExportError("Workout collection changed during export")
        fetched_at = datetime.now(timezone.utc)
    selected = select_strength_templates(catalog, private.get("strength_template_ids"))
    payload = normalize(workouts, template_types, fetched_at, selected)
    if not offline:
        write_json(cached, {"fetched_at": fetched_at.isoformat(), "workouts": workouts,
                           "template_types": template_types, "template_catalog": catalog,
                           "strength_template_ids": selected}, private=True)
    write_json(output, payload)
    return {"exported": True, "dataset": "lifting", "schema_version": 2,
            "generated_at": payload["generated_at"], "coverage": payload["coverage"], "sessions": len(workouts),
            "days_with_unknown_volume": sum(row["volume_kg"] is None for row in payload["daily"]),
            "strength_observations": {item["key"]: len(item["series"]) for item in payload["strength"]}}


def failure_code(error):
    code = getattr(error, "code", None)
    if code in {"not_configured", "credential_storage", "invalid_key", "auth_failed"}:
        return "hevy_auth_failed"
    if code == "rate_limited":
        return "hevy_rate_limited"
    if code in {"timeout", "network_unavailable"}:
        return "network_unavailable"
    if code == "unavailable":
        return "hevy_unavailable"
    return "hevy_export_failed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "assets/data/lifting.json")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    try:
        result = run(args.output, args.offline)
    except Exception as error:
        print(json.dumps({"exported": False, "error": {"code": failure_code(error)}}))
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
