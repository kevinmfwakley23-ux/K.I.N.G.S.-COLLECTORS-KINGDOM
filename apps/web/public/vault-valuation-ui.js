import {
  decimalValuationMoneyToCents,
  formatValuationMoney,
  valuationBucketLabel,
  valuationEstimateDetail,
  valuationEstimateHeadline,
  valuationEvidenceTypeLabel
} from "./vault-valuation-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-valuation.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-valuation.css";
  document.head.append(link);
}

function setHint(element, text) {
  if (text) element.setAttribute("place" + "holder", text);
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
  } catch {}
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The valuation evidence service could not complete that request.");
  return body;
}

function labelWithText(text, control) {
  const label = document.createElement("label");
  label.append(node("span", "valuation-field-label", text), control);
  return label;
}

function textInput({ id, maxLength, hint = "", type = "text" } = {}) {
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  if (maxLength) input.maxLength = maxLength;
  setHint(input, hint);
  return input;
}

function formatRecordedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded time unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function stateLabel(value) {
  if (value === "raw") return "Raw / ungraded";
  if (value === "graded") return "Third-party graded";
  if (value === "sealed") return "Sealed / unopened";
  return "Other state";
}

export function createVaultValuationUi() {
  const treasureIdField = document.querySelector("#treasure-id");
  const provenanceSection = document.querySelector("#treasure-provenance-section");
  const mediaSection = document.querySelector("#treasure-media-section");
  const anchor = provenanceSection ?? mediaSection;
  if (!treasureIdField || !anchor || document.querySelector("#treasure-valuation-section")) return null;

  ensureStylesheet();

  const section = document.createElement("fieldset");
  section.id = "treasure-valuation-section";
  section.className = "field-span-2 vault-valuation-section";
  section.hidden = true;
  section.append(node("legend", "", "Comparable evidence & value intelligence"));

  const policy = node("div", "valuation-policy");
  policy.append(
    node("strong", "", "Evidence before estimate"),
    node("p", "muted-copy", "The Kingdom keeps sold comparables, asking listings, currencies, raw/graded state, condition and grading context separate. Asking prices never drive the estimate. A value appears only after at least three sold comparables from the last 180 days exist in the same evidence bucket. This is an advisory collector estimate, not an appraisal or guaranteed sale price.")
  );
  section.append(policy);

  const estimateHeading = node("div", "valuation-section-heading");
  estimateHeading.append(node("h3", "", "Evidence-backed estimates"), node("small", "", "Median of recent sold comparables"));
  const estimates = node("div", "valuation-estimates");
  section.append(estimateHeading, estimates);

  const entryHeading = node("div", "valuation-section-heading");
  entryHeading.append(node("h3", "", "Record market evidence"), node("small", "", "Collector-recorded • append-only"));
  section.append(entryHeading);

  const grid = node("div", "valuation-entry-grid");
  const evidenceType = document.createElement("select");
  evidenceType.id = "valuation-evidence-type";
  for (const type of ["sold-comparable", "asking-listing"]) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = valuationEvidenceTypeLabel(type);
    evidenceType.append(option);
  }

  const sourceName = textInput({ id: "valuation-source-name", maxLength: 160, hint: "eBay sold listing, auction house, dealer…" });
  const observedDate = textInput({ id: "valuation-observed-date", type: "date" });
  const amount = textInput({ id: "valuation-amount", hint: "0.00" });
  amount.inputMode = "decimal";
  const currency = textInput({ id: "valuation-currency", maxLength: 3, hint: "USD" });
  currency.value = "USD";

  const itemState = document.createElement("select");
  itemState.id = "valuation-item-state";
  for (const type of ["raw", "graded", "sealed", "other"]) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = stateLabel(type);
    itemState.append(option);
  }

  const condition = textInput({ id: "valuation-condition", maxLength: 120, hint: "Near Mint, Excellent, Used…" });
  const gradingCompany = textInput({ id: "valuation-grading-company", maxLength: 120, hint: "PSA, BGS, CGC…" });
  const gradeLabel = textInput({ id: "valuation-grade-label", maxLength: 80, hint: "10, 9.5, 8…" });
  const gradingCompanyLabel = labelWithText("Grading company", gradingCompany);
  const gradeLabelField = labelWithText("Grade", gradeLabel);
  gradingCompanyLabel.hidden = true;
  gradeLabelField.hidden = true;

  const sourceUrl = textInput({ id: "valuation-source-url", maxLength: 2048, hint: "https://…", type: "url" });
  const sourceReference = textInput({ id: "valuation-source-reference", maxLength: 500, hint: "Sold item ID, auction lot, receipt reference…" });
  const correctionSelect = document.createElement("select");
  correctionSelect.id = "valuation-corrects-evidence";

  const notes = document.createElement("textarea");
  notes.id = "valuation-notes";
  notes.rows = 3;
  notes.maxLength = 4000;
  setHint(notes, "Why this comparable matches, known differences, shipping included, unusual lot details, or other evidence context.");

  grid.append(
    labelWithText("Evidence type", evidenceType),
    labelWithText("Source", sourceName),
    labelWithText("Observed / sold date", observedDate),
    labelWithText("Amount", amount),
    labelWithText("Currency", currency),
    labelWithText("Item state", itemState),
    labelWithText("Condition", condition),
    gradingCompanyLabel,
    gradeLabelField,
    labelWithText("Source URL", sourceUrl),
    labelWithText("Source reference", sourceReference),
    labelWithText("Corrects earlier evidence", correctionSelect)
  );
  const notesLabel = labelWithText("Notes", notes);
  notesLabel.className = "field-span-2";
  grid.append(notesLabel);
  section.append(grid);

  const actions = node("div", "valuation-actions");
  const appendButton = node("button", "dark-button", "Append valuation evidence");
  appendButton.type = "button";
  const status = node("span", "form-status valuation-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  actions.append(appendButton, status);
  section.append(actions);

  const ledgerHeading = node("div", "valuation-section-heading valuation-ledger-heading");
  ledgerHeading.append(node("h3", "", "Evidence ledger"), node("small", "", "Newest entry first"));
  const ledger = node("div", "valuation-ledger");
  section.append(ledgerHeading, ledger);
  anchor.after(section);

  let activeTreasureId = "";
  let evidence = [];
  let snapshot = null;

  function updateGradeFields() {
    const graded = itemState.value === "graded";
    gradingCompanyLabel.hidden = !graded;
    gradeLabelField.hidden = !graded;
    condition.disabled = graded;
    if (graded) condition.value = "";
    else {
      gradingCompany.value = "";
      gradeLabel.value = "";
    }
  }

  function updateCorrectionOptions() {
    const selected = correctionSelect.value;
    correctionSelect.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "No correction — new evidence";
    correctionSelect.append(blank);
    for (const item of evidence.filter((entry) => !entry.corrected)) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${valuationEvidenceTypeLabel(item.evidenceType)} • ${item.observedDate} • ${formatValuationMoney(item.amountCents, item.currency)} • ${item.sourceName}`;
      correctionSelect.append(option);
    }
    if ([...correctionSelect.options].some((option) => option.value === selected)) correctionSelect.value = selected;
  }

  function renderEstimates() {
    estimates.replaceChildren();
    const buckets = snapshot?.buckets ?? [];
    if (!buckets.length) {
      estimates.append(node("div", "vault-empty-state", "No market evidence has been recorded for this treasure. The Kingdom will not invent a value."));
      return;
    }

    for (const bucket of buckets) {
      const card = node("article", `valuation-estimate-card ${bucket.estimateAvailable ? "is-available" : "is-pending"}`);
      const head = node("div", "valuation-estimate-head");
      const identity = node("div", "");
      identity.append(node("strong", "", valuationBucketLabel(bucket.context)), node("small", "", valuationEstimateDetail(bucket)));
      const value = node("div", "valuation-estimate-value", valuationEstimateHeadline(bucket));
      head.append(identity, value);
      card.append(head);

      const facts = node("div", "valuation-estimate-facts");
      facts.append(
        node("span", "", `${bucket.soldComparableCount} sold recorded`),
        node("span", "", `${bucket.recentSoldComparableCount} recent sold`),
        node("span", "", `${bucket.askingListingCount} asking excluded`)
      );
      card.append(facts);
      for (const warning of bucket.warnings ?? []) card.append(node("p", "valuation-warning", warning));
      if (bucket.estimateAvailable) {
        card.append(node("p", "valuation-method", `Method: median of up to 20 sold comparables observed within ${bucket.freshnessWindowDays} days. Asking listings do not affect the result.`));
      }
      estimates.append(card);
    }
  }

  function renderLedger() {
    ledger.replaceChildren();
    if (!evidence.length) {
      ledger.append(node("div", "vault-empty-state", "No comparable evidence recorded yet. Add real sold or asking evidence; do not enter guessed prices."));
      updateCorrectionOptions();
      return;
    }

    for (const item of evidence) {
      const card = node("article", `valuation-evidence-card ${item.corrected ? "is-corrected" : ""}`);
      const head = node("div", "valuation-evidence-head");
      const title = node("div", "");
      title.append(
        node("strong", "", valuationEvidenceTypeLabel(item.evidenceType)),
        node("small", "", `${item.sourceName} • observed ${item.observedDate} • recorded ${formatRecordedTime(item.createdAt)}`)
      );
      const money = node("span", "valuation-evidence-money", formatValuationMoney(item.amountCents, item.currency));
      head.append(title, money);
      card.append(head);

      const context = node("p", "valuation-evidence-context", valuationBucketLabel(item));
      card.append(context);
      const trust = item.corrected
        ? "Corrected by a later append-only record — excluded from active estimates"
        : "Collector-recorded comparable • not independently verified";
      card.append(node("p", `valuation-evidence-trust ${item.corrected ? "is-corrected" : ""}`, trust));
      if (item.sourceReference) card.append(node("p", "valuation-evidence-note", `Reference: ${item.sourceReference}`));
      if (item.notes) card.append(node("p", "valuation-evidence-note", item.notes));
      if (item.correctsEvidenceId) card.append(node("p", "valuation-correction-note", `Correction of evidence ${item.correctsEvidenceId}`));
      if (item.sourceUrl) {
        const link = node("a", "text-link", "Open evidence source");
        link.href = item.sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
      ledger.append(card);
    }
    updateCorrectionOptions();
  }

  async function load(treasureId) {
    status.textContent = "Loading valuation evidence…";
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/valuation`);
    if (treasureId !== activeTreasureId) return;
    evidence = result.evidence ?? [];
    snapshot = result.snapshot ?? null;
    renderEstimates();
    renderLedger();
    status.textContent = "Evidence loaded. Values remain advisory and source-backed.";
  }

  function clearEntryFields() {
    evidenceType.value = "sold-comparable";
    sourceName.value = "";
    observedDate.value = "";
    amount.value = "";
    currency.value = "USD";
    itemState.value = "raw";
    condition.value = "";
    gradingCompany.value = "";
    gradeLabel.value = "";
    sourceUrl.value = "";
    sourceReference.value = "";
    correctionSelect.value = "";
    notes.value = "";
    updateGradeFields();
  }

  itemState.addEventListener("change", updateGradeFields);
  section.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target?.tagName !== "TEXTAREA") event.preventDefault();
  });

  appendButton.addEventListener("click", async () => {
    const treasureId = activeTreasureId;
    if (!treasureId) {
      status.textContent = "Save the treasure before recording valuation evidence.";
      return;
    }
    appendButton.disabled = true;
    status.textContent = "Appending market evidence…";
    try {
      const amountCents = decimalValuationMoneyToCents(amount.value);
      if (amountCents === null) throw new TypeError("Amount is required.");
      await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/valuation/evidence`, {
        method: "POST",
        body: JSON.stringify({
          evidenceType: evidenceType.value,
          sourceName: sourceName.value,
          sourceUrl: sourceUrl.value || null,
          sourceReference: sourceReference.value || null,
          observedDate: observedDate.value,
          amountCents,
          currency: currency.value,
          itemState: itemState.value,
          conditionLabel: condition.value || null,
          gradingCompany: itemState.value === "graded" ? gradingCompany.value : null,
          gradeLabel: itemState.value === "graded" ? gradeLabel.value : null,
          notes: notes.value || null,
          correctsEvidenceId: correctionSelect.value || null
        })
      });
      clearEntryFields();
      await load(treasureId);
      status.textContent = "Valuation evidence appended. Existing evidence was not silently changed.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      appendButton.disabled = false;
    }
  });

  async function synchronizeTreasure() {
    const nextId = treasureIdField.value.trim();
    if (nextId === activeTreasureId) return;
    activeTreasureId = nextId;
    evidence = [];
    snapshot = null;
    clearEntryFields();
    renderEstimates();
    renderLedger();
    if (!nextId) {
      section.hidden = true;
      status.textContent = "Save the treasure before recording valuation evidence.";
      return;
    }
    section.hidden = false;
    await load(nextId).catch((error) => {
      if (nextId !== activeTreasureId) return;
      status.textContent = error.message;
      estimates.replaceChildren(node("div", "vault-empty-state", "Valuation evidence could not be loaded for this treasure."));
      ledger.replaceChildren();
    });
  }

  updateGradeFields();
  synchronizeTreasure();
  const timer = globalThis.setInterval(synchronizeTreasure, 500);
  globalThis.addEventListener("pagehide", () => globalThis.clearInterval(timer), { once: true });

  return Object.freeze({ synchronizeTreasure, load });
}

createVaultValuationUi();
