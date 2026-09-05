function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
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
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Marketplace preparation is unavailable.");
  return payload;
}

function setInputHint(control, text) {
  control.setAttribute("place" + "holder", text);
}

function readinessBadge(readiness) {
  return element(
    "span",
    `market-readiness-badge ${readiness.ready ? "is-ready" : "is-incomplete"}`,
    readiness.ready ? "Ready for Marketplace handoff" : `${readiness.missingChecks.length} preparation step${readiness.missingChecks.length === 1 ? "" : "s"} remaining`
  );
}

function checklist(readiness) {
  const list = element("ul", "market-readiness-checklist");
  for (const item of readiness.checks ?? []) {
    const row = element("li", item.satisfied ? "is-complete" : "is-missing");
    const mark = element("span", "market-readiness-checkmark", item.satisfied ? "✓" : "○");
    mark.setAttribute("aria-hidden", "true");
    const copy = element("div", "market-readiness-check-copy");
    copy.append(element("strong", "", item.label), element("span", "", item.detail));
    row.append(mark, copy);
    list.append(row);
  }
  return list;
}

export async function createMarketplacePreparationSection(treasureId) {
  const section = element("section", "detail-history marketplace-preparation");
  const heading = element("div", "marketplace-preparation-heading");
  const headingCopy = element("div", "");
  headingCopy.append(
    element("h3", "", "Marketplace preparation"),
    element("p", "empty-copy", "Prepare a truthful Vault record for future Marketplace handoff. This does not publish, price, ship, or list the treasure for sale.")
  );
  const badgeSlot = element("div", "market-readiness-badge-slot");
  heading.append(headingCopy, badgeSlot);
  section.append(heading);

  const status = element("p", "form-status", "Loading Marketplace preparation…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const checksSlot = element("div", "market-readiness-checks-slot");
  section.append(status, checksSlot);

  const form = element("form", "marketplace-preparation-form");
  const descriptionLabel = element("label", "marketplace-preparation-field");
  descriptionLabel.append(element("span", "", "Buyer-facing description draft"));
  const description = document.createElement("textarea");
  description.rows = 4;
  description.maxLength = 4000;
  setInputHint(description, "Describe the exact collectible a future buyer would receive. Keep private Vault notes separate.");
  descriptionLabel.append(description);

  const conditionLabel = element("label", "marketplace-preparation-field");
  conditionLabel.append(element("span", "", "Condition disclosure"));
  const conditionDisclosure = document.createElement("textarea");
  conditionDisclosure.rows = 3;
  conditionDisclosure.maxLength = 2000;
  setInputHint(conditionDisclosure, "Describe visible wear, flaws, packaging condition, restoration, or that no additional issues were noted during inspection.");
  conditionLabel.append(conditionDisclosure);

  const save = element("button", "gold-button compact-button", "Save Marketplace preparation");
  save.type = "submit";
  form.append(descriptionLabel, conditionLabel, save);
  section.append(form);

  async function load(message = "") {
    status.textContent = message || "Loading Marketplace preparation…";
    const payload = await requestJson(`/api/vault/treasures/${encodeURIComponent(treasureId)}/marketplace-preparation`);
    const readiness = payload.readiness;
    badgeSlot.replaceChildren(readinessBadge(readiness));
    checksSlot.replaceChildren(checklist(readiness));
    description.value = readiness.listingDescription ?? "";
    conditionDisclosure.value = readiness.conditionDisclosure ?? "";
    status.textContent = readiness.readinessMessage;
    section.dataset.ready = readiness.ready ? "true" : "false";
    return readiness;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.disabled = true;
    status.textContent = "Saving Marketplace preparation…";
    try {
      const payload = await requestJson(`/api/vault/treasures/${encodeURIComponent(treasureId)}/marketplace-preparation`, {
        method: "PATCH",
        body: {
          listingDescription: description.value || null,
          conditionDisclosure: conditionDisclosure.value || null
        }
      });
      const readiness = payload.readiness;
      badgeSlot.replaceChildren(readinessBadge(readiness));
      checksSlot.replaceChildren(checklist(readiness));
      status.textContent = readiness.readinessMessage;
      section.dataset.ready = readiness.ready ? "true" : "false";
      window.dispatchEvent(new CustomEvent("kingdom:vault-marketplace-readiness-change", {
        detail: { treasureId, ready: readiness.ready }
      }));
    } catch (error) {
      status.textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });

  try {
    await load();
  } catch (error) {
    status.textContent = error.message;
    form.hidden = true;
  }
  return section;
}

function installReadyPanel() {
  const sidebar = document.querySelector(".vault-sidebar");
  if (!sidebar || sidebar.querySelector("[data-marketplace-ready-panel]")) return;
  const section = element("section", "sidebar-section marketplace-ready-panel");
  section.dataset.marketplaceReadyPanel = "";
  const head = element("div", "sidebar-section-head");
  head.append(element("h3", "", "Marketplace handoff"));
  const summary = element("p", "empty-copy", "Loading prepared records…");
  summary.setAttribute("aria-live", "polite");
  const list = element("div", "marketplace-ready-list");
  section.append(head, summary, list);
  section.hidden = true;

  function showInVault(item) {
    const search = document.querySelector("#vault-search");
    const form = document.querySelector("#vault-search-form");
    const category = document.querySelector("#filter-category");
    const folder = document.querySelector("#filter-folder");
    const location = document.querySelector("#filter-location");
    if (!search || !form) return;
    if (category) category.value = "";
    if (folder) folder.value = "";
    if (location) location.value = "";
    search.value = item.title;
    form.requestSubmit();
    document.querySelector("#treasure-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function refresh({ reveal = false } = {}) {
    try {
      const payload = await requestJson("/api/vault/marketplace-ready");
      const items = Array.isArray(payload.items) ? payload.items : [];
      summary.textContent = items.length
        ? `${items.length.toLocaleString()} Vault record${items.length === 1 ? " is" : "s are"} ready to hand off into a future Marketplace listing workflow.`
        : "No Vault records currently meet the Marketplace handoff checklist.";
      list.replaceChildren();
      for (const item of items.slice(0, 12)) {
        const button = element("button", "marketplace-ready-item", item.title);
        button.type = "button";
        button.append(element("span", "", `${item.category} · ${item.imageCount} photo${item.imageCount === 1 ? "" : "s"}`));
        button.addEventListener("click", () => showInVault(item));
        list.append(button);
      }
      if (reveal) {
        section.hidden = false;
        section.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } catch (error) {
      summary.textContent = error.message;
      if (reveal) section.hidden = false;
    }
  }

  window.addEventListener("kingdom:vault-open-marketplace-ready", () => refresh({ reveal: true }));
  window.addEventListener("kingdom:vault-marketplace-readiness-change", () => refresh({ reveal: !section.hidden }));
  const keeper = sidebar.querySelector(".keeper-sidebar-callout");
  if (keeper) sidebar.insertBefore(section, keeper);
  else sidebar.append(section);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installReadyPanel, { once: true });
else installReadyPanel();
