import {
  captureCountMessage,
  intakeCandidateMessage,
  intakeTypeLabel,
  treasurePrefillFromIntake
} from "./vault-intake-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setHint(element, text) {
  element.setAttribute("place" + "holder", text);
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-intake.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-intake.css";
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
  if (!response.ok) throw new Error(body.message ?? "The Royal Intake Queue could not complete that request.");
  return body;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded recently";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function setEditorValue(selector, value) {
  if (value === undefined || value === null || value === "") return null;
  const field = document.querySelector(selector);
  if (!field) return null;
  field.value = String(value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  return field;
}

function prefillTreasureEditor(item, status) {
  const newTreasure = document.querySelector("#new-treasure-button");
  if (!newTreasure) throw new Error("The treasure editor is unavailable on this page.");
  newTreasure.click();
  const prefill = treasurePrefillFromIntake(item);
  const field = document.querySelector(prefill.fieldSelector);
  if (!field) throw new Error("The matching treasure identifier field is unavailable.");
  field.value = prefill.value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  const quantity = document.querySelector("#treasure-quantity");
  if (quantity && prefill.captureCount > 1) quantity.value = "1";
  const editorStatus = document.querySelector("#treasure-status");
  if (editorStatus) {
    editorStatus.textContent = prefill.captureCount > 1
      ? `This identifier was captured ${prefill.captureCount} times. Review quantity and exact item identity before saving.`
      : "Identifier copied from the Royal Intake Queue. Confirm exact item identity before saving.";
  }
  field.focus();
  status.textContent = "Identifier copied into a new treasure editor. The queue item remains pending until you explicitly dismiss it.";
}

function candidateDetails(candidate) {
  const fields = candidate?.fields ?? {};
  const parts = [];
  if (Array.isArray(fields.creators) && fields.creators.length) parts.push(fields.creators.join(", "));
  if (fields.publisher) parts.push(fields.publisher);
  if (fields.firstPublishYear) parts.push(String(fields.firstPublishYear));
  if (Number.isInteger(fields.editionCount)) parts.push(`${fields.editionCount} provider edition record${fields.editionCount === 1 ? "" : "s"}`);
  return parts.join(" • ") || "Provider metadata is limited for this candidate.";
}

function prefillCatalogCandidate(item, candidate, status) {
  const title = candidate?.fields?.title;
  if (!title) throw new Error("This provider candidate does not contain a usable title.");
  const newTreasure = document.querySelector("#new-treasure-button");
  if (!newTreasure) throw new Error("The treasure editor is unavailable on this page.");
  newTreasure.click();

  const titleField = setEditorValue("#treasure-title", title);
  setEditorValue("#treasure-category", "Book");
  setEditorValue("#treasure-manufacturer", candidate.fields.publisher);
  setEditorValue("#treasure-barcode", candidate.externalIdentifiers?.isbn ?? item.identifierValue);

  const attributes = {};
  if (Array.isArray(candidate.fields.creators) && candidate.fields.creators.length) {
    attributes.author = candidate.fields.creators.join("; ");
  }
  if (Number.isInteger(candidate.fields.firstPublishYear)) attributes.firstPublishYear = candidate.fields.firstPublishYear;
  if (candidate.providerName) attributes.catalogEvidenceProvider = candidate.providerName;
  if (candidate.providerRecordId) attributes.catalogEvidenceRecord = candidate.providerRecordId;
  if (candidate.sourceUrl) attributes.catalogEvidenceUrl = candidate.sourceUrl;
  if (Object.keys(attributes).length) setEditorValue("#treasure-attributes", JSON.stringify(attributes, null, 2));

  const editorStatus = document.querySelector("#treasure-status");
  if (editorStatus) {
    editorStatus.textContent = `${candidate.providerName || "Catalog provider"} candidate copied into this unsaved editor. Review title, edition, publisher, authorship, condition, and every identifier before saving. No Vault record has been written yet.`;
  }
  titleField?.focus();
  document.querySelector("#treasure-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  status.textContent = "Catalog candidate copied into a new unsaved treasure editor. The Intake Queue item remains pending and no authoritative record was changed.";
}

export function createVaultIntakeUi() {
  const mainColumn = document.querySelector(".vault-main-column");
  const importPanel = document.querySelector(".import-panel");
  if (!mainColumn || !importPanel) return null;
  if (document.querySelector("#royal-intake-panel")) return null;

  ensureStylesheet();

  const panel = node("section", "marble-panel intake-panel");
  panel.id = "royal-intake-panel";
  panel.setAttribute("aria-labelledby", "royal-intake-title");

  const heading = node("div", "section-heading intake-heading");
  const headingCopy = node("div", "");
  headingCopy.append(
    node("p", "eyebrow", "Royal Intake Queue"),
    node("h2", "", "Capture now. Identify carefully. Finish anywhere."),
    node("p", "muted-copy", "Save UPC, EAN, ISBN, barcode, catalog, serial, SKU, or custom identifiers to your account queue. Repeated pending captures become a count instead of noisy duplicate rows. A captured identifier is evidence, not proof of exact collectible identity.")
  );
  headingCopy.querySelector("h2").id = "royal-intake-title";
  const cameraNote = node("aside", "intake-camera-note", "Secure camera scanning is progressive and appears only when this browser exposes the required camera and native barcode APIs. Manual capture remains available on every supported device.");
  heading.append(headingCopy, cameraNote);
  panel.append(heading);

  const stats = node("div", "intake-stats");
  const pendingStat = node("div", "intake-stat");
  const captureStat = node("div", "intake-stat");
  pendingStat.append(node("span", "", "Pending identifiers"), node("strong", "", "0"));
  captureStat.append(node("span", "", "Pending captures"), node("strong", "", "0"));
  stats.append(pendingStat, captureStat);
  panel.append(stats);

  const form = node("form", "intake-form");
  form.id = "royal-intake-form";

  const typeLabel = node("label", "");
  typeLabel.append(node("span", "", "Identifier type"));
  const type = document.createElement("select");
  type.id = "intake-identifier-type";
  for (const identifierType of ["barcode", "upc", "ean", "isbn", "catalog", "serial", "sku", "custom"]) {
    const option = document.createElement("option");
    option.value = identifierType;
    option.textContent = intakeTypeLabel(identifierType);
    type.append(option);
  }
  typeLabel.append(type);

  const valueLabel = node("label", "intake-value-field");
  valueLabel.append(node("span", "", "Identifier value"));
  const value = document.createElement("input");
  value.id = "intake-identifier-value";
  value.required = true;
  value.maxLength = 180;
  value.autocomplete = "off";
  value.inputMode = "text";
  setHint(value, "Scan result or type the identifier");
  valueLabel.append(value);

  const countLabel = node("label", "");
  countLabel.append(node("span", "", "Capture count"));
  const count = document.createElement("input");
  count.id = "intake-capture-count";
  count.type = "number";
  count.min = "1";
  count.max = "1000";
  count.step = "1";
  count.value = "1";
  countLabel.append(count);

  const notesLabel = node("label", "intake-notes-field");
  notesLabel.append(node("span", "", "Capture notes (optional)"));
  const notes = document.createElement("textarea");
  notes.id = "intake-notes";
  notes.rows = 2;
  notes.maxLength = 1200;
  setHint(notes, "Shelf, box, event, seller, or other context you want to remember");
  notesLabel.append(notes);

  const submit = node("button", "gold-button", "Add to intake queue");
  submit.type = "submit";
  form.append(typeLabel, valueLabel, countLabel, notesLabel, submit);
  panel.append(form);

  const status = node("p", "form-status intake-status");
  status.id = "intake-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  panel.append(status);

  const toolbar = node("div", "intake-toolbar");
  const pendingButton = node("button", "quiet-button active", "Pending");
  const historyButton = node("button", "quiet-button", "Dismissed history");
  const refreshButton = node("button", "quiet-button", "Refresh");
  for (const button of [pendingButton, historyButton, refreshButton]) button.type = "button";
  toolbar.append(pendingButton, historyButton, refreshButton);
  panel.append(toolbar);

  const list = node("div", "intake-list");
  list.id = "intake-list";
  panel.append(list);

  importPanel.before(panel);

  const state = { view: "pending", items: [] };

  async function resolveCatalogCandidates(item, output, button) {
    button.disabled = true;
    button.textContent = "Finding candidates…";
    output.replaceChildren(node("p", "muted-copy", "Requesting review-only book metadata evidence…"));
    try {
      const params = new URLSearchParams({
        identifierType: item.identifierType,
        identifierValue: item.identifierValue
      });
      const { result } = await api(`/api/catalog/candidates?${params.toString()}`);
      output.replaceChildren();
      if (!result.candidates.length) {
        output.append(node("p", "catalog-no-match", "No external book candidate was returned for this ISBN. Nothing in the Vault was changed; manual entry remains available."));
        return;
      }

      const evidenceHeader = node("div", "catalog-evidence-header");
      evidenceHeader.append(
        node("strong", "", `${result.candidates.length} review candidate${result.candidates.length === 1 ? "" : "s"}`),
        node("small", "", `Retrieved ${formatTime(result.retrievedAt)} • no Vault write performed`)
      );
      output.append(evidenceHeader);

      for (const candidate of result.candidates) {
        const candidateCard = node("article", "catalog-candidate-card");
        const copy = node("div", "catalog-candidate-copy");
        copy.append(
          node("span", "catalog-provider", candidate.providerName || candidate.providerId),
          node("h4", "", candidate.fields?.title || "Untitled provider candidate"),
          node("p", "muted-copy", candidateDetails(candidate)),
          node("p", "catalog-match-reason", candidate.matchReason || "Provider identifier evidence requires collector review.")
        );

        const candidateActions = node("div", "catalog-candidate-actions");
        if (candidate.sourceUrl) {
          const source = node("a", "text-link", "View source evidence");
          source.href = candidate.sourceUrl;
          source.target = "_blank";
          source.rel = "noopener noreferrer";
          candidateActions.append(source);
        }
        const review = node("button", "dark-button", "Review in treasure editor");
        review.type = "button";
        review.addEventListener("click", () => {
          try {
            prefillCatalogCandidate(item, candidate, status);
          } catch (error) {
            status.textContent = error.message;
          }
        });
        candidateActions.append(review);
        candidateCard.append(copy, candidateActions);
        output.append(candidateCard);
      }
    } catch (error) {
      output.replaceChildren(node("p", "catalog-error", `${error.message} Nothing in the Vault was changed.`));
    } finally {
      button.disabled = false;
      button.textContent = "Find book candidates";
    }
  }

  function renderItem(item) {
    const card = node("article", `intake-card status-${item.status}`);
    const top = node("div", "intake-card-top");
    const copy = node("div", "intake-card-copy");
    copy.append(
      node("span", "intake-type", intakeTypeLabel(item.identifierType)),
      node("strong", "intake-value", item.identifierValue),
      node("small", "", `${captureCountMessage(item.captureCount)} • last ${formatTime(item.lastCapturedAt)}`)
    );
    top.append(copy);

    let catalogOutput = null;
    if (item.status === "pending") {
      const actions = node("div", "intake-card-actions");
      if (item.identifierType === "isbn") {
        const candidateButton = node("button", "quiet-button", "Find book candidates");
        candidateButton.type = "button";
        catalogOutput = node("div", "catalog-candidate-results");
        candidateButton.addEventListener("click", () => resolveCatalogCandidates(item, catalogOutput, candidateButton));
        actions.append(candidateButton);
      }
      const useButton = node("button", "quiet-button", "Use in treasure editor");
      const dismissButton = node("button", "quiet-button", "Dismiss");
      useButton.type = "button";
      dismissButton.type = "button";
      useButton.addEventListener("click", () => {
        try {
          prefillTreasureEditor(item, status);
        } catch (error) {
          status.textContent = error.message;
        }
      });
      dismissButton.addEventListener("click", async () => {
        if (!window.confirm(`Dismiss ${item.identifierValue} from the pending intake queue? Its history will be preserved.`)) return;
        status.textContent = "Dismissing intake item…";
        try {
          await api(`/api/vault/intake/${encodeURIComponent(item.id)}`, { method: "DELETE" });
          status.textContent = "Intake item dismissed. Its capture history is preserved.";
          await load();
        } catch (error) {
          status.textContent = error.message;
        }
      });
      actions.append(useButton, dismissButton);
      top.append(actions);
    } else {
      top.append(node("span", "intake-dismissed-label", `Dismissed ${formatTime(item.dismissedAt)}`));
    }
    card.append(top);

    if (item.notes) card.append(node("p", "intake-notes", item.notes));
    const existingMessage = node("p", item.existingVaultCandidates?.length ? "intake-candidate-warning" : "muted-copy", intakeCandidateMessage(item));
    card.append(existingMessage);

    if (Array.isArray(item.existingVaultCandidates) && item.existingVaultCandidates.length) {
      const candidates = node("ul", "intake-candidates");
      for (const candidate of item.existingVaultCandidates) {
        candidates.append(node("li", "", `${candidate.title} • ${candidate.category}${candidate.variant ? ` • ${candidate.variant}` : ""}`));
      }
      card.append(candidates);
    }
    if (catalogOutput) card.append(catalogOutput);

    return card;
  }

  function render() {
    list.replaceChildren();
    pendingButton.classList.toggle("active", state.view === "pending");
    historyButton.classList.toggle("active", state.view === "dismissed");
    if (!state.items.length) {
      list.append(node("div", "vault-empty-state", state.view === "pending"
        ? "No pending intake identifiers. Capture one here from any device signed into this collector account."
        : "No dismissed intake history is available yet."));
      return;
    }
    for (const item of state.items) list.append(renderItem(item));
  }

  async function load() {
    const result = await api(`/api/vault/intake?status=${encodeURIComponent(state.view)}&limit=250`);
    state.items = result.items;
    pendingStat.querySelector("strong").textContent = String(result.stats.pendingCount);
    captureStat.querySelector("strong").textContent = String(result.stats.pendingCaptureCount);
    render();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Saving identifier to your server-side intake queue…";
    try {
      const result = await api("/api/vault/intake", {
        method: "POST",
        body: JSON.stringify({
          sourceType: "manual",
          identifierType: type.value,
          identifierValue: value.value,
          captureCount: Number(count.value),
          notes: notes.value || null
        })
      });
      status.textContent = result.merged
        ? `Matched an existing pending queue item. Capture count is now ${result.item.captureCount}.`
        : "Identifier added to your Royal Intake Queue.";
      value.value = "";
      count.value = "1";
      notes.value = "";
      state.view = "pending";
      await load();
      value.focus();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  pendingButton.addEventListener("click", async () => {
    state.view = "pending";
    await load().catch((error) => { status.textContent = error.message; });
  });
  historyButton.addEventListener("click", async () => {
    state.view = "dismissed";
    await load().catch((error) => { status.textContent = error.message; });
  });
  refreshButton.addEventListener("click", () => load().catch((error) => { status.textContent = error.message; }));
  globalThis.addEventListener("kings:vault-intake-change", () => load().catch((error) => { status.textContent = error.message; }));

  load().catch((error) => {
    status.textContent = error.message;
    list.replaceChildren(node("div", "vault-empty-state", "The Royal Intake Queue is currently unavailable."));
  });

  return Object.freeze({ load });
}

createVaultIntakeUi();
