import test from "node:test";
import assert from "node:assert/strict";
import { createAutographComparisonEvidence, createCaptureQualityEvidence, createPregradeAnalysis, normalizeDefectEvidence } from "../packages/grading/src/evidence.mjs";

test("grading defect evidence preserves location, severity, confidence, and source media without authoritative claims", () => {
  const defect = normalizeDefectEvidence({
    type: "surface-scratch",
    region: "front-upper-right",
    severity: 0.42,
    confidence: 0.91,
    sourceMediaId: "media-front-raking-1",
    boundingBox: { x: 0.6, y: 0.1, width: 0.2, height: 0.15 },
    note: "Fine linear reflection change under raking light."
  });
  assert.equal(defect.type, "surface-scratch");
  assert.equal(defect.severity, 0.42);
  assert.equal(defect.confidence, 0.91);
  assert.equal(defect.boundingBox.x, 0.6);
  assert.throws(() => normalizeDefectEvidence({ ...defect, type: "fake-defect" }), /Unsupported defect type/);
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
    references: [
      {
        signerName: "Example Athlete",
        sourceLabel: "Recognized authenticator public example",
        sourceUrl: "https://example.com/reference-signature",
        observedAt: "2026-09-05",
        similarity: 0.82,
        notes: "Reference provenance retained with the comparison."
      }
    ],
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
    defects: [{
      type: "corner-whitening", region: "front-top-left", severity: 0.15, confidence: 0.88, sourceMediaId: "front-1"
    }],
    estimatedGradeRange: { min: 8, max: 9.5 },
    confidence: 0.78,
    limitations: ["No raking-light back-surface image was supplied."],
    createdAt: "2026-09-05T15:30:00.000Z"
  });
  assert.equal(record.evidenceClass, "ai-card-pregrade");
  assert.equal(record.advisoryOnly, true);
  assert.equal(record.officialGrade, false);
  assert.equal(record.physicalAuthentication, false);
  assert.equal(record.mayMutateAuthoritativeGrade, false);
  assert.equal(record.mayMutateAuthoritativeCondition, false);
  assert.equal(record.mayMutateAuthenticity, false);
  assert.equal(record.mayMutateValue, false);
  assert.deepEqual(record.estimatedGradeRange, { min: 8, max: 9.5 });
});
