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

function estimateBackground(width, height, data) {
  const patchWidth = Math.max(2, Math.floor(width * 0.07));
  const patchHeight = Math.max(2, Math.floor(height * 0.07));
  const starts = [[0, 0], [width - patchWidth, 0], [0, height - patchHeight], [width - patchWidth, height - patchHeight]];
  const samples = starts.map(([startX, startY]) => {
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
    return { r: r / count, g: g / count, b: b / count };
  });
  return {
    r: samples.reduce((sum, sample) => sum + sample.r, 0) / samples.length,
    g: samples.reduce((sum, sample) => sum + sample.g, 0) / samples.length,
    b: samples.reduce((sum, sample) => sum + sample.b, 0) / samples.length
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function linearResidual(points, coordinateKey, valueKey) {
  if (points.length < 4) return 1;
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point[coordinateKey], 0) / n;
  const meanY = points.reduce((sum, point) => sum + point[valueKey], 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point[coordinateKey] - meanX) * (point[valueKey] - meanY);
    denominator += (point[coordinateKey] - meanX) ** 2;
  }
  const slope = denominator ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  const mse = points.reduce((sum, point) => {
    const residual = point[valueKey] - (slope * point[coordinateKey] + intercept);
    return sum + residual * residual;
  }, 0) / n;
  return Math.sqrt(mse);
}

function cornerFraction(mask, width, x0, y0, patchWidth, patchHeight) {
  let foreground = 0;
  let total = 0;
  for (let y = y0; y < y0 + patchHeight; y += 1) {
    for (let x = x0; x < x0 + patchWidth; x += 1) {
      total += 1;
      if (mask[y * width + x]) foreground += 1;
    }
  }
  return total ? foreground / total : 0;
}

export function analyzeCardContourCondition({ width, height, data, geometry } = {}) {
  const imageWidth = Math.floor(Number(width));
  const imageHeight = Math.floor(Number(height));
  if (!Number.isInteger(imageWidth) || imageWidth < 8 || !Number.isInteger(imageHeight) || imageHeight < 8) throw new RangeError("Contour analysis requires valid image dimensions.");
  if (!(data instanceof Uint8ClampedArray) || data.length !== imageWidth * imageHeight * 4) throw new TypeError("Contour analysis requires RGBA ImageData pixels matching width and height.");
  if (!geometry?.detected || !geometry.bounds) {
    return Object.freeze({ analyzed: false, reason: "Card contour analysis requires a detected whole-card geometry result.", signals: Object.freeze([]) });
  }

  const background = estimateBackground(imageWidth, imageHeight, data);
  const threshold = Number.isFinite(geometry.contrastThreshold) ? geometry.contrastThreshold : 32;
  const mask = new Uint8Array(imageWidth * imageHeight);
  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const offset = (y * imageWidth + x) * 4;
      if (rgbDistance(data[offset], data[offset + 1], data[offset + 2], background) >= threshold) mask[y * imageWidth + x] = 1;
    }
  }

  const { left, right, top, bottom, width: cardWidth, height: cardHeight } = geometry.bounds;
  const patch = Math.max(6, Math.round(Math.min(cardWidth, cardHeight) * 0.1));
  const cornerDefinitions = [
    ["top-left", left, top],
    ["top-right", right - patch + 1, top],
    ["bottom-left", left, bottom - patch + 1],
    ["bottom-right", right - patch + 1, bottom - patch + 1]
  ];
  const corners = cornerDefinitions.map(([region, x, y]) => ({ region, foregroundFraction: cornerFraction(mask, imageWidth, x, y, patch, patch) }));
  const baselineCorner = median(corners.map((corner) => corner.foregroundFraction));
  const cornerResults = corners.map((corner) => {
    const lossVsPeers = Math.max(0, baselineCorner - corner.foregroundFraction);
    return Object.freeze({
      region: corner.region,
      foregroundFraction: rounded(corner.foregroundFraction),
      lossVsPeerMedian: rounded(lossVsPeers),
      possibleContourDamage: lossVsPeers >= 0.045
    });
  });

  const margin = Math.max(3, patch);
  const leftPoints = [];
  const rightPoints = [];
  for (let y = top + margin; y <= bottom - margin; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = left; x <= right; x += 1) {
      if (!mask[y * imageWidth + x]) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first >= 0) {
      leftPoints.push({ y, x: first });
      rightPoints.push({ y, x: last });
    }
  }

  const topPoints = [];
  const bottomPoints = [];
  for (let x = left + margin; x <= right - margin; x += 1) {
    let first = -1;
    let last = -1;
    for (let y = top; y <= bottom; y += 1) {
      if (!mask[y * imageWidth + x]) continue;
      if (first < 0) first = y;
      last = y;
    }
    if (first >= 0) {
      topPoints.push({ x, y: first });
      bottomPoints.push({ x, y: last });
    }
  }

  const edgeResults = [
    { region: "left-edge", roughness: linearResidual(leftPoints, "y", "x") / cardWidth },
    { region: "right-edge", roughness: linearResidual(rightPoints, "y", "x") / cardWidth },
    { region: "top-edge", roughness: linearResidual(topPoints, "x", "y") / cardHeight },
    { region: "bottom-edge", roughness: linearResidual(bottomPoints, "x", "y") / cardHeight }
  ].map((edge) => Object.freeze({
    region: edge.region,
    normalizedRoughness: rounded(edge.roughness, 4),
    possibleContourDamage: edge.roughness >= 0.009
  }));

  const signals = [];
  for (const corner of cornerResults) {
    if (!corner.possibleContourDamage) continue;
    signals.push(Object.freeze({
      type: "corner-contour-asymmetry",
      region: corner.region,
      severity: rounded(clamp01(corner.lossVsPeerMedian / 0.2)),
      confidence: rounded(clamp01((geometry.confidence ?? 0.5) * 0.85)),
      note: "This corner has less detected physical silhouette than peer corners. Possible rounding, ding, bend, chip, obstruction, or segmentation error; inspect a dedicated corner capture."
    }));
  }
  for (const edge of edgeResults) {
    if (!edge.possibleContourDamage) continue;
    signals.push(Object.freeze({
      type: "edge-contour-roughness",
      region: edge.region,
      severity: rounded(clamp01(edge.normalizedRoughness / 0.04)),
      confidence: rounded(clamp01((geometry.confidence ?? 0.5) * 0.8)),
      note: "The detected physical edge deviates from a straight-line fit. Possible notch/chip/roughness, perspective residue, obstruction, or segmentation error; inspect an edge macro capture."
    }));
  }

  const usable = geometry.cropComplete === true && geometry.perspectiveAcceptable === true && geometry.confidence >= 0.65;
  return Object.freeze({
    analyzed: true,
    method: "contrast-silhouette-contour-v1",
    usable,
    cornerPatchFraction: rounded(patch / Math.min(cardWidth, cardHeight)),
    corners: Object.freeze(cornerResults),
    edges: Object.freeze(edgeResults),
    signals: Object.freeze(signals),
    advisoryOnly: true,
    officialGradeImpactClaim: false,
    limitations: Object.freeze([
      "Contour analysis detects silhouette asymmetry/roughness, not printed whitening or microscopic surface damage.",
      "Use a solid contrasting background with the card unsleeved and unobstructed.",
      "Natural corner radius is normalized by comparison with peer corners; issue-specific shapes may require manual review."
    ])
  });
}
