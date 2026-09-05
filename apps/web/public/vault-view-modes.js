const VIEW_MODES = Object.freeze([
  Object.freeze({ id: "grid", label: "Grid", buttonId: "grid-view-button" }),
  Object.freeze({ id: "list", label: "List", buttonId: "list-view-button" }),
  Object.freeze({ id: "binder", label: "Binder", buttonId: "binder-view-button" }),
  Object.freeze({ id: "gallery", label: "Gallery", buttonId: "gallery-view-button" })
]);
const VIEW_IDS = new Set(VIEW_MODES.map((mode) => mode.id));
const STORAGE_KEY = "kingdom.vault.view";

function normalizedView(value) {
  return VIEW_IDS.has(value) ? value : "grid";
}

function currentView() {
  return normalizedView(localStorage.getItem(STORAGE_KEY));
}

function ensureButton(toggle, mode) {
  let button = document.getElementById(mode.buttonId);
  if (button) return button;
  button = document.createElement("button");
  button.id = mode.buttonId;
  button.className = "view-button";
  button.type = "button";
  button.textContent = mode.label;
  button.setAttribute("aria-pressed", "false");
  toggle.append(button);
  return button;
}

function applyView(view, { persist = true } = {}) {
  const selected = normalizedView(view);
  const grid = document.querySelector("#treasure-grid");
  if (!grid) return selected;

  grid.classList.toggle("list-view", selected === "list");
  grid.classList.toggle("binder-view", selected === "binder");
  grid.classList.toggle("gallery-view", selected === "gallery");
  grid.dataset.viewMode = selected;

  for (const mode of VIEW_MODES) {
    const button = document.getElementById(mode.buttonId);
    if (!button) continue;
    const active = mode.id === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  if (persist) localStorage.setItem(STORAGE_KEY, selected);
  window.dispatchEvent(new CustomEvent("kingdom:vault-view-change", { detail: { view: selected } }));
  return selected;
}

function install() {
  const toggle = document.querySelector(".view-toggle");
  const grid = document.querySelector("#treasure-grid");
  if (!toggle || !grid) return;

  toggle.setAttribute("aria-label", "Treasure presentation view");
  for (const mode of VIEW_MODES) ensureButton(toggle, mode);

  for (const mode of VIEW_MODES) {
    document.getElementById(mode.buttonId)?.addEventListener("click", () => applyView(mode.id));
  }

  applyView(currentView(), { persist: false });

  const observer = new MutationObserver(() => applyView(currentView(), { persist: false }));
  observer.observe(grid, { childList: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();

export { VIEW_MODES, currentView, applyView };
