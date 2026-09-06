function bounded(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) throw new RangeError(`${label} must be between 0 and 1.`);
  return numeric;
}

function rounded(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function calibratedSpan(boundingBox, calibration) {
  const card = calibration?.measuredCard;
  if (calibration?.valid !== true || !Number.isFinite(card?.widthMm) || !Number.isFinite(card?.heightMm)) return null;
  const widthMm = rounded(boundingBox.width * card.widthMm, 2);
  const heightMm = rounded(boundingBox.height * card.heightMm, 2);
  const confidence = Number.isFinite(calibration.confidence) ? Math.max(0, Math.min(1, calibration.confidence)) : 0;
  return Object.freeze({
    approximateWidthMm: widthMm,
    approximateHeightMm: heightMm,
    approximateMajorSpanMm: Math.max(widthMm, heightMm),
    calibrationVersion: calibration.calibrationVersion ?? "kingdom-physical-scale-calibration-v1",
    calibrationSourceMediaId: calibration.sourceMediaId ?? null,
    calibrationConfidence: rounded(confidence, 3),
    measurementAuthority: "independent-known-size-reference-in-same-capture",
    exactPhysicalMeasurement: false,
    approximatePhysicalMeasurement: true,
    disclaimer: "Millimeter spans are approximate bounding-box spans derived from a validated in-frame scale reference and card-plane estimate. They are not microscopic traced defect lengths."
  });
}

export function normalizedBoundingBoxExtent(boundingBox, calibration = null) {
  if (boundingBox == null) return null;
  if (!boundingBox || typeof boundingBox !== "object" || Array.isArray(boundingBox)) throw new TypeError("Bounding box must be an object.");
  const x = bounded(boundingBox.x, "Bounding box x");
  const y = bounded(boundingBox.y, "Bounding box y");
  const width = bounded(boundingBox.width, "Bounding box width");
  const height = bounded(boundingBox.height, "Bounding box height");
  if (x + width > 1.0001 || y + height > 1.0001) throw new RangeError("Bounding box must remain inside the normalized card frame.");

  const calibratedMillimeters = calibratedSpan({ x, y, width, height }, calibration);
  return Object.freeze({
    normalizedArea: rounded(width * height),
    affectedFacePercent: rounded(width * height * 100, 2),
    horizontalSpanPercent: rounded(width * 100, 2),
    verticalSpanPercent: rounded(height * 100, 2),
    estimatedMajorSpanPercent: rounded(Math.max(width, height) * 100, 2),
    calibratedMillimeters,
    measurementAuthority: calibratedMillimeters ? "normalized-card-frame-plus-independent-scale-calibration" : "normalized-image-geometry-only",
    disclaimer: calibratedMillimeters
      ? "Normalized extent remains the primary detector metric. Millimeter values are approximate physical spans made available only because valid independent calibration evidence exists."
      : "Normalized extent is not an exact physical defect length. Millimeters require reliable physical calibration and a detector capable of tracing the actual defect path."
  });
}

export function defectExtent(defect = {}, calibration = null) {
  const extent = normalizedBoundingBoxExtent(defect.boundingBox ?? null, calibration);
  return Object.freeze({
    type: defect.type ?? null,
    region: defect.region ?? null,
    extent,
    exactPhysicalMeasurement: false,
    approximatePhysicalMeasurement: Boolean(extent?.calibratedMillimeters)
  });
}
