function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function labelControl(labelText, control) {
  const label = element("label", "vault-set-field");
  label.append(element("span", "vault-set-field-label", labelText), control);
  return label;
}

async function requestJson(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 401) return { unauthorized: true };
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "The Royal Vault could not complete that collection-set request.");
  return payload;
}

function progressText(set) {
  if (!set.expectedEntryCount) return "No expected entries yet";
  return `${set.completeEntryCount.toLocaleString()} of ${set.expectedEntryCount.toLocaleString()} entries complete · ${Number(set.completionPercent ?? 0).toFixed(2).replace(/\.00$/, "")}%`;
}

function progressNode(set) {
  const wrap = element("div", "vault-set-progress");
  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = Number(set.completionPercent ?? 0);
  progress.setAttribute("aria-label", `${set.name} completion`);
  wrap.append(progress, element("span", "vault-set-progress-copy", progressText(set)));
  return wrap;
}

function installDialog() {
  let dialog = document.querySelector("#vault-set-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "vault-set-dialog";
  dialog.className = "vault-set-dialog";
  dialog.setAttribute("aria-labelledby", "vault-set-dialog-title");
  document.body.append(dialog);
  return dialog;
}

function closeButton(dialog) {
  const button = element("button", "ghost-button vault-set-dialog-close", "Close");
  button.type = "button";
  button.addEventListener("click", () => dialog.close());
  return button;
}

function errorBox(message) {
  const box = element("p", "vault-set-error", message);
  box.setAttribute("role", "alert");
  return box;
}

function loadingCopy(message = "Loading collection set…") {
  const node = element("p", "empty-copy", message);
  node.setAttribute("aria-live", "polite");
  return node;
}

function setInputHint(input, text) {
  input.setAttribute("place" + "holder", text);
}

function createSetDialog(dialog, onCreated) {
  dialog.replaceChildren();
  const head = element("div", "vault-set-dialog-head");
  const title = element("h2", "", "Create collection set");
  title.id = "vault-set-dialog-title";
  head.append(title, closeButton(dialog));

  const intro = element("p", "empty-copy", "Define the checklist you intend to complete. The Kingdom will not infer entries or ownership from names.");
  const form = element("form", "vault-set-form");
  const name = document.createElement("input");
  name.required = true;
  name.maxLength = 120;
  name.autocomplete = "off";
  setInputHint(name, "Example: 1986 Fleer Basketball");
  const category = document.createElement("input");
  category.maxLength = 120;
  category.autocomplete = "off";
  category.setAttribute("list", "category-suggestions");
  setInputHint(category, "Optional collectible category");
  const series = document.createElement("input");
  series.maxLength = 180;
  series.autocomplete = "off";
  setInputHint(series, "Optional series or release");
  const status = element("p", "vault-set-form-status", "");
  status.setAttribute("aria-live", "polite");
  const submit = element("button", "primary-button", "Create set");
  submit.type = "submit";
  form.append(
    labelControl("Set name", name),
    labelControl("Category", category),
    labelControl("Series", series),
    status,
    submit
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = "Creating collection set…";
    try {
      const payload = await requestJson("/api/vault/sets", {
        method: "POST",
        body: {
          name: name.value,
          category: category.value || null,
          series: series.value || null
        }
      });
      if (payload.unauthorized) return;
      status.textContent = "Collection set created.";
      await onCreated(payload.set);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  dialog.append(head, intro, form);
  if (!dialog.open) dialog.showModal();
  name.focus();
}

async function searchTreasures(query) {
  const params = new URLSearchParams({ query, limit: "10", offset: "0" });
  const payload = await requestJson(`/api/vault/treasures?${params}`);
  return Array.isArray(payload.items) ? payload.items : [];
}

function treasureSearch(entry, setId, refreshSet) {
  const details = document.createElement("details");
  details.className = "vault-set-link-search";
  const summary = element("summary", "", "Link owned treasure");
  const form = element("form", "vault-set-treasure-search-form");
  const input = document.createElement("input");
  input.type = "search";
  input.required = true;
  input.autocomplete = "off";
  setInputHint(input, `Search the Vault for ${entry.label}`);
  const searchButton = element("button", "ghost-button", "Search Vault");
  searchButton.type = "submit";
  const status = element("p", "vault-set-form-status", "");
  status.setAttribute("aria-live", "polite");
  const results = element("div", "vault-set-search-results");
  form.append(input, searchButton);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    results.replaceChildren();
    status.textContent = "Searching your Vault…";
    try {
      const items = await searchTreasures(input.value.trim());
      status.textContent = items.length ? `${items.length} possible Vault match${items.length === 1 ? "" : "es"}. You decide which treasure belongs in this set entry.` : "No matching owned treasures found.";
      for (const treasure of items) {
        const row = element("div", "vault-set-search-result");
        const copy = element("div", "vault-set-search-result-copy");
        copy.append(
          element("strong", "", treasure.title),
          element("span", "", [treasure.category, treasure.year, treasure.condition].filter(Boolean).join(" · ") || "Vault treasure")
        );
        const quantity = document.createElement("input");
        quantity.type = "number";
        quantity.min = "1";
        quantity.max = String(Math.max(1, Number(treasure.quantity ?? 1)));
        quantity.value = "1";
        quantity.className = "vault-set-link-quantity";
        quantity.setAttribute("aria-label", `Quantity of ${treasure.title} to credit`);
        const link = element("button", "secondary-button", "Link");
        link.type = "button";
        link.addEventListener("click", async () => {
          link.disabled = true;
          status.textContent = `Linking ${treasure.title}…`;
          try {
            await requestJson(`/api/vault/sets/${encodeURIComponent(setId)}/entries/${encodeURIComponent(entry.id)}/treasures/${encodeURIComponent(treasure.id)}`, {
              method: "PUT",
              body: { quantity: Number.parseInt(quantity.value, 10) || 1 }
            });
            status.textContent = `${treasure.title} linked.`;
            await refreshSet();
          } catch (error) {
            status.textContent = error.message;
            link.disabled = false;
          }
        });
        row.append(copy, quantity, link);
        results.append(row);
      }
    } catch (error) {
      status.textContent = error.message;
    }
  });

  details.append(summary, form, status, results);
  return details;
}

function entryCard(entry, setId, refreshSet) {
  const card = element("article", `vault-set-entry${entry.complete ? " is-complete" : " is-missing"}`);
  const head = element("div", "vault-set-entry-head");
  const titleWrap = element("div", "");
  titleWrap.append(
    element("strong", "vault-set-entry-label", entry.label),
    element("span", "vault-set-entry-key", entry.entryKey)
  );
  const quantity = element(
    "span",
    "vault-set-entry-quantity",
    entry.complete
      ? `${entry.ownedQuantity}/${entry.expectedQuantity} owned`
      : `${entry.missingQuantity} missing · ${entry.ownedQuantity}/${entry.expectedQuantity} owned`
  );
  head.append(titleWrap, quantity);
  card.append(head);

  if (Array.isArray(entry.links) && entry.links.length) {
    const linked = element("div", "vault-set-linked-list");
    for (const link of entry.links) {
      const row = element("div", "vault-set-linked-row");
      const copy = element("span", "", `${link.treasureTitle} · credited ${link.creditedQuantity}/${link.linkedQuantity}`);
      const remove = element("button", "text-button", "Unlink");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await requestJson(`/api/vault/sets/${encodeURIComponent(setId)}/entries/${encodeURIComponent(entry.id)}/treasures/${encodeURIComponent(link.treasureId)}`, { method: "DELETE" });
          await refreshSet();
        } catch {
          remove.disabled = false;
        }
      });
      row.append(copy, remove);
      linked.append(row);
    }
    card.append(linked);
  }

  if (!entry.complete) card.append(treasureSearch(entry, setId, refreshSet));

  const removeEntry = element("button", "text-button vault-set-remove-entry", "Remove expected entry");
  removeEntry.type = "button";
  removeEntry.addEventListener("click", async () => {
    if (!window.confirm(`Remove “${entry.label}” from this checklist? Linked treasures remain safely in your Vault.`)) return;
    removeEntry.disabled = true;
    try {
      await requestJson(`/api/vault/sets/${encodeURIComponent(setId)}/entries/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      await refreshSet();
    } catch {
      removeEntry.disabled = false;
    }
  });
  card.append(removeEntry);
  return card;
}

async function showSetDialog(dialog, setId, { refreshSidebar } = {}) {
  dialog.replaceChildren();
  dialog.append(loadingCopy());
  if (!dialog.open) dialog.showModal();

  const render = async () => {
    const payload = await requestJson(`/api/vault/sets/${encodeURIComponent(setId)}`);
    if (payload.unauthorized) return;
    const set = payload.set;
    dialog.replaceChildren();

    const head = element("div", "vault-set-dialog-head");
    const titleWrap = element("div", "");
    const title = element("h2", "", set.name);
    title.id = "vault-set-dialog-title";
    titleWrap.append(title, element("p", "vault-set-meta", [set.category, set.series].filter(Boolean).join(" · ") || "Collector-defined set"));
    head.append(titleWrap, closeButton(dialog));
    dialog.append(head, progressNode(set));

    const listHead = element("div", "vault-set-list-head");
    listHead.append(
      element("h3", "", "Expected entries"),
      element("span", "vault-set-missing-copy", set.missingUnitCount ? `${set.missingUnitCount.toLocaleString()} required unit${set.missingUnitCount === 1 ? "" : "s"} still missing` : set.expectedEntryCount ? "Checklist complete" : "Add the first expected entry")
    );
    const list = element("div", "vault-set-entry-list");
    for (const entry of set.entries ?? []) list.append(entryCard(entry, set.id, render));
    if (!set.entries?.length) list.append(element("p", "empty-copy", "This set has no expected entries yet. Add the exact items, variants, or quantities you intend to collect."));
    dialog.append(listHead, list);

    const add = element("form", "vault-set-entry-form");
    const addTitle = element("h3", "", "Add expected entry");
    const key = document.createElement("input");
    key.required = true;
    key.maxLength = 120;
    key.autocomplete = "off";
    setInputHint(key, "Checklist key, number, variant, or identifier");
    const label = document.createElement("input");
    label.required = true;
    label.maxLength = 180;
    label.autocomplete = "off";
    setInputHint(label, "Expected collectible name");
    const expected = document.createElement("input");
    expected.type = "number";
    expected.min = "1";
    expected.value = "1";
    expected.required = true;
    const addStatus = element("p", "vault-set-form-status", "");
    addStatus.setAttribute("aria-live", "polite");
    const addButton = element("button", "secondary-button", "Add entry");
    addButton.type = "submit";
    add.append(
      addTitle,
      labelControl("Entry key", key),
      labelControl("Label", label),
      labelControl("Expected quantity", expected),
      addStatus,
      addButton
    );
    add.addEventListener("submit", async (event) => {
      event.preventDefault();
      addButton.disabled = true;
      addStatus.textContent = "Adding expected entry…";
      try {
        await requestJson(`/api/vault/sets/${encodeURIComponent(set.id)}/entries`, {
          method: "POST",
          body: {
            entryKey: key.value,
            label: label.value,
            expectedQuantity: Number.parseInt(expected.value, 10) || 1
          }
        });
        await render();
        await refreshSidebar?.();
      } catch (error) {
        addStatus.textContent = error.message;
        addButton.disabled = false;
      }
    });
    dialog.append(add);

    const danger = element("div", "vault-set-danger-zone");
    const removeSet = element("button", "danger-button", "Delete collection set");
    removeSet.type = "button";
    removeSet.addEventListener("click", async () => {
      if (!window.confirm(`Delete the checklist “${set.name}”? Your linked treasures will remain safely in the Vault.`)) return;
      removeSet.disabled = true;
      try {
        await requestJson(`/api/vault/sets/${encodeURIComponent(set.id)}`, { method: "DELETE" });
        dialog.close();
        await refreshSidebar?.();
      } catch {
        removeSet.disabled = false;
      }
    });
    danger.append(removeSet, element("p", "empty-copy", "Deleting a set removes only its checklist and links. It never deletes treasures from the Vault."));
    dialog.append(danger);
    await refreshSidebar?.();
  };

  try {
    await render();
  } catch (error) {
    dialog.replaceChildren(errorBox(error.message), closeButton(dialog));
  }
}

function setListItem(set, open) {
  const button = element("button", `vault-set-list-item${set.complete ? " is-complete" : ""}`);
  button.type = "button";
  button.addEventListener("click", () => open(set.id));
  const top = element("span", "vault-set-list-item-top");
  top.append(element("strong", "", set.name), element("span", "", set.complete ? "Complete" : set.expectedEntryCount ? `${set.missingEntryCount} missing` : "New"));
  const meter = document.createElement("progress");
  meter.max = 100;
  meter.value = Number(set.completionPercent ?? 0);
  meter.setAttribute("aria-label", `${set.name} completion`);
  button.append(top, meter, element("span", "vault-set-list-item-copy", progressText(set)));
  return button;
}

function install() {
  const sidebar = document.querySelector(".vault-sidebar");
  if (!sidebar || sidebar.querySelector("[data-vault-sets]")) return;
  const dialog = installDialog();
  const section = element("section", "sidebar-section vault-sets-panel");
  section.dataset.vaultSets = "";
  const head = element("div", "sidebar-section-head");
  head.append(element("h3", "", "Collection sets"));
  const create = element("button", "text-button", "Create");
  create.type = "button";
  head.append(create);
  const summary = element("p", "empty-copy", "Loading collection sets…");
  summary.setAttribute("aria-live", "polite");
  const list = element("div", "vault-set-sidebar-list");
  const showAll = element("button", "ghost-button vault-set-show-all", "Show all sets");
  showAll.type = "button";
  section.append(head, summary, list, showAll);

  let incompleteOnly = false;
  async function refresh() {
    try {
      const payload = await requestJson(incompleteOnly ? "/api/vault/sets/incomplete" : "/api/vault/sets");
      if (payload.unauthorized) return;
      const sets = Array.isArray(payload.sets) ? payload.sets : [];
      const incompleteCount = sets.filter((set) => set.expectedEntryCount > 0 && !set.complete).length;
      summary.textContent = incompleteOnly
        ? `${sets.length.toLocaleString()} incomplete collection set${sets.length === 1 ? "" : "s"}.`
        : `${sets.length.toLocaleString()} collection set${sets.length === 1 ? "" : "s"}${sets.length ? ` · ${incompleteCount.toLocaleString()} incomplete` : ""}.`;
      list.replaceChildren();
      for (const set of sets.slice(0, 6)) list.append(setListItem(set, (id) => showSetDialog(dialog, id, { refreshSidebar: refresh })));
      if (!sets.length) list.append(element("p", "empty-copy", incompleteOnly ? "No incomplete sets. Your defined checklists are complete." : "No collection sets yet. Create a checklist for any series, run, release, variant group, or custom collecting goal."));
      showAll.hidden = !incompleteOnly;
    } catch (error) {
      summary.textContent = error.message;
    }
  }

  create.addEventListener("click", () => createSetDialog(dialog, async (set) => {
    incompleteOnly = false;
    await refresh();
    await showSetDialog(dialog, set.id, { refreshSidebar: refresh });
  }));
  showAll.addEventListener("click", async () => {
    incompleteOnly = false;
    await refresh();
  });
  window.addEventListener("kingdom:vault-open-incomplete-sets", async () => {
    incompleteOnly = true;
    await refresh();
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  const keeper = sidebar.querySelector(".keeper-sidebar-callout");
  if (keeper) sidebar.insertBefore(section, keeper);
  else sidebar.append(section);
  refresh();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();
