import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function requireSha256(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new TypeError(`${label} must be a SHA-256 hex digest.`);
  return normalized;
}

export function findingFingerprint(defect = {}) {
  return canonical({
    type: defect.type ?? null,
    region: defect.region ?? null,
    severity: defect.severity ?? null,
    confidence: defect.confidence ?? null,
    sourceMediaId: defect.sourceMediaId ?? null,
    comparisonMediaId: defect.comparisonMediaId ?? null,
    boundingBox: defect.boundingBox ?? null
  });
}

export function createFindingHash({ analysisSha256, defectIndex, defect } = {}) {
  const analysisDigest = requireSha256(analysisSha256, "Analysis digest");
  const index = Number(defectIndex);
  if (!Number.isInteger(index) || index < 0 || index > 100000) throw new RangeError("Defect index must be a non-negative integer.");
  if (!defect || typeof defect !== "object" || Array.isArray(defect)) throw new TypeError("Defect evidence is required.");
  return createHash("sha256")
    .update(JSON.stringify({ analysisSha256: analysisDigest, defectIndex: index, defect: findingFingerprint(defect) }))
    .digest("hex");
}

export function enumerateFindings(record) {
  if (!record || typeof record !== "object") return Object.freeze([]);
  const defects = Array.isArray(record.analysis?.defects) ? record.analysis.defects : [];
  return Object.freeze(defects.map((defect, defectIndex) => Object.freeze({
    findingHash: createFindingHash({ analysisSha256: record.analysisSha256, defectIndex, defect }),
    defectIndex,
    sourceAnalysisId: record.id,
    sourceAnalysisSha256: record.analysisSha256,
    treasureId: record.treasureId,
    defect
  })));
}

export function findFinding(records, findingHash) {
  const target = requireSha256(findingHash, "Finding hash");
  for (const record of Array.isArray(records) ? records : []) {
    for (const finding of enumerateFindings(record)) if (finding.findingHash === target) return finding;
  }
  return null;
}
