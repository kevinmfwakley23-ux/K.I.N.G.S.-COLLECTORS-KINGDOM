import { BROWSER_CARD_SIZE_PROFILES, BROWSER_CENTERING_PROFILES, evaluateBrowserCentering, guidePercent, measureBrowserCentering } from "./vault-grading-core.js";
import { analyzeCardContourCondition } from "./vault-grading-contour-core.js";
import { detectCardGeometry } from "./vault-grading-geometry-core.js";
import { analyzeBrowserCapturePixels, captureQualityLabel } from "./vault-grading-image-core.js";
import { compareRakingLightCaptures } from "./vault-grading-surface-core.js";

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

function signalLabel(signal) {
  return signal.type === "corner-contour-asymmetry" ? "Possible corner contour damage" : "Possible edge contour roughness";
}

function loadLocalImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be decoded by this browser."));
    };
    image.src = url;
  });
}

function sampleImage(image, maxSampleSide = 420) {
  const scale = Math.min(1, maxSampleSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(16, Math.round(image.naturalWidth * scale));
  const height = Math.max(16, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot create the pixel-analysis canvas.");
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function normalizedCardCrop(image, geometry, cardSizeProfile) {
  if (!geometry?.detected || !geometry.normalizedBounds) throw new Error("A detected card boundary is required before normalizing a surface capture.");
  const landscape = geometry.bounds.width > geometry.bounds.height;
  const ratio = cardSizeProfile.widthMm / cardSizeProfile.heightMm;
  const short = 240;
  const long = Math.round(short / ratio);
  const width = landscape ? long : short;
  const height = landscape ? short : long;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot normalize the detected card crop.");
  const bounds = geometry.normalizedBounds;
  context.drawImage(
    image,
    bounds.x * image.naturalWidth,
    bounds.y * image.naturalHeight,
    bounds.width * image.naturalWidth,
    bounds.height * image.naturalHeight,
    0,
    0,
    width,
    height
  );
  return context.getImageData(0, 0, width, height);
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
    node("p", "muted-copy", "Load a straight-on card photo for centering, image quality, geometry and contour checks. Add a second aligned raking-light photo from the opposite light direction to compare surface reflectance for possible scratches, scuffs, print lines, dents or gloss disturbances.")
  );
  copy.querySelector("h2").id = "ai-pregrade-title";
  heading.append(copy, node("span", "grading-advisory-badge", "Advisory • not an official grade"));
  panel.append(heading);

  const toolbar = node("div", "grading-toolbar");
  const fileLabel = node("label", "grading-file-label");
  fileLabel.append(node("span", "", "Primary card image"));
  const file = document.createElement("input");
  file.id = "grading-image-file";
  file.type = "file";
  file.accept = "image/jpeg,image/png,image/webp,image/avif";
  fileLabel.append(file);

  const companionLabel = node("label", "grading-file-label");
  companionLabel.append(node("span", "", "Opposite raking-light image"));
  const companionFile = document.createElement("input");
  companionFile.id = "grading-raking-companion-file";
  companionFile.type = "file";
  companionFile.accept = file.accept;
  companionLabel.append(companionFile);

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
  toolbar.append(fileLabel, companionLabel, sizeLabel, profileLabel, sideLabel);
  panel.append(toolbar);

  const workspace = node("div", "grading-workspace");
  const previewColumn = node("div", "grading-preview-column");
  const preview = node("div", "grading-image-stage");
  const empty = node("div", "grading-image-empty", "Choose a straight-on card photo. Put the unsleeved card on a solid contrasting matte background, keep all four card edges visible, use diffuse light, and minimize perspective.");
  const image = document.createElement("img");
  image.alt = "Card preview for AI pre-grade measurement";
  image.hidden = true;
  const detectedBoundary = node("span", "grading-card-boundary");
  detectedBoundary.hidden = true;
  const surfaceOverlay = node("span", "grading-surface-overlay");
  const guideLeft = node("span", "grading-guide grading-guide-vertical guide-left");
  const guideRight = node("span", "grading-guide grading-guide-vertical guide-right");
  const guideTop = node("span", "grading-guide grading-guide-horizontal guide-top");
  const guideBottom = node("span", "grading-guide grading-guide-horizontal guide-bottom");
  preview.append(empty, image, detectedBoundary, surfaceOverlay, guideLeft, guideRight, guideTop, guideBottom);
  const imageStatus = node("p", "muted-copy grading-image-status", "No image loaded. Centering measurements still work as a manual calculator.");

  const qualityPanel = node("section", "grading-quality-panel");
  qualityPanel.append(node("h3", "", "Capture-quality & card-geometry analysis"));
  const qualitySummary = node("p", "grading-quality-summary", "Not analyzed");
  const qualityMetrics = node("div", "grading-quality-metrics");
  const qualityWarnings = node("ul", "grading-quality-warnings");
  qualityPanel.append(qualitySummary, qualityMetrics, qualityWarnings);

  const contourPanel = node("section", "grading-quality-panel grading-contour-panel");
  contourPanel.append(node("h3", "", "Corner & edge silhouette signals"));
  const contourSummary = node("p", "grading-quality-summary", "Not analyzed");
  const contourSignals = node("div", "grading-contour-signals");
  const contourLimitations = node("ul", "grading-quality-warnings");
  contourPanel.append(contourSummary, contourSignals, contourLimitations);

  const surfacePanel = node("section", "grading-quality-panel grading-surface-panel");
  surfacePanel.append(node("h3", "", "Paired raking-light surface signals"));
  const surfaceSummary = node("p", "grading-quality-summary", "Add an opposite raking-light capture to compare surface reflectance.");
  const surfaceSignals = node("div", "grading-contour-signals");
  const surfaceLimitations = node("ul", "grading-quality-warnings");
  surfacePanel.append(surfaceSummary, surfaceSignals, surfaceLimitations);
  previewColumn.append(preview, imageStatus, qualityPanel, contourPanel, surfacePanel);

  const controls = node("div", "grading-controls");
  controls.append(node("h3", "", "Inner-border guide distances"), node("p", "muted-copy", "Enter each visible border as a percentage of the card image width/height. Red guides mark the printed inner frame/art boundary; the gold rectangle is the detected outer card edge. Borderless/asymmetric cards require issue-specific references."));
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
    "Straight-on front and back on a contrasting matte background for card geometry, centering, color and print registration.",
    "Four high-resolution corner views for whitening, rounding, dings, bends and layering.",
    "Edge/macro views for chipping, notches, roughness and possible trimming signals.",
    "Two aligned raking-light surface views from opposite directions for scratches, scuffs, dents, print lines, gloss loss and creases.",
    "Autograph close-up when present; signature comparison must retain sourced reference exemplars and cannot claim professional authentication."
  ]) list.append(node("li", "", item));
  capture.append(list, node("p", "muted-copy", "Capture-quality, card geometry, physical contour, and paired raking-light reflectance analysis are live. Surface signals are possible anomalies, never confirmed scratches from image comparison alone. Printed whitening/color-reference comparison and sourced autograph retrieval remain separate detectors and are not represented as completed here."));
  panel.append(capture);

  importPanel.before(panel);
  let objectUrl = null;
  let companionUrl = null;
  let companionImage = null;
  let mainGeometry = null;
  let mainSamplePixels = null;

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
    if (!evaluations.length) thresholdList.append(node("p", "muted-copy", profile.value === "neutral" ? "Neutral mode reports measurements without third-party grade mapping." : "No published threshold from this reference profile is encoded for the selected side."));
    else for (const evaluation of evaluations) {
      const row = node("div", `grading-threshold ${evaluation.passes ? "pass" : "miss"}`);
      row.append(node("span", "", evaluation.label), node("strong", "", evaluation.passes ? "meets centering threshold" : "does not meet centering threshold"));
      thresholdList.append(row);
    }
  }

  function renderQuality(result, geometry) {
    const combinedPass = result.automaticChecksPass && geometry?.detected && geometry.usableForCentering;
    qualitySummary.textContent = combinedPass ? "Photo quality and card geometry pass the current automatic checks" : `${captureQualityLabel(result)}${geometry?.detected ? " • card geometry review needed" : " • card edge detection unavailable"}`;
    qualitySummary.className = `grading-quality-summary ${combinedPass ? "pass" : "miss"}`;
    const rows = [
      metricRow("Resolution", `${result.sourceWidth} × ${result.sourceHeight} • ${result.megapixels} MP`, result.resolutionAdequate ? "pass" : "miss"),
      metricRow("Sharpness", `gradient ${result.meanGradient}`, result.focusAdequate ? "pass" : "miss"),
      metricRow("Glare/clipping risk", formatPercent(result.glareRiskFraction), result.glareAcceptable ? "pass" : "miss"),
      metricRow("Exposure", `mean ${result.meanLuminance}`, result.exposureAcceptable ? "pass" : "miss"),
      metricRow("Contrast", `σ ${result.contrastStdDev}`, result.contrastAdequate ? "pass" : "miss")
    ];
    if (geometry?.detected) {
      rows.push(
        metricRow("Card-edge detection", `confidence ${Math.round(geometry.confidence * 100)}%`, geometry.confidence >= 0.65 ? "pass" : "miss"),
        metricRow("Whole-card crop", geometry.cropComplete ? "all four edges inside frame" : "incomplete / too close to frame", geometry.cropComplete ? "pass" : "miss"),
        metricRow("Perspective", geometry.perspectiveAcceptable ? `within tolerance • width Δ ${formatPercent(geometry.widthVariation)}` : `retake straight-on • width Δ ${formatPercent(geometry.widthVariation)}`, geometry.perspectiveAcceptable ? "pass" : "miss"),
        metricRow("Card aspect ratio", geometry.aspectRatioAcceptable ? `matches selected profile • deviation ${formatPercent(geometry.aspectRatioDeviation)}` : `profile mismatch • deviation ${formatPercent(geometry.aspectRatioDeviation)}`, geometry.aspectRatioAcceptable ? "pass" : "miss")
      );
      detectedBoundary.hidden = false;
      detectedBoundary.style.left = `${geometry.normalizedBounds.x * 100}%`;
      detectedBoundary.style.top = `${geometry.normalizedBounds.y * 100}%`;
      detectedBoundary.style.width = `${geometry.normalizedBounds.width * 100}%`;
      detectedBoundary.style.height = `${geometry.normalizedBounds.height * 100}%`;
    } else {
      rows.push(metricRow("Card geometry", geometry?.reason ?? "Select a standard/Japanese card-size profile to enable automatic geometry validation.", "pending"));
      detectedBoundary.hidden = true;
    }
    qualityMetrics.replaceChildren(...rows);
    qualityWarnings.replaceChildren(...[...result.warnings, ...(geometry?.warnings ?? []), ...(geometry?.detected ? [] : [geometry?.reason].filter(Boolean))].map((warning) => node("li", "", warning)));
  }

  function renderContour(result) {
    contourSignals.replaceChildren();
    contourLimitations.replaceChildren();
    if (!result?.analyzed) {
      contourSummary.textContent = result?.reason ?? "Card contour not analyzed.";
      contourSummary.className = "grading-quality-summary miss";
      return;
    }
    if (!result.usable) {
      contourSummary.textContent = "Contour produced, but capture geometry is not reliable enough for condition conclusions.";
      contourSummary.className = "grading-quality-summary miss";
    } else if (!result.signals.length) {
      contourSummary.textContent = "No asymmetric physical-corner or edge-roughness signals detected at this resolution.";
      contourSummary.className = "grading-quality-summary pass";
    } else {
      contourSummary.textContent = `${result.signals.length} possible physical contour issue${result.signals.length === 1 ? "" : "s"} need closer review.`;
      contourSummary.className = "grading-quality-summary miss";
      for (const signal of result.signals) {
        const card = node("article", "grading-contour-signal");
        card.append(node("strong", "", `${signalLabel(signal)} • ${signal.region}`), node("span", "", `severity ${Math.round(signal.severity * 100)}% • confidence ${Math.round(signal.confidence * 100)}%`), node("p", "muted-copy", signal.note));
        contourSignals.append(card);
      }
    }
    contourLimitations.replaceChildren(...result.limitations.map((limitation) => node("li", "", limitation)));
  }

  function renderSurface(result) {
    surfaceSignals.replaceChildren();
    surfaceLimitations.replaceChildren();
    surfaceOverlay.replaceChildren();
    if (!result) {
      surfaceSummary.textContent = "Add an opposite raking-light capture to compare surface reflectance.";
      surfaceSummary.className = "grading-quality-summary";
      return;
    }
    if (!result.signals.length) {
      surfaceSummary.textContent = "No strong localized/linear reflectance anomalies were isolated between the paired captures.";
      surfaceSummary.className = "grading-quality-summary pass";
    } else {
      surfaceSummary.textContent = `${result.signals.length} possible surface reflectance anomal${result.signals.length === 1 ? "y" : "ies"} need magnified review.`;
      surfaceSummary.className = "grading-quality-summary miss";
      for (const signal of result.signals) {
        const card = node("article", "grading-contour-signal");
        card.append(node("strong", "", `Possible ${signal.shape} surface anomaly`), node("span", "", `severity ${Math.round(signal.severity * 100)}% • confidence ${Math.round(signal.confidence * 100)}%`), node("p", "muted-copy", signal.note));
        surfaceSignals.append(card);
        if (mainGeometry?.detected) {
          const box = node("span", "grading-surface-box");
          const bounds = mainGeometry.normalizedBounds;
          box.style.left = `${(bounds.x + signal.boundingBox.x * bounds.width) * 100}%`;
          box.style.top = `${(bounds.y + signal.boundingBox.y * bounds.height) * 100}%`;
          box.style.width = `${signal.boundingBox.width * bounds.width * 100}%`;
          box.style.height = `${signal.boundingBox.height * bounds.height * 100}%`;
          surfaceOverlay.append(box);
        }
      }
    }
    surfaceLimitations.replaceChildren(...result.limitations.map((limitation) => node("li", "", limitation)));
  }

  async function analyzeSurfacePair() {
    renderSurface(null);
    if (!companionImage || !mainGeometry?.usableForCentering) return;
    const sizeProfile = BROWSER_CARD_SIZE_PROFILES[size.value];
    if (!sizeProfile?.widthMm || !sizeProfile?.heightMm) return;
    const companionSample = sampleImage(companionImage);
    const companionGeometry = detectCardGeometry({ width: companionSample.width, height: companionSample.height, data: companionSample.data, expectedWidthMm: sizeProfile.widthMm, expectedHeightMm: sizeProfile.heightMm });
    if (!companionGeometry.usableForCentering) {
      surfaceSummary.textContent = "The companion raking-light image does not have reliable whole-card geometry. Retake it straight-on on the same contrasting background.";
      surfaceSummary.className = "grading-quality-summary miss";
      return;
    }
    const mainCrop = normalizedCardCrop(image, mainGeometry, sizeProfile);
    const companionCrop = normalizedCardCrop(companionImage, companionGeometry, sizeProfile);
    if (mainCrop.width !== companionCrop.width || mainCrop.height !== companionCrop.height) {
      surfaceSummary.textContent = "Primary and companion card orientation do not match. Retake both captures without rotating the card/camera.";
      surfaceSummary.className = "grading-quality-summary miss";
      return;
    }
    renderSurface(compareRakingLightCaptures({ width: mainCrop.width, height: mainCrop.height, dataA: mainCrop.data, dataB: companionCrop.data }));
  }

  async function analyzeLoadedImage() {
    mainSamplePixels = sampleImage(image);
    const quality = analyzeBrowserCapturePixels({ width: mainSamplePixels.width, height: mainSamplePixels.height, data: mainSamplePixels.data, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight });
    const sizeProfile = BROWSER_CARD_SIZE_PROFILES[size.value];
    mainGeometry = sizeProfile?.widthMm && sizeProfile?.heightMm ? detectCardGeometry({ width: mainSamplePixels.width, height: mainSamplePixels.height, data: mainSamplePixels.data, expectedWidthMm: sizeProfile.widthMm, expectedHeightMm: sizeProfile.heightMm }) : null;
    const contour = mainGeometry?.detected ? analyzeCardContourCondition({ width: mainSamplePixels.width, height: mainSamplePixels.height, data: mainSamplePixels.data, geometry: mainGeometry }) : null;
    renderQuality(quality, mainGeometry);
    renderContour(contour);
    imageStatus.textContent = mainGeometry?.detected ? `${image.naturalWidth} × ${image.naturalHeight} analyzed locally. ${mainGeometry.usableForCentering ? "Geometry is usable for centering and contour review." : "Retake or correct the capture before trusting measurements."}` : `${image.naturalWidth} × ${image.naturalHeight} analyzed locally. ${quality.readinessReason}`;
    await analyzeSurfacePair();
  }

  for (const input of [left.input, right.input, top.input, bottom.input, profile, side]) input.addEventListener("input", () => {
    try { renderCentering(); } catch (error) { imageStatus.textContent = error.message; }
  });
  size.addEventListener("change", () => {
    if (!image.hidden && image.complete) analyzeLoadedImage().catch((error) => { imageStatus.textContent = error.message; });
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
      preview.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
      preview.style.minHeight = "0";
      try { await analyzeLoadedImage(); }
      catch (error) { imageStatus.textContent = `Image loaded, but local analysis failed: ${error.message}`; }
    };
    image.src = objectUrl;
  });

  companionFile.addEventListener("change", async () => {
    const selected = companionFile.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      surfaceSummary.textContent = "Choose a supported image for the raking-light companion capture.";
      surfaceSummary.className = "grading-quality-summary miss";
      return;
    }
    if (companionUrl) URL.revokeObjectURL(companionUrl);
    try {
      const loaded = await loadLocalImage(selected);
      companionImage = loaded.image;
      companionUrl = loaded.url;
      await analyzeSurfacePair();
    } catch (error) {
      surfaceSummary.textContent = error.message;
      surfaceSummary.className = "grading-quality-summary miss";
    }
  });

  renderCentering();
  return Object.freeze({ render: renderCentering });
}

createVaultGradingUi();
