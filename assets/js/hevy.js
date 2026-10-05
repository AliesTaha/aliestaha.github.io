/* Hevy daily summaries only. API credentials stay in the private Mac updater. */
(() => {
  "use strict";
  const panel = document.querySelector("[data-lifting-url]");
  if (!panel) return;
  const body = panel.closest("#body-panel");
  const $ = selector => panel.querySelector(selector);
  const chart = $("[data-lifting-chart]");
  const status = $(".lifting-status");
  const DAY = 86400000;
  const DAYS = { W: 7, M: 30 };
  const KEYS = ["sessions", "working_sets", "volume_kg"];
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

  function normalize(data) {
    if (data.schema_version !== 1 || !Array.isArray(data.daily) || data.daily.length > 12000) throw new Error("Invalid lifting summary");
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
    svg.append(svgElement("text", { class: "lifting-axis-label", x: pad.left, y: height - 3 }, dateLabel(window.start)));
    if (window.start !== window.end) svg.append(svgElement("text", { class: "lifting-axis-label", x: width - pad.right, y: height - 3, "text-anchor": "end" }, dateLabel(window.end)));
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
  function render() {
    if (!publication) return;
    $("[data-lifting-content]").hidden = !rows.length;
    if (!rows.length) {
      geometry = null;
      selected = null;
      chart.replaceChildren();
      return;
    }
    const window = windowRows();
    panel.querySelectorAll("[data-lifting-range]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.liftingRange === range)));
    writeTotals(window);
    renderChart(window);
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
  panel.querySelectorAll("[data-lifting-range]").forEach(button => button.addEventListener("click", () => { range = button.dataset.liftingRange; selected = null; render(); }));
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
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => { if (publication && !body?.hidden && chart.clientWidth !== renderedWidth) render(); }).observe(chart);
  window.setInterval(freshness, 60000);
  window.setInterval(() => { if (!document.hidden && !body?.hidden) load(); }, 5 * 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !body?.hidden) load(); });
  document.addEventListener("site:sectionchange", event => { if (event.detail?.section === "body") { render(); if (!document.hidden) load(); } });
  load();
})();
