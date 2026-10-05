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
  const EMA_SPANS = { W: 3, M: 7, ALL: 14 };
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
  function emaSeries(rows, key, span) {
    if (!Number.isFinite(span) || span < 1) throw new Error("Invalid EMA span.");
    const alpha = 2 / (span + 1);
    let previous = null;
    let previousDate = null;
    return rows.map(row => {
      if (!validValue(row[key])) return { date: row.date, value: null };
      if (previous === null) previous = row[key];
      else {
        const elapsed = Math.max(1, Math.round((timestamp(row.date) - timestamp(previousDate)) / DAY));
        const weight = 1 - Math.pow(1 - alpha, elapsed);
        previous += weight * (row[key] - previous);
      }
      previousDate = row.date;
      return { date: row.date, value: previous };
    });
  }
  function emaTrend(series, window, selectedDate = null) {
    const observed = series.filter(row => row.date >= window.start && row.date <= window.end && validValue(row.value));
    const eligible = selectedDate ? observed.filter(row => row.date <= selectedDate) : observed;
    const first = observed[0];
    const last = selectedDate ? observed.find(row => row.date === selectedDate) : observed[observed.length - 1];
    let percent = null;
    if (eligible.length >= 2 && first && last) {
      if (first.value !== 0) percent = 100 * (last.value - first.value) / Math.abs(first.value);
      else if (last.value === 0) percent = 0;
    }
    const magnitude = validValue(percent) ? Math.round(Math.abs(percent) * 10) / 10 : null;
    return {
      percent, magnitude, direction: magnitude === null ? "unavailable" : magnitude === 0 ? "flat" : percent > 0 ? "up" : "down",
      startDate: first?.date ?? null, endDate: last?.date ?? null,
      startValue: first?.value ?? null, endValue: last?.value ?? null
    };
  }
  function indicatorDirection(key, direction) {
    if (key !== "resting_hr") return direction;
    return direction === "up" ? "down" : direction === "down" ? "up" : direction;
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
  function nearestCalendarDay(window, fraction) {
    if (!window.start || !window.end || !Number.isFinite(fraction)) return null;
    const days = Math.round((timestamp(window.end) - timestamp(window.start)) / DAY);
    const index = Math.round(Math.max(0, Math.min(1, fraction)) * days);
    return isoDay(timestamp(window.start) + index * DAY);
  }
  function inspectionModel(model, rows, date = null) {
    if (!date) return model;
    const row = rows.find(row => row.date === date);
    const value = row && validValue(row[model.key]) ? row[model.key] : null;
    const displayValue = model.key === "resting_hr" && validValue(value) ? String(value) : formatValue(value, model.key, false);
    let detail = `${formatDate(date, true)}${value === null ? " · No measurement" : ""}`;
    if (value !== null && ["strain", "steps"].includes(model.key) && row.cycle_complete === false) detail += " · ongoing cycle";
    return { ...model, value, displayValue, detail, date };
  }
  function heartbeatModel(rows) {
    const latest = rows.reduce((selected, row) => {
      if (!row || !validDate(row.date) || !validValue(row.resting_hr) || row.resting_hr <= 0 || row.resting_hr > 300) return selected;
      return !selected || row.date > selected.date ? row : selected;
    }, null);
    return latest ? { date: latest.date, bpm: latest.resting_hr, periodSeconds: 60 / latest.resting_hr } : null;
  }
  function formatValue(value, key, includeUnit = true) {
    if (!validValue(value)) return "–";
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
  const chartStates = new Map();
  const chartAnnouncements = new Map();
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
    const description = `${label}: ${formatValue(summary.mean, key)} average in plotted range, ${summary.count} daily ${summary.count === 1 ? "observation" : "observations"}, ${formatSpan(window.start, window.end)}. Dashed line: ${model.emaSpan}-day exponential moving average.`;
    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": description });
    const title = svgEl("title", {}, description);
    svg.append(title);
    if (!summary.count) {
      svg.append(svgEl("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "health-svg-empty" }, "No observations"));
    }
    const plottedValues = [...summary.observations.map(row => row[key]), ...model.ema.filter(row => validValue(row.value)).map(row => row.value)];
    let low = plottedValues.length ? Math.min(...plottedValues) : 0;
    let high = plottedValues.length ? Math.max(...plottedValues) : 1;
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
      if (segment.length === 1) return;
      const path = segment.map((row, i) => `${i ? "L" : "M"}${x(row.date).toFixed(2)},${y(row[key]).toFixed(2)}`).join(" ");
      svg.append(svgEl("path", { d: `${path} L${x(segment[segment.length - 1].date)},${height - pad.b} L${x(segment[0].date)},${height - pad.b} Z`, fill: `url(#${gradientId})` }));
      svg.append(svgEl("path", { d: path, class: "health-svg-line" }));
    });
    splitSegments(model.ema, "value").forEach(segment => {
      if (segment.length < 2) return;
      const path = segment.map((row, i) => `${i ? "L" : "M"}${x(row.date).toFixed(2)},${y(row.value).toFixed(2)}`).join(" ");
      svg.append(svgEl("path", { d: path, class: "health-svg-ema" }));
    });
    if (range === "W") summary.observations.forEach(row => {
      svg.append(svgEl("circle", { cx: x(row.date), cy: y(row[key]), r: 2.5, class: "health-svg-day-point" }));
    });
    if (window.start === window.end) {
      svg.append(svgEl("text", { x: width / 2, y: height - 3, "text-anchor": "middle", class: "health-svg-label" }, formatDate(window.end)));
    } else {
      svg.append(svgEl("text", { x: pad.l, y: height - 3, class: "health-svg-label" }, formatDate(window.start)));
      svg.append(svgEl("text", { x: width - pad.r, y: height - 3, "text-anchor": "end", class: "health-svg-label" }, formatDate(window.end)));
    }
    const hoverLine = svgEl("line", { y1: pad.t, y2: height - pad.b, class: "health-svg-hover-line", visibility: "hidden" });
    const hoverPoint = svgEl("circle", { r: 3.5, class: "health-svg-hover-point", visibility: "hidden" });
    svg.append(hoverLine, hoverPoint);
    container.append(svg);
    return { svg, title, description, width, pad, plotWidth, x, y, hoverLine, hoverPoint };
  }
  function writeReadout(card, model) {
    const value = card.querySelector("[data-metric-value]");
    value.textContent = model.displayValue;
    if (validValue(model.value) && METRICS[model.key].unit) {
      const unit = document.createElement("small");
      unit.textContent = METRICS[model.key].unit;
      value.append(unit);
    }
    card.querySelector("[data-metric-detail]").textContent = model.detail;
  }
  function writeTrend(card, state, date) {
    const trend = emaTrend(state.model.ema, state.window, date);
    const node = card.querySelector("[data-metric-trend]");
    if (!node) return "";
    const indicator = indicatorDirection(state.model.key, trend.direction);
    node.dataset.direction = indicator;
    const span = state.model.emaSpan;
    let description;
    if (trend.direction === "unavailable") {
      node.textContent = "–";
      description = `${span}-day EMA percentage change unavailable: missing measurements, fewer than two measured days, or a zero starting value.`;
    } else {
      const magnitude = trend.magnitude.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      node.textContent = trend.direction === "flat" ? "0.0%" : `${indicator === "up" ? "↑" : "↓"} ${trend.direction === "up" ? "+" : "−"}${magnitude}%`;
      description = `${span}-day EMA ${trend.direction === "flat" ? "unchanged" : `${trend.direction} ${magnitude}%`}, ${formatDate(trend.startDate, true)} to ${formatDate(trend.endDate, true)}.`;
      if (state.model.key === "resting_hr" && trend.direction !== "flat") {
        description += ` ${indicator === "up" ? "Upward" : "Downward"} arrow reflects the preference for a lower resting heart rate.`;
      }
    }
    node.title = description;
    node.setAttribute("aria-label", description);
    return description;
  }
  function setInspection(card, date, force = false) {
    const state = chartStates.get(card);
    if (!state || (!force && state.selectedDate === date)) return;
    state.selectedDate = date;
    const readout = inspectionModel(state.model, state.window.rows, date);
    writeReadout(card, readout);
    const trendDescription = writeTrend(card, state, date);
    const { hoverLine, hoverPoint, x, y } = state.geometry;
    hoverLine.setAttribute("visibility", date ? "visible" : "hidden");
    hoverPoint.setAttribute("visibility", date && validValue(readout.value) ? "visible" : "hidden");
    if (date) {
      hoverLine.setAttribute("x1", x(date));
      hoverLine.setAttribute("x2", x(date));
      if (validValue(readout.value)) {
        hoverPoint.setAttribute("cx", x(date));
        hoverPoint.setAttribute("cy", y(readout.value));
      }
    }
    const unit = validValue(readout.value) && METRICS[readout.key].unit ? ` ${METRICS[readout.key].unit}` : "";
    const announcement = `${readout.label}: ${readout.displayValue}${unit}. ${readout.detail}. ${trendDescription}`;
    state.container.setAttribute("aria-label", `${announcement} Use left and right arrows to inspect days, Home or End to jump, and Escape to restore the overview.`);
    state.geometry.svg.setAttribute("aria-label", date ? announcement : state.geometry.description);
    state.geometry.title.textContent = date ? announcement : state.geometry.description;
    chartAnnouncements.get(card).textContent = announcement;
    scheduleConnections();
  }
  function inspectPointer(card, event) {
    const state = chartStates.get(card);
    if (!state) return;
    const bounds = state.geometry.svg.getBoundingClientRect();
    if (!bounds.width) return;
    const svgX = (event.clientX - bounds.left) * state.geometry.width / bounds.width;
    const date = nearestCalendarDay(state.window, (svgX - state.geometry.pad.l) / state.geometry.plotWidth);
    if (date) setInspection(card, date);
  }
  function setupChartInteraction(card) {
    const container = card.querySelector("[data-metric-chart]");
    container.classList.add("health-chart-interactive");
    container.tabIndex = 0;
    container.setAttribute("role", "group");
    const announcement = document.createElement("span");
    announcement.className = "health-visually-hidden";
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    card.append(announcement);
    chartAnnouncements.set(card, announcement);
    container.addEventListener("pointermove", event => inspectPointer(card, event), { passive: true });
    container.addEventListener("pointerdown", event => inspectPointer(card, event), { passive: true });
    container.addEventListener("pointerleave", event => {
      if (event.pointerType !== "touch") setInspection(card, null);
    });
    container.addEventListener("pointercancel", () => setInspection(card, null));
    container.addEventListener("focus", () => {
      const state = chartStates.get(card);
      if (state && !state.selectedDate) setInspection(card, state.window.end);
    });
    container.addEventListener("blur", () => setInspection(card, null));
    container.addEventListener("keydown", event => {
      const state = chartStates.get(card);
      if (!state || !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Escape") { setInspection(card, null); return; }
      if (event.key === "Home") { setInspection(card, state.window.start); return; }
      if (event.key === "End") { setInspection(card, state.window.end); return; }
      const next = timestamp(state.selectedDate || state.window.end) + (event.key === "ArrowLeft" ? -DAY : DAY);
      setInspection(card, isoDay(Math.max(timestamp(state.window.start), Math.min(timestamp(state.window.end), next))));
    });
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
    const emaSpan = EMA_SPANS[range];
    $("#health-ema-label").textContent = `${emaSpan}-day EMA`;
    page.querySelectorAll("[data-range]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.range === range)));
    cards.forEach(card => {
      const model = models.get(card.dataset.healthMetric);
      model.emaSpan = emaSpan;
      model.ema = emaSeries(allRows, model.key, emaSpan).filter(row => row.date >= window.start && row.date <= window.end);
      const container = card.querySelector("[data-metric-chart]");
      const previous = chartStates.get(card);
      const selectedDate = previous?.range === range && previous.selectedDate >= window.start && previous.selectedDate <= window.end ? previous.selectedDate : null;
      const geometry = drawChart(container, window.rows, model, window);
      chartStates.set(card, { container, model, window, range, geometry, selectedDate });
      setInspection(card, selectedDate, true);
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
  cards.forEach(setupChartInteraction);
  document.addEventListener("pointerdown", event => {
    cards.forEach(card => {
      const container = card.querySelector("[data-metric-chart]");
      if (!container.contains(event.target)) setInspection(card, null);
    });
  }, { passive: true });
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
