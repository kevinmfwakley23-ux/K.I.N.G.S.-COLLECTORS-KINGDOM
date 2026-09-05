const DEFECT_TYPES = new Set([
  "corner-whitening", "corner-rounding", "corner-ding", "corner-bend", "corner-layering", "corner-crease",
  "edge-chipping", "edge-roughness", "edge-notch", "edge-layering",
  "surface-scratch", "surface-scuff", "surface-print-line", "surface-dent", "surface-indentation", "surface-stain",
  "surface-wrinkle", "surface-crease", "gloss-loss", "print-spot", "registration", "focus", "color-fade", "discoloration",
  "suspected-trimming", "suspected-recoloration", "suspected-restoration", "suspected-cleaning", "suspected-altered-stock",
  "corner-contour-anomaly", "edge-contour-anomaly", "surface-reflectance-anomaly"
]);
const DETECTOR_TYPES = new Set(["contour", "paired-raking-light"]);

function bounded(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1.`);
  return Math.round(value * 1000) / 1000;
}

function safeText(value, name, max = 500) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} is required.`);
  const text = value.trim();
  if (text.length > max) throw new RangeError(`${name} is too long.`);
  return text;
}

function safeUrl(value, name) {
  const parsed = new URL(safeText(value, name, 2000));
  if (parsed.protocol !== "https:") throw new RangeError(`${name} must use HTTPS.`);
  return parsed.toString();
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child);
  return value;
}

export function normalizeDefectEvidence(input = {}) {
  const type = safeText(input.type, "Defect type", 80);
  if (!DEFECT_TYPES.has(type)) throw new RangeError(`Unsupported defect type: ${type}`);
  const region = safeText(input.region, "Defect region", 80);
  const sourceMediaId = safeText(input.sourceMediaId, "Source media ID", 160);
  const evidence = {
    type,
    region,
    severity: bounded(input.severity, "Defect severity"),
    confidence: bounded(input.confidence, "Defect confidence"),
    sourceMediaId,
    comparisonMediaId: input.comparisonMediaId == null ? null : safeText(input.comparisonMediaId, "Comparison media ID", 160),
    note: input.note == null ? null : safeText(input.note, "Defect note", 800),
    boundingBox: input.boundingBox == null ? null : {
      x: bounded(input.boundingBox.x, "Bounding box x"),
      y: bounded(input.boundingBox.y, "Bounding box y"),
      width: bounded(input.boundingBox.width, "Bounding box width"),
      height: bounded(input.boundingBox.height, "Bounding box height")
    }
  };
  if (evidence.boundingBox && (evidence.boundingBox.x + evidence.boundingBox.width > 1.0001 || evidence.boundingBox.y + evidence.boundingBox.height > 1.0001)) {
    throw new RangeError("Defect bounding box must remain inside the normalized image frame.");
  }
  return freeze(evidence);
}

export function createCaptureQualityEvidence(input = {}) {
  const warnings = Array.isArray(input.warnings) ? input.warnings.map((warning) => safeText(warning, "Capture warning", 240)) : [];
  return freeze({
    sourceMediaId: safeText(input.sourceMediaId, "Source media ID", 160),
    view: safeText(input.view, "Capture view", 80),
    cropComplete: input.cropComplete === true,
    resolutionAdequate: input.resolutionAdequate === true,
    focusAdequate: input.focusAdequate === true,
    glareAcceptable: input.glareAcceptable === true,
    perspectiveAcceptable: input.perspectiveAcceptable === true,
    analyzerConfidence: bounded(input.analyzerConfidence, "Capture analyzer confidence"),
    usableForPregrade: input.cropComplete === true && input.resolutionAdequate === true && input.focusAdequate === true && input.glareAcceptable === true && input.perspectiveAcceptable === true,
    warnings
  });
}

export function normalizeDetectorCoverage(input = {}) {
  const detector = safeText(input.detector, "Detector", 80);
  if (!DETECTOR_TYPES.has(detector)) throw new RangeError(`Unsupported detector coverage type: ${detector}`);
  const side = safeText(input.side, "Detector side", 20);
  if (!new Set(["front", "back"]).has(side)) throw new RangeError("Detector coverage side must be front or back.");
  if (!Array.isArray(input.sourceMediaIds) || input.sourceMediaIds.length < 1 || input.sourceMediaIds.length > 4) {
    throw new RangeError("Detector coverage requires 1 to 4 source media identifiers.");
  }
  const sourceMediaIds = [...new Set(input.sourceMediaIds.map((value) => safeText(value, "Detector source media ID", 160)))];
  const count = Number(input.reviewCandidateCount);
  if (!Number.isInteger(count) || count < 0 || count > 1000) throw new RangeError("Detector review candidate count must be an integer between 0 and 1000.");
  return freeze({
    detector,
    side,
    sourceMediaIds,
    completed: input.completed === true,
    usableForConditionInference: input.usableForConditionInference === true,
    reviewCandidateCount: count,
    method: safeText(input.method, "Detector method", 120),
    note: input.note == null ? null : safeText(input.note, "Detector coverage note", 500),
    advisoryOnly: true
  });
}

export function createAutographComparisonEvidence(input = {}) {
  const references = Array.isArray(input.references) ? input.references : [];
  if (references.length < 1) throw new RangeError("Autograph comparison requires at least one sourced reference exemplar.");
  const normalizedReferences = references.map((reference) => freeze({
    signerName: safeText(reference.signerName, "Reference signer name", 240),
    sourceLabel: safeText(reference.sourceLabel, "Reference source label", 240),
    sourceUrl: safeUrl(reference.sourceUrl, "Reference source URL"),
    observedAt: safeText(reference.observedAt, "Reference observation date", 40),
    similarity: bounded(reference.similarity, "Reference similarity"),
    notes: reference.notes == null ? null : safeText(reference.notes, "Reference notes", 800)
  }));
  const overallSimilarity = bounded(input.overallSimilarity, "Overall autograph similarity");
  return freeze({
    evidenceClass: "ai-signature-similarity-review",
    signerClaim: safeText(input.signerClaim, "Claimed signer", 240),
    sourceMediaId: safeText(input.sourceMediaId, "Autograph source media ID", 160),
    overallSimilarity,
    confidence: bounded(input.confidence, "Autograph comparison confidence"),
    comparedFeatures: Array.isArray(input.comparedFeatures) ? input.comparedFeatures.map((feature) => safeText(feature, "Compared feature", 120)) : [],
    references: normalizedReferences,
    authenticationClaim: false,
    professionalAuthenticationRequiredForAuthoritativeClaim: true,
    limitations: Array.isArray(input.limitations) ? input.limitations.map((item) => safeText(item, "Autograph limitation", 500)) : [],
    disclaimer: "Visual similarity is not professional autograph authentication. Ink chemistry/age, object evaluation, provenance and specialized spectral inspection are outside ordinary image comparison."
  });
}

export function createPregradeAnalysis(input = {}) {
  const defects = Array.isArray(input.defects) ? input.defects.map(normalizeDefectEvidence) : [];
  const captures = Array.isArray(input.captureQuality) ? input.captureQuality.map(createCaptureQualityEvidence) : [];
  const detectorCoverage = Array.isArray(input.detectorCoverage) ? input.detectorCoverage.map(normalizeDetectorCoverage) : [];
  const estimatedGradeRange = input.estimatedGradeRange == null ? null : {
    min: Number(input.estimatedGradeRange.min),
    max: Number(input.estimatedGradeRange.max)
  };
  if (estimatedGradeRange && (!Number.isFinite(estimatedGradeRange.min) || !Number.isFinite(estimatedGradeRange.max) || estimatedGradeRange.min < 1 || estimatedGradeRange.max > 10 || estimatedGradeRange.min > estimatedGradeRange.max)) {
    throw new RangeError("Estimated grade range must stay between 1 and 10 with min <= max.");
  }
  return freeze({
    evidenceClass: "ai-card-pregrade",
    analysisId: safeText(input.analysisId, "Analysis ID", 160),
    treasureId: safeText(input.treasureId, "Treasure ID", 160),
    standardProfile: safeText(input.standardProfile ?? "neutral", "Standard profile", 80),
    profileVersion: safeText(input.profileVersion ?? "1", "Profile version", 80),
    cardSizeProfile: safeText(input.cardSizeProfile ?? "custom", "Card-size profile", 80),
    centering: input.centering ?? null,
    captureQuality: captures,
    detectorCoverage,
    defects,
    autographComparison: input.autographComparison == null ? null : createAutographComparisonEvidence(input.autographComparison),
    estimatedGradeRange,
    confidence: bounded(input.confidence, "Pre-grade confidence"),
    limitations: Array.isArray(input.limitations) ? input.limitations.map((item) => safeText(item, "Pre-grade limitation", 500)) : [],
    advisoryOnly: true,
    officialGrade: false,
    physicalAuthentication: false,
    mayMutateAuthoritativeGrade: false,
    mayMutateAuthoritativeCondition: false,
    mayMutateAuthenticity: false,
    mayMutateValue: false,
    createdAt: safeText(input.createdAt, "Created timestamp", 80)
  });
}

export const GRADING_DEFECT_TYPES = Object.freeze([...DEFECT_TYPES].sort());
export const GRADING_DETECTOR_TYPES = Object.freeze([...DETECTOR_TYPES].sort());
