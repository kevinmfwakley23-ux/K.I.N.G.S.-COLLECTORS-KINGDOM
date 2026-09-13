function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function svgNode(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-portfolio.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-portfolio.css";
  document.head.append(link);
}

async function api(path, { method = "GET" } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  let body = {};
  try {
    body = await response.json();
  } catch {}
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "Portfolio valuation history could not be loaded.");
  return body;
}

function formatMoney(cents, currency) {
  if (cents === null || cents === undefined) return "Unavailable";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatSignedMoney(cents, currency) {
  if (cents === null || cents === undefined) return "Change unavailable";
  if (cents === 0) return `No change in ${currency}`;
  const sign = cents > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(cents), currency)}`;
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
    copy.append(
      node("strong", "", group.label),
      node("small", "", `${group.valuedTreasureCount} valued treasure${group.valuedTreasureCount === 1 ? "" : "s"} • ${group.valuedUnitCount} unit${group.valuedUnitCount === 1 ? "" : "s"}`)
    );
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

function chartSegments(points) {
  const segments = [];
  let active = [];
  for (const point of points) {
    if (point.available && Number.isSafeInteger(point.totalEstimatedCents)) {
      active.push(point);
    } else if (active.length) {
      segments.push(active);
      active = [];
    }
  }
  if (active.length) segments.push(active);
  return segments;
}

function renderHistoryChart(series) {
  const card = node("article", "portfolio-history-card");
  const points = series.points ?? [];
  const available = points.filter((point) => point.available && Number.isSafeInteger(point.totalEstimatedCents));
  const head = node("div", "portfolio-history-card-head");
  const copy = node("div", "");
  const latest = available[available.length - 1] ?? null;
  copy.append(
    node("span", "eyebrow", `${series.currency} evidence history`),
    node("h3", "", latest ? formatMoney(latest.totalEstimatedCents, series.currency) : "No supported estimate"),
    node("small", "", latest ? `${latest.coveragePercent}% evidence coverage • ${latest.evidenceIds.length} exact sold-evidence IDs` : "No snapshot in this range has supported evidence")
  );
  if (latest) {
    const change = node("strong", `portfolio-history-delta ${latest.deltaCents > 0 ? "is-up" : latest.deltaCents < 0 ? "is-down" : "is-flat"}`, formatSignedMoney(latest.deltaCents, series.currency));
    head.append(copy, change);
  } else {
    head.append(copy);
  }
  card.append(head);

  if (!points.length || !available.length) {
    card.append(node("p", "empty-note", "No evidence-backed history is available for this currency and time range."));
    return card;
  }

  const width = 640;
  const height = 220;
  const left = 34;
  const right = 16;
  const top = 18;
  const bottom = 34;
  const values = available.map((point) => point.totalEstimatedCents);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  const xForIndex = (index) => points.length === 1 ? width / 2 : left + (index / (points.length - 1)) * (width - left - right);
  const yForValue = (value) => top + ((maximum - value) / range) * (height - top - bottom);
  const indexByPoint = new Map(points.map((point, index) => [point, index]));

  const figure = node("figure", "portfolio-history-figure");
  const svg = svgNode("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });
  const firstDate = new Date(points[0].generatedAt);
  const lastDate = new Date(points[points.length - 1].generatedAt);
  const accessibleLabel = `${series.currency} evidence-backed collection value history from ${firstDate.toLocaleDateString()} to ${lastDate.toLocaleDateString()}. Latest supported estimate ${latest ? formatMoney(latest.totalEstimatedCents, series.currency) : "unavailable"}. Missing evidence support is shown as a gap, never as zero.`;
  svg.setAttribute("aria-label", accessibleLabel);
  svg.append(svgNode("line", { x1: left, y1: height - bottom, x2: width - right, y2: height - bottom, class: "portfolio-history-axis" }));

  for (const segment of chartSegments(points)) {
    const coordinateText = segment.map((point) => `${xForIndex(indexByPoint.get(point))},${yForValue(point.totalEstimatedCents)}`).join(" ");
    if (segment.length > 1) svg.append(svgNode("polyline", { points: coordinateText, class: "portfolio-history-line" }));
    for (const point of segment) {
      const circle = svgNode("circle", {
        cx: xForIndex(indexByPoint.get(point)),
        cy: yForValue(point.totalEstimatedCents),
        r: 4,
        class: "portfolio-history-point"
      });
      const title = svgNode("title");
      title.textContent = `${new Date(point.generatedAt).toLocaleDateString()}: ${formatMoney(point.totalEstimatedCents, series.currency)}; ${point.coveragePercent}% coverage; evidence ${evidencePreview(point.evidenceIds)}.`;
      circle.append(title);
      svg.append(circle);
    }
  }

  const high = svgNode("text", { x: left, y: 13, class: "portfolio-history-label" });
  high.textContent = formatMoney(maximum, series.currency);
  const low = svgNode("text", { x: left, y: height - 8, class: "portfolio-history-label" });
  low.textContent = formatMoney(minimum, series.currency);
  const start = svgNode("text", { x: left, y: height - 8, class: "portfolio-history-date-label" });
  start.textContent = firstDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const end = svgNode("text", { x: width - right, y: height - 8, class: "portfolio-history-date-label portfolio-history-date-label-end" });
  end.textContent = lastDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  svg.append(high, low, start, end);
  figure.append(svg);

  const caption = node("figcaption", "portfolio-history-caption", "Evidence-backed advisory estimates only. Breaks in the line mean evidence support was unavailable; the Kingdom does not convert that absence into a zero value.");
  figure.append(caption);
  card.append(figure);

  const recent = node("details", "portfolio-history-details");
  recent.append(node("summary", "", `Audit the latest ${Math.min(6, points.length)} snapshot points`));
  const list = node("ol", "portfolio-history-point-list");
  for (const point of points.slice(-6).reverse()) {
    const value = point.available ? formatMoney(point.totalEstimatedCents, series.currency) : "unsupported evidence gap";
    list.append(node("li", "", `${new Date(point.generatedAt).toLocaleString()}: ${value}; ${point.coveragePercent}% coverage; evidence ${evidencePreview(point.evidenceIds)}.`));
  }
  recent.append(list);
  card.append(recent);
  return card;
}

function explanationCitationList(explanation) {
  const details = node("details", "portfolio-history-details");
  details.append(node("summary", "", "Audit Keeper citations"));
  const list = node("ul", "portfolio-history-citations");
  for (const citation of explanation.snapshotCitations ?? []) {
    list.append(node("li", "", `Portfolio snapshot ${citation.snapshotId} • ${new Date(citation.generatedAt).toLocaleString()} • SHA-256 ${citation.snapshotSha256}`));
  }
  if (explanation.valuationEvidenceIds?.length) {
    list.append(node("li", "", `Valuation evidence IDs: ${explanation.valuationEvidenceIds.join(", ")}`));
  }
  if (explanation.realizedSaleCitations?.length) {
    list.append(node("li", "", `Realized-sale provenance IDs: ${explanation.realizedSaleCitations.map((citation) => citation.sourceRecordId).join(", ")} (context only; not used in the estimate)`));
  }
  details.append(list);
  return details;
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
  const refresh = node("button", "quiet-button", "Capture current value evidence");
  refresh.type = "button";
  heading.append(title, refresh);

  const policy = node("p", "muted-copy", "Portfolio totals are persisted from treasures with one unambiguous current estimate bucket backed by at least three recent compatible sold comparables. Asking listings, corrected evidence, ambiguous grade/condition buckets, archived treasures, and automatic currency conversion are excluded rather than guessed.");
  const status = node("p", "form-status portfolio-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const summary = node("div", "portfolio-summary-grid");
  const breakdowns = node("div", "portfolio-breakdowns");
  const contributions = node("div", "portfolio-contributions");

  const historySection = node("section", "portfolio-history-section");
  historySection.setAttribute("aria-labelledby", "portfolio-history-title");
  const historyHeading = node("div", "portfolio-history-heading");
  const historyTitle = node("div", "");
  historyTitle.append(node("p", "eyebrow", "Persistent value history"), node("h2", "", "How the evidence-backed collection estimate changed"));
  historyTitle.querySelector("h2").id = "portfolio-history-title";
  const rangeControls = node("div", "portfolio-history-ranges");
  rangeControls.setAttribute("role", "group");
  rangeControls.setAttribute("aria-label", "Value history time range");
  const ranges = [
    { days: 30, label: "30D" },
    { days: 90, label: "90D" },
    { days: 365, label: "1Y" },
    { days: 3650, label: "All" }
  ];
  const rangeButtons = ranges.map(({ days, label }) => {
    const button = node("button", "quiet-button portfolio-range-button", label);
    button.type = "button";
    button.dataset.days = String(days);
    rangeControls.append(button);
    return button;
  });
  historyHeading.append(historyTitle, rangeControls);
  const historyCopy = node("p", "muted-copy", "Each point is an immutable, integrity-checked portfolio snapshot with exact sold-evidence IDs. Currencies stay separate, and unsupported evidence periods remain gaps instead of being shown as zero.");
  const historyCharts = node("div", "portfolio-history-grid");
  const explainButton = node("button", "quiet-button portfolio-explain-button", "Ask the Keeper why it changed");
  explainButton.type = "button";
  const explanation = node("div", "portfolio-history-explanation");
  explanation.setAttribute("aria-live", "polite");
  historySection.append(historyHeading, historyCopy, historyCharts, explainButton, explanation);

  section.append(heading, policy, status, summary, breakdowns, contributions, historySection);
  statGrid.after(section);

  let lastPortfolio = null;
  let lastCapture = null;
  let lastHistory = null;
  let selectedDays = 365;

  function renderPortfolio(portfolio) {
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
      categoryColumn.append(node("h4", "", "By category"), renderGroupList(rollup.byCategory ?? [], rollup.currency));
      const collectionColumn = node("div", "portfolio-rollup-column");
      collectionColumn.append(node("h4", "", "By collection"), renderGroupList(rollup.byCollection ?? [], rollup.currency));
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
  }

  function updateRangeButtons() {
    for (const button of rangeButtons) button.setAttribute("aria-pressed", String(Number(button.dataset.days) === selectedDays));
  }

  function renderHistory(history) {
    lastHistory = history;
    historyCharts.replaceChildren();
    if (!history.series.length) {
      historyCharts.append(node("div", "vault-empty-state", "No supported currency history exists yet. Current snapshots are still preserved so future evidence-backed changes can be compared honestly."));
      return;
    }
    for (const series of history.series) historyCharts.append(renderHistoryChart(series));
  }

  async function loadHistory(days = selectedDays) {
    selectedDays = days;
    updateRangeButtons();
    const result = await api(`/api/vault/portfolio-history?days=${encodeURIComponent(days)}&limit=1000`);
    renderHistory(result.history);
    return result.history;
  }

  async function explainChange() {
    explainButton.disabled = true;
    explanation.replaceChildren(node("p", "form-status", "The Keeper is tracing snapshot, treasure, valuation, and realized-sale evidence…"));
    try {
      const result = await api("/api/vault/portfolio-history/explanation");
      const keeper = result.explanation;
      const panel = node("div", "portfolio-keeper-explanation");
      panel.append(node("p", "eyebrow", "Keeper evidence explanation"), node("p", "portfolio-keeper-copy", keeper.text), explanationCitationList(keeper));
      explanation.replaceChildren(panel);
      return keeper;
    } catch (error) {
      explanation.replaceChildren(node("p", "form-status", error.message));
      throw error;
    } finally {
      explainButton.disabled = false;
    }
  }

  async function load() {
    refresh.disabled = true;
    status.textContent = "Capturing the current evidence-backed portfolio state…";
    try {
      const captured = await api("/api/vault/portfolio-history/snapshots", { method: "POST" });
      lastCapture = captured;
      renderPortfolio(captured.snapshot.portfolio);
      status.textContent = captured.created
        ? `Immutable portfolio snapshot captured ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(captured.snapshot.generatedAt))}. Advisory evidence only; not an appraisal.`
        : `Current portfolio evidence matches today's stored snapshot from ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(captured.snapshot.generatedAt))}. No duplicate snapshot was added.`;
      try {
        await loadHistory(selectedDays);
      } catch (error) {
        historyCharts.replaceChildren(node("p", "form-status", error.message));
      }
      return lastPortfolio;
    } catch (error) {
      status.textContent = error.message;
      throw error;
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", () => load().catch(() => {}));
  explainButton.addEventListener("click", () => explainChange().catch(() => {}));
  for (const button of rangeButtons) {
    button.addEventListener("click", () => loadHistory(Number(button.dataset.days)).catch((error) => {
      historyCharts.replaceChildren(node("p", "form-status", error.message));
    }));
  }
  globalThis.addEventListener("focus", () => load().catch(() => {}));
  updateRangeButtons();
  load().catch(() => {});
  return Object.freeze({
    load,
    loadHistory,
    explainChange,
    get portfolio() { return lastPortfolio; },
    get capture() { return lastCapture; },
    get history() { return lastHistory; }
  });
}

createVaultPortfolioUi();
