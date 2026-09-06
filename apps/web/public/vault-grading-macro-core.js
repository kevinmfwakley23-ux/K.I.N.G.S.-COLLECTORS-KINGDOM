const REGIONS = Object.freeze({
  "top-left": Object.freeze({ kind: "corner", sides: Object.freeze(["top", "left"]) }),
  "top-right": Object.freeze({ kind: "corner", sides: Object.freeze(["top", "right"]) }),
  "bottom-left": Object.freeze({ kind: "corner", sides: Object.freeze(["bottom", "left"]) }),
  "bottom-right": Object.freeze({ kind: "corner", sides: Object.freeze(["bottom", "right"]) }),
  "left-edge": Object.freeze({ kind: "edge", sides: Object.freeze(["left"]) }),
  "right-edge": Object.freeze({ kind: "edge", sides: Object.freeze(["right"]) }),
  "top-edge": Object.freeze({ kind: "edge", sides: Object.freeze(["top"]) }),
  "bottom-edge": Object.freeze({ kind: "edge", sides: Object.freeze(["bottom"]) })
});

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function rounded(value, digits = 3) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function luminance(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function rgbDistance(r, g, b, reference) { return Math.hypot(r - reference.r, g - reference.g, b - reference.b); }
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function stats(values) {
  if (!values.length) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}
function colorStats(samples) {
  const r = stats(samples.map((sample) => sample.r));
  const g = stats(samples.map((sample) => sample.g));
  const b = stats(samples.map((sample) => sample.b));
  const lum = stats(samples.map((sample) => sample.luminance));
  return {
    mean: { r: r.mean, g: g.mean, b: b.mean },
    luminanceMean: lum.mean,
    luminanceStdDev: lum.stdDev,
    colorSpread: (r.stdDev + g.stdDev + b.stdDev) / 3
  };
}

function validateInput(width, height, data, sourceWidth, sourceHeight, region) {
  const imageWidth = Math.floor(Number(width));
  const imageHeight = Math.floor(Number(height));
  if (!Number.isInteger(imageWidth) || imageWidth < 48 || !Number.isInteger(imageHeight) || imageHeight < 48) throw new RangeError("Macro analysis requires image dimensions of at least 48 × 48 pixels.");
  if (!(data instanceof Uint8ClampedArray) || data.length !== imageWidth * imageHeight * 4) throw new TypeError("Macro analysis requires RGBA ImageData pixels matching width and height.");
  const originalWidth = Math.floor(Number(sourceWidth ?? imageWidth));
  const originalHeight = Math.floor(Number(sourceHeight ?? imageHeight));
  if (!Number.isInteger(originalWidth) || originalWidth < imageWidth || !Number.isInteger(originalHeight) || originalHeight < imageHeight) throw new RangeError("Macro source dimensions must be valid and at least as large as the sampled image.");
  if (!Object.hasOwn(REGIONS, region)) throw new RangeError("Macro region must be a supported corner or edge region.");
  return { imageWidth, imageHeight, originalWidth, originalHeight, definition: REGIONS[region] };
}

function pixelAt(data, width, x, y) {
  const offset = (y * width + x) * 4;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return { r, g, b, luminance: luminance(r, g, b) };
}

function backgroundSamples(width, height, data, sides) {
  const bandX = Math.max(5, Math.round(width * 0.08));
  const bandY = Math.max(5, Math.round(height * 0.08));
  const samples = [];
  const seen = new Uint8Array(width * height);
  function collect(x0, x1, y0, y1) {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const key = y * width + x;
        if (seen[key]) continue;
        seen[key] = 1;
        samples.push(pixelAt(data, width, x, y));
      }
    }
  }
  for (const side of sides) {
    if (side === "left") collect(0, bandX, Math.round(height * 0.08), Math.round(height * 0.92));
    if (side === "right") collect(width - bandX, width, Math.round(height * 0.08), Math.round(height * 0.92));
    if (side === "top") collect(Math.round(width * 0.08), Math.round(width * 0.92), 0, bandY);
    if (side === "bottom") collect(Math.round(width * 0.08), Math.round(width * 0.92), height - bandY, height);
  }
  if (!samples.length) throw new Error("No background sampling region is available.");
  return {
    r: median(samples.map((sample) => sample.r)),
    g: median(samples.map((sample) => sample.g)),
    b: median(samples.map((sample) => sample.b))
  };
}

function createMask(width, height, data, background, threshold) {
  const mask = new Uint8Array(width * height);
  let foreground = 0;
  let contrastSum = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = pixelAt(data, width, x, y);
      const distance = rgbDistance(pixel.r, pixel.g, pixel.b, background);
      if (distance >= threshold) {
        mask[y * width + x] = 1;
        foreground += 1;
        contrastSum += distance;
      }
    }
  }
  return { mask, foregroundFraction: foreground / (width * height), meanForegroundContrast: foreground ? contrastSum / foreground : 0 };
}

function boundaryProfile(mask, width, height, side) {
  const profile = [];
  if (side === "left" || side === "right") {
    for (let y = 0; y < height; y += 1) {
      let boundary = -1;
      if (side === "left") {
        for (let x = 0; x < width; x += 1) if (mask[y * width + x]) { boundary = x; break; }
      } else {
        for (let x = width - 1; x >= 0; x -= 1) if (mask[y * width + x]) { boundary = x; break; }
      }
      if (boundary >= 0) profile.push({ coordinate: y, boundary });
    }
  } else {
    for (let x = 0; x < width; x += 1) {
      let boundary = -1;
      if (side === "top") {
        for (let y = 0; y < height; y += 1) if (mask[y * width + x]) { boundary = y; break; }
      } else {
        for (let y = height - 1; y >= 0; y -= 1) if (mask[y * width + x]) { boundary = y; break; }
      }
      if (boundary >= 0) profile.push({ coordinate: x, boundary });
    }
  }
  return profile;
}

function fitProfile(profile) {
  if (profile.length < 12) return null;
  const start = Math.floor(profile.length * 0.12);
  const end = Math.ceil(profile.length * 0.88);
  const points = profile.slice(start, end);
  const n = points.length;
  if (n < 8) return null;
  const meanX = points.reduce((sum, point) => sum + point.coordinate, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.boundary, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point.coordinate - meanX) * (point.boundary - meanY);
    denominator += (point.coordinate - meanX) ** 2;
  }
  const slope = denominator ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  const residuals = points.map((point) => ({ ...point, residual: point.boundary - (slope * point.coordinate + intercept) }));
  const rms = Math.sqrt(residuals.reduce((sum, point) => sum + point.residual ** 2, 0) / residuals.length);
  const maxAbs = Math.max(...residuals.map((point) => Math.abs(point.residual)));
  return { points, slope, intercept, residuals, rms, maxAbs };
}

function cornerAbruptness(profile, region, side, shortSide) {
  if (profile.length < 12) return { maxJump: 0, location: null };
  const towardStart = (region.startsWith("top") && (side === "left" || side === "right")) || (region.endsWith("left") && (side === "top" || side === "bottom"));
  const ordered = towardStart ? profile : [...profile].reverse();
  const window = ordered.slice(0, Math.max(8, Math.floor(ordered.length * 0.32)));
  let maxJump = 0;
  let location = null;
  for (let index = 2; index < window.length; index += 1) {
    const first = window[index - 2].boundary;
    const second = window[index - 1].boundary;
    const third = window[index].boundary;
    const jump = Math.abs((third - second) - (second - first));
    if (jump > maxJump) {
      maxJump = jump;
      location = window[index];
    }
  }
  return { maxJump, normalizedAbruptness: maxJump / shortSide, location };
}

function boundaryLookup(profiles) {
  const maps = new Map();
  for (const [side, profile] of Object.entries(profiles)) maps.set(side, new Map(profile.map((point) => [point.coordinate, point.boundary])));
  return maps;
}

function distanceInside(side, x, y, map) {
  const key = side === "left" || side === "right" ? y : x;
  const boundary = map.get(key);
  if (!Number.isFinite(boundary)) return null;
  if (side === "left") return x - boundary;
  if (side === "right") return boundary - x;
  if (side === "top") return y - boundary;
  return boundary - y;
}

function largestCluster(width, height, candidateMask) {
  const visited = new Uint8Array(candidateMask.length);
  let best = null;
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let seed = 0; seed < candidateMask.length; seed += 1) {
    if (!candidateMask[seed] || visited[seed]) continue;
    const queue = [seed];
    visited[seed] = 1;
    let cursor = 0;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let luminanceDeltaSum = 0;
    while (cursor < queue.length) {
      const index = queue[cursor++];
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      luminanceDeltaSum += candidateMask[index];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!candidateMask[next] || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    if (!best || count > best.count) best = { count, minX, minY, maxX, maxY, meanLuminanceDelta: luminanceDeltaSum / count };
  }
  return best;
}

function toneAnalysis({ width, height, data, mask, profiles, sides, definition }) {
  const lookup = boundaryLookup(profiles);
  const shortSide = Math.min(width, height);
  const candidateDepth = Math.max(5, Math.round(shortSide * 0.08));
  const referenceNear = Math.max(candidateDepth + 4, Math.round(shortSide * 0.13));
  const referenceFar = Math.max(referenceNear + 5, Math.round(shortSide * 0.24));
  const referenceSamples = [];
  const candidatePixels = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      const distances = sides.map((side) => distanceInside(side, x, y, lookup.get(side))).filter((value) => Number.isFinite(value) && value >= 0);
      if (!distances.length) continue;
      const distance = definition.kind === "corner" ? Math.min(...distances) : distances[0];
      if (distance >= referenceNear && distance <= referenceFar) referenceSamples.push({ ...pixelAt(data, width, x, y), x, y });
      if (distance >= 1 && distance <= candidateDepth) candidatePixels.push({ ...pixelAt(data, width, x, y), x, y });
    }
  }

  if (referenceSamples.length < Math.max(80, Math.round(shortSide * 0.5))) {
    return { available: false, reason: "Not enough stable interior border pixels were available to establish a macro tone reference.", reference: null, signal: null };
  }
  const reference = colorStats(referenceSamples);
  const stable = reference.luminanceStdDev <= 14 && reference.colorSpread <= 18;
  if (!stable) {
    return {
      available: false,
      reason: "The interior border/reference area is too visually variable for a trustworthy whitening or color-loss inference. Use a same-printing reference or manual review.",
      reference: { luminanceStdDev: rounded(reference.luminanceStdDev, 2), colorSpread: rounded(reference.colorSpread, 2) },
      signal: null
    };
  }

  const candidateMask = new Float32Array(width * height);
  let zoneCount = 0;
  for (const pixel of candidatePixels) {
    zoneCount += 1;
    const deltaL = pixel.luminance - reference.luminanceMean;
    const deltaColor = rgbDistance(pixel.r, pixel.g, pixel.b, reference.mean);
    if (deltaL >= 28 && deltaColor >= 34) candidateMask[pixel.y * width + pixel.x] = deltaL;
  }
  const cluster = largestCluster(width, height, candidateMask);
  const minimumCluster = Math.max(5, Math.ceil(zoneCount * 0.0035));
  if (!cluster || cluster.count < minimumCluster) {
    return {
      available: true,
      reason: "A stable local border-tone reference was available and no concentrated lighter-tone anomaly crossed the review threshold.",
      reference: { luminanceStdDev: rounded(reference.luminanceStdDev, 2), colorSpread: rounded(reference.colorSpread, 2) },
      signal: null
    };
  }

  const boundingBox = {
    x: rounded(cluster.minX / width, 4),
    y: rounded(cluster.minY / height, 4),
    width: rounded((cluster.maxX - cluster.minX + 1) / width, 4),
    height: rounded((cluster.maxY - cluster.minY + 1) / height, 4)
  };
  const clusterFraction = cluster.count / Math.max(1, zoneCount);
  return {
    available: true,
    reason: "A stable local border-tone reference was available and a concentrated lighter-tone region crossed the review threshold.",
    reference: { luminanceStdDev: rounded(reference.luminanceStdDev, 2), colorSpread: rounded(reference.colorSpread, 2) },
    signal: {
      boundingBox,
      clusterFraction,
      meanLuminanceDelta: cluster.meanLuminanceDelta,
      severity: clamp01(0.18 + clusterFraction * 9 + cluster.meanLuminanceDelta / 220)
    }
  };
}

export function analyzeMacroCornerEdgeCapture({ width, height, data, sourceWidth, sourceHeight, region } = {}) {
  const { imageWidth, imageHeight, originalWidth, originalHeight, definition } = validateInput(width, height, data, sourceWidth, sourceHeight, region);
  const sides = definition.sides;
  const background = backgroundSamples(imageWidth, imageHeight, data, sides);
  const threshold = 34;
  const segmentation = createMask(imageWidth, imageHeight, data, background, threshold);
  const sourceShortSide = Math.min(originalWidth, originalHeight);
  const sourceMegapixels = (originalWidth * originalHeight) / 1_000_000;
  const resolutionAdequate = sourceShortSide >= 720 && sourceMegapixels >= 0.65;
  const foregroundUsable = segmentation.foregroundFraction >= 0.08 && segmentation.foregroundFraction <= 0.93;
  const contrastAdequate = segmentation.meanForegroundContrast >= 45;

  const profiles = Object.fromEntries(sides.map((side) => [side, boundaryProfile(segmentation.mask, imageWidth, imageHeight, side)]));
  const profileCoverageAdequate = sides.every((side) => profiles[side].length >= Math.max(20, Math.round((side === "left" || side === "right" ? imageHeight : imageWidth) * 0.3)));
  const shortSide = Math.min(imageWidth, imageHeight);
  const signals = [];

  if (profileCoverageAdequate) {
    if (definition.kind === "edge") {
      const side = sides[0];
      const fit = fitProfile(profiles[side]);
      const scale = side === "left" || side === "right" ? imageWidth : imageHeight;
      const roughness = fit ? fit.rms / scale : 0;
      const maxDeviation = fit ? fit.maxAbs / scale : 0;
      if (fit && (roughness >= 0.006 || maxDeviation >= 0.018)) {
        signals.push({
          type: "macro-edge-contour-anomaly",
          region,
          severity: rounded(clamp01(Math.max(roughness / 0.025, maxDeviation / 0.08))),
          confidence: rounded(clamp01((contrastAdequate ? 0.78 : 0.45) * (resolutionAdequate ? 1 : 0.7))),
          boundingBox: null,
          note: "The magnified physical edge departs from a locally fitted line more than the review threshold. Possible chip, notch, roughness, obstruction, or segmentation error; this is not a trimming claim."
        });
      }
    } else {
      const abrupt = sides.map((side) => ({ side, ...cornerAbruptness(profiles[side], region, side, shortSide) }));
      const worst = abrupt.sort((a, b) => b.maxJump - a.maxJump)[0];
      if (worst && worst.normalizedAbruptness >= 0.016) {
        signals.push({
          type: "macro-corner-contour-anomaly",
          region,
          severity: rounded(clamp01(worst.normalizedAbruptness / 0.09)),
          confidence: rounded(clamp01((contrastAdequate ? 0.76 : 0.44) * (resolutionAdequate ? 1 : 0.7))),
          boundingBox: null,
          note: "The magnified corner transition contains an abrupt contour change beyond the local smooth-transition threshold. Possible ding, chip, bend, obstruction, or segmentation error; natural corner radius alone is not treated as damage."
        });
      }
    }
  }

  const tone = profileCoverageAdequate ? toneAnalysis({ width: imageWidth, height: imageHeight, data, mask: segmentation.mask, profiles, sides, definition }) : { available: false, reason: "Physical edge coverage is insufficient to establish an interior tone reference.", reference: null, signal: null };
  if (tone.signal) {
    const type = definition.kind === "corner" ? "corner-border-tone-anomaly" : "edge-border-tone-anomaly";
    signals.push({
      type,
      region,
      severity: rounded(tone.signal.severity),
      confidence: rounded(clamp01(0.72 * (resolutionAdequate ? 1 : 0.72) * (contrastAdequate ? 1 : 0.75))),
      boundingBox: Object.freeze(tone.signal.boundingBox),
      note: "A concentrated lighter-tone region differs from a stable local border reference. Possible whitening, exposed stock, chipping, print variation, glare residue, or contamination; image analysis alone does not confirm the cause."
    });
  }

  const usable = resolutionAdequate && foregroundUsable && contrastAdequate && profileCoverageAdequate;
  const warnings = [];
  if (!resolutionAdequate) warnings.push("Retake the macro image at higher native resolution; the short side should be at least 720 pixels and the source at least 0.65 MP.");
  if (!foregroundUsable) warnings.push("Keep a visible strip of contrasting matte background outside the physical edge while filling most of the frame with the corner or edge.");
  if (!contrastAdequate) warnings.push("Increase physical-edge/background contrast and avoid glare before trusting macro contour evidence.");
  if (!profileCoverageAdequate) warnings.push("The selected corner/edge is not sufficiently visible to build a stable physical boundary profile.");
  if (!tone.available) warnings.push(tone.reason);

  return Object.freeze({
    analyzed: true,
    usable,
    method: tone.available ? "macro-corner-edge-review-v1+tone-stable" : "macro-corner-edge-review-v1+tone-unavailable",
    region,
    regionKind: definition.kind,
    sourceWidth: originalWidth,
    sourceHeight: originalHeight,
    captureQuality: Object.freeze({
      sourceShortSide,
      sourceMegapixels: rounded(sourceMegapixels, 2),
      resolutionAdequate,
      foregroundFraction: rounded(segmentation.foregroundFraction, 4),
      meanForegroundContrast: rounded(segmentation.meanForegroundContrast, 1),
      contrastAdequate,
      boundaryCoverageAdequate: profileCoverageAdequate
    }),
    toneReference: Object.freeze({
      available: tone.available,
      reason: tone.reason,
      ...(tone.reference ?? {})
    }),
    signals: Object.freeze(signals.map((signal) => Object.freeze(signal))),
    warnings: Object.freeze(warnings),
    limitations: Object.freeze([
      "Macro evidence is advisory and does not produce an official grade, subgrade, physical-authentication result, or trimming determination.",
      "Lighter-tone candidates are not confirmed whitening: print design, glare, contamination, sleeve residue, exposed stock and image processing can look similar.",
      "A stable local border reference is required before tone anomaly review is enabled; visually variable borders fail closed.",
      "Macro capture complements whole-card contour and raking-light evidence but does not replace hands-on or professional grading inspection."
    ]),
    advisoryOnly: true,
    officialGradeImpactClaim: false,
    whiteningConfirmed: false,
    trimmingClaim: false,
    physicalAuthenticationClaim: false
  });
}

export const MACRO_CORNER_EDGE_REGIONS = Object.freeze(Object.keys(REGIONS));
