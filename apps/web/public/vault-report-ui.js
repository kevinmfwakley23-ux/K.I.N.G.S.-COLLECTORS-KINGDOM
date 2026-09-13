function addStylesheet() {
  if (document.querySelector('link[href="/vault-report-ui.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-report-ui.css";
  document.head.append(link);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function fetchSnapshot() {
  const response = await fetch("/api/vault", { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error("The Royal Vault could not load report scope options.");
  return response.json();
}

function reportUrl({ format, download, collectionId, includeArchived }) {
  const params = new URLSearchParams({ format });
  if (download) params.set("download", "true");
  if (collectionId) params.set("collectionId", collectionId);
  if (includeArchived) params.set("includeArchived", "true");
  return `/api/vault/reports/insurance-preparation?${params.toString()}`;
}

export function createVaultReportUi() {
  if (!document.body?.classList.contains("vault-page")) return null;
  if (document.querySelector("#vault-evidence-report")) return null;
  const treasureList = document.querySelector("#treasure-list");
  if (!treasureList) return null;
  addStylesheet();

  const panel = element("section", "vault-report-panel");
  panel.id = "vault-evidence-report";
  panel.setAttribute("aria-labelledby", "vault-evidence-report-title");

  const heading = element("div", "vault-report-heading");
  const copy = element("div");
  copy.append(element("p", "eyebrow", "Collector-owned documentation"), element("h3", "", "Collection Evidence Report"));
  copy.querySelector("h3").id = "vault-evidence-report-title";
  const badge = element("span", "vault-report-badge", "Insurance preparation • Not an appraisal");
  heading.append(copy, badge);

  const explanation = element("p", "muted-copy", "Package identity, Year/Tags, condition, acquisition facts, private-media references, provenance and evidence-backed valuation citations. Recorded financial facts and advisory estimates stay separate, and currencies are never silently converted.");

  const controls = element("div", "vault-report-controls");
  const scopeLabel = element("label");
  scopeLabel.append(element("span", "", "Report scope"));
  const scope = document.createElement("select");
  scope.id = "vault-report-scope";
  scope.setAttribute("aria-label", "Collection evidence report scope");
  for (const [value, label] of [["kingdom", "Entire active Vault"], ["collection", "One collection"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    scope.append(option);
  }
  scopeLabel.append(scope);

  const collectionLabel = element("label");
  collectionLabel.append(element("span", "", "Collection"));
  const collection = document.createElement("select");
  collection.id = "vault-report-collection";
  collection.disabled = true;
  collection.setAttribute("aria-label", "Collection to include in evidence report");
  collectionLabel.append(collection);

  const archivedLabel = element("label", "vault-report-check");
  const includeArchived = document.createElement("input");
  includeArchived.type = "checkbox";
  includeArchived.id = "vault-report-include-archived";
  archivedLabel.append(includeArchived, element("span", "", "Include archived treasures"));

  const actions = element("div", "vault-report-actions");
  const download = element("a", "gold-button", "Download evidence JSON");
  download.id = "vault-report-download";
  download.setAttribute("download", "");
  const print = element("a", "dark-button", "Open print report");
  print.id = "vault-report-print";
  print.target = "_blank";
  print.rel = "noopener";
  actions.append(download, print);
  controls.append(scopeLabel, collectionLabel, archivedLabel, actions);

  const status = element("p", "form-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  panel.append(heading, explanation, controls, status);
  treasureList.before(panel);

  function updateLinks() {
    const collectionId = scope.value === "collection" ? collection.value : null;
    const options = { collectionId, includeArchived: includeArchived.checked };
    download.href = reportUrl({ ...options, format: "json", download: true });
    print.href = reportUrl({ ...options, format: "html", download: false });
    const ready = scope.value !== "collection" || Boolean(collectionId);
    download.setAttribute("aria-disabled", ready ? "false" : "true");
    print.setAttribute("aria-disabled", ready ? "false" : "true");
    if (!ready) {
      download.removeAttribute("href");
      print.removeAttribute("href");
    }
  }

  scope.addEventListener("change", () => {
    collection.disabled = scope.value !== "collection";
    updateLinks();
  });
  collection.addEventListener("change", updateLinks);
  includeArchived.addEventListener("change", updateLinks);

  fetchSnapshot().then((snapshot) => {
    collection.replaceChildren();
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Choose a collection";
    collection.append(blank);
    for (const item of snapshot.collections ?? []) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.name} (${item.treasureCount ?? 0})`;
      collection.append(option);
    }
    updateLinks();
    status.textContent = "Reports are generated from your current owner-scoped Vault records and evidence. Preparing a report may capture the current portfolio evidence snapshot for audit history.";
  }).catch((error) => {
    status.textContent = error.message;
  });

  updateLinks();
  return Object.freeze({ panel, updateLinks });
}

createVaultReportUi();
