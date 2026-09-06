const DEFAULT_REFERENCE_WIDTH_MM = 25;
const DEFAULT_REFERENCE_HEIGHT_MM = 25;

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasMeasurementInput(fields = {}) {
  return [
    "referenceWidthMm", "referenceHeightMm", "referenceTopWidthPx", "referenceBottomWidthPx",
    "referenceLeftHeightPx", "referenceRightHeightPx", "cardTopWidthPx", "cardBottomWidthPx",
    "cardLeftHeightPx", "cardRightHeightPx"
  ].some((key) => String(fields[key] ?? "").trim() !== "");
}

function positive(fields, key, label, maximum = 100000) {
  const number = numeric(fields[key]);
  if (number === null || number <= 0 || number > maximum) throw new RangeError(`${label} must be a positive number.`);
  return number;
}

function bounded(fields, key, label) {
  const number = numeric(fields[key]);
  if (number === null || number < 0 || number > 1) throw new RangeError(`${label} must be between 0 and 1.`);
  return Math.round(number * 1000) / 1000;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variation(a, b) {
  return Math.abs(a - b) / average([a, b]);
}

function rounded(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeFields(fields = {}) {
  return Object.freeze({
    referenceWidthMm: positive(fields, "referenceWidthMm", "Reference width millimeters", 500),
    referenceHeightMm: positive(fields, "referenceHeightMm", "Reference height millimeters", 500),
    referenceTopWidthPx: positive(fields, "referenceTopWidthPx", "Reference top width pixels"),
    referenceBottomWidthPx: positive(fields, "referenceBottomWidthPx", "Reference bottom width pixels"),
    referenceLeftHeightPx: positive(fields, "referenceLeftHeightPx", "Reference left height pixels"),
    referenceRightHeightPx: positive(fields, "referenceRightHeightPx", "Reference right height pixels"),
    cardTopWidthPx: positive(fields, "cardTopWidthPx", "Card top width pixels"),
    cardBottomWidthPx: positive(fields, "cardBottomWidthPx", "Card bottom width pixels"),
    cardLeftHeightPx: positive(fields, "cardLeftHeightPx", "Card left height pixels"),
    cardRightHeightPx: positive(fields, "cardRightHeightPx", "Card right height pixels"),
    confidence: bounded({ confidence: fields.confidence ?? 0.7 }, "confidence", "Calibration confidence")
  });
}

export function defaultCalibrationReferenceFields() {
  return Object.freeze({
    referenceWidthMm: DEFAULT_REFERENCE_WIDTH_MM,
    referenceHeightMm: DEFAULT_REFERENCE_HEIGHT_MM,
    confidence: 0.7
  });
}

export function previewBrowserCalibrationInputs({ fields = {}, cardSizeProfile = {} } = {}) {
  if (!hasMeasurementInput(fields)) {
    return Object.freeze({
      hasInput: false,
      valid: false,
      message: "Add a same-plane known-size marker measurement to unlock physical millimeters.",
      measuredCard: null,
      failureReasons: Object.freeze(["no-independent-reference-input"])
    });
  }
  const failureReasons = [];
  let normalized;
  try {
    normalized = normalizeFields(fields);
  } catch (error) {
    return Object.freeze({
      hasInput: true,
      valid: false,
      message: error instanceof Error ? error.message : "Calibration fields are invalid.",
      measuredCard: null,
      failureReasons: Object.freeze(["invalid-calibration-input"])
    });
  }
  const referenceWidthPx = average([normalized.referenceTopWidthPx, normalized.referenceBottomWidthPx]);
  const referenceHeightPx = average([normalized.referenceLeftHeightPx, normalized.referenceRightHeightPx]);
  const cardWidthPx = average([normalized.cardTopWidthPx, normalized.cardBottomWidthPx]);
  const cardHeightPx = average([normalized.cardLeftHeightPx, normalized.cardRightHeightPx]);
  const referenceAspectDeviation = Math.abs(referenceWidthPx / referenceHeightPx - normalized.referenceWidthMm / normalized.referenceHeightMm) / (normalized.referenceWidthMm / normalized.referenceHeightMm);
  const referenceVariation = Math.max(variation(normalized.referenceTopWidthPx, normalized.referenceBottomWidthPx), variation(normalized.referenceLeftHeightPx, normalized.referenceRightHeightPx));
  const cardVariation = Math.max(variation(normalized.cardTopWidthPx, normalized.cardBottomWidthPx), variation(normalized.cardLeftHeightPx, normalized.cardRightHeightPx));
  if (referenceAspectDeviation > 0.08) failureReasons.push("reference aspect is outside tolerance");
  if (referenceVariation > 0.08) failureReasons.push("reference opposing sides differ too much");
  if (cardVariation > 0.16) failureReasons.push("card opposing sides differ too much");
  if (normalized.confidence < 0.5) failureReasons.push("confidence is below the calibration floor");
  const pixelsPerMillimeter = average([referenceWidthPx / normalized.referenceWidthMm, referenceHeightPx / normalized.referenceHeightMm]);
  const measuredCard = Object.freeze({
    widthMm: rounded(cardWidthPx / pixelsPerMillimeter),
    heightMm: rounded(cardHeightPx / pixelsPerMillimeter),
    widthDeltaMm: Number.isFinite(cardSizeProfile.widthMm) ? rounded(cardWidthPx / pixelsPerMillimeter - cardSizeProfile.widthMm) : null,
    heightDeltaMm: Number.isFinite(cardSizeProfile.heightMm) ? rounded(cardHeightPx / pixelsPerMillimeter - cardSizeProfile.heightMm) : null
  });
  return Object.freeze({
    hasInput: true,
    valid: failureReasons.length === 0,
    message: failureReasons.length
      ? `Physical scale will fail closed: ${failureReasons.join("; ")}.`
      : `Physical scale ready: card measures about ${measuredCard.widthMm} × ${measuredCard.heightMm} mm from the independent marker.`,
    measuredCard,
    failureReasons: Object.freeze(failureReasons),
    referenceAspectDeviation: rounded(referenceAspectDeviation, 4),
    referenceVariation: rounded(referenceVariation, 4),
    cardVariation: rounded(cardVariation, 4)
  });
}

export function createBrowserCalibrationEvidence({ sourceMediaId, side = "front", fields = {}, cardSizeProfile = {} } = {}) {
  if (!sourceMediaId) throw new Error("A matched private Vault media id is required before calibration evidence can be persisted.");
  const normalized = normalizeFields(fields);
  return Object.freeze({
    referenceType: normalized.referenceWidthMm === normalized.referenceHeightMm ? "kingdom-square-fiducial-v1" : "kingdom-rectangle-fiducial-v1",
    referenceLabel: `${normalized.referenceWidthMm} × ${normalized.referenceHeightMm} mm same-plane scale marker`,
    sourceMediaId,
    side,
    samePlane: true,
    referenceCropped: false,
    referenceAmbiguous: false,
    referenceWidthMm: normalized.referenceWidthMm,
    referenceHeightMm: normalized.referenceHeightMm,
    referenceTopWidthPx: normalized.referenceTopWidthPx,
    referenceBottomWidthPx: normalized.referenceBottomWidthPx,
    referenceLeftHeightPx: normalized.referenceLeftHeightPx,
    referenceRightHeightPx: normalized.referenceRightHeightPx,
    cardTopWidthPx: normalized.cardTopWidthPx,
    cardBottomWidthPx: normalized.cardBottomWidthPx,
    cardLeftHeightPx: normalized.cardLeftHeightPx,
    cardRightHeightPx: normalized.cardRightHeightPx,
    confidence: normalized.confidence,
    cardSizeProfileId: cardSizeProfile.id ?? "custom",
    advisoryOnly: true,
    physicalAuthentication: false,
    note: "Browser-entered calibration measurements use an independent known-size marker in the same capture. The selected card profile is comparison evidence only, not the scale source."
  });
}
