"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { METRICS, normalizeDaily, selectRange, metricSummary, splitSegments, publicationState, validDate, cardModels, heartbeatModel, nearestCalendarDay, inspectionModel, EMA_SPANS, emaSeries, emaTrend } = require("../assets/js/health.js");

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

test("five cards use range means while resting heart rate uses the latest valid reading", () => {
  const values = [
    ["2026-08-01", 10], ["2026-09-01", 8], ["2026-09-23", 4], ["2026-09-24", null], ["2026-09-29", 0]
  ];
  const rows = normalizeDaily(values.map(([date, value]) => ({ date,
    sleep_performance: value === null ? null : value * 10,
    recovery: value === null ? null : value * 8,
    strain: value,
    resting_hr: value === null ? null : value * 5,
    workout_minutes: value === null ? null : value * 6,
    steps: value === null ? null : value * 1000
  })));
  const multipliers = { sleep_performance: 10, recovery: 8, strain: 1, resting_hr: 5, workout_minutes: 6, steps: 1000 };
  assert.deepEqual(Object.keys(METRICS), Object.keys(multipliers));
  for (const [range, expected, count] of [["W", 2, 2], ["M", 4, 3], ["ALL", 5.5, 4]]) {
    const cards = cardModels(selectRange(rows, range).rows, rows);
    assert.equal(cards.length, 6);
    for (const card of cards) {
      assert.equal(card.summary.mean, expected * multipliers[card.key], `${range} ${card.key} plotted mean`);
      assert.equal(card.summary.count, count);
      if (card.key === "resting_hr") {
        assert.equal(card.value, 20, `${range} latest positive pulse`);
        assert.equal(card.detail, "Recorded · Sep 23");
      } else {
        assert.equal(card.value, expected * multipliers[card.key], `${range} ${card.key} displayed mean`);
        assert.equal(card.detail, `Average · ${count} days`);
      }
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
    sleep_performance: 70, recovery: 60, strain: 4, resting_hr: 45, workout_minutes: 0, steps: 2000
  }])).map(card => [card.key, card]));
  assert.match(cards.get("strain").detail, /ongoing cycle/);
  assert.match(cards.get("steps").detail, /ongoing cycle/);
  for (const key of ["sleep_performance", "recovery", "resting_hr", "workout_minutes"]) assert.doesNotMatch(cards.get(key).detail, /ongoing cycle/);
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

test("heartbeat period is exactly sixty divided by the unrounded recorded BPM", () => {
  for (const bpm of [67, 45, 67.25]) {
    const pulse = heartbeatModel([{ date: "2026-09-29", resting_hr: bpm }]);
    assert.equal(pulse.bpm, bpm);
    assert.equal(pulse.periodSeconds, 60 / bpm);
    const card = cardModels([{ date: "2026-09-29", resting_hr: bpm }]).find(card => card.key === "resting_hr");
    assert.equal(Number(card.displayValue), pulse.bpm);
  }
  assert.equal(heartbeatModel([{ date: "2026-09-29", resting_hr: 45 }]).periodSeconds, 4 / 3);
});

test("heartbeat follows the latest valid date in the whole history, independently of range averages", () => {
  const unsorted = [
    { date: "2026-09-29", resting_hr: 45 },
    { date: "2026-08-01", resting_hr: 60 },
    { date: "2026-09-28", resting_hr: 43 }
  ];
  const pulse = heartbeatModel(unsorted);
  assert.deepEqual(pulse, { date: "2026-09-29", bpm: 45, periodSeconds: 4 / 3 });
  const rows = normalizeDaily(unsorted);
  for (const [range, expected] of [["W", 44], ["M", 44], ["ALL", 148 / 3]]) {
    const card = cardModels(selectRange(rows, range).rows, rows).find(card => card.key === "resting_hr");
    assert.equal(card.summary.mean, expected);
    assert.equal(card.value, heartbeatModel(rows).bpm);
    assert.equal(card.value, 45);
    assert.equal(card.detail, "Recorded · Sep 29");
  }
});

test("invalid pulse records cannot animate the heart or replace an older valid record", () => {
  const invalid = [0, -1, 301, null, undefined, NaN, Infinity, "67"].map((resting_hr, index) => ({ date: `2026-09-${String(20 + index).padStart(2, "0")}`, resting_hr }));
  invalid.push({ date: "invalid", resting_hr: 67 }, { date: "2026-02-30", resting_hr: 67 });
  assert.equal(heartbeatModel(invalid), null);
  assert.equal(heartbeatModel([]), null);
  assert.deepEqual(heartbeatModel([{ date: "2026-09-01", resting_hr: 67 }, ...invalid]), { date: "2026-09-01", bpm: 67, periodSeconds: 60 / 67 });
  assert.equal(heartbeatModel([{ date: "2026-09-29", resting_hr: 300 }]).periodSeconds, .2);
});

test("the resting heart card and heartbeat are unavailable together without a valid reading", () => {
  const rows = normalizeDaily([{ date: "2026-09-29", resting_hr: 0 }, { date: "2026-09-30", resting_hr: null }]);
  const card = cardModels(rows, rows).find(card => card.key === "resting_hr");
  assert.equal(card.value, null);
  assert.equal(card.detail, "No recorded pulse");
  assert.equal(heartbeatModel(rows), null);
});

test("pointer fractions snap to calendar days and clamp at the range endpoints", () => {
  const window = { start: "2026-09-24", end: "2026-09-30" };
  assert.equal(nearestCalendarDay(window, -.5), "2026-09-24");
  assert.equal(nearestCalendarDay(window, 0), "2026-09-24");
  assert.equal(nearestCalendarDay(window, .49), "2026-09-27");
  assert.equal(nearestCalendarDay(window, .6), "2026-09-28");
  assert.equal(nearestCalendarDay(window, 1), "2026-09-30");
  assert.equal(nearestCalendarDay(window, 2), "2026-09-30");
  assert.equal(nearestCalendarDay({ start: "2026-09-30", end: "2026-09-30" }, .8), "2026-09-30");
  assert.equal(nearestCalendarDay(window, NaN), null);
});

test("inspection shows an absent or null calendar day instead of a neighboring observation", () => {
  const rows = normalizeDaily([
    { date: "2026-09-24", recovery: 60 },
    { date: "2026-09-26", recovery: null },
    { date: "2026-09-30", recovery: 80 }
  ]);
  const model = cardModels(rows).find(card => card.key === "recovery");
  for (const date of ["2026-09-25", "2026-09-26"]) {
    const reading = inspectionModel(model, rows, date);
    assert.equal(reading.value, null);
    assert.equal(reading.displayValue, "—");
    assert.match(reading.detail, /No measurement/);
  }
  assert.equal(inspectionModel(model, rows, "2026-09-24").value, 60);
});

test("daily inspection retains zero and existing precision, including fractional recorded pulse", () => {
  const rows = normalizeDaily([{ date: "2026-09-30", workout_minutes: 0, strain: 4.26, resting_hr: 67.25, steps: 1234, recovery: 72.4, sleep_performance: 84.6 }]);
  const models = new Map(cardModels(rows).map(card => [card.key, card]));
  for (const [key, expected] of [["workout_minutes", "0"], ["strain", "4.3"], ["resting_hr", "67.25"], ["steps", "1,234"], ["recovery", "72"], ["sleep_performance", "85"]]) {
    const reading = inspectionModel(models.get(key), rows, "2026-09-30");
    assert.equal(reading.displayValue, expected);
    assert.equal(reading.detail, "Sep 30, 2026");
  }
});

test("leaving inspection restores each overview without changing the latest heartbeat", () => {
  const rows = normalizeDaily([
    { date: "2026-09-24", workout_minutes: 0, resting_hr: 60 },
    { date: "2026-09-30", workout_minutes: 60, resting_hr: 45 }
  ]);
  const models = new Map(cardModels(rows, rows).map(card => [card.key, card]));
  const workout = models.get("workout_minutes");
  assert.equal(inspectionModel(workout, rows, "2026-09-24").value, 0);
  assert.equal(inspectionModel(workout, rows, null), workout);
  assert.equal(inspectionModel(workout, rows, null).value, 30);
  const heart = models.get("resting_hr");
  assert.equal(inspectionModel(heart, rows, "2026-09-24").value, 60);
  assert.equal(heartbeatModel(rows).bpm, 45);
  assert.equal(inspectionModel(heart, rows, null).value, 45);
  assert.equal(inspectionModel(heart, rows, null).detail, "Recorded · Sep 30");
});

// EMA expectations below are fixed hand calculations, independent of chart rendering.
test("EMA windows use the agreed 3, 7, and 14 day spans", () => {
  assert.deepEqual(EMA_SPANS, { W: 3, M: 7, ALL: 14 });
});

test("EMA seeds at the first observation and ages across missing calendar days", () => {
  const rows = normalizeDaily([
    { date: "2026-09-01", steps: null },
    { date: "2026-09-02", steps: 10 },
    { date: "2026-09-03", steps: 20 },
    { date: "2026-09-04", steps: null },
    { date: "2026-09-06", steps: 30 },
    { date: "2026-09-07", steps: 0 }
  ]);
  const series = emaSeries(rows, "steps", 3);
  assert.deepEqual(series.map(point => point.date), rows.map(row => row.date));
  // alpha=.5: 10 -> 15; three days to Sep 6 gives alpha=.875;
  // Sep 6 = 15*.125 + 30*.875 = 28.125; a real zero then halves it.
  assert.deepEqual(series.map(point => point.value), [null, 10, 15, null, 28.125, 14.0625]);
});

test("a visible window uses EMA warmed by the full history instead of reseeding", () => {
  const rows = normalizeDaily([
    { date: "2026-09-01", steps: 0 },
    { date: "2026-09-02", steps: 100 },
    { date: "2026-09-03", steps: 100 },
    { date: "2026-09-04", steps: 100 }
  ]);
  const series = emaSeries(rows, "steps", 3);
  assert.deepEqual(series.map(point => point.value), [0, 50, 75, 87.5]);
  const trend = emaTrend(series, { start: "2026-09-03", end: "2026-09-04" });
  assert.equal(trend.startDate, "2026-09-03");
  assert.equal(trend.endDate, "2026-09-04");
  assert.equal(trend.startValue, 75);
  assert.equal(trend.endValue, 87.5);
  assert.ok(Math.abs(trend.percent - 100 / 6) < 1e-10);
  assert.equal(trend.direction, "up");
});

test("EMA trend clips to valid window endpoints and inspects the exact selected date", () => {
  const series = [
    { date: "2026-08-31", value: 10 },
    { date: "2026-09-01", value: null },
    { date: "2026-09-02", value: 20 },
    { date: "2026-09-03", value: 30 },
    { date: "2026-09-04", value: null },
    { date: "2026-09-06", value: 40 },
    { date: "2026-09-07", value: null },
    { date: "2026-09-08", value: 90 }
  ];
  const window = { start: "2026-09-01", end: "2026-09-07" };
  const idle = emaTrend(series, window);
  assert.equal(idle.startDate, "2026-09-02");
  assert.equal(idle.endDate, "2026-09-06");
  assert.equal(idle.startValue, 20);
  assert.equal(idle.endValue, 40);
  assert.equal(idle.percent, 100);
  const inspected = emaTrend(series, window, "2026-09-03");
  assert.equal(inspected.endDate, "2026-09-03");
  assert.equal(inspected.endValue, 30);
  assert.equal(inspected.percent, 50);
  for (const date of ["2026-09-01", "2026-09-04", "2026-09-05", "2026-08-31", "2026-09-08"]) {
    const missing = emaTrend(series, window, date);
    assert.equal(missing.percent, null, `${date} must not substitute a neighboring point`);
    assert.equal(missing.direction, "unavailable");
  }
});

test("EMA trends handle zero baselines and require two valid observations", () => {
  const window = { start: "2026-09-01", end: "2026-09-02" };
  const flat = emaTrend([{ date: window.start, value: 0 }, { date: window.end, value: 0 }], window);
  assert.equal(flat.percent, 0);
  assert.equal(flat.direction, "flat");
  const risingFromZero = emaTrend([{ date: window.start, value: 0 }, { date: window.end, value: 5 }], window);
  assert.equal(risingFromZero.percent, null);
  assert.equal(risingFromZero.direction, "unavailable");
  for (const series of [[], [{ date: window.start, value: null }], [{ date: window.end, value: 10 }]]) {
    const insufficient = emaTrend(series, window);
    assert.equal(insufficient.percent, null);
    assert.equal(insufficient.direction, "unavailable");
  }
  const firstOnly = emaTrend([{ date: window.start, value: 10 }, { date: window.end, value: 20 }], window, window.start);
  assert.equal(firstOnly.percent, null);
  assert.equal(firstOnly.direction, "unavailable");
});

test("EMA direction follows one-decimal percent display and absolute baseline magnitude", () => {
  const window = { start: "2026-09-01", end: "2026-09-02" };
  for (const [endValue, expected] of [[100.049, "flat"], [99.951, "flat"], [100.051, "up"], [99.949, "down"]]) {
    const trend = emaTrend([{ date: window.start, value: 100 }, { date: window.end, value: endValue }], window);
    assert.equal(trend.direction, expected);
  }
  for (const [endValue, direction] of [[2001, "up"], [1999, "down"]]) {
    const trend = emaTrend([{ date: window.start, value: 2000 }, { date: window.end, value: endValue }], window);
    assert.equal(trend.direction, direction);
    assert.equal(trend.magnitude, 0.1, "exact positive and negative 0.05% both round to 0.1%");
  }
  const negative = emaTrend([{ date: window.start, value: -10 }, { date: window.end, value: -5 }], window);
  assert.equal(negative.percent, 50);
  assert.equal(negative.direction, "up");
});
