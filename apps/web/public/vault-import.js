import "./vault-categories.js";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function requestImport(csv, { mode, fingerprint = null, createMissingOrganization = false } = {}) {
  const params = new URLSearchParams({ mode });
  if (mode === "commit" && createMissingOrganization) params.set("createMissingOrganization", "true");
  const response = await fetch(`/api/vault/import.csv?${params}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/csv; charset=utf-8",
      ...(fingerprint ? { "X-Import-Fingerprint": fingerprint } : {})
    },
    body: csv
  });
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The Vault could not process that import.");
  return body;
}

function installStylesheet() {
  if (document.querySelector('link[href="/vault-import.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-import.css";
  document.head.append(link);
}

function buildDialog() {
  const dialog = element("dialog", "kingdom-dialog import-dialog");
  dialog.id = "vault-import-dialog";

  const card = element("section", "dialog-card import-card");
  const head = element("div", "dialog-head");
  const headingCopy = document.createElement("div");
  headingCopy.append(element("p", "eyebrow", "Portable Collection Intake"), element("h2", "", "Preview a CSV import"));
  const close = element("button", "icon-button", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close CSV import");
  close.addEventListener("click", () => dialog.close());
  head.append(headingCopy, close);

  const intro = element("p", "dialog-intro", "Nothing is written during preview. The Vault validates the file first, reports problems, and fingerprints the exact bytes. Commit is allowed only for that exact previewed file.");

  const form = element("form", "import-form");
  form.noValidate = true;
  const fileLabel = element("label", "import-file-label");
  fileLabel.append(element("span", "", "CSV file"));
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".csv,text/csv";
  fileInput.required = true;
  fileLabel.append(fileInput);

  const createLabel = element("label", "import-option");
  const createMissing = document.createElement("input");
  createMissing.type = "checkbox";
  createLabel.append(createMissing, element("span", "", "Create missing collection-folder and physical-location paths during commit"));

  const formActions = element("div", "import-actions");
  const previewButton = element("button", "dark-button", "Preview import");
  previewButton.type = "submit";
  const commitButton = element("button", "gold-button", "Import reviewed rows");
  commitButton.type = "button";
  commitButton.disabled = true;
  formActions.append(previewButton, commitButton);
  form.append(fileLabel, createLabel, formActions);

  const status = element("p", "form-status import-status", "Choose a UTF-8 CSV file. Required columns: title and category.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const summary = element("div", "import-summary");
  summary.hidden = true;
  const resultList = element("ol", "import-result-list");
  const results = element("section", "import-results");
  results.hidden = true;
  results.append(element("h3", "", "Preview details"), resultList);

  const refreshButton = element("button", "quiet-button", "View imported treasures");
  refreshButton.type = "button";
  refreshButton.hidden = true;
  refreshButton.addEventListener("click", () => window.location.reload());

  card.append(head, intro, form, status, summary, results, refreshButton);
  dialog.append(card);
  document.body.append(dialog);

  let preview = null;
  let csv = "";

  function resetPreview(message = "Choose a UTF-8 CSV file. Required columns: title and category.") {
    preview = null;
    csv = "";
    commitButton.disabled = true;
    refreshButton.hidden = true;
    summary.hidden = true;
    results.hidden = true;
    resultList.replaceChildren();
    status.textContent = message;
  }

  function renderPreview(data) {
    summary.replaceChildren();
    const cells = [
      ["Rows", data.totalRows],
      ["Valid", data.validRows],
      ["Invalid", data.invalidRows],
      ["Duplicate warnings", data.duplicateWarnings],
      ["Missing organization", data.missingOrganization]
    ];
    for (const [label, value] of cells) {
      const cell = element("div", "import-summary-cell");
      cell.append(element("span", "", label), element("strong", "", String(value)));
      summary.append(cell);
    }
    summary.hidden = false;

    resultList.replaceChildren();
    for (const row of data.rows) {
      const item = element("li", `import-row import-row-${row.status}`);
      const title = element("strong", "", `Row ${row.rowNumber}: ${row.title ?? "Untitled row"}`);
      const category = row.category ? element("span", "import-row-category", row.category) : null;
      item.append(title);
      if (category) item.append(category);
      for (const error of row.errors ?? []) item.append(element("p", "import-row-error", error));
      for (const warning of row.warnings ?? []) item.append(element("p", "import-row-warning", warning));
      resultList.append(item);
    }
    if (data.rowsTruncated) resultList.append(element("li", "import-row import-row-note", "Preview list is capped at the first 100 rows; all rows were still validated on the server."));
    results.hidden = false;
    commitButton.disabled = !data.canCommit;
  }

  fileInput.addEventListener("change", () => resetPreview(fileInput.files?.[0] ? "File selected. Preview it before importing." : undefined));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = "Choose a CSV file first.";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      status.textContent = "That file is larger than the 10 MB Phase-1 import limit.";
      return;
    }
    previewButton.disabled = true;
    commitButton.disabled = true;
    status.textContent = "Validating every import row without changing your Vault…";
    try {
      csv = await file.text();
      preview = await requestImport(csv, { mode: "preview" });
      renderPreview(preview);
      status.textContent = preview.canCommit
        ? `Preview complete. ${preview.validRows.toLocaleString()} rows are valid. Review warnings before committing.`
        : `Preview found ${preview.invalidRows.toLocaleString()} invalid rows. Nothing can be imported until they are corrected.`;
    } catch (error) {
      resetPreview(error.message);
    } finally {
      previewButton.disabled = false;
    }
  });

  commitButton.addEventListener("click", async () => {
    if (!preview?.canCommit || !csv) return;
    commitButton.disabled = true;
    previewButton.disabled = true;
    status.textContent = "Securing reviewed treasure records in your Royal Vault…";
    try {
      const result = await requestImport(csv, {
        mode: "commit",
        fingerprint: preview.fingerprint,
        createMissingOrganization: createMissing.checked
      });
      status.textContent = `${result.imported.toLocaleString()} treasure records imported. ${result.createdFolders.toLocaleString()} folders and ${result.createdLocations.toLocaleString()} physical locations were created.`;
      refreshButton.hidden = false;
      fileInput.disabled = true;
      createMissing.disabled = true;
    } catch (error) {
      status.textContent = error.message;
      commitButton.disabled = false;
    } finally {
      previewButton.disabled = false;
    }
  });

  return { dialog, resetPreview };
}

function installImportEntry() {
  installStylesheet();
  const actions = document.querySelector(".vault-hero-actions");
  if (!actions || actions.querySelector("[data-open-vault-import]")) return;
  const { dialog, resetPreview } = buildDialog();
  const button = element("button", "quiet-button", "Import CSV");
  button.type = "button";
  button.dataset.openVaultImport = "";
  button.addEventListener("click", () => {
    resetPreview();
    dialog.showModal();
  });
  const exportLink = actions.querySelector('a[href="/api/vault/export.csv"]');
  if (exportLink) actions.insertBefore(button, exportLink);
  else actions.append(button);
}

installImportEntry();
