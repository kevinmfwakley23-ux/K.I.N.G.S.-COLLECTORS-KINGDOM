import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDefectEvidence, normalizeDetectorCoverage } from "../packages/grading/src/evidence.mjs";

test("macro corner and edge evidence types are admitted only as advisory detector evidence", () => {
  for (const type of [
    "corner-macro-contour-anomaly",
    "edge-macro-contour-anomaly",
    "corner-border-tone-anomaly",
    "edge-border-tone-anomaly"
  ]) {
    const defect = normalizeDefectEvidence({
      type,
      region: "front-top-left",
      severity: 0.3,
      confidence: 0.75,
      sourceMediaId: "macro-media-1",
      boundingBox: type.includes("tone") ? { x: 0.02, y: 0.02, width: 0.08, height: 0.04 } : null,
      note: "Advisory review candidate only."
    });
    assert.equal(defect.type, type);
    assert.equal(defect.sourceMediaId, "macro-media-1");
  }

  const coverage = normalizeDetectorCoverage({
    detector: "macro-corner-edge",
    side: "front",
    sourceMediaIds: ["macro-media-1"],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 1,
    method: "macro-corner-edge-review-v1+tone-stable",
    note: "Dedicated macro capture."
  });
  assert.equal(coverage.detector, "macro-corner-edge");
  assert.equal(coverage.advisoryOnly, true);
});
