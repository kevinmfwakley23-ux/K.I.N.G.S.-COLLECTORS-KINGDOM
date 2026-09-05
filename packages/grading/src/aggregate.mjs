const SIDES = Object.freeze(["front", "back"]);
const DIMENSION_WEIGHTS = Object.freeze({ centering: 0.1, capture: 0.15, contour: 0.15, surface: 0.1 });

const DEFECT_WEIGHTS = Object.freeze({
  "corner-contour-anomaly": 1.2,
  "edge-contour-anomaly": 1.2,
  "surface-reflectance-anomaly": 1.4,
  "corner-whitening": 1.6,
  "corner-rounding": 1.8,
  "corner-ding": 2.3,
  "corner-bend": 2.8,
  "corner-layering": 2.5,
  "corner-crease": 3.2,
  "edge-chipping": 1.8,
  "edge-roughness": 1.4,
  "edge-notch": 2.1,
  "edge-layering": 2.4,
  "surface-scratch": 1.9,
  "surface-scuff": 1.5,
  "surface-print-line": 1.4,
  "surface-dent": 2.6,
  "surface-indentation": 2.4,
  "surface-stain": 2.4,
  "surface-wrinkle": 2.7,
  "surface-crease": 3.4,
  "gloss-loss": 1.7,
  "print-spot": 1.2,
  registration: 1.1,
  focus: 1.0,
  "color-fade": 1.8,
  discoloration: 2.0,
  "suspected-trimming": 4.0,
  "suspected-recoloration": 4.0,
  "suspected-restoration": 4.0,
  "suspected-cleaning": 3.5,
  "suspected-altered-stock": 4.0
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function halfStep(value) {
  return Math.round(value * 2) / 2;
}

function sideFromCapture(capture) {
  const view = String(capture?.view ?? "").toLowerCase();
  if (view.startsWith("front")) return "front";
  if (view.startsWith("back")) return "back";
  return null;
}

function defectKey(defect) {
  return JSON.stringify([
    defect?.type ?? null,
    defect?.region ?? null,
    defect?.sourceMediaId ?? null,
    defect?.comparisonMediaId ?? null,
    defect?.boundingBox ?? null
  ]);
}

function normalizedRecords(records) {
  if (!Array.isArray(records)) throw new TypeError("Stored pre-grade records must be an array.");
  return records.filter((record) => record?.analysis?.evidenceClass === "ai-card-pregrade");
}

export function estimateAdvisoryGradeRange(records = []) {
  const stored = normalizedRecords(records);
  const bySide = Object.fromEntries(SIDES.map((side) => [side, {
    centering: null,
    capture: null,
    contour: null,
    surface: null
  }]));
  const uniqueDefects = new Map();

  for (const record of stored) {
    const analysis = record.analysis;
    const centeringSide = analysis.centering?.side;
    if (SIDES.includes(centeringSide) && analysis.centering?.measurement) {
      const current = bySide[centeringSide].centering;
      const candidateConfidence = Number(analysis.centering.measurement.confidence ?? 0);
      const currentConfidence = Number(current?.measurement?.confidence ?? -1);
      if (!current || candidateConfidence >= currentConfidence) bySide[centeringSide].centering = analysis.centering;
    }
    for (const capture of analysis.captureQuality ?? []) {
      const captureSide = sideFromCapture(capture);
      if (!captureSide) continue;
      const current = bySide[captureSide].capture;
      const candidateUsable = capture.usableForPregrade === true;
      const currentUsable = current?.usableForPregrade === true;
      if (!current || (candidateUsable && !currentUsable) || (candidateUsable === currentUsable && Number(capture.analyzerConfidence ?? 0) > Number(current.analyzerConfidence ?? 0))) {
        bySide[captureSide].capture = capture;
      }
    }
    for (const coverage of analysis.detectorCoverage ?? []) {
      if (!SIDES.includes(coverage.side) || coverage.completed !== true) continue;
      const key = coverage.detector === "contour" ? "contour" : coverage.detector === "paired-raking-light" ? "surface" : null;
      if (!key) continue;
      const current = bySide[coverage.side][key];
      const candidateUsable = coverage.usableForConditionInference === true;
      const currentUsable = current?.usableForConditionInference === true;
      if (!current || (candidateUsable && !currentUsable)) bySide[coverage.side][key] = coverage;
    }
    for (const defect of analysis.defects ?? []) {
      const key = defectKey(defect);
      const current = uniqueDefects.get(key);
      if (!current || Number(defect.confidence ?? 0) > Number(current.confidence ?? 0)) uniqueDefects.set(key, defect);
    }
  }

  let coverageScore = 0;
  const missing = [];
  const completed = [];
  const evidenceConfidences = [];
  for (const side of SIDES) {
    const evidence = bySide[side];
    if (evidence.centering?.measurement) {
      coverageScore += DIMENSION_WEIGHTS.centering;
      completed.push(`${side}:centering`);
      evidenceConfidences.push(Number(evidence.centering.measurement.confidence ?? 0));
    } else missing.push(`${side}:centering`);

    if (evidence.capture?.usableForPregrade) {
      coverageScore += DIMENSION_WEIGHTS.capture;
      completed.push(`${side}:usable-capture`);
      evidenceConfidences.push(Number(evidence.capture.analyzerConfidence ?? 0));
    } else missing.push(`${side}:usable-capture`);

    if (evidence.contour?.usableForConditionInference) {
      coverageScore += DIMENSION_WEIGHTS.contour;
      completed.push(`${side}:contour`);
    } else missing.push(`${side}:contour`);

    if (evidence.surface?.usableForConditionInference) {
      coverageScore += DIMENSION_WEIGHTS.surface;
      completed.push(`${side}:paired-surface`);
    } else missing.push(`${side}:paired-surface`);
  }
  coverageScore = rounded(coverageScore);

  const minimumSide = SIDES.find((side) => bySide[side].centering?.measurement && bySide[side].capture?.usableForPregrade && bySide[side].contour?.usableForConditionInference) ?? null;
  if (!minimumSide) {
    return Object.freeze({
      available: false,
      range: null,
      confidence: 0,
      completeness: coverageScore,
      evidenceLevel: "insufficient",
      completed: Object.freeze(completed),
      missing: Object.freeze(missing),
      reason: "An advisory range requires at least one card side with centering, a usable SHA-linked straight-on capture, and completed usable contour coverage.",
      rubric: "kingdom-advisory-condition-range-v1",
      officialGrade: false,
      affiliatedGraderEstimate: false,
      mutatesTreasure: false
    });
  }

  let centeringPenalty = 0;
  for (const side of SIDES) {
    const measurement = bySide[side].centering?.measurement;
    if (!measurement) continue;
    const deviation = Math.max(0, Number(measurement.worstMajorPercent ?? 50) - 50);
    const sideWeight = side === "front" ? 1 : 0.65;
    centeringPenalty += Math.min(3, deviation * 0.15) * sideWeight;
  }

  let defectPenalty = 0;
  let defectUncertainty = 0;
  for (const defect of uniqueDefects.values()) {
    const severity = clamp(Number(defect.severity ?? 0), 0, 1);
    const confidence = clamp(Number(defect.confidence ?? 0), 0, 1);
    const weight = DEFECT_WEIGHTS[defect.type] ?? 1.5;
    defectPenalty += severity * confidence * weight;
    defectUncertainty += severity * (1 - confidence) * 0.6;
    evidenceConfidences.push(confidence);
  }
  defectPenalty = Math.min(7.5, defectPenalty);

  const center = clamp(10 - centeringPenalty - defectPenalty, 1, 10);
  const evidenceConfidence = evidenceConfidences.length
    ? evidenceConfidences.reduce((sum, value) => sum + clamp(value, 0, 1), 0) / evidenceConfidences.length
    : 0;
  const bothSidesMinimum = SIDES.every((side) => bySide[side].centering?.measurement && bySide[side].capture?.usableForPregrade && bySide[side].contour?.usableForConditionInference);
  const fullSurface = SIDES.every((side) => bySide[side].surface?.usableForConditionInference);
  const uncertainty = clamp(0.5 + (1 - coverageScore) * 3.25 + defectUncertainty + (bothSidesMinimum ? 0 : 0.5) + (fullSurface ? 0 : 0.35), 0.5, 4.5);
  let min = clamp(halfStep(center - uncertainty), 1, 10);
  let max = clamp(halfStep(center + uncertainty), 1, 10);
  if (max - min < 1) {
    min = clamp(halfStep(center - 0.5), 1, 10);
    max = clamp(halfStep(center + 0.5), 1, 10);
  }
  const confidence = rounded(clamp(0.15 + coverageScore * 0.6 + evidenceConfidence * 0.2, 0, 0.9));
  const evidenceLevel = coverageScore >= 0.9 && bothSidesMinimum && fullSurface
    ? "substantial"
    : coverageScore >= 0.65 && bothSidesMinimum
      ? "moderate"
      : "partial";

  return Object.freeze({
    available: true,
    range: Object.freeze({ min, max }),
    center: rounded(center, 2),
    confidence,
    completeness: coverageScore,
    evidenceLevel,
    completed: Object.freeze(completed),
    missing: Object.freeze(missing),
    uniqueReviewCandidateCount: uniqueDefects.size,
    penalties: Object.freeze({ centering: rounded(centeringPenalty, 2), defects: rounded(defectPenalty, 2) }),
    reason: evidenceLevel === "partial"
      ? "A partial-evidence advisory range is available, widened to reflect missing card-side or surface coverage."
      : evidenceLevel === "moderate"
        ? "Both card sides meet the minimum evidence floor; missing detector coverage still widens the advisory range."
        : "Broad front/back capture, contour and paired-surface coverage supports the narrowest range this rubric can provide.",
    rubric: "kingdom-advisory-condition-range-v1",
    officialGrade: false,
    affiliatedGraderEstimate: false,
    mutatesTreasure: false,
    disclaimer: "This is a Kingdom advisory evidence range, not a PSA, BGS, CGC or other third-party grade. It does not authenticate the card and does not change Vault condition, grade, authenticity or value."
  });
}
