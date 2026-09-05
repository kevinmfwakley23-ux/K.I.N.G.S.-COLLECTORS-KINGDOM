function finitePositive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${name} must be greater than zero.`);
  return number;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function analyzeBrowserCapturePixels({ width, height, data, sourceWidth = width, sourceHeight = height } = {}) {
  const sampleWidth = Math.floor(finitePositive(width, "Sample width"));
  const sampleHeight = Math.floor(finitePositive(height, "Sample height"));
  const originalWidth = Math.floor(finitePositive(sourceWidth, "Source width"));
  const originalHeight = Math.floor(finitePositive(sourceHeight, "Source height"));
  if (!(data instanceof Uint8ClampedArray) || data.length !== sampleWidth * sampleHeight * 4) {
    throw new TypeError("Capture analysis requires RGBA ImageData pixels matching width and height.");
  }

  const pixelCount = sampleWidth * sampleHeight;
  const gray = new Float32Array(pixelCount);
  let sum = 0;
  let sumSquares = 0;
  let brightClipped = 0;
  let darkClipped = 0;
  let lowSaturationBright = 0;

  for (let pixel = 0, offset = 0; pixel < pixelCount; pixel += 1, offset += 4) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const y = luminance(r, g, b);
    gray[pixel] = y;
    sum += y;
    sumSquares += y * y;
    if (y >= 250) brightClipped += 1;
    if (y <= 8) darkClipped += 1;
    if (y >= 242 && Math.max(r, g, b) - Math.min(r, g, b) <= 14) lowSaturationBright += 1;
  }

  const mean = sum / pixelCount;
  const variance = Math.max(0, sumSquares / pixelCount - mean * mean);
  const contrastStdDev = Math.sqrt(variance);

  let gradientTotal = 0;
  let gradientSamples = 0;
  for (let y = 1; y < sampleHeight - 1; y += 1) {
    const row = y * sampleWidth;
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const index = row + x;
      const gx = Math.abs(gray[index + 1] - gray[index - 1]);
      const gy = Math.abs(gray[index + sampleWidth] - gray[index - sampleWidth]);
      gradientTotal += Math.hypot(gx, gy);
      gradientSamples += 1;
    }
  }
  const meanGradient = gradientSamples ? gradientTotal / gradientSamples : 0;

  const shortSide = Math.min(originalWidth, originalHeight);
  const longSide = Math.max(originalWidth, originalHeight);
  const resolutionAdequate = shortSide >= 1000 && longSide >= 1400;
  const focusAdequate = meanGradient >= 8;
  const brightClippedFraction = brightClipped / pixelCount;
  const darkClippedFraction = darkClipped / pixelCount;
  const glareRiskFraction = lowSaturationBright / pixelCount;
  const glareAcceptable = glareRiskFraction <= 0.16 && brightClippedFraction <= 0.12;
  const exposureAcceptable = darkClippedFraction <= 0.12 && mean >= 38 && mean <= 220;
  const contrastAdequate = contrastStdDev >= 18;
  const automaticChecksPass = resolutionAdequate && focusAdequate && glareAcceptable && exposureAcceptable && contrastAdequate;

  const warnings = [];
  if (!resolutionAdequate) warnings.push("Capture resolution is below the recommended whole-card threshold (short side 1000 px, long side 1400 px).");
  if (!focusAdequate) warnings.push("The image appears soft or low-detail; retake with steadier focus before corner/scratch analysis.");
  if (!glareAcceptable) warnings.push("Bright clipped/low-saturation regions may be glare. Add diffuse or angled lighting and retake.");
  if (!exposureAcceptable) warnings.push("Exposure is too dark/bright for dependable defect and color review.");
  if (!contrastAdequate) warnings.push("Low tonal contrast may hide scratches, edge damage, or print defects.");
  warnings.push("Full-card crop and perspective are not automatically verified yet; visually confirm all four card edges and a straight-on capture.");

  return Object.freeze({
    sourceWidth: originalWidth,
    sourceHeight: originalHeight,
    megapixels: rounded(originalWidth * originalHeight / 1_000_000, 2),
    sampledWidth: sampleWidth,
    sampledHeight: sampleHeight,
    meanLuminance: rounded(mean, 2),
    contrastStdDev: rounded(contrastStdDev, 2),
    meanGradient: rounded(meanGradient, 2),
    brightClippedFraction: rounded(brightClippedFraction),
    darkClippedFraction: rounded(darkClippedFraction),
    glareRiskFraction: rounded(glareRiskFraction),
    resolutionAdequate,
    focusAdequate,
    glareAcceptable,
    exposureAcceptable,
    contrastAdequate,
    cropComplete: null,
    perspectiveAcceptable: null,
    automaticChecksPass,
    readyForAutomatedDefectAnalysis: false,
    readinessReason: automaticChecksPass
      ? "Automatic image-quality checks passed. Full crop/perspective confirmation and defect detectors are still required."
      : "Retake or improve this image before using it as AI grading evidence.",
    warnings: Object.freeze(warnings),
    analyzerConfidence: rounded(clamp01(0.55 + (automaticChecksPass ? 0.25 : 0) + (resolutionAdequate ? 0.05 : 0) + (focusAdequate ? 0.05 : 0)))
  });
}

export function captureQualityLabel(value) {
  if (!value) return "Not analyzed";
  if (value.automaticChecksPass) return "Automatic quality checks passed";
  const failed = [
    [value.resolutionAdequate, "resolution"],
    [value.focusAdequate, "focus"],
    [value.glareAcceptable, "glare"],
    [value.exposureAcceptable, "exposure"],
    [value.contrastAdequate, "contrast"]
  ].filter(([passes]) => !passes).map(([, label]) => label);
  return `Retake recommended: ${failed.join(", ")}`;
}
