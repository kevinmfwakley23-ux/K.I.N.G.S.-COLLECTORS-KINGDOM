import { createCollectibleDetailsSection } from "./vault-details.js";

const EVENT_LABELS = Object.freeze({
  acquired: "Acquired",
  inherited: "Inherited",
  "gifted-in": "Received as a gift",
  "transferred-in": "Transferred in",
  sold: "Sold",
  "gifted-out": "Gifted to someone",
  "transferred-out": "Transferred out",
  other: "Other ownership event"
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function formatDate(value) {
  if (!value) return "Date not recorded";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, value.length === 10 ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" }).format(date);
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
  if (!response.ok) throw new Error(body.message ?? "The Vault could not update ownership history.");
  return body;
}

function eventSummary(event) {
  const details = [];
  if (event.occurredOn) details.push(formatDate(event.occurredOn));
  if (event.counterparty) details.push(event.counterparty);
  return details.join(" • ") || "Date and counterparty not recorded";
}

export async function createProvenanceSection(treasureId) {
  const wrapper = element("div", "detail-extended-sections");
  const collectibleDetails = await createCollectibleDetailsSection(treasureId);
  wrapper.append(collectibleDetails);

  const section = element("section", "detail-history provenance-history");
  section.dataset.treasureId = treasureId;
  const headingRow = element("div", "provenance-heading");
  const headingCopy = document.createElement("div");
  headingCopy.append(
    element("h3", "", "Ownership & provenance"),
    element("p", "empty-copy", "Preserve how this treasure entered, moved through, or left your collection. This history is separate from the technical edit log.")
  );
  headingRow.append(headingCopy);
  section.append(headingRow);

  const status = element("p", "form-status", "Loading ownership history…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  section.append(status);

  const list = element("ol", "provenance-list");
  section.append(list);

  const form = element("form", "provenance-form");
  const typeLabel = element("label", "");
  typeLabel.append(element("span", "", "Event"));
  const eventType = document.createElement("select");
  typeLabel.append(eventType);

  const dateLabel = element("label", "");
  dateLabel.append(element("span", "", "Date"));
  const occurredOn = document.createElement("input");
  occurredOn.type = "date";
  dateLabel.append(occurredOn);

  const counterpartyLabel = element("label", "");
  counterpartyLabel.append(element("span", "", "From / to / with"));
  const counterparty = document.createElement("input");
  counterparty.maxLength = 180;
  counterparty.setAttribute("place" + "holder", "Person, shop, auction, estate…");
  counterpartyLabel.append(counterparty);

  const notesLabel = element("label", "provenance-notes-field");
  notesLabel.append(element("span", "", "Provenance notes"));
  const notes = document.createElement("textarea");
  notes.maxLength = 2000;
  notes.rows = 3;
  notes.setAttribute("place" + "holder", "Receipt details, inheritance context, transfer story, sale reference…");
  notesLabel.append(notes);

  const submit = element("button", "gold-button compact-button", "Add history entry");
  submit.type = "submit";
  form.append(typeLabel, dateLabel, counterpartyLabel, notesLabel, submit);
  section.append(form);

  async function load() {
    status.textContent = "Loading ownership history…";
    try {
      const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/ownership`);
      eventType.replaceChildren();
      for (const type of result.eventTypes ?? []) eventType.append(new Option(EVENT_LABELS[type] ?? type, type));
      list.replaceChildren();
      if (!(result.ownershipHistory ?? []).length) {
        list.append(element("li", "provenance-empty", "No ownership or provenance events have been recorded yet."));
      } else {
        for (const event of result.ownershipHistory) {
          const item = element("li", "provenance-event");
          const copy = element("div", "provenance-event-copy");
          copy.append(
            element("strong", "", EVENT_LABELS[event.eventType] ?? event.eventType),
            element("span", "", eventSummary(event))
          );
          if (event.notes) copy.append(element("p", "", event.notes));
          const remove = element("button", "manager-delete", "Remove");
          remove.type = "button";
          remove.addEventListener("click", async () => {
            if (!window.confirm("Remove this ownership-history entry? The treasure record itself will remain in the Vault.")) return;
            remove.disabled = true;
            status.textContent = "Removing ownership-history entry…";
            try {
              await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/ownership/${encodeURIComponent(event.id)}`, { method: "DELETE" });
              await load();
              status.textContent = "Ownership-history entry removed.";
            } catch (error) {
              status.textContent = error.message;
              remove.disabled = false;
            }
          });
          item.append(copy, remove);
          list.append(item);
        }
      }
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
      form.hidden = true;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = "Preserving ownership history…";
    try {
      await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/ownership`, {
        method: "POST",
        body: JSON.stringify({
          eventType: eventType.value,
          occurredOn: occurredOn.value || null,
          counterparty: counterparty.value || null,
          notes: notes.value || null
        })
      });
      form.reset();
      await load();
      status.textContent = "Ownership-history entry preserved.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  await load();
  wrapper.append(section);
  return wrapper;
}
