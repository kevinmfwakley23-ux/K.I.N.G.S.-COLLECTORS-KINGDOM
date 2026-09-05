function dimension(value, name) {
  const number = Math.floor(Number(value));
  if (!Number.isInteger(number) || number < 16) throw new RangeError(`${name} must be at least 16.`);
  return number;
}

function validatePixels(value, width, height, name) {
  if (!(value instanceof Uint8ClampedArray) || value.length !== width * height * 4) {
    throw new TypeError(`${name} must be an RGBA ImageData buffer matching width and height.`);
  }
}

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function channelMeans(data) {
  let r = 0;
  let g = 0;
  let b = 0;
  const count = data.length / 4;
  for (let offset = 0; offset < data.length; offset += 4) {
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
  }
  return { r: r / count, g: g / count, b: b / count };
}

function grayWorldScale(means) {
  const neutral = (means.r + means.g + means.b) / 3;
  return {
    r: means.r > 1 ? neutral / means.r : 1,
    g: means.g > 1 ? neutral / means.g : 1,
    b: means.b > 1 ? neutral / means.b : 1
  };
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let hue = 0;
  if (delta > 1e-6) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const saturation = max <= 1e-6 ? 0 : delta / max;
  return { hue, saturation, value: max };
}

function histogramDistance(first, second) {
  let total = 0;
  for (let i = 0; i < first.length; i += 1) total += Math.abs(first[i] - second[i]);
  return total / 2;
}

function normalizedFeatures(data) {
  const means = channelMeans(data);
  const scales = grayWorldScale(means);
  const hueBins = new Float64Array(24);
  const saturationBins = new Float64Array(12);
  let saturationSum = 0;
  let saturationWeight = 0;
  let valueSum = 0;
  let valueCount = 0;
  let chromaR = 0;
  let chromaG = 0;
  let chromaB = 0;
  let chromaCount = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    const r = clamp(data[offset] * scales.r);
    const g = clamp(data[offset + 1] * scales.g);
    const b = clamp(data[offset + 2] * scales.b);
    const { hue, saturation, value } = rgbToHsv(r, g, b);
    if (value < 0.07 || value > 0.98) continue;

    valueSum += value;
    valueCount += 1;
    saturationSum += saturation;
    saturationWeight += 1;
    saturationBins[Math.min(saturationBins.length - 1, Math.floor(saturation * saturationBins.length))] += 1;
    if (saturation >= 0.08) hueBins[Math.min(hueBins.length - 1, Math.floor(hue / 360 * hueBins.length))] += saturation;

    const total = r + g + b;
    if (total > 1) {
      chromaR += r / total;
      chromaG += g / total;
      chromaB += b / total;
      chromaCount += 1;
    }
  }

  const hueTotal = hueBins.reduce((sum, value) => sum + value, 0) || 1;
  const satTotal = saturationBins.reduce((sum, value) => sum + value, 0) || 1;
  for (let i = 0; i < hueBins.length; i += 1) hueBins[i] /= hueTotal;
  for (let i = 0; i < saturationBins.length; i += 1) saturationBins[i] /= satTotal;

  return {
    channelMeans: means,
    grayWorldScales: scales,
    meanSaturation: saturationWeight ? saturationSum / saturationWeight : 0,
    meanValue: valueCount ? valueSum / valueCount : 0,
    hueHistogram: hueBins,
    saturationHistogram: saturationBins,
    chromaticity: chromaCount ? { r: chromaR / chromaCount, g: chromaG / chromaCount, b: chromaB / chromaCount } : { r: 1 / 3, g: 1 / 3, b: 1 / 3 },
    usablePixels: valueCount
  };
}

export function compareCardColorToReference({ width, height, targetData, referenceData, referenceLabel = null, referenceSourceUrl = null } = {}) {
  const imageWidth = dimension(width, "Color comparison width");
  const imageHeight = dimension(height, "Color comparison height");
  validatePixels(targetData, imageWidth, imageHeight, "Target color image");
  validatePixels(referenceData, imageWidth, imageHeight, "Reference color image");
  if (referenceSourceUrl != null) {
    const parsed = new URL(String(referenceSourceUrl));
    if (parsed.protocol !== "https:") throw new RangeError("Reference source URL must use HTTPS.");
  }

  const target = normalizedFeatures(targetData);
  const reference = normalizedFeatures(referenceData);
  const chromaRatio = reference.meanSaturation > 0.03 ? target.meanSaturation / reference.meanSaturation : 1;
  const hueDistance = histogramDistance(target.hueHistogram, reference.hueHistogram);
  const saturationDistance = histogramDistance(target.saturationHistogram, reference.saturationHistogram);
  const chromaticityDistance = Math.hypot(
    target.chromaticity.r - reference.chromaticity.r,
    target.chromaticity.g - reference.chromaticity.g,
    target.chromaticity.b - reference.chromaticity.b
  );
  const valueDifference = Math.abs(target.meanValue - reference.meanValue);

  const referenceColorfulEnough = reference.meanSaturation >= 0.12;
  const possibleFade = referenceColorfulEnough && chromaRatio <= 0.86 && hueDistance <= 0.38;
  const possibleColorDrift = hueDistance >= 0.3 || chromaticityDistance >= 0.055;
  const lightingMismatchRisk = valueDifference >= 0.14 || Object.values(target.grayWorldScales).some((scale) => scale < 0.72 || scale > 1.38) || Object.values(reference.grayWorldScales).some((scale) => scale < 0.72 || scale > 1.38);

  const sampleAdequacy = clamp01(Math.min(target.usablePixels, reference.usablePixels) / (imageWidth * imageHeight * 0.72));
  const confidence = clamp01(0.35 + sampleAdequacy * 0.3 + (referenceColorfulEnough ? 0.12 : 0) + (lightingMismatchRisk ? -0.16 : 0) + (hueDistance < 0.3 ? 0.08 : 0));
  const warnings = [];
  if (!referenceColorfulEnough) warnings.push("The reference has low chroma, so fading conclusions are weak for this printing/image.");
  if (lightingMismatchRisk) warnings.push("Target/reference lighting or white balance differ materially; recapture both under the same neutral illumination before trusting color conclusions.");
  if (possibleColorDrift) warnings.push("Color distribution differs from the reference. This may be fading/discoloration, printing variation, camera processing, or a mismatched reference printing.");
  if (possibleFade) warnings.push("Target chroma is materially lower than the chosen reference after gray-world normalization. Treat as possible fading only until a controlled-light comparison confirms it.");

  return Object.freeze({
    analyzed: true,
    method: "same-printing-normalized-color-reference-v1",
    referenceLabel: referenceLabel == null ? null : String(referenceLabel).trim().slice(0, 240),
    referenceSourceUrl: referenceSourceUrl == null ? null : String(referenceSourceUrl),
    targetMeanSaturation: rounded(target.meanSaturation),
    referenceMeanSaturation: rounded(reference.meanSaturation),
    chromaRatio: rounded(chromaRatio),
    hueHistogramDistance: rounded(hueDistance),
    saturationHistogramDistance: rounded(saturationDistance),
    chromaticityDistance: rounded(chromaticityDistance),
    meanValueDifference: rounded(valueDifference),
    possibleFade,
    possibleColorDrift,
    lightingMismatchRisk,
    confidence: rounded(confidence),
    fadeConfirmed: false,
    discolorationConfirmed: false,
    advisoryOnly: true,
    warnings: Object.freeze(warnings),
    limitations: Object.freeze([
      "Reference comparison requires the same card printing/parallel/finish; a different print run, foil treatment, scan, or photography setup can create legitimate color differences.",
      "Gray-world normalization reduces global color cast but cannot fully remove camera profiles, HDR, flash, display/scan processing, or uneven illumination.",
      "A color comparison can flag possible fading/discoloration but cannot prove chemical fading or restoration from ordinary photographs alone."
    ])
  });
}
