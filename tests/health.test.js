"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { METRICS, normalizeDaily, selectRange, metricSummary, splitSegments, publicationState, validDate, cardModels } = require("../assets/js/health.js");

test("week, month, and all windows use calendar days, not received record counts", () => {
  const rows = normalizeDaily([
    { date: "2026-08-01", recovery: 30 }, { date: "2026-08-31", recovery: 31 },
    { date: "2026-09-22", recovery: 40 }, { date: "2026-09-23", recovery: 42 }, { date: "2026-09-29", recovery: 45 }
  ]);
  assert.equal(selectRange(rows, "W").start, "2026-09-23");
  assert.equal(selectRange(rows, "W").rows.length, 2);
  assert.equal(selectRange(rows, "M").start, "2026-08-31");
  assert.equal(selectRange(rows, "M").rows.length, 4);
  assert.equal(selectRange(rows, "ALL").rows.length, 5);
  assert.throws(() => selectRange(rows, "D"), /Unknown chart range/);
  assert.throws(() => selectRange(rows, "Y"), /Unknown chart range/);
});

test("all five cards use the selected range mean, excluding null and including genuine zero", () => {
  const values = [
    ["2026-08-01", 10], ["2026-09-01", 8], ["2026-09-23", 4], ["2026-09-24", null], ["2026-09-29", 0]
  ];
  const rows = normalizeDaily(values.map(([date, value]) => ({ date,
    sleep_performance: value === null ? null : value * 10,
    recovery: value === null ? null : value * 8,
    strain: value,
    workout_minutes: value === null ? null : value * 6,
    steps: value === null ? null : value * 1000
  })));
  const multipliers = { sleep_performance: 10, recovery: 8, strain: 1, workout_minutes: 6, steps: 1000 };
  assert.deepEqual(Object.keys(METRICS), Object.keys(multipliers));
  for (const [range, expected, count] of [["W", 2, 2], ["M", 4, 3], ["ALL", 5.5, 4]]) {
    const cards = cardModels(selectRange(rows, range).rows);
    assert.equal(cards.length, 5);
    for (const card of cards) {
      assert.equal(card.value, expected * multipliers[card.key], `${range} ${card.key} mean`);
      assert.equal(card.summary.count, count);
      assert.equal(card.detail, `Average · ${count} days`);
    }
  }
});

test("missing measurements and absent dates break paths while zero remains a plotted point", () => {
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
});

test("empty and single-day card models do not invent observations or trends", () => {
  const rows = normalizeDaily([{ date: "2026-09-29", sleep_performance: 72, recovery: null, strain: 0 }]);
  const cards = new Map(cardModels(rows).map(card => [card.key, card]));
  assert.equal(cards.get("recovery").value, null);
  assert.equal(cards.get("recovery").detail, "No observations");
  assert.equal(cards.get("sleep_performance").value, 72);
  assert.equal(cards.get("sleep_performance").detail, "Average · 1 day");
  assert.equal(cards.get("strain").value, 0);
  assert.equal(splitSegments(rows, "sleep_performance")[0].length, 1);
  assert.equal(splitSegments(rows, "recovery").length, 0);
});

test("only strain and steps flag observed values from an ongoing physiological cycle", () => {
  const cards = new Map(cardModels(normalizeDaily([{ date: "2026-09-29", cycle_complete: false,
    sleep_performance: 70, recovery: 60, strain: 4, workout_minutes: 0, steps: 2000
  }])).map(card => [card.key, card]));
  assert.match(cards.get("strain").detail, /ongoing cycle/);
  assert.match(cards.get("steps").detail, /ongoing cycle/);
  for (const key of ["sleep_performance", "recovery", "workout_minutes"]) assert.doesNotMatch(cards.get(key).detail, /ongoing cycle/);
});

test("normalization rejects duplicate dates and ignores invalid and nonnumeric measurements", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  const clean = normalizeDaily([{ date: "invalid", strain: 1 }, { date: "2026-09-29", steps: "52", recovery: 0, hrv_ms: 100 }]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].steps, null);
  assert.equal(clean[0].recovery, 0);
  assert.equal(Object.hasOwn(clean[0], "hrv_ms"), false);
  assert.throws(() => normalizeDaily([{ date: "2026-09-29" }, { date: "2026-09-29" }]), /Duplicate/);
});

test("publication becomes stale after three hours independently of the observation dates", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  assert.equal(publicationState("2026-09-29T10:00:00Z", now).stale, false);
  assert.equal(publicationState("2026-09-29T08:59:00Z", now).stale, true);
  assert.equal(publicationState("not-a-date", now).valid, false);
  assert.equal(publicationState("not-a-date", now).stale, true);
});
