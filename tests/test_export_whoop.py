"""Behavioral tests use invented records; no personal WHOOP data is needed."""
import copy
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location("export_whoop", Path(__file__).parents[1] / "scripts/export_whoop.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def cycle(identifier=1, start="2026-09-28T11:00:00Z", end="2026-09-29T11:00:00Z", **extra):
    return dict(id=identifier, start=start, end=end, timezone_offset="-04:00", score_state="SCORED", score={"strain": 10, "average_heart_rate": 75, "max_heart_rate": 180, "kilojoule": 4184}, **extra)


def sleep(identifier="sleep-1", end="2026-09-28T11:00:00Z", nap=False):
    return {"id": identifier, "cycle_id": 1, "start": "2026-09-28T02:00:00Z", "end": end,
            "timezone_offset": "-04:00", "nap": nap, "score_state": "SCORED",
            "score": {"stage_summary": {"total_light_sleep_time_milli": 3 * 3600000,
                       "total_slow_wave_sleep_time_milli": 2 * 3600000,
                       "total_rem_sleep_time_milli": 3600000,
                       "total_in_bed_time_milli": 9 * 3600000,
                       "total_awake_time_milli": 2 * 3600000,
                       "total_no_data_time_milli": 3600000},
                       "sleep_performance_percentage": 85}}


def normalize(**collections):
    return exporter.normalize(collections, datetime(2026, 9, 30, tzinfo=timezone.utc))


class AttributionTests(unittest.TestCase):
    def test_midnight_is_attributed_to_recorded_offset(self):
        record = cycle(start="2026-09-29T02:00:00Z")
        self.assertEqual(exporter.local_day(record), "2026-09-28")
        record["timezone_offset"] = "+05:30"
        self.assertEqual(exporter.local_day(record), "2026-09-29")
        record["timezone_offset"] = None
        self.assertIsNone(exporter.local_day(record))
        record["timezone_offset"] = "Z"
        self.assertEqual(exporter.local_day(record), "2026-09-29")

    def test_cross_midnight_cycle_recovery_and_sleep_share_wake_day(self):
        c = cycle(start="2026-09-28T03:00:00Z")  # September 27 at 23:00 local
        s = sleep(end="2026-09-28T11:00:00Z")
        s["start"] = c["start"]
        r = {"cycle_id": 1, "sleep_id": "sleep-1", "score_state": "SCORED", "score": {"hrv_rmssd_milli": 64.5}}
        result = normalize(cycles=[c], sleeps=[s], recoveries=[r])
        self.assertEqual(result["coverage"], {"first_date": "2026-09-28", "last_date": "2026-09-28", "days": 1})
        row = result["daily"][0]
        self.assertEqual(row["sleep_hours"], 6)
        self.assertEqual(row["hrv_ms"], 64.5)
        self.assertEqual(row["strain"], 10)

    def test_cycle_uses_recovery_sleep_id_when_sleep_cycle_id_missing(self):
        c = cycle(start="2026-09-28T03:00:00Z")
        s = sleep()
        del s["cycle_id"]
        r = {"cycle_id": 1, "sleep_id": "sleep-1", "score_state": "SCORED", "score": {}}
        result = normalize(cycles=[c], sleeps=[s], recoveries=[r])
        self.assertEqual(result["coverage"]["first_date"], "2026-09-28")
        self.assertEqual(result["daily"][0]["strain"], 10)

    def test_sleep_wake_day_and_recovery_cycle_join_not_creation_day(self):
        c = cycle(start="2026-09-28T11:00:00Z")
        r = {"cycle_id": 1, "created_at": "2026-09-29T02:00:00Z", "score_state": "SCORED", "score": {"hrv_rmssd_milli": 64.5, "recovery_score": 83}}
        result = normalize(cycles=[c], recoveries=[r], sleeps=[sleep()])
        self.assertEqual(result["coverage"]["days"], 1)
        row = result["daily"][0]
        self.assertEqual(row["date"], "2026-09-28")
        self.assertEqual(row["sleep_hours"], 6)
        self.assertEqual(row["hrv_ms"], 64.5)

    def test_multiple_cycles_choose_latest_instead_of_summing_strain(self):
        earlier, later = cycle(), cycle(identifier=2, start="2026-09-28T15:00:00Z", end=None)
        later["score"]["strain"] = 5
        result = normalize(cycles=[earlier, later])
        self.assertEqual(result["daily"][0]["strain"], 5)
        self.assertFalse(result["daily"][0]["cycle_complete"])
        self.assertEqual(result["quality"]["days_with_multiple_cycles"], 1)

    def test_unpaired_later_cycle_cannot_replace_sleep_recovery_pair(self):
        earlier, later = cycle(), cycle(identifier=2, start="2026-09-28T15:00:00Z", end=None)
        later["score"]["strain"] = 5
        r = {"cycle_id": 1, "sleep_id": "sleep-1", "score_state": "SCORED", "score": {"hrv_rmssd_milli": 64.5}}
        result = normalize(cycles=[earlier, later], sleeps=[sleep()], recoveries=[r])
        row = result["daily"][0]
        self.assertEqual(row["strain"], 10)
        self.assertEqual(row["hrv_ms"], 64.5)
        self.assertEqual(row["sleep_hours"], 6)

    def test_calendar_gaps_are_present_as_null(self):
        result = normalize(cycles=[cycle(), cycle(identifier=2, start="2026-09-30T11:00:00Z")])
        self.assertEqual(len(result["daily"]), 3)
        self.assertIsNone(result["daily"][1]["strain"])
        self.assertEqual(result["daily"][1]["cycle_state"], "MISSING")


class MeasurementTests(unittest.TestCase):
    def test_no_data_is_never_counted_as_sleep(self):
        row = normalize(sleeps=[sleep()])["daily"][0]
        self.assertEqual(row["sleep_hours"], 6)
        self.assertEqual(row["sleep_no_data_hours"], 1)
        self.assertNotEqual(row["sleep_hours"], 9 - 2)

    def test_missing_sleep_stage_keeps_total_unknown(self):
        record = sleep()
        del record["score"]["stage_summary"]["total_rem_sleep_time_milli"]
        row = normalize(sleeps=[record])["daily"][0]
        self.assertIsNone(row["sleep_hours"])
        self.assertIsNone(row["rem_hours"])
        self.assertEqual(row["deep_hours"], 2)

    def test_pending_scores_never_expose_stale_numeric_score(self):
        record = sleep()
        record["score_state"] = "PENDING_SCORE"
        row = normalize(sleeps=[record])["daily"][0]
        self.assertEqual(row["sleep_state"], "PENDING_SCORE")
        self.assertIsNone(row["sleep_hours"])
        self.assertIsNone(row["sleep_performance"])

    def test_unscorable_recovery_is_null(self):
        r = {"cycle_id": 1, "score_state": "UNSCORABLE", "score": {"hrv_rmssd_milli": 999}}
        row = normalize(cycles=[cycle()], recoveries=[r])["daily"][0]
        self.assertIsNone(row["hrv_ms"])
        self.assertEqual(row["recovery_state"], "UNSCORABLE")

    def test_naps_separate_from_main_sleep_and_incomplete_nap_unknown(self):
        nap = sleep("nap", nap=True)
        row = normalize(sleeps=[sleep(), nap])["daily"][0]
        self.assertEqual(row["sleep_hours"], 6)
        self.assertEqual(row["nap_hours"], 6)
        nap["score_state"] = "UNSCORABLE"
        row = normalize(sleeps=[sleep(), nap])["daily"][0]
        self.assertIsNone(row["nap_hours"])

    def test_energy_conversion_steps_and_null_values(self):
        row = normalize(cycles=[cycle(step_count=1234)])["daily"][0]
        self.assertEqual(row["energy_kcal"], 1000)
        self.assertEqual(row["steps"], 1234)
        self.assertIsNone(row["hrv_ms"])

    def test_workouts_zero_vs_unknown_duration(self):
        c = cycle()
        row = normalize(cycles=[c])["daily"][0]
        self.assertEqual(row["workouts"], 0)
        self.assertEqual(row["workout_minutes"], 0)
        w = {"id": "workout", "start": "2026-09-28T15:00:00Z", "end": None, "timezone_offset": "-04:00"}
        row = normalize(cycles=[c], workouts=[w])["daily"][0]
        self.assertEqual(row["workouts"], 1)
        self.assertIsNone(row["workout_minutes"])


class PrivacyAndSyncTests(unittest.TestCase):
    def test_no_private_api_fields_or_identifiers_leak(self):
        record = cycle(user_id="PRIVATE_USER_ID", email="private@example.test", access_token="PRIVATE_TOKEN", location="PRIVATE_LOCATION")
        result = normalize(cycles=[record])
        encoded = json.dumps(result)
        for private in ("PRIVATE_USER_ID", "private@example.test", "PRIVATE_TOKEN", "PRIVATE_LOCATION", "2026-09-28T11:00:00Z", '"user_id"', '"id"', '"start"', '"end"'):
            self.assertNotIn(private, encoded)
        self.assertEqual(set(result["daily"][0]), exporter.DAILY_KEYS)
        result["daily"][0]["access_token"] = "unexpected"
        with self.assertRaises(ValueError):
            exporter.validate_public(result)

    def test_complete_pagination_and_parameter_spelling(self):
        calls = []
        def get(path, params):
            calls.append((path, params))
            return {"records": [{"id": len(calls)}], "next_token": "cursor" if len(calls) == 1 else None}
        rows = exporter.fetch_pages(get, "/v2/cycle", "2026-09-01T00:00:00Z", pause=lambda _: None)
        self.assertEqual(len(rows), 2)
        self.assertEqual(calls[0][1]["limit"], 25)
        self.assertEqual(calls[1][1]["nextToken"], "cursor")
        self.assertEqual(calls[1][1]["start"], "2026-09-01T00:00:00Z")

    def test_pagination_loop_fails_instead_of_partial_success(self):
        with self.assertRaises(RuntimeError):
            exporter.fetch_pages(lambda *_: {"records": [], "next_token": "repeat"}, "/v2/cycle", pause=lambda _: None)

    def test_recent_merge_handles_deletions_and_rescores(self):
        ancient = cycle(1, "2026-01-01T12:00:00Z", "2026-01-02T12:00:00Z")
        deleted, changed = cycle(2), cycle(3)
        updated = copy.deepcopy(changed)
        updated["score"]["strain"] = 14
        old = [ancient, deleted, changed]
        rows = exporter.merge_recent(old, [updated], "cycles", datetime(2026, 9, 1, tzinfo=timezone.utc), {"cycles": old})
        self.assertEqual({r["id"] for r in rows}, {1, 3})
        self.assertEqual(next(r for r in rows if r["id"] == 3)["score"]["strain"], 14)

    def test_recovery_merge_uses_joined_sleep_for_window(self):
        old = {"cycle_id": 1, "sleep_id": "sleep-1", "created_at": "2026-01-01T00:00:00Z"}
        rows = exporter.merge_recent([old], [], "recoveries", datetime(2026, 9, 1, tzinfo=timezone.utc), {"sleeps": [sleep()]})
        self.assertEqual(rows, [])

    def test_private_cache_permissions(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "cache/history.json"
            exporter.atomic_json(target, {"test": "private"}, private=True)
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            self.assertEqual(target.parent.stat().st_mode & 0o777, 0o700)


if __name__ == "__main__":
    unittest.main()
