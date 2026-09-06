import {
  buildExplainableGradingReport as buildBaseExplainableGradingReport,
  KINGDOM_GRADING_DIMENSIONS,
  KINGDOM_GRADING_SIDES
} from "./dimensions.mjs";

const CORNER_REGIONS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const EDGE_REGIONS = new Set(["left-edge", "right-edge", "top-edge", "bottom-edge"]);

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarizeCandidates(candidates) {
  const usable = candidates.filter((candidate) => candidate.usable);
  return Object.freeze({
    available: usable.length > 0,
    toneStable: usable.some((candidate) => candidate.method.includes("+tone-stable")),
    regions: Object.freeze([...new Set(usable.map((candidate) => candidate.region))]),
    sourceAnalysisIds: Object.freeze([...new Set(usable.map((candidate) => candidate.recordId).filter(Boolean))]),
    sourceMediaIds: Object.freeze([...new Set(usable.flatMap((candidate) => candidate.sourceMediaIds))]),
    reviewCandidateCount: usable.reduce((sum, candidate) => sum + Math.max(0, candidate.reviewCandidateCount || 0), 0)
  });
}

function macroCoverage(records, side) {
  const candidates = [];
  for (const record of Array.isArray(records) ? records : []) {
    for (const coverage of record?.analysis?.detectorCoverage ?? []) {
      if (coverage?.detector !== "macro-corner-edge" || coverage.side !== side || coverage.completed !== true) continue;
      const region = String(coverage.region ?? "");
      if (!CORNER_REGIONS.has(region) && !EDGE_REGIONS.has(region)) continue;
      candidates.push(Object.freeze({
        recordId: record.id,
        region,
        sourceMediaIds: Object.freeze([...(coverage.sourceMediaIds ?? [])]),
        usable: coverage.usableForConditionInference === true,
        method: String(coverage.method ?? ""),
        reviewCandidateCount: Number(coverage.reviewCandidateCount ?? 0)
      }));
    }
  }

  return Object.freeze({
    corners: summarizeCandidates(candidates.filter((candidate) => CORNER_REGIONS.has(candidate.region))),
    edges: summarizeCandidates(candidates.filter((candidate) => EDGE_REGIONS.has(candidate.region)))
  });
}

function enhanceDimension(summary, { side, dimension, macro }) {
  if (!summary?.available || !new Set(["corners", "edges"]).has(dimension)) return summary;
  const relevant = dimension === "corners" ? macro.corners : macro.edges;
  if (!relevant.available) return summary;

  const removedEvidence = new Set();
  if (dimension === "corners") removedEvidence.add(`${side}:macro-corner-detail`);
  if (dimension === "edges" && relevant.toneStable) removedEvidence.add(`${side}:edge-color-whitening-detail`);

  const missingEvidence = Object.freeze((summary.missingEvidence ?? []).filter((entry) => !removedEvidence.has(entry)));
  const completenessBoost = dimension === "corners" ? 0.15 : relevant.toneStable ? 0.15 : 0.08;
  const completeness = rounded(Math.min(0.9, Number(summary.completeness ?? 0) + completenessBoost));
  const limitations = [
    ...(summary.limitations ?? []),
    dimension === "corners"
      ? `Dedicated high-resolution macro corner evidence is available for ${relevant.regions.join(", ")}. It improves evidence completeness but does not imply that uncaptured corners were inspected and does not convert an image anomaly into a confirmed ding, chip, bend, layering defect or official subgrade.`
      : relevant.toneStable
        ? `Dedicated high-resolution macro edge evidence is available for ${relevant.regions.join(", ")} with a stable local border-tone reference. The generic edge whitening-detail gap is cleared for the captured edge evidence in this report; lighter-tone findings remain possible-condition evidence rather than confirmed whitening or chipping, and uncaptured edges are not implied to be inspected.`
        : `Dedicated high-resolution macro edge contour evidence is available for ${relevant.regions.join(", ")}, but the local border-tone reference did not pass the stability gate; whitening/color-loss detail therefore remains incomplete and uncaptured edges are not implied to be inspected.`
  ];

  return Object.freeze({
    ...summary,
    completeness,
    missingEvidence,
    limitations: Object.freeze(limitations),
    macroEvidenceAvailable: true,
    macroToneReferenceStable: relevant.toneStable,
    macroCapturedRegions: relevant.regions,
    macroSourceAnalysisIds: relevant.sourceAnalysisIds,
    macroSourceMediaIds: relevant.sourceMediaIds,
    macroReviewCandidateCount: relevant.reviewCandidateCount,
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
    macroEvidenceAuthority: "advisory-dedicated-region-scoped-corner-edge-capture",
    officialSubgrades: false,
    physicalAuthentication: false,
    mutatesTreasure: false,
    disclaimer: `${base.disclaimer} Dedicated macro corner/edge captures improve evidence completeness only for their explicitly captured region and only when their capture gate passes; lighter-tone candidates do not confirm whitening, trimming, alteration or professional-grade condition.`
  });
}

export { KINGDOM_GRADING_DIMENSIONS, KINGDOM_GRADING_SIDES };
