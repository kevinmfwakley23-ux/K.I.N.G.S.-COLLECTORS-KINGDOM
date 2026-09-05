function dimension(value, name) {
  const number = Math.floor(Number(value));
  if (!Number.isInteger(number) || number < 16) throw new RangeError(`${name} must be at least 16.`);
  return number;
}

function validatePixels(data, width, height, name) {
  if (!(data instanceof Uint8ClampedArray) || data.length !== width * height * 4) throw new TypeError(`${name} must be an RGBA ImageData buffer matching width and height.`);
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function otsuThreshold(values) {
  const histogram = new Uint32Array(256);
  for (const value of values) histogram[Math.max(0, Math.min(255, Math.round(value)))] += 1;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i];
  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = -1;
  let bestThreshold = 127;
  for (let threshold = 0; threshold < 255; threshold += 1) {
    weightBackground += histogram[threshold];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
    sumBackground += threshold * histogram[threshold];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = threshold;
    }
  }
  return bestThreshold;
}

function binaryInkMask(width, height, data) {
  const values = new Uint8Array(width * height);
  let index = 0;
  for (let offset = 0; offset < data.length; offset += 4) values[index++] = Math.round(luminance(data[offset], data[offset + 1], data[offset + 2]));
  const threshold = otsuThreshold(values);
  let dark = 0;
  let light = 0;
  for (const value of values) {
    if (value <= threshold) dark += 1;
    else light += 1;
  }
  const inkIsDark = dark <= light;
  const mask = new Uint8Array(values.length);
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    const ink = inkIsDark ? values[i] <= threshold : values[i] > threshold;
    if (ink) { mask[i] = 1; count += 1; }
  }
  return { mask, inkCount: count, threshold, inkPolarity: inkIsDark ? "dark" : "light" };
}

function inkBounds(width, height, mask) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return maxX < minX ? null : { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function normalizedFeatures(width, height, data) {
  const { mask, inkCount, threshold, inkPolarity } = binaryInkMask(width, height, data);
  const coverage = inkCount / (width * height);
  const bounds = inkBounds(width, height, mask);
  if (!bounds || coverage < 0.002 || coverage > 0.48 || bounds.width < 4 || bounds.height < 3) {
    return { usable: false, reason: "Signature crop does not contain a stable minority stroke region. Use a tight, high-contrast autograph crop with minimal printed artwork/background.", coverage, threshold, inkPolarity };
  }

  const gridColumns = 24;
  const gridRows = 10;
  const grid = new Float64Array(gridColumns * gridRows);
  const xProjection = new Float64Array(32);
  const yProjection = new Float64Array(16);
  let centroidX = 0;
  let centroidY = 0;
  let points = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!mask[y * width + x]) continue;
      const nx = bounds.width <= 1 ? 0 : (x - bounds.minX) / (bounds.width - 1);
      const ny = bounds.height <= 1 ? 0 : (y - bounds.minY) / (bounds.height - 1);
      grid[Math.min(gridRows - 1, Math.floor(ny * gridRows)) * gridColumns + Math.min(gridColumns - 1, Math.floor(nx * gridColumns))] += 1;
      xProjection[Math.min(xProjection.length - 1, Math.floor(nx * xProjection.length))] += 1;
      yProjection[Math.min(yProjection.length - 1, Math.floor(ny * yProjection.length))] += 1;
      centroidX += nx; centroidY += ny; points += 1;
    }
  }

  function normalize(vector) {
    const norm = Math.hypot(...vector) || 1;
    for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
  }
  normalize(grid); normalize(xProjection); normalize(yProjection);

  return {
    usable: true,
    coverage,
    threshold,
    inkPolarity,
    aspectRatio: bounds.width / bounds.height,
    centroidX: centroidX / points,
    centroidY: centroidY / points,
    grid,
    xProjection,
    yProjection
  };
}

function cosine(first, second) {
  let dot = 0;
  let firstNorm = 0;
  let secondNorm = 0;
  for (let i = 0; i < first.length; i += 1) {
    dot += first[i] * second[i]; firstNorm += first[i] ** 2; secondNorm += second[i] ** 2;
  }
  if (!firstNorm || !secondNorm) return 0;
  return clamp01(dot / Math.sqrt(firstNorm * secondNorm));
}

function compareFeatures(target, reference) {
  const grid = cosine(target.grid, reference.grid);
  const xProjection = cosine(target.xProjection, reference.xProjection);
  const yProjection = cosine(target.yProjection, reference.yProjection);
  const aspect = Math.exp(-Math.abs(Math.log(Math.max(1e-6, target.aspectRatio / reference.aspectRatio))));
  const centroidDistance = Math.hypot(target.centroidX - reference.centroidX, target.centroidY - reference.centroidY);
  const centroid = clamp01(1 - centroidDistance / 0.4);
  const score = grid * 0.48 + xProjection * 0.18 + yProjection * 0.14 + aspect * 0.12 + centroid * 0.08;
  return { score: clamp01(score), grid, xProjection, yProjection, aspect, centroid };
}

export function analyzeAutographImage({ width, height, data } = {}) {
  const imageWidth = dimension(width, "Autograph image width");
  const imageHeight = dimension(height, "Autograph image height");
  validatePixels(data, imageWidth, imageHeight, "Autograph image");
  const features = normalizedFeatures(imageWidth, imageHeight, data);
  return Object.freeze({
    usable: features.usable,
    reason: features.reason ?? null,
    inkCoverage: rounded(features.coverage ?? 0),
    inkThreshold: features.threshold ?? null,
    inkPolarity: features.inkPolarity ?? null,
    aspectRatio: features.usable ? rounded(features.aspectRatio, 2) : null,
    _features: features
  });
}

export function compareAutographImages({ target, references } = {}) {
  if (!target?.data || !Array.isArray(references) || references.length < 1) throw new TypeError("Autograph comparison requires one target image and at least one reference image.");
  const targetAnalysis = analyzeAutographImage(target);
  if (!targetAnalysis.usable) return Object.freeze({ analyzed: false, reason: targetAnalysis.reason, references: Object.freeze([]), authenticationClaim: false });

  const results = [];
  for (const reference of references.slice(0, 12)) {
    const analysis = analyzeAutographImage(reference);
    if (!analysis.usable) {
      results.push(Object.freeze({ sourceUrl: reference.sourceUrl ?? null, label: reference.label ?? null, usable: false, reason: analysis.reason, similarity: null }));
      continue;
    }
    const compared = compareFeatures(targetAnalysis._features, analysis._features);
    results.push(Object.freeze({
      sourceUrl: reference.sourceUrl ?? null,
      label: reference.label ?? null,
      license: reference.license ?? null,
      usable: true,
      similarity: rounded(compared.score),
      components: Object.freeze({ grid: rounded(compared.grid), xProjection: rounded(compared.xProjection), yProjection: rounded(compared.yProjection), aspect: rounded(compared.aspect), centroid: rounded(compared.centroid) })
    }));
  }
  const usable = results.filter((entry) => entry.usable).sort((a, b) => b.similarity - a.similarity);
  if (!usable.length) return Object.freeze({ analyzed: false, reason: "None of the supplied reference signature images had a usable stroke crop.", references: Object.freeze(results), authenticationClaim: false });
  const top = usable.slice(0, Math.min(3, usable.length));
  const aggregateSimilarity = top.reduce((sum, entry) => sum + entry.similarity, 0) / top.length;
  const confidence = clamp01(0.35 + Math.min(0.3, usable.length * 0.08) + Math.max(0, aggregateSimilarity - 0.5) * 0.35);
  return Object.freeze({
    analyzed: true,
    method: "normalized-stroke-shape-similarity-v1",
    aggregateSimilarity: rounded(aggregateSimilarity),
    confidence: rounded(confidence),
    referenceCount: results.length,
    usableReferenceCount: usable.length,
    references: Object.freeze(results),
    authenticationClaim: false,
    professionallyAuthenticated: false,
    advisoryOnly: true,
    limitations: Object.freeze([
      "Visual similarity cannot establish when, where, by whom, or under what conditions an autograph was made.",
      "Printed backgrounds, marker thickness, signing angle, age, rushed signatures and natural signer variation can alter the score.",
      "Professional authentication may use ink, object, provenance, spectral/microscopic and broader exemplar evidence unavailable to this image-only comparison."
    ])
  });
}
