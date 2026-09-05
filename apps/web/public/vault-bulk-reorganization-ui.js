import {
  BULK_DESTINATION_CLEAR,
  BULK_DESTINATION_UNCHANGED,
  MAX_BULK_REORGANIZATION_SELECTION,
  bulkDestinationFromChoices,
  createBulkIdempotencyKey,
  organizationSummary,
  previewRowSummary,
  selectionStatus
} from "./vault-bulk-reorganization-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-bulk-reorganization.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-bulk-reorganization.css";
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
  if (!response.ok) {
    const error = new Error(body.message ?? "The Royal Vault could not complete that bulk organization request.");
    error.code = body.error ?? "bulk_reorganization_failed";
    error.details = body.details ?? null;
    throw error;
  }
  return body;
}

function option(value, label) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function browserUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw new Error("Secure browser randomness is unavailable; this movement cannot be committed safely from this browser.");
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function treasureOrganization(treasure) {
  return organizationSummary({ collection: treasure.collection, location: treasure.location });
}

function populateDestinationSelects(collectionSelect, locationSelect, snapshot) {
  const currentCollection = collectionSelect.value || BULK_DESTINATION_UNCHANGED;
  const currentLocation = locationSelect.value || BULK_DESTINATION_UNCHANGED;

  collectionSelect.replaceChildren(
    option(BULK_DESTINATION_UNCHANGED, "Keep each treasure's current collection"),
    option(BULK_DESTINATION_CLEAR, "Remove from collection group")
  );
  for (const collection of snapshot.collections ?? []) {
    collectionSelect.append(option(`id:${collection.id}`, collection.name));
  }

  locationSelect.replaceChildren(
    option(BULK_DESTINATION_UNCHANGED, "Keep each treasure's current storage location"),
    option(BULK_DESTINATION_CLEAR, "Clear physical storage location")
  );
  for (const location of snapshot.locations ?? []) {
    locationSelect.append(option(`id:${location.id}`, location.path ?? location.name));
  }

  collectionSelect.value = [...collectionSelect.options].some((entry) => entry.value === currentCollection)
    ? currentCollection
    : BULK_DESTINATION_UNCHANGED;
  locationSelect.value = [...locationSelect.options].some((entry) => entry.value === currentLocation)
    ? currentLocation
    : BULK_DESTINATION_UNCHANGED;
}

export function createVaultBulkReorganizationUi() {
  if (!document.body?.classList.contains("vault-page")) return null;
  if (document.querySelector("#bulk-reorganization-editor")) return null;

  const inventory = document.querySelector("#inventory-title")?.closest(".vault-inventory");
  const heading = inventory?.querySelector(".section-heading");
  const treasureList = inventory?.querySelector("#treasure-list");
  if (!inventory || !heading || !treasureList) return null;

  ensureStylesheet();

  const toggle = node("button", "quiet-button", "Move treasures");
  toggle.type = "button";
  toggle.setAttribute("aria-controls", "bulk-reorganization-editor");
  toggle.setAttribute("aria-expanded", "false");
  heading.append(toggle);

  const shell = node("section", "bulk-reorganization-editor");
  shell.id = "bulk-reorganization-editor";
  shell.hidden = true;
  shell.setAttribute("aria-label", "Move selected treasures");

  const intro = node(
    "p",
    "muted-copy",
    "Select permanent treasure records, choose a collection and/or physical storage destination, then review the server-owned preview before anything moves. This tool does not archive or delete treasures."
  );

  const grid = node("div", "bulk-reorganization-grid");
  const selectionColumn = node("section", "bulk-reorganization-column");
  const selectionHeading = node("div", "section-heading compact");
  const selectionHeadingCopy = node("div", "");
  selectionHeadingCopy.append(node("p", "eyebrow", "Step 1"), node("h3", "", "Select treasure records"));
  const count = node("span", "bulk-selection-count", "0 treasures selected");
  selectionHeading.append(selectionHeadingCopy, count);

  const searchForm = node("form", "bulk-reorganization-toolbar");
  const search = document.createElement("input");
  search.type = "search";
  search.maxLength = 240;
  search.setAttribute("aria-label", "Search treasures to select for movement");
  search.setAttribute("placeholder", "Search title, category, identifier, notes…");
  const searchButton = node("button", "dark-button", "Search Vault");
  searchButton.type = "submit";
  const clearSelection = node("button", "quiet-button", "Clear selection");
  clearSelection.type = "button";
  searchForm.append(search, searchButton, clearSelection);

  const limitNote = node("p", "muted-copy bulk-limit-note", `Up to ${MAX_BULK_REORGANIZATION_SELECTION} permanent treasure records can move in one atomic batch. Search results are loaded from the Vault; selections stay active while you search again.`);
  const choiceList = node("div", "bulk-treasure-choices");
  choiceList.setAttribute("role", "group");
  choiceList.setAttribute("aria-label", "Treasures available for bulk movement");
  const selectionStatusText = node("span", "form-status");
  selectionStatusText.setAttribute("role", "status");
  selectionStatusText.setAttribute("aria-live", "polite");
  selectionColumn.append(selectionHeading, searchForm, limitNote, choiceList, selectionStatusText);

  const destinationColumn = node("section", "bulk-reorganization-column");
  destinationColumn.append(node("p", "eyebrow", "Step 2"), node("h3", "", "Choose organization destination"));
  const destinationForm = node("form", "bulk-destination-form");
  const collectionLabel = node("label", "");
  collectionLabel.append(node("span", "", "Collection group"));
  const collectionSelect = document.createElement("select");
  collectionSelect.append(option(BULK_DESTINATION_UNCHANGED, "Keep each treasure's current collection"));
  collectionLabel.append(collectionSelect);

  const locationLabel = node("label", "");
  locationLabel.append(node("span", "", "Physical storage location"));
  const locationSelect = document.createElement("select");
  locationSelect.append(option(BULK_DESTINATION_UNCHANGED, "Keep each treasure's current storage location"));
  locationLabel.append(locationSelect);

  const destinationNote = node("p", "muted-copy", "Changing one dimension leaves the other untouched. Choosing a clear option explicitly removes that organization reference; it never replaces the treasure's permanent ID.");
  const previewButton = node("button", "gold-button", "Preview exact movement");
  previewButton.type = "submit";
  previewButton.disabled = true;
  const destinationStatus = node("span", "form-status");
  destinationStatus.setAttribute("role", "status");
  destinationStatus.setAttribute("aria-live", "polite");
  destinationForm.append(collectionLabel, locationLabel, destinationNote, previewButton, destinationStatus);
  destinationColumn.append(destinationForm);
  grid.append(selectionColumn, destinationColumn);

  const previewShell = node("section", "bulk-preview-shell");
  previewShell.hidden = true;
  previewShell.setAttribute("aria-label", "Bulk movement preview");
  const previewHeading = node("div", "section-heading compact");
  const previewHeadingCopy = node("div", "");
  previewHeadingCopy.append(node("p", "eyebrow", "Step 3"), node("h3", "", "Review before commit"));
  const resetPreview = node("button", "quiet-button", "Discard preview");
  resetPreview.type = "button";
  previewHeading.append(previewHeadingCopy, resetPreview);
  const previewSummary = node("p", "muted-copy");
  const previewList = node("div", "bulk-preview-list");
  const commitActions = node("div", "bulk-reorganization-actions");
  const commitButton = node("button", "gold-button", "Confirm movement");
  commitButton.type = "button";
  commitButton.disabled = true;
  const commitStatus = node("span", "form-status");
  commitStatus.setAttribute("role", "status");
  commitStatus.setAttribute("aria-live", "polite");
  commitActions.append(commitButton, commitStatus);
  previewShell.append(previewHeading, previewSummary, previewList, commitActions);

  shell.append(intro, grid, previewShell);
  treasureList.before(shell);

  const selectedIds = new Set();
  let visibleTreasures = [];
  let currentBatch = null;
  let currentIdempotencyKey = null;
  let loading = false;

  function invalidatePreview(message = "Selection or destination changed. Create a fresh preview before committing.") {
    if (!currentBatch) return;
    currentBatch = null;
    currentIdempotencyKey = null;
    previewShell.hidden = true;
    previewList.replaceChildren();
    commitButton.disabled = true;
    destinationStatus.textContent = message;
  }

  function updateSelectionState() {
    const status = selectionStatus(selectedIds);
    count.textContent = `${status.count} treasure${status.count === 1 ? "" : "s"} selected`;
    previewButton.disabled = !status.valid || loading;
    if (!status.valid && status.count > 0) selectionStatusText.textContent = status.message;
    else if (status.valid) selectionStatusText.textContent = status.message;
    else if (!loading) selectionStatusText.textContent = "Select at least one treasure to begin.";
  }

  function renderChoices() {
    choiceList.replaceChildren();
    if (!visibleTreasures.length) {
      choiceList.append(node("p", "empty-note", "No treasure records match this search. Try another Vault search."));
      updateSelectionState();
      return;
    }

    for (const treasure of visibleTreasures) {
      const label = node("label", "bulk-treasure-choice");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = treasure.id;
      checkbox.checked = selectedIds.has(treasure.id);
      checkbox.setAttribute("aria-label", `Select ${treasure.title}`);
      const copy = node("span", "bulk-treasure-choice-copy");
      copy.append(
        node("strong", "", treasure.title),
        node("small", "", [treasure.category, treasure.manufacturer, treasure.series].filter(Boolean).join(" • ") || "Collector-entered treasure record"),
        node("small", "", treasureOrganization(treasure))
      );
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (selectedIds.size >= MAX_BULK_REORGANIZATION_SELECTION && !selectedIds.has(treasure.id)) {
            checkbox.checked = false;
            selectionStatusText.textContent = `A movement batch may contain at most ${MAX_BULK_REORGANIZATION_SELECTION} treasures.`;
            return;
          }
          selectedIds.add(treasure.id);
        } else {
          selectedIds.delete(treasure.id);
        }
        invalidatePreview();
        updateSelectionState();
      });
      label.append(checkbox, copy);
      choiceList.append(label);
    }
    updateSelectionState();
  }

  async function loadWorkspace(query = "") {
    if (loading) return;
    loading = true;
    previewButton.disabled = true;
    selectionStatusText.textContent = "Loading authoritative Vault records and organization…";
    try {
      const params = new URLSearchParams({ limit: "500", sort: "title", order: "asc" });
      if (query.trim()) params.set("q", query.trim());
      const [snapshot, treasureResult] = await Promise.all([
        api("/api/vault"),
        api(`/api/vault/treasures?${params.toString()}`)
      ]);
      populateDestinationSelects(collectionSelect, locationSelect, snapshot);
      visibleTreasures = Array.isArray(treasureResult.treasures) ? treasureResult.treasures : [];
      renderChoices();
      selectionStatusText.textContent = visibleTreasures.length
        ? `${visibleTreasures.length} matching Vault record${visibleTreasures.length === 1 ? "" : "s"} loaded. ${selectionStatus(selectedIds).message}`
        : "No matching Vault records were found.";
    } catch (error) {
      visibleTreasures = [];
      renderChoices();
      selectionStatusText.textContent = error.message;
    } finally {
      loading = false;
      updateSelectionState();
    }
  }

  function renderPreview(batch) {
    previewList.replaceChildren();
    const rows = Array.isArray(batch.rows) ? batch.rows : [];
    for (const row of rows) {
      const summary = previewRowSummary(row);
      const card = node("article", `bulk-preview-row${summary.error ? " bulk-preview-row-error" : ""}`);
      card.append(node("strong", "", summary.title));
      if (summary.error) {
        card.append(node("small", "", summary.error));
      } else {
        card.append(
          node("small", "", `Current: ${summary.before}`),
          node("small", "", `After commit: ${summary.after}`),
          node("small", "", `Change: ${summary.changed}`)
        );
      }
      previewList.append(card);
    }

    const invalid = Number(batch.validationErrorCount ?? 0);
    const readyCount = rows.length - invalid;
    previewSummary.textContent = invalid
      ? `${readyCount} record${readyCount === 1 ? "" : "s"} validated and ${invalid} failed validation. Nothing has moved, and this preview cannot be committed.`
      : `${rows.length} record${rows.length === 1 ? "" : "s"} validated. Nothing has moved yet. Commit rechecks every selected treasure and destination in one database transaction.`;
    commitButton.textContent = `Confirm and move ${rows.length} treasure${rows.length === 1 ? "" : "s"}`;
    commitButton.disabled = !batch.canCommit;
    previewShell.hidden = false;
    previewShell.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  toggle.addEventListener("click", async () => {
    shell.hidden = !shell.hidden;
    toggle.setAttribute("aria-expanded", String(!shell.hidden));
    if (!shell.hidden) {
      search.focus();
      await loadWorkspace(search.value);
    }
  });

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadWorkspace(search.value);
  });

  clearSelection.addEventListener("click", () => {
    selectedIds.clear();
    invalidatePreview("Selection cleared. Choose treasure records before creating a preview.");
    renderChoices();
  });

  collectionSelect.addEventListener("change", () => invalidatePreview());
  locationSelect.addEventListener("change", () => invalidatePreview());

  destinationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selection = selectionStatus(selectedIds);
    if (!selection.valid) {
      destinationStatus.textContent = selection.message;
      return;
    }

    let destination;
    try {
      destination = bulkDestinationFromChoices(collectionSelect.value, locationSelect.value);
    } catch (error) {
      destinationStatus.textContent = error.message;
      return;
    }

    previewButton.disabled = true;
    destinationStatus.textContent = "Creating server-owned movement preview…";
    try {
      const result = await api("/api/vault/reorganization/bulk/preview", {
        method: "POST",
        body: JSON.stringify({ treasureIds: [...selectedIds], destination })
      });
      currentBatch = result.batch;
      currentIdempotencyKey = createBulkIdempotencyKey(browserUuid);
      renderPreview(currentBatch);
      destinationStatus.textContent = currentBatch.canCommit
        ? "Preview ready. Review every record below before confirming."
        : "Preview contains validation errors. Nothing moved; fix the selection and create a fresh preview.";
    } catch (error) {
      currentBatch = null;
      currentIdempotencyKey = null;
      previewShell.hidden = true;
      destinationStatus.textContent = error.message;
    } finally {
      updateSelectionState();
    }
  });

  resetPreview.addEventListener("click", () => {
    currentBatch = null;
    currentIdempotencyKey = null;
    previewShell.hidden = true;
    previewList.replaceChildren();
    commitStatus.textContent = "";
    destinationStatus.textContent = "Preview discarded. No treasure records were changed.";
  });

  commitButton.addEventListener("click", async () => {
    if (!currentBatch?.canCommit || !currentIdempotencyKey) return;
    commitButton.disabled = true;
    commitStatus.textContent = "Revalidating and committing the movement atomically…";
    try {
      const result = await api(`/api/vault/reorganization/bulk/${encodeURIComponent(currentBatch.id)}/commit`, {
        method: "POST",
        headers: { "Idempotency-Key": currentIdempotencyKey }
      });
      const committed = result.batch;
      const movedCount = Number(committed.commitResult?.movedCount ?? 0);
      const noOpCount = Number(committed.commitResult?.noOpCount ?? 0);
      commitStatus.textContent = `Movement committed: ${movedCount} treasure${movedCount === 1 ? "" : "s"} changed${noOpCount ? `; ${noOpCount} already matched the requested organization` : ""}. Refreshing authoritative Vault state…`;
      globalThis.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      commitStatus.textContent = `${error.message} No successful movement is being assumed; create a fresh preview if the server reports stale state.`;
      commitButton.disabled = false;
    }
  });

  updateSelectionState();
  return Object.freeze({
    selectedIds,
    reload: () => loadWorkspace(search.value),
    open: async () => {
      shell.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      await loadWorkspace(search.value);
    }
  });
}

createVaultBulkReorganizationUi();
