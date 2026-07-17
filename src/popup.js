const els = {
  enabled: document.getElementById("enabled"),
  status: document.getElementById("status"),
  scope: document.getElementById("scope"),
  siteControls: document.getElementById("siteControls"),
  siteInput: document.getElementById("siteInput"),
  addSite: document.getElementById("addSite"),
  addCurrentSite: document.getElementById("addCurrentSite"),
  siteList: document.getElementById("siteList"),
  currencyInput: document.getElementById("currencyInput"),
  addCurrency: document.getElementById("addCurrency"),
  currencyList: document.getElementById("currencyList"),
  currencyCount: document.getElementById("currencyCount"),
  reset: document.getElementById("reset"),
};

let cfg = { ...SBG_DEFAULTS };
let currentHost = "";

init();

function init() {
  chrome.storage.sync.get(SBG_DEFAULTS, (stored) => {
    cfg = stored;
    render();
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs && tabs[0] && tabs[0].url;
    try {
      currentHost = url ? new URL(url).hostname : "";
    } catch (e) {
      currentHost = "";
    }
    render();
  });

  els.enabled.addEventListener("change", () => save({ blurEnabled: els.enabled.checked }));
  els.scope.addEventListener("change", () => save({ scope: els.scope.value }));

  els.addSite.addEventListener("click", () => addSite(els.siteInput.value));
  els.siteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addSite(els.siteInput.value);
  });
  els.addCurrentSite.addEventListener("click", () => addSite(currentHost));

  els.addCurrency.addEventListener("click", () => addCurrency(els.currencyInput.value));
  els.currencyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addCurrency(els.currencyInput.value);
  });

  els.reset.addEventListener("click", () => save({ ...SBG_DEFAULTS }));
}

function save(patch) {
  cfg = { ...cfg, ...patch };
  chrome.storage.sync.set(cfg, render);
}

function normalizeSite(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function addSite(value) {
  const site = normalizeSite(value);
  if (!site) return;
  els.siteInput.value = "";
  if (cfg.sites.includes(site)) return;
  save({ sites: [...cfg.sites, site].sort() });
}

function removeSite(site) {
  save({ sites: cfg.sites.filter((s) => s !== site) });
}

function addCurrency(value) {
  const cur = (value || "").trim();
  if (!cur) return;
  els.currencyInput.value = "";
  if (cfg.currencies.some((c) => c.toLowerCase() === cur.toLowerCase())) return;
  save({ currencies: [...cfg.currencies, cur] });
}

function removeCurrency(cur) {
  save({ currencies: cfg.currencies.filter((c) => c !== cur) });
}

function render() {
  els.enabled.checked = cfg.blurEnabled !== false;
  els.scope.value = cfg.scope;
  els.siteControls.classList.toggle("disabled", cfg.scope === "all");

  renderStatus();
  renderSites();
  renderCurrencies();
}

function renderStatus() {
  const host = currentHost;
  if (!cfg.blurEnabled) {
    els.status.textContent = "Blurring is off.";
    els.status.classList.remove("on");
    return;
  }
  if (!host) {
    els.status.textContent = "No site loaded in this tab.";
    els.status.classList.remove("on");
    return;
  }
  const covered = cfg.scope === "all" || sbgHostMatches(host, cfg.sites);
  els.status.textContent = covered ? `Blurring amounts on ${host}` : `${host} is not in your list.`;
  els.status.classList.toggle("on", covered);
  els.addCurrentSite.hidden = covered || cfg.scope === "all";
}

function renderSites() {
  els.siteList.textContent = "";
  cfg.sites.forEach((site) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "host";
    name.textContent = site;
    const x = document.createElement("button");
    x.className = "x";
    x.textContent = "×";
    x.title = `Remove ${site}`;
    x.addEventListener("click", () => removeSite(site));
    li.append(name, x);
    els.siteList.append(li);
  });
}

function renderCurrencies() {
  els.currencyList.textContent = "";
  els.currencyCount.textContent = `${cfg.currencies.length} tracked`;
  cfg.currencies.forEach((cur) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = cur;
    const x = document.createElement("button");
    x.className = "x";
    x.textContent = "×";
    x.title = `Remove ${cur}`;
    x.addEventListener("click", () => removeCurrency(cur));
    chip.append(label, x);
    els.currencyList.append(chip);
  });
}
