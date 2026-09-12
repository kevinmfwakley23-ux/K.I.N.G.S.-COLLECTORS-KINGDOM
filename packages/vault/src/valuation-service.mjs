import { createHash, randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

const EVIDENCE_TYPES = Object.freeze(["sold-comparable", "asking-listing"]);
const ITEM_STATES = Object.freeze(["raw", "graded", "sealed", "other"]);
const FRESHNESS_WINDOW_DAYS = 180;
const MINIMUM_RECENT_SOLD_COMPARABLES = 3;
const MAX_ESTIMATE_COMPARABLES = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanReference(value, label, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new VaultError(`invalid_${label}`, `${label} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be a valid identifier.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 100) throw new VaultError(`invalid_${label}`, `${label} must be a valid identifier.`);
  return cleaned;
}

function cleanRequiredText(value, label, max) {
  if (typeof value !== "string" || !value.trim()) throw new VaultError(`invalid_${label}`, `${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function cleanOptionalText(value, label, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function cleanEnum(value, label, allowed) {
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} is required.`);
  const cleaned = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!allowed.includes(cleaned)) throw new VaultError(`invalid_${label}`, `Unsupported ${label}.`, 400, { allowed });
  return cleaned;
}

function cleanDate(value, label, now) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new VaultError(`invalid_${label}`, `${label} must use YYYY-MM-DD format.`);
  }
  const cleaned = value.trim();
  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new VaultError(`invalid_${label}`, `${label} must be a real calendar date.`);
  }
  if (cleaned > now.toISOString().slice(0, 10)) {
    throw new VaultError(`invalid_${label}`, `${label} cannot be in the future.`);
  }
  return cleaned;
}

function cleanAmount(value) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new VaultError("invalid_valuation_amount", "amountCents must be a non-negative safe integer.");
  }
  return numeric;
}

function cleanCurrency(value) {
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new VaultError("invalid_valuation_currency", "currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function cleanSourceUrl(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) {
    throw new VaultError("invalid_valuation_source_url", "sourceUrl must be a valid HTTP or HTTPS URL.");
  }
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new VaultError("invalid_valuation_source_url", "sourceUrl must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new VaultError("invalid_valuation_source_url", "sourceUrl must use HTTP or HTTPS.");
  }
  parsed.hash = "";
  return parsed.toString();
}

function digestPayload(evidence) {
  return JSON.stringify({
    id: evidence.id,
    ownerAccountId: evidence.ownerAccountId,
    treasureId: evidence.treasureId,
    evidenceType: evidence.evidenceType,
    sourceName: evidence.sourceName,
    sourceUrl: evidence.sourceUrl,
    sourceReference: evidence.sourceReference,
    observedDate: evidence.observedDate,
    amountCents: evidence.amountCents,
    currency: evidence.currency,
    itemState: evidence.itemState,
    conditionLabel: evidence.conditionLabel,
    gradingCompany: evidence.gradingCompany,
    gradeLabel: evidence.gradeLabel,
    notes: evidence.notes,
    correctsEvidenceId: evidence.correctsEvidenceId,
    evidenceClass: evidence.evidenceClass,
    createdAt: evidence.createdAt
  });
}

export function valuationEvidenceSha256(evidence) {
  return createHash("sha256").update(digestPayload(evidence), "utf8").digest("hex");
}

function assertEvidenceIntegrity(evidence) {
  const expected = valuationEvidenceSha256(evidence);
  if (expected !== evidence.evidenceSha256) {
    throw new VaultError("valuation_evidence_integrity_failure", "Stored valuation evidence failed its integrity check.", 500, {
      evidenceId: evidence.id
    });
  }
}

function publicEvidence(evidence, correctedIds) {
  return Object.freeze({
    id: evidence.id,
    treasureId: evidence.treasureId,
    evidenceType: evidence.evidenceType,
    sourceName: evidence.sourceName,
    sourceUrl: evidence.sourceUrl,
    sourceReference: evidence.sourceReference,
    observedDate: evidence.observedDate,
    amountCents: evidence.amountCents,
    currency: evidence.currency,
    itemState: evidence.itemState,
    conditionLabel: evidence.conditionLabel,
    gradingCompany: evidence.gradingCompany,
    gradeLabel: evidence.gradeLabel,
    notes: evidence.notes,
    correctsEvidenceId: evidence.correctsEvidenceId,
    corrected: correctedIds.has(evidence.id),
    evidenceClass: evidence.evidenceClass,
    independentlyVerified: false,
    evidenceSha256: evidence.evidenceSha256,
    createdAt: evidence.createdAt
  });
}

function bucketKey(evidence) {
  return JSON.stringify([
    evidence.currency,
    evidence.itemState,
    (evidence.conditionLabel ?? "").toLowerCase(),
    (evidence.gradingCompany ?? "").toLowerCase(),
    (evidence.gradeLabel ?? "").toLowerCase()
  ]);
}

function bucketContext(evidence) {
  return Object.freeze({
    currency: evidence.currency,
    itemState: evidence.itemState,
    conditionLabel: evidence.conditionLabel,
    gradingCompany: evidence.gradingCompany,
    gradeLabel: evidence.gradeLabel
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function ageDays(observedDate, now) {
  const observed = Date.parse(`${observedDate}T00:00:00.000Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return Math.max(0, Math.floor((today - observed) / DAY_MS));
}

function estimateConfidence(sampleCount, sourceCount) {
  if (sampleCount >= 10 && sourceCount >= 2) return "strong";
  if (sampleCount >= 5) return "moderate";
  return "limited";
}

function buildBucketSnapshot(records, now) {
  const context = bucketContext(records[0]);
  const sold = records.filter((record) => record.evidenceType === "sold-comparable");
  const asking = records.filter((record) => record.evidenceType === "asking-listing");
  const recentSold = sold
    .filter((record) => ageDays(record.observedDate, now) <= FRESHNESS_WINDOW_DAYS)
    .sort((a, b) => b.observedDate.localeCompare(a.observedDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ESTIMATE_COMPARABLES);
  const sourceCount = new Set(recentSold.map((record) => record.sourceName.toLowerCase())).size;
  const common = {
    key: bucketKey(records[0]),
    context,
    soldComparableCount: sold.length,
    recentSoldComparableCount: recentSold.length,
    askingListingCount: asking.length,
    freshnessWindowDays: FRESHNESS_WINDOW_DAYS,
    minimumRecentSoldComparables: MINIMUM_RECENT_SOLD_COMPARABLES,
    askingListingsInfluenceEstimate: false,
    appraisal: false,
    advisoryOnly: true
  };

  if (recentSold.length < MINIMUM_RECENT_SOLD_COMPARABLES) {
    return Object.freeze({
      ...common,
      estimateAvailable: false,
      reason: "insufficient_recent_sold_comparables",
      estimate: null,
      warnings: Object.freeze([
        "At least three recent sold comparables in the same currency and condition/grade bucket are required before the Kingdom will calculate an estimate."
      ])
    });
  }

  const amounts = recentSold.map((record) => record.amountCents);
  const warnings = [];
  if (sourceCount < 2) warnings.push("All recent sold comparables come from one named source; independent market coverage is limited.");
  if (context.itemState === "raw" && !context.conditionLabel) warnings.push("Raw comparables do not specify a condition label, so condition matching is broad.");

  return Object.freeze({
    ...common,
    estimateAvailable: true,
    reason: null,
    estimate: Object.freeze({
      method: "median-recent-sold-comparables",
      sampleCount: recentSold.length,
      sourceCount,
      lowCents: Math.min(...amounts),
      medianCents: median(amounts),
      highCents: Math.max(...amounts),
      currency: context.currency,
      oldestObservedDate: recentSold.reduce((oldest, record) => record.observedDate < oldest ? record.observedDate : oldest, recentSold[0].observedDate),
      newestObservedDate: recentSold.reduce((newest, record) => record.observedDate > newest ? record.observedDate : newest, recentSold[0].observedDate),
      confidence: estimateConfidence(recentSold.length, sourceCount),
      evidenceIds: Object.freeze(recentSold.map((record) => record.id))
    }),
    warnings: Object.freeze(warnings)
  });
}

export function createVaultValuationService({ vaultStore, valuationRepository, now = () => new Date() } = {}) {
  if (!vaultStore || typeof vaultStore.findTreasureById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Vault valuation service requires the Vault store boundary.");
  }
  if (!valuationRepository || typeof valuationRepository.create !== "function" || typeof valuationRepository.listForTreasure !== "function") {
    throw new TypeError("Vault valuation service requires a valuation repository.");
  }
  if (typeof now !== "function") throw new TypeError("Vault valuation service now must be a function.");

  function requireTreasure(ownerAccountId, treasureId) {
    const treasure = vaultStore.findTreasureById(ownerAccountId, treasureId, { includeArchived: true });
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    return treasure;
  }

  function recordsFor(ownerAccountId, treasureId) {
    const records = valuationRepository.listForTreasure(ownerAccountId, treasureId, { limit: 1000 });
    for (const record of records) assertEvidenceIntegrity(record);
    return records;
  }

  function append(identity, treasureIdValue, input = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new VaultError("invalid_valuation_evidence", "Valuation evidence must be an object.");
    }

    const evidenceType = cleanEnum(input.evidenceType, "valuation_evidence_type", EVIDENCE_TYPES);
    const itemState = cleanEnum(input.itemState, "valuation_item_state", ITEM_STATES);
    const sourceName = cleanRequiredText(input.sourceName, "valuation_source_name", 160);
    const sourceUrl = cleanSourceUrl(input.sourceUrl);
    const sourceReference = cleanOptionalText(input.sourceReference, "valuation_source_reference", 500);
    if (!sourceUrl && !sourceReference) {
      throw new VaultError("valuation_source_evidence_required", "Record a sourceUrl or sourceReference so the comparable can be audited later.");
    }

    const gradingCompany = cleanOptionalText(input.gradingCompany, "valuation_grading_company", 120);
    const gradeLabel = cleanOptionalText(input.gradeLabel, "valuation_grade_label", 80);
    if (itemState === "graded" && (!gradingCompany || !gradeLabel)) {
      throw new VaultError("valuation_grade_context_required", "Graded comparables require both gradingCompany and gradeLabel.");
    }
    if (itemState !== "graded" && (gradingCompany || gradeLabel)) {
      throw new VaultError("valuation_grade_context_invalid", "Grading company and grade label are only valid for graded comparables.");
    }

    const correctsEvidenceId = cleanReference(input.correctsEvidenceId, "valuation_corrects_evidence_id");
    if (correctsEvidenceId) {
      const target = valuationRepository.findById(collector.id, correctsEvidenceId);
      if (!target || target.treasureId !== treasureId) {
        throw new VaultError("valuation_correction_target_not_found", "The valuation evidence being corrected does not exist on this treasure.", 404);
      }
      if (valuationRepository.findCorrection(collector.id, treasureId, correctsEvidenceId)) {
        throw new VaultError("valuation_evidence_already_corrected", "That valuation evidence already has a correction. Correct the latest active record instead.");
      }
    }

    const createdAt = now().toISOString();
    const evidence = {
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      evidenceType,
      sourceName,
      sourceUrl,
      sourceReference,
      observedDate: cleanDate(input.observedDate, "valuation_observed_date", now()),
      amountCents: cleanAmount(input.amountCents),
      currency: cleanCurrency(input.currency),
      itemState,
      conditionLabel: cleanOptionalText(input.conditionLabel, "valuation_condition_label", 120),
      gradingCompany,
      gradeLabel,
      notes: cleanOptionalText(input.notes, "valuation_notes", 4000),
      correctsEvidenceId,
      evidenceClass: "collector-recorded-comparable",
      createdAt
    };
    evidence.evidenceSha256 = valuationEvidenceSha256(evidence);
    const created = valuationRepository.create(evidence);

    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      eventType: "vault.valuation_evidence_appended",
      metadata: {
        valuationEvidenceId: created.id,
        evidenceType: created.evidenceType,
        observedDate: created.observedDate,
        currency: created.currency,
        itemState: created.itemState,
        correctsEvidenceId: created.correctsEvidenceId
      },
      createdAt
    });

    const correctedIds = new Set(recordsFor(collector.id, treasureId).map((record) => record.correctsEvidenceId).filter(Boolean));
    return publicEvidence(created, correctedIds);
  }

  function list(identity, treasureIdValue) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    const records = recordsFor(collector.id, treasureId);
    const correctedIds = new Set(records.map((record) => record.correctsEvidenceId).filter(Boolean));
    return [...records].reverse().map((record) => publicEvidence(record, correctedIds));
  }

  function snapshot(identity, treasureIdValue) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    const records = recordsFor(collector.id, treasureId);
    const correctedIds = new Set(records.map((record) => record.correctsEvidenceId).filter(Boolean));
    const active = records.filter((record) => !correctedIds.has(record.id));
    const grouped = new Map();
    for (const record of active) {
      const key = bucketKey(record);
      const bucket = grouped.get(key) ?? [];
      bucket.push(record);
      grouped.set(key, bucket);
    }
    const buckets = [...grouped.values()]
      .map((bucket) => buildBucketSnapshot(bucket, now()))
      .sort((a, b) => {
        if (a.estimateAvailable !== b.estimateAvailable) return a.estimateAvailable ? -1 : 1;
        return b.recentSoldComparableCount - a.recentSoldComparableCount || a.key.localeCompare(b.key);
      });

    return Object.freeze({
      treasureId,
      generatedAt: now().toISOString(),
      evidenceCount: records.length,
      activeEvidenceCount: active.length,
      correctedEvidenceCount: correctedIds.size,
      bucketCount: buckets.length,
      buckets: Object.freeze(buckets),
      policy: Object.freeze({
        evidenceClass: "collector-recorded-comparable",
        appendOnly: true,
        ordinaryUpdateAvailable: false,
        ordinaryDeleteAvailable: false,
        independentlyVerified: false,
        askingListingsInfluenceEstimate: false,
        crossCurrencyAggregation: false,
        minimumRecentSoldComparables: MINIMUM_RECENT_SOLD_COMPARABLES,
        freshnessWindowDays: FRESHNESS_WINDOW_DAYS,
        estimateIsAppraisal: false,
        marketValueFieldMutated: false
      })
    });
  }

  function exportAll(identity) {
    const collector = requireCollector(identity);
    const records = valuationRepository.listForOwner(collector.id);
    for (const record of records) assertEvidenceIntegrity(record);
    const correctedIds = new Set(records.map((record) => record.correctsEvidenceId).filter(Boolean));
    return records.map((record) => publicEvidence(record, correctedIds));
  }

  return Object.freeze({
    evidenceTypes: EVIDENCE_TYPES,
    itemStates: ITEM_STATES,
    append,
    list,
    snapshot,
    exportAll
  });
}
