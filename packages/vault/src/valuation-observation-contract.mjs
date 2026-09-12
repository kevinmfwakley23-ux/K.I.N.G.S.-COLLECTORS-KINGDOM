import { createHash } from "node:crypto";
import { VaultError } from "./service.mjs";

export const VALUATION_OBSERVATION_TYPES = Object.freeze([
  "retail-price",
  "buylist-price",
  "sold-comparable",
  "asking-listing"
]);

export const VALUATION_ITEM_STATES = Object.freeze(["raw", "graded", "sealed", "other"]);

const AUTHORITIES = new WeakSet();
const OBSERVATION_TYPE_SET = new Set(VALUATION_OBSERVATION_TYPES);
const ITEM_STATE_SET = new Set(VALUATION_ITEM_STATES);

function requiredText(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim()) throw new VaultError(`invalid_${label}`, `${label} is required.`);
  const cleaned = value.normalize("NFKC").trim();
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function optionalText(value, label, max = 500) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.normalize("NFKC").trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function slug(value, label, max = 120) {
  const cleaned = requiredText(value, label, max).toLowerCase().replace(/[_\s]+/g, "-");
  if (!/^[a-z0-9][a-z0-9.-]{0,119}$/.test(cleaned)) {
    throw new VaultError(`invalid_${label}`, `${label} must contain lowercase letters, numbers, periods, or hyphens.`);
  }
  return cleaned;
}

function httpUrl(value, label, { required = false, httpsOnly = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new VaultError(`invalid_${label}`, `${label} is required.`);
    return null;
  }
  if (typeof value !== "string" || value.length > 2048) throw new VaultError(`invalid_${label}`, `${label} must be a valid URL.`);
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new VaultError(`invalid_${label}`, `${label} must be a valid URL.`);
  }
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (httpsOnly && parsed.protocol !== "https:" && !local) {
    throw new VaultError(`invalid_${label}`, `${label} must use HTTPS outside local testing.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new VaultError(`invalid_${label}`, `${label} must use HTTP or HTTPS.`);
  parsed.hash = "";
  return parsed.toString();
}

function dateOnly(value, label, now) {
  const cleaned = requiredText(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) throw new VaultError(`invalid_${label}`, `${label} must use YYYY-MM-DD format.`);
  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new VaultError(`invalid_${label}`, `${label} must be a real calendar date.`);
  }
  if (cleaned > now.toISOString().slice(0, 10)) throw new VaultError(`invalid_${label}`, `${label} cannot be in the future.`);
  return cleaned;
}

function timestamp(value, label, now, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new VaultError(`invalid_${label}`, `${label} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be an ISO timestamp.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new VaultError(`invalid_${label}`, `${label} must be an ISO timestamp.`);
  if (parsed.getTime() > now.getTime() + 60_000) throw new VaultError(`invalid_${label}`, `${label} cannot be in the future.`);
  return parsed.toISOString();
}

function amount(value) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new VaultError("invalid_provider_observation_amount", "amountCents must be a non-negative safe integer.");
  }
  return numeric;
}

function currency(value) {
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new VaultError("invalid_provider_observation_currency", "currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function observationType(value) {
  const cleaned = String(value ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!OBSERVATION_TYPE_SET.has(cleaned)) {
    throw new VaultError("invalid_provider_observation_type", "Unsupported provider valuation observation type.", 400, {
      allowed: VALUATION_OBSERVATION_TYPES
    });
  }
  return cleaned;
}

function itemState(value) {
  const cleaned = String(value ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!ITEM_STATE_SET.has(cleaned)) {
    throw new VaultError("invalid_provider_observation_item_state", "Unsupported provider valuation item state.", 400, {
      allowed: VALUATION_ITEM_STATES
    });
  }
  return cleaned;
}

function cleanAllowedTypes(value) {
  if (!Array.isArray(value) || value.length < 1) throw new TypeError("Valuation provider authority requires allowedObservationTypes.");
  const cleaned = [...new Set(value.map(observationType))];
  return Object.freeze(cleaned);
}

export function createValuationProviderAuthority({
  providerId,
  providerName,
  providerPolicyId,
  providerPolicyUrl = null,
  allowedObservationTypes
} = {}) {
  const authority = Object.freeze({
    providerId: slug(providerId, "provider_id"),
    providerName: requiredText(providerName, "provider_name", 160),
    providerPolicyId: requiredText(providerPolicyId, "provider_policy_id", 240),
    providerPolicyUrl: httpUrl(providerPolicyUrl, "provider_policy_url", { httpsOnly: true }),
    allowedObservationTypes: cleanAllowedTypes(allowedObservationTypes)
  });
  AUTHORITIES.add(authority);
  return authority;
}

export function isValuationProviderAuthority(value) {
  return Boolean(value && typeof value === "object" && AUTHORITIES.has(value));
}

export function normalizeProviderValuationObservation(authority, input = {}, { now = new Date() } = {}) {
  if (!isValuationProviderAuthority(authority)) {
    throw new VaultError("invalid_provider_observation_authority", "A trusted provider valuation authority is required.", 403);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VaultError("invalid_provider_observation", "Provider valuation observation must be an object.");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError("Provider valuation observation now must be a valid Date.");

  for (const [field, expected] of [["providerId", authority.providerId], ["providerName", authority.providerName], ["providerPolicyId", authority.providerPolicyId]]) {
    if (input[field] !== undefined && input[field] !== null && String(input[field]).trim() !== expected) {
      throw new VaultError("provider_observation_authority_mismatch", `${field} does not match the trusted provider authority.`);
    }
  }

  const type = observationType(input.observationType);
  if (!authority.allowedObservationTypes.includes(type)) {
    throw new VaultError("provider_observation_type_not_authorized", "The provider authority is not permitted to emit this observation type.", 403, {
      providerId: authority.providerId,
      observationType: type
    });
  }

  const state = itemState(input.itemState);
  const gradingCompany = optionalText(input.gradingCompany, "provider_observation_grading_company", 120);
  const gradeLabel = optionalText(input.gradeLabel, "provider_observation_grade_label", 80);
  if (state === "graded" && (!gradingCompany || !gradeLabel)) {
    throw new VaultError("provider_observation_grade_context_required", "Graded provider observations require gradingCompany and gradeLabel.");
  }
  if (state !== "graded" && (gradingCompany || gradeLabel)) {
    throw new VaultError("provider_observation_grade_context_invalid", "Grading company and grade label are valid only for graded observations.");
  }

  const observedDate = dateOnly(input.observedDate, "provider_observation_observed_date", now);
  const retrievedAt = timestamp(input.retrievedAt ?? now.toISOString(), "provider_observation_retrieved_at", now, { required: true });
  const providerBuildAt = timestamp(input.providerBuildAt, "provider_observation_provider_build_at", now);
  if (providerBuildAt && new Date(providerBuildAt).getTime() > new Date(retrievedAt).getTime() + 60_000) {
    throw new VaultError("provider_observation_build_after_retrieval", "providerBuildAt cannot be later than retrievedAt.");
  }
  if (observedDate > retrievedAt.slice(0, 10)) {
    throw new VaultError("provider_observation_observed_after_retrieval", "observedDate cannot be later than retrievedAt.");
  }

  return Object.freeze({
    providerId: authority.providerId,
    providerName: authority.providerName,
    providerPolicyId: authority.providerPolicyId,
    providerPolicyUrl: authority.providerPolicyUrl,
    providerObservationId: requiredText(input.providerObservationId, "provider_observation_id", 500),
    providerItemReference: optionalText(input.providerItemReference, "provider_item_reference", 500),
    observationType: type,
    sourceName: requiredText(input.sourceName ?? authority.providerName, "provider_observation_source_name", 160),
    sourceUrl: httpUrl(input.sourceUrl, "provider_observation_source_url", { required: true, httpsOnly: true }),
    sourceReference: optionalText(input.sourceReference, "provider_observation_source_reference", 1000),
    observedDate,
    retrievedAt,
    providerBuildAt,
    amountCents: amount(input.amountCents),
    currency: currency(input.currency),
    itemState: state,
    conditionLabel: optionalText(input.conditionLabel, "provider_observation_condition_label", 120),
    gradingCompany,
    gradeLabel,
    marketVariant: optionalText(input.marketVariant, "provider_observation_market_variant", 120),
    notes: optionalText(input.notes, "provider_observation_notes", 4000)
  });
}

function digestPayload(observation) {
  return JSON.stringify({
    id: observation.id,
    ownerAccountId: observation.ownerAccountId,
    treasureId: observation.treasureId,
    providerId: observation.providerId,
    providerName: observation.providerName,
    providerPolicyId: observation.providerPolicyId,
    providerPolicyUrl: observation.providerPolicyUrl,
    providerObservationId: observation.providerObservationId,
    providerItemReference: observation.providerItemReference,
    observationType: observation.observationType,
    sourceName: observation.sourceName,
    sourceUrl: observation.sourceUrl,
    sourceReference: observation.sourceReference,
    observedDate: observation.observedDate,
    retrievedAt: observation.retrievedAt,
    providerBuildAt: observation.providerBuildAt,
    amountCents: observation.amountCents,
    currency: observation.currency,
    itemState: observation.itemState,
    conditionLabel: observation.conditionLabel,
    gradingCompany: observation.gradingCompany,
    gradeLabel: observation.gradeLabel,
    marketVariant: observation.marketVariant,
    notes: observation.notes,
    evidenceClass: observation.evidenceClass,
    createdAt: observation.createdAt
  });
}

export function providerValuationObservationSha256(observation) {
  return createHash("sha256").update(digestPayload(observation), "utf8").digest("hex");
}

export function assertProviderValuationObservationIntegrity(observation) {
  const expected = providerValuationObservationSha256(observation);
  if (expected !== observation.observationSha256) {
    throw new VaultError("provider_observation_integrity_failure", "Stored provider valuation observation failed its integrity check.", 500, {
      observationId: observation.id
    });
  }
}
