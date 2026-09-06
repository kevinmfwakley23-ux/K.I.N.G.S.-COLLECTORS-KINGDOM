import { randomUUID } from "node:crypto";
import { estimateAdvisoryGradeRange } from "./aggregate.mjs";
import { buildExplainableGradingReport } from "./dimensions.mjs";
import { findFinding } from "./findings.mjs";
import { VaultError } from "../../vault/src/service.mjs";

const DECISIONS = new Set(["accepted", "rejected", "uncertain"]);

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanIdentifier(value, label) {
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 160 || /[\u0000-\u001f\u007f]/.test(cleaned)) throw new VaultError(`invalid_${label}`, `${label} is invalid.`);
  return cleaned;
}

function cleanFindingHash(value) {
  const cleaned = cleanIdentifier(value, "finding_hash").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(cleaned)) throw new VaultError("invalid_finding_hash", "findingHash must be a SHA-256 hex digest.");
  return cleaned;
}

function cleanDecision(value) {
  const cleaned = cleanIdentifier(value, "finding_review_decision").toLowerCase();
  if (!DECISIONS.has(cleaned)) throw new VaultError("invalid_finding_review_decision", "Finding review decision must be accepted, rejected or uncertain.");
  return cleaned;
}

function cleanNote(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError("invalid_finding_review_note", "Finding review note must be text.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cleaned)) {
    throw new VaultError("invalid_finding_review_note", "Finding review note must contain 1 to 1000 safe characters.");
  }
  return cleaned;
}

function publicReview(record) {
  return Object.freeze({
    id: record.id,
    treasureId: record.treasureId,
    findingHash: record.findingHash,
    sourceAnalysisId: record.sourceAnalysisId,
    sourceAnalysisSha256: record.sourceAnalysisSha256,
    decision: record.decision,
    note: record.note,
    createdAt: record.createdAt,
    appendOnly: true,
    changesInterpretationOnly: true,
    deletesRawEvidence: false
  });
}

export function createExplainableGradingReportService({ vaultStore, analysisRepository, reviewRepository, now = () => new Date() } = {}) {
  if (!vaultStore || typeof vaultStore.findTreasureById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Explainable grading report service requires the Vault store boundary.");
  }
  if (!analysisRepository || typeof analysisRepository.findById !== "function" || typeof analysisRepository.listForTreasure !== "function") {
    throw new TypeError("Explainable grading report service requires the pre-grade analysis repository boundary.");
  }
  if (!reviewRepository || typeof reviewRepository.create !== "function" || typeof reviewRepository.listForTreasure !== "function") {
    throw new TypeError("Explainable grading report service requires the finding review repository boundary.");
  }
  if (typeof now !== "function") throw new TypeError("Explainable grading report service now must be a function.");

  function requireTreasure(ownerAccountId, treasureId) {
    const treasure = vaultStore.findTreasureById(ownerAccountId, treasureId, { includeArchived: true });
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    return treasure;
  }

  function appendReview(identity, treasureIdValue, input = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanIdentifier(treasureIdValue, "treasure_id");
    requireTreasure(collector.id, treasureId);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_finding_review", "Finding review data must be an object.");

    const sourceAnalysisId = cleanIdentifier(input.sourceAnalysisId, "source_analysis_id");
    const findingHash = cleanFindingHash(input.findingHash);
    const decision = cleanDecision(input.decision);
    const note = cleanNote(input.note);
    const analysis = analysisRepository.findById(collector.id, sourceAnalysisId);
    if (!analysis || analysis.treasureId !== treasureId) {
      throw new VaultError("pregrade_analysis_not_found", "The source pre-grade analysis does not exist on this treasure.", 404);
    }
    const finding = findFinding([analysis], findingHash);
    if (!finding) throw new VaultError("grading_finding_not_found", "The requested detector finding does not exist in the immutable source analysis.", 404);

    const createdAt = now().toISOString();
    const created = reviewRepository.create({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      findingHash,
      sourceAnalysisId: analysis.id,
      sourceAnalysisSha256: analysis.analysisSha256,
      decision,
      note,
      createdAt
    });

    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      eventType: "vault.pregrade_finding_review_appended",
      metadata: {
        findingReviewId: created.id,
        findingHash,
        sourceAnalysisId: analysis.id,
        sourceAnalysisSha256: analysis.analysisSha256,
        decision,
        rawDetectorEvidenceDeleted: false,
        authoritativeGradeMutation: false
      },
      createdAt
    });
    return publicReview(created);
  }

  function listReviews(identity, treasureIdValue, { limit = 200 } = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanIdentifier(treasureIdValue, "treasure_id");
    requireTreasure(collector.id, treasureId);
    const numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 1000) throw new VaultError("invalid_finding_review_limit", "Finding review limit must be between 1 and 1000.");
    return reviewRepository.listForTreasure(collector.id, treasureId, { limit: numericLimit }).map(publicReview);
  }

  function report(identity, treasureIdValue) {
    const collector = requireCollector(identity);
    const treasureId = cleanIdentifier(treasureIdValue, "treasure_id");
    requireTreasure(collector.id, treasureId);
    const analyses = analysisRepository.listForTreasure(collector.id, treasureId, { limit: 200 });
    const reviews = reviewRepository.listForTreasure(collector.id, treasureId, { limit: 1000 });
    const rawEvidenceOverallEstimate = estimateAdvisoryGradeRange(analyses);
    const explainableReport = buildExplainableGradingReport(analyses, reviews);
    return Object.freeze({
      treasureId,
      rawEvidenceOverallEstimate,
      overallEstimate: rawEvidenceOverallEstimate,
      overallEstimateAuthority: "raw-stored-analysis-evidence",
      overallEstimateReviewAware: false,
      dimensionInterpretationReviewAware: true,
      explainableReport,
      physicalMeasurement: explainableReport.physicalMeasurement,
      reviewHistory: Object.freeze(reviews.map(publicReview)),
      sourceAnalysisCount: analyses.length,
      rawEvidenceImmutable: true,
      collectorReviewAppendOnly: true,
      independentPhysicalScaleAvailable: explainableReport.physicalMeasurement.physicalMeasurementAvailable,
      independentlyVerifiedPixels: false,
      officialGrade: false,
      officialSubgrades: false,
      physicalAuthentication: false,
      mutatesAuthoritativeCondition: false,
      mutatesAuthoritativeGrade: false,
      mutatesAuthenticity: false,
      mutatesValue: false
    });
  }

  return Object.freeze({ appendReview, listReviews, report });
}
