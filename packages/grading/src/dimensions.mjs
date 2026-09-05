import { bestCalibrationForMedia, summarizePhysicalCalibration } from "./calibration.mjs";
import { enumerateFindings } from "./findings.mjs";
import { defectExtent } from "./measurement.mjs";

const SIDES = Object.freeze(["front", "back"]);
const DIMENSIONS = Object.freeze(["centering", "corners", "edges", "surface"]);
const REVIEW_DECISIONS = new Set(["accepted", "rejected", "uncertain"]);

const DEFECT_WEIGHTS = Object.freeze({
  "corner-contour-anomaly": 1.2,
  "corner-whitening": 1.6,
  "corner-rounding": 1.8,
  "corner-ding": 2.3,
  "corner-bend": 2.8,
  "corner-layering": 2.5,
  "corner-crease": 3.2,
  "edge-contour-anomaly": 1.2,
  "edge-chipping": 1.8,
  "edge-roughness": 1.4,
  "edge-notch": 2.1,
  "edge-layering": 2.4,
  "surface-reflectance-anomaly": 1.4,
  "surface-scratch": 1.9,
  "surface-scuff": 1.5,
  "surface-print-line": 1.4,
  "surface-dent": 2.6,
  "surface-indentation": 2.4,
  "surface-stain": 2.4,
  "surface-wrinkle": 2.7,
  "surface-crease": 3.4,
  "gloss-loss": 1.7,
  "print-spot": 1.2,
  registration: 1.1,
  focus: 1.0,
  "color-fade": 1.8,
  discoloration: 2.0,
  "suspected-trimming": 4,
  "suspected-recoloration": 4,
  "suspected-restoration": 4,
  "suspected-cleaning": 3.5,
  "suspected-altered-stock": 4
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function half(value) { return Math.round(value * 2) / 2; }
function rounded(value, digits = 3) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }

function defectDimension(type = "") {
  if (type.startsWith("corner-")) return "corners";
  if (type.startsWith("edge-")) return "edges";
  if (type.startsWith("surface-") || new Set(["gloss-loss", "print-spot", "registration", "focus", "color-fade", "discoloration"]).has(type)) return "surface";
  if (type.startsWith("suspected-")) return "surface";
  return null;
}

function latestReviews(reviews = []) {
  const map = new Map();
  for (const review of Array.isArray(reviews) ? reviews : []) {
    if (!review?.findingHash || !REVIEW_DECISIONS.has(review.decision)) continue;
    const existing = map.get(review.findingHash);
    const time = Date.parse(review.createdAt ?? "") || 0;
    const existingTime = Date.parse(existing?.createdAt ?? "") || 0;
    if (!existing || time > existingTime || (time === existingTime && String(review.id ?? "") > String(existing.id ?? ""))) map.set(review.findingHash, review);
  }
  return map;
}

function mediaSideMap(records) {
  const result = new Map();
  for (const record of records) {
    for (const calibration of record.analysis?.calibrationEvidence ?? []) {
      if (SIDES.includes(calibration?.side) && calibration.sourceMediaId) result.set(calibration.sourceMediaId, calibration.side);
    }
    for (const capture of record.analysis?.captureQuality ?? []) {
      const view = String(capture.view ?? "").toLowerCase();
      if (view.startsWith("front")) result.set(capture.sourceMediaId, "front");
      if (view.startsWith("back")) result.set(capture.sourceMediaId, "back");
    }
    for (const coverage of record.analysis?.detectorCoverage ?? []) {
      if (!SIDES.includes(coverage.side)) continue;
      for (const mediaId of coverage.sourceMediaIds ?? []) if (!result.has(mediaId)) result.set(mediaId, coverage.side);
    }
    const centering = record.analysis?.centering;
    if (SIDES.includes(centering?.side)) {
      for (const mediaId of record.sourceMediaIds ?? []) if (!result.has(mediaId)) result.set(mediaId, centering.side);
    }
  }
  return result;
}

function findingInterpretation(review) {
  if (!review) return Object.freeze({ decision: "unreviewed", penaltyFactor: 0.75, uncertaintyFactor: 0.25 });
  if (review.decision === "accepted") return Object.freeze({ decision: "accepted", penaltyFactor: 1, uncertaintyFactor: 0 });
  if (review.decision === "rejected") return Object.freeze({ decision: "rejected", penaltyFactor: 0, uncertaintyFactor: 0 });
  return Object.freeze({ decision: "uncertain", penaltyFactor: 0.5, uncertaintyFactor: 0.5 });
}

function emptySummary(side, dimension, missingEvidence) {
  return Object.freeze({
    side,
    dimension,
    available: false,
    advisoryRange: null,
    confidence: 0,
    completeness: 0,
    sourceAnalysisIds: Object.freeze([]),
    sourceMediaIds: Object.freeze([]),
    candidateFindingIds: Object.freeze([]),
    acceptedFindingIds: Object.freeze([]),
    rejectedFindingIds: Object.freeze([]),
    uncertainFindingIds: Object.freeze([]),
    unreviewedFindingIds: Object.freeze([]),
    findings: Object.freeze([]),
    missingEvidence: Object.freeze(missingEvidence),
    limitations: Object.freeze(["No Kingdom advisory dimension range is produced until the minimum evidence for this dimension exists."]),
    physicalMeasurementAvailable: false,
    officialSubgrade: false,
    affiliatedGraderSubgrade: false
  });
}

function centeringSummary(side, records) {
  const candidates = records
    .filter((record) => record.analysis?.centering?.side === side && record.analysis.centering.measurement)
    .sort((a, b) => Number(b.analysis.centering.measurement.confidence ?? 0) - Number(a.analysis.centering.measurement.confidence ?? 0));
  if (!candidates.length) return emptySummary(side, "centering", [`${side}:centering-measurement`]);
  const record = candidates[0];
  const measurement = record.analysis.centering.measurement;
  const major = Number(measurement.worstMajorPercent ?? 50);
  const deviation = Math.max(0, major - 50);
  const center = clamp(10 - Math.min(5, deviation * 0.2), 1, 10);
  const confidence = clamp(Number(measurement.confidence ?? 0), 0, 1);
  const uncertainty = clamp(0.5 + (1 - confidence) * 2, 0.5, 2.5);
  const calibration = record.sourceMediaIds.map((mediaId) => bestCalibrationForMedia(records, mediaId)).find(Boolean)?.calibration ?? null;
  return Object.freeze({
    side,
    dimension: "centering",
    available: true,
    advisoryRange: Object.freeze({ min: clamp(half(center - uncertainty), 1, 10), max: clamp(half(center + uncertainty), 1, 10) }),
    confidence: rounded(confidence),
    completeness: rounded(0.85 + confidence * 0.15),
    sourceAnalysisIds: Object.freeze([record.id]),
    sourceMediaIds: Object.freeze([...(record.sourceMediaIds ?? [])]),
    candidateFindingIds: Object.freeze([]),
    acceptedFindingIds: Object.freeze([]),
    rejectedFindingIds: Object.freeze([]),
    uncertainFindingIds: Object.freeze([]),
    unreviewedFindingIds: Object.freeze([]),
    findings: Object.freeze([]),
    missingEvidence: Object.freeze(calibration ? [] : [`${side}:independent-physical-scale-reference`]),
    limitations: Object.freeze([
      "Centering is one condition dimension only. This range is Kingdom advisory evidence and not an official third-party subgrade.",
      calibration ? "Physical card-size comparison is available from an independent in-frame calibration reference." : "Physical millimeter measurement remains unavailable until a known-size reference is captured with the card."
    ]),
    physicalMeasurementAvailable: Boolean(calibration),
    calibrationSourceMediaId: calibration?.sourceMediaId ?? null,
    officialSubgrade: false,
    affiliatedGraderSubgrade: false
  });
}

function coverageFor(records, side, detector) {
  const candidates = [];
  for (const record of records) {
    for (const coverage of record.analysis?.detectorCoverage ?? []) {
      if (coverage.side === side && coverage.detector === detector && coverage.completed === true) candidates.push({ record, coverage });
    }
  }
  candidates.sort((a, b) => Number(b.coverage.usableForConditionInference === true) - Number(a.coverage.usableForConditionInference === true));
  return candidates.find((entry) => entry.coverage.usableForConditionInference === true) ?? null;
}

function evidenceDimensionSummary({ side, dimension, records, findings, reviewMap, mediaSides }) {
  const detector = dimension === "surface" ? "paired-raking-light" : "contour";
  const coverage = coverageFor(records, side, detector);
  const missing = [];
  if (!coverage) missing.push(`${side}:${detector}`);
  if (!coverage) return emptySummary(side, dimension, missing);

  const relevant = findings.filter((finding) => defectDimension(finding.defect.type) === dimension && mediaSides.get(finding.defect.sourceMediaId) === side);
  const interpreted = relevant.map((finding) => {
    const review = reviewMap.get(finding.findingHash) ?? null;
    const interpretation = findingInterpretation(review);
    const calibration = bestCalibrationForMedia(records, finding.defect.sourceMediaId)?.calibration ?? null;
    return Object.freeze({
      findingHash: finding.findingHash,
      sourceAnalysisId: finding.sourceAnalysisId,
      type: finding.defect.type,
      region: finding.defect.region,
      severity: finding.defect.severity,
      detectorConfidence: finding.defect.confidence,
      reviewDecision: interpretation.decision,
      reviewId: review?.id ?? null,
      extent: defectExtent(finding.defect, calibration).extent,
      rawEvidencePreserved: true,
      physicalMeasurementAvailable: Boolean(calibration)
    });
  });

  let penalty = 0;
  let uncertainty = 0;
  const confidenceValues = [];
  for (const finding of relevant) {
    const review = reviewMap.get(finding.findingHash) ?? null;
    const interpretation = findingInterpretation(review);
    const severity = clamp(Number(finding.defect.severity ?? 0), 0, 1);
    const confidence = clamp(Number(finding.defect.confidence ?? 0), 0, 1);
    const weight = DEFECT_WEIGHTS[finding.defect.type] ?? 1.5;
    penalty += severity * confidence * weight * interpretation.penaltyFactor;
    uncertainty += severity * (1 - confidence) * 0.5 + severity * interpretation.uncertaintyFactor * 0.4;
    confidenceValues.push(confidence);
  }
  penalty = Math.min(7, penalty);

  const baseCompleteness = dimension === "surface" ? 0.65 : dimension === "corners" ? 0.55 : 0.6;
  const detailMissing = dimension === "surface"
    ? [`${side}:macro-surface-detail`, `${side}:alternate-light-when-needed`]
    : dimension === "corners"
      ? [`${side}:macro-corner-detail`]
      : [`${side}:edge-color-whitening-detail`];
  const physicalCalibrationAvailable = relevant.some((finding) => bestCalibrationForMedia(records, finding.defect.sourceMediaId));
  if (!physicalCalibrationAvailable) detailMissing.push(`${side}:independent-physical-scale-reference`);
  const averageFindingConfidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0.8;
  const completeness = rounded(baseCompleteness);
  const evidenceConfidence = rounded(clamp(averageFindingConfidence * 0.75 + 0.2, 0, 0.9));
  const center = clamp(10 - penalty, 1, 10);
  const rangeUncertainty = clamp((1 - completeness) * 4 + uncertainty + 0.5, 1, 4.5);
  const sourceAnalysisIds = [...new Set([coverage.record.id, ...relevant.map((finding) => finding.sourceAnalysisId)])];
  const sourceMediaIds = [...new Set([...(coverage.coverage.sourceMediaIds ?? []), ...relevant.flatMap((finding) => [finding.defect.sourceMediaId, finding.defect.comparisonMediaId].filter(Boolean))])];
  const idsFor = (decision) => interpreted.filter((item) => item.reviewDecision === decision).map((item) => item.findingHash);

  return Object.freeze({
    side,
    dimension,
    available: true,
    advisoryRange: Object.freeze({ min: clamp(half(center - rangeUncertainty), 1, 10), max: clamp(half(center + rangeUncertainty), 1, 10) }),
    confidence: evidenceConfidence,
    completeness,
    sourceAnalysisIds: Object.freeze(sourceAnalysisIds),
    sourceMediaIds: Object.freeze(sourceMediaIds),
    candidateFindingIds: Object.freeze(interpreted.map((item) => item.findingHash)),
    acceptedFindingIds: Object.freeze(idsFor("accepted")),
    rejectedFindingIds: Object.freeze(idsFor("rejected")),
    uncertainFindingIds: Object.freeze(idsFor("uncertain")),
    unreviewedFindingIds: Object.freeze(idsFor("unreviewed")),
    findings: Object.freeze(interpreted),
    missingEvidence: Object.freeze(detailMissing),
    limitations: Object.freeze([
      "Detector findings are advisory image evidence. Reviewer decisions change interpretation but never delete or rewrite the original detector evidence.",
      physicalCalibrationAvailable
        ? "Approximate millimeter spans are shown only where the source capture has a validated independent scale reference."
        : "Defect spans stay normalized-only until an independent known-size reference passes physical calibration.",
      dimension === "surface"
        ? "Paired raking-light analysis does not replace macro, UV/spectral or hands-on surface inspection when those are needed."
        : "Whole-card contour evidence does not fully resolve microscopic whitening, layering or fine physical wear without closer capture."
    ]),
    physicalMeasurementAvailable: physicalCalibrationAvailable,
    officialSubgrade: false,
    affiliatedGraderSubgrade: false
  });
}

export function buildExplainableGradingReport(records = [], reviews = []) {
  const stored = Array.isArray(records) ? records.filter((record) => record?.analysis?.evidenceClass === "ai-card-pregrade") : [];
  const reviewMap = latestReviews(reviews);
  const mediaSides = mediaSideMap(stored);
  const findings = stored.flatMap((record) => enumerateFindings(record));
  const dimensions = {};
  for (const side of SIDES) {
    dimensions[side] = {};
    for (const dimension of DIMENSIONS) {
      dimensions[side][dimension] = dimension === "centering"
        ? centeringSummary(side, stored)
        : evidenceDimensionSummary({ side, dimension, records: stored, findings, reviewMap, mediaSides });
    }
    Object.freeze(dimensions[side]);
  }
  const physicalMeasurement = summarizePhysicalCalibration(stored);

  return Object.freeze({
    reportVersion: "kingdom-explainable-grading-report-v2",
    previousReportVersion: "kingdom-explainable-grading-report-v1",
    dimensions: Object.freeze(dimensions),
    physicalMeasurement,
    sourceAnalysisCount: stored.length,
    rawFindingCount: findings.length,
    reviewedFindingCount: findings.filter((finding) => reviewMap.has(finding.findingHash)).length,
    reviewerAuthority: "collector-review-of-advisory-detector-evidence",
    rawDetectorEvidenceImmutable: true,
    officialGrade: false,
    officialSubgrades: false,
    affiliatedGraderReport: false,
    physicalAuthentication: false,
    mutatesTreasure: false,
    disclaimer: "Kingdom dimension ranges are advisory evidence summaries. They are not PSA, BGS, CGC, SGC or other professional grader subgrades and do not authenticate the physical card. Physical millimeter measurements require an independent in-frame calibration reference."
  });
}

export const KINGDOM_GRADING_DIMENSIONS = Object.freeze([...DIMENSIONS]);
export const KINGDOM_GRADING_SIDES = Object.freeze([...SIDES]);
