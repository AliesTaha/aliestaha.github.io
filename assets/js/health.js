/* Public daily summaries only. WHOOP credentials never reach the browser. */
(function () {
  "use strict";
  const DAY = 86400000;
  const METRICS = {
    sleep_performance: { label: "Sleep score", unit: "%", digits: 0, bounds: [0, 100] },
    recovery: { label: "Recovery", unit: "%", digits: 0, bounds: [0, 100] },
    strain: { label: "Daily strain", unit: "/ 21", digits: 1, bounds: [0, 21] },
    resting_hr: { label: "Resting heart rate", unit: "bpm", digits: 0 },
    workout_minutes: { label: "Workout time", unit: "min", digits: 0 },
    steps: { label: "Steps", unit: "", digits: 0 }
  };
  const RANGE_DAYS = { W: 7, M: 30 };
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
    if (range !== "ALL" && !RANGE_DAYS[range]) throw new Error("Unknown chart range.");
    if (!rows.length) return { rows: [], start: null, end: null, days: 0 };
    const end = rows[rows.length - 1].date;
    const start = range === "ALL" ? rows[0].date : isoDay(timestamp(end) - (RANGE_DAYS[range] - 1) * DAY);
    return { rows: rows.filter(row => row.date >= start && row.date <= end), start, end, days: Math.round((timestamp(end) - timestamp(start)) / DAY) + 1 };
  }
  function metricSummary(rows, key) {
    const observations = rows.filter(row => validValue(row[key]));
    const values = observations.map(row => row[key]);
    return {
      count: values.length, observations,
      mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null
    };
  }
  function splitSegments(rows, key) {
    const segments = [];
    let segment = [];
    let previous = null;
    rows.forEach(row => {
      if (!validValue(row[key]) || (previous !== null && timestamp(row.date) - previous > DAY)) {
        if (segment.length) segments.push(segment);
        segment = [];
      }
      if (validValue(row[key])) segment.push(row);
      previous = timestamp(row.date);
    });
    if (segment.length) segments.push(segment);
    return segments;
  }
  function cardModels(rows, history = rows) {
    return Object.entries(METRICS).map(([key, metric]) => {
      const summary = metricSummary(rows, key);
      const provisional = ["strain", "steps"].includes(key) && summary.observations.some(row => row.cycle_complete === false);
      const pulse = key === "resting_hr" ? heartbeatModel(history) : null;
      const detail = key === "resting_hr"
        ? pulse ? `Recorded · ${formatDate(pulse.date)}` : "No recorded pulse"
        : summary.count ? `Average · ${summary.count} ${summary.count === 1 ? "day" : "days"}${provisional ? " · ongoing cycle" : ""}` : "No observations";
      const value = key === "resting_hr" ? pulse?.bpm ?? null : summary.mean;
      const displayValue = key === "resting_hr" && pulse ? String(pulse.bpm) : formatValue(value, key, false);
      return { key, label: metric.label, value, displayValue, detail, summary };
    });
  }
  function heartbeatModel(rows) {
    const latest = rows.reduce((selected, row) => {
      if (!row || !validDate(row.date) || !validValue(row.resting_hr) || row.resting_hr <= 0 || row.resting_hr > 300) return selected;
      return !selected || row.date > selected.date ? row : selected;
    }, null);
    return latest ? { date: latest.date, bpm: latest.resting_hr, periodSeconds: 60 / latest.resting_hr } : null;
  }
  function formatValue(value, key, includeUnit = true) {
    if (!validValue(value)) return "—";
    const metric = METRICS[key];
    const number = value.toLocaleString("en-US", { maximumFractionDigits: metric.digits, minimumFractionDigits: metric.digits });
    return includeUnit && metric.unit ? `${number}${metric.unit === "%" ? "" : " "}${metric.unit}` : number;
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
  const helpers = { METRICS, validDate, normalizeDaily, selectRange, metricSummary, splitSegments, cardModels, heartbeatModel, formatValue, publicationState };
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
  if (typeof document === "undefined") return;

  const page = document.querySelector("[data-health-url]");
  if (!page) return;
  const $ = selector => page.querySelector(selector);
  const cards = Array.from(page.querySelectorAll("[data-health-metric]")).filter(card => Object.hasOwn(METRICS, card.dataset.healthMetric));
  const bodyMap = $(".health-body-map");
  const figure = $(".health-figure");
  const NS = "http://www.w3.org/2000/svg";
  let allRows = [];
  let range = "M";
  let publication = null;
  let refreshFailed = false;
  let fetchInFlight = false;
  let resizeTimer;
  let renderedSize = "";
  let connectionFrame = 0;
  let chartNumber = 0;
  let pulseRecordKey;
  let pulseBpm;
  function svgEl(tag, attrs = {}, text) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function drawChart(container, rows, model, window) {
    container.replaceChildren();
    const { key, label, summary } = model;
    const width = Math.max(100, Math.round(container.clientWidth || 180));
    const height = 84;
    const pad = { l: 3, r: 3, t: 8, b: 18 };
    const plotWidth = width - pad.l - pad.r;
    const plotHeight = height - pad.t - pad.b;
    const description = `${label}: ${formatValue(summary.mean, key)} average in plotted range, ${summary.count} daily ${summary.count === 1 ? "observation" : "observations"}, ${formatSpan(window.start, window.end)}.`;
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": description });
    svg.append(svgEl("title", {}, description));
    if (!summary.count) {
      svg.append(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "health-svg-empty" }, "No observations"));
      container.append(svg);
      return;
    }
    let low = summary.min;
    let high = summary.max;
    if (METRICS[key].bounds) [low, high] = METRICS[key].bounds;
    else {
      const padding = Math.max((high - low) * .2, high === low ? Math.max(Math.abs(high) * .06, .5) : .1);
      low = Math.max(0, low - padding);
      high += padding;
    }
    const x = date => pad.l + (window.start === window.end ? .5 : (timestamp(date) - timestamp(window.start)) / (timestamp(window.end) - timestamp(window.start))) * plotWidth;
    const y = value => pad.t + (1 - (value - low) / (high - low)) * plotHeight;
    const gradientId = `health-area-${++chartNumber}`;
    const defs = svgEl("defs");
    const gradient = svgEl("linearGradient", { id: gradientId, x1: 0, x2: 0, y1: 0, y2: 1 });
    gradient.append(svgEl("stop", { offset: "0%", "stop-color": "var(--health-accent)", "stop-opacity": ".13" }), svgEl("stop", { offset: "100%", "stop-color": "var(--health-accent)", "stop-opacity": "0" }));
    defs.append(gradient);
    svg.append(defs);
    splitSegments(rows, key).forEach(segment => {
      if (segment.length === 1) {
        svg.append(svgEl("circle", { cx: x(segment[0].date), cy: y(segment[0][key]), r: 3, class: "health-svg-point" }));
        return;
      }
      const path = segment.map((row, i) => `${i ? "L" : "M"}${x(row.date).toFixed(2)},${y(row[key]).toFixed(2)}`).join(" ");
      svg.append(svgEl("path", { d: `${path} L${x(segment[segment.length - 1].date)},${height - pad.b} L${x(segment[0].date)},${height - pad.b} Z`, fill: `url(#${gradientId})` }));
      svg.append(svgEl("path", { d: path, class: "health-svg-line" }));
    });
    if (window.start === window.end) {
      svg.append(svgEl("text", { x: width / 2, y: height - 3, "text-anchor": "middle", class: "health-svg-label" }, formatDate(window.end)));
    } else {
      svg.append(svgEl("text", { x: pad.l, y: height - 3, class: "health-svg-label" }, formatDate(window.start)));
      svg.append(svgEl("text", { x: width - pad.r, y: height - 3, "text-anchor": "end", class: "health-svg-label" }, formatDate(window.end)));
    }
    container.append(svg);
  }
  const layoutSize = () => [
    ...cards.map(card => card.querySelector("[data-metric-chart]").clientWidth),
    bodyMap?.clientWidth || 0, bodyMap?.clientHeight || 0,
    figure?.clientWidth || 0, figure?.clientHeight || 0
  ].join(",");
  function drawConnections() {
    connectionFrame = 0;
    const overlay = bodyMap?.querySelector(".health-connections-overlay");
    if (!overlay || page.hidden) return;
    const mapRect = bodyMap.getBoundingClientRect();
    if (!mapRect.width || !mapRect.height) return;
    overlay.setAttribute("viewBox", `0 0 ${mapRect.width} ${mapRect.height}`);
    const paths = [];
    const figureRect = figure?.getBoundingClientRect();
    const cardRects = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
    const leftCards = cards.filter(card => {
      const rect = cardRects.get(card);
      return rect.left + rect.width / 2 < mapRect.left + mapRect.width / 2;
    });
    const rightCards = cards.filter(card => !leftCards.includes(card));
    const firstCardTop = Math.min(...Array.from(cardRects.values(), rect => rect.top));
    const stacked = figureRect && figureRect.bottom <= firstCardTop + 1 && leftCards.length && rightCards.length;
    const gutterLeft = stacked ? Math.max(...leftCards.map(card => cardRects.get(card).right)) - mapRect.left : 0;
    const gutterRight = stacked ? Math.min(...rightCards.map(card => cardRects.get(card).left)) - mapRect.left : 0;
    cards.forEach(card => {
      const anchor = bodyMap.querySelector(`[data-body-anchor="${card.dataset.healthMetric}"]`);
      const value = card.querySelector("[data-metric-value]");
      if (!anchor || !value) return;
      const cardRect = cardRects.get(card);
      const valueRect = value.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      if (!cardRect.width || !valueRect.height) return;
      const isLeft = cardRect.left + cardRect.width / 2 < mapRect.left + mapRect.width / 2;
      const startX = (isLeft ? cardRect.right : cardRect.left) - mapRect.left;
      const startY = valueRect.top + valueRect.height / 2 - mapRect.top;
      const endX = anchorRect.left + anchorRect.width / 2 - mapRect.left;
      const endY = anchorRect.top + anchorRect.height / 2 - mapRect.top;
      let d;
      if (stacked) {
        // Keep long mobile callouts between the chart columns, then fan into the portrait.
        const sideCards = isLeft ? leftCards : rightCards;
        const rank = sideCards.indexOf(card);
        const halfGutter = Math.max(0, gutterRight - gutterLeft) / 2;
        const inset = Math.min(4, halfGutter / 3);
        const spacing = Math.max(1, (halfGutter - inset - 2) / Math.max(1, sideCards.length - 1));
        const laneX = isLeft ? gutterLeft + inset + rank * spacing : gutterRight - inset - rank * spacing;
        const fanY = figureRect.bottom - mapRect.top + Math.min(12, (firstCardTop - figureRect.bottom) / 2);
        const turnY = Math.min(startY - 8, fanY);
        const endControlY = Math.min(fanY - 12, endY + 32);
        d = `M${startX},${startY} C${laneX},${startY} ${laneX},${startY - 8} ${laneX},${startY - 8} L${laneX},${turnY} C${laneX},${fanY - 32} ${endX},${endControlY} ${endX},${endY}`;
      } else {
        const bend = (endX - startX) * .4;
        d = `M${startX},${startY} C${startX + bend},${startY} ${endX - bend},${endY} ${endX},${endY}`;
      }
      paths.push(svgEl("path", { d, class: "health-body-connector", fill: "none" }));
    });
    overlay.replaceChildren(...paths);
  }
  function scheduleConnections() {
    if (connectionFrame) window.cancelAnimationFrame(connectionFrame);
    connectionFrame = window.requestAnimationFrame(drawConnections);
  }
  function renderCharts() {
    if (!allRows.length) return;
    const window = selectRange(allRows, range);
    const models = new Map(cardModels(window.rows, allRows).map(model => [model.key, model]));
    $("#health-range-label").textContent = formatSpan(window.start, window.end);
    page.querySelectorAll("[data-range]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.range === range)));
    cards.forEach(card => {
      const model = models.get(card.dataset.healthMetric);
      const value = card.querySelector("[data-metric-value]");
      value.textContent = model.displayValue;
      if (validValue(model.value) && METRICS[model.key].unit) {
        const unit = document.createElement("small");
        unit.textContent = METRICS[model.key].unit;
        value.append(unit);
      }
      card.querySelector("[data-metric-detail]").textContent = model.detail;
      drawChart(card.querySelector("[data-metric-chart]"), window.rows, model, window);
    });
    renderedSize = layoutSize();
    scheduleConnections();
  }
  function updateHeartbeat() {
    const pulse = heartbeatModel(allRows);
    const key = pulse ? `${pulse.date}|${pulse.bpm}` : "none";
    if (key === pulseRecordKey) return;
    pulseRecordKey = key;
    page.dataset.heartbeat = String(Boolean(pulse));
    if (pulse) {
      if (pulse.bpm !== pulseBpm) page.style.setProperty("--heartbeat-duration", `${pulse.periodSeconds}s`);
      pulseBpm = pulse.bpm;
    } else {
      page.style.removeProperty("--heartbeat-duration");
      pulseBpm = null;
    }
    const label = $("[data-heartbeat-label]");
    if (label) label.textContent = pulse ? `Recorded pulse · ${formatDate(pulse.date)}` : "Recorded pulse unavailable";
  }
  function updateMotionState(section) {
    const paused = document.hidden || page.hidden || (section !== undefined && section !== "body");
    const value = String(paused);
    if (page.dataset.motionPaused !== value) page.dataset.motionPaused = value;
  }
  function updateFreshness() {
    if (!publication) return;
    const status = publicationState(publication.generated_at);
    const date = status.valid ? new Date(publication.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "unknown";
    $("#health-status").dataset.stale = String(status.stale);
    $("#health-status-text").textContent = `WHOOP · Updated ${date}${status.stale ? " · Update delayed" : ""}${refreshFailed ? " · Refresh unavailable; showing saved data" : ""}`;
  }
  async function load({ background = false } = {}) {
    if (fetchInFlight) return;
    fetchInFlight = true;
    $("#health-retry").hidden = true;
    if (!background || !publication) $("#health-status-text").textContent = "WHOOP · Loading…";
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
      updateHeartbeat();
      renderCharts();
    } catch (error) {
      $("#health-status").dataset.error = "true";
      refreshFailed = true;
      if (publication) updateFreshness();
      else $("#health-status-text").textContent = "WHOOP · Data temporarily unavailable";
      $("#health-retry").hidden = false;
      $("#health-dashboard").hidden = !publication;
      console.warn("Health summary could not be loaded:", error.message);
    } finally {
      window.clearTimeout(timeout);
      fetchInFlight = false;
    }
  }
  page.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => {
    range = button.dataset.range;
    renderCharts();
  }));
  $("#health-retry").addEventListener("click", () => load());
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      if (!allRows.length || page.hidden || layoutSize() === renderedSize) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderCharts, 100);
    });
    cards.forEach(card => observer.observe(card.querySelector("[data-metric-chart]")));
    if (bodyMap) observer.observe(bodyMap);
    if (figure) observer.observe(figure);
  }
  window.setInterval(updateFreshness, 60000);
  window.setInterval(() => {
    if (!document.hidden && !page.hidden) load({ background: true });
  }, 5 * 60000);
  document.addEventListener("visibilitychange", () => {
    updateMotionState();
    if (!document.hidden && !page.hidden) load({ background: true });
  });
  document.addEventListener("site:sectionchange", event => {
    updateMotionState(event.detail?.section);
    if (event.detail?.section !== "body") return;
    renderCharts();
    if (!document.hidden && !page.hidden) load({ background: true });
  });
  updateHeartbeat();
  updateMotionState();
  load();
})();
