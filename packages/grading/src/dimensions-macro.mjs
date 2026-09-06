import {
  buildExplainableGradingReport as buildBaseExplainableGradingReport,
  KINGDOM_GRADING_DIMENSIONS,
  KINGDOM_GRADING_SIDES
} from "./dimensions.mjs";

const CORNER_REGIONS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const EDGE_REGIONS = new Set(["left-edge", "right-edge", "top-edge", "bottom-edge"]);
const EXPECTED_REGION_COUNT = 4;

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarizeCandidates(candidates) {
  const usable = candidates.filter((candidate) => candidate.usable);
  const regions = [...new Set(usable.map((candidate) => candidate.region))];
  const toneStableRegions = [...new Set(usable.filter((candidate) => candidate.method.includes("+tone-stable")).map((candidate) => candidate.region))];
  return Object.freeze({
    available: usable.length > 0,
    regions: Object.freeze(regions),
    regionCount: regions.length,
    coverageComplete: regions.length === EXPECTED_REGION_COUNT,
    toneStableRegions: Object.freeze(toneStableRegions),
    toneReferenceComplete: toneStableRegions.length === EXPECTED_REGION_COUNT,
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
  if (dimension === "corners" && relevant.coverageComplete) removedEvidence.add(`${side}:macro-corner-detail`);
  if (dimension === "edges" && relevant.toneReferenceComplete) removedEvidence.add(`${side}:edge-color-whitening-detail`);

  const missingEvidence = Object.freeze((summary.missingEvidence ?? []).filter((entry) => !removedEvidence.has(entry)));
  const completenessBoost = dimension === "corners"
    ? Math.min(0.15, 0.0375 * relevant.regionCount)
    : Math.min(0.15, 0.02 * relevant.regionCount + 0.0175 * relevant.toneStableRegions.length);
  const completeness = rounded(Math.min(0.9, Number(summary.completeness ?? 0) + completenessBoost));
  const limitations = [
    ...(summary.limitations ?? []),
    dimension === "corners"
      ? relevant.coverageComplete
        ? "Dedicated high-resolution macro evidence covers all four named corners. The generic macro-corner-detail gap is cleared, but image anomalies remain advisory and do not become confirmed damage or an official subgrade."
        : `Dedicated high-resolution macro corner evidence currently covers ${relevant.regionCount}/4 named corners (${relevant.regions.join(", ")}). Completeness improves proportionally, but the generic macro-corner-detail gap remains until all four corners have usable captures.`
      : relevant.toneReferenceComplete
        ? "Dedicated high-resolution macro edge evidence covers all four named edges with stable local border-tone references. The generic edge whitening-detail gap is cleared, while lighter-tone findings remain possible-condition evidence rather than confirmed whitening or chipping."
        : `Dedicated high-resolution macro edge evidence currently covers ${relevant.regionCount}/4 named edges (${relevant.regions.join(", ") || "none"}); stable local tone reference covers ${relevant.toneStableRegions.length}/4. Completeness improves only for captured evidence, and the generic whitening/color-loss detail gap remains until all four edges have stable usable tone references.`
  ];

  return Object.freeze({
    ...summary,
    completeness,
    missingEvidence,
    limitations: Object.freeze(limitations),
    macroEvidenceAvailable: true,
    macroCoverageComplete: relevant.coverageComplete,
    macroToneReferenceComplete: relevant.toneReferenceComplete,
    macroCapturedRegions: relevant.regions,
    macroToneStableRegions: relevant.toneStableRegions,
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
    macroEvidenceAuthority: "advisory-dedicated-region-scoped-four-corner-four-edge-capture",
    officialSubgrades: false,
    physicalAuthentication: false,
    mutatesTreasure: false,
    disclaimer: `${base.disclaimer} Dedicated macro corner/edge captures improve evidence completeness only for their explicitly captured regions. Generic corner-detail or edge whitening-detail gaps remain until the complete relevant four-region evidence set passes its gates; lighter-tone candidates do not confirm whitening, trimming, alteration or professional-grade condition.`
  });
}

export { KINGDOM_GRADING_DIMENSIONS, KINGDOM_GRADING_SIDES };
