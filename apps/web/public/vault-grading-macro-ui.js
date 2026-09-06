import { analyzeMacroCornerEdgeCapture, MACRO_CORNER_EDGE_REGIONS } from "./vault-grading-macro-core.js";

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
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not complete the macro evidence request.");
  return body;
}

async function sha256File(file) {
  if (!(file instanceof File)) throw new Error("A browser File is required for macro media integrity matching.");
  if (!globalThis.crypto?.subtle) throw new Error("This browser does not provide WebCrypto SHA-256 support.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function matchPrivateImage(treasureId, file) {
  const digest = await sha256File(file);
  return api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/media-match?sha256=${digest}`);
}

function loadLocalImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected macro image could not be decoded by this browser."));
    };
    image.src = url;
  });
}

function sampleImage(image, maxSampleSide = 900) {
  const scale = Math.min(1, maxSampleSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(48, Math.round(image.naturalWidth * scale));
  const height = Math.max(48, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot create the macro pixel-analysis canvas.");
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function regionLabel(region) {
  return region.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function defectType(signal) {
  if (signal.type === "macro-corner-contour-anomaly") return "corner-macro-contour-anomaly";
  if (signal.type === "macro-edge-contour-anomaly") return "edge-macro-contour-anomaly";
  if (signal.type === "corner-border-tone-anomaly") return "corner-border-tone-anomaly";
  return "edge-border-tone-anomaly";
}

function signalLabel(signal) {
  if (signal.type === "macro-corner-contour-anomaly") return "Possible macro corner contour anomaly";
  if (signal.type === "macro-edge-contour-anomaly") return "Possible macro edge contour anomaly";
  return "Possible local border-tone anomaly";
}

export function createVaultGradingMacroUi() {
  const gradingPanel = document.querySelector("#ai-pregrade-panel");
  const persistencePanel = document.querySelector("#grading-persistence-panel");
  const treasureSelect = document.querySelector("#grading-pregrade-treasure");
  const sideSelect = document.querySelector("#grading-card-side");
  const profileSelect = document.querySelector("#grading-standard-profile");
  const sizeSelect = document.querySelector("#grading-card-size");
  if (!gradingPanel || !persistencePanel || !treasureSelect || !sideSelect || !profileSelect || !sizeSelect || document.querySelector("#grading-macro-panel")) return null;

  const panel = node("section", "grading-quality-panel grading-macro-panel");
  panel.id = "grading-macro-panel";
  panel.append(
    node("h3", "", "Macro corner & edge evidence"),
    node("p", "muted-copy", "Add one dedicated high-resolution corner or edge capture with a narrow strip of matte contrasting background visible outside the physical card. The Kingdom reviews magnified contour and, only when a stable local border reference exists, possible lighter-tone anomalies. It never confirms whitening, trimming, authenticity, or an official grade from this image alone.")
  );

  const toolbar = node("div", "grading-toolbar");
  const fileLabel = node("label", "grading-file-label");
  fileLabel.append(node("span", "", "Macro image"));
  const fileInput = document.createElement("input");
  fileInput.id = "grading-macro-file";
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp,image/avif";
  fileLabel.append(fileInput);

  const regionLabelNode = node("label", "");
  regionLabelNode.append(node("span", "", "Captured region"));
  const regionSelect = document.createElement("select");
  regionSelect.id = "grading-macro-region";
  for (const region of MACRO_CORNER_EDGE_REGIONS) {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = regionLabel(region);
    regionSelect.append(option);
  }
  regionLabelNode.append(regionSelect);
  toolbar.append(fileLabel, regionLabelNode);
  panel.append(toolbar);

  const workspace = node("div", "grading-workspace");
  const previewColumn = node("div", "grading-preview-column");
  const preview = node("div", "grading-image-stage grading-macro-stage");
  const empty = node("div", "grading-image-empty", "Choose a dedicated macro capture. Keep the selected physical edge visible against a matte contrasting background; avoid sleeves, glare and digital sharpening filters.");
  const previewImage = document.createElement("img");
  previewImage.alt = "Macro corner or edge preview for advisory condition analysis";
  previewImage.hidden = true;
  preview.append(empty, previewImage);
  previewColumn.append(preview);

  const resultColumn = node("div", "grading-controls");
  const summary = node("p", "grading-quality-summary", "No macro image analyzed.");
  const metrics = node("div", "grading-quality-metrics");
  const signals = node("div", "grading-contour-signals");
  const warnings = node("ul", "grading-quality-warnings");
  resultColumn.append(summary, metrics, signals, warnings);
  workspace.append(previewColumn, resultColumn);
  panel.append(workspace);

  const actionRow = node("div", "grading-persistence-actions");
  const saveButton = node("button", "gold-button", "Append macro advisory evidence");
  saveButton.type = "button";
  saveButton.disabled = true;
  const saveStatus = node("p", "muted-copy", "Select a Vault treasure above and analyze a usable macro capture. The exact image must already exist as private media on that treasure so SHA-256 linkage can be verified.");
  actionRow.append(saveButton);
  panel.append(actionRow, saveStatus);
  persistencePanel.after(panel);

  let objectUrl = null;
  let loadedImage = null;
  let analyzedFile = null;
  let currentResult = null;

  function updateSaveState() {
    saveButton.disabled = !(currentResult?.usable && analyzedFile && treasureSelect.value);
  }

  function renderResult(result) {
    currentResult = result;
    signals.replaceChildren();
    warnings.replaceChildren();
    metrics.replaceChildren();
    if (!result) {
      summary.textContent = "No macro image analyzed.";
      summary.className = "grading-quality-summary";
      updateSaveState();
      return;
    }
    summary.textContent = result.usable
      ? (result.signals.length ? `${result.signals.length} macro review candidate${result.signals.length === 1 ? "" : "s"} isolated.` : "Macro capture passed the evidence gate with no review candidate isolated.")
      : "Macro capture analyzed but failed the condition-evidence gate. Retake before saving.";
    summary.className = `grading-quality-summary ${result.usable ? (result.signals.length ? "miss" : "pass") : "miss"}`;
    const quality = result.captureQuality;
    metrics.append(
      node("div", `grading-quality-row ${quality.resolutionAdequate ? "pass" : "miss"}`, `Native source • ${result.sourceWidth} × ${result.sourceHeight} • ${quality.sourceMegapixels} MP`),
      node("div", `grading-quality-row ${quality.contrastAdequate ? "pass" : "miss"}`, `Physical edge/background contrast • ${quality.meanForegroundContrast}`),
      node("div", `grading-quality-row ${quality.boundaryCoverageAdequate ? "pass" : "miss"}`, `Boundary coverage • ${quality.boundaryCoverageAdequate ? "usable" : "insufficient"}`),
      node("div", `grading-quality-row ${result.toneReference.available ? "pass" : "pending"}`, `Local tone reference • ${result.toneReference.available ? "stable enough for anomaly review" : "unavailable / fail-closed"}`)
    );
    for (const signal of result.signals) {
      const card = node("article", "grading-contour-signal");
      card.append(
        node("strong", "", `${signalLabel(signal)} • ${regionLabel(signal.region)}`),
        node("span", "", `severity ${Math.round(signal.severity * 100)}% • confidence ${Math.round(signal.confidence * 100)}%`),
        node("p", "muted-copy", signal.note)
      );
      signals.append(card);
    }
    const combinedWarnings = [...result.warnings, ...result.limitations];
    warnings.replaceChildren(...combinedWarnings.map((warning) => node("li", "", warning)));
    updateSaveState();
  }

  async function analyzeLoadedMacro() {
    if (!loadedImage || !analyzedFile) return;
    const pixels = sampleImage(loadedImage);
    const result = analyzeMacroCornerEdgeCapture({
      width: pixels.width,
      height: pixels.height,
      data: pixels.data,
      sourceWidth: loadedImage.naturalWidth,
      sourceHeight: loadedImage.naturalHeight,
      region: regionSelect.value
    });
    renderResult(result);
  }

  fileInput.addEventListener("change", async () => {
    const selected = fileInput.files?.[0] ?? null;
    analyzedFile = selected;
    loadedImage = null;
    renderResult(null);
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      summary.textContent = "Choose a supported image file.";
      summary.className = "grading-quality-summary miss";
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    try {
      const loaded = await loadLocalImage(selected);
      loadedImage = loaded.image;
      objectUrl = loaded.url;
      previewImage.src = objectUrl;
      previewImage.hidden = false;
      empty.hidden = true;
      preview.style.aspectRatio = `${loadedImage.naturalWidth} / ${loadedImage.naturalHeight}`;
      preview.style.minHeight = "0";
      await analyzeLoadedMacro();
    } catch (error) {
      renderResult(null);
      summary.textContent = error.message;
      summary.className = "grading-quality-summary miss";
    }
  });

  regionSelect.addEventListener("change", () => {
    if (loadedImage && analyzedFile) analyzeLoadedMacro().catch((error) => {
      renderResult(null);
      summary.textContent = error.message;
      summary.className = "grading-quality-summary miss";
    });
  });
  treasureSelect.addEventListener("change", updateSaveState);

  saveButton.addEventListener("click", async () => {
    const treasureId = treasureSelect.value;
    const selected = fileInput.files?.[0] ?? null;
    if (!treasureId || !selected || selected !== analyzedFile || !currentResult?.usable) return;
    saveButton.disabled = true;
    saveButton.textContent = "Verifying and appending…";
    try {
      const match = await matchPrivateImage(treasureId, selected);
      if (!match.matched || !match.media?.id) throw new Error("This exact macro image is not stored as private media on the selected treasure. Upload it to that Vault treasure first, then append the evidence.");
      const sourceMediaId = match.media.id;
      const defects = currentResult.signals.map((signal) => ({
        type: defectType(signal),
        region: `${sideSelect.value}-${signal.region}`,
        severity: signal.severity,
        confidence: signal.confidence,
        sourceMediaId,
        boundingBox: signal.boundingBox ?? null,
        note: signal.note
      }));
      const detectorCoverage = [{
        detector: "macro-corner-edge",
        side: sideSelect.value,
        region: currentResult.region,
        sourceMediaIds: [sourceMediaId],
        completed: true,
        usableForConditionInference: true,
        reviewCandidateCount: defects.length,
        method: currentResult.method,
        note: `Dedicated ${currentResult.region} macro capture completed. Tone review ${currentResult.toneReference.available ? "used a stable local reference" : "failed closed because a stable local reference was unavailable"}.`
      }];
      const result = await api(`/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses`, {
        method: "POST",
        body: JSON.stringify({
          standardProfile: profileSelect.value,
          cardSizeProfile: sizeSelect.value,
          sourceMediaIds: [sourceMediaId],
          detectorCoverage,
          defects,
          limitations: [
            `Dedicated ${currentResult.region} macro evidence appended after exact SHA-256 private-media linkage.`,
            currentResult.toneReference.reason,
            "Macro contour and border-tone candidates are advisory review evidence. They do not confirm whitening, trimming, authenticity, condition, value, or an official grade."
          ]
        })
      });
      saveStatus.textContent = `Macro evidence appended • analysis ${result.analysis.id.slice(0, 8)}… • SHA-256 ${result.analysis.analysisSha256.slice(0, 12)}… • ${defects.length} review candidate${defects.length === 1 ? "" : "s"}.`;
      saveStatus.className = "grading-quality-summary pass";
      const refresh = [...persistencePanel.querySelectorAll("button")].find((button) => button.textContent?.includes("Refresh saved history"));
      if (refresh && !refresh.disabled) refresh.click();
    } catch (error) {
      saveStatus.textContent = error.message;
      saveStatus.className = "grading-quality-summary miss";
    } finally {
      saveButton.textContent = "Append macro advisory evidence";
      updateSaveState();
    }
  });

  updateSaveState();
  return Object.freeze({ panel, analyzeLoadedMacro });
}

createVaultGradingMacroUi();
