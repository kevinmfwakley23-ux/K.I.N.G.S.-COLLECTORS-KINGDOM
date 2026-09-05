import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCalibrationEvidence, summarizePhysicalCalibration } from "../packages/grading/src/calibration.mjs";
import { buildExplainableGradingReport } from "../packages/grading/src/dimensions.mjs";
import { createPregradeAnalysis } from "../packages/grading/src/evidence.mjs";
import { normalizedBoundingBoxExtent } from "../packages/grading/src/measurement.mjs";

const standardProfile = Object.freeze({ id: "standard-western", nominalWidthMm: 63.5, nominalHeightMm: 88.9 });

function validCalibration(overrides = {}) {
  return normalizeCalibrationEvidence({
    referenceType: "kingdom-square-fiducial-v1",
    sourceMediaId: "front-primary",
    side: "front",
    samePlane: true,
    referenceCropped: false,
    referenceAmbiguous: false,
    referenceWidthMm: 25,
    referenceHeightMm: 25,
    referenceTopWidthPx: 100,
    referenceBottomWidthPx: 101,
    referenceLeftHeightPx: 100,
    referenceRightHeightPx: 100,
    cardTopWidthPx: 254,
    cardBottomWidthPx: 255,
    cardLeftHeightPx: 355,
    cardRightHeightPx: 356,
    confidence: 0.82,
    ...overrides
  }, { cardSizeProfile: standardProfile });
}

function pregradeRecord(calibration = validCalibration()) {
  const analysis = createPregradeAnalysis({
    analysisId: "analysis-front",
    treasureId: "treasure-1",
    standardProfile: "neutral",
    profileVersion: "1",
    cardSizeProfile: "standard-western",
    centering: { side: "front", measurement: { worstMajorPercent: 52, confidence: 0.85 } },
    captureQuality: [],
    calibrationEvidence: [calibration],
    detectorCoverage: [{
      detector: "contour",
      side: "front",
      sourceMediaIds: ["front-primary"],
      completed: true,
      usableForConditionInference: true,
      reviewCandidateCount: 1,
      method: "contour-v1"
    }],
    defects: [{
      type: "edge-contour-anomaly",
      region: "front-left-edge",
      severity: 0.32,
      confidence: 0.8,
      sourceMediaId: "front-primary",
      boundingBox: { x: 0.1, y: 0.2, width: 0.05, height: 0.12 }
    }],
    confidence: 0.8,
    limitations: [],
    createdAt: "2026-09-05T21:55:00.000Z"
  });
  return {
    id: "analysis-front",
    treasureId: "treasure-1",
    sourceMediaIds: ["front-primary"],
    analysisSha256: "a".repeat(64),
    analysis
  };
}

test("valid same-capture scale evidence derives card millimeters from the independent reference only", () => {
  const calibration = validCalibration();
  assert.equal(calibration.valid, true);
  assert.equal(calibration.physicalMeasurementAvailable, true);
  assert.equal(calibration.pixelToMillimeter.measurementAuthority, "independent-known-size-reference-in-same-capture");
  assert.ok(calibration.measuredCard.widthMm > 63 && calibration.measuredCard.widthMm < 64);
  assert.ok(calibration.measuredCard.heightMm > 88 && calibration.measuredCard.heightMm < 90);
  assert.equal(calibration.profileComparison.available, true);
  assert.equal(calibration.profileComparison.authenticityClaim, false);
  assert.equal(calibration.physicalAuthentication, false);
});

test("calibration fails closed when the reference is cropped or distorted", () => {
  const cropped = validCalibration({ referenceCropped: true });
  assert.equal(cropped.valid, false);
  assert.equal(cropped.physicalMeasurementAvailable, false);
  assert.deepEqual(cropped.failureReasons, ["reference-cropped"]);
  assert.equal(cropped.pixelToMillimeter, null);

  const distorted = validCalibration({ referenceTopWidthPx: 100, referenceBottomWidthPx: 130 });
  assert.equal(distorted.valid, false);
  assert.equal(distorted.failureReasons.includes("reference-perspective-or-distortion-outside-tolerance"), true);
});

test("normalized extent remains normalized-only unless a valid calibration exists", () => {
  const box = { x: 0.1, y: 0.2, width: 0.05, height: 0.12 };
  const normalized = normalizedBoundingBoxExtent(box);
  assert.equal(normalized.calibratedMillimeters, null);
  assert.equal(normalized.measurementAuthority, "normalized-image-geometry-only");

  const calibrated = normalizedBoundingBoxExtent(box, validCalibration());
  assert.equal(calibrated.measurementAuthority, "normalized-card-frame-plus-independent-scale-calibration");
  assert.ok(calibrated.calibratedMillimeters.approximateMajorSpanMm > 10);
  assert.equal(calibrated.calibratedMillimeters.exactPhysicalMeasurement, false);
});

test("explainable report exposes physical calibration summary and calibrated defect spans", () => {
  const report = buildExplainableGradingReport([pregradeRecord()], []);
  assert.equal(report.reportVersion, "kingdom-explainable-grading-report-v2");
  assert.equal(report.previousReportVersion, "kingdom-explainable-grading-report-v1");
  assert.equal(report.physicalMeasurement.physicalMeasurementAvailable, true);
  assert.equal(report.physicalAuthentication, false);
  const finding = report.dimensions.front.edges.findings[0];
  assert.equal(finding.physicalMeasurementAvailable, true);
  assert.ok(finding.extent.calibratedMillimeters.approximateMajorSpanMm > 10);
});

test("calibration summary refuses to promote absent scale into measurement", () => {
  const summary = summarizePhysicalCalibration([{ id: "analysis-empty", analysis: { evidenceClass: "ai-card-pregrade" } }]);
  assert.equal(summary.available, false);
  assert.equal(summary.physicalMeasurementAvailable, false);
  assert.equal(summary.measurementAuthority, "no-valid-independent-scale-reference");
});
