function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-provider-observations.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-provider-observations.css";
  document.head.append(link);
}

async function api(path) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "Provider market observations could not be loaded.");
  return body;
}

function formatMoney(cents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function typeLabel(value) {
  if (value === "retail-price") return "Retail price observation";
  if (value === "buylist-price") return "Buylist price observation";
  if (value === "sold-comparable") return "Provider sold comparable";
  if (value === "asking-listing") return "Provider asking listing";
  return "Provider market observation";
}

function stateLabel(item) {
  if (item.itemState === "graded") return `${item.gradingCompany ?? "Graded"} ${item.gradeLabel ?? ""}`.trim();
  if (item.itemState === "sealed") return "Sealed / unopened";
  if (item.itemState === "raw") return item.conditionLabel ? `Raw • ${item.conditionLabel}` : "Raw / ungraded";
  return "Other state";
}

export function createVaultProviderObservationUi() {
  const treasureIdField = document.querySelector("#treasure-id");
  const valuationSection = document.querySelector("#treasure-valuation-section");
  if (!treasureIdField || !valuationSection || document.querySelector("#treasure-provider-observations")) return null;
  ensureStylesheet();

  const section = document.createElement("fieldset");
  section.id = "treasure-provider-observations";
  section.className = "field-span-2 vault-provider-observations";
  section.hidden = true;
  section.append(node("legend", "", "Provider market observations"));

  const policy = node("div", "provider-observation-policy");
  policy.append(
    node("strong", "", "Provider-origin context — read only"),
    node("p", "muted-copy", "These records were ingested through trusted server-side provider adapters with an explicit provider policy identifier. Retail, buylist, asking, and provider sale observations keep their original semantics. Provider identity does not replace the permanent treasure record, the physical item match remains unverified unless a separate authority proves it, and these observations do not affect the current Kingdom estimate unless a separately verified promotion policy permits that exact observation type.")
  );

  const heading = node("div", "valuation-section-heading");
  heading.append(node("h3", "", "External market context"), node("small", "", "Source, policy, date, variant and retrieval context preserved"));
  const status = node("p", "form-status provider-observation-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const list = node("div", "provider-observation-list");
  section.append(policy, heading, status, list);
  valuationSection.after(section);

  let activeTreasureId = "";
  let observations = [];

  function render() {
    list.replaceChildren();
    if (!observations.length) {
      list.append(node("div", "vault-empty-state", "No trusted provider market observations have been linked to this treasure yet."));
      return;
    }
    for (const item of observations) {
      const card = node("article", "provider-observation-card");
      const head = node("div", "provider-observation-head");
      const copy = node("div", "provider-observation-copy");
      copy.append(
        node("strong", "", typeLabel(item.observationType)),
        node("small", "", `${item.providerName} • observed ${item.observedDate} • ${stateLabel(item)}${item.marketVariant ? ` • ${item.marketVariant}` : ""}`)
      );
      head.append(copy, node("strong", "provider-observation-money", formatMoney(item.amountCents, item.currency)));
      card.append(head);

      const trust = node("p", "provider-observation-trust", "Provider origin verified by configured adapter • physical treasure match not independently verified • excluded from current estimate");
      card.append(trust);
      const ids = node("code", "provider-observation-ids", `Record ${item.id} • Provider observation ${item.providerObservationId}`);
      card.append(ids);
      card.append(node("p", "provider-observation-note", `Policy: ${item.providerPolicyId}${item.providerBuildAt ? ` • provider build ${item.providerBuildAt}` : ""} • retrieved ${item.retrievedAt}`));
      if (item.sourceReference) card.append(node("p", "provider-observation-note", `Source reference: ${item.sourceReference}`));
      if (item.notes) card.append(node("p", "provider-observation-note", item.notes));

      const links = node("div", "provider-observation-links");
      if (item.sourceUrl) {
        const link = node("a", "text-link", "Open source");
        link.href = item.sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
      }
      if (item.providerPolicyUrl) {
        const policyLink = node("a", "text-link", "Provider policy");
        policyLink.href = item.providerPolicyUrl;
        policyLink.target = "_blank";
        policyLink.rel = "noopener noreferrer";
        links.append(policyLink);
      }
      if (links.childElementCount) card.append(links);
      list.append(card);
    }
  }

  async function load(treasureId) {
    status.textContent = "Loading provider market observations…";
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/valuation/observations`);
    if (treasureId !== activeTreasureId) return;
    observations = result.observations ?? [];
    render();
    status.textContent = observations.length
      ? `${observations.length} provider observation${observations.length === 1 ? "" : "s"} loaded. They remain read-only and excluded from the current estimate.`
      : "No provider market observations are linked to this treasure.";
  }

  async function synchronizeTreasure() {
    const nextId = treasureIdField.value.trim();
    if (nextId === activeTreasureId) return;
    activeTreasureId = nextId;
    observations = [];
    render();
    if (!nextId) {
      section.hidden = true;
      status.textContent = "";
      return;
    }
    section.hidden = false;
    await load(nextId).catch((error) => {
      if (nextId !== activeTreasureId) return;
      status.textContent = error.message;
      list.replaceChildren(node("div", "vault-empty-state", "Provider market observations could not be loaded for this treasure."));
    });
  }

  synchronizeTreasure();
  const timer = globalThis.setInterval(synchronizeTreasure, 500);
  globalThis.addEventListener("pagehide", () => globalThis.clearInterval(timer), { once: true });
  return Object.freeze({ synchronizeTreasure, load });
}

createVaultProviderObservationUi();
