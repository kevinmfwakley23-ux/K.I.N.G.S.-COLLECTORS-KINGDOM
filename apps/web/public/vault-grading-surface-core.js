function finiteDimension(value, name) {
  const number = Math.floor(Number(value));
  if (!Number.isInteger(number) || number < 16) throw new RangeError(`${name} must be at least 16.`);
  return number;
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validatePixels(data, width, height, name) {
  if (!(data instanceof Uint8ClampedArray) || data.length !== width * height * 4) {
    throw new TypeError(`${name} must be an RGBA ImageData buffer matching width and height.`);
  }
}

function connectedComponents(mask, values, width, height) {
  const visited = new Uint8Array(mask.length);
  const components = [];
  const neighborOffsets = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    const queue = [start];
    visited[start] = 1;
    let cursor = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let count = 0;
    let total = 0;
    let peak = 0;
    while (cursor < queue.length) {
      const index = queue[cursor++];
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      count += 1;
      total += values[index];
      peak = Math.max(peak, values[index]);
      for (const [dx, dy] of neighborOffsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!mask[next] || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    components.push({ minX, maxX, minY, maxY, count, mean: total / count, peak });
  }
  return components;
}

export function compareRakingLightCaptures({ width, height, dataA, dataB } = {}) {
  const imageWidth = finiteDimension(width, "Surface comparison width");
  const imageHeight = finiteDimension(height, "Surface comparison height");
  validatePixels(dataA, imageWidth, imageHeight, "First raking-light capture");
  validatePixels(dataB, imageWidth, imageHeight, "Second raking-light capture");

  const pixelCount = imageWidth * imageHeight;
  const lumA = new Float32Array(pixelCount);
  const lumB = new Float32Array(pixelCount);
  let sumA = 0;
  let sumB = 0;
  for (let pixel = 0, offset = 0; pixel < pixelCount; pixel += 1, offset += 4) {
    const a = luminance(dataA[offset], dataA[offset + 1], dataA[offset + 2]);
    const b = luminance(dataB[offset], dataB[offset + 1], dataB[offset + 2]);
    lumA[pixel] = a;
    lumB[pixel] = b;
    sumA += a;
    sumB += b;
  }
  const meanA = sumA / pixelCount;
  const meanB = sumB / pixelCount;
  const differences = new Float32Array(pixelCount);
  const sampledDifferences = [];
  const insetX = Math.max(2, Math.floor(imageWidth * 0.04));
  const insetY = Math.max(2, Math.floor(imageHeight * 0.04));
  for (let y = insetY; y < imageHeight - insetY; y += 1) {
    for (let x = insetX; x < imageWidth - insetX; x += 1) {
      const index = y * imageWidth + x;
      const difference = Math.abs((lumA[index] - meanA) - (lumB[index] - meanB));
      differences[index] = difference;
      sampledDifferences.push(difference);
    }
  }

  const center = median(sampledDifferences);
  const deviations = sampledDifferences.map((value) => Math.abs(value - center));
  const mad = median(deviations);
  const threshold = Math.max(18, center + Math.max(10, mad * 4.5));
  const mask = new Uint8Array(pixelCount);
  let flaggedPixels = 0;
  for (let y = insetY; y < imageHeight - insetY; y += 1) {
    for (let x = insetX; x < imageWidth - insetX; x += 1) {
      const index = y * imageWidth + x;
      if (differences[index] < threshold) continue;
      mask[index] = 1;
      flaggedPixels += 1;
    }
  }

  const maxComponentArea = pixelCount * 0.025;
  const components = connectedComponents(mask, differences, imageWidth, imageHeight)
    .filter((component) => component.count >= 3 && component.count <= maxComponentArea)
    .map((component) => {
      const boxWidth = component.maxX - component.minX + 1;
      const boxHeight = component.maxY - component.minY + 1;
      const longSide = Math.max(boxWidth, boxHeight);
      const shortSide = Math.max(1, Math.min(boxWidth, boxHeight));
      const elongation = longSide / shortSide;
      const areaFraction = component.count / pixelCount;
      const linear = elongation >= 3 && longSide >= 5;
      const localized = component.count >= 4 && areaFraction <= 0.01;
      const strength = clamp01((component.mean - threshold) / 80 + component.peak / 510);
      return Object.freeze({
        boundingBox: Object.freeze({
          x: rounded(component.minX / imageWidth),
          y: rounded(component.minY / imageHeight),
          width: rounded(boxWidth / imageWidth),
          height: rounded(boxHeight / imageHeight)
        }),
        pixelCount: component.count,
        areaFraction: rounded(areaFraction, 5),
        meanDifference: rounded(component.mean, 2),
        peakDifference: rounded(component.peak, 2),
        elongation: rounded(elongation, 2),
        shape: linear ? "linear" : localized ? "localized" : "irregular",
        reviewCandidate: (linear || localized) && strength >= 0.2,
        severity: rounded(strength),
        confidence: rounded(clamp01(0.45 + (linear ? 0.2 : 0) + (localized ? 0.1 : 0) + Math.min(0.15, component.peak / 1000)))
      });
    })
    .filter((component) => component.reviewCandidate)
    .sort((a, b) => b.confidence - a.confidence || b.severity - a.severity)
    .slice(0, 20);

  const signals = components.map((component) => Object.freeze({
    type: "surface-reflectance-anomaly",
    shape: component.shape,
    boundingBox: component.boundingBox,
    severity: component.severity,
    confidence: component.confidence,
    note: component.shape === "linear"
      ? "Linear reflectance change between opposite raking-light captures. Possible scratch, scuff, print line, crease edge, or lighting/registration artifact; inspect the marked region at higher magnification."
      : "Localized reflectance change between opposite raking-light captures. Possible dent, indentation, scuff, gloss disturbance, stain, or lighting/registration artifact; inspect the marked region at higher magnification."
  }));

  const anomalyFraction = flaggedPixels / Math.max(1, sampledDifferences.length);
  return Object.freeze({
    analyzed: true,
    method: "paired-raking-light-difference-v1",
    threshold: rounded(threshold, 2),
    medianDifference: rounded(center, 2),
    medianAbsoluteDeviation: rounded(mad, 2),
    anomalyFraction: rounded(anomalyFraction, 5),
    signals: Object.freeze(signals),
    advisoryOnly: true,
    scratchConfirmed: false,
    surfaceDefectConfirmed: false,
    limitations: Object.freeze([
      "The two captures must show the same card aligned to the same normalized crop; misregistration can create false reflectance signals.",
      "This detector finds lighting-dependent surface changes. It does not distinguish every scratch, print line, dent, gloss change, artwork texture, or refractor/foil effect without closer review.",
      "Foil, holographic and highly reflective cards require more capture angles and lower-confidence interpretation."
    ])
  });
}
