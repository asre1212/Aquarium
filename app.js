const STORAGE_KEY = "freshwater-log:v1";
const COLORS = ["#0d6f77", "#df6b57", "#4b7dbd", "#d69b35", "#7c5fb2", "#318765", "#b6537c"];
const TIMELINE_PAGE = 20;
const TEST_TIMERS = ["Ammonia", "Nitrite", "Nitrate"];

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
const TRASH_ICON = '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>';
const EDIT_ICON = '<path d="M12 20h9M16.7 3.3a2.2 2.2 0 0 1 3.1 3.1L7 19.2 3 20l.8-4L16.7 3.3z"/>';
const REPEAT_ICON = '<path d="M17 1l4 4-4 4M21 5H7a4 4 0 0 0-4 4v2m4 12-4-4 4-4M3 19h14a4 4 0 0 0 4-4v-2"/>';
const CLOSE_ICON = '<path d="M6 6l12 12M18 6 6 18"/>';

const state = loadState();

let editingReadingId = null;
let editingEventId = null;
let expandedParamId = null;
let timelineShown = TIMELINE_PAGE;
let activeTimers = [];
let undoSnapshot = null;
let toastTimer = null;

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
  saveReadingButton: document.getElementById("saveReadingButton"),
  cancelReadingEdit: document.getElementById("cancelReadingEdit"),
  eventDate: document.getElementById("eventDate"),
  eventTime: document.getElementById("eventTime"),
  eventType: document.getElementById("eventType"),
  eventSubmitButton: document.getElementById("eventSubmitButton"),
  cancelEventEdit: document.getElementById("cancelEventEdit"),
  parameterSummaryTable: document.getElementById("parameterSummaryTable"),
  timelineList: document.getElementById("timelineList"),
  resetTimeline: document.getElementById("resetTimeline"),
  notesArea: document.getElementById("notesArea"),
  notesSaved: document.getElementById("notesSaved"),
  latestSummary: document.getElementById("latestSummary"),
  parameterCount: document.getElementById("parameterCount"),
  lastWaterChange: document.getElementById("lastWaterChange"),
  hardUpdate: document.getElementById("hardUpdate"),
  importData: document.getElementById("importData"),
  importFile: document.getElementById("importFile"),
  exportData: document.getElementById("exportData"),
  waterScene: document.getElementById("waterScene"),
  timerMinutes: document.getElementById("timerMinutes"),
  timerButtons: document.getElementById("timerButtons"),
  timerList: document.getElementById("timerList"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  toastUndo: document.getElementById("toastUndo")
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
  els.cancelReadingEdit.addEventListener("click", cancelReadingEdit);
  els.cancelEventEdit.addEventListener("click", cancelEventEdit);
  els.hardUpdate.addEventListener("click", hardUpdate);
  els.importData.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importData);
  els.exportData.addEventListener("click", exportData);
  els.resetTimeline.addEventListener("click", resetTimeline);
  els.notesArea.addEventListener("input", saveNotes);
  els.toastUndo.addEventListener("click", undoLastAction);

  els.timerButtons.innerHTML = TEST_TIMERS.map((name) => `
    <button type="button" class="timer-chip" data-timer="${name}">${name}</button>
  `).join("");
  els.timerButtons.querySelectorAll("[data-timer]").forEach((button) => {
    button.addEventListener("click", () => startTimer(button.dataset.timer));
  });
  setInterval(tickTimers, 250);

  registerServiceWorker();
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
    const merged = { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    merged.readings = (merged.readings || []).map((reading) => ({ time: "12:00", ...reading }));
    merged.events = (merged.events || []).map((event) => ({
      time: "12:00",
      ...event,
      type: EVENT_TYPES[event.type] ? event.type : "other"
    }));
    return merged;
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

/* ---------- undo ---------- */

function captureUndo(message) {
  undoSnapshot = JSON.parse(JSON.stringify({
    parameters: state.parameters,
    readings: state.readings,
    events: state.events,
    notes: state.notes
  }));
  els.toastMessage.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  els.toast.hidden = true;
  undoSnapshot = null;
}

function undoLastAction() {
  if (undoSnapshot) {
    state.parameters = undoSnapshot.parameters;
    state.readings = undoSnapshot.readings;
    state.events = undoSnapshot.events;
    state.notes = undoSnapshot.notes;
    els.notesArea.value = state.notes || "";
    persist();
    render();
  }
  hideToast();
}

/* ---------- add / edit / delete ---------- */

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

function readingValuesFromForm() {
  const values = {};
  state.parameters.forEach((parameter) => {
    const input = document.getElementById(`reading-${parameter.id}`);
    const value = numberOrNull(input?.value);
    if (value !== null) values[parameter.id] = value;
  });
  return values;
}

function addReading(event) {
  event.preventDefault();
  const values = readingValuesFromForm();
  if (!Object.keys(values).length) return;

  const date = els.readingDate.value || today();
  const time = els.readingTime.value || nowTime();

  if (editingReadingId) {
    const reading = state.readings.find((item) => item.id === editingReadingId);
    if (reading) {
      reading.date = date;
      reading.time = time;
      reading.values = values;
    }
    cancelReadingEdit();
  } else {
    state.readings.push({ id: uid(), date, time, values });
    els.readingForm.reset();
    els.readingDate.value = today();
    els.readingTime.value = nowTime();
  }

  persist();
  render();
}

function startEditReading(id) {
  const reading = state.readings.find((item) => item.id === id);
  if (!reading) return;

  editingReadingId = id;
  activateTab("log");
  renderReadingInputs();
  els.readingDate.value = reading.date;
  els.readingTime.value = reading.time || "12:00";
  state.parameters.forEach((parameter) => {
    const input = document.getElementById(`reading-${parameter.id}`);
    if (input && reading.values[parameter.id] !== undefined) input.value = reading.values[parameter.id];
  });
  els.saveReadingButton.textContent = "Update";
  els.cancelReadingEdit.hidden = false;
  els.readingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelReadingEdit() {
  editingReadingId = null;
  els.readingForm.reset();
  els.readingDate.value = today();
  els.readingTime.value = nowTime();
  els.saveReadingButton.textContent = "Save";
  els.cancelReadingEdit.hidden = true;
}

function addEvent(event) {
  event.preventDefault();
  const title = document.getElementById("eventTitle").value.trim();
  const details = document.getElementById("eventDetails").value.trim();
  const type = EVENT_TYPES[els.eventType.value] ? els.eventType.value : "other";
  if (!title) return;

  const date = els.eventDate.value || today();
  const time = els.eventTime.value || nowTime();

  if (editingEventId) {
    const existing = state.events.find((item) => item.id === editingEventId);
    if (existing) {
      existing.date = date;
      existing.time = time;
      existing.type = type;
      existing.title = title;
      existing.details = details;
    }
    cancelEventEdit();
  } else {
    state.events.push({ id: uid(), date, time, type, title, details });
    els.eventForm.reset();
    els.eventDate.value = today();
    els.eventTime.value = nowTime();
  }

  persist();
  render();
}

function startEditEvent(id) {
  const item = state.events.find((entry) => entry.id === id);
  if (!item) return;

  editingEventId = id;
  els.eventType.value = item.type;
  els.eventDate.value = item.date;
  els.eventTime.value = item.time || "12:00";
  document.getElementById("eventTitle").value = item.title;
  document.getElementById("eventDetails").value = item.details || "";
  els.eventSubmitButton.textContent = "Update";
  els.cancelEventEdit.hidden = false;
  els.eventForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEventEdit() {
  editingEventId = null;
  els.eventForm.reset();
  els.eventDate.value = today();
  els.eventTime.value = nowTime();
  els.eventSubmitButton.textContent = "Add";
  els.cancelEventEdit.hidden = true;
}

function repeatEvent(id) {
  const item = state.events.find((entry) => entry.id === id);
  if (!item) return;

  cancelEventEdit();
  els.eventType.value = item.type;
  els.eventDate.value = today();
  els.eventTime.value = nowTime();
  document.getElementById("eventTitle").value = item.title;
  document.getElementById("eventDetails").value = item.details || "";
  els.eventForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteParameter(id) {
  const parameter = state.parameters.find((item) => item.id === id);
  if (!parameter) return;

  captureUndo(`Deleted ${parameter.name}`);
  state.parameters = state.parameters.filter((item) => item.id !== id);
  state.readings.forEach((reading) => delete reading.values[id]);
  state.readings = state.readings.filter((reading) => Object.keys(reading.values).length);
  if (expandedParamId === id) expandedParamId = null;
  persist();
  render();
}

function deleteEvent(id) {
  captureUndo("Event deleted");
  if (editingEventId === id) cancelEventEdit();
  state.events = state.events.filter((event) => event.id !== id);
  persist();
  render();
}

function deleteReading(id) {
  captureUndo("Reading deleted");
  if (editingReadingId === id) cancelReadingEdit();
  state.readings = state.readings.filter((reading) => reading.id !== id);
  persist();
  render();
}

function resetTimeline() {
  if (!state.readings.length && !state.events.length) return;
  const confirmed = window.confirm("Delete the entire timeline? This removes every reading and event.");
  if (!confirmed) return;

  captureUndo("Timeline deleted");
  if (editingReadingId) cancelReadingEdit();
  if (editingEventId) cancelEventEdit();
  state.readings = [];
  state.events = [];
  timelineShown = TIMELINE_PAGE;
  persist();
  render();
}

function saveNotes() {
  state.notes = els.notesArea.value;
  persist();
  els.notesSaved.textContent = "Saved";
}

/* ---------- test timers ---------- */

function startTimer(label) {
  const minutes = Math.min(120, Math.max(0.1, numberOrNull(els.timerMinutes.value) ?? 5));
  activeTimers.push({
    id: uid(),
    label,
    endsAt: Date.now() + minutes * 60000,
    done: false
  });
  renderTimers();
}

function dismissTimer(id) {
  activeTimers = activeTimers.filter((timer) => timer.id !== id);
  renderTimers();
}

function tickTimers() {
  if (!activeTimers.length) return;
  let changed = false;
  activeTimers.forEach((timer) => {
    if (!timer.done && timer.endsAt - Date.now() <= 0) {
      timer.done = true;
      changed = true;
      notifyTimerDone();
    }
  });
  renderTimers();
  if (changed) renderTimers();
}

function notifyTimerDone() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    [0, 0.35, 0.7].forEach((offset) => {
      gain.gain.setValueAtTime(0.22, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.25);
    });
    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.1);
    oscillator.onended = () => ctx.close();
  } catch {
    /* sound unavailable */
  }
}

function renderTimers() {
  if (!activeTimers.length) {
    els.timerList.innerHTML = "";
    return;
  }

  els.timerList.innerHTML = activeTimers.map((timer) => {
    const remaining = Math.max(0, timer.endsAt - Date.now());
    const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
    return `
      <div class="timer-row ${timer.done ? "done" : ""}">
        <strong>${escapeHtml(timer.label)}</strong>
        <span class="timer-time">${timer.done ? "Done — read now" : `${minutes}:${seconds}`}</span>
        <button class="delete-button" type="button" data-dismiss-timer="${timer.id}" aria-label="${timer.done ? "Dismiss" : "Cancel"} ${escapeHtml(timer.label)} timer" title="${timer.done ? "Dismiss" : "Cancel"}">
          <svg aria-hidden="true" viewBox="0 0 24 24">${CLOSE_ICON}</svg>
        </button>
      </div>
    `;
  }).join("");

  els.timerList.querySelectorAll("[data-dismiss-timer]").forEach((button) => {
    button.addEventListener("click", () => dismissTimer(button.dataset.dismissTimer));
  });
}

/* ---------- rendering ---------- */

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
  els.lastWaterChange.textContent = formatDaysSinceWaterChange();

  if (!latest) {
    els.latestSummary.textContent = "No readings";
    return;
  }

  const firstValue = Object.entries(latest.values)[0];
  const parameter = state.parameters.find((item) => item.id === firstValue?.[0]);
  els.latestSummary.textContent = parameter ? `${parameter.name} ${firstValue[1]}${parameter.unit ? ` ${parameter.unit}` : ""}` : latest.date;
}

function formatDaysSinceWaterChange() {
  const latest = state.events
    .filter((event) => event.type === "waterChange")
    .map((event) => new Date(`${event.date}T00:00:00`).getTime())
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => b - a)[0];

  if (!latest) return "—";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((todayStart.getTime() - latest) / 86400000));
  if (days === 0) return "Today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
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
          <svg aria-hidden="true" viewBox="0 0 24 24">${TRASH_ICON}</svg>
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

function itemTime(item) {
  return new Date(`${item.date}T${item.time || "12:00"}:00`).getTime();
}

function parameterSeries(parameterId) {
  return state.readings
    .filter((reading) => reading.values[parameterId] !== undefined)
    .map((reading) => ({ value: reading.values[parameterId], time: itemTime(reading), key: sortKey(reading) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function latestReadingTime(parameterId) {
  const series = parameterSeries(parameterId);
  return series.length ? series[series.length - 1].time : null;
}

// ppm and dKH (and similar) are alternate units for the same reading. Group
// parameters by their measurement name so only one row is shown per reading.
function measurementKey(parameter) {
  const unit = String(parameter.unit || "").trim().toLowerCase();
  let base = String(parameter.name || "").toLowerCase();
  base = base.replace(/\([^)]*\)/g, " "); // drop unit annotations like "(dKH)"
  if (unit) base = base.replaceAll(unit, " ");
  base = base.replace(/\b(?:ppm|dkh|dgh|mg\/?l)\b/g, " "); // drop stray unit words
  base = base.replace(/[^a-z0-9]+/g, " ").trim();
  return base;
}

// Collapse correlated parameters to the one measured most recently, keeping the
// original parameter order for everything shown.
function summaryParameters() {
  const winners = new Set();
  const groups = new Map();

  state.parameters.forEach((parameter) => {
    const key = measurementKey(parameter) || `id:${parameter.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(parameter);
  });

  groups.forEach((members) => {
    let best = members[0];
    let bestTime = latestReadingTime(best.id);
    members.slice(1).forEach((member) => {
      const time = latestReadingTime(member.id);
      if (bestTime === null || (time !== null && time > bestTime)) {
        best = member;
        bestTime = time;
      }
    });
    winners.add(best.id);
  });

  return state.parameters.filter((parameter) => winners.has(parameter.id));
}

function daysSince(time) {
  if (!Number.isFinite(time)) return null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const measured = new Date(time);
  measured.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((todayStart.getTime() - measured.getTime()) / 86400000));
}

function formatDaysSince(time) {
  const days = daysSince(time);
  if (days === null) return "";
  if (days === 0) return "Today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function renderParameterSummary() {
  if (!state.parameters.length) {
    els.parameterSummaryTable.innerHTML = `<tr><td colspan="3">Add a parameter on the Log tab.</td></tr>`;
    return;
  }

  els.parameterSummaryTable.innerHTML = summaryParameters().map((parameter) => {
    const series = parameterSeries(parameter.id);
    const nameCell = `<span class="swatch-inline" style="background:${parameter.color}"></span>${escapeHtml(parameter.name)}`;
    const expanded = expandedParamId === parameter.id;
    const chartRow = expanded ? `
      <tr class="chart-row">
        <td colspan="3">
          <p class="chart-note">Shaded band is the target range · dashed lines mark water changes</p>
          <canvas id="paramChart-${parameter.id}" class="param-chart"></canvas>
        </td>
      </tr>
    ` : "";

    if (!series.length) {
      return `
        <tr class="param-row" data-param-id="${parameter.id}">
          <td>${nameCell}</td>
          <td colspan="2" class="muted-cell">No readings yet</td>
        </tr>
        ${chartRow}
      `;
    }

    const latest = series[series.length - 1];
    const status = getStatus(parameter, latest.value);
    const since = formatDaysSince(latest.time);
    return `
      <tr class="param-row ${expanded ? "expanded" : ""}" data-param-id="${parameter.id}">
        <td>${nameCell}</td>
        <td class="latest-cell">
          <span class="latest-value">${latest.value}${parameter.unit ? ` ${escapeHtml(parameter.unit)}` : ""}</span>
          ${since ? `<span class="latest-since">${since}</span>` : ""}
        </td>
        <td><span class="badge ${status.key}">${status.label}</span></td>
      </tr>
      ${chartRow}
    `;
  }).join("");

  els.parameterSummaryTable.querySelectorAll(".param-row").forEach((row) => {
    row.addEventListener("click", () => {
      expandedParamId = expandedParamId === row.dataset.paramId ? null : row.dataset.paramId;
      renderParameterSummary();
    });
  });

  if (expandedParamId) {
    const parameter = state.parameters.find((item) => item.id === expandedParamId);
    const canvas = document.getElementById(`paramChart-${expandedParamId}`);
    if (parameter && canvas) drawParamChart(canvas, parameter);
  }
}

/* ---------- parameter trend chart ---------- */

function drawParamChart(canvas, parameter) {
  const ctx = canvas.getContext("2d");
  const scale = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const height = 200;
  canvas.width = Math.max(280, Math.floor(rect.width * scale));
  canvas.height = Math.floor(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const width = canvas.width / scale;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);

  const series = parameterSeries(parameter.id);
  if (!series.length) {
    drawEmptyChart(ctx, width, height, "No readings yet");
    return;
  }

  const padding = { top: 14, right: 14, bottom: 30, left: 44 };
  let minTime = series[0].time;
  let maxTime = series[series.length - 1].time;
  if (minTime === maxTime) {
    minTime -= 43200000;
    maxTime += 43200000;
  }

  let domain = series.map((point) => point.value);
  if (parameter.low !== null) domain = domain.concat(parameter.low);
  if (parameter.high !== null) domain = domain.concat(parameter.high);
  let minValue = Math.min(...domain);
  let maxValue = Math.max(...domain);
  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }
  const spanPad = (maxValue - minValue) * 0.12;
  minValue -= spanPad;
  maxValue += spanPad;

  const X = (time) => mapValue(time, minTime, maxTime, padding.left, width - padding.right);
  const Y = (value) => mapValue(value, minValue, maxValue, height - padding.bottom, padding.top);

  if (parameter.low !== null || parameter.high !== null) {
    const bandTop = parameter.high !== null ? parameter.high : maxValue;
    const bandBottom = parameter.low !== null ? parameter.low : minValue;
    ctx.fillStyle = "rgba(49, 135, 101, 0.13)";
    ctx.fillRect(padding.left, Y(bandTop), width - padding.left - padding.right, Y(bandBottom) - Y(bandTop));
  }

  drawGrid(ctx, width, height, padding, minValue, maxValue);

  state.events
    .filter((event) => event.type === "waterChange")
    .forEach((event) => {
      const time = itemTime(event);
      if (!Number.isFinite(time) || time < minTime || time > maxTime) return;
      ctx.save();
      ctx.strokeStyle = "#4b7dbd";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(time), padding.top);
      ctx.lineTo(X(time), height - padding.bottom);
      ctx.stroke();
      ctx.restore();
    });

  ctx.beginPath();
  series.forEach((point, index) => {
    if (index === 0) ctx.moveTo(X(point.time), Y(point.value));
    else ctx.lineTo(X(point.time), Y(point.value));
  });
  ctx.strokeStyle = parameter.color;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  series.forEach((point) => {
    const status = getStatus(parameter, point.value);
    ctx.beginPath();
    ctx.arc(X(point.time), Y(point.value), 4, 0, Math.PI * 2);
    ctx.fillStyle = status.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  ctx.fillStyle = "#607174";
  ctx.font = "11px system-ui";
  const firstLabel = new Date(minTime).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastLabel = new Date(maxTime).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  ctx.fillText(firstLabel, padding.left, height - 10);
  ctx.fillText(lastLabel, width - padding.right - ctx.measureText(lastLabel).width, height - 10);
}

function drawGrid(ctx, width, height, padding, minValue, maxValue) {
  ctx.strokeStyle = "#d9e5e2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#607174";
  ctx.font = "11px system-ui";

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

function drawEmptyChart(ctx, width, height, text) {
  ctx.fillStyle = "#607174";
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
  ctx.textAlign = "left";
}

/* ---------- timeline ---------- */

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

  const visible = entries.slice(0, timelineShown);
  const remaining = entries.length - visible.length;

  const listHtml = visible.map((entry) => {
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
          <div class="timeline-actions">
            <button class="delete-button" type="button" data-repeat-event="${entry.id}" aria-label="Repeat event" title="Repeat">
              <svg aria-hidden="true" viewBox="0 0 24 24">${REPEAT_ICON}</svg>
            </button>
            <button class="delete-button" type="button" data-edit-event="${entry.id}" aria-label="Edit event" title="Edit">
              <svg aria-hidden="true" viewBox="0 0 24 24">${EDIT_ICON}</svg>
            </button>
            <button class="delete-button" type="button" data-delete-event="${entry.id}" aria-label="Delete event" title="Delete">
              <svg aria-hidden="true" viewBox="0 0 24 24">${TRASH_ICON}</svg>
            </button>
          </div>
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
          <div class="reading-actions">
            <button class="delete-button" type="button" data-edit-reading="${reading.id}" aria-label="Edit reading" title="Edit">
              <svg aria-hidden="true" viewBox="0 0 24 24">${EDIT_ICON}</svg>
            </button>
            <button class="delete-button" type="button" data-delete-reading="${reading.id}" aria-label="Delete reading" title="Delete">
              <svg aria-hidden="true" viewBox="0 0 24 24">${TRASH_ICON}</svg>
            </button>
          </div>
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

  const moreHtml = remaining > 0
    ? `<li class="timeline-more"><button class="text-button ghost" type="button" id="showMoreTimeline">Show ${remaining} more</button></li>`
    : "";

  els.timelineList.innerHTML = listHtml + moreHtml;

  els.timelineList.querySelectorAll("[data-delete-event]").forEach((button) => {
    button.addEventListener("click", () => deleteEvent(button.dataset.deleteEvent));
  });
  els.timelineList.querySelectorAll("[data-edit-event]").forEach((button) => {
    button.addEventListener("click", () => startEditEvent(button.dataset.editEvent));
  });
  els.timelineList.querySelectorAll("[data-repeat-event]").forEach((button) => {
    button.addEventListener("click", () => repeatEvent(button.dataset.repeatEvent));
  });
  els.timelineList.querySelectorAll("[data-delete-reading]").forEach((button) => {
    button.addEventListener("click", () => deleteReading(button.dataset.deleteReading));
  });
  els.timelineList.querySelectorAll("[data-edit-reading]").forEach((button) => {
    button.addEventListener("click", () => startEditReading(button.dataset.editReading));
  });

  const showMore = document.getElementById("showMoreTimeline");
  if (showMore) {
    showMore.addEventListener("click", () => {
      timelineShown += 30;
      renderTimeline();
    });
  }
}

/* ---------- hero animation ---------- */

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

/* ---------- helpers ---------- */

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

/* ---------- import / export ---------- */

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

function sanitizeImport(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!Array.isArray(data.parameters) && !Array.isArray(data.readings) && !Array.isArray(data.events)) return null;

  const parameters = (Array.isArray(data.parameters) ? data.parameters : [])
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item, index) => ({
      id: String(item.id || uid()),
      name: item.name.trim(),
      low: numberOrNull(item.low),
      high: numberOrNull(item.high),
      unit: typeof item.unit === "string" ? item.unit : "",
      color: typeof item.color === "string" ? item.color : COLORS[index % COLORS.length]
    }));

  const ids = new Set(parameters.map((item) => item.id));

  const readings = (Array.isArray(data.readings) ? data.readings : [])
    .filter((item) => item && typeof item.date === "string" && item.values && typeof item.values === "object")
    .map((item) => {
      const values = {};
      Object.entries(item.values).forEach(([key, value]) => {
        const number = numberOrNull(value);
        if (number !== null && ids.has(String(key))) values[String(key)] = number;
      });
      return {
        id: String(item.id || uid()),
        date: item.date,
        time: typeof item.time === "string" ? item.time : "12:00",
        values
      };
    })
    .filter((item) => Object.keys(item.values).length);

  const events = (Array.isArray(data.events) ? data.events : [])
    .filter((item) => item && typeof item.date === "string" && typeof item.title === "string")
    .map((item) => ({
      id: String(item.id || uid()),
      date: item.date,
      time: typeof item.time === "string" ? item.time : "12:00",
      type: EVENT_TYPES[item.type] ? item.type : "other",
      title: item.title,
      details: typeof item.details === "string" ? item.details : ""
    }));

  return {
    parameters,
    readings,
    events,
    notes: typeof data.notes === "string" ? data.notes : state.notes
  };
}

async function importData() {
  const file = els.importFile.files?.[0];
  els.importFile.value = "";
  if (!file) return;

  let clean = null;
  try {
    clean = sanitizeImport(JSON.parse(await file.text()));
  } catch {
    clean = null;
  }

  if (!clean) {
    window.alert("That file doesn't look like a Freshwater Log backup.");
    return;
  }

  const confirmed = window.confirm(
    `Import ${clean.parameters.length} parameters, ${clean.readings.length} readings, and ${clean.events.length} events? This replaces the current data.`
  );
  if (!confirmed) return;

  captureUndo("Data imported");
  if (editingReadingId) cancelReadingEdit();
  if (editingEventId) cancelEventEdit();
  state.parameters = clean.parameters;
  state.readings = clean.readings;
  state.events = clean.events;
  state.notes = clean.notes;
  els.notesArea.value = state.notes || "";
  expandedParamId = null;
  timelineShown = TIMELINE_PAGE;
  persist();
  render();
}

/* ---------- service worker / updates ---------- */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* offline support unavailable */
  });
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
