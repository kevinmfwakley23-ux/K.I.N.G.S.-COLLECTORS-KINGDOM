import test from "node:test";
import assert from "node:assert/strict";
import { buildExplainableGradingReport } from "../packages/grading/src/dimensions-macro.mjs";

function record({ method = "macro-corner-edge-review-v1+tone-stable" } = {}) {
  return {
    id: "analysis-front",
    treasureId: "treasure-1",
    sourceMediaIds: ["front-primary", "front-raking", "front-macro"],
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
      detectorCoverage: [
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
        },
        {
          detector: "macro-corner-edge",
          side: "front",
          sourceMediaIds: ["front-macro"],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: 0,
          method,
          note: "Dedicated macro evidence."
        }
      ],
      defects: []
    }
  };
}

test("macro-aware report clears satisfied corner and stable-tone edge detail gaps without inventing subgrades", () => {
  const report = buildExplainableGradingReport([record()], []);
  assert.equal(report.reportVersion, "kingdom-explainable-grading-report-v3");
  assert.equal(report.previousReportVersion, "kingdom-explainable-grading-report-v2");
  assert.equal(report.macroCornerEdgeEvidenceSupported, true);

  const corners = report.dimensions.front.corners;
  assert.equal(corners.macroEvidenceAvailable, true);
  assert.equal(corners.macroToneReferenceStable, true);
  assert.equal(corners.missingEvidence.includes("front:macro-corner-detail"), false);
  assert.ok(corners.completeness > 0.55);
  assert.equal(corners.officialSubgrade, false);

  const edges = report.dimensions.front.edges;
  assert.equal(edges.macroEvidenceAvailable, true);
  assert.equal(edges.macroToneReferenceStable, true);
  assert.equal(edges.missingEvidence.includes("front:edge-color-whitening-detail"), false);
  assert.ok(edges.completeness > 0.6);
  assert.equal(edges.officialSubgrade, false);
  assert.equal(report.physicalAuthentication, false);
  assert.equal(report.mutatesTreasure, false);
});

test("macro edge contour evidence improves completeness but keeps whitening detail missing when tone reference fails closed", () => {
  const report = buildExplainableGradingReport([record({ method: "macro-corner-edge-review-v1+tone-unavailable" })], []);
  const edges = report.dimensions.front.edges;
  assert.equal(edges.macroEvidenceAvailable, true);
  assert.equal(edges.macroToneReferenceStable, false);
  assert.equal(edges.missingEvidence.includes("front:edge-color-whitening-detail"), true);
  assert.match(edges.limitations.at(-1), /tone reference did not pass/i);
});

test("macro evidence never promotes a dimension that lacks its base whole-card evidence floor", () => {
  const source = record();
  source.analysis.detectorCoverage = source.analysis.detectorCoverage.filter((coverage) => coverage.detector !== "contour");
  const report = buildExplainableGradingReport([source], []);
  assert.equal(report.dimensions.front.corners.available, false);
  assert.equal(report.dimensions.front.edges.available, false);
});
