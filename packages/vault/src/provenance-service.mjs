import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

const EVENT_TYPES = new Set([
  "acquired",
  "ownership-note",
  "documented",
  "loaned-out",
  "loan-returned",
  "sold",
  "gifted-out",
  "traded-out",
  "lost",
  "stolen",
  "recovered",
  "correction"
]);

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

function cleanOptionalText(value, label, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function cleanEventType(value) {
  if (typeof value !== "string") throw new VaultError("invalid_provenance_event_type", "A provenance event type is required.");
  const cleaned = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!EVENT_TYPES.has(cleaned)) {
    throw new VaultError("invalid_provenance_event_type", "Unsupported provenance event type.", 400, { allowed: [...EVENT_TYPES] });
  }
  return cleaned;
}

function cleanDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new VaultError("invalid_provenance_effective_date", "effectiveDate must use YYYY-MM-DD format.");
  }
  const cleaned = value.trim();
  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new VaultError("invalid_provenance_effective_date", "effectiveDate must be a real calendar date.");
  }
  return cleaned;
}

function cleanMethod(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError("invalid_provenance_method", "method must be text.");
  const cleaned = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(cleaned)) {
    throw new VaultError("invalid_provenance_method", "method must contain letters, numbers, or hyphens and be at most 60 characters.");
  }
  return cleaned;
}

function cleanAmount(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new VaultError("invalid_provenance_amount", "amountCents must be a non-negative safe integer.");
  }
  return numeric;
}

function cleanCurrency(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new VaultError("invalid_provenance_currency", "currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function cleanSourceUrl(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw new VaultError("invalid_provenance_source_url", "sourceUrl must be a valid HTTP or HTTPS URL.");
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new VaultError("invalid_provenance_source_url", "sourceUrl must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new VaultError("invalid_provenance_source_url", "sourceUrl must use HTTP or HTTPS.");
  }
  parsed.hash = "";
  return parsed.toString();
}

function publicEvent(event) {
  return Object.freeze({
    id: event.id,
    treasureId: event.treasureId,
    eventType: event.eventType,
    effectiveDate: event.effectiveDate,
    counterparty: event.counterparty,
    method: event.method,
    amountCents: event.amountCents,
    currency: event.currency,
    reference: event.reference,
    sourceUrl: event.sourceUrl,
    notes: event.notes,
    correctsEventId: event.correctsEventId,
    evidenceClass: event.evidenceClass,
    independentlyVerified: false,
    createdAt: event.createdAt
  });
}

export function createVaultProvenanceService({ vaultStore, provenanceRepository, now = () => new Date() } = {}) {
  if (!vaultStore || typeof vaultStore.findTreasureById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Vault provenance service requires the Vault store boundary.");
  }
  if (!provenanceRepository || typeof provenanceRepository.create !== "function" || typeof provenanceRepository.listForTreasure !== "function") {
    throw new TypeError("Vault provenance service requires a provenance repository.");
  }
  if (typeof now !== "function") throw new TypeError("Vault provenance service now must be a function.");

  function requireTreasure(ownerAccountId, treasureId) {
    const treasure = vaultStore.findTreasureById(ownerAccountId, treasureId, { includeArchived: true });
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    return treasure;
  }

  function append(identity, treasureIdValue, input = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new VaultError("invalid_provenance_event", "Provenance event data must be an object.");
    }

    const eventType = cleanEventType(input.eventType);
    const amountCents = cleanAmount(input.amountCents);
    const currency = cleanCurrency(input.currency);
    if (amountCents !== null && !currency) {
      throw new VaultError("provenance_currency_required", "currency is required when amountCents is recorded.");
    }
    if (amountCents === null && currency) {
      throw new VaultError("provenance_amount_required", "amountCents is required when currency is recorded.");
    }

    const correctsEventId = cleanReference(input.correctsEventId, "provenance_corrects_event_id");
    if (eventType === "correction") {
      if (!correctsEventId) throw new VaultError("provenance_correction_target_required", "A correction must reference the provenance event it corrects.");
      const target = provenanceRepository.findById(collector.id, correctsEventId);
      if (!target || target.treasureId !== treasureId) {
        throw new VaultError("provenance_correction_target_not_found", "The provenance event being corrected does not exist on this treasure.", 404);
      }
    } else if (correctsEventId) {
      throw new VaultError("invalid_provenance_correction_target", "correctsEventId is only valid for correction events.");
    }

    const createdAt = now().toISOString();
    const created = provenanceRepository.create({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      eventType,
      effectiveDate: cleanDate(input.effectiveDate),
      counterparty: cleanOptionalText(input.counterparty, "provenance_counterparty", 240),
      method: cleanMethod(input.method),
      amountCents,
      currency,
      reference: cleanOptionalText(input.reference, "provenance_reference", 500),
      sourceUrl: cleanSourceUrl(input.sourceUrl),
      notes: cleanOptionalText(input.notes, "provenance_notes", 8000),
      correctsEventId,
      evidenceClass: "collector-recorded",
      createdAt
    });

    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      eventType: "vault.provenance_appended",
      metadata: {
        provenanceEventId: created.id,
        provenanceEventType: created.eventType,
        effectiveDate: created.effectiveDate,
        correctsEventId: created.correctsEventId
      },
      createdAt
    });

    return publicEvent(created);
  }

  function list(identity, treasureIdValue, { limit = 100 } = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    const numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 500) {
      throw new VaultError("invalid_provenance_limit", "Provenance result limit must be between 1 and 500.");
    }
    return provenanceRepository.listForTreasure(collector.id, treasureId, { limit: numericLimit }).map(publicEvent);
  }

  function exportAll(identity) {
    const collector = requireCollector(identity);
    return provenanceRepository.listForOwner(collector.id).map(publicEvent);
  }

  return Object.freeze({
    eventTypes: Object.freeze([...EVENT_TYPES]),
    append,
    list,
    exportAll
  });
}
