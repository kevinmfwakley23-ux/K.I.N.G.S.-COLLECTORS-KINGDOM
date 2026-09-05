import { createKeeperController } from "./keeper.js";
import { createVoiceController } from "./voice.js";

const keeper = createKeeperController({ roomId: "vault" });

const state = {
  snapshot: null,
  treasures: []
};

const elements = {
  statTreasures: document.querySelector("#stat-treasures"),
  statUnits: document.querySelector("#stat-units"),
  statCost: document.querySelector("#stat-cost"),
  statCostNote: document.querySelector("#stat-cost-note"),
  collectionList: document.querySelector("#collection-list"),
  locationList: document.querySelector("#location-list"),
  collectionForm: document.querySelector("#collection-form"),
  collectionName: document.querySelector("#collection-name"),
  collectionDescription: document.querySelector("#collection-description"),
  collectionStatus: document.querySelector("#collection-status"),
  locationForm: document.querySelector("#location-form"),
  locationName: document.querySelector("#location-name"),
  locationType: document.querySelector("#location-type"),
  locationParent: document.querySelector("#location-parent"),
  locationNotes: document.querySelector("#location-notes"),
  locationStatus: document.querySelector("#location-status"),
  searchForm: document.querySelector("#vault-search-form"),
  search: document.querySelector("#vault-search"),
  filterCategory: document.querySelector("#filter-category"),
  filterCollection: document.querySelector("#filter-collection"),
  filterLocation: document.querySelector("#filter-location"),
  filterSort: document.querySelector("#filter-sort"),
  resultCount: document.querySelector("#result-count"),
  treasureList: document.querySelector("#treasure-list"),
  editor: document.querySelector("#treasure-editor"),
  editorTitle: document.querySelector("#editor-title"),
  treasureForm: document.querySelector("#treasure-form"),
  treasureId: document.querySelector("#treasure-id"),
  treasureTitle: document.querySelector("#treasure-title"),
  treasureCategory: document.querySelector("#treasure-category"),
  treasureCollection: document.querySelector("#treasure-collection"),
  treasureLocation: document.querySelector("#treasure-location"),
  treasureManufacturer: document.querySelector("#treasure-manufacturer"),
  treasureSeries: document.querySelector("#treasure-series"),
  treasureVariant: document.querySelector("#treasure-variant"),
  treasureCondition: document.querySelector("#treasure-condition"),
  treasureQuantity: document.querySelector("#treasure-quantity"),
  treasureAcquisitionDate: document.querySelector("#treasure-acquisition-date"),
  treasurePurchasePrice: document.querySelector("#treasure-purchase-price"),
  treasureCurrency: document.querySelector("#treasure-currency"),
  treasureBarcode: document.querySelector("#treasure-barcode"),
  treasureCatalog: document.querySelector("#treasure-catalog"),
  treasureDescription: document.querySelector("#treasure-description"),
  treasureConditionNotes: document.querySelector("#treasure-condition-notes"),
  treasureAttributes: document.querySelector("#treasure-attributes"),
  treasureNotes: document.querySelector("#treasure-notes"),
  treasureStatus: document.querySelector("#treasure-status"),
  archiveTreasure: document.querySelector("#archive-treasure"),
  mediaSection: document.querySelector("#treasure-media-section"),
  mediaFile: document.querySelector("#treasure-media-file"),
  mediaUpload: document.querySelector("#upload-treasure-media"),
  mediaStatus: document.querySelector("#treasure-media-status"),
  mediaList: document.querySelector("#treasure-media-list"),
  importForm: document.querySelector("#import-preview-form"),
  importJson: document.querySelector("#import-json"),
  importResult: document.querySelector("#import-preview-result")
};

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
  if (!response.ok) throw new Error(body.message ?? "The Royal Vault could not complete that request.");
  return body;
}

async function uploadMedia(treasureId, file) {
  const typeByExtension = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    pdf: "application/pdf"
  };
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = file.type || typeByExtension[extension];
  if (!contentType) throw new Error("The selected file type is not supported by the Royal Vault.");

  const response = await fetch(`/api/vault/treasures/${encodeURIComponent(treasureId)}/media?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": contentType
    },
    body: file
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
  if (!response.ok) throw new Error(body.message ?? "The Royal Vault could not store that media file.");
  return body.media;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function replaceOptions(select, baseLabel, records, valueKey, label) {
  const selected = select.value;
  select.replaceChildren();
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = baseLabel;
  select.append(blank);
  for (const record of records) {
    const option = document.createElement("option");
    option.value = record[valueKey];
    option.textContent = label(record);
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

function formatMoney(cents, currency = "USD") {
  if (!Number.isInteger(cents)) return "Not recorded";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(cents / 100);
  } catch {
    return `${currency || ""} ${(cents / 100).toFixed(2)}`.trim();
  }
}

function purchaseCostSummary(stats) {
  if (Array.isArray(stats.purchaseTotals) && stats.purchaseTotals.length) {
    return stats.purchaseTotals.map((entry) => formatMoney(entry.totalCents, entry.currency)).join(" • ");
  }
  return "None recorded";
}

function renderStats() {
  const stats = state.snapshot?.stats;
  if (!stats) return;
  elements.statTreasures.textContent = String(stats.treasureCount);
  elements.statUnits.textContent = String(stats.unitCount);
  elements.statCost.textContent = purchaseCostSummary(stats);
  const pricedCount = stats.pricedTreasureCount ?? 0;
  elements.statCostNote.textContent = `${pricedCount} treasure record${pricedCount === 1 ? "" : "s"} with purchase cost`;
}

function sideButton(label, meta, onClick) {
  const button = node("button", "vault-nav-item");
  button.type = "button";
  const copy = node("span", "vault-nav-copy");
  copy.append(node("strong", "", label), node("small", "", meta));
  button.append(copy, node("span", "vault-nav-arrow", "→"));
  button.addEventListener("click", onClick);
  return button;
}

function renderCollections() {
  const collections = state.snapshot?.collections ?? [];
  elements.collectionList.replaceChildren();
  if (!collections.length) elements.collectionList.append(node("p", "empty-note", "No collection groups yet. Your treasures can still exist independently."));
  for (const collection of collections) {
    elements.collectionList.append(sideButton(
      collection.name,
      `${collection.treasureCount} records • ${collection.unitCount} units`,
      () => {
        elements.filterCollection.value = collection.id;
        loadTreasures();
      }
    ));
  }
  replaceOptions(elements.filterCollection, "All collections", collections, "id", (record) => record.name);
  replaceOptions(elements.treasureCollection, "No collection group", collections, "id", (record) => record.name);
}

function renderLocations() {
  const locations = state.snapshot?.locations ?? [];
  elements.locationList.replaceChildren();
  if (!locations.length) elements.locationList.append(node("p", "empty-note", "No physical storage map yet. Add a room, safe, cabinet, shelf, binder, box, or any custom location."));
  for (const location of locations) {
    elements.locationList.append(sideButton(
      location.path,
      `${location.locationType} • ${location.treasureCount} records`,
      () => {
        elements.filterLocation.value = location.id;
        loadTreasures();
      }
    ));
  }
  replaceOptions(elements.filterLocation, "All locations", locations, "id", (record) => record.path);
  replaceOptions(elements.treasureLocation, "Location not recorded", locations, "id", (record) => record.path);
  replaceOptions(elements.locationParent, "Top level", locations, "id", (record) => record.path);
}

function renderCategoryFilter() {
  const selected = elements.filterCategory.value;
  const categories = state.snapshot?.stats?.categories ?? [];
  replaceOptions(elements.filterCategory, "All categories", categories, "category", (record) => `${record.category} (${record.treasureCount})`);
  if ([...elements.filterCategory.options].some((option) => option.value === selected)) elements.filterCategory.value = selected;
}

function filterQuery() {
  const params = new URLSearchParams();
  const values = {
    q: elements.search.value.trim(),
    category: elements.filterCategory.value,
    collectionId: elements.filterCollection.value,
    locationId: elements.filterLocation.value,
    sort: elements.filterSort.value,
    order: elements.filterSort.value === "title" || elements.filterSort.value === "category" ? "asc" : "desc"
  };
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  params.set("limit", "500");
  return params.toString();
}

function treasureSubtitle(treasure) {
  return [treasure.category, treasure.manufacturer, treasure.series, treasure.variant].filter(Boolean).join(" • ");
}

function treasureMeta(treasure) {
  const parts = [];
  if (treasure.condition) parts.push(`Condition: ${treasure.condition}`);
  parts.push(`Qty: ${treasure.quantity}`);
  if (treasure.purchasePriceCents !== null) parts.push(`Paid: ${formatMoney(treasure.purchasePriceCents, treasure.currency)}`);
  return parts.join(" • ");
}

async function showDuplicates(treasure, output) {
  output.textContent = "Checking duplicate signals…";
  try {
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasure.id)}/duplicates`);
    if (!result.candidates.length) {
      output.textContent = "No current duplicate candidates were found.";
      return;
    }
    output.textContent = `${result.candidates.length} candidate${result.candidates.length === 1 ? "" : "s"}: ${result.candidates.map((candidate) => `${candidate.treasure.title} (${candidate.confidence}; ${candidate.signals.join(", ")})`).join(" | ")}`;
  } catch (error) {
    output.textContent = error.message;
  }
}

function renderTreasures() {
  elements.treasureList.replaceChildren();
  elements.resultCount.textContent = `${state.treasures.length} result${state.treasures.length === 1 ? "" : "s"}`;
  if (!state.treasures.length) {
    const empty = node("div", "vault-empty-state");
    empty.append(node("strong", "", "No treasures match this view."), node("p", "", "Add a treasure or change the filters. The Vault will never fill empty space with invented collection records."));
    elements.treasureList.append(empty);
    return;
  }

  for (const treasure of state.treasures) {
    const card = node("article", "treasure-card");
    const head = node("div", "treasure-card-head");
    const title = node("div", "treasure-card-title");
    title.append(node("p", "eyebrow", treasure.category), node("h3", "", treasure.title));
    const actions = node("div", "treasure-card-actions");
    const edit = node("button", "quiet-button", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => openEditor(treasure));
    const duplicates = node("button", "quiet-button", "Duplicates");
    duplicates.type = "button";
    actions.append(edit, duplicates);
    head.append(title, actions);

    const detail = node("p", "treasure-subtitle", treasureSubtitle(treasure) || "Collector-entered treasure record");
    const meta = node("p", "treasure-meta", treasureMeta(treasure));
    const location = node("p", "treasure-location", treasure.location?.path ? `Stored: ${treasure.location.path}` : "Physical location not recorded");
    const duplicateOutput = node("p", "duplicate-output");
    duplicates.addEventListener("click", () => showDuplicates(treasure, duplicateOutput));

    card.append(head, detail, meta, location);
    if (treasure.notes) card.append(node("p", "treasure-note", treasure.notes));
    card.append(duplicateOutput);
    elements.treasureList.append(card);
  }
}

function findIdentifier(identifiers, preferredKeys) {
  for (const key of preferredKeys) if (identifiers?.[key]) return identifiers[key];
  return "";
}

function resetEditor() {
  elements.treasureForm.reset();
  elements.treasureId.value = "";
  elements.treasureQuantity.value = "1";
  elements.treasureCurrency.value = "USD";
  elements.treasureAttributes.value = "";
  elements.treasureStatus.textContent = "";
  elements.archiveTreasure.hidden = true;
  elements.editorTitle.textContent = "Add a treasure";
  elements.mediaSection.hidden = true;
  elements.mediaFile.value = "";
  elements.mediaStatus.textContent = "Save the treasure record before adding private media.";
  elements.mediaList.replaceChildren();
}

function renderMedia(media) {
  elements.mediaList.replaceChildren();
  if (!media.length) {
    elements.mediaList.append(node("p", "empty-note", "No images or documents are stored for this treasure yet."));
    return;
  }

  for (const item of media) {
    const card = node("article", "vault-media-card");
    if (item.mediaKind === "image") {
      const image = document.createElement("img");
      image.src = item.url;
      image.alt = `Vault image: ${item.originalName}`;
      image.loading = "lazy";
      card.append(image);
    } else {
      card.append(node("div", "vault-media-document", "PDF"));
    }

    const copy = node("div", "vault-media-copy");
    copy.append(node("strong", "", item.originalName), node("small", "", `${item.contentType} • ${Math.max(1, Math.ceil(item.sizeBytes / 1024))} KiB`));
    const actions = node("div", "vault-media-actions");
    const open = node("a", "quiet-button", item.mediaKind === "image" ? "Open" : "Download");
    open.href = item.url;
    if (item.mediaKind === "image") open.target = "_blank";
    const remove = node("button", "danger-button", "Remove");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove ${item.originalName} from this treasure's private media?`)) return;
      elements.mediaStatus.textContent = "Removing private media…";
      try {
        await api(item.url, { method: "DELETE" });
        await loadTreasureMedia(item.treasureId);
        elements.mediaStatus.textContent = "Media removed.";
      } catch (error) {
        elements.mediaStatus.textContent = error.message;
      }
    });
    actions.append(open, remove);
    copy.append(actions);
    card.append(copy);
    elements.mediaList.append(card);
  }
}

async function loadTreasureMedia(treasureId) {
  if (!treasureId) {
    renderMedia([]);
    return;
  }
  const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/media`);
  renderMedia(result.media);
}

function openEditor(treasure = null) {
  resetEditor();
  if (treasure) {
    elements.editorTitle.textContent = "Edit treasure";
    elements.treasureId.value = treasure.id;
    elements.treasureTitle.value = treasure.title ?? "";
    elements.treasureCategory.value = treasure.category ?? "";
    elements.treasureCollection.value = treasure.collectionId ?? "";
    elements.treasureLocation.value = treasure.locationId ?? "";
    elements.treasureManufacturer.value = treasure.manufacturer ?? "";
    elements.treasureSeries.value = treasure.series ?? "";
    elements.treasureVariant.value = treasure.variant ?? "";
    elements.treasureCondition.value = treasure.condition ?? "";
    elements.treasureQuantity.value = String(treasure.quantity ?? 1);
    elements.treasureAcquisitionDate.value = treasure.acquisitionDate ?? "";
    elements.treasurePurchasePrice.value = treasure.purchasePriceCents === null ? "" : (treasure.purchasePriceCents / 100).toFixed(2);
    elements.treasureCurrency.value = treasure.currency ?? "USD";
    elements.treasureBarcode.value = findIdentifier(treasure.externalIdentifiers, ["barcode", "upc", "ean", "isbn"]);
    elements.treasureCatalog.value = findIdentifier(treasure.externalIdentifiers, ["catalog", "serial", "catalog-number"]);
    elements.treasureDescription.value = treasure.description ?? "";
    elements.treasureConditionNotes.value = treasure.conditionNotes ?? "";
    elements.treasureAttributes.value = Object.keys(treasure.attributes ?? {}).length ? JSON.stringify(treasure.attributes, null, 2) : "";
    elements.treasureNotes.value = treasure.notes ?? "";
    elements.archiveTreasure.hidden = false;
    elements.mediaSection.hidden = false;
    elements.mediaStatus.textContent = "Private media is owner-scoped and served only through authenticated Vault routes.";
    loadTreasureMedia(treasure.id).catch((error) => { elements.mediaStatus.textContent = error.message; });
  }
  elements.editor.hidden = false;
  elements.editor.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.treasureTitle.focus();
}

function closeEditor() {
  elements.editor.hidden = true;
  resetEditor();
}

function parseAttributes() {
  const raw = elements.treasureAttributes.value.trim();
  if (!raw) return {};
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Custom attributes must be valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Custom attributes must be a JSON object.");
  return value;
}

function treasurePayload() {
  const identifiers = {};
  if (elements.treasureBarcode.value.trim()) identifiers.barcode = elements.treasureBarcode.value.trim();
  if (elements.treasureCatalog.value.trim()) identifiers.catalog = elements.treasureCatalog.value.trim();
  const rawPrice = elements.treasurePurchasePrice.value.trim();
  return {
    title: elements.treasureTitle.value,
    category: elements.treasureCategory.value,
    collectionId: elements.treasureCollection.value || null,
    locationId: elements.treasureLocation.value || null,
    manufacturer: elements.treasureManufacturer.value || null,
    series: elements.treasureSeries.value || null,
    variant: elements.treasureVariant.value || null,
    condition: elements.treasureCondition.value || null,
    quantity: Number(elements.treasureQuantity.value),
    acquisitionDate: elements.treasureAcquisitionDate.value || null,
    purchasePriceCents: rawPrice ? Math.round(Number(rawPrice) * 100) : null,
    currency: rawPrice ? elements.treasureCurrency.value : null,
    externalIdentifiers: identifiers,
    description: elements.treasureDescription.value || null,
    conditionNotes: elements.treasureConditionNotes.value || null,
    attributes: parseAttributes(),
    notes: elements.treasureNotes.value || null
  };
}

async function refreshSnapshot() {
  state.snapshot = await api("/api/vault");
  renderStats();
  renderCollections();
  renderLocations();
  renderCategoryFilter();
}

async function loadTreasures() {
  const result = await api(`/api/vault/treasures?${filterQuery()}`);
  state.treasures = result.treasures;
  renderTreasures();
}

async function refreshAll() {
  await refreshSnapshot();
  await loadTreasures();
}

function toggleForm(form) {
  form.hidden = !form.hidden;
  if (!form.hidden) form.querySelector("input, select, textarea")?.focus();
}

createVoiceController({
  keeper,
  onSearch: async (query) => {
    elements.search.value = query;
    await loadTreasures();
  },
  onAddTreasure: () => openEditor()
});

document.querySelector("#new-treasure-button").addEventListener("click", () => openEditor());
document.querySelector("#inventory-add").addEventListener("click", () => openEditor());
document.querySelector("#close-editor").addEventListener("click", closeEditor);
document.querySelector("#toggle-collection-form").addEventListener("click", () => toggleForm(elements.collectionForm));
document.querySelector("#toggle-location-form").addEventListener("click", () => toggleForm(elements.locationForm));

elements.collectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.collectionStatus.textContent = "Creating…";
  try {
    await api("/api/vault/collections", {
      method: "POST",
      body: JSON.stringify({ name: elements.collectionName.value, description: elements.collectionDescription.value || null })
    });
    elements.collectionForm.reset();
    elements.collectionForm.hidden = true;
    elements.collectionStatus.textContent = "";
    await refreshAll();
  } catch (error) {
    elements.collectionStatus.textContent = error.message;
  }
});

elements.locationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.locationStatus.textContent = "Creating…";
  try {
    await api("/api/vault/locations", {
      method: "POST",
      body: JSON.stringify({
        name: elements.locationName.value,
        locationType: elements.locationType.value,
        parentId: elements.locationParent.value || null,
        notes: elements.locationNotes.value || null
      })
    });
    elements.locationForm.reset();
    elements.locationForm.hidden = true;
    elements.locationStatus.textContent = "";
    await refreshAll();
  } catch (error) {
    elements.locationStatus.textContent = error.message;
  }
});

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadTreasures().catch((error) => { elements.resultCount.textContent = error.message; });
});

for (const select of [elements.filterCategory, elements.filterCollection, elements.filterLocation, elements.filterSort]) {
  select.addEventListener("change", () => loadTreasures().catch((error) => { elements.resultCount.textContent = error.message; }));
}

document.querySelector("#clear-filters").addEventListener("click", () => {
  elements.search.value = "";
  elements.filterCategory.value = "";
  elements.filterCollection.value = "";
  elements.filterLocation.value = "";
  elements.filterSort.value = "updatedAt";
  loadTreasures().catch((error) => { elements.resultCount.textContent = error.message; });
});

elements.treasureForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.treasureStatus.textContent = "Saving authoritative record…";
  try {
    const id = elements.treasureId.value;
    const result = await api(id ? `/api/vault/treasures/${encodeURIComponent(id)}` : "/api/vault/treasures", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(treasurePayload())
    });
    await refreshAll();
    openEditor(result.treasure);
    elements.treasureStatus.textContent = "Treasure saved. Private images and documents can now be attached to this permanent record.";
  } catch (error) {
    elements.treasureStatus.textContent = error.message;
  }
});

elements.mediaUpload.addEventListener("click", async () => {
  const treasureId = elements.treasureId.value;
  const file = elements.mediaFile.files?.[0];
  if (!treasureId) {
    elements.mediaStatus.textContent = "Save the treasure record before adding media.";
    return;
  }
  if (!file) {
    elements.mediaStatus.textContent = "Choose an image or PDF first.";
    return;
  }
  elements.mediaStatus.textContent = "Validating and securing private media…";
  elements.mediaUpload.disabled = true;
  try {
    await uploadMedia(treasureId, file);
    elements.mediaFile.value = "";
    await loadTreasureMedia(treasureId);
    elements.mediaStatus.textContent = "Media securely attached to this treasure.";
  } catch (error) {
    elements.mediaStatus.textContent = error.message;
  } finally {
    elements.mediaUpload.disabled = false;
  }
});

elements.archiveTreasure.addEventListener("click", async () => {
  const id = elements.treasureId.value;
  if (!id) return;
  if (!window.confirm("Archive this treasure record? It will leave normal Vault views but remain in history/export rather than being silently destroyed.")) return;
  elements.treasureStatus.textContent = "Archiving…";
  try {
    await api(`/api/vault/treasures/${encodeURIComponent(id)}`, { method: "DELETE" });
    closeEditor();
    await refreshAll();
  } catch (error) {
    elements.treasureStatus.textContent = error.message;
  }
});

elements.importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.importResult.textContent = "Validating without writing…";
  try {
    const parsed = JSON.parse(elements.importJson.value);
    if (!Array.isArray(parsed)) throw new Error("Import JSON must be an array of treasure records.");
    const result = await api("/api/vault/import/preview", {
      method: "POST",
      body: JSON.stringify({ records: parsed })
    });
    elements.importResult.textContent = JSON.stringify({
      accepted: result.accepted.length,
      rejected: result.rejected,
      written: false,
      message: result.message
    }, null, 2);
  } catch (error) {
    elements.importResult.textContent = error.message;
  }
});

refreshAll().catch((error) => {
  elements.treasureList.replaceChildren(node("div", "vault-empty-state", error.message));
});
