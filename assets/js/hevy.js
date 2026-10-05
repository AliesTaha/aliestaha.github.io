/* Public Hevy summaries. API credentials stay in the private Mac updater. */
(() => {
  "use strict";
  const panel = document.querySelector("[data-lifting-url]");
  if (!panel) return;
  const body = panel.closest("#body-panel");
  const $ = selector => panel.querySelector(selector);
  const chart = $("[data-lifting-chart]");
  const strengthChart = $("[data-strength-chart]");
  const room = $("[data-gym-room]");
  const traveler = $("[data-gym-traveler]");
  const route = $("[data-gym-route]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const status = $(".lifting-status");
  const DAY = 86400000;
  const DAYS = { W: 7, M: 30 };
  const KEYS = ["sessions", "working_sets", "volume_kg"];
  const EXERCISES = ["bench", "squat", "pullups", "curls", "rows"];
  const finite = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const stamp = date => Date.parse(`${date}T00:00:00Z`);
  const day = value => new Date(value).toISOString().slice(0, 10);
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(stamp(value)) && day(stamp(value)) === value;
  const dateLabel = (date, year = false) => new Date(stamp(date)).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
  const number = (value, digits = 0) => finite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: digits }) : "–";
  let publication = null;
  let rows = [];
  let range = "M";
  let selected = null;
  let geometry = null;
  let inFlight = false;
  let refreshFailed = false;
  let renderedWidth = 0;
  let strength = [];
  let exercise = "bench";
  let strengthSelected = null;
  let strengthGeometry = null;
  let strengthWidth = 0;
  let sceneExercise = "bench";
  let sceneDestination = "bench";
  let roomAnimations = [];
  let roomJourney = 0;

  function stationPosition(key) {
    const station = $(`[data-gym-station="${key}"]`);
    const style = window.getComputedStyle(station);
    return { x: Number(style.getPropertyValue("--station-x")), y: Number(style.getPropertyValue("--station-y")) };
  }
  function showStation(key) {
    panel.querySelectorAll("[data-gym-station]").forEach(station => station.classList.toggle("is-active", station.dataset.gymStation === key));
  }
  function finishJourney(key) {
    roomJourney += 1;
    roomAnimations.forEach(animation => animation.cancel());
    roomAnimations = [];
    sceneExercise = sceneDestination = key;
    if (!room) return;
    const position = stationPosition(key);
    traveler.style.left = `${position.x}%`;
    traveler.style.top = `${position.y}%`;
    traveler.style.opacity = "0";
    room.classList.remove("is-moving");
    showStation(key);
  }
  function visitStation(key) {
    if (!room || key === sceneDestination) return;
    if (reducedMotion.matches || !traveler.animate || !room.clientWidth || document.hidden || body?.hidden) return finishJourney(key);
    const from = room.classList.contains("is-moving")
      ? { x: parseFloat(window.getComputedStyle(traveler).left) / room.clientWidth * 100, y: parseFloat(window.getComputedStyle(traveler).top) / room.clientHeight * 100 }
      : stationPosition(sceneExercise);
    const to = stationPosition(key);
    const journey = ++roomJourney;
    roomAnimations.forEach(animation => animation.cancel());
    roomAnimations = [];
    sceneDestination = key;
    room.classList.add("is-moving");
    showStation(null);
    traveler.style.setProperty("--facing", to.x < from.x ? "-1" : "1");
    const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 4 };
    const scale = y => .73 + y / 350;
    const frame = (position, opacity, offset) => ({ left: `${position.x}%`, top: `${position.y}%`, transform: `scale(${scale(position.y)})`, opacity, offset });
    route.setAttribute("d", `M${from.x * 10},${from.y * 6.2} Q${middle.x * 10},${(middle.y - 4) * 6.2} ${to.x * 10},${to.y * 6.2}`);
    const travel = traveler.animate([
      frame(from, 0, 0), frame(from, 1, .1), frame(middle, 1, .48), frame(to, 1, .88), frame(to, 0, 1)
    ], { duration: 610, delay: 90, easing: "cubic-bezier(.3,.05,.5,1)", fill: "both" });
    const trail = route.parentElement.animate([
      { opacity: 0, offset: 0 }, { opacity: .32, offset: .3 }, { opacity: .2, offset: .8 }, { opacity: 0, offset: 1 }
    ], { duration: 700, fill: "both" });
    roomAnimations = [travel, trail];
    travel.finished.then(() => { if (journey === roomJourney) finishJourney(key); }).catch(() => {});
  }

  function normalize(data) {
    if (![1, 2].includes(data.schema_version) || !Array.isArray(data.daily) || data.daily.length > 12000) throw new Error("Invalid lifting summary");
    if (!Number.isFinite(Date.parse(data.generated_at))) throw new Error("Invalid publication time");
    const seen = new Set();
    const clean = data.daily.map(row => {
      if (!row || !validDate(row.date) || seen.has(row.date)) throw new Error("Invalid daily history");
      seen.add(row.date);
      const result = { date: row.date };
      KEYS.forEach(key => { result[key] = finite(row[key]) ? row[key] : null; });
      return result;
    }).sort((a, b) => a.date.localeCompare(b.date));
    return clean;
  }
  function normalizeStrength(items) {
    if (!Array.isArray(items)) return [];
    return EXERCISES.flatMap(key => {
      const item = items.find(item => item?.key === key);
      if (!item || typeof item.variant !== "string" || item.variant.length > 160 || !Array.isArray(item.series) || item.series.length > 12000) return [];
      const seen = new Set();
      const series = [];
      for (const point of item.series) {
        if (!point || !validDate(point.date) || seen.has(point.date)) return [];
        seen.add(point.date);
        series.push({ date: point.date, value: finite(point.value) ? point.value : null, weight_kg: finite(point.weight_kg) ? point.weight_kg : null, reps: Number.isInteger(point.reps) && point.reps > 0 ? point.reps : null });
      }
      return [{ key, variant: item.variant, metric_label: key === "pullups" ? "Best set" : "Estimated 1RM", unit: key === "pullups" ? "reps" : "kg", series: series.sort((a, b) => a.date.localeCompare(b.date)) }];
    });
  }
  function windowRows() {
    if (!rows.length) return { rows: [], start: null, end: null };
    const end = rows[rows.length - 1].date;
    const start = range === "ALL" ? rows[0].date : day(Math.max(stamp(rows[0].date), stamp(end) - (DAYS[range] - 1) * DAY));
    const byDate = new Map(rows.map(row => [row.date, row]));
    const visible = [];
    for (let value = stamp(start); value <= stamp(end); value += DAY) {
      const date = day(value);
      visible.push(byDate.get(date) || { date, sessions: null, working_sets: null, volume_kg: null });
    }
    return { rows: visible, start, end };
  }
  function svgElement(tag, attrs = {}, text = null) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== null) element.textContent = text;
    return element;
  }
  function writeTotals(window, date = null) {
    $("[data-lifting-period]").textContent = date
      ? `${dateLabel(date, true)} · Daily totals`
      : `${dateLabel(window.start, true)} – ${dateLabel(window.end, true)} · Period totals`;
    const visible = date ? window.rows.filter(row => row.date === date) : window.rows;
    KEYS.forEach(key => {
      const measured = visible.filter(row => finite(row[key]));
      const value = measured.length ? measured.reduce((sum, row) => sum + Math.round(row[key] * 100), 0) / 100 : null;
      const label = $(`[data-lifting-value="${key}"]`);
      label.textContent = number(value, key === "volume_kg" ? 1 : 0);
      label.title = number(value, key === "volume_kg" ? 2 : 0);
      $(`[data-lifting-coverage="${key}"]`).textContent = date
        ? measured.length ? "" : "No measurement"
        : measured.length < visible.length ? `${measured.length}/${visible.length} days recorded` : "";
    });
  }
  function inspect(date) {
    selected = date;
    if (!geometry) return;
    const { svg, title, line, dot, window, x, y, description } = geometry;
    const row = window.rows.find(item => item.date === date);
    const valid = finite(row?.volume_kg);
    const detail = date ? `${dateLabel(date)} · ${valid ? `${number(row.volume_kg, 1)} kg` : "No measurement"}` : "";
    writeTotals(window, date);
    line.setAttribute("visibility", date ? "visible" : "hidden");
    dot.setAttribute("visibility", date && valid ? "visible" : "hidden");
    if (date) {
      line.setAttribute("x1", x(date));
      line.setAttribute("x2", x(date));
      if (valid) { dot.setAttribute("cx", x(date)); dot.setAttribute("cy", y(row.volume_kg)); }
    }
    const accessible = date ? `${dateLabel(date, true)}. Sessions: ${number(row?.sessions)}. Working sets: ${number(row?.working_sets)}. External-load volume: ${detail}.` : description;
    title.textContent = accessible;
    svg.setAttribute("aria-label", accessible);
    chart.setAttribute("aria-label", `${accessible} Use left and right arrows to inspect days, Home and End to jump, and Escape to clear.`);
  }
  function renderChart(window) {
    if (body?.hidden || !chart.clientWidth) return;
    renderedWidth = chart.clientWidth;
    const width = Math.max(200, renderedWidth);
    const height = 154;
    const pad = { left: 4, right: 4, top: 20, bottom: 23 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const values = window.rows.filter(row => finite(row.volume_kg));
    const max = Math.max(1, ...values.map(row => row.volume_kg));
    const duration = stamp(window.end) - stamp(window.start);
    const x = date => duration ? pad.left + (stamp(date) - stamp(window.start)) / duration * plotWidth : width / 2;
    const y = value => pad.top + plotHeight * (1 - value / max);
    const description = `Daily external-load volume in kilograms, ${dateLabel(window.start, true)} to ${dateLabel(window.end, true)}. ${values.length} recorded days; ${window.rows.length - values.length} missing days.`;
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": description });
    const title = svgElement("title", {}, description);
    svg.append(title, svgElement("line", { class: "lifting-axis", x1: pad.left, x2: width - pad.right, y1: y(0), y2: y(0) }));
    svg.append(svgElement("text", { class: "lifting-axis-label", x: pad.left, y: height - 3 }, dateLabel(window.start, window.start.slice(0, 4) !== window.end.slice(0, 4))));
    if (window.start !== window.end) svg.append(svgElement("text", { class: "lifting-axis-label", x: width - pad.right, y: height - 3, "text-anchor": "end" }, dateLabel(window.end, window.start.slice(0, 4) !== window.end.slice(0, 4))));
    if (values.length) {
      svg.append(svgElement("text", { class: "lifting-axis-label", x: pad.left, y: 10 }, `${number(max, max < 10 ? 1 : 0)} kg`));
      let segment = [];
      const flush = () => {
        if (segment.length > 1) svg.append(svgElement("path", { class: "lifting-line", d: segment.map((row, index) => `${index ? "L" : "M"}${x(row.date).toFixed(2)},${y(row.volume_kg).toFixed(2)}`).join(" ") }));
        if (segment.length === 1 || range === "W") segment.forEach(row => svg.append(svgElement("circle", { class: "lifting-dot", cx: x(row.date), cy: y(row.volume_kg), r: 2.4 })));
        segment = [];
      };
      window.rows.forEach(row => { if (finite(row.volume_kg)) segment.push(row); else flush(); });
      flush();
    } else svg.append(svgElement("text", { class: "lifting-empty", x: width / 2, y: height / 2, "text-anchor": "middle" }, "No volume measurements in this period"));
    const line = svgElement("line", { class: "lifting-hover-line", y1: pad.top, y2: y(0), visibility: "hidden" });
    const dot = svgElement("circle", { class: "lifting-hover-dot", r: 3.5, visibility: "hidden" });
    svg.append(line, dot);
    chart.replaceChildren(svg);
    geometry = { svg, title, line, dot, window, x, y, width, pad, plotWidth, description };
    inspect(selected && selected >= window.start && selected <= window.end ? selected : null);
  }
  function inspectStrength(date) {
    strengthSelected = date;
    if (!strengthGeometry) return;
    const { item, points, svg, title, line, dot, x, y, description } = strengthGeometry;
    const point = date ? points.find(point => point.date === date) : points[points.length - 1];
    const measured = finite(point?.value);
    const value = $("[data-strength-value]");
    value.textContent = number(point?.value, item.unit === "kg" ? 1 : 0);
    value.title = measured ? `${number(point.value, 2)} ${item.unit}` : "";
    const set = point && measured && item.unit === "kg" && finite(point.weight_kg) && point.reps
      ? `${number(point.weight_kg, 2)} kg × ${point.reps} reps` : "";
    $("[data-strength-detail]").textContent = point
      ? `${dateLabel(point.date, true)}${measured ? set ? ` · ${set}` : "" : " · No comparable set"}`
      : "No sessions in this period";
    line.setAttribute("visibility", date && point ? "visible" : "hidden");
    dot.setAttribute("visibility", date && measured ? "visible" : "hidden");
    if (date && point) {
      line.setAttribute("x1", x(point.date));
      line.setAttribute("x2", x(point.date));
      if (measured) { dot.setAttribute("cx", x(point.date)); dot.setAttribute("cy", y(point.value)); }
    }
    const accessible = date && point
      ? `${item.variant}. ${dateLabel(point.date, true)}. ${measured ? `${item.metric_label}: ${number(point.value, 2)} ${item.unit}.${set ? ` Logged set: ${set}.` : ""}` : "No comparable set."}`
      : description;
    title.textContent = accessible;
    svg.setAttribute("aria-label", accessible);
    strengthChart.setAttribute("aria-label", `${accessible} Use left and right arrows to inspect workout days, Home and End to jump, and Escape to clear.`);
  }
  function renderStrength(window) {
    if (!strengthChart) return;
    panel.querySelectorAll("[data-strength-tab]").forEach(button => {
      const active = button.dataset.strengthTab === exercise;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $("#strength-panel").setAttribute("aria-labelledby", `strength-tab-${exercise}`);
    const item = strength.find(item => item.key === exercise);
    $("[data-strength-variant]").textContent = item?.variant || $("[aria-selected='true'][data-strength-tab]").textContent;
    $("[data-strength-metric]").textContent = item?.metric_label || (exercise === "pullups" ? "Best set" : "Estimated 1RM");
    $("[data-strength-unit]").textContent = item?.unit || (exercise === "pullups" ? "reps" : "kg");
    if (!item) {
      $("[data-strength-value]").textContent = "–";
      $("[data-strength-value]").title = "";
      $("[data-strength-detail]").textContent = "Strength history unavailable";
      strengthChart.replaceChildren();
      strengthChart.setAttribute("aria-label", "Strength history unavailable");
      strengthGeometry = null;
      return;
    }
    if (body?.hidden || !strengthChart.clientWidth) return;
    strengthWidth = strengthChart.clientWidth;
    const width = Math.max(200, strengthWidth), height = 170;
    const pad = { left: 5, right: 5, top: 22, bottom: 24 };
    const plotWidth = width - pad.left - pad.right;
    const points = item.series.filter(point => point.date >= window.start && point.date <= window.end);
    const measured = points.filter(point => finite(point.value));
    const values = measured.map(point => point.value);
    const low = values.length ? Math.max(0, Math.min(...values) * .9) : 0;
    const high = values.length ? Math.max(low + 1, Math.max(...values) * 1.06) : 1;
    const duration = stamp(window.end) - stamp(window.start);
    const x = date => duration ? pad.left + (stamp(date) - stamp(window.start)) / duration * plotWidth : width / 2;
    const y = value => pad.top + (height - pad.top - pad.bottom) * (1 - (value - low) / (high - low));
    const description = `${item.variant}. ${item.metric_label} in ${item.unit}, ${dateLabel(window.start, true)} to ${dateLabel(window.end, true)}. ${measured.length} measured workout days; ${points.length - measured.length} workout days without a comparable set. Points represent workout dates; days without sessions are not measurements.`;
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": description });
    const title = svgElement("title", {}, description);
    svg.append(title, svgElement("line", { class: "lifting-axis", x1: pad.left, x2: width - pad.right, y1: height - pad.bottom, y2: height - pad.bottom }));
    svg.append(svgElement("text", { class: "lifting-axis-label", x: pad.left, y: height - 3 }, dateLabel(window.start, window.start.slice(0, 4) !== window.end.slice(0, 4))));
    if (window.start !== window.end) svg.append(svgElement("text", { class: "lifting-axis-label", x: width - pad.right, y: height - 3, "text-anchor": "end" }, dateLabel(window.end, window.start.slice(0, 4) !== window.end.slice(0, 4))));
    if (measured.length) {
      svg.append(svgElement("text", { class: "lifting-axis-label", x: pad.left, y: 10 }, `${number(Math.max(...values), item.unit === "kg" ? 1 : 0)} ${item.unit}`));
      let segment = [];
      const flush = () => {
        if (segment.length > 1) svg.append(svgElement("path", { class: "strength-trail", d: segment.map((point, index) => `${index ? "L" : "M"}${x(point.date).toFixed(2)},${y(point.value).toFixed(2)}`).join(" ") }));
        segment = [];
      };
      points.forEach(point => { if (finite(point.value)) segment.push(point); else flush(); });
      flush();
      measured.forEach(point => svg.append(svgElement("circle", { class: "strength-point", cx: x(point.date), cy: y(point.value), r: range === "ALL" ? 2.2 : 2.8 })));
    } else svg.append(svgElement("text", { class: "lifting-empty", x: width / 2, y: height / 2, "text-anchor": "middle" }, points.length ? "No comparable sets" : "No sessions in this period"));
    const line = svgElement("line", { class: "lifting-hover-line", y1: pad.top, y2: height - pad.bottom, visibility: "hidden" });
    const dot = svgElement("circle", { class: "lifting-hover-dot", r: 4, visibility: "hidden" });
    svg.append(line, dot);
    strengthChart.replaceChildren(svg);
    strengthGeometry = { item, points, svg, title, line, dot, x, y, width, pad, plotWidth, window, description };
    inspectStrength(points.some(point => point.date === strengthSelected) ? strengthSelected : null);
  }
  function chooseExercise(key) {
    visitStation(key);
    exercise = key;
    strengthSelected = null;
    if (rows.length) renderStrength(windowRows());
  }
  function strengthPointer(event) {
    if (!strengthGeometry?.points.length) return;
    const { svg, width, pad, plotWidth, window, points } = strengthGeometry;
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width) return;
    const pixel = (event.clientX - bounds.left) * width / bounds.width;
    const fraction = Math.max(0, Math.min(1, (pixel - pad.left) / plotWidth));
    const target = stamp(window.start) + fraction * (stamp(window.end) - stamp(window.start));
    const closest = points.reduce((best, point) => Math.abs(stamp(point.date) - target) < Math.abs(stamp(best.date) - target) ? point : best);
    inspectStrength(closest.date);
  }
  function render() {
    if (!publication) return;
    $("[data-lifting-content]").hidden = !rows.length;
    if (!rows.length) {
      geometry = null;
      selected = null;
      chart.replaceChildren();
      strengthGeometry = null;
      strengthSelected = null;
      strengthChart?.replaceChildren();
      return;
    }
    const window = windowRows();
    panel.querySelectorAll("[data-lifting-range]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.liftingRange === range)));
    writeTotals(window);
    renderChart(window);
    renderStrength(window);
  }
  function freshness() {
    if (!publication) return;
    const updated = new Date(publication.generated_at);
    const stale = Date.now() - updated.getTime() > 3 * 3600000;
    const label = updated.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    status.dataset.stale = String(stale);
    $("[data-lifting-status]").textContent = `Hevy · Updated ${label}${!rows.length ? " · No workouts logged yet" : ""}${stale ? " · Update delayed" : ""}${refreshFailed ? " · Refresh unavailable; showing saved data" : ""}`;
  }
  async function load() {
    if (inFlight) return;
    inFlight = true;
    $("[data-lifting-retry]").hidden = true;
    if (!publication) $("[data-lifting-status]").textContent = "Hevy · Loading…";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(panel.dataset.liftingUrl, { cache: "no-store", credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error("Lifting summary unavailable");
      const data = await response.json();
      const received = normalize(data);
      publication = data;
      rows = received;
      strength = normalizeStrength(data.strength);
      refreshFailed = false;
      status.removeAttribute("data-error");
      freshness();
      render();
    } catch (_) {
      refreshFailed = true;
      status.dataset.error = "true";
      if (publication) freshness();
      else $("[data-lifting-status]").textContent = "Hevy · Workout data temporarily unavailable";
      $("[data-lifting-retry]").hidden = false;
    } finally {
      window.clearTimeout(timeout);
      inFlight = false;
    }
  }
  function pointer(event) {
    if (!geometry) return;
    const bounds = geometry.svg.getBoundingClientRect();
    if (!bounds.width) return;
    const pixel = (event.clientX - bounds.left) * geometry.width / bounds.width;
    const fraction = Math.max(0, Math.min(1, (pixel - geometry.pad.left) / geometry.plotWidth));
    const days = Math.round((stamp(geometry.window.end) - stamp(geometry.window.start)) / DAY);
    inspect(day(stamp(geometry.window.start) + Math.round(fraction * days) * DAY));
  }
  panel.querySelectorAll("[data-lifting-range]").forEach(button => button.addEventListener("click", () => { range = button.dataset.liftingRange; selected = null; strengthSelected = null; render(); }));
  $("[data-lifting-retry]").addEventListener("click", load);
  chart.addEventListener("pointermove", pointer, { passive: true });
  chart.addEventListener("pointerdown", pointer, { passive: true });
  chart.addEventListener("pointerleave", event => { if (event.pointerType !== "touch") inspect(null); });
  chart.addEventListener("pointercancel", () => inspect(null));
  chart.addEventListener("focus", () => { if (geometry) inspect(geometry.window.end); });
  chart.addEventListener("blur", () => inspect(null));
  chart.addEventListener("keydown", event => {
    if (!geometry || !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
    event.preventDefault();
    const window = geometry.window;
    if (event.key === "Escape") return inspect(null);
    const next = event.key === "Home" ? window.start : event.key === "End" ? window.end : day(stamp(selected || window.end) + (event.key === "ArrowLeft" ? -1 : 1) * DAY);
    inspect(next < window.start ? window.start : next > window.end ? window.end : next);
  });
  document.addEventListener("pointerdown", event => { if (!chart.contains(event.target)) inspect(null); }, { passive: true });
  panel.querySelectorAll("[data-strength-tab]").forEach(button => {
    button.addEventListener("click", () => chooseExercise(button.dataset.strengthTab));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = EXERCISES.indexOf(exercise);
      const next = event.key === "Home" ? 0 : event.key === "End" ? EXERCISES.length - 1 : (index + (event.key === "ArrowLeft" ? -1 : 1) + EXERCISES.length) % EXERCISES.length;
      chooseExercise(EXERCISES[next]);
      $(`[data-strength-tab="${EXERCISES[next]}"]`).focus();
    });
  });
  if (strengthChart) {
    strengthChart.addEventListener("pointermove", strengthPointer, { passive: true });
    strengthChart.addEventListener("pointerdown", strengthPointer, { passive: true });
    strengthChart.addEventListener("pointerleave", event => { if (event.pointerType !== "touch") inspectStrength(null); });
    strengthChart.addEventListener("pointercancel", () => inspectStrength(null));
    strengthChart.addEventListener("focus", () => { const points = strengthGeometry?.points; if (points?.length) inspectStrength(points[points.length - 1].date); });
    strengthChart.addEventListener("blur", () => inspectStrength(null));
    strengthChart.addEventListener("keydown", event => {
      const points = strengthGeometry?.points;
      if (!points?.length || !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Escape") return inspectStrength(null);
      const index = strengthSelected ? points.findIndex(point => point.date === strengthSelected) : points.length - 1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, index + (event.key === "ArrowLeft" ? -1 : 1)));
      inspectStrength(points[next].date);
    });
    document.addEventListener("pointerdown", event => { if (!strengthChart.contains(event.target)) inspectStrength(null); }, { passive: true });
  }
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => { if (publication && !body?.hidden && (chart.clientWidth !== renderedWidth || strengthChart && strengthChart.clientWidth !== strengthWidth)) render(); });
    observer.observe(chart);
    if (strengthChart) observer.observe(strengthChart);
  }
  window.setInterval(freshness, 60000);
  window.setInterval(() => { if (!document.hidden && !body?.hidden) load(); }, 5 * 60000);
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) finishJourney(exercise); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) finishJourney(exercise); else if (!body?.hidden) load(); });
  document.addEventListener("site:sectionchange", event => { if (event.detail?.section === "body") { render(); if (!document.hidden) load(); } else finishJourney(exercise); });
  load();
})();
