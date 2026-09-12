import { buildVaultPortfolioRollup } from "./vault-portfolio-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-portfolio.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-portfolio.css";
  document.head.append(link);
}

async function api(path) {
  const response = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" } });
  let body = {};
  try {
    body = await response.json();
  } catch {}
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "Portfolio valuation evidence could not be loaded.");
  return body;
}

function formatMoney(cents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function renderMoneySummary(rollups) {
  if (!rollups.length) return "No supported estimates";
  return rollups.map((rollup) => formatMoney(rollup.totalEstimatedCents, rollup.currency)).join(" • ");
}

function evidencePreview(evidenceIds) {
  if (!evidenceIds.length) return "No evidence IDs";
  const visible = evidenceIds.slice(0, 3).join(", ");
  return evidenceIds.length > 3 ? `${visible} +${evidenceIds.length - 3} more` : visible;
}

function renderGroupList(groups, currency) {
  const list = node("div", "portfolio-group-list");
  if (!groups.length) {
    list.append(node("p", "empty-note", "No supported rollups in this view."));
    return list;
  }
  for (const group of groups.slice(0, 8)) {
    const row = node("div", "portfolio-group-row");
    const copy = node("span", "portfolio-group-copy");
    copy.append(node("strong", "", group.label), node("small", "", `${group.valuedTreasureCount} valued treasure${group.valuedTreasureCount === 1 ? "" : "s"} • ${group.valuedUnitCount} unit${group.valuedUnitCount === 1 ? "" : "s"}`));
    row.append(copy, node("strong", "portfolio-group-value", formatMoney(group.totalEstimatedCents, currency)));
    list.append(row);
  }
  return list;
}

function updateMarketStat(portfolio) {
  const cards = document.querySelectorAll(".vault-stat-grid .vault-stat");
  const card = cards[cards.length - 1];
  if (!card) return;
  const strong = card.querySelector("strong");
  const small = card.querySelector("small");
  if (strong) strong.textContent = renderMoneySummary(portfolio.currencyRollups);
  if (small) small.textContent = `${portfolio.valuedTreasureCount}/${portfolio.activeTreasureCount} treasure records supported (${portfolio.coveragePercent}% coverage) • currencies never mixed`;
}

export function createVaultPortfolioUi() {
  const statGrid = document.querySelector(".vault-stat-grid");
  if (!statGrid || document.querySelector("#vault-portfolio-intelligence")) return null;
  ensureStylesheet();

  const section = node("section", "marble-panel vault-portfolio-panel");
  section.id = "vault-portfolio-intelligence";
  section.setAttribute("aria-labelledby", "vault-portfolio-title");

  const heading = node("div", "section-heading compact portfolio-heading");
  const title = node("div", "");
  title.append(node("p", "eyebrow", "Evidence-backed portfolio intelligence"), node("h2", "", "What the collection evidence actually supports"));
  title.querySelector("h2").id = "vault-portfolio-title";
  const refresh = node("button", "quiet-button", "Refresh evidence totals");
  refresh.type = "button";
  heading.append(title, refresh);

  const policy = node("p", "muted-copy", "Portfolio totals are derived only from treasures with one unambiguous current estimate bucket backed by at least three recent compatible sold comparables. Asking listings, corrected evidence, ambiguous grade/condition buckets, archived treasures, and automatic currency conversion are excluded rather than guessed.");
  const status = node("p", "form-status portfolio-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const summary = node("div", "portfolio-summary-grid");
  const breakdowns = node("div", "portfolio-breakdowns");
  const contributions = node("div", "portfolio-contributions");
  section.append(heading, policy, status, summary, breakdowns, contributions);
  statGrid.after(section);

  let lastPortfolio = null;

  function render(portfolio) {
    lastPortfolio = portfolio;
    updateMarketStat(portfolio);
    summary.replaceChildren();
    breakdowns.replaceChildren();
    contributions.replaceChildren();

    const coverage = node("article", "portfolio-summary-card");
    coverage.append(node("span", "", "Evidence coverage"), node("strong", "", `${portfolio.coveragePercent}%`), node("small", "", `${portfolio.valuedTreasureCount} of ${portfolio.activeTreasureCount} active treasure records contribute`));
    summary.append(coverage);

    const currencies = node("article", "portfolio-summary-card");
    currencies.append(node("span", "", "Compatible currency totals"), node("strong", "", String(portfolio.currencyRollups.length)), node("small", "", portfolio.currencyRollups.length ? "Displayed separately; no automatic FX conversion" : "No currency has enough compatible evidence yet"));
    summary.append(currencies);

    const excludedCount = portfolio.excluded.length;
    const excludedCard = node("article", "portfolio-summary-card");
    excludedCard.append(node("span", "", "Records excluded from totals"), node("strong", "", String(excludedCount)), node("small", "", "Missing, insufficient, ambiguous, or unsafe evidence is visible but not guessed"));
    summary.append(excludedCard);

    if (!portfolio.currencyRollups.length) {
      breakdowns.append(node("div", "vault-empty-state", "No collection-wide estimate is supported yet. Add compatible recent sold evidence to individual treasures; the Kingdom will not manufacture a portfolio value."));
    }

    for (const rollup of portfolio.currencyRollups) {
      const block = node("article", "portfolio-currency-block");
      const head = node("div", "portfolio-currency-head");
      const copy = node("div", "");
      copy.append(node("span", "eyebrow", rollup.currency), node("h3", "", formatMoney(rollup.totalEstimatedCents, rollup.currency)), node("small", "", `${rollup.valuedTreasureCount} treasure records • ${rollup.valuedUnitCount} physical units • ${rollup.evidenceIds.length} sold-evidence records`));
      head.append(copy);
      block.append(head);

      const columns = node("div", "portfolio-rollup-columns");
      const categoryColumn = node("div", "portfolio-rollup-column");
      categoryColumn.append(node("h4", "", "By category"), renderGroupList(rollup.byCategory, rollup.currency));
      const collectionColumn = node("div", "portfolio-rollup-column");
      collectionColumn.append(node("h4", "", "By collection"), renderGroupList(rollup.byCollection, rollup.currency));
      columns.append(categoryColumn, collectionColumn);
      block.append(columns);
      breakdowns.append(block);
    }

    const contributionHeading = node("div", "valuation-section-heading");
    contributionHeading.append(node("h3", "", "Evidence-backed contributors"), node("small", "", "Exact evidence IDs remain attached to every included treasure"));
    contributions.append(contributionHeading);
    if (!portfolio.contributions.length) {
      contributions.append(node("p", "empty-note", "No treasure currently has one unambiguous supported estimate bucket."));
    } else {
      for (const item of portfolio.contributions.slice(0, 20)) {
        const row = node("article", "portfolio-contribution-row");
        const copy = node("div", "portfolio-contribution-copy");
        copy.append(node("strong", "", item.title), node("small", "", `${item.category ?? "Other"} • Qty ${item.quantity} • ${item.sampleCount} recent sold comparables`), node("code", "portfolio-evidence-ids", `Evidence: ${evidencePreview(item.evidenceIds)}`));
        row.append(copy, node("strong", "portfolio-contribution-value", formatMoney(item.totalEstimatedCents, item.currency)));
        contributions.append(row);
      }
      if (portfolio.contributions.length > 20) contributions.append(node("p", "empty-note", `${portfolio.contributions.length - 20} additional supported treasure records are included in the totals.`));
    }

    const reasons = Object.entries(portfolio.exclusionCounts);
    if (reasons.length) {
      const exclusions = node("details", "portfolio-exclusion-details");
      exclusions.append(node("summary", "", `Why ${portfolio.excluded.length} active records are not in the total`));
      const list = node("ul", "");
      const labels = {
        "no-valuation-evidence": "No valuation evidence",
        "insufficient-compatible-recent-sold-evidence": "Not enough compatible recent sold evidence",
        "ambiguous-multiple-compatible-estimates": "Multiple valid grade/condition estimates; collector context is ambiguous",
        "unsafe-quantity-or-total": "Quantity or derived total could not be represented safely"
      };
      for (const [reason, count] of reasons) list.append(node("li", "", `${labels[reason] ?? reason}: ${count}`));
      exclusions.append(list);
      contributions.append(exclusions);
    }

    status.textContent = `Portfolio evidence read model refreshed ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(portfolio.generatedAt))}. Advisory evidence only; not an appraisal.`;
  }

  async function load() {
    refresh.disabled = true;
    status.textContent = "Rebuilding portfolio totals from Vault evidence…";
    try {
      const exported = await api("/api/vault/export");
      render(buildVaultPortfolioRollup(exported));
      return lastPortfolio;
    } catch (error) {
      status.textContent = error.message;
      throw error;
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", () => load().catch(() => {}));
  globalThis.addEventListener("focus", () => load().catch(() => {}));
  load().catch(() => {});
  return Object.freeze({ load, get portfolio() { return lastPortfolio; } });
}

createVaultPortfolioUi();
