import { createKeeperController } from "./keeper.js";

const state = {
  folders: [],
  locations: [],
  treasures: [],
  stats: null,
  currentTreasure: null,
  offset: 0,
  limit: 48,
  hasMore: false,
  view: localStorage.getItem("kingdom.vault.view") === "list" ? "list" : "grid"
};

const keeper = createKeeperController({ roomId: "vault" });

const collectorChip = document.querySelector("#vault-collector-chip");
const statTreasures = document.querySelector("#stat-treasures");
const statUnits = document.querySelector("#stat-units");
const statCategories = document.querySelector("#stat-categories");
const statDuplicates = document.querySelector("#stat-duplicates");
const statValue = document.querySelector("#stat-value");
const searchForm = document.querySelector("#vault-search-form");
const searchInput = document.querySelector("#vault-search");
const categoryFilter = document.querySelector("#filter-category");
const folderFilter = document.querySelector("#filter-folder");
const locationFilter = document.querySelector("#filter-location");
const sortTreasures = document.querySelector("#sort-treasures");
const resultStatus = document.querySelector("#vault-result-status");
const treasureGrid = document.querySelector("#treasure-grid");
const emptyState = document.querySelector("#vault-empty");
const loadingState = document.querySelector("#vault-loading");
const loadMoreButton = document.querySelector("#load-more");
const gridViewButton = document.querySelector("#grid-view-button");
const listViewButton = document.querySelector("#list-view-button");
const folderTree = document.querySelector("#folder-tree");
const locationTree = document.querySelector("#location-tree");

const treasureDialog = document.querySelector("#treasure-dialog");
const treasureForm = document.querySelector("#treasure-form");
const treasureFormTitle = document.querySelector("#treasure-form-title");
const treasureFormStatus = document.querySelector("#treasure-form-status");
const treasureId = document.querySelector("#treasure-id");
const treasureTitle = document.querySelector("#treasure-title");
const treasureCategory = document.querySelector("#treasure-category");
const treasureSeries = document.querySelector("#treasure-series");
const treasureManufacturer = document.querySelector("#treasure-manufacturer");
const treasureYear = document.querySelector("#treasure-year");
const treasureCondition = document.querySelector("#treasure-condition");
const treasureQuantity = document.querySelector("#treasure-quantity");
const treasureFolder = document.querySelector("#treasure-folder");
const treasureLocation = document.querySelector("#treasure-location");
const treasurePurchasePrice = document.querySelector("#treasure-purchase-price");
const treasurePurchaseCurrency = document.querySelector("#treasure-purchase-currency");
const treasurePurchaseDate = document.querySelector("#treasure-purchase-date");
const treasureEstimatedValue = document.querySelector("#treasure-estimated-value");
const treasureEstimatedCurrency = document.querySelector("#treasure-estimated-currency");
const treasureValuationSource = document.querySelector("#treasure-valuation-source");
const treasureTags = document.querySelector("#treasure-tags");
const treasureNotes = document.querySelector("#treasure-notes");
const categorySuggestions = document.querySelector("#category-suggestions");

const detailDialog = document.querySelector("#detail-dialog");
const detailTitle = document.querySelector("#detail-title");
const detailEyebrow = document.querySelector("#detail-eyebrow");
const detailContent = document.querySelector("#detail-content");
const detailStatus = document.querySelector("#detail-status");
const imageInput = document.querySelector("#treasure-image-input");
const editTreasureButton = document.querySelector("#edit-treasure");
const deleteTreasureButton = document.querySelector("#delete-treasure");

const folderDialog = document.querySelector("#folder-dialog");
const folderForm = document.querySelector("#folder-form");
const folderName = document.querySelector("#folder-name");
const folderParent = document.querySelector("#folder-parent");
const folderManagerList = document.querySelector("#folder-manager-list");
const folderStatus = document.querySelector("#folder-status");

const locationDialog = document.querySelector("#location-dialog");
const locationForm = document.querySelector("#location-form");
const locationName = document.querySelector("#location-name");
const locationKind = document.querySelector("#location-kind");
const locationParent = document.querySelector("#location-parent");
const locationManagerList = document.querySelector("#location-manager-list");
const locationStatus = document.querySelector("#location-status");

const duplicatesDialog = document.querySelector("#duplicates-dialog");
const duplicatesList = document.querySelector("#duplicates-list");

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

  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body.message ?? "The Royal Vault could not complete that request.");
  return body;
}

function money(cents, currency = "USD") {
  if (!Number.isInteger(cents)) return "Not recorded";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(cents / 100);
  } catch {
    return `${currency ?? ""} ${(cents / 100).toFixed(2)}`.trim();
  }
}

function decimalToCents(value, name) {
  const clean = String(value ?? "").trim().replace(/[$,\s]/g, "");
  if (!clean) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) throw new Error(`${name} must be a positive amount with at most two decimal places.`);
  const [whole, fraction = ""] = clean.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error(`${name} is too large.`);
  return cents;
}

function centsToDecimal(cents) {
  return Number.isInteger(cents) ? (cents / 100).toFixed(2) : "";
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, value.length === 10 ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function buildHierarchy(items) {
  const byParent = new Map();
  for (const item of items) {
    const key = item.parentId ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  }
  for (const children of byParent.values()) children.sort((a, b) => a.name.localeCompare(b.name));

  const rows = [];
  function walk(parentId, depth, ancestors) {
    for (const item of byParent.get(parentId) ?? []) {
      if (ancestors.has(item.id)) continue;
      rows.push({ item, depth });
      walk(item.id, depth + 1, new Set([...ancestors, item.id]));
    }
  }
  walk("root", 0, new Set());
  return rows;
}

function hierarchyLabel(items, id) {
  if (!id) return null;
  const map = new Map(items.map((item) => [item.id, item]));
  const parts = [];
  const seen = new Set();
  let current = map.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? map.get(current.parentId) : null;
  }
  return parts.join(" → ") || null;
}

function fillHierarchySelect(select, items, firstLabel) {
  const current = select.value;
  select.replaceChildren(new Option(firstLabel, ""));
  for (const { item, depth } of buildHierarchy(items)) {
    select.append(new Option(`${"— ".repeat(depth)}${item.name}`, item.id));
  }
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderOrganizationTrees() {
  folderTree.replaceChildren();
  if (!state.folders.length) folderTree.append(element("p", "empty-copy", "No collection folders yet."));
  for (const { item, depth } of buildHierarchy(state.folders)) {
    const row = element("div", "tree-item tree-item-depth");
    row.style.setProperty("--depth", depth);
    const button = element("button", "", item.name);
    button.type = "button";
    button.addEventListener("click", () => {
      folderFilter.value = item.id;
      loadTreasures({ reset: true });
    });
    row.append(button);
    folderTree.append(row);
  }

  locationTree.replaceChildren();
  if (!state.locations.length) locationTree.append(element("p", "empty-copy", "No physical storage locations yet."));
  for (const { item, depth } of buildHierarchy(state.locations)) {
    const row = element("div", "tree-item tree-item-depth");
    row.style.setProperty("--depth", depth);
    const button = element("button", "", item.name);
    button.type = "button";
    button.addEventListener("click", () => {
      locationFilter.value = item.id;
      loadTreasures({ reset: true });
    });
    row.append(button, element("span", "tree-kind", item.kind));
    locationTree.append(row);
  }
}

function refreshOrganizationSelects() {
  fillHierarchySelect(folderFilter, state.folders, "All folders");
  fillHierarchySelect(treasureFolder, state.folders, "No folder");
  fillHierarchySelect(folderParent, state.folders, "Top level");
  fillHierarchySelect(locationFilter, state.locations, "All locations");
  fillHierarchySelect(treasureLocation, state.locations, "Location not recorded");
  fillHierarchySelect(locationParent, state.locations, "Top level");
  renderOrganizationTrees();
  renderManagers();
}

function renderManagers() {
  folderManagerList.replaceChildren();
  if (!state.folders.length) folderManagerList.append(element("p", "empty-copy", "No folders have been created."));
  for (const { item, depth } of buildHierarchy(state.folders)) {
    const row = element("div", "manager-row");
    const copy = element("div");
    copy.append(element("strong", "", `${"— ".repeat(depth)}${item.name}`), element("small", "", item.parentId ? `Inside ${hierarchyLabel(state.folders, item.parentId)}` : "Top-level collection folder"));
    const remove = element("button", "manager-delete", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteFolder(item));
    row.append(copy, remove);
    folderManagerList.append(row);
  }

  locationManagerList.replaceChildren();
  if (!state.locations.length) locationManagerList.append(element("p", "empty-copy", "No storage locations have been recorded."));
  for (const { item, depth } of buildHierarchy(state.locations)) {
    const row = element("div", "manager-row");
    const copy = element("div");
    copy.append(element("strong", "", `${"— ".repeat(depth)}${item.name}`), element("small", "", `${item.kind}${item.parentId ? ` • inside ${hierarchyLabel(state.locations, item.parentId)}` : " • top level"}`));
    const remove = element("button", "manager-delete", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteLocation(item));
    row.append(copy, remove);
    locationManagerList.append(row);
  }
}

async function loadOrganization() {
  const [folders, locations] = await Promise.all([api("/api/vault/folders"), api("/api/vault/locations")]);
  state.folders = folders.folders;
  state.locations = locations.locations;
  refreshOrganizationSelects();
}

function renderStats() {
  const stats = state.stats;
  if (!stats) return;
  statTreasures.textContent = stats.treasureCount.toLocaleString();
  statUnits.textContent = `${stats.unitCount.toLocaleString()} total ${stats.unitCount === 1 ? "unit" : "units"}`;
  statCategories.textContent = stats.categoryCount.toLocaleString();
  statDuplicates.textContent = stats.duplicateGroups.toLocaleString();
  statValue.textContent = money(stats.usdEstimatedValueCents, "USD");

  const currentCategory = categoryFilter.value;
  categoryFilter.replaceChildren(new Option("All categories", ""));
  categorySuggestions.replaceChildren();
  for (const item of stats.categories) {
    categoryFilter.append(new Option(`${item.category} (${item.count})`, item.category));
    categorySuggestions.append(new Option(item.category));
  }
  if ([...categoryFilter.options].some((option) => option.value === currentCategory)) categoryFilter.value = currentCategory;
}

async function loadStats() {
  const { stats } = await api("/api/vault/stats");
  state.stats = stats;
  renderStats();
}

function primaryMedia(treasure) {
  return Array.isArray(treasure.media) && treasure.media.length ? treasure.media[0] : null;
}

function treasureCard(treasure) {
  const card = element("article", "treasure-card");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Open ${treasure.title}`);
  const thumb = element("div", "treasure-thumb");
  const media = primaryMedia(treasure);
  if (media) {
    const image = document.createElement("img");
    image.src = media.href;
    image.alt = `Photo of ${treasure.title}`;
    image.loading = "lazy";
    thumb.append(image);
  } else {
    thumb.append(element("span", "treasure-monogram", treasure.title.slice(0, 1).toUpperCase() || "♛"));
  }

  const body = element("div", "treasure-card-body");
  body.append(element("span", "eyebrow", treasure.category), element("h3", "", treasure.title));
  const meta = element("div", "treasure-meta");
  if (treasure.year !== null) meta.append(element("span", "", String(treasure.year)));
  if (treasure.condition) meta.append(element("span", "", treasure.condition));
  if (treasure.quantity > 1) meta.append(element("span", "", `Qty ${treasure.quantity}`));
  const location = hierarchyLabel(state.locations, treasure.locationId);
  if (location) meta.append(element("span", "", location));
  body.append(meta);
  if (Number.isInteger(treasure.estimatedValueCents)) body.append(element("span", "treasure-value", `${money(treasure.estimatedValueCents, treasure.estimatedValueCurrency)} recorded estimate`));
  card.append(thumb, body);

  const open = () => openDetail(treasure.id);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
  });
  return card;
}

function renderTreasures() {
  treasureGrid.classList.toggle("list-view", state.view === "list");
  treasureGrid.replaceChildren(...state.treasures.map(treasureCard));
  emptyState.hidden = state.treasures.length > 0 || state.offset > 0;
  loadMoreButton.hidden = !state.hasMore;
  gridViewButton.classList.toggle("active", state.view === "grid");
  listViewButton.classList.toggle("active", state.view === "list");
  gridViewButton.setAttribute("aria-pressed", String(state.view === "grid"));
  listViewButton.setAttribute("aria-pressed", String(state.view === "list"));
}

function treasureQuery(offset) {
  const params = new URLSearchParams({ limit: String(state.limit), offset: String(offset), sort: sortTreasures.value });
  if (searchInput.value.trim()) params.set("query", searchInput.value.trim());
  if (categoryFilter.value) params.set("category", categoryFilter.value);
  if (folderFilter.value) params.set("folderId", folderFilter.value);
  if (locationFilter.value) params.set("locationId", locationFilter.value);
  return params;
}

async function loadTreasures({ reset = false } = {}) {
  if (reset) {
    state.offset = 0;
    state.treasures = [];
  }
  loadingState.hidden = false;
  resultStatus.textContent = "Searching secure Vault records…";
  try {
    const result = await api(`/api/vault/treasures?${treasureQuery(state.offset)}`);
    state.treasures = reset ? result.items : [...state.treasures, ...result.items];
    state.hasMore = Boolean(result.hasMore);
    state.offset = state.treasures.length;
    renderTreasures();
    const shown = state.treasures.length;
    const total = Number.isInteger(result.total) && !result.searchApplied ? ` of ${result.total.toLocaleString()}` : "";
    resultStatus.textContent = `${shown.toLocaleString()} treasure ${shown === 1 ? "record" : "records"}${total} shown${result.searchApplied ? " for this search" : ""}.`;
  } catch (error) {
    resultStatus.textContent = error.message;
  } finally {
    loadingState.hidden = true;
  }
}

function openTreasureForm(treasure = null) {
  treasureForm.reset();
  treasureFormStatus.textContent = "";
  treasureId.value = treasure?.id ?? "";
  treasureFormTitle.textContent = treasure ? "Edit treasure record" : "Add a treasure";
  treasureTitle.value = treasure?.title ?? "";
  treasureCategory.value = treasure?.category ?? "";
  treasureSeries.value = treasure?.series ?? "";
  treasureManufacturer.value = treasure?.manufacturer ?? "";
  treasureYear.value = treasure?.year ?? "";
  treasureCondition.value = treasure?.condition ?? "";
  treasureQuantity.value = treasure?.quantity ?? 1;
  treasureFolder.value = treasure?.folderId ?? "";
  treasureLocation.value = treasure?.locationId ?? "";
  treasurePurchasePrice.value = centsToDecimal(treasure?.purchasePriceCents);
  treasurePurchaseCurrency.value = treasure?.purchaseCurrency ?? "USD";
  treasurePurchaseDate.value = treasure?.purchaseDate ?? "";
  treasureEstimatedValue.value = centsToDecimal(treasure?.estimatedValueCents);
  treasureEstimatedCurrency.value = treasure?.estimatedValueCurrency ?? "USD";
  treasureValuationSource.value = treasure?.valuationSource ?? "";
  treasureTags.value = treasure?.tags?.join(", ") ?? "";
  treasureNotes.value = treasure?.notes ?? "";
  treasureDialog.showModal();
  setTimeout(() => treasureTitle.focus(), 0);
}

function treasurePayload() {
  const year = treasureYear.value.trim() ? Number.parseInt(treasureYear.value, 10) : null;
  return {
    title: treasureTitle.value,
    category: treasureCategory.value,
    series: treasureSeries.value || null,
    manufacturer: treasureManufacturer.value || null,
    year,
    condition: treasureCondition.value || null,
    quantity: Number.parseInt(treasureQuantity.value, 10),
    folderId: treasureFolder.value || null,
    locationId: treasureLocation.value || null,
    purchasePriceCents: decimalToCents(treasurePurchasePrice.value, "Purchase price"),
    purchaseCurrency: treasurePurchasePrice.value.trim() ? treasurePurchaseCurrency.value : null,
    purchaseDate: treasurePurchaseDate.value || null,
    estimatedValueCents: decimalToCents(treasureEstimatedValue.value, "Estimated value"),
    estimatedValueCurrency: treasureEstimatedValue.value.trim() ? treasureEstimatedCurrency.value : null,
    valuationSource: treasureEstimatedValue.value.trim() ? (treasureValuationSource.value || "collector-entered") : null,
    notes: treasureNotes.value || null,
    tags: treasureTags.value.split(",").map((tag) => tag.trim()).filter(Boolean)
  };
}

async function saveTreasure(event) {
  event.preventDefault();
  treasureFormStatus.textContent = "Securing treasure record…";
  try {
    const id = treasureId.value;
    const result = await api(id ? `/api/vault/treasures/${encodeURIComponent(id)}` : "/api/vault/treasures", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(treasurePayload())
    });
    treasureFormStatus.textContent = "Treasure record secured.";
    treasureDialog.close();
    await Promise.all([loadStats(), loadTreasures({ reset: true })]);
    if (state.currentTreasure?.id === result.treasure.id) await openDetail(result.treasure.id);
  } catch (error) {
    treasureFormStatus.textContent = error.message;
  }
}

function detailField(label, value, { full = false } = {}) {
  const field = element("dl", `detail-field${full ? " full" : ""}`);
  field.append(element("dt", "", label), element("dd", "", value ?? "Not recorded"));
  return field;
}

async function openDetail(id) {
  detailStatus.textContent = "Opening secure record…";
  const [{ treasure }, historyResult] = await Promise.all([
    api(`/api/vault/treasures/${encodeURIComponent(id)}`),
    api(`/api/vault/treasures/${encodeURIComponent(id)}/history`)
  ]);
  state.currentTreasure = treasure;
  detailTitle.textContent = treasure.title;
  detailEyebrow.textContent = treasure.category;
  detailContent.replaceChildren();

  const layout = element("div", "detail-layout");
  const gallery = element("div", "detail-gallery");
  const primary = element("div", "detail-primary-image");
  if (treasure.media.length) {
    const image = document.createElement("img");
    image.src = treasure.media[0].href;
    image.alt = `Photo of ${treasure.title}`;
    primary.append(image);
    if (treasure.media.length > 1) {
      const thumbnails = element("div", "detail-image-grid");
      for (const media of treasure.media) {
        const thumb = document.createElement("img");
        thumb.src = media.href;
        thumb.alt = "";
        thumb.loading = "lazy";
        thumb.addEventListener("click", () => { image.src = media.href; });
        thumbnails.append(thumb);
      }
      gallery.append(primary, thumbnails);
    } else gallery.append(primary);
  } else {
    primary.append(element("span", "treasure-monogram", treasure.title.slice(0, 1).toUpperCase()));
    gallery.append(primary, element("p", "empty-copy", "No photos have been attached to this treasure yet."));
  }

  const fields = element("div", "detail-fields");
  fields.append(
    detailField("Category", treasure.category),
    detailField("Series / set", treasure.series),
    detailField("Publisher / manufacturer", treasure.manufacturer),
    detailField("Year", treasure.year),
    detailField("Condition", treasure.condition),
    detailField("Quantity", treasure.quantity),
    detailField("Collection folder", hierarchyLabel(state.folders, treasure.folderId)),
    detailField("Physical location", hierarchyLabel(state.locations, treasure.locationId)),
    detailField("Purchase price", Number.isInteger(treasure.purchasePriceCents) ? money(treasure.purchasePriceCents, treasure.purchaseCurrency) : null),
    detailField("Purchase date", treasure.purchaseDate ? formatDate(treasure.purchaseDate) : null),
    detailField("Recorded estimate", Number.isInteger(treasure.estimatedValueCents) ? money(treasure.estimatedValueCents, treasure.estimatedValueCurrency) : null),
    detailField("Value evidence", treasure.valuationSource ? `${treasure.valuationSource}${treasure.valuationAsOf ? ` • ${formatDate(treasure.valuationAsOf)}` : ""}` : null),
    detailField("Tags", treasure.tags.length ? treasure.tags.join(", ") : null, { full: true }),
    detailField("Collector notes", treasure.notes, { full: true })
  );

  const history = element("section", "detail-history");
  history.append(element("h3", "", "Vault history"));
  const historyList = element("ul", "detail-history-list");
  for (const event of historyResult.history) {
    const item = element("li");
    item.append(element("span", "", event.eventType.replace(/^vault\./, "").replaceAll("_", " ")), element("time", "", formatDate(event.createdAt)));
    historyList.append(item);
  }
  if (!historyResult.history.length) historyList.append(element("li", "", "No audit history recorded."));
  history.append(historyList);
  fields.append(history);
  layout.append(gallery, fields);
  detailContent.append(layout);
  detailStatus.textContent = "";
  if (!detailDialog.open) detailDialog.showModal();
}

async function uploadImage(file) {
  if (!state.currentTreasure || !file) return;
  detailStatus.textContent = "Securing photo in the Vault…";
  const safeName = file.name.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 200);
  try {
    const response = await fetch(`/api/vault/treasures/${encodeURIComponent(state.currentTreasure.id)}/images`, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": file.type || "application/octet-stream", "X-File-Name": safeName },
      body: file
    });
    if (response.status === 401) { window.location.assign("/auth.html"); return; }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message ?? "The photo could not be stored.");
    await Promise.all([openDetail(state.currentTreasure.id), loadTreasures({ reset: true })]);
    detailStatus.textContent = "Photo secured in the Vault.";
  } catch (error) {
    detailStatus.textContent = error.message;
  } finally {
    imageInput.value = "";
  }
}

async function removeTreasure() {
  const treasure = state.currentTreasure;
  if (!treasure) return;
  if (!window.confirm(`Remove “${treasure.title}” from your Royal Vault? This deletes its stored record and attached Vault photos.`)) return;
  detailStatus.textContent = "Removing treasure…";
  try {
    await api(`/api/vault/treasures/${encodeURIComponent(treasure.id)}`, { method: "DELETE" });
    state.currentTreasure = null;
    detailDialog.close();
    await Promise.all([loadStats(), loadTreasures({ reset: true })]);
  } catch (error) {
    detailStatus.textContent = error.message;
  }
}

async function createFolder(event) {
  event.preventDefault();
  folderStatus.textContent = "Creating folder…";
  try {
    await api("/api/vault/folders", { method: "POST", body: JSON.stringify({ name: folderName.value, parentId: folderParent.value || null }) });
    folderForm.reset();
    await loadOrganization();
    folderStatus.textContent = "Folder created.";
  } catch (error) { folderStatus.textContent = error.message; }
}

async function deleteFolder(folder) {
  if (!window.confirm(`Delete empty folder “${folder.name}”?`)) return;
  folderStatus.textContent = "Deleting folder…";
  try {
    await api(`/api/vault/folders/${encodeURIComponent(folder.id)}`, { method: "DELETE" });
    await loadOrganization();
    folderStatus.textContent = "Folder deleted.";
  } catch (error) { folderStatus.textContent = error.message; }
}

async function createLocation(event) {
  event.preventDefault();
  locationStatus.textContent = "Creating physical location…";
  try {
    await api("/api/vault/locations", { method: "POST", body: JSON.stringify({ name: locationName.value, kind: locationKind.value, parentId: locationParent.value || null }) });
    locationForm.reset();
    await loadOrganization();
    locationStatus.textContent = "Physical location recorded.";
  } catch (error) { locationStatus.textContent = error.message; }
}

async function deleteLocation(location) {
  if (!window.confirm(`Delete empty location “${location.name}”?`)) return;
  locationStatus.textContent = "Deleting location…";
  try {
    await api(`/api/vault/locations/${encodeURIComponent(location.id)}`, { method: "DELETE" });
    await loadOrganization();
    locationStatus.textContent = "Location deleted.";
  } catch (error) { locationStatus.textContent = error.message; }
}

async function showDuplicates() {
  duplicatesList.replaceChildren(element("p", "empty-copy", "Checking possible duplicate records…"));
  duplicatesDialog.showModal();
  try {
    const { groups } = await api("/api/vault/duplicates");
    duplicatesList.replaceChildren();
    if (!groups.length) {
      duplicatesList.append(element("p", "empty-copy", "No possible duplicate groups are currently detected."));
      return;
    }
    for (const group of groups) {
      const block = element("article", "duplicate-group");
      block.append(element("h3", "", `${group.count} possible matching records`));
      const list = element("ul");
      for (const treasure of group.treasures) {
        const item = element("li", "", `${treasure.title} • ${treasure.category}${treasure.condition ? ` • ${treasure.condition}` : ""}`);
        list.append(item);
      }
      block.append(list);
      duplicatesList.append(block);
    }
  } catch (error) {
    duplicatesList.replaceChildren(element("p", "empty-copy", error.message));
  }
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

function bindDialogs() {
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog)?.close());
  });
  document.querySelectorAll("[data-open-treasure-form]").forEach((button) => button.addEventListener("click", () => openTreasureForm()));
  document.querySelectorAll("[data-open-folder-manager]").forEach((button) => button.addEventListener("click", () => openDialog(folderDialog)));
  document.querySelectorAll("[data-open-location-manager]").forEach((button) => button.addEventListener("click", () => openDialog(locationDialog)));
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
}

function setView(view) {
  state.view = view;
  localStorage.setItem("kingdom.vault.view", view);
  renderTreasures();
}

async function initialize() {
  bindDialogs();
  treasureForm.addEventListener("submit", saveTreasure);
  folderForm.addEventListener("submit", createFolder);
  locationForm.addEventListener("submit", createLocation);
  searchForm.addEventListener("submit", (event) => { event.preventDefault(); loadTreasures({ reset: true }); });
  for (const control of [categoryFilter, folderFilter, locationFilter, sortTreasures]) control.addEventListener("change", () => loadTreasures({ reset: true }));
  loadMoreButton.addEventListener("click", () => loadTreasures());
  gridViewButton.addEventListener("click", () => setView("grid"));
  listViewButton.addEventListener("click", () => setView("list"));
  document.querySelector("#show-duplicates").addEventListener("click", showDuplicates);
  editTreasureButton.addEventListener("click", () => { if (state.currentTreasure) { detailDialog.close(); openTreasureForm(state.currentTreasure); } });
  deleteTreasureButton.addEventListener("click", removeTreasure);
  imageInput.addEventListener("change", () => uploadImage(imageInput.files?.[0]));

  const me = await api("/api/auth/me");
  collectorChip.textContent = `${me.account.displayName} • Royal Vault`;
  await Promise.all([loadOrganization(), loadStats()]);
  await loadTreasures({ reset: true });

  if (window.location.hash === "#add-treasure") openTreasureForm();
}

initialize().catch((error) => {
  resultStatus.textContent = error.message;
  loadingState.hidden = true;
});
