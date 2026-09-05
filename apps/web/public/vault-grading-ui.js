import { BROWSER_CARD_SIZE_PROFILES, BROWSER_CENTERING_PROFILES, evaluateBrowserCentering, guidePercent, measureBrowserCentering } from "./vault-grading-core.js";
import { analyzeBrowserCapturePixels, captureQualityLabel } from "./vault-grading-image-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-grading.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-grading.css";
  document.head.append(link);
}

function makeSelect(id, options) {
  const select = document.createElement("select");
  select.id = id;
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  return select;
}

function makeBorderInput(id, label, value) {
  const wrapper = node("label", "grading-border-control");
  wrapper.append(node("span", "", label));
  const input = document.createElement("input");
  input.id = id;
  input.type = "number";
  input.min = "0.1";
  input.max = "45";
  input.step = "0.1";
  input.value = String(value);
  input.inputMode = "decimal";
  wrapper.append(input);
  return { wrapper, input };
}

function metricRow(label, value, state = null) {
  const row = node("div", `grading-quality-row${state ? ` ${state}` : ""}`);
  row.append(node("span", "", label), node("strong", "", value));
  return row;
}

function formatPercent(value) {
  return `${Math.round(Number(value) * 1000) / 10}%`;
}

export function createVaultGradingUi() {
  const mainColumn = document.querySelector(".vault-main-column");
  const importPanel = document.querySelector(".import-panel");
  if (!mainColumn || !importPanel || document.querySelector("#ai-pregrade-panel")) return null;
  ensureStylesheet();

  const panel = node("section", "marble-panel grading-panel");
  panel.id = "ai-pregrade-panel";
  panel.setAttribute("aria-labelledby", "ai-pregrade-title");

  const heading = node("div", "section-heading grading-heading");
  const copy = node("div", "");
  copy.append(
    node("p", "eyebrow", "AI Pre-Grade Lab"),
    node("h2", "", "Measure first. Estimate second. Never fake an official grade."),
    node("p", "muted-copy", "Load a straight-on card photo, align the four inner-border guides, and compare measured centering against published reference thresholds. The image is also inspected locally for resolution, focus, glare, exposure and contrast before later defect detectors are allowed to trust it.")
  );
  copy.querySelector("h2").id = "ai-pregrade-title";
  heading.append(copy, node("span", "grading-advisory-badge", "Advisory • not an official grade"));
  panel.append(heading);

  const toolbar = node("div", "grading-toolbar");
  const fileLabel = node("label", "grading-file-label");
  fileLabel.append(node("span", "", "Card image (local analysis)"));
  const file = document.createElement("input");
  file.id = "grading-image-file";
  file.type = "file";
  file.accept = "image/jpeg,image/png,image/webp,image/avif";
  fileLabel.append(file);

  const sizeLabel = node("label", "");
  sizeLabel.append(node("span", "", "Card size profile"));
  const size = makeSelect("grading-card-size", Object.values(BROWSER_CARD_SIZE_PROFILES).map((entry) => [entry.id, entry.label]));
  sizeLabel.append(size);

  const profileLabel = node("label", "");
  profileLabel.append(node("span", "", "Reference profile"));
  const profile = makeSelect("grading-standard-profile", Object.values(BROWSER_CENTERING_PROFILES).map((entry) => [entry.id, entry.label]));
  profileLabel.append(profile);

  const sideLabel = node("label", "");
  sideLabel.append(node("span", "", "Card side"));
  const side = makeSelect("grading-card-side", [["front", "Front"], ["back", "Back"]]);
  sideLabel.append(side);
  toolbar.append(fileLabel, sizeLabel, profileLabel, sideLabel);
  panel.append(toolbar);

  const workspace = node("div", "grading-workspace");
  const previewColumn = node("div", "grading-preview-column");
  const preview = node("div", "grading-image-stage");
  const empty = node("div", "grading-image-empty", "Choose a straight-on card photo. Keep the full card edge visible, avoid sleeves/toploaders when possible, use diffuse light, and minimize perspective.");
  const image = document.createElement("img");
  image.alt = "Card preview for centering measurement";
  image.hidden = true;
  const guideLeft = node("span", "grading-guide grading-guide-vertical guide-left");
  const guideRight = node("span", "grading-guide grading-guide-vertical guide-right");
  const guideTop = node("span", "grading-guide grading-guide-horizontal guide-top");
  const guideBottom = node("span", "grading-guide grading-guide-horizontal guide-bottom");
  preview.append(empty, image, guideLeft, guideRight, guideTop, guideBottom);
  const imageStatus = node("p", "muted-copy grading-image-status", "No image loaded. Centering measurements still work as a manual calculator.");

  const qualityPanel = node("section", "grading-quality-panel");
  qualityPanel.append(node("h3", "", "Capture-quality analysis"));
  const qualitySummary = node("p", "grading-quality-summary", "Not analyzed");
  const qualityMetrics = node("div", "grading-quality-metrics");
  const qualityWarnings = node("ul", "grading-quality-warnings");
  qualityPanel.append(qualitySummary, qualityMetrics, qualityWarnings);
  previewColumn.append(preview, imageStatus, qualityPanel);

  const controls = node("div", "grading-controls");
  controls.append(node("h3", "", "Inner-border guide distances"), node("p", "muted-copy", "Enter each visible border as a percentage of the card image width/height. The red guides mark the printed inner frame/art boundary. For borderless or asymmetric cards, use an issue-specific reference before interpreting centering."));
  const left = makeBorderInput("grading-border-left", "Left %", 8);
  const right = makeBorderInput("grading-border-right", "Right %", 8);
  const top = makeBorderInput("grading-border-top", "Top %", 8);
  const bottom = makeBorderInput("grading-border-bottom", "Bottom %", 8);
  const grid = node("div", "grading-border-grid");
  grid.append(left.wrapper, right.wrapper, top.wrapper, bottom.wrapper);
  controls.append(grid);

  const results = node("div", "grading-results");
  const horizontal = node("strong", "grading-ratio", "50/50");
  const vertical = node("strong", "grading-ratio", "50/50");
  const horizontalRow = node("div", "grading-result-row");
  horizontalRow.append(node("span", "", "Horizontal"), horizontal);
  const verticalRow = node("div", "grading-result-row");
  verticalRow.append(node("span", "", "Vertical"), vertical);
  const thresholdList = node("div", "grading-threshold-list");
  results.append(horizontalRow, verticalRow, thresholdList, node("p", "muted-copy", "Centering is only one grading dimension. Meeting a published centering threshold does not mean the card earns that overall grade."));
  controls.append(results);
  workspace.append(previewColumn, controls);
  panel.append(workspace);

  const capture = node("aside", "grading-capture-plan");
  capture.append(node("h3", "", "Full AI pre-grade capture pack"));
  const list = document.createElement("ul");
  for (const item of [
    "Straight-on front and back for dimensions, centering, color and print registration.",
    "Four high-resolution corner views for whitening, rounding, dings, bends and layering.",
    "Edge/macro views for chipping, notches, roughness and possible trimming signals.",
    "Raking-light surface views from multiple directions for scratches, scuffs, dents, print lines, gloss loss and creases.",
    "Autograph close-up when present; signature comparison must retain sourced reference exemplars and cannot claim professional authentication."
  ]) list.append(node("li", "", item));
  capture.append(list, node("p", "muted-copy", "Capture-quality analysis is live. Corner/edge/surface/color/autograph evidence contracts are live. Automatic defect localization, perspective/card-edge detection, color-reference comparison and sourced autograph retrieval remain separate detectors and are not represented as completed here."));
  panel.append(capture);

  importPanel.before(panel);
  let objectUrl = null;

  function renderCentering() {
    const measurement = measureBrowserCentering({ left: left.input.value, right: right.input.value, top: top.input.value, bottom: bottom.input.value });
    horizontal.textContent = measurement.horizontal.label;
    vertical.textContent = measurement.vertical.label;
    guideLeft.style.left = `${guidePercent(left.input.value)}%`;
    guideRight.style.right = `${guidePercent(right.input.value)}%`;
    guideTop.style.top = `${guidePercent(top.input.value)}%`;
    guideBottom.style.bottom = `${guidePercent(bottom.input.value)}%`;
    thresholdList.replaceChildren();
    const evaluations = evaluateBrowserCentering(measurement, { profileId: profile.value, side: side.value });
    if (!evaluations.length) {
      thresholdList.append(node("p", "muted-copy", profile.value === "neutral" ? "Neutral mode reports measurements without third-party grade mapping." : "No published threshold from this reference profile is encoded for the selected side."));
    } else {
      for (const evaluation of evaluations) {
        const row = node("div", `grading-threshold ${evaluation.passes ? "pass" : "miss"}`);
        row.append(node("span", "", evaluation.label), node("strong", "", evaluation.passes ? "meets centering threshold" : "does not meet centering threshold"));
        thresholdList.append(row);
      }
    }
  }

  function renderQuality(result) {
    qualitySummary.textContent = captureQualityLabel(result);
    qualitySummary.className = `grading-quality-summary ${result.automaticChecksPass ? "pass" : "miss"}`;
    qualityMetrics.replaceChildren(
      metricRow("Resolution", `${result.sourceWidth} × ${result.sourceHeight} • ${result.megapixels} MP`, result.resolutionAdequate ? "pass" : "miss"),
      metricRow("Sharpness", `gradient ${result.meanGradient}`, result.focusAdequate ? "pass" : "miss"),
      metricRow("Glare/clipping risk", formatPercent(result.glareRiskFraction), result.glareAcceptable ? "pass" : "miss"),
      metricRow("Exposure", `mean ${result.meanLuminance}`, result.exposureAcceptable ? "pass" : "miss"),
      metricRow("Contrast", `σ ${result.contrastStdDev}`, result.contrastAdequate ? "pass" : "miss"),
      metricRow("Crop / perspective", "manual confirmation required", "pending")
    );
    qualityWarnings.replaceChildren(...result.warnings.map((warning) => node("li", "", warning)));
  }

  async function analyzeLoadedImage() {
    const maxSampleSide = 420;
    const scale = Math.min(1, maxSampleSide / Math.max(image.naturalWidth, image.naturalHeight));
    const sampleWidth = Math.max(16, Math.round(image.naturalWidth * scale));
    const sampleHeight = Math.max(16, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot create the pixel-analysis canvas.");
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight);
    const quality = analyzeBrowserCapturePixels({
      width: pixels.width,
      height: pixels.height,
      data: pixels.data,
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight
    });
    renderQuality(quality);
    imageStatus.textContent = `${image.naturalWidth} × ${image.naturalHeight} local image analyzed. ${quality.readinessReason}`;
  }

  for (const input of [left.input, right.input, top.input, bottom.input, profile, side]) input.addEventListener("input", () => {
    try { renderCentering(); } catch (error) { imageStatus.textContent = error.message; }
  });

  file.addEventListener("change", () => {
    const selected = file.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      imageStatus.textContent = "Choose a supported image file.";
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(selected);
    image.onload = async () => {
      empty.hidden = true;
      image.hidden = false;
      try {
        await analyzeLoadedImage();
      } catch (error) {
        imageStatus.textContent = `Image loaded, but local quality analysis failed: ${error.message}`;
      }
    };
    image.src = objectUrl;
  });

  renderCentering();
  return Object.freeze({ render: renderCentering });
}

createVaultGradingUi();
