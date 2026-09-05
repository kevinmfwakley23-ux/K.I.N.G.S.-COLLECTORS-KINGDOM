import { createHash, randomUUID } from "node:crypto";
import { estimateAdvisoryGradeRange } from "./aggregate.mjs";
import { measureCentering, evaluateCenteringAgainstProfile } from "./centering.mjs";
import { createPregradeAnalysis } from "./evidence.mjs";
import { getCardSizeProfile, getGradingStandardProfile } from "./profiles.mjs";
import { VaultError } from "../../vault/src/service.mjs";

const MAX_SOURCE_MEDIA = 24;
const MAX_LIMITATIONS = 20;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanIdentifier(value, label, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new VaultError(`invalid_${label}`, `${label} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 160 || /[\u0000-\u001f\u007f]/.test(cleaned)) throw new VaultError(`invalid_${label}`, `${label} is invalid.`);
  return cleaned;
}

function cleanProfile(value) {
  const id = cleanIdentifier(value ?? "neutral", "grading_profile", { required: true });
  try { return getGradingStandardProfile(id); }
  catch { throw new VaultError("invalid_grading_profile", "Unknown grading reference profile.", 400); }
}

function cleanCardSizeProfile(value) {
  const id = cleanIdentifier(value ?? "custom", "card_size_profile", { required: true });
  try { return getCardSizeProfile(id); }
  catch { throw new VaultError("invalid_card_size_profile", "Unknown card-size profile.", 400); }
}

function cleanSourceMediaIds(value) {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > MAX_SOURCE_MEDIA) throw new VaultError("invalid_pregrade_source_media", `sourceMediaIds must contain at most ${MAX_SOURCE_MEDIA} media identifiers.`);
  const cleaned = value.map((entry) => cleanIdentifier(entry, "source_media_id", { required: true }));
  return Object.freeze([...new Set(cleaned)]);
}

function cleanLimitations(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_LIMITATIONS) throw new VaultError("invalid_pregrade_limitations", `limitations must contain at most ${MAX_LIMITATIONS} entries.`);
  return value.map((entry) => {
    if (typeof entry !== "string") throw new VaultError("invalid_pregrade_limitations", "Each limitation must be text.");
    const cleaned = entry.trim();
    if (!cleaned || cleaned.length > 500) throw new VaultError("invalid_pregrade_limitations", "Each limitation must contain 1 to 500 characters.");
    return cleaned;
  });
}

function normalizeCentering(input, profileId) {
  if (input === undefined || input === null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_pregrade_centering", "centering must be an object.");
  const side = input.side === "back" ? "back" : input.side === "front" || input.side === undefined ? "front" : null;
  if (!side) throw new VaultError("invalid_pregrade_centering", "centering.side must be front or back.");
  let measurement;
  try {
    measurement = measureCentering({
      left: Number(input.left),
      right: Number(input.right),
      top: Number(input.top),
      bottom: Number(input.bottom),
      method: input.method ?? "manual-anchor",
      confidence: input.confidence === undefined ? 1 : Number(input.confidence)
    });
  } catch (error) {
    throw new VaultError("invalid_pregrade_centering", error instanceof Error ? error.message : "Centering measurement is invalid.");
  }
  return Object.freeze({
    side,
    measurement,
    referenceEvaluation: evaluateCenteringAgainstProfile(measurement, { profileId, side })
  });
}

function referencedMediaIds(input = {}) {
  const ids = [];
  for (const capture of Array.isArray(input.captureQuality) ? input.captureQuality : []) if (capture?.sourceMediaId) ids.push(capture.sourceMediaId);
  for (const coverage of Array.isArray(input.detectorCoverage) ? input.detectorCoverage : []) {
    for (const mediaId of Array.isArray(coverage?.sourceMediaIds) ? coverage.sourceMediaIds : []) if (mediaId) ids.push(mediaId);
  }
  for (const defect of Array.isArray(input.defects) ? input.defects : []) {
    if (defect?.sourceMediaId) ids.push(defect.sourceMediaId);
    if (defect?.comparisonMediaId) ids.push(defect.comparisonMediaId);
  }
  if (input.autographComparison?.sourceMediaId) ids.push(input.autographComparison.sourceMediaId);
  return ids;
}

function derivedConfidence({ centering, captureQuality, defects, autographComparison }) {
  const values = [];
  if (centering?.measurement && Number.isFinite(centering.measurement.confidence)) values.push(centering.measurement.confidence);
  for (const capture of Array.isArray(captureQuality) ? captureQuality : []) if (Number.isFinite(capture?.analyzerConfidence)) values.push(Number(capture.analyzerConfidence));
  for (const defect of Array.isArray(defects) ? defects : []) if (Number.isFinite(defect?.confidence)) values.push(Number(defect.confidence));
  if (Number.isFinite(autographComparison?.confidence)) values.push(Number(autographComparison.confidence));
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + Math.max(0, Math.min(1, value)), 0) / values.length) * 1000) / 1000;
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function publicRecord(record) {
  return Object.freeze({
    id: record.id,
    treasureId: record.treasureId,
    standardProfile: record.standardProfile,
    profileVersion: record.profileVersion,
    cardSizeProfile: record.cardSizeProfile,
    sourceMediaIds: record.sourceMediaIds,
    analysis: record.analysis,
    analysisSha256: record.analysisSha256,
    createdAt: record.createdAt,
    appendOnly: true,
    advisoryOnly: true,
    officialGrade: false,
    physicalAuthentication: false,
    mayMutateAuthoritativeGrade: false,
    mayMutateAuthoritativeCondition: false,
    mayMutateAuthenticity: false,
    mayMutateValue: false
  });
}

export function createPregradeAnalysisService({ vaultStore, mediaRepository, analysisRepository, now = () => new Date() } = {}) {
  if (!vaultStore || typeof vaultStore.findTreasureById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Pre-grade analysis service requires the Vault store boundary.");
  }
  if (!mediaRepository || typeof mediaRepository.findById !== "function") throw new TypeError("Pre-grade analysis service requires the media repository boundary.");
  if (!analysisRepository || typeof analysisRepository.create !== "function" || typeof analysisRepository.listForTreasure !== "function") {
    throw new TypeError("Pre-grade analysis service requires the analysis repository boundary.");
  }
  if (typeof now !== "function") throw new TypeError("Pre-grade analysis service now must be a function.");

  function requireTreasure(ownerAccountId, treasureId) {
    const treasure = vaultStore.findTreasureById(ownerAccountId, treasureId, { includeArchived: true });
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    return treasure;
  }

  function validateMediaLinks(ownerAccountId, treasureId, sourceMediaIds) {
    for (const mediaId of sourceMediaIds) {
      const media = mediaRepository.findById(ownerAccountId, mediaId);
      if (!media || media.treasureId !== treasureId) throw new VaultError("pregrade_source_media_not_found", "Every source media item must exist on the same treasure as the pre-grade analysis.", 404);
    }
  }

  function append(identity, treasureIdValue, input = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanIdentifier(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_pregrade_analysis", "Pre-grade analysis data must be an object.");
    if (input.estimatedGradeRange !== undefined && input.estimatedGradeRange !== null) {
      throw new VaultError("pregrade_estimated_grade_not_supported", "Client-supplied overall grade estimates are not accepted. Kingdom advisory ranges are computed server-side from stored evidence.");
    }

    const profile = cleanProfile(input.standardProfile);
    const cardSize = cleanCardSizeProfile(input.cardSizeProfile);
    const sourceMediaIds = cleanSourceMediaIds(input.sourceMediaIds);
    validateMediaLinks(collector.id, treasureId, sourceMediaIds);
    const sourceMediaSet = new Set(sourceMediaIds);
    for (const mediaId of referencedMediaIds(input)) {
      const cleaned = cleanIdentifier(mediaId, "evidence_source_media_id", { required: true });
      if (!sourceMediaSet.has(cleaned)) throw new VaultError("pregrade_evidence_media_not_linked", "Capture, detector coverage, defect and autograph evidence may reference only sourceMediaIds explicitly linked to this analysis.");
    }

    const centering = normalizeCentering(input.centering, profile.id);
    const createdAt = now().toISOString();
    const id = randomUUID();
    const confidence = derivedConfidence({
      centering,
      captureQuality: input.captureQuality,
      defects: input.defects,
      autographComparison: input.autographComparison
    });
    let analysis;
    try {
      analysis = createPregradeAnalysis({
        analysisId: id,
        treasureId,
        standardProfile: profile.id,
        profileVersion: profile.profileVersion,
        cardSizeProfile: cardSize.id,
        centering,
        captureQuality: input.captureQuality ?? [],
        detectorCoverage: input.detectorCoverage ?? [],
        defects: input.defects ?? [],
        autographComparison: input.autographComparison ?? null,
        estimatedGradeRange: null,
        confidence,
        limitations: [
          ...cleanLimitations(input.limitations),
          "This stored record is advisory AI pre-grade evidence, not an official third-party grade or physical authentication.",
          "Saving this record does not change the treasure's authoritative condition, grade, authenticity, provenance, ownership or value."
        ],
        createdAt
      });
    } catch (error) {
      if (error instanceof VaultError) throw error;
      throw new VaultError("invalid_pregrade_analysis", error instanceof Error ? error.message : "Pre-grade analysis is invalid.");
    }

    const analysisJson = canonicalJson(analysis);
    const analysisSha256 = createHash("sha256").update(analysisJson).digest("hex");
    const created = analysisRepository.create({
      id,
      ownerAccountId: collector.id,
      treasureId,
      standardProfile: profile.id,
      profileVersion: profile.profileVersion,
      cardSizeProfile: cardSize.id,
      sourceMediaIds,
      analysis,
      analysisSha256,
      createdAt
    });

    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      eventType: "vault.pregrade_analysis_appended",
      metadata: {
        pregradeAnalysisId: id,
        standardProfile: profile.id,
        profileVersion: profile.profileVersion,
        cardSizeProfile: cardSize.id,
        sourceMediaCount: sourceMediaIds.length,
        analysisSha256,
        officialGrade: false,
        physicalAuthentication: false
      },
      createdAt
    });
    return publicRecord(created);
  }

  function list(identity, treasureIdValue, { limit = 50 } = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanIdentifier(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    const numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 200) throw new VaultError("invalid_pregrade_limit", "Pre-grade result limit must be between 1 and 200.");
    return analysisRepository.listForTreasure(collector.id, treasureId, { limit: numericLimit }).map(publicRecord);
  }

  function estimate(identity, treasureIdValue) {
    const collector = requireCollector(identity);
    const treasureId = cleanIdentifier(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    const records = analysisRepository.listForTreasure(collector.id, treasureId, { limit: 200 });
    return Object.freeze({
      treasureId,
      estimate: estimateAdvisoryGradeRange(records),
      sourceAnalysisCount: records.length,
      computationAuthority: "server-aggregated-from-stored-client-computed-advisory-evidence",
      independentlyVerifiedPixels: false,
      advisoryOnly: true,
      officialGrade: false,
      physicalAuthentication: false,
      mutatesAuthoritativeCondition: false,
      mutatesAuthoritativeGrade: false,
      mutatesAuthenticity: false,
      mutatesValue: false
    });
  }

  return Object.freeze({ append, list, estimate });
}
