import { BROWSER_CARD_SIZE_PROFILES, measureBrowserCentering } from "./vault-grading-core.js";
import { createBrowserCalibrationEvidence, defaultCalibrationReferenceFields, previewBrowserCalibrationInputs } from "./vault-grading-calibration-core.js";
import { getCurrentGradingAnalysisSnapshot } from "./vault-grading-ui.js";

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
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not complete the pre-grade request.");
  return body;
}

function formatTimestamp(value) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return String(value ?? ""); }
}

function centeringLabel(record) {
  const centering = record?.analysis?.centering;
  if (!centering?.measurement) return "No centering measurement stored";
  return `${centering.side} • H ${centering.measurement.horizontal?.ratioLabel ?? "—"} • V ${centering.measurement.vertical?.ratioLabel ?? "—"}`;
}

function shortWarnings(values = []) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim().slice(0, 240)))];
}

function evidenceLabel(value) {
  const labels = {
    "front:centering": "Front centering",
    "front:usable-capture": "Front usable straight-on capture",
    "front:contour": "Front corner/edge contour coverage",
    "front:paired-surface": "Front paired raking-light surface coverage",
    "back:centering": "Back centering",
    "back:usable-capture": "Back usable straight-on capture",
    "back:contour": "Back corner/edge contour coverage",
    "back:paired-surface": "Back paired raking-light surface coverage",
    "front:independent-physical-scale-reference": "Front independent physical scale reference",
    "back:independent-physical-scale-reference": "Back independent physical scale reference"
  };
  return labels[value] ?? value;
}

async function sha256File(file) {
  if (!(file instanceof File)) throw new Error("A browser File is required for media integrity matching.");
  if (!globalThis.crypto?.subtle) throw new Error("This browser does not provide WebCrypto SHA-256 support.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function matchPrivateImage(treasureId, file) {
  const digest = await sha256File(file);
  return api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/media-match?sha256=${digest}`);
}

function captureEvidence(snapshot, mediaId, side) {
  if (!snapshot?.quality) return null;
  const quality = snapshot.quality;
  const geometry = snapshot.geometry;
  const confidence = Math.max(0, Math.min(1, Math.min(
    Number.isFinite(quality.analyzerConfidence) ? quality.analyzerConfidence : 0.5,
    Number.isFinite(geometry?.confidence) ? geometry.confidence : 0.35
  )));
  return {
    sourceMediaId: mediaId,
    view: `${side}-straight-on`,
    cropComplete: geometry?.cropComplete === true,
    resolutionAdequate: quality.resolutionAdequate === true,
    focusAdequate: quality.focusAdequate === true,
    glareAcceptable: quality.glareAcceptable === true,
    perspectiveAcceptable: geometry?.perspectiveAcceptable === true,
    analyzerConfidence: confidence,
    warnings: shortWarnings([...(quality.warnings ?? []), ...(geometry?.warnings ?? []), ...(!geometry?.detected && geometry?.reason ? [geometry.reason] : [])])
  };
}

function contourEvidence(snapshot, mediaId) {
  if (!snapshot?.contour?.analyzed || !snapshot.contour.usable) return [];
  return (snapshot.contour.signals ?? []).map((signal) => ({
    type: signal.type === "corner-contour-asymmetry" ? "corner-contour-anomaly" : "edge-contour-anomaly",
    region: signal.region,
    severity: signal.severity,
    confidence: signal.confidence,
    sourceMediaId: mediaId,
    note: signal.note
  }));
}

function contourCoverage(snapshot, mediaId, side) {
  if (!snapshot?.contour?.analyzed) return null;
  return {
    detector: "contour",
    side,
    sourceMediaIds: [mediaId],
    completed: true,
    usableForConditionInference: snapshot.contour.usable === true,
    reviewCandidateCount: snapshot.contour.signals?.length ?? 0,
    method: snapshot.contour.method ?? "contrast-silhouette-contour-v1",
    note: "Browser contour detector completion record. A zero candidate count means the detector ran and isolated no review candidates at this capture quality; it does not prove flawless corners or edges."
  };
}

function surfaceEvidence(snapshot, primaryMediaId, companionMediaId, side) {
  if (!snapshot?.surface?.analyzed) return [];
  return (snapshot.surface.signals ?? []).map((signal) => ({
    type: "surface-reflectance-anomaly",
    region: `${side}-surface-${signal.shape}`,
    severity: signal.severity,
    confidence: signal.confidence,
    sourceMediaId: primaryMediaId,
    comparisonMediaId: companionMediaId,
    boundingBox: signal.boundingBox,
    note: signal.note
  }));
}

function surfaceCoverage(snapshot, primaryMediaId, companionMediaId, side) {
  if (!snapshot?.surface?.analyzed) return null;
  return {
    detector: "paired-raking-light",
    side,
    sourceMediaIds: [primaryMediaId, companionMediaId],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: snapshot.surface.signals?.length ?? 0,
    method: snapshot.surface.method ?? "paired-raking-light-difference-v1",
    note: "Browser paired-raking-light detector completion record. A zero candidate count means no strong localized or linear reflectance review candidate was isolated; it is not proof of a flawless surface."
  };
}

function makeCalibrationInput(id, label, value, step = "0.1") {
  const wrapper = node("label", "");
  wrapper.append(node("span", "", label));
  const input = document.createElement("input");
  input.id = id;
  input.type = "number";
  input.min = "0";
  input.step = step;
  input.inputMode = "decimal";
  if (value !== undefined) input.value = String(value);
  wrapper.append(input);
  return input;
}

export function createVaultGradingPersistenceUi() {
  const gradingPanel = document.querySelector("#ai-pregrade-panel");
  const profile = document.querySelector("#grading-standard-profile");
  const size = document.querySelector("#grading-card-size");
  const side = document.querySelector("#grading-card-side");
  const left = document.querySelector("#grading-border-left");
  const right = document.querySelector("#grading-border-right");
  const top = document.querySelector("#grading-border-top");
  const bottom = document.querySelector("#grading-border-bottom");
  const localImage = document.querySelector("#grading-image-file");
  const companionImage = document.querySelector("#grading-raking-companion-file");
  if (!gradingPanel || !profile || !size || !side || !left || !right || !top || !bottom || document.querySelector("#grading-persistence-panel")) return null;

  const section = node("section", "grading-quality-panel grading-persistence-panel");
  section.id = "grading-persistence-panel";
  section.append(
    node("h3", "", "Save advisory pre-grade evidence"),
    node("p", "muted-copy", "Find the permanent Vault treasure, then append the current advisory analysis as a hashed record. Saved analyses are immutable history. They never overwrite the treasure's condition, grade, authenticity or value.")
  );

  const searchForm = node("form", "grading-reference-form grading-pregrade-treasure-search");
  const searchLabel = node("label", "");
  searchLabel.append(node("span", "", "Find treasure by title, maker, series or identifier"));
  const searchInput = document.createElement("input");
  searchInput.id = "grading-pregrade-treasure-query";
  searchInput.type = "search";
  searchInput.maxLength = 240;
  searchLabel.append(searchInput);
  const searchButton = node("button", "dark-button", "Find treasure");
  searchButton.type = "submit";
  searchForm.append(searchLabel, searchButton);
  section.append(searchForm);

  const resultLabel = node("label", "");
  resultLabel.append(node("span", "", "Treasure to receive this advisory record"));
  const treasureSelect = document.createElement("select");
  treasureSelect.id = "grading-pregrade-treasure";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Choose a treasure after searching";
  treasureSelect.append(blank);
  resultLabel.append(treasureSelect);
  section.append(resultLabel);

  const status = node("p", "grading-quality-summary", "No treasure selected.");
  section.append(status);

  const actions = node("div", "grading-persistence-actions");
  const save = node("button", "gold-button", "Save current advisory analysis");
  save.type = "button";
  save.disabled = true;
  const refresh = node("button", "quiet-button", "Refresh saved history");
  refresh.type = "button";
  refresh.disabled = true;
  actions.append(save, refresh);
  section.append(actions);

  section.append(node("p", "muted-copy", "Centering is always stored as a collector-reviewed measurement. Browser-computed image evidence persists only after exact SHA-256 media matching. Physical millimeter measurements persist only when a same-plane known-size reference passes calibration; the card-size profile is never used as the scale source. No detector result becomes an official grade or authentication claim."));

  const defaults = defaultCalibrationReferenceFields();
  const calibrationPanel = node("section", "grading-quality-panel grading-calibration-panel");
  calibrationPanel.append(
    node("h3", "", "Independent physical scale calibration"),
    node("p", "muted-copy", "Place a same-plane 25 mm Kingdom marker or another measured rectangle beside the card, keep both fully visible, then enter marker and card edge pixel measurements. The Kingdom fails closed rather than inventing millimeters.")
  );
  const calibrationGrid = node("div", "grading-calibration-grid");
  const calibrationInputs = {
    referenceWidthMm: makeCalibrationInput("grading-cal-reference-width-mm", "Marker width mm", defaults.referenceWidthMm),
    referenceHeightMm: makeCalibrationInput("grading-cal-reference-height-mm", "Marker height mm", defaults.referenceHeightMm),
    referenceTopWidthPx: makeCalibrationInput("grading-cal-reference-top-width-px", "Marker top width px"),
    referenceBottomWidthPx: makeCalibrationInput("grading-cal-reference-bottom-width-px", "Marker bottom width px"),
    referenceLeftHeightPx: makeCalibrationInput("grading-cal-reference-left-height-px", "Marker left height px"),
    referenceRightHeightPx: makeCalibrationInput("grading-cal-reference-right-height-px", "Marker right height px"),
    cardTopWidthPx: makeCalibrationInput("grading-cal-card-top-width-px", "Card top width px"),
    cardBottomWidthPx: makeCalibrationInput("grading-cal-card-bottom-width-px", "Card bottom width px"),
    cardLeftHeightPx: makeCalibrationInput("grading-cal-card-left-height-px", "Card left height px"),
    cardRightHeightPx: makeCalibrationInput("grading-cal-card-right-height-px", "Card right height px"),
    confidence: makeCalibrationInput("grading-cal-confidence", "Measurement confidence", defaults.confidence, "0.05")
  };
  for (const input of Object.values(calibrationInputs)) calibrationGrid.append(input.parentElement);
  const calibrationStatus = node("p", "grading-quality-summary", "Add complete marker/card pixel measurements to unlock physical millimeters.");
  const calibrationDetails = node("div", "grading-quality-metrics grading-calibration-details");
  calibrationPanel.append(calibrationGrid, calibrationStatus, calibrationDetails);
  section.append(calibrationPanel);

  const estimatePanel = node("section", "grading-quality-panel grading-estimate-panel");
  estimatePanel.append(node("h3", "", "Kingdom advisory evidence range"));
  const estimateSummary = node("p", "grading-quality-summary", "Select a treasure to calculate the stored-evidence range.");
  const estimateDetails = node("div", "grading-quality-metrics");
  const estimateMissing = node("ul", "grading-quality-warnings");
  estimatePanel.append(estimateSummary, estimateDetails, estimateMissing, node("p", "muted-copy", "Not an official PSA/BGS/CGC grade. This server-derived Kingdom range aggregates stored advisory evidence only; it does not authenticate the physical card and never updates condition, grade, authenticity or value."));
  section.append(estimatePanel);

  const history = node("div", "grading-pregrade-history");
  section.append(history);

  function selectedTreasureId() { return treasureSelect.value || null; }
  function calibrationFields() { return Object.fromEntries(Object.entries(calibrationInputs).map(([key, input]) => [key, input.value])); }

  function renderCalibrationPreview() {
    const preview = previewBrowserCalibrationInputs({ fields: calibrationFields(), cardSizeProfile: BROWSER_CARD_SIZE_PROFILES[size.value] ?? BROWSER_CARD_SIZE_PROFILES.custom });
    calibrationStatus.textContent = preview.message;
    calibrationStatus.className = `grading-quality-summary ${preview.hasInput ? (preview.valid ? "pass" : "miss") : ""}`.trim();
    calibrationDetails.replaceChildren();
    if (preview.measuredCard) {
      calibrationDetails.append(
        node("div", "grading-quality-row", `Estimated card width • ${preview.measuredCard.widthMm} mm${preview.measuredCard.widthDeltaMm === null ? "" : ` • Δ ${preview.measuredCard.widthDeltaMm} mm vs selected profile`}`),
        node("div", "grading-quality-row", `Estimated card height • ${preview.measuredCard.heightMm} mm${preview.measuredCard.heightDeltaMm === null ? "" : ` • Δ ${preview.measuredCard.heightDeltaMm} mm vs selected profile`}`)
      );
    }
    return preview;
  }

  function clearEstimate(message = "Select a treasure to calculate the stored-evidence range.") {
    estimateSummary.textContent = message;
    estimateSummary.className = "grading-quality-summary";
    estimateDetails.replaceChildren();
    estimateMissing.replaceChildren();
  }

  async function searchTreasures(query = "") {
    const params = new URLSearchParams({ pageSize: "50", sort: "title", order: "asc" });
    if (query.trim()) params.set("q", query.trim());
    const result = await api(`/api/vault/query?${params}`);
    treasureSelect.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = result.treasures?.length ? "Choose a matching treasure" : "No matching treasures";
    treasureSelect.append(empty);
    for (const treasure of result.treasures ?? []) {
      const option = document.createElement("option");
      option.value = treasure.id;
      option.textContent = [treasure.title, treasure.series, treasure.variant].filter(Boolean).join(" • ");
      treasureSelect.append(option);
    }
    status.textContent = result.treasures?.length ? `${result.treasures.length} matching treasure${result.treasures.length === 1 ? "" : "s"} loaded.` : "No matching treasure was found. Save the treasure in the Vault before attaching pre-grade evidence.";
    status.className = `grading-quality-summary ${result.treasures?.length ? "pass" : "miss"}`;
    save.disabled = true;
    refresh.disabled = true;
    history.replaceChildren();
    clearEstimate("Choose a matching treasure to calculate its stored-evidence range.");
  }

  async function loadHistory() {
    const treasureId = selectedTreasureId();
    if (!treasureId) return;
    const result = await api(`/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses?limit=20`);
    history.replaceChildren();
    if (!result.analyses?.length) return history.append(node("p", "muted-copy", "No saved advisory pre-grade records exist for this treasure yet."));
    for (const record of result.analyses) {
      const calibrationCount = record.analysis?.calibrationEvidence?.length ?? 0;
      const validCalibrationCount = (record.analysis?.calibrationEvidence ?? []).filter((entry) => entry.valid === true).length;
      const card = node("article", "grading-pregrade-history-card");
      card.append(
        node("strong", "", `${record.standardProfile.toUpperCase()} reference • ${centeringLabel(record)}`),
        node("span", "", formatTimestamp(record.createdAt)),
        node("span", "", `${record.sourceMediaIds?.length ?? 0} linked media • ${calibrationCount} calibration record${calibrationCount === 1 ? "" : "s"} (${validCalibrationCount} valid) • ${record.analysis?.defects?.length ?? 0} detector signal${record.analysis?.defects?.length === 1 ? "" : "s"}`),
        node("code", "", record.analysisSha256),
        node("p", "muted-copy", "Append-only advisory evidence • not an official grade • does not authenticate the physical card")
      );
      history.append(card);
    }
  }

  async function loadEstimate() {
    const treasureId = selectedTreasureId();
    if (!treasureId) return clearEstimate();
    const result = await api(`/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-estimate`);
    const estimate = result.estimate;
    estimateDetails.replaceChildren();
    estimateMissing.replaceChildren();
    const completeness = `${Math.round(Number(estimate.completeness ?? 0) * 100)}%`;
    if (!estimate.available) {
      estimateSummary.textContent = "No advisory range yet — more verified evidence is required.";
      estimateSummary.className = "grading-quality-summary miss";
      estimateDetails.append(node("div", "grading-quality-row", `Evidence completeness • ${completeness}`), node("p", "muted-copy", estimate.reason ?? "Stored evidence has not reached the minimum range threshold."));
    } else {
      estimateSummary.textContent = `${estimate.range.min}–${estimate.range.max} • Kingdom advisory evidence range`;
      estimateSummary.className = "grading-quality-summary pass";
      estimateDetails.append(node("div", "grading-quality-row", `Evidence level • ${estimate.evidenceLevel}`), node("div", "grading-quality-row", `Completeness • ${completeness}`), node("p", "muted-copy", estimate.reason));
    }
    for (const missing of estimate.missing ?? []) estimateMissing.append(node("li", "", `Still missing: ${evidenceLabel(missing)}`));
  }

  async function loadEvidence() { await Promise.all([loadHistory(), loadEstimate()]); }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    searchButton.disabled = true;
    searchButton.textContent = "Searching…";
    try { await searchTreasures(searchInput.value); }
    catch (error) { status.textContent = error.message; status.className = "grading-quality-summary miss"; }
    finally { searchButton.disabled = false; searchButton.textContent = "Find treasure"; }
  });

  treasureSelect.addEventListener("change", () => {
    const enabled = Boolean(selectedTreasureId());
    save.disabled = !enabled;
    refresh.disabled = !enabled;
    if (!enabled) { status.textContent = "No treasure selected."; history.replaceChildren(); clearEstimate(); return; }
    status.textContent = "Treasure selected. Saving will append evidence only; no treasure field will be overwritten.";
    status.className = "grading-quality-summary pass";
    loadEvidence().catch((error) => { status.textContent = error.message; status.className = "grading-quality-summary miss"; });
  });

  refresh.addEventListener("click", () => loadEvidence().catch((error) => { status.textContent = error.message; status.className = "grading-quality-summary miss"; }));
  for (const input of Object.values(calibrationInputs)) input.addEventListener("input", () => renderCalibrationPreview());
  size.addEventListener("change", () => renderCalibrationPreview());

  save.addEventListener("click", async () => {
    const treasureId = selectedTreasureId();
    if (!treasureId) return;
    let measurement;
    try { measurement = measureBrowserCentering({ left: left.value, right: right.value, top: top.value, bottom: bottom.value }); }
    catch (error) { status.textContent = error.message; status.className = "grading-quality-summary miss"; return; }
    save.disabled = true;
    save.textContent = "Saving advisory record…";
    try {
      const snapshot = getCurrentGradingAnalysisSnapshot();
      const primaryFile = localImage?.files?.[0] ?? null;
      const companionFile = companionImage?.files?.[0] ?? null;
      const sourceMediaIds = [];
      const captureQuality = [];
      const calibrationEvidence = [];
      const detectorCoverage = [];
      const defects = [];
      const limitations = [`Browser centering snapshot saved from ${measurement.horizontal.label} horizontal and ${measurement.vertical.label} vertical measurements.`, "No overall grade estimate is client-supplied. The read-only Kingdom advisory range is computed server-side from stored evidence."];
      const calibrationPreview = renderCalibrationPreview();
      let primaryMatch = null;

      if (primaryFile && snapshot.primaryFile === primaryFile) {
        try {
          primaryMatch = await matchPrivateImage(treasureId, primaryFile);
          if (primaryMatch.matched && primaryMatch.media?.id) {
            sourceMediaIds.push(primaryMatch.media.id);
            const capture = captureEvidence(snapshot, primaryMatch.media.id, side.value);
            if (capture) captureQuality.push(capture);
            if (calibrationPreview.hasInput) {
              try {
                calibrationEvidence.push(createBrowserCalibrationEvidence({ sourceMediaId: primaryMatch.media.id, side: side.value, fields: calibrationFields(), cardSizeProfile: BROWSER_CARD_SIZE_PROFILES[size.value] ?? BROWSER_CARD_SIZE_PROFILES.custom }));
                limitations.push(calibrationPreview.valid ? "Physical scale calibration was appended from a same-plane known-size reference. The selected card-size profile was used only for advisory comparison." : "Physical scale calibration input was appended but is expected to fail closed until the marker/card measurements are corrected.");
              } catch (error) {
                limitations.push(`Physical scale calibration was invalid (${String(error.message ?? error).slice(0, 220)}), so no millimeter conversion was appended.`);
              }
            } else {
              limitations.push("No independent known-size marker measurements were supplied, so physical millimeter conversion remains unavailable.");
            }
            const coverage = contourCoverage(snapshot, primaryMatch.media.id, side.value);
            if (coverage) detectorCoverage.push(coverage);
            defects.push(...contourEvidence(snapshot, primaryMatch.media.id));
            limitations.push("Primary-image detector evidence was computed in this browser and linked to private Vault media only after an exact SHA-256 byte match. The server stores the evidence but did not independently recompute the image pixels.");
          } else {
            limitations.push("The analyzed primary image did not match private media on this treasure by SHA-256, so browser-computed capture, calibration, contour and detector-coverage evidence was omitted.");
          }
        } catch (error) {
          limitations.push(`Primary-image integrity linkage was unavailable (${String(error.message ?? error).slice(0, 280)}); pixel-derived primary-image findings were omitted.`);
        }
      } else if (calibrationPreview.hasInput) {
        limitations.push("Physical calibration measurements were entered but omitted because no current primary capture was available for exact Vault-media linkage.");
      }

      if (primaryMatch?.matched && primaryMatch.media?.id && companionFile && snapshot.companionFile === companionFile && snapshot.surface?.analyzed) {
        try {
          const companionMatch = await matchPrivateImage(treasureId, companionFile);
          if (companionMatch.matched && companionMatch.media?.id) {
            sourceMediaIds.push(companionMatch.media.id);
            const coverage = surfaceCoverage(snapshot, primaryMatch.media.id, companionMatch.media.id, side.value);
            if (coverage) detectorCoverage.push(coverage);
            defects.push(...surfaceEvidence(snapshot, primaryMatch.media.id, companionMatch.media.id, side.value));
          } else {
            limitations.push("The companion raking-light image did not match private media on this treasure by SHA-256, so paired surface findings and detector coverage were omitted.");
          }
        } catch (error) {
          limitations.push(`Companion-image integrity linkage was unavailable (${String(error.message ?? error).slice(0, 280)}); paired surface findings were omitted.`);
        }
      }

      const uniqueSourceMediaIds = [...new Set(sourceMediaIds)];
      const result = await api(`/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses`, {
        method: "POST",
        body: JSON.stringify({
          standardProfile: profile.value,
          cardSizeProfile: size.value,
          sourceMediaIds: uniqueSourceMediaIds,
          centering: { side: side.value, left: Number(left.value), right: Number(right.value), top: Number(top.value), bottom: Number(bottom.value), method: "manual-anchor", confidence: primaryMatch?.matched ? 0.8 : 0.65 },
          captureQuality,
          calibrationEvidence,
          detectorCoverage,
          defects,
          limitations
        })
      });
      status.textContent = `Saved advisory analysis ${result.analysis.id.slice(0, 8)}… • SHA-256 ${result.analysis.analysisSha256.slice(0, 12)}… • ${uniqueSourceMediaIds.length} linked media • ${calibrationEvidence.length} calibration record${calibrationEvidence.length === 1 ? "" : "s"}`;
      status.className = "grading-quality-summary pass";
      await loadEvidence();
    } catch (error) {
      status.textContent = error.message;
      status.className = "grading-quality-summary miss";
    } finally {
      save.disabled = !selectedTreasureId();
      save.textContent = "Save current advisory analysis";
    }
  });

  renderCalibrationPreview();
  gradingPanel.append(section);
  return Object.freeze({ panel: section, searchTreasures, loadHistory, loadEstimate, loadEvidence, renderCalibrationPreview });
}

createVaultGradingPersistenceUi();
