const $ = id => document.getElementById(id);

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

const icon = id => `<svg class="icon" width="1em" height="1em"><use href="#icon-${id}"></use></svg>`;

let speciesData = [];
let state = {
  query: "",
  filters: { group: "", breeding: "" }
};

/* -------------------- HELPERS -------------------- */

const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const match = (s) =>
  (!state.query ||
    [s.name, s.scientific].some(v =>
      v?.toLowerCase().includes(state.query)
    )
  ) &&
  Object.entries(state.filters).every(([k, v]) =>
    !v || slugify(s[k]) === v
  );

/* -------------------- INIT -------------------- */

init();

async function init() {
  loadFromURL();
  bindEvents();
  showLoading();

  const res = await fetch("data/species.json");
  speciesData = await res.json();

  speciesData = speciesData.map((s, i) => ({
    ...s,
    id: String(i + 1).padStart(3, "0")
  }));

  renderFilters();
  renderList();
  router();
}

/* -------------------- EVENTS -------------------- */

function bindEvents() {
  [
    [ui.toggle, toggleDrawer],
    [ui.mask, toggleDrawer],
    [ui.back, () => ui.detail.classList.remove("show")]
  ].forEach(([el, fn]) => el.addEventListener("click", fn));

  ui.search.addEventListener("input", e => {
    state.query = e.target.value.toLowerCase();
    renderList();
  });

  window.addEventListener("hashchange", router);
}

function loadFromURL() {
  const hash = location.hash;

  if (!hash.startsWith("#?")) return;

  const params = new URLSearchParams(hash.slice(2));

  state.filters.group = params.get("group") || "";
  state.filters.breeding = params.get("breeding") || "";
  state.query = (params.get("q") || "").toLowerCase();
}

function updateURL() {
  const params = new URLSearchParams();

  if (state.filters.group) params.set("group", state.filters.group);
  if (state.filters.breeding) params.set("breeding", state.filters.breeding);
  if (state.query) params.set("q", state.query);

  const query = params.toString();
  location.hash = query ? `#?${query}` : "#";
}

/* -------------------- DRAWER -------------------- */

function toggleDrawer() {
  const open = ui.finder.classList.toggle("show");
  ui.mask.classList.toggle("show");

  ui.toggle.innerHTML = open
    ? `${icon("close")}<span>Close</span>`
    : `${icon("find")}<span>Find</span>`;
}

/* -------------------- FILTERS -------------------- */

const FILTERS = {
  group: {
    icon: "group",
    options: []
  },

  breeding: {
    icon: "heart",
    options: [
      { value: "bubble-nester", label: "Bubble nester" },
      { value: "mouthbrooder", label: "Mouthbrooder" }
    ]
  }
};

function renderOption(name, value, label) {
  return `
    <label>
      <input type="radio"
        name="${name}"
        value="${value}"
        ${state.filters[name] === value ? "checked" : ""}>
      <span>${icon("right")}</span>${label}
    </label>
  `;
}

function renderFilters() {
  const groupMap = new Map();

  speciesData.forEach(s => {
    const value = slugify(s.group);
    if (!groupMap.has(value)) {
      groupMap.set(value, s.group);
    }
  });

  FILTERS.group.options = [...groupMap.entries()].map(
    ([value, label]) => ({ value, label })
  );

  FILTERS.group.map = groupMap;

  const makeOptions = (name) => {
    const { icon, options } = FILTERS[name];

    return `
      <fieldset class="radios">
        <legend><span class="icon">${icon(icon)}</span>${name}</legend>

        ${renderOption(name, "", "All")}

        ${options.map(o =>
          renderOption(name, o.value, o.label)
        ).join("")}
      </fieldset>
    `;
  };

  ui.filters.innerHTML = `
    <div class="box text-box">
      <input type="text" placeholder="Search..." id="search-proxy" />
      <button id="clear-btn" class="clear icon" type="button" aria-label="clear text">${icon("close-inner")}</button>
    </div>
    
    <div class="scroll-y">
      ${makeOptions("group")}
      ${makeOptions("breeding")}
    </div>
  `;

  const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  $("search-proxy").addEventListener("input", e => {
    debounce(e => {
      ui.search.value = e.target.value;
      state.query = e.target.value.toLowerCase();
      updateURL();
      renderList();
    })
  });
  
  $("clear-btn").addEventListener("click", clearText);
  
  ui.filters.querySelectorAll("input[type=radio]").forEach(r => {
    r.addEventListener("change", () => {
      state.filters[r.name] = r.value;
      updateURL();
      renderList();
      toggleDrawer();
    });
  });
}

function clearText() {
  ui.search.value = "";
  $("search-proxy").value = "";
  state.query = "";
  updateURL();
  renderList();
}

/* -------------------- IMG -------------------- */

function renderImg(src, alt = "image", lazy = true) {
  return src
    ? `<img 
        class="img"
        loading="${lazy ? "lazy" : "eager"}"
        fetchpriority="${lazy ? "auto" : "high"}" 
        decoding="async" 
        src="${src}" 
        alt="${alt}">`
    : `<div class="img"></div>`;
}

/* -------------------- LOADING -------------------- */

function showLoading() {
  ui.list.innerHTML = `
    <li class="empty">
      <span>Loading species...</span>
    </li>
  `;
}

/* -------------------- LIST -------------------- */

function renderList() {
  const filtered = speciesData.filter(match);

  ui.list.innerHTML = filtered.length
    ? filtered.map((s, i) => `
        <li>
          <a href="#species/${s.slug}">
            <span class="text-weak">${s.id}</span>
            ${renderImg(s.photos?.[0]?.src, s.name, i > 7)}
            <span>${s.scientific || ""}</span>
          </a>
        </li>
      `).join("")
    : `<li class="empty"><span>No species found.</span></li>`;
}

/* -------------------- DETAIL -------------------- */

function renderDetail(s) {
  ui.detail.innerHTML = `
    <div class="species-info">
      ${renderImg(s.photos?.[0]?.src, s.name, false)}
      <div class="h-full scroll-y pb">
        <div class="desc">
          <p><strong><span class="icon">${icon("scientific")}</span> Scientific</strong><span class="value">${s.scientific}</span></p>
          <p><strong><span class="icon">${icon("fish")}</span>Info</strong><span class="value">${s.info}</span></p>
          <p><strong><span class="icon">${icon("mountain")}</span>Habitat</strong><span class="value">${s.habitat}</span></p>
          <p><strong><span class="icon">${icon("heart")}</span>Breeding</strong><span class="value">${s.breeding}</span></p>
          <p><strong><span class="icon">${icon("thermometer")}</span>Captive</strong><span class="value">${s.captive}</span></p>
          <p><strong><span class="icon">${icon("hand")}</span>Red List</strong><span class="value">${s.redlist}</span></p>
        </div>
      </div>
    </div>
  `;
}

/* -------------------- ROUTER -------------------- */

function router() {
  const hash = location.hash;

  if (hash.startsWith("#species/")) {
    const slug = hash.replace("#species/", "");
    const species = speciesData.find(s => s.slug === slug);
    if (species) return showDetail(species);
  }

  loadFromURL();
  showList();
}

function showDetail(s) {
  ui.title.innerHTML = `<span class="text-weak">${s.id}</span> ${s.name}`;
  ui.grid.classList.remove("show");
  ui.detail.classList.add("show");
  ui.back.classList.add("show");
  renderDetail(s);
}

function showList() {
  const label = FILTERS.group.map?.get(state.filters.group);

  ui.title.textContent = label
    ? `${label} Complex`
    : "Betta info 2.0";

  ui.grid.classList.add("show");
  ui.detail.classList.remove("show");
  ui.back.classList.remove("show");

  renderList();
}
