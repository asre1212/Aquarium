const STORAGE_KEY = "freshwater-log:v1";
const COLORS = ["#0d6f77", "#df6b57", "#4b7dbd", "#d69b35", "#7c5fb2", "#318765", "#b6537c"];

const EVENT_TYPES = {
  waterChange: {
    label: "Water change",
    color: "#4b7dbd",
    icon: '<path d="M12 2s7 8.6 7 13a7 7 0 0 1-14 0c0-4.4 7-13 7-13z"/>'
  },
  dosing: {
    label: "Dosing",
    color: "#7c5fb2",
    icon: '<path d="M9 2h6M10 2v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.5L14 8V2"/>'
  },
  feeding: {
    label: "Feeding",
    color: "#d69b35",
    icon: '<circle cx="8" cy="9" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1.6" fill="currentColor" stroke="none"/><circle cx="11.5" cy="14" r="1.6" fill="currentColor" stroke="none"/><circle cx="7" cy="16" r="1.6" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none"/>'
  },
  maintenance: {
    label: "Maintenance",
    color: "#0d6f77",
    icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.8 7.8l-6.9 6.9a2.1 2.1 0 1 1-3-3l6.9-6.9a6 6 0 0 1 7.8-7.8l-3.4 3.4z"/>'
  },
  other: {
    label: "Other",
    color: "#607174",
    icon: '<path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5z"/>'
  }
};

const READING_ICON = '<path d="M4 19h16M4 15l4-4 4 3 4-6 4 3"/>';
const TREND_ICON = { up: "▲", down: "▼", flat: "▬" };

const state = loadState();

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  parameterForm: document.getElementById("parameterForm"),
  readingForm: document.getElementById("readingForm"),
  eventForm: document.getElementById("eventForm"),
  parameterList: document.getElementById("parameterList"),
  readingInputs: document.getElementById("readingInputs"),
  readingDate: document.getElementById("readingDate"),
  readingTime: document.getElementById("readingTime"),
  eventDate: document.getElementById("eventDate"),
  eventTime: document.getElementById("eventTime"),
  eventType: document.getElementById("eventType"),
  parameterSummaryTable: document.getElementById("parameterSummaryTable"),
  timelineList: document.getElementById("timelineList"),
  resetTimeline: document.getElementById("resetTimeline"),
  notesArea: document.getElementById("notesArea"),
  notesSaved: document.getElementById("notesSaved"),
  latestSummary: document.getElementById("latestSummary"),
  parameterCount: document.getElementById("parameterCount"),
  eventCount: document.getElementById("eventCount"),
  hardUpdate: document.getElementById("hardUpdate"),
  exportData: document.getElementById("exportData"),
  waterScene: document.getElementById("waterScene")
};

initialise();

function initialise() {
  els.parameterForm.reset();
  document.getElementById("paramName").value = "";
  document.getElementById("paramLow").value = "";
  document.getElementById("paramHigh").value = "";
  document.getElementById("paramUnit").value = "";
  els.readingDate.value = today();
  els.readingTime.value = nowTime();
  els.eventDate.value = today();
  els.eventTime.value = nowTime();
  els.notesArea.value = state.notes || "";

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  els.parameterForm.addEventListener("submit", addParameter);
  els.readingForm.addEventListener("submit", addReading);
  els.eventForm.addEventListener("submit", addEvent);
  els.hardUpdate.addEventListener("click", hardUpdate);
  els.exportData.addEventListener("click", exportData);
  els.resetTimeline.addEventListener("click", resetTimeline);
  els.notesArea.addEventListener("input", saveNotes);

  animateWater();
  render();
}

function loadState() {
  const fallback = {
    parameters: [],
    readings: [],
    events: [],
    notes: ""
  };

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function activateTab(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
}

function addParameter(event) {
  event.preventDefault();
  const name = document.getElementById("paramName").value.trim();
  const low = numberOrNull(document.getElementById("paramLow").value);
  const high = numberOrNull(document.getElementById("paramHigh").value);
  const unit = document.getElementById("paramUnit").value.trim();

  if (!name) return;

  state.parameters.push({
    id: uid(),
    name,
    low,
    high,
    unit,
    color: COLORS[state.parameters.length % COLORS.length]
  });

  els.parameterForm.reset();
  persist();
  render();
}

function addReading(event) {
  event.preventDefault();
  const values = {};
  state.parameters.forEach((parameter) => {
    const input = document.getElementById(`reading-${parameter.id}`);
    const value = numberOrNull(input?.value);
    if (value !== null) values[parameter.id] = value;
  });

  if (!Object.keys(values).length) return;

  state.readings.push({
    id: uid(),
    date: els.readingDate.value || today(),
    time: els.readingTime.value || nowTime(),
    values
  });

  els.readingForm.reset();
  els.readingDate.value = today();
  els.readingTime.value = nowTime();
  persist();
  render();
}

function addEvent(event) {
  event.preventDefault();
  const title = document.getElementById("eventTitle").value.trim();
  const details = document.getElementById("eventDetails").value.trim();
  const type = els.eventType.value || "other";
  if (!title) return;

  state.events.push({
    id: uid(),
    date: els.eventDate.value || today(),
    time: els.eventTime.value || nowTime(),
    type,
    title,
    details
  });

  els.eventForm.reset();
  els.eventDate.value = today();
  els.eventTime.value = nowTime();
  persist();
  render();
}

function deleteParameter(id) {
  const index = state.parameters.findIndex((parameter) => parameter.id === id);
  if (index === -1) return;

  state.parameters.splice(index, 1);
  state.readings.forEach((reading) => delete reading.values[id]);
  state.readings = state.readings.filter((reading) => Object.keys(reading.values).length);
  persist();
  render();
}

function deleteEvent(id) {
  state.events = state.events.filter((event) => event.id !== id);
  persist();
  render();
}

function deleteReading(id) {
  state.readings = state.readings.filter((reading) => reading.id !== id);
  persist();
  render();
}

function resetTimeline() {
  if (!state.readings.length && !state.events.length) return;
  const confirmed = window.confirm("Delete the entire timeline? This removes every reading and event. This cannot be undone.");
  if (!confirmed) return;

  state.readings = [];
  state.events = [];
  persist();
  render();
}

function saveNotes() {
  state.notes = els.notesArea.value;
  persist();
  els.notesSaved.textContent = "Saved";
}

function render() {
  renderSummary();
  renderParameterList();
  renderReadingInputs();
  renderParameterSummary();
  renderTimeline();
}

function renderSummary() {
  const latest = [...state.readings].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))[state.readings.length - 1];
  els.parameterCount.textContent = state.parameters.length;
  els.eventCount.textContent = state.events.length;

  if (!latest) {
    els.latestSummary.textContent = "No readings";
    return;
  }

  const firstValue = Object.entries(latest.values)[0];
  const parameter = state.parameters.find((item) => item.id === firstValue?.[0]);
  els.latestSummary.textContent = parameter ? `${parameter.name} ${firstValue[1]}${parameter.unit ? ` ${parameter.unit}` : ""}` : latest.date;
}

function renderParameterList() {
  if (!state.parameters.length) {
    els.parameterList.innerHTML = `<p class="empty-state">Add ammonia, nitrite, nitrate, pH, temperature, or any custom value.</p>`;
    return;
  }

  els.parameterList.innerHTML = state.parameters.map((parameter) => {
    const range = formatRange(parameter);
    return `
      <div class="parameter-item">
        <span class="swatch" style="background:${parameter.color}"></span>
        <div>
          <strong>${escapeHtml(parameter.name)}</strong>
          <small>${escapeHtml(range)}</small>
        </div>
        <button class="delete-button" type="button" data-delete-param="${parameter.id}" aria-label="Delete ${escapeHtml(parameter.name)}" title="Delete">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>
        </button>
      </div>
    `;
  }).join("");

  els.parameterList.querySelectorAll("[data-delete-param]").forEach((button) => {
    button.addEventListener("click", () => deleteParameter(button.dataset.deleteParam));
  });
}

function renderReadingInputs() {
  if (!state.parameters.length) {
    els.readingInputs.innerHTML = `<p class="empty-state">Create a parameter first.</p>`;
    return;
  }

  els.readingInputs.innerHTML = state.parameters.map((parameter) => `
    <label>
      <span>${escapeHtml(parameter.name)}${parameter.unit ? ` (${escapeHtml(parameter.unit)})` : ""}</span>
      <input id="reading-${parameter.id}" type="number" step="any" inputmode="decimal" placeholder="${escapeHtml(formatRange(parameter))}">
    </label>
  `).join("");
}

function sortKey(item) {
  return `${item.date}T${item.time || "00:00"}`;
}

function parameterSeries(parameterId) {
  return state.readings
    .filter((reading) => reading.values[parameterId] !== undefined)
    .map((reading) => ({ value: reading.values[parameterId], key: sortKey(reading) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function computeTrend(parameterId) {
  const series = parameterSeries(parameterId);
  if (!series.length) return null;

  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  let direction = "flat";
  if (previous) {
    if (latest.value > previous.value) direction = "up";
    else if (latest.value < previous.value) direction = "down";
  }

  return { latest: latest.value, direction, series: series.slice(-8).map((point) => point.value) };
}

function renderParameterSummary() {
  if (!state.parameters.length) {
    els.parameterSummaryTable.innerHTML = `<tr><td colspan="4">Add a parameter on the Log tab.</td></tr>`;
    return;
  }

  els.parameterSummaryTable.innerHTML = state.parameters.map((parameter) => {
    const trend = computeTrend(parameter.id);
    const nameCell = `<span class="swatch-inline" style="background:${parameter.color}"></span>${escapeHtml(parameter.name)}`;

    if (!trend) {
      return `
        <tr>
          <td>${nameCell}</td>
          <td colspan="3" class="muted-cell">No readings yet</td>
        </tr>
      `;
    }

    const status = getStatus(parameter, trend.latest);
    return `
      <tr>
        <td>${nameCell}</td>
        <td class="latest-cell">
          <span>${trend.latest}${parameter.unit ? ` ${escapeHtml(parameter.unit)}` : ""}</span>
          ${sparkline(trend.series, parameter.color)}
        </td>
        <td><span class="badge ${status.key}">${status.label}</span></td>
        <td><span class="trend trend-${trend.direction}" title="${trend.direction}">${TREND_ICON[trend.direction]}</span></td>
      </tr>
    `;
  }).join("");
}

function sparkline(values, color) {
  if (values.length < 2) return "";
  const width = 64;
  const height = 24;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;

  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function buildTimelineEntries() {
  const items = [
    ...state.events.map((event) => ({ ...event, kind: "event" })),
    ...state.readings.map((reading) => ({ ...reading, kind: "reading" }))
  ].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  const entries = [];
  let pending = null;

  function flush() {
    if (pending && pending.items.length) {
      entries.push({ kind: "readingGroup", date: pending.date, items: pending.items });
    }
    pending = null;
  }

  items.forEach((item) => {
    if (item.kind === "event") {
      flush();
      entries.push(item);
      return;
    }

    if (pending && pending.date === item.date) {
      pending.items.push(item);
    } else {
      flush();
      pending = { date: item.date, items: [item] };
    }
  });
  flush();

  return entries.reverse();
}

function renderTimeline() {
  const entries = buildTimelineEntries();

  if (!entries.length) {
    els.timelineList.innerHTML = `<li class="timeline-empty"><span class="timeline-meta">No timeline items yet</span></li>`;
    return;
  }

  els.timelineList.innerHTML = entries.map((entry) => {
    if (entry.kind === "event") {
      const meta = EVENT_TYPES[entry.type] || EVENT_TYPES.other;
      return `
        <li class="timeline-item timeline-event" style="--accent:${meta.color}">
          <span class="timeline-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${meta.icon}</svg></span>
          <div class="timeline-content">
            <span class="timeline-meta">${formatDate(entry.date)} &middot; ${formatTime(entry.time)} &middot; ${escapeHtml(meta.label)}</span>
            <strong class="timeline-title">${escapeHtml(entry.title)}</strong>
            ${entry.details ? `<p class="timeline-body">${escapeHtml(entry.details)}</p>` : ""}
          </div>
          <button class="delete-button timeline-delete" type="button" data-delete-event="${entry.id}" aria-label="Delete event" title="Delete">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>
          </button>
        </li>
      `;
    }

    const rows = entry.items.map((reading) => {
      const chips = Object.entries(reading.values).map(([parameterId, value]) => {
        const parameter = state.parameters.find((item) => item.id === parameterId);
        if (!parameter) return "";
        const status = getStatus(parameter, value);
        return `<span class="value-chip ${status.key}">${escapeHtml(parameter.name)} ${value}${parameter.unit ? escapeHtml(parameter.unit) : ""}</span>`;
      }).filter(Boolean).join("");

      return `
        <div class="reading-row">
          <span class="reading-time">${formatTime(reading.time)}</span>
          <div class="value-chips">${chips}</div>
          <button class="delete-button timeline-delete" type="button" data-delete-reading="${reading.id}" aria-label="Delete reading" title="Delete">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>
          </button>
        </div>
      `;
    }).join("");

    return `
      <li class="timeline-item timeline-reading" style="--accent:#318765">
        <span class="timeline-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${READING_ICON}</svg></span>
        <div class="timeline-content">
          <span class="timeline-meta">${formatDate(entry.date)} &middot; Readings</span>
          <div class="reading-rows">${rows}</div>
        </div>
      </li>
    `;
  }).join("");

  els.timelineList.querySelectorAll("[data-delete-event]").forEach((button) => {
    button.addEventListener("click", () => deleteEvent(button.dataset.deleteEvent));
  });
  els.timelineList.querySelectorAll("[data-delete-reading]").forEach((button) => {
    button.addEventListener("click", () => deleteReading(button.dataset.deleteReading));
  });
}

function animateWater() {
  const canvas = els.waterScene;
  const ctx = canvas.getContext("2d");
  let frame = 0;

  function draw() {
    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * scale);
    canvas.height = Math.floor(rect.height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const width = canvas.width / scale;
    const height = canvas.height / scale;
    const sizeScale = Math.max(0.42, Math.min(1, height / 190));

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a6674");
    gradient.addColorStop(1, "#092f38");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i += 1) {
      const x = ((frame * (0.35 + i * 0.05)) + i * 91) % (width + 60) - 30;
      const y = height * 0.16 + i * (height / 8) + Math.sin(frame / 20 + i) * 4 * sizeScale;
      ctx.beginPath();
      ctx.ellipse(x, y, (24 + i * 3) * sizeScale, 5 * sizeScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawPlant(ctx, width * 0.08, height, "#318765", frame, sizeScale);
    drawPlant(ctx, width * 0.87, height, "#64a67b", frame + 30, sizeScale);
    drawFish(ctx, width * 0.55 + Math.sin(frame / 55) * width * 0.22, height * 0.46, "#df6b57", frame, sizeScale);
    drawFish(ctx, width * 0.26 + Math.cos(frame / 65) * width * 0.15, height * 0.32, "#d69b35", frame + 20, sizeScale);

    frame += 1;
    requestAnimationFrame(draw);
  }

  draw();
}

function drawFish(ctx, x, y, color, frame, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((Math.cos(frame / 80) > 0 ? 1 : -1) * scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(-43, -13);
  ctx.lineTo(-39, 0);
  ctx.lineTo(-43, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(13, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#10272b";
  ctx.beginPath();
  ctx.arc(14, -4, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlant(ctx, x, height, color, frame, scale) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i += 1) {
    const base = x + i * 9 * scale;
    ctx.beginPath();
    ctx.moveTo(base, height);
    ctx.quadraticCurveTo(
      base + Math.sin(frame / 26 + i) * 18 * scale,
      height - 58 * scale,
      base + Math.cos(frame / 35 + i) * 14 * scale,
      height - (112 - i * 9) * scale
    );
    ctx.stroke();
  }
}

function getStatus(parameter, value) {
  if (parameter.low !== null && value < parameter.low) return { key: "low", label: "Low", color: "#4b7dbd" };
  if (parameter.high !== null && value > parameter.high) return { key: "high", label: "High", color: "#df6b57" };
  if (parameter.low === null && parameter.high === null) return { key: "none", label: "Logged", color: "#607174" };
  return { key: "ok", label: "In range", color: "#318765" };
}

function formatRange(parameter) {
  const unit = parameter.unit ? ` ${parameter.unit}` : "";
  if (parameter.low !== null && parameter.high !== null) return `${parameter.low}-${parameter.high}${unit}`;
  if (parameter.low !== null) return `min ${parameter.low}${unit}`;
  if (parameter.high !== null) return `max ${parameter.high}${unit}`;
  return parameter.unit || "No range";
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportData() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `freshwater-log-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function hardUpdate() {
  els.hardUpdate.disabled = true;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  const url = new URL(window.location.href);
  url.searchParams.set("update", Date.now().toString());
  window.location.replace(url.toString());
}
