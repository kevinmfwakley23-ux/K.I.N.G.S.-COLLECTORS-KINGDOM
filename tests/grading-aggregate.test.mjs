import test from "node:test";
import assert from "node:assert/strict";
import { estimateAdvisoryGradeRange } from "../packages/grading/src/aggregate.mjs";

function analysisRecord({ side = "front", centering = true, capture = true, contour = true, surface = false, defects = [] } = {}) {
  const mediaId = `${side}-primary`;
  const companionId = `${side}-raking-2`;
  return {
    id: `analysis-${side}-${surface ? "surface" : "basic"}`,
    analysis: {
      evidenceClass: "ai-card-pregrade",
      centering: centering ? {
        side,
        measurement: { worstMajorPercent: 50, confidence: 0.9 }
      } : null,
      captureQuality: capture ? [{
        sourceMediaId: mediaId,
        view: `${side}-straight-on`,
        usableForPregrade: true,
        analyzerConfidence: 0.88
      }] : [],
      detectorCoverage: [
        ...(contour ? [{
          detector: "contour",
          side,
          sourceMediaIds: [mediaId],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: defects.filter((item) => item.type.includes("contour")).length,
          method: "contour-v1"
        }] : []),
        ...(surface ? [{
          detector: "paired-raking-light",
          side,
          sourceMediaIds: [mediaId, companionId],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: defects.filter((item) => item.type === "surface-reflectance-anomaly").length,
          method: "paired-raking-light-difference-v1"
        }] : [])
      ],
      defects
    }
  };
}

test("advisory range fails closed without centering + usable capture + contour coverage on at least one side", () => {
  const estimate = estimateAdvisoryGradeRange([analysisRecord({ contour: false })]);
  assert.equal(estimate.available, false);
  assert.equal(estimate.range, null);
  assert.equal(estimate.evidenceLevel, "insufficient");
  assert.equal(estimate.officialGrade, false);
  assert.equal(estimate.mutatesTreasure, false);
});

test("one-side minimum evidence produces a deliberately broad partial range", () => {
  const estimate = estimateAdvisoryGradeRange([analysisRecord()]);
  assert.equal(estimate.available, true);
  assert.equal(estimate.evidenceLevel, "partial");
  assert.equal(estimate.completeness, 0.4);
  assert.ok(estimate.range.max - estimate.range.min >= 3);
  assert.match(estimate.reason, /widened/i);
  assert.equal(estimate.affiliatedGraderEstimate, false);
});

test("broad clean front/back contour and paired-surface coverage narrows the range near the top of the advisory rubric", () => {
  const estimate = estimateAdvisoryGradeRange([
    analysisRecord({ side: "front", surface: true }),
    analysisRecord({ side: "back", surface: true })
  ]);
  assert.equal(estimate.available, true);
  assert.equal(estimate.evidenceLevel, "substantial");
  assert.equal(estimate.completeness, 1);
  assert.equal(estimate.range.max, 10);
  assert.ok(estimate.range.min >= 9);
  assert.ok(estimate.confidence <= 0.9);
  assert.match(estimate.disclaimer, /not a PSA, BGS, CGC/i);
});

test("credible detector findings lower the advisory range while identical repeated records are deduplicated", () => {
  const defect = {
    type: "surface-reflectance-anomaly",
    region: "front-surface-linear",
    sourceMediaId: "front-primary",
    comparisonMediaId: "front-raking-2",
    boundingBox: { x: 0.2, y: 0.3, width: 0.1, height: 0.2 },
    severity: 0.8,
    confidence: 0.9
  };
  const clean = estimateAdvisoryGradeRange([
    analysisRecord({ side: "front", surface: true }),
    analysisRecord({ side: "back", surface: true })
  ]);
  const affectedRecord = analysisRecord({ side: "front", surface: true, defects: [defect] });
  const affected = estimateAdvisoryGradeRange([
    affectedRecord,
    analysisRecord({ side: "back", surface: true })
  ]);
  const repeated = estimateAdvisoryGradeRange([
    affectedRecord,
    affectedRecord,
    analysisRecord({ side: "back", surface: true })
  ]);
  assert.ok(affected.center < clean.center);
  assert.equal(affected.uniqueReviewCandidateCount, 1);
  assert.equal(repeated.uniqueReviewCandidateCount, 1);
  assert.equal(repeated.penalties.defects, affected.penalties.defects);
});

test("off-centering contributes a bounded evidence penalty rather than being treated as an official grader score", () => {
  const front = analysisRecord({ side: "front", surface: true });
  front.analysis.centering.measurement.worstMajorPercent = 65;
  const estimate = estimateAdvisoryGradeRange([front, analysisRecord({ side: "back", surface: true })]);
  assert.ok(estimate.penalties.centering > 0);
  assert.ok(estimate.center < 10);
  assert.equal(estimate.officialGrade, false);
});
