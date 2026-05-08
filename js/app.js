const $ = (id) => document.getElementById(id);

/* -------------------- STATE -------------------- */

const state = {
  data: [],
  query: "",
  filters: { group: "", breeding: "" }
};

/* -------------------- UI -------------------- */

const ui = {
  title: document.querySelector("h1"),
  toggle: $("toggle"),
  mask: $("mask"),
  finder: $("finder"),
  filters: $("filters"),
  search: $("search-input"),
  grid: $("grid"),
  list: $("list"),
  detail: $("detail"),
  back: $("back")
};

/* -------------------- ICONS -------------------- */

const icons = {
  close: `<svg class="icon"><use href="#icon-close"></use></svg>`,
  closeOutline: `<svg class="icon"><use href="#icon-close-inner"></use></svg>`,
  find: `<svg class="icon"><use href="#icon-find"></use></svg>`,
  right: `<svg class="icon"><use href="#icon-right"></use></svg>`,
  group: `<svg class="icon"><use href="#icon-group"></use></svg>`,
  heart: `<svg class="icon"><use href="#icon-heart"></use></svg>`,
  scientific: `<svg class="icon"><use href="#icon-scientific"></use></svg>`,
  fish: `<svg class="icon"><use href="#icon-fish"></use></svg>`,
  mountain: `<svg class="icon"><use href="#icon-mountain"></use></svg>`,
  thermometer: `<svg class="icon"><use href="#icon-thermometer"></use></svg>`,
  hand: `<svg class="icon"><use href="#icon-hand"></use></svg>`
};

const icon = (id) => icons[id] || "";

/* -------------------- HELPERS -------------------- */

const slugify = (str = "") =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const match = (s) => {
  const q = state.query;

  const textMatch =
    !q ||
    [s.name, s.scientific].some(v =>
      (v || "").toLowerCase().includes(q)
    );

  const filterMatch = Object.entries(state.filters).every(([k, v]) =>
    !v || slugify(s[k]) === v
  );

  return textMatch && filterMatch;
};

/* -------------------- INIT -------------------- */

init();

async function init() {
  bindEvents();
  showLoading();

  try {
    const res = await fetch("/data/species.json");
    if (!res.ok) throw new Error("Failed to load data");

    const json = await res.json();

    state.data = json.map((s, i) => ({
      ...s,
      id: String(i + 1).padStart(3, "0")
    }));

    renderFilters();
    syncFromURL();
    render();
  } catch (err) {
    console.error(err);
    ui.list.innerHTML = `<li class="empty">Failed to load data</li>`;
  }
}

/* -------------------- EVENTS -------------------- */

function bindEvents() {
  ui.toggle.onclick = toggleDrawer;
  ui.mask.onclick = toggleDrawer;
  ui.back.onclick = () => ui.detail.classList.remove("show");

  ui.search.oninput = (e) => {
    state.query = e.target.value.toLowerCase();
    render();
    updateURL();
  };

  window.addEventListener("hashchange", () => {
    syncFromURL();
    render();
  });
}

/* -------------------- URL STATE -------------------- */

function syncFromURL() {
  const hash = location.hash;

  if (!hash.startsWith("#?")) return;

  const params = new URLSearchParams(hash.slice(2));

  state.filters.group = params.get("group") || "";
  state.filters.breeding = params.get("breeding") || "";
  state.query = params.get("q") || "";

  ui.search.value = state.query;
}

function updateURL() {
  const params = new URLSearchParams();

  if (state.filters.group) params.set("group", state.filters.group);
  if (state.filters.breeding) params.set("breeding", state.filters.breeding);
  if (state.query) params.set("q", state.query);

  location.hash = params.toString() ? `#?${params}` : "#";
}

/* -------------------- DRAWER -------------------- */

function toggleDrawer() {
  ui.finder.classList.toggle("show");
  ui.mask.classList.toggle("show");

  const open = ui.finder.classList.contains("show");

  ui.toggle.innerHTML = open
    ? `${icon("close")}<span>Close</span>`
    : `${icon("find")}<span>Find</span>`;
}

/* -------------------- FILTERS -------------------- */

const FILTERS = {
  group: { icon: "group", options: [] },
  breeding: {
    icon: "heart",
    options: [
      { value: "bubble-nester", label: "Bubble nester" },
      { value: "mouthbrooder", label: "Mouthbrooder" }
    ]
  }
};

function renderFilters() {
  const map = new Map();

  state.data.forEach(s => {
    const v = slugify(s.group);
    if (!map.has(v)) map.set(v, s.group);
  });

  FILTERS.group.options = [...map.entries()].map(([value, label]) => ({
    value,
    label
  }));

  FILTERS.group.map = map;

  ui.filters.innerHTML = `
    <div class="box text-box">
      <input type="text" placeholder="Search..." id="search-proxy" />
      <button id="clear-btn" class="clear icon">
        ${icon("close")}
      </button>
    </div>

    <div class="scroll-y">
      ${renderOptions("group")}
      ${renderOptions("breeding")}
    </div>
  `;

  const proxy = $("search-proxy");
  const clear = $("clear-btn");

  proxy.oninput = (e) => {
    state.query = e.target.value.toLowerCase();
    ui.search.value = e.target.value;
    render();
    updateURL();
  };

  clear.onclick = () => {
    state.query = "";
    ui.search.value = "";
    proxy.value = "";
    render();
    updateURL();
  };

  ui.filters.querySelectorAll("input").forEach(r => {
    r.onchange = () => {
      state.filters[r.name] = r.value;
      render();
      updateURL();
      toggleDrawer();
    };
  });
}

function renderOptions(name) {
  const { icon: i, options } = FILTERS[name];

  return `
    <fieldset class="radios">
      <legend>${icon(i)} ${name}</legend>
      ${renderOption(name, "", "All")}
      ${options.map(o => renderOption(name, o.value, o.label)).join("")}
    </fieldset>
  `;
}

function renderOption(name, value, label) {
  return `
    <label>
      <input type="radio" name="${name}" value="${value}"
        ${state.filters[name] === value ? "checked" : ""}>
      ${icon("right")} ${label}
    </label>
  `;
}

/* -------------------- RENDER -------------------- */

function render() {
  const list = state.data.filter(match);

  ui.list.innerHTML = list.length
    ? list.map(renderItem).join("")
    : `<li class="empty">No species found</li>`;
}

function renderItem(s, i) {
  return `
    <li>
      <a href="#species/${s.slug}">
        <span class="text-weak">${s.id}</span>
        <img class="img"
          src="${s.photos?.[0]?.src || ""}"
          alt="${s.name}"
          loading="${i > 6 ? "lazy" : "eager"}">
        <span>${s.scientific || ""}</span>
      </a>
    </li>
  `;
}

/* -------------------- DETAIL -------------------- */

function renderDetail(s) {
  ui.detail.innerHTML = `
    <div class="species-info">
      <img class="img"
        src="${s.photos?.[0]?.src || ""}"
        alt="${s.name}">
      <div class="desc">
        <p>${icon("scientific")} ${s.scientific}</p>
        <p>${icon("fish")} ${s.info}</p>
        <p>${icon("mountain")} ${s.habitat}</p>
        <p>${icon("heart")} ${s.breeding}</p>
        <p>${icon("thermometer")} ${s.captive}</p>
        <p>${icon("hand")} ${s.redlist}</p>
      </div>
    </div>
  `;
}

/* -------------------- ROUTER -------------------- */

function router() {
  syncFromURL();

  const hash = location.hash;

  if (hash.startsWith("#species/")) {
    const slug = hash.replace("#species/", "");
    const item = state.data.find(s => s.slug === slug);
    if (item) return showDetail(item);
  }

  showList();
}

/* -------------------- VIEWS -------------------- */

function showList() {
  ui.grid.classList.add("show");
  ui.detail.classList.remove("show");
  ui.back.classList.remove("show");

  ui.title.textContent =
    FILTERS.group.map?.get(state.filters.group) || "Betta info";

  render();
}

function showDetail(s) {
  ui.title.textContent = s.name;

  ui.grid.classList.remove("show");
  ui.detail.classList.add("show");
  ui.back.classList.add("show");

  renderDetail(s);
}

function showLoading() {
  ui.list.innerHTML = `<li class="empty">Loading...</li>`;
}
