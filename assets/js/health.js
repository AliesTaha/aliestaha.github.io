/* Daily WHOOP summaries only. Credentials and the WHOOP API never reach the browser. */
(function (root) {
  "use strict";
  const DAY = 86400000;
  const METRICS = {
    sleep_hours: { label: "Sleep duration", unit: "h", digits: 2, group: "Sleep" },
    deep_hours: { label: "Deep sleep", unit: "h", digits: 2, group: "Sleep" },
    rem_hours: { label: "REM sleep", unit: "h", digits: 2, group: "Sleep" },
    light_hours: { label: "Light sleep", unit: "h", digits: 2, group: "Sleep" },
    nap_hours: { label: "Naps", unit: "h", digits: 2, group: "Sleep" },
    sleep_performance: { label: "Sleep performance", unit: "%", digits: 0, group: "Sleep", bounds: [0, 100] },
    sleep_efficiency: { label: "Sleep efficiency", unit: "%", digits: 0, group: "Sleep", bounds: [0, 100] },
    sleep_consistency: { label: "Sleep consistency", unit: "%", digits: 0, group: "Sleep", bounds: [0, 100] },
    sleep_debt_hours: { label: "Sleep debt", unit: "h", digits: 2, group: "Sleep" },
    hrv_ms: { label: "Heart rate variability", short: "HRV", unit: "ms", digits: 1, group: "Recovery & heart" },
    resting_hr: { label: "Resting heart rate", short: "Resting HR", unit: "bpm", digits: 0, group: "Recovery & heart" },
    recovery: { label: "Recovery", unit: "%", digits: 0, group: "Recovery & heart", bounds: [0, 100] },
    avg_hr: { label: "Average heart rate", unit: "bpm", digits: 0, group: "Recovery & heart" },
    max_hr: { label: "Maximum heart rate", unit: "bpm", digits: 0, group: "Recovery & heart" },
    respiratory_rate: { label: "Respiratory rate", unit: "br/min", digits: 1, group: "Recovery & heart" },
    spo2: { label: "Blood oxygen", unit: "%", digits: 1, group: "Recovery & heart" },
    skin_temp: { label: "Skin temperature", unit: "°C", digits: 1, group: "Recovery & heart" },
    strain: { label: "Daily strain", unit: "/ 21", digits: 1, group: "Activity", bounds: [0, 21] },
    workout_minutes: { label: "Workout time", unit: "min", digits: 0, group: "Activity" },
    workouts: { label: "Workouts", unit: "", digits: 0, group: "Activity" },
    steps: { label: "Steps", unit: "", digits: 0, group: "Activity" },
    energy_kcal: { label: "Energy expenditure", unit: "kcal", digits: 0, group: "Activity" }
  };
  const RANGE_DAYS = { D: 1, W: 7, M: 30, Y: 365 };
  const RANGE_NAMES = { D: "Past day", W: "Past week", M: "Past month", Y: "Past year", ALL: "All time" };
  const validValue = value => typeof value === "number" && Number.isFinite(value);
  const timestamp = date => Date.parse(`${date}T00:00:00Z`);
  const isoDay = value => new Date(value).toISOString().slice(0, 10);
  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(timestamp(value)) && isoDay(timestamp(value)) === value;
  }
  function normalizeDaily(rows) {
    if (!Array.isArray(rows)) throw new Error("Daily measurements are missing.");
    const seen = new Set();
    return rows.filter(row => row && validDate(row.date)).map(row => {
      if (seen.has(row.date)) throw new Error("Duplicate daily measurement.");
      seen.add(row.date);
      const clean = { date: row.date, cycle_complete: row.cycle_complete };
      Object.keys(METRICS).forEach(key => { clean[key] = validValue(row[key]) ? row[key] : null; });
      return clean;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }
  function selectRange(rows, range) {
    if (!rows.length) return { rows: [], start: null, end: null, days: 0 };
    if (range !== "ALL" && !RANGE_DAYS[range]) throw new Error("Unknown chart range.");
    const end = rows[rows.length - 1].date;
    const start = range === "ALL" ? rows[0].date : isoDay(timestamp(end) - (RANGE_DAYS[range] - 1) * DAY);
    return { rows: rows.filter(row => row.date >= start && row.date <= end), start, end, days: Math.round((timestamp(end) - timestamp(start)) / DAY) + 1 };
  }
  function metricSummary(rows, key) {
    const observations = rows.filter(row => validValue(row[key]));
    if (!observations.length) return { count: 0, observations, latest: null, mean: null, min: null, max: null, change: null };
    const values = observations.map(row => row[key]);
    return {
      count: values.length, observations, latest: observations[observations.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values), max: Math.max(...values),
      change: values.length > 1 ? values[values.length - 1] - values[0] : null
    };
  }
  function splitSegments(rows, key) {
    const segments = [];
    let segment = [];
    let previous = null;
    rows.forEach(row => {
      const gap = previous !== null && timestamp(row.date) - previous > DAY;
      if (!validValue(row[key]) || gap) {
        if (segment.length) segments.push(segment);
        segment = [];
      }
      if (validValue(row[key])) segment.push(row);
      previous = timestamp(row.date);
    });
    if (segment.length) segments.push(segment);
    return segments;
  }
  function formatValue(value, key, includeUnit = true) {
    if (!validValue(value)) return "—";
    const metric = METRICS[key];
    const number = value.toLocaleString("en-US", { maximumFractionDigits: metric.digits, minimumFractionDigits: metric.digits });
    return includeUnit && metric.unit ? `${number}${metric.unit === "%" ? "" : " "}${metric.unit}` : number;
  }
  function formatChange(value, key) {
    if (!validValue(value)) return "—";
    const formatted = METRICS[key].unit === "%" ? `${formatValue(value, key, false)} pp` : formatValue(value, key);
    return `${value > 0 ? "+" : ""}${formatted}`;
  }
  function formatDate(date, year = false) {
    return new Date(timestamp(date)).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
  }
  function formatSpan(start, end) {
    if (!start || !end) return "No measurements yet";
    return start === end ? formatDate(end, true) : `${formatDate(start, start.slice(0, 4) !== end.slice(0, 4))} – ${formatDate(end, true)}`;
  }
  function publicationState(generatedAt, now = Date.now()) {
    const generated = Date.parse(generatedAt);
    return { valid: Number.isFinite(generated), stale: !Number.isFinite(generated) || now - generated > 3 * 3600000 };
  }
  const helpers = { METRICS, validDate, normalizeDaily, selectRange, metricSummary, splitSegments, formatValue, formatChange, publicationState };
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
  if (typeof document === "undefined") return;

  const page = document.querySelector("[data-health-url]");
  if (!page) return;
  const $ = selector => page.querySelector(selector);
  const NS = "http://www.w3.org/2000/svg";
  let allRows = [];
  let range = "M";
  let metric = "sleep_hours";
  let currentPoints = [];
  let cursorIndex = -1;
  let chartCursor = null;
  let chartCircle = null;
  let currentWindow = null;
  let resizeTimer;
  let publication = null;
  let refreshFailed = false;
  let fetchInFlight = false;
  let renderWidth = 0;
  let chartNumber = 0;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svgEl = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function valueNode(value, key, className) {
    const node = el("p", className, formatValue(value, key, false));
    if (validValue(value) && METRICS[key].unit) node.append(el("small", "", METRICS[key].unit));
    return node;
  }
  function drawChart(container, rows, key, window, compact = false) {
    container.replaceChildren();
    const width = Math.max(120, Math.round(container.clientWidth || (compact ? 340 : 720)));
    const height = compact ? 92 : width < 500 ? 226 : 268;
    const pad = compact ? { l: 1, r: 3, t: 10, b: 19 } : { l: 8, r: 45, t: 13, b: 27 };
    const plotWidth = width - pad.l - pad.r;
    const plotHeight = height - pad.t - pad.b;
    const summary = metricSummary(rows, key);
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${METRICS[key].label}: ${summary.count} daily measurements, ${formatSpan(window.start, window.end)}.` });
    svg.append(svgEl("title", {}, `${METRICS[key].label} · ${formatSpan(window.start, window.end)}`));
    if (!summary.count) {
      svg.append(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "health-svg-empty" }, compact ? "No measurements" : "No measurements in this window."));
      container.append(svg);
      return { points: [], svg, width, height };
    }
    let low = summary.min;
    let high = summary.max;
    const bounds = METRICS[key].bounds;
    if (bounds) { [low, high] = bounds; }
    else {
      const padding = Math.max((high - low) * .2, high === low ? Math.max(Math.abs(high) * .06, .5) : .1);
      low = Math.max(0, low - padding);
      high += padding;
    }
    const x = date => pad.l + (window.start === window.end ? .5 : (timestamp(date) - timestamp(window.start)) / (timestamp(window.end) - timestamp(window.start))) * plotWidth;
    const y = value => pad.t + (1 - (value - low) / (high - low)) * plotHeight;
    if (!compact) {
      for (let i = 0; i <= 3; i++) {
        const level = low + (high - low) * i / 3;
        const levelY = y(level);
        svg.append(svgEl("line", { x1: pad.l, x2: width - pad.r, y1: levelY, y2: levelY, class: "health-svg-grid" }));
        const digits = high - low < 5 ? 1 : 0;
        svg.append(svgEl("text", { x: width - pad.r + 9, y: levelY + 3, class: "health-svg-label" }, level.toLocaleString("en-US", { maximumFractionDigits: digits })));
      }
    }
    const gradientId = `health-area-${++chartNumber}`;
    const defs = svgEl("defs");
    const gradient = svgEl("linearGradient", { id: gradientId, x1: 0, x2: 0, y1: 0, y2: 1 });
    gradient.append(svgEl("stop", { offset: "0%", "stop-color": "#396550", "stop-opacity": compact ? ".10" : ".16" }), svgEl("stop", { offset: "100%", "stop-color": "#396550", "stop-opacity": "0" }));
    defs.append(gradient);
    svg.append(defs);
    const points = summary.observations.map(row => ({ row, x: x(row.date), y: y(row[key]) }));
    splitSegments(rows, key).forEach(segment => {
      if (segment.length === 1) {
        svg.append(svgEl("circle", { cx: x(segment[0].date), cy: y(segment[0][key]), r: compact ? 3 : 4.5, class: "health-svg-point" }));
        return;
      }
      const path = segment.map((row, i) => `${i ? "L" : "M"}${x(row.date).toFixed(2)},${y(row[key]).toFixed(2)}`).join(" ");
      const first = segment[0];
      const last = segment[segment.length - 1];
      svg.append(svgEl("path", { d: `${path} L${x(last.date)},${height - pad.b} L${x(first.date)},${height - pad.b} Z`, fill: `url(#${gradientId})` }));
      svg.append(svgEl("path", { d: path, class: "health-svg-line" }));
    });
    if (window.start === window.end) {
      svg.append(svgEl("text", { x: width / 2, y: height - 3, "text-anchor": "middle", class: "health-svg-label" }, formatDate(window.end)));
    } else {
      svg.append(svgEl("text", { x: pad.l, y: height - 3, class: "health-svg-label" }, formatDate(window.start)));
      if (!compact && width > 450) {
        const middle = isoDay((timestamp(window.start) + timestamp(window.end)) / 2);
        svg.append(svgEl("text", { x: x(middle), y: height - 3, "text-anchor": "middle", class: "health-svg-label" }, formatDate(middle)));
      }
      svg.append(svgEl("text", { x: width - pad.r, y: height - 3, "text-anchor": "end", class: "health-svg-label" }, formatDate(window.end)));
    }
    const cursor = svgEl("line", { y1: pad.t, y2: height - pad.b, class: "health-svg-cursor", visibility: "hidden" });
    const circle = svgEl("circle", { r: 5, class: "health-svg-point", visibility: "hidden" });
    if (!compact) svg.append(cursor, circle);
    container.append(svg);
    return { points, cursor, circle, svg, width, height };
  }
  function renderLatest() {
    const grid = $("#health-latest-grid");
    grid.replaceChildren();
    ["sleep_hours", "hrv_ms", "resting_hr", "recovery"].forEach(key => {
      const latest = metricSummary(allRows, key).latest;
      const item = el("article", "health-latest-item");
      item.append(el("h3", "", key === "sleep_hours" ? "Sleep" : METRICS[key].short || METRICS[key].label), valueNode(latest ? latest[key] : null, key, "health-latest-number"), el("p", "health-latest-date", latest ? formatDate(latest.date, true) : "Not available"));
      grid.append(item);
    });
  }
  function updateReadout(row) {
    const latest = metricSummary(currentWindow.rows, metric).latest;
    const selected = row || latest;
    $("#health-focus-label").textContent = `${METRICS[metric].label} · ${selected ? formatDate(selected.date, true) : "No data"}`;
    $("#health-focus-value").replaceChildren(...valueNode(selected ? selected[metric] : null, metric, "").childNodes);
    const summary = metricSummary(currentWindow.rows, metric);
    let detail = selected ? "Latest measurement in this window" : "This metric has no recorded values in this window.";
    if (row) detail = "Daily measurement";
    else if (summary.count > 1) detail = `${formatValue(summary.mean, metric)} average across ${summary.count} days`;
    if (selected && selected.cycle_complete === false && ["strain", "avg_hr", "max_hr", "steps", "energy_kcal"].includes(metric)) detail += " · Cycle in progress";
    $("#health-focus-detail").textContent = detail;
  }
  function setCursor(index) {
    if (!currentPoints.length || !chartCursor || !chartCircle) return;
    cursorIndex = Math.max(0, Math.min(index, currentPoints.length - 1));
    const point = currentPoints[cursorIndex];
    chartCursor.setAttribute("x1", point.x);
    chartCursor.setAttribute("x2", point.x);
    chartCursor.setAttribute("visibility", "visible");
    chartCircle.setAttribute("cx", point.x);
    chartCircle.setAttribute("cy", point.y);
    chartCircle.setAttribute("visibility", "visible");
    updateReadout(point.row);
    $("#health-main-chart").setAttribute("aria-label", `${METRICS[metric].label}, ${formatDate(point.row.date, true)}: ${formatValue(point.row[metric], metric)}. Use left and right arrow keys to explore measurements.`);
  }
  function clearCursor() {
    cursorIndex = -1;
    if (chartCursor) chartCursor.setAttribute("visibility", "hidden");
    if (chartCircle) chartCircle.setAttribute("visibility", "hidden");
    updateReadout(null);
  }
  function renderSummary(summary) {
    const container = $("#health-range-summary");
    container.replaceChildren();
    const change = formatChange(summary.change, metric);
    [["Average", formatValue(summary.mean, metric)], ["Low", formatValue(summary.min, metric)], ["High", formatValue(summary.max, metric)], ["First → last", change]].forEach(([label, value]) => {
      const item = el("div");
      item.append(el("span", "health-summary-label", label), el("span", "health-summary-number", value));
      container.append(item);
    });
  }
  function renderTrends() {
    const container = $("#health-trend-grid");
    container.replaceChildren();
    ["sleep_hours", "hrv_ms", "recovery", "resting_hr", "strain", "workout_minutes"].forEach(key => {
      const summary = metricSummary(currentWindow.rows, key);
      const item = el("article", "health-trend");
      const heading = el("div", "health-trend-heading");
      const title = el("h3");
      const button = el("button", "", METRICS[key].label);
      button.type = "button";
      button.setAttribute("aria-label", `Explore ${METRICS[key].label.toLowerCase()} in the main chart`);
      button.addEventListener("click", () => {
        metric = key;
        $("#health-metric").value = key;
        renderCharts();
        $("#health-explorer-title").scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        $("#health-main-chart").focus({ preventScroll: true });
      });
      title.append(button);
      heading.append(title, el("p", "health-trend-value", formatValue(summary.mean, key)));
      const chart = el("div", "health-trend-chart");
      const detail = el("p", "health-trend-detail", summary.count ? `${summary.count} ${summary.count === 1 ? "day" : "days"} recorded · range average` : "No observations in the selected range");
      item.append(heading, chart, detail);
      container.append(item);
      drawChart(chart, currentWindow.rows, key, currentWindow, true);
    });
  }
  function renderCharts() {
    currentWindow = selectRange(allRows, range);
    $("#health-range-label").textContent = formatSpan(currentWindow.start, currentWindow.end);
    $("#health-trends-range").textContent = `${RANGE_NAMES[range]} · ${formatSpan(currentWindow.start, currentWindow.end)}`;
    page.querySelectorAll("[data-range]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.range === range)));
    const summary = metricSummary(currentWindow.rows, metric);
    const drawn = drawChart($("#health-main-chart"), currentWindow.rows, metric, currentWindow);
    currentPoints = drawn.points;
    chartCursor = drawn.cursor;
    chartCircle = drawn.circle;
    cursorIndex = -1;
    renderWidth = $("#health-main-chart").clientWidth;
    updateReadout(null);
    renderSummary(summary);
    const missing = currentWindow.days - summary.count;
    $("#health-chart-caption").textContent = range === "D" ? `${summary.count ? "One daily observation" : "No measurement for this day"}. WHOOP does not provide an intraday stream here.` : `${summary.count} daily ${summary.count === 1 ? "observation" : "observations"}${missing ? ` · ${missing} ${missing === 1 ? "day without a measurement" : "days without measurements"}` : ""}. Gaps are left open.`;
    $("#health-main-chart").setAttribute("aria-label", `${METRICS[metric].label}, ${RANGE_NAMES[range]}, ${summary.count} daily measurements. Use left and right arrow keys to explore.`);
    renderTrends();
  }
  function updateFreshness() {
    if (!publication) return;
    const status = publicationState(publication.generated_at);
    const date = status.valid ? new Date(publication.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "unknown";
    $("#health-status").dataset.stale = String(status.stale);
    $("#health-status-text").textContent = `${refreshFailed ? "Refresh unavailable · Showing saved measurements. " : ""}${status.stale ? "Update delayed · " : ""}Last published ${date}. Hourly while my Mac is online.`;
  }
  async function load({ background = false } = {}) {
    if (fetchInFlight) return;
    fetchInFlight = true;
    $("#health-retry").hidden = true;
    if (!background || !publication) $("#health-status-text").textContent = "Loading the latest measurements…";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(page.dataset.healthUrl, { cache: "no-store", credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error(`Health data unavailable (${response.status}).`);
      const data = await response.json();
      if (data.schema_version !== 1) throw new Error("Unsupported health data format.");
      const receivedRows = normalizeDaily(data.daily);
      if (!receivedRows.length) throw new Error("No daily measurements have been published yet.");
      allRows = receivedRows;
      publication = data;
      refreshFailed = false;
      $("#health-status").removeAttribute("data-error");
      $("#health-dashboard").hidden = false;
      updateFreshness();
      renderLatest();
      renderCharts();
      $("#health-coverage").textContent = `Published history: ${formatSpan(allRows[0].date, allRows[allRows.length - 1].date)} · ${allRows.length.toLocaleString("en-US")} calendar days. All timestamps in the publication status use your browser’s local timezone.`;
    } catch (error) {
      $("#health-status").dataset.error = "true";
      refreshFailed = true;
      if (publication) updateFreshness();
      else $("#health-status-text").textContent = "The health summary is temporarily unavailable. Please try again shortly.";
      $("#health-retry").hidden = false;
      $("#health-dashboard").hidden = !publication;
      console.warn("Health summary could not be loaded:", error.message);
    } finally {
      window.clearTimeout(timeout);
      fetchInFlight = false;
    }
  }
  const select = $("#health-metric");
  const groups = {};
  Object.entries(METRICS).forEach(([key, value]) => {
    if (!groups[value.group]) {
      groups[value.group] = document.createElement("optgroup");
      groups[value.group].label = value.group;
      select.append(groups[value.group]);
    }
    const option = el("option", "", value.label);
    option.value = key;
    groups[value.group].append(option);
  });
  select.value = metric;
  select.addEventListener("change", () => { metric = select.value; renderCharts(); });
  page.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => { range = button.dataset.range; renderCharts(); }));
  $("#health-retry").addEventListener("click", () => load());
  const chart = $("#health-main-chart");
  chart.addEventListener("pointermove", event => {
    if (!currentPoints.length) return;
    const rect = chart.getBoundingClientRect();
    const targetX = event.clientX - rect.left;
    let nearest = 0;
    currentPoints.forEach((point, index) => {
      if (Math.abs(point.x - targetX) < Math.abs(currentPoints[nearest].x - targetX)) nearest = index;
    });
    setCursor(nearest);
  });
  chart.addEventListener("pointerleave", clearCursor);
  chart.addEventListener("blur", clearCursor);
  chart.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") { clearCursor(); return; }
    if (event.key === "Home") setCursor(0);
    else if (event.key === "End") setCursor(currentPoints.length - 1);
    else if (cursorIndex < 0) setCursor(event.key === "ArrowLeft" ? currentPoints.length - 1 : 0);
    else setCursor(cursorIndex + (event.key === "ArrowLeft" ? -1 : 1));
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
    if (!allRows.length || Math.abs(chart.clientWidth - renderWidth) < 2) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderCharts, 100);
  }).observe(chart);
  window.setInterval(updateFreshness, 60000);
  window.setInterval(() => {
    if (!document.hidden) load({ background: true });
  }, 5 * 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load({ background: true });
  });
  load();
})(typeof window !== "undefined" ? window : globalThis);
