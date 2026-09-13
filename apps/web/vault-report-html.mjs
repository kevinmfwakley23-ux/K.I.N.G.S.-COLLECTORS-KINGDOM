function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function money(cents, currency) {
  if (!Number.isSafeInteger(cents) || !currency) return "Not recorded";
  return `${escapeHtml(currency)} ${(cents / 100).toFixed(2)}`;
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function keyValueRows(rows) {
  return rows.map(([label, value]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${value === null || value === undefined || value === "" ? "Not recorded" : escapeHtml(value)}</td></tr>`).join("");
}

function totalsTable(title, totals) {
  const rows = Array.isArray(totals) ? totals : [];
  return `<section class="report-summary-card"><h3>${escapeHtml(title)}</h3>${rows.length
    ? `<table><thead><tr><th scope="col">Currency</th><th scope="col">Total</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${escapeHtml(item.currency)}</td><td>${money(item.totalCents, item.currency)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted">No supported totals are recorded for this scope.</p>`}</section>`;
}

function mediaList(media) {
  if (!media?.length) return `<p class="muted">No private media records are attached.</p>`;
  return `<ul class="media-list">${media.map((item) => `<li>
    ${item.mediaKind === "image" ? `<img src="${escapeHtml(item.authenticatedUrl)}" alt="Private Vault image: ${escapeHtml(item.originalName)}" loading="lazy">` : ""}
    <div><strong>${escapeHtml(item.originalName)}</strong><br><span>${escapeHtml(item.contentType)} • ${escapeHtml(item.sizeBytes)} bytes</span><br><span>Media ID: <code>${escapeHtml(item.mediaId)}</code></span><br><span>SHA-256: <code>${escapeHtml(item.sha256 ?? "not recorded")}</code></span></div>
  </li>`).join("")}</ul>`;
}

function provenanceTable(events) {
  if (!events?.length) return `<p class="muted">No provenance events are recorded.</p>`;
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Event</th><th scope="col">Effective date</th><th scope="col">Amount</th><th scope="col">Reference</th><th scope="col">Evidence ID</th></tr></thead><tbody>${events.map((event) => `<tr>
    <td>${escapeHtml(event.eventType)}</td>
    <td>${escapeHtml(event.effectiveDate ?? "Not recorded")}</td>
    <td>${event.amountCents === null || event.amountCents === undefined ? "Not recorded" : money(event.amountCents, event.currency)}</td>
    <td>${escapeHtml(event.reference ?? event.sourceUrl ?? "Not recorded")}</td>
    <td><code>${escapeHtml(event.provenanceEventId)}</code>${event.correctsEventId ? `<br><small>Corrects <code>${escapeHtml(event.correctsEventId)}</code></small>` : ""}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function evidenceTable(evidence) {
  if (!evidence?.length) return `<p class="muted">No valuation evidence supports the current advisory estimate.</p>`;
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Evidence ID</th><th scope="col">Type</th><th scope="col">Source</th><th scope="col">Observed</th><th scope="col">Amount</th></tr></thead><tbody>${evidence.map((item) => `<tr>
    <td><code>${escapeHtml(item.evidenceId)}</code></td>
    <td>${escapeHtml(item.evidenceType)}</td>
    <td>${escapeHtml(item.sourceName ?? "Not recorded")}${item.providerId ? `<br><small>Provider: ${escapeHtml(item.providerId)}</small>` : ""}</td>
    <td>${escapeHtml(item.observedDate ?? "Not recorded")}</td>
    <td>${money(item.amountCents, item.currency)}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function treasureArticle(treasure) {
  const acquisition = treasure.recordedFinancialFacts?.acquisition;
  const estimate = treasure.advisoryMarketEstimate;
  const identityRows = [
    ["Permanent treasure ID", treasure.treasureId],
    ["Category", treasure.category],
    ["Year", treasure.year],
    ["Tags", treasure.tags?.join(", ") || null],
    ["Manufacturer", treasure.manufacturer],
    ["Series", treasure.series],
    ["Variant", treasure.variant],
    ["Quantity", treasure.quantity],
    ["Condition", treasure.condition],
    ["Condition notes", treasure.conditionNotes],
    ["Collection", treasure.collection?.name],
    ["Storage location", treasure.storageLocation?.path],
    ["Archived", yesNo(Boolean(treasure.archivedAt))]
  ];
  const acquisitionRows = acquisition ? [
    ["Acquisition date", acquisition.acquisitionDate],
    ["Unit purchase price", money(acquisition.unitPurchasePriceCents, acquisition.currency)],
    ["Recorded total purchase price", money(acquisition.totalPurchasePriceCents, acquisition.currency)],
    ["Currency", acquisition.currency]
  ] : [];

  return `<article class="treasure-report">
    <header><p class="eyebrow">Collection evidence record</p><h2>${escapeHtml(treasure.title)}</h2></header>
    <div class="report-grid">
      <section><h3>Identity & condition</h3><table><tbody>${keyValueRows(identityRows)}</tbody></table></section>
      <section><h3>Recorded acquisition facts</h3>${acquisitionRows.length ? `<table><tbody>${keyValueRows(acquisitionRows)}</tbody></table>` : `<p class="muted">No purchase price is recorded. The Kingdom does not manufacture one.</p>`}</section>
    </div>
    <section><h3>Advisory market evidence</h3>${estimate?.available ? `<p><strong>${money(estimate.totalEstimatedCents, estimate.currency)}</strong> quantity-aware advisory total; ${money(estimate.unitEstimateCents, estimate.currency)} per unit. Observed compatible sold range ${money(estimate.observedLowCents, estimate.currency)}–${money(estimate.observedHighCents, estimate.currency)} from ${escapeHtml(estimate.sampleCount)} recent sold comparables.</p><p class="warning">This estimate is not an appraisal or guaranteed replacement/sale value.</p>${evidenceTable(estimate.evidence)}` : `<p class="muted">No current advisory estimate is supported: ${escapeHtml(estimate?.reason ?? "insufficient evidence")}.</p>`}</section>
    <section><h3>Private media evidence</h3>${mediaList(treasure.media)}</section>
    <section><h3>Provenance & lifecycle records</h3>${provenanceTable(treasure.provenance)}</section>
  </article>`;
}

export function renderInsurancePreparationReportHtml(report) {
  const scopeLabel = report.scope?.type === "collection"
    ? `Collection: ${report.scope.collectionName ?? report.scope.collectionId}`
    : report.scope?.type === "selected-treasures"
      ? `${report.scope.treasureIds?.length ?? 0} selected treasures`
      : "Entire Royal Vault";
  const snapshot = report.portfolioSnapshotCitation;
  return `<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>K.I.N.G.S. Collection Evidence Report</title>
  <link rel="stylesheet" href="/vault-report.css">
</head>
<body class="report-page">
  <main>
    <header class="report-hero">
      <p class="eyebrow">K.I.N.G.S. Collector's Kingdom</p>
      <h1>Collection Evidence Report</h1>
      <p class="subtitle">Insurance preparation & collector documentation</p>
      <p class="warning"><strong>Not an appraisal.</strong> This report packages owner-controlled Vault records and evidence for documentation and insurance preparation.</p>
      <button id="print-report" type="button">Print / Save as PDF</button>
    </header>

    <section class="report-meta" aria-labelledby="report-meta-title">
      <h2 id="report-meta-title">Report identity</h2>
      <table><tbody>${keyValueRows([
        ["Report ID", report.reportId],
        ["Generated", report.generatedAt],
        ["Scope", scopeLabel],
        ["Includes archived treasures", yesNo(Boolean(report.scope?.includeArchived))],
        ["Report policy", report.policyId],
        ["Report SHA-256", report.integrity?.reportSha256],
        ["Portfolio snapshot ID", snapshot?.snapshotId],
        ["Portfolio snapshot generated", snapshot?.generatedAt],
        ["Portfolio snapshot SHA-256", snapshot?.snapshotSha256]
      ])}</tbody></table>
    </section>

    <section aria-labelledby="summary-title"><h2 id="summary-title">Collection summary</h2>
      <div class="report-grid">
        <section class="report-summary-card"><h3>Documentation coverage</h3><table><tbody>${keyValueRows([
          ["Treasure records", report.summary?.treasureCount],
          ["Units", report.summary?.unitCount],
          ["Treasures with private media", report.summary?.treasuresWithMedia],
          ["Treasures with provenance", report.summary?.treasuresWithProvenance],
          ["Treasures with recorded acquisition cost", report.summary?.treasuresWithRecordedAcquisitionCost],
          ["Treasures with advisory estimate", report.summary?.treasuresWithAdvisoryEstimate]
        ])}</tbody></table></section>
        ${totalsTable("Recorded acquisition totals", report.summary?.recordedAcquisitionTotals)}
        ${totalsTable("Advisory estimate totals", report.summary?.advisoryEstimateTotals)}
      </div>
      <p class="warning">Recorded acquisition totals and advisory estimate totals are intentionally separate. Currencies are never automatically combined or converted.</p>
    </section>

    <section aria-labelledby="records-title"><h2 id="records-title">Treasure evidence records</h2>
      ${report.treasures?.length ? report.treasures.map(treasureArticle).join("") : `<p class="muted">No treasures match this report scope.</p>`}
    </section>

    <footer><h2>Important limitations</h2><p>${escapeHtml(report.disclaimer)}</p><p>Integrity algorithm: ${escapeHtml(report.integrity?.algorithm)}. Report digest: <code>${escapeHtml(report.integrity?.reportSha256)}</code>.</p></footer>
  </main>
  <script src="/vault-report.js" defer></script>
</body>
</html>`;
}
