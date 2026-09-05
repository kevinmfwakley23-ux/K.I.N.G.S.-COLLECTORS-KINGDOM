function bounded(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) throw new RangeError(`${label} must be between 0 and 1.`);
  return numeric;
}

function rounded(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizedBoundingBoxExtent(boundingBox) {
  if (boundingBox == null) return null;
  if (!boundingBox || typeof boundingBox !== "object" || Array.isArray(boundingBox)) throw new TypeError("Bounding box must be an object.");
  const x = bounded(boundingBox.x, "Bounding box x");
  const y = bounded(boundingBox.y, "Bounding box y");
  const width = bounded(boundingBox.width, "Bounding box width");
  const height = bounded(boundingBox.height, "Bounding box height");
  if (x + width > 1.0001 || y + height > 1.0001) throw new RangeError("Bounding box must remain inside the normalized card frame.");

  return Object.freeze({
    normalizedArea: rounded(width * height),
    affectedFacePercent: rounded(width * height * 100, 2),
    horizontalSpanPercent: rounded(width * 100, 2),
    verticalSpanPercent: rounded(height * 100, 2),
    estimatedMajorSpanPercent: rounded(Math.max(width, height) * 100, 2),
    calibratedMillimeters: null,
    measurementAuthority: "normalized-image-geometry-only",
    disclaimer: "Normalized extent is not an exact physical defect length. Millimeters require reliable physical calibration and a detector capable of tracing the actual defect path."
  });
}

export function defectExtent(defect = {}) {
  return Object.freeze({
    type: defect.type ?? null,
    region: defect.region ?? null,
    extent: normalizedBoundingBoxExtent(defect.boundingBox ?? null),
    exactPhysicalMeasurement: false
  });
}
