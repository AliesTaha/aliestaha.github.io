"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDaily, selectRange, metricSummary, splitSegments, publicationState, validDate, formatChange } = require("../assets/js/health.js");

test("range windows use calendar days, not the count of received measurements", () => {
  const rows = normalizeDaily([
    { date: "2025-09-29", hrv_ms: 30 }, { date: "2026-08-31", hrv_ms: 31 },
    { date: "2026-09-22", hrv_ms: 40 }, { date: "2026-09-23", hrv_ms: 42 }, { date: "2026-09-29", hrv_ms: 45 }
  ]);
  assert.equal(selectRange(rows, "D").rows.length, 1);
  assert.equal(selectRange(rows, "W").start, "2026-09-23");
  assert.equal(selectRange(rows, "W").rows.length, 2);
  assert.equal(selectRange(rows, "M").start, "2026-08-31");
  assert.equal(selectRange(rows, "M").rows.length, 4);
  assert.equal(selectRange(rows, "Y").start, "2025-09-30");
  assert.equal(selectRange(rows, "Y").rows.length, 4);
  assert.equal(selectRange(rows, "ALL").rows.length, 5);
});

test("missing values and absent dates break chart paths without dropping real zeroes", () => {
  const rows = normalizeDaily([
    { date: "2026-09-20", strain: 0 }, { date: "2026-09-21", strain: 3 },
    { date: "2026-09-22", strain: null }, { date: "2026-09-23", strain: 4 },
    { date: "2026-09-25", strain: 7 }, { date: "2026-09-26", strain: 8 }
  ]);
  assert.deepEqual(splitSegments(rows, "strain").map(segment => segment.map(row => row.strain)), [[0, 3], [4], [7, 8]]);
  const summary = metricSummary(rows, "strain");
  assert.equal(summary.count, 5);
  assert.equal(summary.min, 0);
  assert.equal(summary.mean, 4.4);
  assert.equal(summary.change, 8);
});

test("empty and single-observation windows do not invent a trend", () => {
  const empty = metricSummary([{ date: "2026-09-29", hrv_ms: null }], "hrv_ms");
  assert.equal(empty.count, 0);
  assert.equal(empty.mean, null);
  const single = metricSummary([{ date: "2026-09-29", hrv_ms: 42 }], "hrv_ms");
  assert.equal(single.mean, 42);
  assert.equal(single.change, null);
  assert.equal(splitSegments([{ date: "2026-09-29", hrv_ms: 42 }], "hrv_ms")[0].length, 1);
});

test("normalization rejects duplicate dates and ignores invalid and nonnumeric measurements", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  const clean = normalizeDaily([{ date: "invalid", hrv_ms: 1 }, { date: "2026-09-29", hrv_ms: "52", recovery: 0 }]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].hrv_ms, null);
  assert.equal(clean[0].recovery, 0);
  assert.throws(() => normalizeDaily([{ date: "2026-09-29" }, { date: "2026-09-29" }]), /Duplicate/);
});

test("publication becomes stale after three hours, regardless of observation date", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  assert.equal(publicationState("2026-09-29T10:00:00Z", now).stale, false);
  assert.equal(publicationState("2026-09-29T08:59:00Z", now).stale, true);
  assert.equal(publicationState("not-a-date", now).valid, false);
  assert.equal(publicationState("not-a-date", now).stale, true);
});

test("score differences use percentage points rather than percent growth", () => {
  assert.equal(formatChange(12, "recovery"), "+12 pp");
  assert.equal(formatChange(-5, "recovery"), "-5 pp");
  assert.equal(formatChange(2, "hrv_ms"), "+2.0 ms");
  assert.equal(formatChange(null, "recovery"), "—");
});
