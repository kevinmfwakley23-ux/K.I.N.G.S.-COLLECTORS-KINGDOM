import {
  buildImportDecisions,
  defaultCsvMappings,
  detectImportFormat,
  humanImportStatus,
  importTargetOptions,
  mapCsvToVaultRecords,
  parseCsv,
  parseJsonRecords
} from "./vault-import-core.js";

const MAX_REQUEST_BYTES = 1024 * 1024;
const LATEST_BATCH_KEY = "kings.vault.latestImportBatch";
const SUCCESS_KEY = "kings.vault.importSuccess";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-import.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-import.css";
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
    const error = new Error(body.message ?? "The Royal Vault import request failed.");
    error.code = body.error ?? "vault_import_failed";
    error.details = body.details ?? null;
    error.status = response.status;
    throw error;
  }
  return body;
}

function safeSessionGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
}

function safeSessionRemove(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

function idempotencyKey(batchId) {
  const storageKey = `kings.vault.importKey.${batchId}`;
  const existing = safeSessionGet(storageKey);
  if (existing) return existing;
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const value = `vault-import-${randomPart}`;
  safeSessionSet(storageKey, value);
  return value;
}

function removeIdempotencyKey(batchId) {
  safeSessionRemove(`kings.vault.importKey.${batchId}`);
}

function formatExpiry(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "expiry unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatTarget(target) {
  const labels = {
    ignore: "Ignore",
    title: "Title",
    category: "Category / type",
    manufacturer: "Manufacturer / publisher",
    series: "Series / set",
    variant: "Variant / edition",
    condition: "Condition",
    conditionNotes: "Condition notes",
    quantity: "Quantity",
    acquisitionDate: "Acquisition date (YYYY-MM-DD)",
    purchasePrice: "Purchase price",
    currency: "Currency",
    barcode: "Barcode / UPC / EAN / ISBN",
    catalog: "Catalog / serial identifier",
    description: "Description",
    notes: "Collector notes",
    attribute: "Custom attribute"
  };
  return labels[target] ?? target;
}

function duplicateDescription(duplicate) {
  const signals = Array.isArray(duplicate.signals) ? duplicate.signals.join(", ") : "matching data";
  if (duplicate.kind === "existing") {
    return `Existing Vault record: ${duplicate.title || "Untitled"} • ${signals}`;
  }
  if (duplicate.kind === "batch") {
    return `Also matches incoming row ${Number(duplicate.rowIndex) + 1} • ${signals}`;
  }
  return signals;
}

export function createVaultImportUi() {
  const form = document.querySelector("#import-preview-form");
  const textArea = document.querySelector("#import-json");
  const result = document.querySelector("#import-preview-result");
  const panel = form?.closest(".import-panel");
  if (!form || !textArea || !result || !panel) return null;

  ensureStylesheet();
  textArea.required = false;
  form.classList.add("import-form-enhanced");

  const title = panel.querySelector("#import-title");
  if (title) title.textContent = "Review and import without blind writes";
  const intro = panel.querySelector(".muted-copy");
  if (intro) {
    intro.textContent = "Bring JSON or CSV directly into the responsive Vault. CSV columns can be mapped here. The server creates a recoverable review batch, flags invalid or duplicate rows, and writes only after your explicit commit.";
  }

  const sourceLabel = document.createElement("input");
  sourceLabel.id = "import-source-label";
  sourceLabel.maxLength = 120;
  sourceLabel.placeholder = "Example: CLZ export, insurance spreadsheet, old inventory";

  const fileInput = document.createElement("input");
  fileInput.id = "import-file";
  fileInput.type = "file";
  fileInput.accept = ".json,.csv,application/json,text/csv,text/plain";

  const sourceGrid = node("div", "import-source-grid");
  const sourceField = node("label", "import-source-field");
  sourceField.append(node("span", "", "Source label"), sourceLabel);
  const fileField = node("label", "import-source-field");
  fileField.append(node("span", "", "Choose JSON or CSV file"), fileInput);
  sourceGrid.append(sourceField, fileField);
  form.prepend(sourceGrid);

  const textLabel = textArea.closest("label");
  if (textLabel) {
    textLabel.classList.add("import-paste-field");
    const visibleLabel = node("span", "import-field-label", "Or paste JSON / CSV");
    textLabel.prepend(visibleLabel);
    textArea.placeholder = '[{"title":"Example","category":"Other"}]\n\nOr paste CSV with a header row.';
  }

  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.textContent = "Create review preview";

  const mappingSection = node("section", "import-mapping-section");
  mappingSection.hidden = true;
  const reviewSection = node("section", "import-review-section");
  reviewSection.hidden = true;
  result.before(mappingSection, reviewSection);

  const state = {
    fileName: "",
    fileText: "",
    parsedCsv: null,
    mappings: null,
    batch: null,
    decisions: new Map()
  };

  function setStatus(message, kind = "info") {
    result.dataset.kind = kind;
    result.textContent = message;
  }

  function currentMappings() {
    if (!state.parsedCsv || !state.mappings) throw new Error("CSV mapping is not ready.");
    return state.mappings.map((mapping) => ({ ...mapping }));
  }

  function renderMapping() {
    mappingSection.replaceChildren();
    if (!state.parsedCsv || !state.mappings) {
      mappingSection.hidden = true;
      return;
    }

    mappingSection.hidden = false;
    const heading = node("div", "import-section-heading");
    heading.append(
      node("div", "", undefined),
      node("p", "muted-copy", "Map each source column. Exactly one column must map to Title. Unneeded columns can be ignored or preserved as custom attributes.")
    );
    heading.firstElementChild.append(node("p", "eyebrow", "CSV field mapping"), node("h3", "", `${state.parsedCsv.rows.length} incoming rows`));
    mappingSection.append(heading);

    const grid = node("div", "import-mapping-grid");
    const targets = importTargetOptions();
    state.parsedCsv.headers.forEach((header, index) => {
      const card = node("article", "import-mapping-card");
      card.append(node("strong", "", header));
      const sampleValues = state.parsedCsv.rows.slice(0, 3).map((row) => String(row[index] ?? "").trim()).filter(Boolean);
      card.append(node("small", "", sampleValues.length ? `Sample: ${sampleValues.join(" • ")}` : "No sample value"));

      const select = document.createElement("select");
      select.setAttribute("aria-label", `Map CSV column ${header}`);
      for (const target of targets) {
        const option = document.createElement("option");
        option.value = target;
        option.textContent = formatTarget(target);
        select.append(option);
      }
      select.value = state.mappings[index].target;

      const attributeName = document.createElement("input");
      attributeName.maxLength = 60;
      attributeName.placeholder = "Custom attribute name";
      attributeName.value = state.mappings[index].attributeName ?? header;
      attributeName.hidden = select.value !== "attribute";

      select.addEventListener("change", () => {
        state.mappings[index] = {
          target: select.value,
          attributeName: select.value === "attribute" ? attributeName.value.trim() || header : null
        };
        attributeName.hidden = select.value !== "attribute";
      });
      attributeName.addEventListener("input", () => {
        if (state.mappings[index].target === "attribute") state.mappings[index].attributeName = attributeName.value;
      });
      card.append(select, attributeName);
      grid.append(card);
    });
    mappingSection.append(grid);
  }

  function renderBatch(batch) {
    state.batch = batch;
    state.decisions = new Map();
    reviewSection.replaceChildren();
    reviewSection.hidden = false;

    const heading = node("div", "import-section-heading");
    const headingCopy = node("div", "");
    headingCopy.append(node("p", "eyebrow", "Server-side review batch"), node("h3", "", batch.sourceLabel || "Vault import preview"));
    const expiry = node("p", "import-expiry", batch.status === "preview" ? `Expires ${formatExpiry(batch.expiresAt)}` : humanImportStatus(batch.status));
    heading.append(headingCopy, expiry);
    reviewSection.append(heading);

    const summary = node("div", "import-summary-grid");
    const values = [
      ["Rows", batch.recordCount],
      ["Accepted", batch.acceptedCount],
      ["Needs review", batch.reviewCount],
      ["Rejected", batch.rejectedCount]
    ];
    for (const [label, value] of values) {
      const card = node("div", "import-summary-card");
      card.append(node("span", "", label), node("strong", "", String(value)));
      summary.append(card);
    }
    reviewSection.append(summary);

    const rows = node("div", "import-review-list");
    for (const row of batch.rows) {
      const card = node("article", `import-review-row status-${row.status}`);
      const rowHeading = node("div", "import-review-row-heading");
      const copy = node("div", "");
      copy.append(
        node("span", `import-status-badge status-${row.status}`, humanImportStatus(row.status)),
        node("h4", "", row.treasure?.title || `Row ${row.index + 1}`),
        node("p", "muted-copy", row.treasure ? [row.treasure.category, row.treasure.manufacturer, row.treasure.series, row.treasure.variant].filter(Boolean).join(" • ") || "Validated treasure record" : "This row did not pass validation.")
      );
      rowHeading.append(copy);

      const decision = document.createElement("select");
      decision.className = "import-decision";
      decision.setAttribute("aria-label", `Decision for import row ${row.index + 1}`);

      if (row.status === "rejected" || batch.status !== "preview") {
        decision.disabled = true;
        const option = document.createElement("option");
        option.value = row.status === "rejected" ? "skip" : "done";
        option.textContent = row.status === "rejected" ? "Skip rejected row" : humanImportStatus(batch.status);
        decision.append(option);
        if (row.status === "rejected") state.decisions.set(row.index, "skip");
      } else {
        if (row.status === "review") {
          const choose = document.createElement("option");
          choose.value = "";
          choose.textContent = "Choose: import or skip";
          decision.append(choose);
        }
        for (const [value, label] of [["import", row.status === "review" ? "Import after review" : "Import"], ["skip", "Skip"]]) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          decision.append(option);
        }
        if (row.status === "ready") {
          decision.value = "import";
          state.decisions.set(row.index, "import");
        }
        decision.addEventListener("change", () => {
          if (decision.value) state.decisions.set(row.index, decision.value);
          else state.decisions.delete(row.index);
        });
      }
      rowHeading.append(decision);
      card.append(rowHeading);

      if (row.error) {
        card.append(node("p", "import-row-error", `${row.error.code}: ${row.error.message}`));
      }
      if (Array.isArray(row.duplicates) && row.duplicates.length) {
        const duplicateList = node("ul", "import-duplicate-list");
        for (const duplicate of row.duplicates) duplicateList.append(node("li", "", duplicateDescription(duplicate)));
        card.append(duplicateList);
      }
      if (row.committedTreasureId) card.append(node("p", "import-committed-id", `Vault treasure ID: ${row.committedTreasureId}`));
      rows.append(card);
    }
    reviewSection.append(rows);

    if (batch.status === "preview") {
      const commitBar = node("div", "import-commit-bar");
      const warning = node("p", "", "Nothing has been written yet. Commit uses one atomic transaction: either every selected row is created, or the entire batch rolls back.");
      const commitButton = node("button", "gold-button", "Commit reviewed import");
      commitButton.type = "button";
      commitButton.disabled = batch.acceptedCount === 0;
      commitButton.addEventListener("click", commitBatch);
      commitBar.append(warning, commitButton);
      reviewSection.append(commitBar);
    }
  }

  async function recordsForPreview() {
    const activeText = state.fileText || textArea.value;
    const fileName = state.fileText ? state.fileName : "";
    if (!String(activeText).trim()) throw new Error("Choose a JSON/CSV file or paste import data first.");
    const format = detectImportFormat({ filename: fileName, text: activeText });
    if (format === "json") return parseJsonRecords(activeText);

    if (!state.parsedCsv || state.fileText !== activeText) {
      state.parsedCsv = parseCsv(activeText);
      state.mappings = defaultCsvMappings(state.parsedCsv.headers).map((mapping) => ({ ...mapping }));
      state.fileText = activeText;
      state.fileName = fileName || "pasted.csv";
      renderMapping();
      throw new Error("CSV detected. Review the field mapping shown below, then create the preview again.");
    }
    return mapCsvToVaultRecords(state.parsedCsv, currentMappings());
  }

  async function previewImport() {
    setStatus("Preparing a recoverable server-side review batch…");
    try {
      const records = await recordsForPreview();
      if (records.length > 1000) throw new Error("A Vault import batch may contain at most 1,000 treasure rows.");
      const source = sourceLabel.value.trim() || state.fileName || "Vault import";
      const body = JSON.stringify({ records, sourceLabel: source });
      const byteLength = new TextEncoder().encode(body).byteLength;
      if (byteLength > MAX_REQUEST_BYTES) {
        throw new Error("This mapped import exceeds the 1 MiB protected request limit. Split it into smaller batches and preview each batch separately.");
      }
      const response = await api("/api/vault/import/preview", { method: "POST", body });
      const batch = response.batch;
      safeSessionSet(LATEST_BATCH_KEY, batch.id);
      setStatus(`Preview created. ${batch.acceptedCount} accepted, ${batch.reviewCount} need duplicate review, ${batch.rejectedCount} rejected.`, batch.reviewCount || batch.rejectedCount ? "review" : "success");
      renderBatch(batch);
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  async function commitBatch() {
    if (!state.batch || state.batch.status !== "preview") return;
    let decisions;
    try {
      decisions = buildImportDecisions(state.batch, state.decisions);
    } catch (error) {
      setStatus(error.message, "error");
      return;
    }
    const importCount = decisions.filter((decision) => decision.action === "import").length;
    const skipCount = decisions.length - importCount;
    if (!importCount) {
      setStatus("Every accepted row is currently set to Skip. Nothing will be imported.", "review");
      return;
    }
    if (!window.confirm(`Commit ${importCount} treasure record${importCount === 1 ? "" : "s"} to the Royal Vault and skip ${skipCount}? The selected writes will occur in one atomic transaction.`)) return;

    setStatus("Committing reviewed rows atomically…");
    try {
      const response = await api(`/api/vault/import/${encodeURIComponent(state.batch.id)}/commit`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey(state.batch.id) },
        body: JSON.stringify({ decisions })
      });
      const batch = response.batch;
      renderBatch(batch);
      safeSessionRemove(LATEST_BATCH_KEY);
      removeIdempotencyKey(batch.id);
      safeSessionSet(SUCCESS_KEY, JSON.stringify({ imported: batch.commitResult?.importedCount ?? importCount, skipped: batch.commitResult?.skippedCount ?? skipCount }));
      window.location.reload();
    } catch (error) {
      if (["import_preview_stale", "import_preview_stale_duplicates", "import_batch_expired"].includes(error.code)) {
        setStatus(`${error.message} No import was committed. Create a fresh review preview before trying again.`, "error");
      } else {
        setStatus(`${error.message} The same commit can be safely retried because the Vault uses an idempotency key.`, "error");
      }
    }
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    state.parsedCsv = null;
    state.mappings = null;
    mappingSection.hidden = true;
    if (!file) {
      state.fileName = "";
      state.fileText = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      fileInput.value = "";
      setStatus("The selected source file is too large to review safely in one browser batch. Split it into smaller files.", "error");
      return;
    }
    state.fileName = file.name;
    state.fileText = await file.text();
    if (!sourceLabel.value.trim()) sourceLabel.value = file.name;
    const format = detectImportFormat({ filename: file.name, text: state.fileText });
    if (format === "json") {
      textArea.value = state.fileText;
      setStatus(`Loaded ${file.name}. Create a review preview when ready.`);
      return;
    }
    try {
      state.parsedCsv = parseCsv(state.fileText);
      state.mappings = defaultCsvMappings(state.parsedCsv.headers).map((mapping) => ({ ...mapping }));
      renderMapping();
      setStatus(`Loaded ${file.name}. Review the CSV field mapping before creating the server-side preview.`, "review");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  textArea.addEventListener("input", () => {
    if (state.fileText && textArea.value !== state.fileText) {
      state.fileText = "";
      state.fileName = "";
      fileInput.value = "";
      state.parsedCsv = null;
      state.mappings = null;
      mappingSection.hidden = true;
    }
  });

  panel.addEventListener("submit", (event) => {
    if (event.target !== form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    previewImport();
  }, true);

  const previousSuccess = safeSessionGet(SUCCESS_KEY);
  if (previousSuccess) {
    safeSessionRemove(SUCCESS_KEY);
    try {
      const summary = JSON.parse(previousSuccess);
      setStatus(`Atomic import committed: ${summary.imported} treasure record${summary.imported === 1 ? "" : "s"} added; ${summary.skipped} skipped.`, "success");
    } catch {
      setStatus("The reviewed import was committed successfully.", "success");
    }
  }

  const latestBatchId = safeSessionGet(LATEST_BATCH_KEY);
  if (latestBatchId) {
    api(`/api/vault/import/${encodeURIComponent(latestBatchId)}`)
      .then(({ batch }) => {
        if (batch.status === "preview") {
          setStatus("Recovered your unfinished import review from this browser session.", "review");
          renderBatch(batch);
        } else {
          safeSessionRemove(LATEST_BATCH_KEY);
        }
      })
      .catch((error) => {
        safeSessionRemove(LATEST_BATCH_KEY);
        setStatus(error.status === 410 ? "The previous import preview expired. Create a fresh preview." : error.message, "error");
      });
  }

  return Object.freeze({ previewImport, renderBatch });
}

createVaultImportUi();
