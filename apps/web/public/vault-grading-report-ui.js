function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
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
  try { body = await response.json(); } catch { body = {}; }
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not load the explainable grading report.");
  return body;
}

function percentage(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : "—";
}

function rangeLabel(summary) {
  if (!summary?.available || !summary.advisoryRange) return "Insufficient evidence";
  return `${summary.advisoryRange.min}–${summary.advisoryRange.max}`;
}

function titleCase(value) {
  return String(value ?? "").split(/[-_]/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function findingExtentLabel(extent) {
  if (!extent) return "No reliable normalized extent available";
  return `${extent.affectedFacePercent}% bounding area • ${extent.estimatedMajorSpanPercent}% major normalized span`;
}

function timestampLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? "Unknown time") : date.toLocaleString();
}

export function createVaultGradingReportUi() {
  const gradingPanel = document.querySelector("#ai-pregrade-panel");
  const treasureSelect = document.querySelector("#grading-pregrade-treasure");
  if (!gradingPanel || !treasureSelect || document.querySelector("#grading-explainable-report")) return null;

  const section = node("section", "grading-quality-panel grading-explainable-report");
  section.id = "grading-explainable-report";
  section.append(
    node("h3", "", "Explainable grading report"),
    node("p", "muted-copy", "The Kingdom breaks stored pre-grade evidence into front/back centering, corners, edges and surface. Dimension ranges are advisory only. They are not official PSA, BGS, CGC, SGC or other professional subgrades.")
  );

  const actions = node("div", "grading-persistence-actions");
  const refresh = node("button", "quiet-button", "Refresh explainable report");
  refresh.type = "button";
  actions.append(refresh);
  section.append(actions);

  const status = node("p", "grading-quality-summary", "Choose a treasure in the Save advisory pre-grade evidence panel to view its report.");
  const overall = node("div", "grading-report-overall");
  const dimensionsRoot = node("div", "grading-dimension-grid");
  const findingsRoot = node("div", "grading-finding-review-list");
  const reviewHistoryRoot = node("div", "grading-review-history");
  section.append(status, overall, dimensionsRoot, findingsRoot, reviewHistoryRoot);

  function treasureId() { return treasureSelect.value || null; }

  function renderOverall(payload) {
    overall.replaceChildren();
    const estimate = payload?.rawEvidenceOverallEstimate ?? payload?.overallEstimate;
    const report = payload?.explainableReport;
    const card = node("article", "grading-report-overall-card");
    const range = estimate?.available && estimate.range ? `${estimate.range.min}–${estimate.range.max}` : "No overall range yet";
    card.append(
      node("strong", "grading-report-range", `Overall raw-evidence advisory range: ${range}`),
      node("span", "", `Overall evidence level: ${estimate?.evidenceLevel ?? "insufficient"}`),
      node("span", "", `Overall confidence: ${percentage(estimate?.confidence ?? 0)} • completeness: ${percentage(estimate?.completeness ?? 0)}`),
      node("span", "", `${report?.rawFindingCount ?? 0} raw detector finding${report?.rawFindingCount === 1 ? "" : "s"} • ${report?.reviewedFindingCount ?? 0} reviewed`),
      node("p", "muted-copy", "Collector finding reviews affect the eight dimension interpretations in this report. In this version, they do not rewrite or recalculate the overall raw-evidence range. This keeps immutable detector evidence and collector interpretation visibly separate."),
      node("p", "muted-copy", "Not an official grade. Stored pixels were not independently reprocessed by the server; the report interprets immutable advisory evidence already stored in the Vault.")
    );
    if (estimate?.missingEvidence?.length) {
      const missing = node("ul", "grading-quality-warnings");
      for (const item of estimate.missingEvidence) missing.append(node("li", "", `Needs evidence: ${item}`));
      card.append(missing);
    }
    overall.append(card);
  }

  function dimensionCard(side, dimension, summary) {
    const card = node("article", `grading-dimension-card ${summary?.available ? "available" : "missing"}`);
    card.append(
      node("div", "grading-dimension-heading", `${titleCase(side)} ${titleCase(dimension)}`),
      node("strong", "grading-dimension-range", rangeLabel(summary)),
      node("span", "", `Confidence ${percentage(summary?.confidence ?? 0)} • completeness ${percentage(summary?.completeness ?? 0)}`),
      node("span", "", `${summary?.candidateFindingIds?.length ?? 0} raw candidate${summary?.candidateFindingIds?.length === 1 ? "" : "s"} • official subgrade: no`)
    );
    if (summary?.missingEvidence?.length) {
      const missing = node("ul", "grading-quality-warnings");
      for (const item of summary.missingEvidence) missing.append(node("li", "", `Needs: ${item}`));
      card.append(missing);
    }
    if (summary?.limitations?.length) card.append(node("p", "muted-copy", summary.limitations[0]));
    return card;
  }

  function renderDimensions(report) {
    dimensionsRoot.replaceChildren();
    const dimensions = report?.dimensions ?? {};
    for (const side of ["front", "back"]) {
      for (const dimension of ["centering", "corners", "edges", "surface"]) {
        const summary = dimensions?.[side]?.[dimension] ?? { available: false, missingEvidence: [`${side}:${dimension}`] };
        dimensionsRoot.append(dimensionCard(side, dimension, summary));
      }
    }
  }

  async function submitReview(finding, decision, noteInput, buttons) {
    const selected = treasureId();
    if (!selected) return;
    for (const button of buttons) button.disabled = true;
    try {
      await api(`/api/grading/treasures/${encodeURIComponent(selected)}/finding-reviews`, {
        method: "POST",
        body: JSON.stringify({
          sourceAnalysisId: finding.sourceAnalysisId,
          findingHash: finding.findingHash,
          decision,
          note: noteInput.value.trim() || null
        })
      });
      status.textContent = `Review appended as ${decision}. Raw detector evidence was preserved.`;
      status.className = "grading-quality-summary pass";
      await loadReport();
    } catch (error) {
      status.textContent = error.message;
      status.className = "grading-quality-summary miss";
      for (const button of buttons) button.disabled = false;
    }
  }

  function findingCard(side, dimension, finding) {
    const card = node("article", "grading-finding-review-card");
    const header = node("div", "grading-finding-review-heading");
    header.append(
      node("strong", "", `${titleCase(finding.type)} • ${titleCase(finding.region)}`),
      node("span", `grading-review-state state-${finding.reviewDecision}`, titleCase(finding.reviewDecision))
    );
    card.append(
      header,
      node("span", "", `${titleCase(side)} ${titleCase(dimension)} • severity ${percentage(finding.severity)} • detector confidence ${percentage(finding.detectorConfidence)}`),
      node("span", "", findingExtentLabel(finding.extent)),
      node("code", "grading-finding-hash", finding.findingHash),
      node("p", "muted-copy", "Review changes interpretation only. This raw detector candidate remains in immutable evidence history regardless of the decision.")
    );

    const noteLabel = node("label", "grading-review-note");
    noteLabel.append(node("span", "", "Review note (optional)"));
    const noteInput = document.createElement("textarea");
    noteInput.maxLength = 1000;
    noteInput.rows = 2;
    noteLabel.append(noteInput);
    card.append(noteLabel);

    const controls = node("div", "grading-finding-review-actions");
    const accepted = node("button", "gold-button", "Accept evidence");
    const rejected = node("button", "quiet-button", "Not supported");
    const uncertain = node("button", "quiet-button", "Unsure");
    for (const button of [accepted, rejected, uncertain]) button.type = "button";
    const buttons = [accepted, rejected, uncertain];
    accepted.addEventListener("click", () => submitReview(finding, "accepted", noteInput, buttons));
    rejected.addEventListener("click", () => submitReview(finding, "rejected", noteInput, buttons));
    uncertain.addEventListener("click", () => submitReview(finding, "uncertain", noteInput, buttons));
    controls.append(accepted, rejected, uncertain);
    card.append(controls);
    return card;
  }

  function renderFindings(report) {
    findingsRoot.replaceChildren();
    findingsRoot.append(node("h4", "", "Detector findings for collector review"));
    let count = 0;
    for (const side of ["front", "back"]) {
      for (const dimension of ["corners", "edges", "surface"]) {
        for (const finding of report?.dimensions?.[side]?.[dimension]?.findings ?? []) {
          findingsRoot.append(findingCard(side, dimension, finding));
          count += 1;
        }
      }
    }
    if (!count) findingsRoot.append(node("p", "muted-copy", "No stored detector candidates are available for review. A zero-candidate completed detector run is shown through the dimension coverage instead of being treated as missing analysis."));
  }

  function renderReviewHistory(reviews = []) {
    reviewHistoryRoot.replaceChildren();
    reviewHistoryRoot.append(
      node("h4", "", "Append-only collector review history"),
      node("p", "muted-copy", "Every review decision remains in history. A newer review can change the current interpretation, but earlier decisions and the original detector evidence are never overwritten or deleted.")
    );
    if (!reviews.length) {
      reviewHistoryRoot.append(node("p", "muted-copy", "No collector finding reviews have been appended for this treasure."));
      return;
    }
    for (const review of reviews) {
      const card = node("article", "grading-review-history-card");
      card.append(
        node("div", "grading-finding-review-heading", ""),
        node("span", "", `Finding ${review.findingHash.slice(0, 12)}… • source analysis ${review.sourceAnalysisId.slice(0, 12)}…`),
        node("span", "", timestampLabel(review.createdAt)),
        node("code", "grading-finding-hash", review.findingHash)
      );
      const heading = card.firstElementChild;
      heading.append(
        node("strong", "", titleCase(review.decision)),
        node("span", `grading-review-state state-${review.decision}`, "Append-only")
      );
      if (review.note) card.append(node("p", "muted-copy", review.note));
      card.append(node("p", "muted-copy", "Interpretation history only • raw detector evidence preserved • no authoritative grade mutation"));
      reviewHistoryRoot.append(card);
    }
  }

  async function loadReport() {
    const selected = treasureId();
    overall.replaceChildren();
    dimensionsRoot.replaceChildren();
    findingsRoot.replaceChildren();
    reviewHistoryRoot.replaceChildren();
    if (!selected) {
      status.textContent = "Choose a treasure in the Save advisory pre-grade evidence panel to view its report.";
      status.className = "grading-quality-summary";
      return null;
    }
    refresh.disabled = true;
    status.textContent = "Loading explainable grading evidence…";
    status.className = "grading-quality-summary";
    try {
      const payload = await api(`/api/grading/treasures/${encodeURIComponent(selected)}/pregrade-report`);
      renderOverall(payload);
      renderDimensions(payload.explainableReport);
      renderFindings(payload.explainableReport);
      renderReviewHistory(payload.reviewHistory ?? []);
      status.textContent = "Explainable report loaded from immutable stored pre-grade evidence and append-only collector reviews.";
      status.className = "grading-quality-summary pass";
      return payload;
    } catch (error) {
      status.textContent = error.message;
      status.className = "grading-quality-summary miss";
      return null;
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", () => loadReport());
  treasureSelect.addEventListener("change", () => loadReport());
  gradingPanel.append(section);
  if (treasureId()) loadReport();
  return Object.freeze({ panel: section, loadReport });
}

createVaultGradingReportUi();
