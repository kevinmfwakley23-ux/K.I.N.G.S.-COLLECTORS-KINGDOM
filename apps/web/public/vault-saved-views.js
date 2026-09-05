const SUPPORTED_VIEWS = new Set(["grid", "list", "binder", "gallery"]);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Saved Vault views are unavailable.");
  return body;
}

function installStyles() {
  if (document.querySelector('link[href="/vault-saved-views.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-saved-views.css";
  document.head.append(link);
}

function activeView() {
  const stored = localStorage.getItem("kingdom.vault.view");
  return SUPPORTED_VIEWS.has(stored) ? stored : "grid";
}

function currentPayload(name) {
  return {
    name,
    query: document.querySelector("#vault-search")?.value.trim() || null,
    category: document.querySelector("#filter-category")?.value || null,
    folderId: document.querySelector("#filter-folder")?.value || null,
    locationId: document.querySelector("#filter-location")?.value || null,
    tag: null,
    sort: document.querySelector("#sort-treasures")?.value || "updated-desc",
    view: activeView()
  };
}

function assignSelect(selector, value) {
  const select = document.querySelector(selector);
  if (!select) return { applied: false, stale: false };
  if (!value) {
    select.value = "";
    return { applied: true, stale: false };
  }
  if ([...select.options].some((option) => option.value === value)) {
    select.value = value;
    return { applied: true, stale: false };
  }
  select.value = "";
  return { applied: false, stale: true };
}

function applySavedView(view, status) {
  const search = document.querySelector("#vault-search");
  const sort = document.querySelector("#sort-treasures");
  const form = document.querySelector("#vault-search-form");
  if (!search || !sort || !form) {
    status.textContent = "The Vault search controls are not ready yet.";
    return;
  }

  search.value = view.query ?? "";
  const category = assignSelect("#filter-category", view.category);
  const folder = assignSelect("#filter-folder", view.folderId);
  const location = assignSelect("#filter-location", view.locationId);
  if ([...sort.options].some((option) => option.value === view.sort)) sort.value = view.sort;

  const buttonByView = {
    grid: "#grid-view-button",
    list: "#list-view-button",
    binder: "#binder-view-button",
    gallery: "#gallery-view-button"
  };
  document.querySelector(buttonByView[SUPPORTED_VIEWS.has(view.view) ? view.view : "grid"])?.click();
  form.requestSubmit();

  const stale = [category, folder, location].some((entry) => entry.stale);
  status.textContent = stale
    ? `Applied “${view.name}”, but one saved organization filter no longer exists and was cleared.`
    : `Applied “${view.name}”.`;
}

async function installSavedViews() {
  installStyles();
  const sidebar = document.querySelector(".vault-sidebar");
  if (!sidebar || sidebar.querySelector("[data-saved-vault-views]")) return;

  const section = element("section", "sidebar-section saved-view-section");
  section.dataset.savedVaultViews = "";
  const heading = element("div", "sidebar-section-head");
  heading.append(element("h3", "", "Saved Vault views"));
  section.append(heading, element("p", "empty-copy", "Preserve a natural search, organization filters, sort order, and Grid, List, Binder, or Gallery presentation for one-tap return."));

  const form = element("form", "saved-view-form");
  const nameLabel = element("label", "");
  nameLabel.append(element("span", "sr-only", "Saved view name"));
  const nameInput = document.createElement("input");
  nameInput.required = true;
  nameInput.maxLength = 80;
  nameInput.setAttribute("aria-label", "Saved view name");
  const save = element("button", "gold-button compact-button", "Save current view");
  save.type = "submit";
  nameLabel.append(nameInput);
  form.append(nameLabel, save);
  section.append(form);

  const status = element("p", "form-status saved-view-status", "Loading saved views…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const list = element("div", "saved-view-list");
  section.append(status, list);

  const keeper = sidebar.querySelector(".keeper-sidebar-callout");
  if (keeper) sidebar.insertBefore(section, keeper);
  else sidebar.append(section);

  let savedViews = [];

  async function load() {
    try {
      const result = await api("/api/vault/saved-views");
      savedViews = result.savedViews ?? [];
      render();
      status.textContent = savedViews.length
        ? `${savedViews.length} of ${result.maximumSavedViews ?? 100} saved views.`
        : "No saved views yet.";
    } catch (error) {
      status.textContent = error.message;
      form.hidden = true;
    }
  }

  function render() {
    list.replaceChildren();
    if (!savedViews.length) {
      list.append(element("p", "empty-copy", "Build a useful search or filter combination, name it, and save it here."));
      return;
    }
    for (const view of savedViews) {
      const row = element("article", "saved-view-row");
      const open = element("button", "saved-view-open", view.name);
      open.type = "button";
      open.addEventListener("click", () => applySavedView(view, status));

      const meta = element("small", "saved-view-meta");
      const parts = [view.query, view.category, view.sort, view.view].filter(Boolean);
      meta.textContent = parts.join(" • ") || "All Vault treasures";

      const actions = element("div", "saved-view-actions");
      const update = element("button", "icon-text-button", "Update");
      update.type = "button";
      update.addEventListener("click", async () => {
        update.disabled = true;
        status.textContent = `Updating “${view.name}”…`;
        try {
          await api(`/api/vault/saved-views/${encodeURIComponent(view.id)}`, {
            method: "PATCH",
            body: JSON.stringify(currentPayload(view.name))
          });
          await load();
          status.textContent = `Updated “${view.name}” from the current Vault view.`;
        } catch (error) {
          status.textContent = error.message;
        } finally {
          update.disabled = false;
        }
      });

      const remove = element("button", "manager-delete", "Delete");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Delete saved Vault view “${view.name}”? Your treasure records will not be changed.`)) return;
        remove.disabled = true;
        status.textContent = `Deleting “${view.name}”…`;
        try {
          await api(`/api/vault/saved-views/${encodeURIComponent(view.id)}`, { method: "DELETE" });
          await load();
          status.textContent = `Deleted saved view “${view.name}”.`;
        } catch (error) {
          status.textContent = error.message;
          remove.disabled = false;
        }
      });

      actions.append(update, remove);
      row.append(open, meta, actions);
      list.append(row);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      status.textContent = "Name the Vault view before saving it.";
      return;
    }
    save.disabled = true;
    status.textContent = "Saving the current Vault view…";
    try {
      await api("/api/vault/saved-views", { method: "POST", body: JSON.stringify(currentPayload(name)) });
      nameInput.value = "";
      await load();
      status.textContent = `Saved “${name}”.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });

  await load();
}

installSavedViews();
