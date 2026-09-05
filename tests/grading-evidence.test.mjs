import test from "node:test";
import assert from "node:assert/strict";
import {
  createAutographComparisonEvidence,
  createCaptureQualityEvidence,
  createPregradeAnalysis,
  normalizeDefectEvidence,
  normalizeDetectorCoverage
} from "../packages/grading/src/evidence.mjs";

test("grading defect evidence preserves location, severity, confidence, source media and optional paired comparison media", () => {
  const defect = normalizeDefectEvidence({
    type: "surface-reflectance-anomaly",
    region: "front-surface-linear",
    severity: 0.42,
    confidence: 0.91,
    sourceMediaId: "media-front-raking-1",
    comparisonMediaId: "media-front-raking-2",
    boundingBox: { x: 0.6, y: 0.1, width: 0.2, height: 0.15 },
    note: "Linear reflectance change between paired captures; physical cause requires closer review."
  });
  assert.equal(defect.type, "surface-reflectance-anomaly");
  assert.equal(defect.severity, 0.42);
  assert.equal(defect.confidence, 0.91);
  assert.equal(defect.comparisonMediaId, "media-front-raking-2");
  assert.equal(defect.boundingBox.x, 0.6);

  const corner = normalizeDefectEvidence({
    type: "corner-contour-anomaly",
    region: "top-left",
    severity: 0.2,
    confidence: 0.7,
    sourceMediaId: "front-1"
  });
  const edge = normalizeDefectEvidence({
    type: "edge-contour-anomaly",
    region: "left-edge",
    severity: 0.15,
    confidence: 0.68,
    sourceMediaId: "front-1"
  });
  assert.equal(corner.type, "corner-contour-anomaly");
  assert.equal(edge.type, "edge-contour-anomaly");
  assert.throws(() => normalizeDefectEvidence({ ...defect, type: "fake-defect" }), /Unsupported defect type/);
});

test("detector coverage distinguishes a completed zero-candidate run from a detector that never ran", () => {
  const contour = normalizeDetectorCoverage({
    detector: "contour",
    side: "front",
    sourceMediaIds: ["front-1"],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 0,
    method: "contrast-silhouette-contour-v1",
    note: "No contour review candidates were isolated at this capture quality."
  });
  assert.equal(contour.completed, true);
  assert.equal(contour.usableForConditionInference, true);
  assert.equal(contour.reviewCandidateCount, 0);
  assert.equal(contour.advisoryOnly, true);

  const surface = normalizeDetectorCoverage({
    detector: "paired-raking-light",
    side: "back",
    sourceMediaIds: ["back-raking-1", "back-raking-2", "back-raking-1"],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 2,
    method: "paired-raking-light-difference-v1"
  });
  assert.deepEqual(surface.sourceMediaIds, ["back-raking-1", "back-raking-2"]);
  assert.equal(surface.reviewCandidateCount, 2);

  assert.throws(() => normalizeDetectorCoverage({
    detector: "imaginary-detector",
    side: "front",
    sourceMediaIds: ["front-1"],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 0,
    method: "bad"
  }), /Unsupported detector coverage type/);
  assert.throws(() => normalizeDetectorCoverage({
    detector: "contour",
    side: "left",
    sourceMediaIds: ["front-1"],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 0,
    method: "bad"
  }), /front or back/);
  assert.throws(() => normalizeDetectorCoverage({
    detector: "contour",
    side: "front",
    sourceMediaIds: [],
    completed: true,
    usableForConditionInference: true,
    reviewCandidateCount: 0,
    method: "bad"
  }), /1 to 4 source media/);
});

test("capture-quality evidence fails closed when any required image-quality gate is missing", () => {
  const usable = createCaptureQualityEvidence({
    sourceMediaId: "front-1",
    view: "front-straight",
    cropComplete: true,
    resolutionAdequate: true,
    focusAdequate: true,
    glareAcceptable: true,
    perspectiveAcceptable: true,
    analyzerConfidence: 0.96,
    warnings: []
  });
  assert.equal(usable.usableForPregrade, true);

  const glare = createCaptureQualityEvidence({
    sourceMediaId: "front-2",
    view: "front-straight",
    cropComplete: true,
    resolutionAdequate: true,
    focusAdequate: true,
    glareAcceptable: false,
    perspectiveAcceptable: true,
    analyzerConfidence: 0.8,
    warnings: ["Glare crosses the upper border and autograph area."]
  });
  assert.equal(glare.usableForPregrade, false);
});

test("autograph comparison requires sourced HTTPS exemplars and is structurally non-authenticating", () => {
  const result = createAutographComparisonEvidence({
    signerClaim: "Example Athlete",
    sourceMediaId: "auto-closeup-1",
    overallSimilarity: 0.82,
    confidence: 0.73,
    comparedFeatures: ["slant", "letter proportions", "flourish geometry", "spacing"],
    references: [{
      signerName: "Example Athlete",
      sourceLabel: "Recognized authenticator public example",
      sourceUrl: "https://example.com/reference-signature",
      observedAt: "2026-09-05",
      similarity: 0.82,
      notes: "Reference provenance retained with the comparison."
    }],
    limitations: ["RGB image comparison cannot establish ink chemistry or signing date."]
  });
  assert.equal(result.evidenceClass, "ai-signature-similarity-review");
  assert.equal(result.authenticationClaim, false);
  assert.equal(result.professionalAuthenticationRequiredForAuthoritativeClaim, true);
  assert.match(result.disclaimer, /not professional autograph authentication/i);
  assert.throws(() => createAutographComparisonEvidence({
    signerClaim: "Example Athlete",
    sourceMediaId: "a",
    overallSimilarity: 0.5,
    confidence: 0.5,
    references: [{ signerName: "Example Athlete", sourceLabel: "bad", sourceUrl: "http://example.com/x", observedAt: "2026-09-05", similarity: 0.5 }]
  }), /HTTPS/);
});

test("pre-grade analysis is advisory only and cannot mutate authoritative grade, condition, authenticity, or value", () => {
  const record = createPregradeAnalysis({
    analysisId: "analysis-1",
    treasureId: "treasure-1",
    standardProfile: "bgs",
    profileVersion: "2026-09-05",
    cardSizeProfile: "standard-western",
    captureQuality: [{
      sourceMediaId: "front-1", view: "front-straight", cropComplete: true, resolutionAdequate: true,
      focusAdequate: true, glareAcceptable: true, perspectiveAcceptable: true, analyzerConfidence: 0.95
    }],
    detectorCoverage: [{
      detector: "contour", side: "front", sourceMediaIds: ["front-1"], completed: true,
      usableForConditionInference: true, reviewCandidateCount: 1, method: "contrast-silhouette-contour-v1"
    }],
    defects: [{
      type: "corner-contour-anomaly", region: "front-top-left", severity: 0.15, confidence: 0.88, sourceMediaId: "front-1"
    }],
    estimatedGradeRange: { min: 8, max: 9.5 },
    confidence: 0.78,
    limitations: ["No raking-light back-surface image was supplied."],
    createdAt: "2026-09-05T15:30:00.000Z"
  });
  assert.equal(record.evidenceClass, "ai-card-pregrade");
  assert.equal(record.detectorCoverage[0].reviewCandidateCount, 1);
  assert.equal(record.advisoryOnly, true);
  assert.equal(record.officialGrade, false);
  assert.equal(record.physicalAuthentication, false);
  assert.equal(record.mayMutateAuthoritativeGrade, false);
  assert.equal(record.mayMutateAuthoritativeCondition, false);
  assert.equal(record.mayMutateAuthenticity, false);
  assert.equal(record.mayMutateValue, false);
  assert.deepEqual(record.estimatedGradeRange, { min: 8, max: 9.5 });
});
