import test from "node:test";
import assert from "node:assert/strict";
import { buildExplainableGradingReport } from "../packages/grading/src/dimensions-macro.mjs";

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const EDGES = ["left-edge", "right-edge", "top-edge", "bottom-edge"];

function macroCoverage({ region, method = "macro-corner-edge-review-v1+tone-stable", mediaId }) {
  return {
    detector: "macro-corner-edge",
    side: "front",
    region,
    sourceMediaIds: [mediaId],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 0,
    method,
    note: `Dedicated ${region} macro evidence.`
  };
}

function record({ cornerRegions = CORNERS, edgeRegions = EDGES, unstableEdgeRegions = [] } = {}) {
  const detectorCoverage = [
    {
      detector: "contour",
      side: "front",
      sourceMediaIds: ["front-primary"],
      completed: true,
      usableForConditionInference: true,
      reviewCandidateCount: 0,
      method: "contrast-silhouette-contour-v1"
    },
    {
      detector: "paired-raking-light",
      side: "front",
      sourceMediaIds: ["front-primary", "front-raking"],
      completed: true,
      usableForConditionInference: true,
      reviewCandidateCount: 0,
      method: "paired-raking-light-difference-v1"
    }
  ];
  for (const region of cornerRegions) {
    detectorCoverage.push(macroCoverage({ region, mediaId: `front-macro-${region}` }));
  }
  for (const region of edgeRegions) {
    detectorCoverage.push(macroCoverage({
      region,
      mediaId: `front-macro-${region}`,
      method: unstableEdgeRegions.includes(region)
        ? "macro-corner-edge-review-v1+tone-unavailable"
        : "macro-corner-edge-review-v1+tone-stable"
    }));
  }

  return {
    id: "analysis-front",
    treasureId: "treasure-1",
    sourceMediaIds: ["front-primary", "front-raking", ...cornerRegions.map((region) => `front-macro-${region}`), ...edgeRegions.map((region) => `front-macro-${region}`)],
    analysisSha256: "a".repeat(64),
    analysis: {
      evidenceClass: "ai-card-pregrade",
      centering: { side: "front", measurement: { worstMajorPercent: 52, confidence: 0.9 } },
      captureQuality: [{
        sourceMediaId: "front-primary",
        view: "front-straight-on",
        usableForPregrade: true,
        analyzerConfidence: 0.9
      }],
      detectorCoverage,
      defects: []
    }
  };
}

test("macro-aware report clears global corner and edge detail gaps only after complete four-region evidence sets", () => {
  const report = buildExplainableGradingReport([record()], []);
  assert.equal(report.reportVersion, "kingdom-explainable-grading-report-v3");
  assert.equal(report.previousReportVersion, "kingdom-explainable-grading-report-v2");
  assert.equal(report.macroCornerEdgeEvidenceSupported, true);

  const corners = report.dimensions.front.corners;
  assert.equal(corners.macroEvidenceAvailable, true);
  assert.equal(corners.macroCoverageComplete, true);
  assert.deepEqual(corners.macroCapturedRegions, CORNERS);
  assert.equal(corners.missingEvidence.includes("front:macro-corner-detail"), false);
  assert.ok(corners.completeness > 0.55);
  assert.equal(corners.officialSubgrade, false);

  const edges = report.dimensions.front.edges;
  assert.equal(edges.macroEvidenceAvailable, true);
  assert.equal(edges.macroCoverageComplete, true);
  assert.equal(edges.macroToneReferenceComplete, true);
  assert.deepEqual(edges.macroCapturedRegions, EDGES);
  assert.deepEqual(edges.macroToneStableRegions, EDGES);
  assert.equal(edges.missingEvidence.includes("front:edge-color-whitening-detail"), false);
  assert.ok(edges.completeness > 0.6);
  assert.equal(edges.officialSubgrade, false);
  assert.equal(report.physicalAuthentication, false);
  assert.equal(report.mutatesTreasure, false);
});

test("one corner macro improves completeness but never clears the global corner-detail gap or an edge gap", () => {
  const report = buildExplainableGradingReport([record({ cornerRegions: ["top-left"], edgeRegions: [] })], []);
  const corners = report.dimensions.front.corners;
  assert.equal(corners.macroEvidenceAvailable, true);
  assert.equal(corners.macroCoverageComplete, false);
  assert.deepEqual(corners.macroCapturedRegions, ["top-left"]);
  assert.equal(corners.missingEvidence.includes("front:macro-corner-detail"), true);
  assert.match(corners.limitations.at(-1), /1\/4 named corners/i);
  assert.equal(report.dimensions.front.edges.macroEvidenceAvailable, undefined);
  assert.equal(report.dimensions.front.edges.missingEvidence.includes("front:edge-color-whitening-detail"), true);
});

test("one edge macro improves completeness but never clears the global whitening-detail gap or corner-detail gap", () => {
  const report = buildExplainableGradingReport([record({ cornerRegions: [], edgeRegions: ["left-edge"] })], []);
  const edges = report.dimensions.front.edges;
  assert.equal(edges.macroEvidenceAvailable, true);
  assert.equal(edges.macroCoverageComplete, false);
  assert.equal(edges.macroToneReferenceComplete, false);
  assert.deepEqual(edges.macroCapturedRegions, ["left-edge"]);
  assert.equal(edges.missingEvidence.includes("front:edge-color-whitening-detail"), true);
  assert.match(edges.limitations.at(-1), /1\/4 named edges/i);
  assert.equal(report.dimensions.front.corners.macroEvidenceAvailable, undefined);
  assert.equal(report.dimensions.front.corners.missingEvidence.includes("front:macro-corner-detail"), true);
});

test("all four edge captures still keep whitening detail incomplete when any local tone reference fails closed", () => {
  const report = buildExplainableGradingReport([record({ cornerRegions: [], unstableEdgeRegions: ["bottom-edge"] })], []);
  const edges = report.dimensions.front.edges;
  assert.equal(edges.macroCoverageComplete, true);
  assert.equal(edges.macroToneReferenceComplete, false);
  assert.equal(edges.macroToneStableRegions.length, 3);
  assert.equal(edges.missingEvidence.includes("front:edge-color-whitening-detail"), true);
  assert.match(edges.limitations.at(-1), /stable local tone reference covers 3\/4/i);
});

test("macro evidence never promotes a dimension that lacks its base whole-card evidence floor", () => {
  const source = record();
  source.analysis.detectorCoverage = source.analysis.detectorCoverage.filter((coverage) => coverage.detector !== "contour");
  const report = buildExplainableGradingReport([source], []);
  assert.equal(report.dimensions.front.corners.available, false);
  assert.equal(report.dimensions.front.edges.available, false);
});
