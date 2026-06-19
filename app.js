const STORAGE_KEY = "freshwater-log:v1";
const COLORS = ["#0d6f77", "#df6b57", "#4b7dbd", "#d69b35", "#7c5fb2", "#318765", "#b6537c"];

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
  eventDate: document.getElementById("eventDate"),
  chartWindow: document.getElementById("chartWindow"),
  historyTable: document.getElementById("historyTable"),
  timelineList: document.getElementById("timelineList"),
  notesArea: document.getElementById("notesArea"),
  notesSaved: document.getElementById("notesSaved"),
  latestSummary: document.getElementById("latestSummary"),
  parameterCount: document.getElementById("parameterCount"),
  eventCount: document.getElementById("eventCount"),
  hardUpdate: document.getElementById("hardUpdate"),
  exportData: document.getElementById("exportData"),
  trendChart: document.getElementById("trendChart"),
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
  els.eventDate.value = today();
  els.notesArea.value = state.notes || "";

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  els.parameterForm.addEventListener("submit", addParameter);
  els.readingForm.addEventListener("submit", addReading);
  els.eventForm.addEventListener("submit", addEvent);
  els.chartWindow.addEventListener("change", render);
  els.hardUpdate.addEventListener("click", hardUpdate);
  els.exportData.addEventListener("click", exportData);
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

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function activateTab(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
  if (name === "charts") drawTrendChart();
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
    values
  });

  els.readingForm.reset();
  els.readingDate.value = today();
  persist();
  render();
}

function addEvent(event) {
  event.preventDefault();
  const title = document.getElementById("eventTitle").value.trim();
  const details = document.getElementById("eventDetails").value.trim();
  if (!title) return;

  state.events.push({
    id: uid(),
    date: els.eventDate.value || today(),
    title,
    details
  });

  els.eventForm.reset();
  els.eventDate.value = today();
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

function saveNotes() {
  state.notes = els.notesArea.value;
  persist();
  els.notesSaved.textContent = "Saved";
}

function render() {
  renderSummary();
  renderParameterList();
  renderReadingInputs();
  renderHistoryTable();
  renderTimeline();
  drawTrendChart();
}

function renderSummary() {
  const latest = [...state.readings].sort((a, b) => b.date.localeCompare(a.date))[0];
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

function renderHistoryTable() {
  const rows = filteredReadings()
    .flatMap((reading) => Object.entries(reading.values).map(([parameterId, value]) => {
      const parameter = state.parameters.find((item) => item.id === parameterId);
      return parameter ? { reading, parameter, value } : null;
    }).filter(Boolean))
    .sort((a, b) => b.reading.date.localeCompare(a.reading.date));

  if (!rows.length) {
    els.historyTable.innerHTML = `<tr><td colspan="5">No readings yet.</td></tr>`;
    return;
  }

  els.historyTable.innerHTML = rows.map(({ reading, parameter, value }) => {
    const status = getStatus(parameter, value);
    return `
      <tr>
        <td>${formatDate(reading.date)}</td>
        <td>${escapeHtml(parameter.name)}</td>
        <td>${value}${parameter.unit ? ` ${escapeHtml(parameter.unit)}` : ""}</td>
        <td><span class="badge ${status.key}">${status.label}</span></td>
        <td>
          <button class="delete-button" type="button" data-delete-reading="${reading.id}" aria-label="Delete reading" title="Delete">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  els.historyTable.querySelectorAll("[data-delete-reading]").forEach((button) => {
    button.addEventListener("click", () => deleteReading(button.dataset.deleteReading));
  });
}

function renderTimeline() {
  const combined = [
    ...state.events.map((event) => ({ type: "event", ...event })),
    ...state.readings.map((reading) => ({ type: "reading", ...reading }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (!combined.length) {
    els.timelineList.innerHTML = `<li><span class="timeline-meta">No timeline items</span></li>`;
    return;
  }

  els.timelineList.innerHTML = combined.map((item) => {
    if (item.type === "event") {
      return `
        <li>
          <span class="timeline-meta">${formatDate(item.date)} · Event</span>
          <strong class="timeline-title">${escapeHtml(item.title)}</strong>
          ${item.details ? `<p class="timeline-body">${escapeHtml(item.details)}</p>` : ""}
          <button class="delete-button timeline-delete" type="button" data-delete-event="${item.id}" aria-label="Delete event" title="Delete">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>
          </button>
        </li>
      `;
    }

    const summary = Object.entries(item.values).map(([parameterId, value]) => {
      const parameter = state.parameters.find((entry) => entry.id === parameterId);
      return parameter ? `${parameter.name} ${value}${parameter.unit ? ` ${parameter.unit}` : ""}` : "";
    }).filter(Boolean).join(", ");

    return `
      <li>
        <span class="timeline-meta">${formatDate(item.date)} · Reading</span>
        <strong class="timeline-title">${escapeHtml(summary || "Reading")}</strong>
        <button class="delete-button timeline-delete" type="button" data-delete-reading="${item.id}" aria-label="Delete reading" title="Delete">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>
        </button>
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

function filteredReadings() {
  const windowValue = els.chartWindow.value;
  if (windowValue === "all") return state.readings;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(windowValue));
  return state.readings.filter((reading) => new Date(`${reading.date}T00:00:00`) >= cutoff);
}

function drawTrendChart() {
  const canvas = els.trendChart;
  const ctx = canvas.getContext("2d");
  const scale = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * scale));
  canvas.height = Math.floor(310 * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const width = canvas.width / scale;
  const height = canvas.height / scale;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);

  const points = filteredReadings()
    .flatMap((reading) => Object.entries(reading.values).map(([parameterId, value]) => {
      const parameter = state.parameters.find((item) => item.id === parameterId);
      return parameter ? { date: reading.date, time: new Date(`${reading.date}T00:00:00`).getTime(), parameter, value } : null;
    }).filter(Boolean))
    .sort((a, b) => a.time - b.time);

  if (!points.length) {
    drawEmptyChart(ctx, width, height, "No chart data");
    return;
  }

  const padding = { top: 24, right: 18, bottom: 38, left: 42 };
  const minTime = Math.min(...points.map((point) => point.time));
  const maxTime = Math.max(...points.map((point) => point.time));
  const values = points.map((point) => point.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  drawGrid(ctx, width, height, padding, minValue, maxValue);

  state.parameters.forEach((parameter) => {
    const series = points.filter((point) => point.parameter.id === parameter.id);
    if (!series.length) return;

    ctx.beginPath();
    series.forEach((point, index) => {
      const x = mapValue(point.time, minTime, maxTime, padding.left, width - padding.right);
      const y = mapValue(point.value, minValue, maxValue, height - padding.bottom, padding.top);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = parameter.color;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    series.forEach((point) => {
      const x = mapValue(point.time, minTime, maxTime, padding.left, width - padding.right);
      const y = mapValue(point.value, minValue, maxValue, height - padding.bottom, padding.top);
      const status = getStatus(parameter, point.value);
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = status.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  });

  drawLegend(ctx, state.parameters, width, height);
}

function drawGrid(ctx, width, height, padding, minValue, maxValue) {
  ctx.strokeStyle = "#d9e5e2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#607174";
  ctx.font = "12px system-ui";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 4) * i;
    const value = maxValue - ((maxValue - minValue) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(trimNumber(value), 8, y + 4);
  }
}

function drawLegend(ctx, parameters, width, height) {
  let x = 44;
  const y = height - 14;
  ctx.font = "12px system-ui";
  parameters.forEach((parameter) => {
    const label = parameter.name.slice(0, 14);
    ctx.fillStyle = parameter.color;
    ctx.fillRect(x, y - 9, 9, 9);
    ctx.fillStyle = "#10272b";
    ctx.fillText(label, x + 13, y);
    x += ctx.measureText(label).width + 38;
    if (x > width - 90) x = 44;
  });
}

function drawEmptyChart(ctx, width, height, text) {
  ctx.fillStyle = "#607174";
  ctx.font = "15px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
  ctx.textAlign = "left";
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
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a6674");
    gradient.addColorStop(1, "#092f38");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 7; i += 1) {
      const x = ((frame * (0.35 + i * 0.05)) + i * 91) % (width + 60) - 30;
      const y = 28 + i * 20 + Math.sin(frame / 20 + i) * 6;
      ctx.beginPath();
      ctx.ellipse(x, y, 40 + i * 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawPlant(ctx, width * 0.08, height, "#318765", frame);
    drawPlant(ctx, width * 0.87, height, "#64a67b", frame + 30);
    drawFish(ctx, width * 0.55 + Math.sin(frame / 55) * width * 0.22, height * 0.48, "#df6b57", frame);
    drawFish(ctx, width * 0.26 + Math.cos(frame / 65) * width * 0.15, height * 0.35, "#d69b35", frame + 20);

    frame += 1;
    requestAnimationFrame(draw);
  }

  draw();
}

function drawFish(ctx, x, y, color, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.cos(frame / 80) > 0 ? 1 : -1, 1);
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

function drawPlant(ctx, x, height, color, frame) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i += 1) {
    const base = x + i * 9;
    ctx.beginPath();
    ctx.moveTo(base, height);
    ctx.quadraticCurveTo(base + Math.sin(frame / 26 + i) * 18, height - 58, base + Math.cos(frame / 35 + i) * 14, height - 112 + i * 9);
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

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapValue(value, inMin, inMax, outMin, outMax) {
  if (inMin === inMax) return (outMin + outMax) / 2;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function trimNumber(value) {
  return Number.parseFloat(value.toFixed(2)).toString();
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
