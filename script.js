const STORAGE_KEY = "planvy-items-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const PX_PER_DAY = 140;
const MIN_ITEM_DURATION = HOUR_MS;

const seedItems = [
  {
    id: crypto.randomUUID(),
    title: "Kickoff med kund",
    person: "Anna",
    category: "Möte",
    department: "Försäljning",
    start: "2026-03-10T09:00",
    end: "2026-03-10T12:00",
    color: "#2563eb",
    description: "Gemensam genomgång av mål, ansvar och leveransplan."
  },
  {
    id: crypto.randomUUID(),
    title: "Skissa startsida",
    person: "Johan",
    category: "Design",
    department: "Produkt",
    start: "2026-03-10T10:00",
    end: "2026-03-12T16:00",
    color: "#ef4444",
    description: "Första version av layout och innehållsstruktur."
  },
  {
    id: crypto.randomUUID(),
    title: "Bygga API-koppling",
    person: "Fatima",
    category: "Utveckling",
    department: "Teknik",
    start: "2026-03-11T08:00",
    end: "2026-03-14T17:00",
    color: "#14b8a6",
    description: "Mockkoppling för schema och planobjekt."
  },
  {
    id: crypto.randomUUID(),
    title: "Intern avstämning",
    person: "Anna",
    category: "Möte",
    department: "Försäljning",
    start: "2026-03-13T13:00",
    end: "2026-03-13T15:00",
    color: "#f59e0b",
    description: "Kort statusmöte för teamet."
  },
  {
    id: crypto.randomUUID(),
    title: "Test och QA",
    person: "Leo",
    category: "Kvalitet",
    department: "QA",
    start: "2026-03-14T09:00",
    end: "2026-03-16T15:00",
    color: "#7c3aed",
    description: "Granska flöden, tider och redigeringsinteraktion."
  }
];

const state = {
  items: loadItems(),
  groupBy: "person",
  sortBy: "start",
  filters: {
    person: "",
    category: "",
    color: ""
  },
  editMode: true,
  drag: null
};

const ui = {
  labelsList: document.getElementById("labelsList"),
  timelineHeader: document.getElementById("timelineHeader"),
  timelineBody: document.getElementById("timelineBody"),
  groupBySelect: document.getElementById("groupBySelect"),
  personFilter: document.getElementById("personFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  colorFilter: document.getElementById("colorFilter"),
  sortSelect: document.getElementById("sortSelect"),
  toggleEditBtn: document.getElementById("toggleEditBtn"),
  addItemBtn: document.getElementById("addItemBtn"),
  dialog: document.getElementById("itemDialog"),
  itemForm: document.getElementById("itemForm"),
  dialogTitle: document.getElementById("dialogTitle"),
  itemId: document.getElementById("itemId"),
  titleInput: document.getElementById("titleInput"),
  personInput: document.getElementById("personInput"),
  categoryInput: document.getElementById("categoryInput"),
  departmentInput: document.getElementById("departmentInput"),
  startInput: document.getElementById("startInput"),
  endInput: document.getElementById("endInput"),
  colorInput: document.getElementById("colorInput"),
  descriptionInput: document.getElementById("descriptionInput"),
  deleteItemBtn: document.getElementById("deleteItemBtn"),
  closeDialogBtn: document.getElementById("closeDialogBtn"),
  cancelDialogBtn: document.getElementById("cancelDialogBtn")
};

bindEvents();
render();

function loadItems() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedItems));
    return seedItems;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return seedItems;
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function bindEvents() {
  ui.groupBySelect.addEventListener("change", (event) => {
    state.groupBy = event.target.value;
    render();
  });

  ui.personFilter.addEventListener("change", (event) => {
    state.filters.person = event.target.value;
    render();
  });

  ui.categoryFilter.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    render();
  });

  ui.colorFilter.addEventListener("change", (event) => {
    state.filters.color = event.target.value;
    render();
  });

  ui.sortSelect.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    render();
  });

  ui.toggleEditBtn.addEventListener("click", () => {
    state.editMode = !state.editMode;
    ui.toggleEditBtn.textContent = `Redigeringsläge: ${state.editMode ? "På" : "Av"}`;
    render();
  });

  ui.addItemBtn.addEventListener("click", () => openDialog());
  ui.closeDialogBtn.addEventListener("click", closeDialog);
  ui.cancelDialogBtn.addEventListener("click", closeDialog);

  ui.deleteItemBtn.addEventListener("click", () => {
    const id = ui.itemId.value;
    if (!id) {
      closeDialog();
      return;
    }

    state.items = state.items.filter((item) => item.id !== id);
    saveItems();
    closeDialog();
    render();
  });

  ui.itemForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      id: ui.itemId.value || crypto.randomUUID(),
      title: ui.titleInput.value.trim(),
      person: ui.personInput.value.trim(),
      category: ui.categoryInput.value.trim(),
      department: ui.departmentInput.value.trim(),
      start: ui.startInput.value,
      end: ui.endInput.value,
      color: ui.colorInput.value,
      description: ui.descriptionInput.value.trim()
    };

    if (new Date(payload.end) <= new Date(payload.start)) {
      alert("Sluttiden måste vara senare än starttiden.");
      return;
    }

    const index = state.items.findIndex((item) => item.id === payload.id);
    if (index >= 0) {
      state.items[index] = payload;
    } else {
      state.items.push(payload);
    }

    saveItems();
    closeDialog();
    render();
  });

  ui.timelineBody.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function render() {
  const items = getVisibleItems();
  populateFilters();
  const rows = buildRows(items, state.groupBy);
  const range = getTimelineRange(items.length ? items : state.items);
  renderHeader(range);
  renderRows(rows, range);
}

function getVisibleItems() {
  const filtered = state.items.filter((item) => {
    return (!state.filters.person || item.person === state.filters.person)
      && (!state.filters.category || item.category === state.filters.category)
      && (!state.filters.color || item.color === state.filters.color);
  });

  return filtered.sort((a, b) => {
    if (state.sortBy === "start") {
      return new Date(a.start) - new Date(b.start);
    }

    return String(a[state.sortBy]).localeCompare(String(b[state.sortBy]), "sv");
  });
}

function populateFilters() {
  syncSelect(ui.personFilter, uniqueValues(state.items, "person"), state.filters.person, "Alla");
  syncSelect(ui.categoryFilter, uniqueValues(state.items, "category"), state.filters.category, "Alla");
  syncSelect(ui.colorFilter, uniqueValues(state.items, "color"), state.filters.color, "Alla");
}

function syncSelect(select, values, selectedValue, placeholder) {
  const entries = [""].concat(values);
  select.innerHTML = "";

  entries.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || placeholder;
    select.append(option);
  });

  select.value = selectedValue;
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
}

function buildRows(items, groupBy) {
  const groups = new Map();

  items.forEach((item) => {
    const key = item[groupBy] || "Övrigt";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  return [...groups.entries()].map(([key, rowItems]) => ({
    key,
    subtitle: `${rowItems.length} aktivitet${rowItems.length === 1 ? "" : "er"}`,
    items: rowItems
  }));
}

function getTimelineRange(items) {
  const dates = items.flatMap((item) => [new Date(item.start).getTime(), new Date(item.end).getTime()]);
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const start = startOfDay(new Date(min - DAY_MS));
  const end = startOfDay(new Date(max + (2 * DAY_MS)));
  const dayCount = Math.max(1, Math.round((end - start) / DAY_MS));
  return { start, end, dayCount, width: dayCount * PX_PER_DAY };
}

function renderHeader(range) {
  ui.timelineHeader.innerHTML = "";
  ui.timelineHeader.style.gridTemplateColumns = `repeat(${range.dayCount}, ${PX_PER_DAY}px)`;

  for (let i = 0; i < range.dayCount; i += 1) {
    const day = new Date(range.start.getTime() + (i * DAY_MS));
    const cell = document.createElement("div");
    cell.className = "timeline-day";
    cell.innerHTML = `<strong>${day.toLocaleDateString("sv-SE", { weekday: "short" })}</strong><span>${day.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</span>`;
    ui.timelineHeader.append(cell);
  }
}

function renderRows(rows, range) {
  ui.labelsList.innerHTML = "";
  ui.timelineBody.innerHTML = "";
  ui.timelineBody.style.width = `${range.width}px`;

  if (!rows.length) {
    ui.labelsList.innerHTML = `<div class="empty-state">Inga aktiviteter matchar filtren.</div>`;
    ui.timelineBody.innerHTML = `<div class="empty-state">Prova att ändra filter eller lägga till en ny aktivitet.</div>`;
    return;
  }

  rows.forEach((row) => {
    const label = document.createElement("div");
    label.className = "row-label";
    label.innerHTML = `<strong>${row.key}</strong><span>${row.subtitle}</span>`;
    ui.labelsList.append(label);

    const line = document.createElement("div");
    line.className = "timeline-row";
    line.dataset.row = row.key;
    line.style.width = `${range.width}px`;

    row.items.forEach((item) => {
      line.append(createBar(item, range));
    });

    ui.timelineBody.append(line);
  });
}

function createBar(item, range) {
  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = `gantt-bar${state.editMode ? "" : " is-locked"}`;
  bar.dataset.id = item.id;
  bar.style.background = item.color;

  const start = new Date(item.start).getTime();
  const end = new Date(item.end).getTime();
  const left = ((start - range.start.getTime()) / DAY_MS) * PX_PER_DAY;
  const width = Math.max(40, ((end - start) / DAY_MS) * PX_PER_DAY);
  const isCompact = width < 96;
  const isTight = width >= 96 && width < 148;
  const label = `${item.title} | ${item.person} | ${item.category}`;

  bar.style.left = `${left}px`;
  bar.style.width = `${width}px`;
  bar.title = label;
  bar.setAttribute("aria-label", label);

  if (isCompact) {
    bar.classList.add("is-compact");
  } else if (isTight) {
    bar.classList.add("is-tight");
  }

  bar.innerHTML = isCompact
    ? `
      <span class="gantt-bar-dot" aria-hidden="true"></span>
      <span class="bar-handle left" data-handle="start"></span>
      <span class="bar-handle right" data-handle="end"></span>
    `
    : isTight
      ? `
        <span class="gantt-bar-title">${item.title}</span>
        <span class="bar-handle left" data-handle="start"></span>
        <span class="bar-handle right" data-handle="end"></span>
      `
      : `
        <span class="gantt-bar-title">${item.title}</span>
        <span class="gantt-bar-meta">${item.person} · ${item.category}</span>
        <span class="bar-handle left" data-handle="start"></span>
        <span class="bar-handle right" data-handle="end"></span>
      `;

  bar.addEventListener("click", () => {
    if (state.drag?.moved) {
      return;
    }
    openDialog(item);
  });

  return bar;
}

function onPointerDown(event) {
  const bar = event.target.closest(".gantt-bar");
  if (!bar || !state.editMode) {
    return;
  }

  const handle = event.target.closest(".bar-handle");
  const mode = handle ? handle.dataset.handle : "move";
  const item = state.items.find((entry) => entry.id === bar.dataset.id);
  if (!item) {
    return;
  }

  bar.setPointerCapture(event.pointerId);
  state.drag = {
    pointerId: event.pointerId,
    id: item.id,
    mode,
    originX: event.clientX,
    start: new Date(item.start).getTime(),
    end: new Date(item.end).getTime(),
    moved: false
  };
}

function onPointerMove(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) {
    return;
  }

  const diffMs = Math.round(((event.clientX - state.drag.originX) / PX_PER_DAY) * DAY_MS / HOUR_MS) * HOUR_MS;
  if (Math.abs(diffMs) >= HOUR_MS / 2) {
    state.drag.moved = true;
  }

  const item = state.items.find((entry) => entry.id === state.drag.id);
  if (!item) {
    return;
  }

  if (state.drag.mode === "move") {
    item.start = toLocalInputValue(new Date(state.drag.start + diffMs));
    item.end = toLocalInputValue(new Date(state.drag.end + diffMs));
  } else if (state.drag.mode === "start") {
    const nextStart = Math.min(state.drag.start + diffMs, state.drag.end - MIN_ITEM_DURATION);
    item.start = toLocalInputValue(new Date(nextStart));
  } else if (state.drag.mode === "end") {
    const nextEnd = Math.max(state.drag.end + diffMs, state.drag.start + MIN_ITEM_DURATION);
    item.end = toLocalInputValue(new Date(nextEnd));
  }

  render();
}

function onPointerUp(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) {
    return;
  }

  if (state.drag.moved) {
    saveItems();
  }

  state.drag = null;
}

function openDialog(item = null) {
  ui.dialogTitle.textContent = item ? "Redigera aktivitet" : "Ny aktivitet";
  ui.itemId.value = item?.id || "";
  ui.titleInput.value = item?.title || "";
  ui.personInput.value = item?.person || "";
  ui.categoryInput.value = item?.category || "";
  ui.departmentInput.value = item?.department || "";
  ui.startInput.value = item?.start || toLocalInputValue(new Date());
  ui.endInput.value = item?.end || toLocalInputValue(new Date(Date.now() + (2 * HOUR_MS)));
  ui.colorInput.value = item?.color || "#2f7df4";
  ui.descriptionInput.value = item?.description || "";
  ui.deleteItemBtn.hidden = !item;
  ui.dialog.showModal();
}

function closeDialog() {
  ui.dialog.close();
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}


