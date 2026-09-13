const YEAR_BRIDGE_KEY = "__kingsYear";
const TAGS_BRIDGE_KEY = "__kingsTags";

const searchForm = document.querySelector("#vault-search-form");
const filterSort = document.querySelector("#filter-sort");
const treasureForm = document.querySelector("#treasure-form");
const editor = document.querySelector("#treasure-editor");
const treasureId = document.querySelector("#treasure-id");
const attributesField = document.querySelector("#treasure-attributes");
const clearFiltersButton = document.querySelector("#clear-filters");
const treasureList = document.querySelector("#treasure-list");
const exportLink = document.querySelector('a[href="/api/vault/export"]');

let visibleTreasures = [];
let metadataLoadToken = 0;

function createFilterControls() {
  if (!searchForm || document.querySelector("#filter-year")) return;

  const yearLabel = document.createElement("label");
  const yearCaption = document.createElement("span");
  yearCaption.textContent = "Year";
  const yearInput = document.createElement("input");
  yearInput.id = "filter-year";
  yearInput.type = "number";
  yearInput.min = "1";
  yearInput.max = "9999";
  yearInput.inputMode = "numeric";
  yearInput.placeholder = "Any year";
  yearLabel.append(yearCaption, yearInput);

  const tagLabel = document.createElement("label");
  const tagCaption = document.createElement("span");
  tagCaption.textContent = "Tag";
  const tagSelect = document.createElement("select");
  tagSelect.id = "filter-tag";
  const blankTag = document.createElement("option");
  blankTag.value = "";
  blankTag.textContent = "All tags";
  tagSelect.append(blankTag);
  tagLabel.append(tagCaption, tagSelect);

  const sortLabel = filterSort?.closest("label") ?? null;
  if (sortLabel) {
    searchForm.insertBefore(yearLabel, sortLabel);
    searchForm.insertBefore(tagLabel, sortLabel);
  } else {
    searchForm.append(yearLabel, tagLabel);
  }

  if (filterSort && ![...filterSort.options].some((option) => option.value === "year")) {
    const option = document.createElement("option");
    option.value = "year";
    option.textContent = "Year";
    filterSort.append(option);
  }

  yearInput.addEventListener("change", () => searchForm.requestSubmit());
  tagSelect.addEventListener("change", () => searchForm.requestSubmit());
}

function createEditorControls() {
  if (!treasureForm || document.querySelector("#treasure-year")) return;

  const yearLabel = document.createElement("label");
  yearLabel.textContent = "Year";
  const yearInput = document.createElement("input");
  yearInput.id = "treasure-year";
  yearInput.type = "number";
  yearInput.min = "1";
  yearInput.max = "9999";
  yearInput.inputMode = "numeric";
  yearInput.placeholder = "1999";
  yearLabel.append(yearInput);

  const tagsLabel = document.createElement("label");
  tagsLabel.className = "field-span-2";
  tagsLabel.textContent = "Collector tags";
  const tagsInput = document.createElement("input");
  tagsInput.id = "treasure-tags";
  tagsInput.maxLength = 2440;
  tagsInput.placeholder = "rookie, signed, favorite, display case";
  tagsInput.setAttribute("aria-describedby", "treasure-tags-help");
  const help = document.createElement("small");
  help.id = "treasure-tags-help";
  help.className = "muted-copy";
  help.textContent = "Separate tags with commas. Tags are normalized case-insensitively and stay attached to this permanent treasure record.";
  tagsLabel.append(tagsInput, help);

  const conditionLabel = document.querySelector("#treasure-condition")?.closest("label") ?? null;
  if (conditionLabel) treasureForm.insertBefore(yearLabel, conditionLabel);
  else treasureForm.append(yearLabel);

  const descriptionLabel = document.querySelector("#treasure-description")?.closest("label") ?? null;
  if (descriptionLabel) treasureForm.insertBefore(tagsLabel, descriptionLabel);
  else treasureForm.append(tagsLabel);
}

function parseTagsInput(value) {
  const seen = new Set();
  const tags = [];
  for (const part of String(value ?? "").split(",")) {
    const label = part.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(label);
  }
  return tags;
}

function bridgeEditorMetadata() {
  const yearInput = document.querySelector("#treasure-year");
  const tagsInput = document.querySelector("#treasure-tags");
  if (!attributesField || !yearInput || !tagsInput) return;

  let attributes = {};
  const raw = attributesField.value.trim();
  if (raw) {
    try {
      attributes = JSON.parse(raw);
    } catch {
      return;
    }
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return;
  }

  attributes[YEAR_BRIDGE_KEY] = yearInput.value.trim() || null;
  attributes[TAGS_BRIDGE_KEY] = parseTagsInput(tagsInput.value);
  attributesField.value = JSON.stringify(attributes, null, 2);
}

async function fetchJson(path) {
  const response = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(body.message ?? "Vault metadata request failed.");
  return body;
}

function selectTagImmediately(value) {
  const select = document.querySelector("#filter-tag");
  if (!select) return;
  const wanted = String(value ?? "");
  if (wanted && ![...select.options].some((option) => option.value === wanted)) {
    const pending = document.createElement("option");
    pending.value = wanted;
    pending.textContent = wanted;
    pending.dataset.pendingSavedViewTag = "true";
    select.append(pending);
  }
  select.value = wanted;
}

async function refreshTags(selected = null) {
  const select = document.querySelector("#filter-tag");
  if (!select) return;
  const keep = selected ?? select.value;
  try {
    const { tags = [] } = await fetchJson("/api/vault/tags");
    select.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "All tags";
    select.append(blank);
    for (const tag of tags) {
      const option = document.createElement("option");
      option.value = tag.label;
      option.textContent = `${tag.label} (${tag.treasureCount})`;
      select.append(option);
    }
    if (keep && ![...select.options].some((option) => option.value === keep)) {
      const retained = document.createElement("option");
      retained.value = keep;
      retained.textContent = keep;
      retained.dataset.pendingSavedViewTag = "true";
      select.append(retained);
    }
    select.value = keep || "";
  } catch {
    selectTagImmediately(keep);
  }
}

async function loadEditorMetadata() {
  const yearInput = document.querySelector("#treasure-year");
  const tagsInput = document.querySelector("#treasure-tags");
  if (!yearInput || !tagsInput || editor?.hidden) return;
  const id = treasureId?.value ?? "";
  const token = ++metadataLoadToken;
  if (!id) {
    yearInput.value = "";
    tagsInput.value = "";
    return;
  }
  try {
    const { metadata } = await fetchJson(`/api/vault/treasures/${encodeURIComponent(id)}/metadata`);
    if (token !== metadataLoadToken || treasureId?.value !== id) return;
    yearInput.value = metadata?.year ?? "";
    tagsInput.value = Array.isArray(metadata?.tags) ? metadata.tags.join(", ") : "";
  } catch {
    if (token !== metadataLoadToken) return;
    yearInput.value = "";
    tagsInput.value = "";
  }
}

function decorateTreasureCards() {
  const cards = [...(treasureList?.querySelectorAll(".treasure-card") ?? [])];
  cards.forEach((card, index) => {
    card.querySelector("[data-vault-metadata-summary]")?.remove();
    const treasure = visibleTreasures[index];
    if (!treasure) return;
    const parts = [];
    if (treasure.year) parts.push(`Year: ${treasure.year}`);
    if (Array.isArray(treasure.tags) && treasure.tags.length) parts.push(`Tags: ${treasure.tags.join(", ")}`);
    if (!parts.length) return;
    const line = document.createElement("p");
    line.className = "treasure-meta";
    line.dataset.vaultMetadataSummary = "true";
    line.textContent = parts.join(" • ");
    const locationLine = card.querySelector(".treasure-location");
    if (locationLine) card.insertBefore(line, locationLine);
    else card.append(line);
  });
}

function installQueryMetadataBridge() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    let request = input;
    let requestUrl = null;
    try {
      const raw = typeof input === "string" || input instanceof URL ? String(input) : input?.url;
      if (raw) requestUrl = new URL(raw, window.location.href);
    } catch {
      requestUrl = null;
    }

    if (requestUrl?.origin === window.location.origin && requestUrl.pathname === "/api/vault/query") {
      const year = document.querySelector("#filter-year")?.value.trim();
      const tag = document.querySelector("#filter-tag")?.value;
      if (year) requestUrl.searchParams.set("year", year);
      else requestUrl.searchParams.delete("year");
      if (tag) requestUrl.searchParams.set("tag", tag);
      else requestUrl.searchParams.delete("tag");
      request = requestUrl.toString();
    }

    const response = await nativeFetch(request, init);
    if (requestUrl?.origin === window.location.origin && requestUrl.pathname === "/api/vault/query" && response.ok) {
      response.clone().json().then((body) => {
        const incoming = Array.isArray(body?.treasures) ? body.treasures : [];
        const isAppend = requestUrl.searchParams.has("cursor");
        visibleTreasures = isAppend ? [...visibleTreasures, ...incoming] : incoming;
        queueMicrotask(decorateTreasureCards);
        setTimeout(decorateTreasureCards, 0);
      }).catch(() => {});
    }
    return response;
  };
}

async function exportVaultWithMetadata(event) {
  if (!exportLink) return;
  event.preventDefault();
  const original = exportLink.textContent;
  exportLink.textContent = "Preparing export…";
  exportLink.setAttribute("aria-disabled", "true");
  try {
    const baseResponse = await fetch("/api/vault/export", { credentials: "same-origin", headers: { Accept: "application/json" } });
    const metadataResponse = await fetch("/api/vault/metadata-index", { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (!baseResponse.ok || !metadataResponse.ok) throw new Error("The Vault export could not be prepared.");
    const base = await baseResponse.json();
    const metadataBody = await metadataResponse.json();
    const metadataById = new Map((metadataBody.metadata ?? []).map((item) => [item.treasureId, item]));
    const payload = {
      ...base,
      schemaVersion: Math.max(Number(base.schemaVersion ?? 1), 4),
      metadataPolicy: metadataBody.policy,
      treasures: (base.treasures ?? []).map((treasure) => {
        const metadata = metadataById.get(treasure.id);
        return { ...treasure, year: metadata?.year ?? null, tags: metadata?.tags ?? [] };
      })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kings-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const resultCount = document.querySelector("#result-count");
    if (resultCount) resultCount.textContent = error.message;
  } finally {
    exportLink.textContent = original;
    exportLink.removeAttribute("aria-disabled");
  }
}

createFilterControls();
createEditorControls();
installQueryMetadataBridge();
refreshTags();

if (treasureForm) treasureForm.addEventListener("submit", bridgeEditorMetadata, { capture: true });
if (clearFiltersButton) clearFiltersButton.addEventListener("click", () => {
  const year = document.querySelector("#filter-year");
  const tag = document.querySelector("#filter-tag");
  if (year) year.value = "";
  if (tag) tag.value = "";
}, { capture: true });

window.addEventListener("vault:apply-saved-view", (event) => {
  const filters = event.detail?.view?.filters ?? {};
  const year = document.querySelector("#filter-year");
  if (year) year.value = filters.year ?? "";
  selectTagImmediately(filters.tag ?? "");
  refreshTags(filters.tag ?? "");
}, { capture: true });

if (editor) {
  new MutationObserver(() => { loadEditorMetadata(); }).observe(editor, { attributes: true, attributeFilter: ["hidden"] });
}
if (treasureList) {
  new MutationObserver(() => { decorateTreasureCards(); }).observe(treasureList, { childList: true, subtree: false });
}
if (exportLink) exportLink.addEventListener("click", exportVaultWithMetadata, { capture: true });

const treasureStatus = document.querySelector("#treasure-status");
if (treasureStatus) {
  new MutationObserver(() => {
    if (treasureStatus.textContent.includes("Treasure saved")) refreshTags();
  }).observe(treasureStatus, { childList: true, characterData: true, subtree: true });
}
