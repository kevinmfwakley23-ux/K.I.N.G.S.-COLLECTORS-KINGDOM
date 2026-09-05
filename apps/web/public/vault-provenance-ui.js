import {
  decimalMoneyToCents,
  provenanceEventLabel,
  provenanceEventTypes,
  provenanceTimelineSummary
} from "./vault-provenance-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-provenance.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-provenance.css";
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
  } catch {}
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The provenance ledger could not complete that request.");
  return body;
}

function labelWithText(text, control) {
  const label = document.createElement("label");
  label.append(node("span", "provenance-field-label", text), control);
  return label;
}

function textInput({ id, maxLength, placeholder = "", type = "text" } = {}) {
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  if (maxLength) input.maxLength = maxLength;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

function formatRecordedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded time unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function createVaultProvenanceUi() {
  const treasureIdField = document.querySelector("#treasure-id");
  const mediaSection = document.querySelector("#treasure-media-section");
  if (!treasureIdField || !mediaSection || document.querySelector("#treasure-provenance-section")) return null;

  ensureStylesheet();

  const section = document.createElement("fieldset");
  section.id = "treasure-provenance-section";
  section.className = "field-span-2 vault-provenance-section";
  section.hidden = true;
  section.append(node("legend", "", "Provenance & ownership history"));

  const policy = node("div", "provenance-policy");
  policy.append(
    node("strong", "", "Append-only collector record"),
    node("p", "muted-copy", "Record how this treasure entered, moved through, or left your collection. Entries cannot be normally edited or deleted; corrections append a linked event. Stored claims and documents remain collector-recorded evidence unless a future independent verification service says otherwise.")
  );
  section.append(policy);

  const grid = node("div", "provenance-entry-grid");
  const eventType = document.createElement("select");
  eventType.id = "provenance-event-type";
  for (const type of provenanceEventTypes()) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = provenanceEventLabel(type);
    eventType.append(option);
  }

  const effectiveDate = textInput({ id: "provenance-effective-date", type: "date" });
  const counterparty = textInput({ id: "provenance-counterparty", maxLength: 240, placeholder: "Seller, donor, buyer, borrower…" });
  const method = textInput({ id: "provenance-method", maxLength: 60, placeholder: "purchase, gift, auction, trade…" });
  const amount = textInput({ id: "provenance-amount", placeholder: "0.00", type: "text" });
  amount.inputMode = "decimal";
  const currency = textInput({ id: "provenance-currency", maxLength: 3, placeholder: "USD" });
  currency.value = "USD";
  const reference = textInput({ id: "provenance-reference", maxLength: 500, placeholder: "Receipt, certificate, invoice, lot number…" });
  const sourceUrl = textInput({ id: "provenance-source-url", maxLength: 2048, placeholder: "https://…", type: "url" });

  const notes = document.createElement("textarea");
  notes.id = "provenance-notes";
  notes.rows = 3;
  notes.maxLength = 8000;
  notes.placeholder = "What happened, what the source says, or what should be remembered about this event.";

  const correctionSelect = document.createElement("select");
  correctionSelect.id = "provenance-corrects-event";
  const correctionLabel = labelWithText("Event being corrected", correctionSelect);
  correctionLabel.className = "provenance-correction-field field-span-2";
  correctionLabel.hidden = true;

  grid.append(
    labelWithText("Event type", eventType),
    labelWithText("Effective date", effectiveDate),
    labelWithText("Counterparty / source", counterparty),
    labelWithText("Method", method),
    labelWithText("Amount", amount),
    labelWithText("Currency", currency),
    labelWithText("Reference", reference),
    labelWithText("Evidence URL", sourceUrl),
    correctionLabel
  );
  const notesLabel = labelWithText("Notes", notes);
  notesLabel.className = "field-span-2";
  grid.append(notesLabel);
  section.append(grid);

  const actions = node("div", "provenance-actions");
  const appendButton = node("button", "dark-button", "Append provenance event");
  appendButton.type = "button";
  const status = node("span", "form-status provenance-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  actions.append(appendButton, status);
  section.append(actions);

  const timelineHeading = node("div", "provenance-timeline-heading");
  timelineHeading.append(node("h3", "", "Recorded timeline"), node("small", "", "Newest ledger entry first"));
  const timeline = node("div", "provenance-timeline");
  section.append(timelineHeading, timeline);
  mediaSection.after(section);

  let activeTreasureId = "";
  let events = [];

  function updateCorrectionOptions() {
    const selected = correctionSelect.value;
    correctionSelect.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Choose the earlier event";
    correctionSelect.append(blank);
    for (const event of events) {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = `${provenanceEventLabel(event.eventType)} • ${event.effectiveDate || formatRecordedTime(event.createdAt)}`;
      correctionSelect.append(option);
    }
    if ([...correctionSelect.options].some((option) => option.value === selected)) correctionSelect.value = selected;
  }

  function renderTimeline() {
    timeline.replaceChildren();
    if (!events.length) {
      timeline.append(node("div", "vault-empty-state", "No provenance events recorded for this treasure yet. The permanent treasure record remains valid without invented history."));
      updateCorrectionOptions();
      return;
    }

    for (const event of events) {
      const card = node("article", `provenance-event provenance-${event.eventType}`);
      const head = node("div", "provenance-event-head");
      const title = node("div", "");
      title.append(node("strong", "", provenanceEventLabel(event.eventType)), node("small", "", formatRecordedTime(event.createdAt)));
      const evidence = node("span", "provenance-evidence", "Collector-recorded • not independently verified");
      head.append(title, evidence);
      card.append(head, node("p", "provenance-summary", provenanceTimelineSummary(event)));
      if (event.notes) card.append(node("p", "provenance-notes", event.notes));
      if (event.correctsEventId) card.append(node("p", "provenance-correction-note", `Correction of ledger event ${event.correctsEventId}`));
      if (event.sourceUrl) {
        const link = node("a", "text-link", "Open supporting source");
        link.href = event.sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
      timeline.append(card);
    }
    updateCorrectionOptions();
  }

  async function load(treasureId) {
    status.textContent = "Loading provenance ledger…";
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/provenance?limit=250`);
    if (treasureId !== activeTreasureId) return;
    events = result.events;
    renderTimeline();
    status.textContent = "Append-only history loaded. Existing entries cannot be silently edited or deleted.";
  }

  function clearEntryFields() {
    effectiveDate.value = "";
    counterparty.value = "";
    method.value = "";
    amount.value = "";
    currency.value = "USD";
    reference.value = "";
    sourceUrl.value = "";
    notes.value = "";
    correctionSelect.value = "";
  }

  eventType.addEventListener("change", () => {
    correctionLabel.hidden = eventType.value !== "correction";
    if (correctionLabel.hidden) correctionSelect.value = "";
  });

  section.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target?.tagName !== "TEXTAREA") event.preventDefault();
  });

  appendButton.addEventListener("click", async () => {
    const treasureId = activeTreasureId;
    if (!treasureId) {
      status.textContent = "Save the treasure before recording provenance.";
      return;
    }
    appendButton.disabled = true;
    status.textContent = "Appending collector-recorded evidence…";
    try {
      const amountCents = decimalMoneyToCents(amount.value);
      const body = {
        eventType: eventType.value,
        effectiveDate: effectiveDate.value || null,
        counterparty: counterparty.value || null,
        method: method.value || null,
        amountCents,
        currency: amountCents === null ? null : currency.value,
        reference: reference.value || null,
        sourceUrl: sourceUrl.value || null,
        notes: notes.value || null,
        correctsEventId: eventType.value === "correction" ? correctionSelect.value || null : null
      };
      await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/provenance`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      clearEntryFields();
      await load(treasureId);
      status.textContent = "Provenance event appended. Earlier ledger entries were not changed.";
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
    events = [];
    clearEntryFields();
    renderTimeline();
    if (!nextId) {
      section.hidden = true;
      status.textContent = "Save the treasure before recording provenance.";
      return;
    }
    section.hidden = false;
    await load(nextId).catch((error) => {
      if (nextId !== activeTreasureId) return;
      status.textContent = error.message;
      timeline.replaceChildren(node("div", "vault-empty-state", "The provenance ledger could not be loaded for this treasure."));
    });
  }

  synchronizeTreasure();
  const timer = globalThis.setInterval(synchronizeTreasure, 500);
  globalThis.addEventListener("pagehide", () => globalThis.clearInterval(timer), { once: true });

  return Object.freeze({ synchronizeTreasure, load });
}

createVaultProvenanceUi();
