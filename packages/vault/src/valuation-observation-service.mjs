import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";
import {
  assertProviderValuationObservationIntegrity,
  isValuationProviderAuthority,
  normalizeProviderValuationObservation,
  providerValuationObservationSha256,
  VALUATION_ITEM_STATES,
  VALUATION_OBSERVATION_TYPES
} from "./valuation-observation-contract.mjs";

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

function publicObservation(observation) {
  return Object.freeze({
    id: observation.id,
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
    providerOriginVerified: true,
    physicalTreasureMatchVerified: false,
    influencesCurrentEstimate: false,
    providerIdentityIsTreasureIdentity: false,
    observationSha256: observation.observationSha256,
    createdAt: observation.createdAt
  });
}

export function createVaultValuationObservationService({
  vaultStore,
  observationRepository,
  now = () => new Date()
} = {}) {
  if (!vaultStore || typeof vaultStore.findTreasureById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Vault valuation observation service requires the Vault store boundary.");
  }
  if (!observationRepository || typeof observationRepository.create !== "function" || typeof observationRepository.listForTreasure !== "function") {
    throw new TypeError("Vault valuation observation service requires an observation repository.");
  }
  if (typeof now !== "function") throw new TypeError("Vault valuation observation service now must be a function.");

  function requireTreasure(ownerAccountId, treasureId) {
    const treasure = vaultStore.findTreasureById(ownerAccountId, treasureId, { includeArchived: true });
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    return treasure;
  }

  function ingest(identity, treasureIdValue, authority, input = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    if (!isValuationProviderAuthority(authority)) {
      throw new VaultError("invalid_provider_observation_authority", "A trusted provider valuation authority is required.", 403);
    }

    const current = now();
    if (!(current instanceof Date) || Number.isNaN(current.getTime())) throw new TypeError("Vault valuation observation now must return a valid Date.");
    const normalized = normalizeProviderValuationObservation(authority, input, { now: current });
    const duplicate = observationRepository.findByProviderObservationId(
      collector.id,
      treasureId,
      normalized.providerId,
      normalized.providerObservationId
    );
    if (duplicate) {
      assertProviderValuationObservationIntegrity(duplicate);
      return Object.freeze({ observation: publicObservation(duplicate), created: false, duplicate: true });
    }

    const createdAt = current.toISOString();
    const observation = {
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      ...normalized,
      evidenceClass: "provider-originated-market-observation",
      createdAt
    };
    observation.observationSha256 = providerValuationObservationSha256(observation);
    const created = observationRepository.create(observation);
    assertProviderValuationObservationIntegrity(created);

    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId,
      eventType: "vault.provider_valuation_observation_appended",
      metadata: {
        observationId: created.id,
        providerId: created.providerId,
        providerObservationId: created.providerObservationId,
        observationType: created.observationType,
        observedDate: created.observedDate,
        currency: created.currency,
        itemState: created.itemState,
        marketVariant: created.marketVariant,
        providerPolicyId: created.providerPolicyId,
        influencesCurrentEstimate: false
      },
      createdAt
    });

    return Object.freeze({ observation: publicObservation(created), created: true, duplicate: false });
  }

  function list(identity, treasureIdValue, { limit = 250 } = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(treasureIdValue, "treasure_id", { required: true });
    requireTreasure(collector.id, treasureId);
    const numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > 1000) {
      throw new VaultError("invalid_provider_observation_limit", "Provider observation result limit must be between 1 and 1000.");
    }
    return observationRepository.listForTreasure(collector.id, treasureId, { limit: numericLimit }).map((observation) => {
      assertProviderValuationObservationIntegrity(observation);
      return publicObservation(observation);
    });
  }

  function exportAll(identity) {
    const collector = requireCollector(identity);
    return observationRepository.listForOwner(collector.id, { limit: 10000 }).map((observation) => {
      assertProviderValuationObservationIntegrity(observation);
      return publicObservation(observation);
    });
  }

  function stats(identity) {
    const collector = requireCollector(identity);
    return Object.freeze({
      observationCount: observationRepository.countForOwner(collector.id),
      observationTypes: VALUATION_OBSERVATION_TYPES,
      itemStates: VALUATION_ITEM_STATES,
      evidenceClass: "provider-originated-market-observation",
      appendOnly: true,
      collectorWriteAvailable: false,
      providerOriginVerified: true,
      physicalTreasureMatchVerified: false,
      providerIdentityIsTreasureIdentity: false,
      influencesCurrentEstimate: false
    });
  }

  return Object.freeze({
    observationTypes: VALUATION_OBSERVATION_TYPES,
    itemStates: VALUATION_ITEM_STATES,
    ingest,
    list,
    exportAll,
    stats
  });
}
