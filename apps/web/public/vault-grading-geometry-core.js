function positiveInt(value, name) {
  const number = Math.floor(Number(value));
  if (!Number.isInteger(number) || number < 8) throw new RangeError(`${name} must be at least 8.`);
  return number;
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function rgbDistance(r, g, b, background) {
  return Math.hypot(r - background.r, g - background.g, b - background.b);
}

function longestRun(flags) {
  let bestStart = -1;
  let bestEnd = -1;
  let start = -1;
  for (let i = 0; i <= flags.length; i += 1) {
    if (i < flags.length && flags[i]) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0) {
      const end = i - 1;
      if (bestStart < 0 || end - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = end;
      }
      start = -1;
    }
  }
  return bestStart < 0 ? null : { start: bestStart, end: bestEnd };
}

function estimateBackground(width, height, data) {
  const patchWidth = Math.max(2, Math.floor(width * 0.07));
  const patchHeight = Math.max(2, Math.floor(height * 0.07));
  const patches = [
    [0, 0],
    [width - patchWidth, 0],
    [0, height - patchHeight],
    [width - patchWidth, height - patchHeight]
  ];
  const samples = [];
  for (const [startX, startY] of patches) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let y = startY; y < startY + patchHeight; y += 1) {
      for (let x = startX; x < startX + patchWidth; x += 1) {
        const offset = (y * width + x) * 4;
        r += data[offset];
        g += data[offset + 1];
        b += data[offset + 2];
        count += 1;
      }
    }
    samples.push({ r: r / count, g: g / count, b: b / count });
  }
  const background = {
    r: samples.reduce((sum, sample) => sum + sample.r, 0) / samples.length,
    g: samples.reduce((sum, sample) => sum + sample.g, 0) / samples.length,
    b: samples.reduce((sum, sample) => sum + sample.b, 0) / samples.length
  };
  const variation = Math.sqrt(samples.reduce((sum, sample) => sum + rgbDistance(sample.r, sample.g, sample.b, background) ** 2, 0) / samples.length);
  return { background, variation };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rowExtent(mask, width, y, left, right) {
  let first = -1;
  let last = -1;
  for (let x = left; x <= right; x += 1) {
    if (!mask[y * width + x]) continue;
    if (first < 0) first = x;
    last = x;
  }
  return first < 0 ? null : { first, last, size: last - first + 1 };
}

function columnExtent(mask, width, x, top, bottom) {
  let first = -1;
  let last = -1;
  for (let y = top; y <= bottom; y += 1) {
    if (!mask[y * width + x]) continue;
    if (first < 0) first = y;
    last = y;
  }
  return first < 0 ? null : { first, last, size: last - first + 1 };
}

export function detectCardGeometry({ width, height, data, expectedWidthMm = 63.5, expectedHeightMm = 88.9 } = {}) {
  const imageWidth = positiveInt(width, "Image width");
  const imageHeight = positiveInt(height, "Image height");
  if (!(data instanceof Uint8ClampedArray) || data.length !== imageWidth * imageHeight * 4) {
    throw new TypeError("Card geometry detection requires RGBA ImageData pixels matching width and height.");
  }
  const expectedWidth = Number(expectedWidthMm);
  const expectedHeight = Number(expectedHeightMm);
  if (!Number.isFinite(expectedWidth) || expectedWidth <= 0 || !Number.isFinite(expectedHeight) || expectedHeight <= 0) {
    throw new RangeError("Expected card dimensions must be positive.");
  }

  const { background, variation } = estimateBackground(imageWidth, imageHeight, data);
  const threshold = Math.min(90, Math.max(28, variation * 3 + 14));
  const mask = new Uint8Array(imageWidth * imageHeight);
  const columnCounts = new Uint32Array(imageWidth);
  const rowCounts = new Uint32Array(imageHeight);
  let foregroundCount = 0;

  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const offset = (y * imageWidth + x) * 4;
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2], background) < threshold) continue;
      mask[y * imageWidth + x] = 1;
      columnCounts[x] += 1;
      rowCounts[y] += 1;
      foregroundCount += 1;
    }
  }

  const columnFlags = Array.from(columnCounts, (count) => count / imageHeight >= 0.18);
  const rowFlags = Array.from(rowCounts, (count) => count / imageWidth >= 0.18);
  const horizontalRun = longestRun(columnFlags);
  const verticalRun = longestRun(rowFlags);
  if (!horizontalRun || !verticalRun) {
    return Object.freeze({ detected: false, reason: "No stable rectangular foreground was detected against the corner-sampled background.", backgroundVariation: rounded(variation, 2), contrastThreshold: rounded(threshold, 2), confidence: 0 });
  }

  const left = horizontalRun.start;
  const right = horizontalRun.end;
  const top = verticalRun.start;
  const bottom = verticalRun.end;
  const boxWidth = right - left + 1;
  const boxHeight = bottom - top + 1;
  if (boxWidth < imageWidth * 0.2 || boxHeight < imageHeight * 0.2) {
    return Object.freeze({ detected: false, reason: "Detected foreground is too small to be a reliable whole-card region.", backgroundVariation: rounded(variation, 2), contrastThreshold: rounded(threshold, 2), confidence: 0.1 });
  }

  const rowSamples = [0.12, 0.3, 0.5, 0.7, 0.88].map((fraction) => Math.min(bottom, Math.max(top, Math.round(top + (boxHeight - 1) * fraction))));
  const columnSamples = [0.12, 0.3, 0.5, 0.7, 0.88].map((fraction) => Math.min(right, Math.max(left, Math.round(left + (boxWidth - 1) * fraction))));
  const rowWidths = rowSamples.map((y) => rowExtent(mask, imageWidth, y, left, right)?.size ?? 0).filter(Boolean);
  const columnHeights = columnSamples.map((x) => columnExtent(mask, imageWidth, x, top, bottom)?.size ?? 0).filter(Boolean);
  const medianWidth = median(rowWidths);
  const medianHeight = median(columnHeights);
  const widthVariation = medianWidth ? (Math.max(...rowWidths) - Math.min(...rowWidths)) / medianWidth : 1;
  const heightVariation = medianHeight ? (Math.max(...columnHeights) - Math.min(...columnHeights)) / medianHeight : 1;

  const marginX = Math.min(left, imageWidth - 1 - right) / imageWidth;
  const marginY = Math.min(top, imageHeight - 1 - bottom) / imageHeight;
  const cropComplete = marginX >= 0.01 && marginY >= 0.01;
  const perspectiveAcceptable = widthVariation <= 0.07 && heightVariation <= 0.07;
  const expectedNormalizedRatio = Math.min(expectedWidth, expectedHeight) / Math.max(expectedWidth, expectedHeight);
  const observedNormalizedRatio = Math.min(boxWidth, boxHeight) / Math.max(boxWidth, boxHeight);
  const aspectRatioDeviation = Math.abs(observedNormalizedRatio - expectedNormalizedRatio) / expectedNormalizedRatio;
  const aspectRatioAcceptable = aspectRatioDeviation <= 0.12;
  const foregroundFraction = foregroundCount / (imageWidth * imageHeight);
  const backgroundUniformity = clamp01(1 - variation / 35);
  const geometryScore = clamp01(1 - (widthVariation + heightVariation) / 0.3);
  const aspectScore = clamp01(1 - aspectRatioDeviation / 0.3);
  const confidence = clamp01(backgroundUniformity * 0.3 + geometryScore * 0.35 + aspectScore * 0.25 + (cropComplete ? 0.1 : 0));

  const warnings = [];
  if (!cropComplete) warnings.push("The detected card region touches or nearly touches the image boundary; retake with all four card edges visible.");
  if (!perspectiveAcceptable) warnings.push("Detected edge geometry suggests perspective/skew; retake straight-on before centering or defect measurements.");
  if (!aspectRatioAcceptable) warnings.push("Detected card aspect ratio does not closely match the selected card-size profile.");
  if (variation > 18) warnings.push("Background corners are not uniform; use a solid contrasting mat for more reliable automatic edge detection.");

  return Object.freeze({
    detected: true,
    method: "contrast-background-rectangle-v1",
    bounds: Object.freeze({ left, right, top, bottom, width: boxWidth, height: boxHeight }),
    normalizedBounds: Object.freeze({ x: rounded(left / imageWidth), y: rounded(top / imageHeight), width: rounded(boxWidth / imageWidth), height: rounded(boxHeight / imageHeight) }),
    cropComplete,
    perspectiveAcceptable,
    aspectRatioAcceptable,
    observedNormalizedRatio: rounded(observedNormalizedRatio),
    expectedNormalizedRatio: rounded(expectedNormalizedRatio),
    aspectRatioDeviation: rounded(aspectRatioDeviation),
    widthVariation: rounded(widthVariation),
    heightVariation: rounded(heightVariation),
    foregroundFraction: rounded(foregroundFraction),
    backgroundVariation: rounded(variation, 2),
    contrastThreshold: rounded(threshold, 2),
    confidence: rounded(confidence),
    usableForCentering: confidence >= 0.65 && cropComplete && perspectiveAcceptable && aspectRatioAcceptable,
    warnings: Object.freeze(warnings)
  });
}
