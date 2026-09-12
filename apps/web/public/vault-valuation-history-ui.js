import { buildValuationHistory } from "./vault-valuation-history-core.js";
import { formatValuationMoney, valuationBucketLabel } from "./vault-valuation-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-valuation-history.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-valuation-history.css";
  document.head.append(link);
}

async function api(path) {
  const response = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" } });
  let body = {};
  try { body = await response.json(); } catch {}
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "Valuation history could not be loaded.");
  return body;
}

function availabilityLabel(source) {
  if (source.availability === "available") return "Available now";
  if (source.availability === "requires-provider-credentials") return "Eligible when configured";
  if (source.availability === "restricted-unavailable") return "Restricted access";
  if (source.availability === "blocked-without-written-permission") return "Blocked without permission";
  return "Blocked pending review";
}

function sourceCapabilityText(source) {
  if (!source.capabilities?.length) return "No valuation ingestion capability enabled";
  return source.capabilities.map((value) => value === "sold-comparable" ? "sold evidence" : "asking evidence").join(" + ");
}

function entryContext(entry) {
  if (entry.kind === "realized-sale") return "Realized sale • provenance fact";
  return `${entry.kind === "market-sold-comparable" ? "Sold comparable" : "Asking listing"} • ${valuationBucketLabel(entry)}`;
}

export function createVaultValuationHistoryUi() {
  const treasureIdField = document.querySelector("#treasure-id");
  const valuationSection = document.querySelector("#treasure-valuation-section");
  if (!treasureIdField || !valuationSection || document.querySelector("#treasure-valuation-history-section")) return null;
  ensureStylesheet();

  const section = document.createElement("fieldset");
  section.id = "treasure-valuation-history-section";
  section.className = "field-span-2 vault-valuation-history-section";
  section.hidden = true;
  section.append(node("legend", "", "Market evidence history & realized sales"));

  const truth = node("div", "valuation-history-truth");
  truth.append(
    node("strong", "", "Two ledgers, one transparent history"),
    node("p", "muted-copy", "Market observations remain valuation evidence. Actual sold events remain provenance facts. They are shown together for context but never silently merged into one authoritative market-value record or across currencies.")
  );
  section.append(truth);

  const sourceHeading = node("div", "valuation-history-heading");
  sourceHeading.append(node("h3", "", "Market source authority"), node("small", "", "What the Kingdom is actually allowed to use"));
  const sources = node("div", "valuation-source-grid");
  section.append(sourceHeading, sources);

  const historyHeading = node("div", "valuation-history-heading");
  historyHeading.append(node("h3", "", "Evidence timeline"), node("small", "", "Newest dated observation first"));
  const status = node("p", "form-status valuation-history-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const timeline = node("div", "valuation-history-timeline");
  section.append(historyHeading, status, timeline);
  valuationSection.after(section);

  let activeTreasureId = "";
  let sourceLoaded = false;

  async function loadSources() {
    if (sourceLoaded) return;
    const result = await api("/api/vault/valuation/sources");
    sources.replaceChildren();
    for (const source of result.sources ?? []) {
      const card = node("article", `valuation-source-card source-${source.availability}`);
      const head = node("div", "valuation-source-head");
      head.append(node("strong", "", source.name), node("span", "valuation-source-status", availabilityLabel(source)));
      card.append(
        head,
        node("p", "valuation-source-capabilities", sourceCapabilityText(source)),
        node("p", "valuation-source-reason", source.reason)
      );
      if (source.termsUrl) {
        const link = node("a", "text-link", "Review provider terms / documentation");
        link.href = source.termsUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
      sources.append(card);
    }
    sourceLoaded = true;
  }

  function renderHistory(history) {
    timeline.replaceChildren();
    if (!history.timeline.length) {
      timeline.append(node("div", "vault-empty-state", "No dated market evidence or realized sale facts are available for this treasure yet."));
      return;
    }

    for (const entry of history.timeline) {
      const card = node("article", `valuation-history-entry ${entry.kind}`);
      const head = node("div", "valuation-history-entry-head");
      const left = node("div", "");
      left.append(node("strong", "", entryContext(entry)), node("small", "", entry.date));
      head.append(left, node("span", "valuation-history-money", formatValuationMoney(entry.amountCents, entry.currency)));
      card.append(head);

      if (entry.kind === "realized-sale") {
        const detail = [entry.method, entry.counterparty].filter(Boolean).join(" • ");
        card.append(node("p", "valuation-history-detail", detail || "Collector-recorded realized sale"));
        card.append(node("p", "valuation-history-trust", `Provenance event: ${entry.provenanceEventId}${entry.correctionChainIds.length ? ` • ${entry.correctionChainIds.length} correction(s) resolved` : ""}`));
      } else {
        card.append(node("p", "valuation-history-detail", entry.sourceName));
        card.append(node("p", "valuation-history-trust", entry.influencesEstimate
          ? `Valuation evidence: ${entry.evidenceId} • eligible to influence its compatible evidence bucket`
          : `Valuation evidence: ${entry.evidenceId} • asking context only; excluded from estimates`));
      }
      if (entry.sourceUrl) {
        const link = node("a", "text-link", "Open source evidence");
        link.href = entry.sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
      timeline.append(card);
    }

    for (const unresolved of history.unresolvedSales) {
      const card = node("article", "valuation-history-entry unresolved-sale");
      card.append(
        node("strong", "", "Realized sale excluded from financial history"),
        node("p", "valuation-history-warning", `Provenance event ${unresolved.originalSaleEventId} could not be resolved safely: ${unresolved.status}. No amount was guessed.`)
      );
      timeline.append(card);
    }
  }

  async function load(treasureId) {
    status.textContent = "Loading valuation and realized-sale history…";
    const [valuation, provenance] = await Promise.all([
      api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/valuation`),
      api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/provenance?limit=500`)
    ]);
    if (treasureId !== activeTreasureId) return;
    const history = buildValuationHistory({ evidence: valuation.evidence ?? [], provenanceEvents: provenance.events ?? [] });
    renderHistory(history);
    status.textContent = `${history.marketEvidence.length} active market observation(s), ${history.realizedSales.length} resolved realized sale(s), ${history.unresolvedSales.length} unresolved sale record(s). No cross-currency total was invented.`;
  }

  async function synchronize() {
    const treasureId = treasureIdField.value.trim();
    if (treasureId === activeTreasureId) return;
    activeTreasureId = treasureId;
    if (!treasureId) {
      section.hidden = true;
      timeline.replaceChildren();
      return;
    }
    section.hidden = false;
    try {
      await loadSources();
      await load(treasureId);
    } catch (error) {
      if (treasureId !== activeTreasureId) return;
      status.textContent = error.message;
      timeline.replaceChildren(node("div", "vault-empty-state", "Valuation history could not be loaded without changing any treasure data."));
    }
  }

  synchronize();
  const timer = globalThis.setInterval(synchronize, 500);
  globalThis.addEventListener("pagehide", () => globalThis.clearInterval(timer), { once: true });
  return Object.freeze({ synchronize, load, loadSources });
}

createVaultValuationHistoryUi();
