import {
  branchMoveNotice,
  collectionPatch,
  eligibleLocationParents,
  hasChanges,
  locationPatch,
  locationTypes
} from "./vault-reorganization-core.js";

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
  if (document.querySelector('link[href="/vault-reorganization.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-reorganization.css";
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
  if (!response.ok) throw new Error(body.message ?? "The Royal Vault could not save that organization change.");
  return body;
}

function option(value, label) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function refreshPageAfterSave() {
  globalThis.setTimeout(() => window.location.reload(), 250);
}

function managementButton(label, controlsId) {
  const button = node("button", "quiet-button structure-manage-button", label);
  button.type = "button";
  button.setAttribute("aria-controls", controlsId);
  button.setAttribute("aria-expanded", "false");
  return button;
}

function createCollectionManager() {
  const section = document.querySelector("#collections-title")?.closest(".vault-side-panel");
  const heading = section?.querySelector(".vault-side-heading");
  const list = section?.querySelector("#collection-list");
  if (!section || !heading || !list) return null;

  const shell = node("section", "structure-editor");
  shell.id = "collection-structure-editor";
  shell.hidden = true;
  shell.setAttribute("aria-label", "Edit collection group");

  const select = document.createElement("select");
  select.append(option("", "Choose a collection"));
  const name = document.createElement("input");
  name.maxLength = 120;
  name.required = true;
  const description = document.createElement("textarea");
  description.maxLength = 2000;
  description.rows = 3;
  setHint(description, "What belongs in this collection?");

  const form = node("form", "structure-form");
  const selectLabel = node("label", "");
  selectLabel.append(node("span", "", "Collection"), select);
  const nameLabel = node("label", "");
  nameLabel.append(node("span", "", "Name"), name);
  const descriptionLabel = node("label", "structure-span-2");
  descriptionLabel.append(node("span", "", "Description"), description);
  const status = node("span", "form-status structure-span-2");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const actions = node("div", "structure-actions structure-span-2");
  const save = node("button", "gold-button", "Save collection changes");
  save.type = "submit";
  actions.append(save);
  form.append(selectLabel, nameLabel, descriptionLabel, actions, status);
  shell.append(node("p", "muted-copy", "Edit a collection group without changing the permanent IDs of treasures already assigned to it."), form);
  list.after(shell);

  const button = managementButton("Manage", shell.id);
  heading.append(button);

  let records = [];

  function selectedRecord() {
    return records.find((record) => record.id === select.value) ?? null;
  }

  function populate() {
    const record = selectedRecord();
    name.value = record?.name ?? "";
    description.value = record?.description ?? "";
    save.disabled = !record;
    status.textContent = record ? `${record.treasureCount ?? 0} treasure record${record.treasureCount === 1 ? "" : "s"} currently belong to this collection.` : "";
  }

  function setRecords(nextRecords) {
    const selected = select.value;
    records = Array.isArray(nextRecords) ? nextRecords : [];
    select.replaceChildren(option("", "Choose a collection"));
    for (const record of records) select.append(option(record.id, record.name));
    if (records.some((record) => record.id === selected)) select.value = selected;
    populate();
  }

  select.addEventListener("change", populate);
  button.addEventListener("click", () => {
    shell.hidden = !shell.hidden;
    button.setAttribute("aria-expanded", String(!shell.hidden));
    if (!shell.hidden) select.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const original = selectedRecord();
    if (!original) return;
    try {
      const patch = collectionPatch(original, { name: name.value, description: description.value });
      if (!hasChanges(patch)) {
        status.textContent = "No collection changes to save.";
        return;
      }
      save.disabled = true;
      status.textContent = "Saving collection changes…";
      await api(`/api/vault/collections/${encodeURIComponent(original.id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      status.textContent = "Collection updated. Refreshing authoritative Vault organization…";
      refreshPageAfterSave();
    } catch (error) {
      status.textContent = error.message;
      save.disabled = false;
    }
  });

  return Object.freeze({ setRecords });
}

function createLocationManager() {
  const section = document.querySelector("#locations-title")?.closest(".vault-side-panel");
  const heading = section?.querySelector(".vault-side-heading");
  const list = section?.querySelector("#location-list");
  if (!section || !heading || !list) return null;

  const shell = node("section", "structure-editor");
  shell.id = "location-structure-editor";
  shell.hidden = true;
  shell.setAttribute("aria-label", "Edit or move storage location");

  const select = document.createElement("select");
  select.append(option("", "Choose a storage location"));
  const name = document.createElement("input");
  name.maxLength = 120;
  name.required = true;
  const type = document.createElement("select");
  for (const value of locationTypes()) type.append(option(value, value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())));
  const parent = document.createElement("select");
  const notes = document.createElement("textarea");
  notes.maxLength = 2000;
  notes.rows = 3;
  setHint(notes, "Physical storage notes");
  const pathNote = node("p", "structure-path-note structure-span-2");
  const moveNote = node("p", "muted-copy structure-span-2");

  const form = node("form", "structure-form");
  const selectLabel = node("label", "structure-span-2");
  selectLabel.append(node("span", "", "Storage location"), select);
  const nameLabel = node("label", "");
  nameLabel.append(node("span", "", "Name"), name);
  const typeLabel = node("label", "");
  typeLabel.append(node("span", "", "Type"), type);
  const parentLabel = node("label", "structure-span-2");
  parentLabel.append(node("span", "", "Inside / parent location"), parent);
  const notesLabel = node("label", "structure-span-2");
  notesLabel.append(node("span", "", "Notes"), notes);
  const status = node("span", "form-status structure-span-2");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const actions = node("div", "structure-actions structure-span-2");
  const save = node("button", "gold-button", "Save location changes");
  save.type = "submit";
  actions.append(save);
  form.append(selectLabel, pathNote, nameLabel, typeLabel, parentLabel, notesLabel, moveNote, actions, status);
  shell.append(node("p", "muted-copy", "Rename or move a physical branch. Invalid self/descendant parents are hidden here and still rejected by the server if submitted through a stale or forged request."), form);
  list.after(shell);

  const button = managementButton("Manage", shell.id);
  heading.append(button);

  let records = [];

  function selectedRecord() {
    return records.find((record) => record.id === select.value) ?? null;
  }

  function selectedParent() {
    return records.find((record) => record.id === parent.value) ?? null;
  }

  function updateMoveNote() {
    const record = selectedRecord();
    moveNote.textContent = record ? branchMoveNotice(record, selectedParent()) : "";
  }

  function populateParentOptions(record) {
    parent.replaceChildren(option("", "Top level"));
    if (!record) return;
    for (const candidate of eligibleLocationParents(records, record.id)) {
      parent.append(option(candidate.id, candidate.path ?? candidate.name));
    }
    const currentParentId = record.parentId ?? "";
    if ([...parent.options].some((entry) => entry.value === currentParentId)) parent.value = currentParentId;
  }

  function populate() {
    const record = selectedRecord();
    name.value = record?.name ?? "";
    type.value = record?.locationType ?? "custom";
    notes.value = record?.notes ?? "";
    pathNote.textContent = record ? `Current path: ${record.path}` : "";
    populateParentOptions(record);
    save.disabled = !record;
    status.textContent = record ? `${record.treasureCount ?? 0} treasure record${record.treasureCount === 1 ? "" : "s"} are stored directly at this location.` : "";
    updateMoveNote();
  }

  function setRecords(nextRecords) {
    const selected = select.value;
    records = Array.isArray(nextRecords) ? nextRecords : [];
    select.replaceChildren(option("", "Choose a storage location"));
    for (const record of records) select.append(option(record.id, record.path ?? record.name));
    if (records.some((record) => record.id === selected)) select.value = selected;
    populate();
  }

  select.addEventListener("change", populate);
  parent.addEventListener("change", updateMoveNote);
  button.addEventListener("click", () => {
    shell.hidden = !shell.hidden;
    button.setAttribute("aria-expanded", String(!shell.hidden));
    if (!shell.hidden) select.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const original = selectedRecord();
    if (!original) return;
    try {
      const patch = locationPatch(original, {
        name: name.value,
        locationType: type.value,
        parentId: parent.value,
        notes: notes.value
      });
      if (!hasChanges(patch)) {
        status.textContent = "No location changes to save.";
        return;
      }
      save.disabled = true;
      status.textContent = "Saving location changes…";
      await api(`/api/vault/locations/${encodeURIComponent(original.id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      status.textContent = "Location updated. Refreshing authoritative paths and treasure references…";
      refreshPageAfterSave();
    } catch (error) {
      status.textContent = error.message;
      save.disabled = false;
    }
  });

  return Object.freeze({ setRecords });
}

export function createVaultReorganizationUi() {
  if (!document.body?.classList.contains("vault-page")) return null;
  if (document.querySelector("#collection-structure-editor") || document.querySelector("#location-structure-editor")) return null;
  ensureStylesheet();
  const collectionManager = createCollectionManager();
  const locationManager = createLocationManager();
  if (!collectionManager || !locationManager) return null;

  api("/api/vault")
    .then((snapshot) => {
      collectionManager.setRecords(snapshot.collections ?? []);
      locationManager.setRecords(snapshot.locations ?? []);
    })
    .catch(() => {});

  return Object.freeze({ collectionManager, locationManager });
}

createVaultReorganizationUi();
