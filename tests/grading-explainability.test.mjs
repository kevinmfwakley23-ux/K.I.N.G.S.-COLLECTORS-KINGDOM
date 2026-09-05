import test from "node:test";
import assert from "node:assert/strict";
import { buildExplainableGradingReport } from "../packages/grading/src/dimensions.mjs";
import { createFindingHash, enumerateFindings } from "../packages/grading/src/findings.mjs";
import { normalizedBoundingBoxExtent } from "../packages/grading/src/measurement.mjs";

function record({ side = "front", defect = null, analysisSha256 = "a".repeat(64) } = {}) {
  const primary = `${side}-primary`;
  const companion = `${side}-raking`;
  return {
    id: `analysis-${side}`,
    treasureId: "treasure-1",
    sourceMediaIds: [primary, companion],
    analysisSha256,
    analysis: {
      evidenceClass: "ai-card-pregrade",
      centering: {
        side,
        measurement: { worstMajorPercent: 52, confidence: 0.9 }
      },
      captureQuality: [{
        sourceMediaId: primary,
        view: `${side}-straight-on`,
        usableForPregrade: true,
        analyzerConfidence: 0.9
      }],
      detectorCoverage: [
        {
          detector: "contour",
          side,
          sourceMediaIds: [primary],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: defect?.type?.includes("corner") || defect?.type?.includes("edge") ? 1 : 0,
          method: "contour-v1"
        },
        {
          detector: "paired-raking-light",
          side,
          sourceMediaIds: [primary, companion],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: defect?.type?.includes("surface") ? 1 : 0,
          method: "surface-v1"
        }
      ],
      defects: defect ? [defect] : []
    }
  };
}

test("finding hashes are deterministic, analysis-bound and preserve immutable raw defect identity", () => {
  const defect = { type: "corner-contour-anomaly", region: "top-left", severity: 0.4, confidence: 0.8, sourceMediaId: "front-primary", comparisonMediaId: null, boundingBox: null };
  const first = createFindingHash({ analysisSha256: "a".repeat(64), defectIndex: 0, defect });
  const repeated = createFindingHash({ analysisSha256: "a".repeat(64), defectIndex: 0, defect: { ...defect } });
  const anotherAnalysis = createFindingHash({ analysisSha256: "b".repeat(64), defectIndex: 0, defect });
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, repeated);
  assert.notEqual(first, anotherAnalysis);
  assert.equal(enumerateFindings(record({ defect }))[0].findingHash, first);
});

test("normalized defect extent reports image-relative area/span without fabricating millimeters", () => {
  const extent = normalizedBoundingBoxExtent({ x: 0.2, y: 0.25, width: 0.1, height: 0.2 });
  assert.equal(extent.normalizedArea, 0.02);
  assert.equal(extent.affectedFacePercent, 2);
  assert.equal(extent.horizontalSpanPercent, 10);
  assert.equal(extent.verticalSpanPercent, 20);
  assert.equal(extent.estimatedMajorSpanPercent, 20);
  assert.equal(extent.calibratedMillimeters, null);
  assert.equal(extent.measurementAuthority, "normalized-image-geometry-only");
  assert.throws(() => normalizedBoundingBoxExtent({ x: 0.95, y: 0.1, width: 0.1, height: 0.2 }), /inside the normalized card frame/i);
});

test("explainable report exposes eight front/back dimensions and fails closed for missing back evidence", () => {
  const report = buildExplainableGradingReport([record()], []);
  assert.equal(report.reportVersion, "kingdom-explainable-grading-report-v1");
  assert.deepEqual(Object.keys(report.dimensions.front), ["centering", "corners", "edges", "surface"]);
  assert.deepEqual(Object.keys(report.dimensions.back), ["centering", "corners", "edges", "surface"]);
  assert.equal(report.dimensions.front.centering.available, true);
  assert.equal(report.dimensions.front.corners.available, true);
  assert.equal(report.dimensions.front.edges.available, true);
  assert.equal(report.dimensions.front.surface.available, true);
  assert.equal(report.dimensions.back.centering.available, false);
  assert.equal(report.dimensions.back.corners.available, false);
  assert.equal(report.dimensions.back.edges.available, false);
  assert.equal(report.dimensions.back.surface.available, false);
  assert.equal(report.officialSubgrades, false);
  assert.equal(report.physicalAuthentication, false);
  assert.equal(report.mutatesTreasure, false);
});

test("append-only collector review changes finding interpretation without deleting raw detector evidence", () => {
  const defect = {
    type: "corner-contour-anomaly",
    region: "top-left",
    severity: 0.65,
    confidence: 0.9,
    sourceMediaId: "front-primary",
    comparisonMediaId: null,
    boundingBox: { x: 0, y: 0, width: 0.08, height: 0.08 }
  };
  const source = record({ defect });
  const finding = enumerateFindings(source)[0];
  const unreviewed = buildExplainableGradingReport([source], []);
  const rejected = buildExplainableGradingReport([source], [{
    id: "review-1",
    findingHash: finding.findingHash,
    decision: "rejected",
    createdAt: "2026-09-05T18:10:00.000Z"
  }]);
  const laterUncertain = buildExplainableGradingReport([source], [
    { id: "review-1", findingHash: finding.findingHash, decision: "rejected", createdAt: "2026-09-05T18:10:00.000Z" },
    { id: "review-2", findingHash: finding.findingHash, decision: "uncertain", createdAt: "2026-09-05T18:11:00.000Z" }
  ]);

  assert.deepEqual(rejected.dimensions.front.corners.candidateFindingIds, [finding.findingHash]);
  assert.deepEqual(rejected.dimensions.front.corners.rejectedFindingIds, [finding.findingHash]);
  assert.equal(rejected.dimensions.front.corners.findings[0].rawEvidencePreserved, true);
  assert.ok(rejected.dimensions.front.corners.advisoryRange.min >= unreviewed.dimensions.front.corners.advisoryRange.min);
  assert.deepEqual(laterUncertain.dimensions.front.corners.uncertainFindingIds, [finding.findingHash]);
  assert.deepEqual(laterUncertain.dimensions.front.corners.rejectedFindingIds, []);
  assert.equal(laterUncertain.reviewedFindingCount, 1);
});
