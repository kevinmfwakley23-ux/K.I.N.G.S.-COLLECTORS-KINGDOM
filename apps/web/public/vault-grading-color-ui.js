import { compareCardColorToReference } from "./vault-grading-color-core.js";
import { BROWSER_CARD_SIZE_PROFILES } from "./vault-grading-core.js";
import { detectCardGeometry } from "./vault-grading-geometry-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function loadLocalImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The selected color-reference image could not be decoded.")); };
    image.src = url;
  });
}

function sampleImage(image, maxSampleSide = 420) {
  const scale = Math.min(1, maxSampleSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(16, Math.round(image.naturalWidth * scale));
  const height = Math.max(16, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot create the color-analysis canvas.");
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function normalizedCardCrop(image, geometry, profile) {
  if (!geometry?.usableForCentering) throw new Error("Both color images need reliable whole-card geometry before comparison.");
  const landscape = geometry.bounds.width > geometry.bounds.height;
  const ratio = profile.widthMm / profile.heightMm;
  const short = 240;
  const long = Math.round(short / ratio);
  const width = landscape ? long : short;
  const height = landscape ? short : long;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot normalize the card color crop.");
  const bounds = geometry.normalizedBounds;
  context.drawImage(image, bounds.x * image.naturalWidth, bounds.y * image.naturalHeight, bounds.width * image.naturalWidth, bounds.height * image.naturalHeight, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function metric(label, value) {
  const row = node("div", "grading-quality-row");
  row.append(node("span", "", label), node("strong", "", value));
  return row;
}

export function createVaultGradingColorUi() {
  const gradingPanel = document.querySelector("#ai-pregrade-panel");
  const targetFile = document.querySelector("#grading-image-file");
  const sizeSelect = document.querySelector("#grading-card-size");
  if (!gradingPanel || !targetFile || !sizeSelect || document.querySelector("#grading-color-reference-panel")) return null;

  const section = node("section", "grading-quality-panel grading-color-panel");
  section.id = "grading-color-reference-panel";
  section.append(node("h3", "", "Same-printing color & fading comparison"), node("p", "muted-copy", "Compare the primary card photo against a known-good image of the exact same printing/parallel/finish. The Kingdom normalizes global channel balance and reports possible chroma loss or color drift. Camera/lighting differences can mimic fading, so this remains advisory evidence."));

  const form = node("form", "grading-reference-form");
  const fileLabel = node("label", "grading-file-label");
  fileLabel.append(node("span", "", "Known-good same-printing reference image"));
  const referenceFile = document.createElement("input");
  referenceFile.type = "file"; referenceFile.id = "grading-color-reference-file"; referenceFile.accept = "image/jpeg,image/png,image/webp,image/avif"; referenceFile.required = true;
  fileLabel.append(referenceFile);

  const labelWrapper = node("label", "");
  labelWrapper.append(node("span", "", "Reference label"));
  const referenceLabel = document.createElement("input");
  referenceLabel.id = "grading-color-reference-label"; referenceLabel.maxLength = 240; referenceLabel.placeholder = "Same-printing scan, collector reference copy…";
  labelWrapper.append(referenceLabel);

  const sourceWrapper = node("label", "");
  sourceWrapper.append(node("span", "", "Reference source URL (optional, HTTPS)"));
  const sourceUrl = document.createElement("input");
  sourceUrl.id = "grading-color-reference-url"; sourceUrl.type = "url"; sourceUrl.placeholder = "https://…";
  sourceWrapper.append(sourceUrl);

  const compare = node("button", "dark-button", "Compare color to reference");
  compare.type = "submit";
  form.append(fileLabel, labelWrapper, sourceWrapper, compare);
  section.append(form);

  const summary = node("p", "grading-quality-summary", "No reference comparison performed.");
  const metrics = node("div", "grading-quality-metrics");
  const warnings = node("ul", "grading-quality-warnings");
  section.append(summary, metrics, warnings);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const target = targetFile.files?.[0];
    const reference = referenceFile.files?.[0];
    if (!target) { summary.textContent = "Load the primary card image in the Pre-Grade Lab first."; summary.className = "grading-quality-summary miss"; return; }
    if (!reference) return;
    const profile = BROWSER_CARD_SIZE_PROFILES[sizeSelect.value];
    if (!profile?.widthMm || !profile?.heightMm) { summary.textContent = "Choose a standard western or Japanese card-size profile before color comparison."; summary.className = "grading-quality-summary miss"; return; }

    compare.disabled = true; compare.textContent = "Comparing…";
    let targetUrl = null; let referenceObjectUrl = null;
    try {
      const targetLoaded = await loadLocalImage(target);
      const referenceLoaded = await loadLocalImage(reference);
      targetUrl = targetLoaded.url; referenceObjectUrl = referenceLoaded.url;
      const targetSample = sampleImage(targetLoaded.image);
      const referenceSample = sampleImage(referenceLoaded.image);
      const targetGeometry = detectCardGeometry({ width: targetSample.width, height: targetSample.height, data: targetSample.data, expectedWidthMm: profile.widthMm, expectedHeightMm: profile.heightMm });
      const referenceGeometry = detectCardGeometry({ width: referenceSample.width, height: referenceSample.height, data: referenceSample.data, expectedWidthMm: profile.widthMm, expectedHeightMm: profile.heightMm });
      if (!targetGeometry.usableForCentering || !referenceGeometry.usableForCentering) throw new Error("Target and reference both need a straight-on, complete card capture on a contrasting background before color comparison.");
      const targetCrop = normalizedCardCrop(targetLoaded.image, targetGeometry, profile);
      const referenceCrop = normalizedCardCrop(referenceLoaded.image, referenceGeometry, profile);
      if (targetCrop.width !== referenceCrop.width || targetCrop.height !== referenceCrop.height) throw new Error("Target/reference orientation must match for this color comparison.");
      const result = compareCardColorToReference({ width: targetCrop.width, height: targetCrop.height, targetData: targetCrop.data, referenceData: referenceCrop.data, referenceLabel: referenceLabel.value || reference.name, referenceSourceUrl: sourceUrl.value || null });
      summary.textContent = result.possibleFade ? `Possible fading/chroma loss versus the chosen reference • confidence ${Math.round(result.confidence * 100)}%` : result.possibleColorDrift ? `Color drift detected versus the chosen reference • confidence ${Math.round(result.confidence * 100)}%` : `No strong fading/color-drift signal versus the chosen reference • confidence ${Math.round(result.confidence * 100)}%`;
      summary.className = `grading-quality-summary ${result.possibleFade || result.possibleColorDrift ? "miss" : "pass"}`;
      metrics.replaceChildren(metric("Target/reference chroma", `${Math.round(result.chromaRatio * 100)}%`), metric("Hue distribution distance", String(result.hueHistogramDistance)), metric("Saturation distribution distance", String(result.saturationHistogramDistance)), metric("Chromaticity distance", String(result.chromaticityDistance)), metric("Lighting mismatch risk", result.lightingMismatchRisk ? "yes — recapture recommended" : "not strongly indicated"));
      warnings.replaceChildren(...[...result.warnings, ...result.limitations].map((text) => node("li", "", text)));
    } catch (error) {
      summary.textContent = error.message; summary.className = "grading-quality-summary miss"; metrics.replaceChildren(); warnings.replaceChildren();
    } finally {
      if (targetUrl) URL.revokeObjectURL(targetUrl);
      if (referenceObjectUrl) URL.revokeObjectURL(referenceObjectUrl);
      compare.disabled = false; compare.textContent = "Compare color to reference";
    }
  });

  gradingPanel.append(section);
  return Object.freeze({ panel: section });
}

createVaultGradingColorUi();
