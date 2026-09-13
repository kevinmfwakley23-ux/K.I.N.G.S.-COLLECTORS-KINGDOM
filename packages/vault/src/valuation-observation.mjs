import { VaultError } from "./service.mjs";

export const VALUATION_OBSERVATION_TYPES = Object.freeze(["sold-comparable", "asking-listing"]);
export const VALUATION_ITEM_STATES = Object.freeze(["raw", "graded", "sealed", "other"]);

function requiredText(value, label, max = 500) {
  if (typeof value !== "string" || !value.trim()) {
    throw new VaultError(`invalid_${label}`, `${label} is required.`);
  }
  const cleaned = value.trim();
  if (cleaned.length > max || /[\r\n]/.test(cleaned)) {
    throw new VaultError(`invalid_${label}`, `${label} is invalid.`);
  }
  return cleaned;
}

function optionalText(value, label, max = 500) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max || /[\r\n]/.test(cleaned)) {
    throw new VaultError(`invalid_${label}`, `${label} is invalid.`);
  }
  return cleaned;
}

function enumValue(value, label, allowed) {
  const cleaned = requiredText(value, label, 80).toLowerCase().replace(/[_\s]+/g, "-");
  if (!allowed.includes(cleaned)) {
    throw new VaultError(`invalid_${label}`, `Unsupported ${label}.`, 400, { allowed });
  }
  return cleaned;
}

function dateValue(value, label) {
  const cleaned = requiredText(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    throw new VaultError(`invalid_${label}`, `${label} must use YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new VaultError(`invalid_${label}`, `${label} must be a real calendar date.`);
  }
  return cleaned;
}

function timestampValue(value, label) {
  const cleaned = requiredText(value, label, 64);
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) throw new VaultError(`invalid_${label}`, `${label} must be an ISO timestamp.`);
  return parsed.toISOString();
}

function amountValue(value) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new VaultError("invalid_valuation_amount", "amountCents must be a non-negative safe integer.");
  }
  return numeric;
}

function currencyValue(value) {
  const cleaned = requiredText(value, "valuation_currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(cleaned)) {
    throw new VaultError("invalid_valuation_currency", "currency must be a three-letter currency code.");
  }
  return cleaned;
}

function sourceUrlValue(value) {
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

export function normalizeValuationObservation(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VaultError("invalid_valuation_observation", "Provider valuation observation must be an object.");
  }

  const providerId = requiredText(input.providerId, "valuation_provider_id", 120).toLowerCase();
  const providerObservationId = requiredText(input.providerObservationId, "valuation_provider_observation_id", 240);
  const providerPolicyId = requiredText(input.providerPolicyId, "valuation_provider_policy_id", 240);
  const evidenceType = enumValue(input.observationType, "valuation_observation_type", VALUATION_OBSERVATION_TYPES);
  const itemState = enumValue(input.itemState, "valuation_item_state", VALUATION_ITEM_STATES);
  const sourceName = requiredText(input.sourceName, "valuation_source_name", 160);
  const sourceUrl = sourceUrlValue(input.sourceUrl);
  const sourceReference = optionalText(input.sourceReference, "valuation_source_reference", 500) ?? providerObservationId;
  const conditionLabel = optionalText(input.conditionLabel, "valuation_condition_label", 120);
  const gradingCompany = optionalText(input.gradingCompany, "valuation_grading_company", 120);
  const gradeLabel = optionalText(input.gradeLabel, "valuation_grade_label", 80);

  if (itemState === "graded" && (!gradingCompany || !gradeLabel)) {
    throw new VaultError("valuation_grade_context_required", "Provider observations for graded items require gradingCompany and gradeLabel.");
  }
  if (itemState !== "graded" && (gradingCompany || gradeLabel)) {
    throw new VaultError("valuation_grade_context_invalid", "Grading context is only valid for graded provider observations.");
  }
  if (["raw", "other"].includes(itemState) && !conditionLabel) {
    throw new VaultError("valuation_condition_context_required", "Provider observations for raw or other items require an explicit condition label.");
  }
  if (!sourceUrl && !sourceReference) {
    throw new VaultError("valuation_source_evidence_required", "Provider observations require a source URL or source reference.");
  }

  return Object.freeze({
    providerId,
    providerObservationId,
    providerPolicyId,
    observationType: evidenceType,
    sourceName,
    sourceUrl,
    sourceReference,
    observedDate: dateValue(input.observedDate, "valuation_observed_date"),
    retrievedAt: timestampValue(input.retrievedAt, "valuation_retrieved_at"),
    amountCents: amountValue(input.amountCents),
    currency: currencyValue(input.currency),
    itemState,
    conditionLabel,
    gradingCompany,
    gradeLabel,
    notes: optionalText(input.notes, "valuation_notes", 4000)
  });
}
