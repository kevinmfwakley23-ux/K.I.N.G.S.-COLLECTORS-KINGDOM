const CALIBRATION_REFERENCE_TYPES = new Set(["kingdom-square-fiducial-v1", "kingdom-rectangle-fiducial-v1", "known-size-reference-v1"]);
const SIDES = new Set(["front", "back"]);
const MAX_REFERENCE_MM = 500;
const MAX_PIXEL_LENGTH = 100000;
const MAX_ASPECT_DEVIATION = 0.08;
const MAX_REFERENCE_OPPOSING_SIDE_VARIATION = 0.08;
const MAX_CARD_OPPOSING_SIDE_VARIATION = 0.16;

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
}

function text(value, label, max = 160) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > max || /[\u0000-\u001f\u007f]/.test(cleaned)) throw new RangeError(`${label} is invalid.`);
  return cleaned;
}

function optionalText(value, label, max = 500) {
  if (value === undefined || value === null || value === "") return null;
  return text(value, label, max);
}

function positive(value, label, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > max) throw new RangeError(`${label} must be greater than zero and within the supported range.`);
  return numeric;
}

function bounded(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) throw new RangeError(`${label} must be between 0 and 1.`);
  return Math.round(numeric * 1000) / 1000;
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variation(a, b) {
  const first = positive(a, "Variation value", MAX_PIXEL_LENGTH);
  const second = positive(b, "Variation value", MAX_PIXEL_LENGTH);
  return Math.abs(first - second) / average([first, second]);
}

function meanPair(first, second, label) {
  return average([
    positive(first, `${label} first side pixels`, MAX_PIXEL_LENGTH),
    positive(second, `${label} opposite side pixels`, MAX_PIXEL_LENGTH)
  ]);
}

function profileComparison(card, profile = {}) {
  if (!Number.isFinite(card?.widthMm) || !Number.isFinite(card?.heightMm)) {
    return freeze({
      available: false,
      profileId: profile.id ?? "custom",
      withinProfileTolerance: null,
      widthDeltaMm: null,
      heightDeltaMm: null,
      limitation: "No valid measured card dimensions are available for advisory profile comparison."
    });
  }
  if (!Number.isFinite(profile.nominalWidthMm) || !Number.isFinite(profile.nominalHeightMm)) {
    return freeze({
      available: false,
      profileId: profile.id ?? "custom",
      withinProfileTolerance: null,
      widthDeltaMm: null,
      heightDeltaMm: null,
      limitation: "No nominal card-size profile is available for advisory dimension comparison."
    });
  }
  const widthDeltaMm = rounded(card.widthMm - profile.nominalWidthMm, 2);
  const heightDeltaMm = rounded(card.heightMm - profile.nominalHeightMm, 2);
  const widthDeltaPercent = rounded(Math.abs(widthDeltaMm) / profile.nominalWidthMm, 4);
  const heightDeltaPercent = rounded(Math.abs(heightDeltaMm) / profile.nominalHeightMm, 4);
  const withinProfileTolerance = Math.abs(widthDeltaPercent) <= 0.035 && Math.abs(heightDeltaPercent) <= 0.035;
  return freeze({
    available: true,
    profileId: profile.id ?? null,
    nominalWidthMm: profile.nominalWidthMm,
    nominalHeightMm: profile.nominalHeightMm,
    measuredWidthMm: card.widthMm,
    measuredHeightMm: card.heightMm,
    widthDeltaMm,
    heightDeltaMm,
    widthDeltaPercent,
    heightDeltaPercent,
    withinProfileTolerance,
    advisoryOnly: true,
    authenticityClaim: false,
    limitation: "Measured dimensions are advisory capture evidence only. Card-size agreement does not authenticate the physical card or rule out trimming, warping, sleeve distortion or camera/capture error."
  });
}

function fail(input, reasons, profile) {
  const confidence = input.confidence === undefined ? 0 : bounded(input.confidence, "Calibration confidence");
  const sourceMediaId = input.sourceMediaId == null ? null : text(input.sourceMediaId, "Calibration source media ID");
  const side = SIDES.has(input.side) ? input.side : null;
  return freeze({
    evidenceClass: "physical-scale-calibration",
    calibrationVersion: "kingdom-physical-scale-calibration-v1",
    sourceMediaId,
    side,
    referenceType: input.referenceType == null ? null : text(input.referenceType, "Calibration reference type", 80),
    valid: false,
    physicalMeasurementAvailable: false,
    failureReasons: reasons,
    confidence,
    pixelToMillimeter: null,
    measuredCard: null,
    profileComparison: profileComparison({ widthMm: null, heightMm: null }, profile),
    limitations: freeze([
      "Physical millimeter measurement failed closed because the independent known-size reference was absent, ambiguous, distorted, cropped or outside tolerance.",
      "Normalized image-relative metrics remain usable, but no physical size or defect-millimeter conversion should be claimed from this capture."
    ]),
    advisoryOnly: true,
    officialGrade: false,
    physicalAuthentication: false,
    mutatesTreasure: false
  });
}

export function normalizeCalibrationEvidence(input = {}, { cardSizeProfile = {} } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Calibration evidence must be an object.");
  const referenceType = text(input.referenceType ?? "known-size-reference-v1", "Calibration reference type", 80);
  if (!CALIBRATION_REFERENCE_TYPES.has(referenceType)) throw new RangeError(`Unsupported calibration reference type: ${referenceType}`);
  const sourceMediaId = text(input.sourceMediaId, "Calibration source media ID");
  const side = text(input.side ?? "front", "Calibration side", 20);
  if (!SIDES.has(side)) throw new RangeError("Calibration side must be front or back.");
  const failureReasons = [];
  if (input.referenceCropped === true) failureReasons.push("reference-cropped");
  if (input.referenceAmbiguous === true) failureReasons.push("reference-ambiguous");
  if (input.samePlane === false) failureReasons.push("reference-not-on-same-plane");

  const confidence = bounded(input.confidence ?? 0.75, "Calibration confidence");
  const referenceWidthMm = positive(input.referenceWidthMm, "Reference width millimeters", MAX_REFERENCE_MM);
  const referenceHeightMm = positive(input.referenceHeightMm, "Reference height millimeters", MAX_REFERENCE_MM);
  const referenceTopWidthPx = positive(input.referenceTopWidthPx, "Reference top width pixels", MAX_PIXEL_LENGTH);
  const referenceBottomWidthPx = positive(input.referenceBottomWidthPx, "Reference bottom width pixels", MAX_PIXEL_LENGTH);
  const referenceLeftHeightPx = positive(input.referenceLeftHeightPx, "Reference left height pixels", MAX_PIXEL_LENGTH);
  const referenceRightHeightPx = positive(input.referenceRightHeightPx, "Reference right height pixels", MAX_PIXEL_LENGTH);
  const cardTopWidthPx = positive(input.cardTopWidthPx, "Card top width pixels", MAX_PIXEL_LENGTH);
  const cardBottomWidthPx = positive(input.cardBottomWidthPx, "Card bottom width pixels", MAX_PIXEL_LENGTH);
  const cardLeftHeightPx = positive(input.cardLeftHeightPx, "Card left height pixels", MAX_PIXEL_LENGTH);
  const cardRightHeightPx = positive(input.cardRightHeightPx, "Card right height pixels", MAX_PIXEL_LENGTH);

  const referenceWidthPx = meanPair(referenceTopWidthPx, referenceBottomWidthPx, "Reference width");
  const referenceHeightPx = meanPair(referenceLeftHeightPx, referenceRightHeightPx, "Reference height");
  const cardWidthPx = meanPair(cardTopWidthPx, cardBottomWidthPx, "Card width");
  const cardHeightPx = meanPair(cardLeftHeightPx, cardRightHeightPx, "Card height");
  const referenceAspectDeviation = Math.abs(referenceWidthPx / referenceHeightPx - referenceWidthMm / referenceHeightMm) / (referenceWidthMm / referenceHeightMm);
  const referenceWidthVariation = variation(referenceTopWidthPx, referenceBottomWidthPx);
  const referenceHeightVariation = variation(referenceLeftHeightPx, referenceRightHeightPx);
  const cardWidthVariation = variation(cardTopWidthPx, cardBottomWidthPx);
  const cardHeightVariation = variation(cardLeftHeightPx, cardRightHeightPx);

  if (referenceAspectDeviation > MAX_ASPECT_DEVIATION) failureReasons.push("reference-aspect-outside-tolerance");
  if (Math.max(referenceWidthVariation, referenceHeightVariation) > MAX_REFERENCE_OPPOSING_SIDE_VARIATION) failureReasons.push("reference-perspective-or-distortion-outside-tolerance");
  if (Math.max(cardWidthVariation, cardHeightVariation) > MAX_CARD_OPPOSING_SIDE_VARIATION) failureReasons.push("card-perspective-outside-tolerance");
  if (confidence < 0.5) failureReasons.push("calibration-confidence-too-low");

  if (failureReasons.length) return fail({ ...input, sourceMediaId, side, referenceType, confidence }, failureReasons, cardSizeProfile);

  const pixelsPerMillimeter = average([referenceWidthPx / referenceWidthMm, referenceHeightPx / referenceHeightMm]);
  const millimetersPerPixel = 1 / pixelsPerMillimeter;
  const measuredCard = freeze({
    widthMm: rounded(cardWidthPx * millimetersPerPixel, 2),
    heightMm: rounded(cardHeightPx * millimetersPerPixel, 2),
    topWidthMm: rounded(cardTopWidthPx * millimetersPerPixel, 2),
    bottomWidthMm: rounded(cardBottomWidthPx * millimetersPerPixel, 2),
    leftHeightMm: rounded(cardLeftHeightPx * millimetersPerPixel, 2),
    rightHeightMm: rounded(cardRightHeightPx * millimetersPerPixel, 2),
    widthUncertaintyMm: rounded(cardWidthVariation * cardWidthPx * millimetersPerPixel + (1 - confidence) * 1.5, 2),
    heightUncertaintyMm: rounded(cardHeightVariation * cardHeightPx * millimetersPerPixel + (1 - confidence) * 1.5, 2),
    perspectiveSkew: rounded(Math.max(cardWidthVariation, cardHeightVariation), 4),
    perspectiveAware: true
  });

  return freeze({
    evidenceClass: "physical-scale-calibration",
    calibrationVersion: "kingdom-physical-scale-calibration-v1",
    sourceMediaId,
    side,
    referenceType,
    referenceLabel: optionalText(input.referenceLabel, "Calibration reference label", 200),
    valid: true,
    physicalMeasurementAvailable: true,
    confidence,
    pixelToMillimeter: freeze({
      pixelsPerMillimeter: rounded(pixelsPerMillimeter, 4),
      millimetersPerPixel: rounded(millimetersPerPixel, 6),
      referenceWidthMm,
      referenceHeightMm,
      referenceWidthPx: rounded(referenceWidthPx, 2),
      referenceHeightPx: rounded(referenceHeightPx, 2),
      referenceAspectDeviation: rounded(referenceAspectDeviation, 4),
      referenceWidthVariation: rounded(referenceWidthVariation, 4),
      referenceHeightVariation: rounded(referenceHeightVariation, 4),
      measurementAuthority: "independent-known-size-reference-in-same-capture"
    }),
    measuredCard,
    profileComparison: profileComparison(measuredCard, cardSizeProfile),
    failureReasons: freeze([]),
    limitations: freeze([
      "Physical millimeter measurements come only from the independent known-size reference in the same capture.",
      "The selected card-size profile is used for advisory comparison only and never as the scale source.",
      "Calibration does not authenticate the physical card, prove factory dimensions, or classify manufacturing versus handling origin."
    ]),
    advisoryOnly: true,
    officialGrade: false,
    physicalAuthentication: false,
    mutatesTreasure: false
  });
}

export function bestCalibrationForMedia(records = [], sourceMediaId = null) {
  const candidates = [];
  for (const record of Array.isArray(records) ? records : []) {
    for (const calibration of record.analysis?.calibrationEvidence ?? []) {
      if (calibration?.valid === true && calibration.sourceMediaId === sourceMediaId) candidates.push({ record, calibration });
    }
  }
  candidates.sort((a, b) => Number(b.calibration.confidence ?? 0) - Number(a.calibration.confidence ?? 0));
  return candidates[0] ?? null;
}

export function summarizePhysicalCalibration(records = []) {
  const calibrations = [];
  for (const record of Array.isArray(records) ? records : []) {
    for (const calibration of record.analysis?.calibrationEvidence ?? []) calibrations.push({ record, calibration });
  }
  const valid = calibrations.filter((entry) => entry.calibration?.valid === true);
  valid.sort((a, b) => Number(b.calibration.confidence ?? 0) - Number(a.calibration.confidence ?? 0));
  const best = valid[0] ?? null;
  return freeze({
    available: valid.length > 0,
    calibrationVersion: "kingdom-physical-scale-calibration-v1",
    sourceCalibrationCount: calibrations.length,
    validCalibrationCount: valid.length,
    bestSourceAnalysisId: best?.record?.id ?? null,
    bestSourceMediaId: best?.calibration?.sourceMediaId ?? null,
    bestConfidence: best?.calibration?.confidence ?? 0,
    measuredCard: best?.calibration?.measuredCard ?? null,
    profileComparison: best?.calibration?.profileComparison ?? null,
    failureReasons: freeze([...new Set(calibrations.flatMap((entry) => entry.calibration?.failureReasons ?? []))]),
    measurementAuthority: valid.length ? "independent-known-size-reference-in-same-capture" : "no-valid-independent-scale-reference",
    physicalMeasurementAvailable: valid.length > 0,
    advisoryOnly: true,
    officialGrade: false,
    physicalAuthentication: false,
    limitations: freeze(valid.length ? best.calibration.limitations : [
      "No physical millimeter measurements are available until an in-frame known-size reference passes calibration tolerance.",
      "Card-size profiles cannot be used as the scale source."
    ])
  });
}

export const KINGDOM_CALIBRATION_REFERENCE_TYPES = freeze([...CALIBRATION_REFERENCE_TYPES].sort());
