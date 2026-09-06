import {
  buildExplainableGradingReport as buildBaseExplainableGradingReport,
  KINGDOM_GRADING_DIMENSIONS,
  KINGDOM_GRADING_SIDES
} from "./dimensions.mjs";

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function macroCoverage(records, side) {
  const candidates = [];
  for (const record of Array.isArray(records) ? records : []) {
    for (const coverage of record?.analysis?.detectorCoverage ?? []) {
      if (coverage?.detector !== "macro-corner-edge" || coverage.side !== side || coverage.completed !== true) continue;
      candidates.push(Object.freeze({
        recordId: record.id,
        sourceMediaIds: Object.freeze([...(coverage.sourceMediaIds ?? [])]),
        usable: coverage.usableForConditionInference === true,
        method: String(coverage.method ?? ""),
        reviewCandidateCount: Number(coverage.reviewCandidateCount ?? 0)
      }));
    }
  }
  const usable = candidates.filter((candidate) => candidate.usable);
  return Object.freeze({
    available: usable.length > 0,
    toneStable: usable.some((candidate) => candidate.method.includes("+tone-stable")),
    sourceAnalysisIds: Object.freeze([...new Set(usable.map((candidate) => candidate.recordId).filter(Boolean))]),
    sourceMediaIds: Object.freeze([...new Set(usable.flatMap((candidate) => candidate.sourceMediaIds))]),
    reviewCandidateCount: usable.reduce((sum, candidate) => sum + Math.max(0, candidate.reviewCandidateCount || 0), 0)
  });
}

function enhanceDimension(summary, { side, dimension, macro }) {
  if (!summary?.available || !macro.available || !new Set(["corners", "edges"]).has(dimension)) return summary;

  const removedEvidence = new Set();
  if (dimension === "corners") removedEvidence.add(`${side}:macro-corner-detail`);
  if (dimension === "edges" && macro.toneStable) removedEvidence.add(`${side}:edge-color-whitening-detail`);

  const missingEvidence = Object.freeze((summary.missingEvidence ?? []).filter((entry) => !removedEvidence.has(entry)));
  const completenessBoost = dimension === "corners" ? 0.15 : macro.toneStable ? 0.15 : 0.08;
  const completeness = rounded(Math.min(0.9, Number(summary.completeness ?? 0) + completenessBoost));
  const limitations = [
    ...(summary.limitations ?? []),
    dimension === "corners"
      ? "Dedicated high-resolution macro corner evidence supplements whole-card contour coverage. It improves evidence completeness but does not convert an image anomaly into a confirmed ding, chip, bend, layering defect or official subgrade."
      : macro.toneStable
        ? "Dedicated high-resolution macro edge evidence includes a stable local border-tone reference, so the generic edge whitening-detail gap is cleared for this report. Lighter-tone findings remain possible-condition evidence rather than confirmed whitening or chipping."
        : "Dedicated high-resolution macro edge contour evidence is available, but the local border-tone reference did not pass the stability gate; whitening/color-loss detail therefore remains incomplete."
  ];

  return Object.freeze({
    ...summary,
    completeness,
    missingEvidence,
    limitations: Object.freeze(limitations),
    macroEvidenceAvailable: true,
    macroToneReferenceStable: macro.toneStable,
    macroSourceAnalysisIds: macro.sourceAnalysisIds,
    macroSourceMediaIds: macro.sourceMediaIds,
    macroReviewCandidateCount: macro.reviewCandidateCount,
    officialSubgrade: false,
    affiliatedGraderSubgrade: false
  });
}

export function buildExplainableGradingReport(records = [], reviews = []) {
  const base = buildBaseExplainableGradingReport(records, reviews);
  const dimensions = {};

  for (const side of KINGDOM_GRADING_SIDES) {
    const macro = macroCoverage(records, side);
    dimensions[side] = {};
    for (const dimension of KINGDOM_GRADING_DIMENSIONS) {
      dimensions[side][dimension] = enhanceDimension(base.dimensions[side][dimension], { side, dimension, macro });
    }
    Object.freeze(dimensions[side]);
  }

  return Object.freeze({
    ...base,
    reportVersion: "kingdom-explainable-grading-report-v3",
    previousReportVersion: base.reportVersion,
    dimensions: Object.freeze(dimensions),
    macroCornerEdgeEvidenceSupported: true,
    macroEvidenceAuthority: "advisory-dedicated-corner-edge-capture",
    officialSubgrades: false,
    physicalAuthentication: false,
    mutatesTreasure: false,
    disclaimer: `${base.disclaimer} Dedicated macro corner/edge captures improve evidence completeness only when their capture gate passes; lighter-tone candidates do not confirm whitening, trimming, alteration or professional-grade condition.`
  });
}

export { KINGDOM_GRADING_DIMENSIONS, KINGDOM_GRADING_SIDES };
