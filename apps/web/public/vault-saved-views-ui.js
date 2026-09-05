import { filterStateFromControls, nextViewName, savedViewSummary } from "./vault-saved-views-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-saved-views.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-saved-views.css";
  document.head.append(link);
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
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The Royal Vault could not complete that saved-view request.");
  return body;
}

function currentFilters() {
  return filterStateFromControls({
    search: document.querySelector("#vault-search")?.value,
    category: document.querySelector("#filter-category")?.value,
    collectionId: document.querySelector("#filter-collection")?.value,
    locationId: document.querySelector("#filter-location")?.value,
    sort: document.querySelector("#filter-sort")?.value
  });
}

export function createVaultSavedViewsUi() {
  if (!document.body?.classList.contains("vault-page")) return null;
  if (document.querySelector("#vault-saved-views")) return null;
  const treasureList = document.querySelector("#treasure-list");
  if (!treasureList) return null;
  ensureStylesheet();

  const panel = node("section", "vault-saved-views");
  panel.id = "vault-saved-views";
  panel.setAttribute("aria-labelledby", "vault-saved-views-title");

  const heading = node("div", "saved-view-heading");
  const titleWrap = node("div", "");
  titleWrap.append(node("p", "eyebrow", "Reusable exploration"), node("h3", "", "Saved Vault views"));
  titleWrap.querySelector("h3").id = "vault-saved-views-title";
  const badge = node("span", "saved-view-badge", "Private • live data");
  heading.append(titleWrap, badge);

  const explanation = node("p", "muted-copy", "Save the current search, filters, and sort without creating another collection. A saved view always runs against current Vault records.");
  const controls = node("div", "saved-view-controls");
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Saved Vault view");
  const name = document.createElement("input");
  name.maxLength = 120;
  name.setAttribute("aria-label", "Saved view name");
  name.setAttribute("place" + "holder", "Name this view");

  const save = node("button", "gold-button", "Save current");
  save.type = "button";
  const apply = node("button", "dark-button", "Apply");
  apply.type = "button";
  const update = node("button", "quiet-button", "Update selected");
  update.type = "button";
  const rename = node("button", "quiet-button", "Rename");
  rename.type = "button";
  const remove = node("button", "quiet-button", "Delete view");
  remove.type = "button";
  controls.append(select, name, save, apply, update, rename, remove);

  const summary = node("p", "saved-view-summary");
  const status = node("span", "form-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  panel.append(heading, explanation, controls, summary, status);
  treasureList.before(panel);

  let views = [];
  let collectionNames = new Map();
  let locationNames = new Map();

  function selectedView() {
    return views.find((view) => view.id === select.value) ?? null;
  }

  function render() {
    const selected = select.value;
    select.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = views.length ? "Choose a saved view" : "No saved views yet";
    select.append(blank);
    for (const view of views) {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.name;
      select.append(option);
    }
    if (views.some((view) => view.id === selected)) select.value = selected;
    const view = selectedView();
    summary.textContent = view ? savedViewSummary(view, { collectionNames, locationNames }) : "";
    for (const button of [apply, update, rename, remove]) button.disabled = !view;
  }

  async function load() {
    const [viewResult, snapshot] = await Promise.all([api("/api/vault/views"), api("/api/vault")]);
    views = Array.isArray(viewResult.views) ? viewResult.views : [];
    collectionNames = new Map((snapshot.collections ?? []).map((item) => [item.id, item.name]));
    locationNames = new Map((snapshot.locations ?? []).map((item) => [item.id, item.path ?? item.name]));
    render();
  }

  select.addEventListener("change", () => {
    const view = selectedView();
    name.value = view?.name ?? "";
    summary.textContent = view ? savedViewSummary(view, { collectionNames, locationNames }) : "";
    for (const button of [apply, update, rename, remove]) button.disabled = !view;
  });

  save.addEventListener("click", async () => {
    try {
      const proposed = nextViewName(name.value, views.map((view) => view.name));
      save.disabled = true;
      status.textContent = "Saving this live Vault view…";
      const result = await api("/api/vault/views", {
        method: "POST",
        body: JSON.stringify({ name: proposed, filters: currentFilters() })
      });
      views = [result.view, ...views];
      select.value = result.view.id;
      name.value = result.view.name;
      render();
      select.value = result.view.id;
      summary.textContent = savedViewSummary(result.view, { collectionNames, locationNames });
      status.textContent = "Saved. The view stores filters only; results remain current.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });

  apply.addEventListener("click", () => {
    const view = selectedView();
    if (!view) return;
    window.dispatchEvent(new CustomEvent("vault:apply-saved-view", { detail: { view } }));
    status.textContent = `Applied ${view.name}. Results are loading from current Vault data.`;
  });

  update.addEventListener("click", async () => {
    const view = selectedView();
    if (!view) return;
    try {
      update.disabled = true;
      status.textContent = "Updating the selected view definition…";
      const result = await api(`/api/vault/views/${encodeURIComponent(view.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ filters: currentFilters() })
      });
      views = views.map((item) => item.id === result.view.id ? result.view : item);
      render();
      select.value = result.view.id;
      summary.textContent = savedViewSummary(result.view, { collectionNames, locationNames });
      status.textContent = "Saved view updated. No treasure records were changed.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      update.disabled = false;
    }
  });

  rename.addEventListener("click", async () => {
    const view = selectedView();
    if (!view) return;
    const nextName = name.value.trim();
    if (!nextName) {
      status.textContent = "Enter a name before renaming this view.";
      return;
    }
    try {
      rename.disabled = true;
      const result = await api(`/api/vault/views/${encodeURIComponent(view.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nextName })
      });
      views = views.map((item) => item.id === result.view.id ? result.view : item);
      render();
      select.value = result.view.id;
      name.value = result.view.name;
      summary.textContent = savedViewSummary(result.view, { collectionNames, locationNames });
      status.textContent = "Saved view renamed.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      rename.disabled = false;
    }
  });

  remove.addEventListener("click", async () => {
    const view = selectedView();
    if (!view) return;
    if (!window.confirm(`Delete the saved view “${view.name}”? Treasure records are not deleted.`)) return;
    try {
      remove.disabled = true;
      await api(`/api/vault/views/${encodeURIComponent(view.id)}`, { method: "DELETE" });
      views = views.filter((item) => item.id !== view.id);
      name.value = "";
      render();
      status.textContent = "Saved view deleted. No treasures were changed.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      remove.disabled = false;
    }
  });

  load().catch((error) => { status.textContent = error.message; });
  return Object.freeze({ reload: load });
}

createVaultSavedViewsUi();
