import { assertProviderValuationObservationIntegrity } from "./valuation-observation-contract.mjs";

function freezeEntry(entry) {
  return Object.freeze({
    ...entry,
    correctionIds: entry.correctionIds ? Object.freeze([...entry.correctionIds]) : undefined
  });
}

function compareHistoryEntries(left, right) {
  return left.date.localeCompare(right.date)
    || left.recordedAt.localeCompare(right.recordedAt)
    || left.sourceRecordId.localeCompare(right.sourceRecordId);
}

function tableExists(database, name) {
  if (!database || typeof database.prepare !== "function") return false;
  const row = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
    LIMIT 1
  `).get(name);
  return Boolean(row);
}

function listProvenanceEvents(database, ownerAccountId, treasureId) {
  if (!tableExists(database, "vault_provenance_events")) {
    return Object.freeze({ available: false, events: Object.freeze([]) });
  }

  const rows = database.prepare(`
    SELECT
      id, event_type, effective_date, counterparty, method, amount_cents, currency,
      reference, source_url, notes, corrects_event_id, evidence_class, created_at
    FROM vault_provenance_events
    WHERE owner_account_id = ? AND treasure_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(ownerAccountId, treasureId);

  return Object.freeze({
    available: true,
    events: Object.freeze(rows.map((row) => Object.freeze({
      id: row.id,
      eventType: row.event_type,
      effectiveDate: row.effective_date,
      counterparty: row.counterparty,
      method: row.method,
      amountCents: row.amount_cents === null ? null : Number(row.amount_cents),
      currency: row.currency,
      reference: row.reference,
      sourceUrl: row.source_url,
      notes: row.notes,
      correctsEventId: row.corrects_event_id,
      evidenceClass: row.evidence_class,
      createdAt: row.created_at
    })))
  });
}

function listProviderObservations(database, ownerAccountId, treasureId) {
  if (!tableExists(database, "vault_valuation_provider_observations")) {
    return Object.freeze({ available: false, observations: Object.freeze([]) });
  }
  const rows = database.prepare(`
    SELECT *
    FROM vault_valuation_provider_observations
    WHERE owner_account_id = ? AND treasure_id = ?
    ORDER BY observed_date ASC, created_at ASC, id ASC
  `).all(ownerAccountId, treasureId);
  const observations = rows.map((row) => ({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerPolicyId: row.provider_policy_id,
    providerPolicyUrl: row.provider_policy_url,
    providerObservationId: row.provider_observation_id,
    providerItemReference: row.provider_item_reference,
    observationType: row.observation_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceReference: row.source_reference,
    observedDate: row.observed_date,
    retrievedAt: row.retrieved_at,
    providerBuildAt: row.provider_build_at,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    itemState: row.item_state,
    conditionLabel: row.condition_label,
    gradingCompany: row.grading_company,
    gradeLabel: row.grade_label,
    marketVariant: row.market_variant,
    notes: row.notes,
    evidenceClass: row.evidence_class,
    observationSha256: row.observation_sha256,
    createdAt: row.created_at
  }));
  for (const observation of observations) assertProviderValuationObservationIntegrity(observation);
  return Object.freeze({ available: true, observations: Object.freeze(observations.map(Object.freeze)) });
}

function descendantCorrectionIds(events, targetId) {
  const children = new Map();
  for (const event of events) {
    if (event.eventType !== "correction" || !event.correctsEventId) continue;
    const current = children.get(event.correctsEventId) ?? [];
    current.push(event.id);
    children.set(event.correctsEventId, current);
  }

  const found = [];
  const pending = [...(children.get(targetId) ?? [])];
  const seen = new Set();
  while (pending.length > 0) {
    const id = pending.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    found.push(id);
    pending.push(...(children.get(id) ?? []));
  }
  return found;
}

function valuationHistoryEntry(record, correctedEvidenceIds) {
  const corrected = correctedEvidenceIds.has(record.id);
  return freezeEntry({
    kind: "market-observation",
    sourceRecordType: "valuation-evidence",
    sourceRecordId: record.id,
    date: record.observedDate,
    recordedAt: record.createdAt,
    amountCents: record.amountCents,
    currency: record.currency,
    priced: true,
    observationType: record.evidenceType,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    sourceReference: record.sourceReference,
    itemState: record.itemState,
    conditionLabel: record.conditionLabel,
    gradingCompany: record.gradingCompany,
    gradeLabel: record.gradeLabel,
    evidenceClass: record.evidenceClass,
    providerOriginVerified: false,
    physicalTreasureMatchVerified: false,
    influencesCurrentEstimate: record.evidenceType === "sold-comparable" && !corrected,
    corrected,
    active: !corrected,
    correctionIds: []
  });
}

function providerObservationHistoryEntry(observation) {
  return freezeEntry({
    kind: "provider-market-observation",
    sourceRecordType: "provider-valuation-observation",
    sourceRecordId: observation.id,
    providerObservationId: observation.providerObservationId,
    providerItemReference: observation.providerItemReference,
    providerId: observation.providerId,
    providerName: observation.providerName,
    providerPolicyId: observation.providerPolicyId,
    providerPolicyUrl: observation.providerPolicyUrl,
    date: observation.observedDate,
    recordedAt: observation.createdAt,
    retrievedAt: observation.retrievedAt,
    providerBuildAt: observation.providerBuildAt,
    amountCents: observation.amountCents,
    currency: observation.currency,
    priced: true,
    observationType: observation.observationType,
    sourceName: observation.sourceName,
    sourceUrl: observation.sourceUrl,
    sourceReference: observation.sourceReference,
    itemState: observation.itemState,
    conditionLabel: observation.conditionLabel,
    gradingCompany: observation.gradingCompany,
    gradeLabel: observation.gradeLabel,
    marketVariant: observation.marketVariant,
    evidenceClass: observation.evidenceClass,
    providerOriginVerified: true,
    physicalTreasureMatchVerified: false,
    providerIdentityIsTreasureIdentity: false,
    influencesCurrentEstimate: false,
    corrected: false,
    active: true,
    correctionIds: []
  });
}

function realizedSaleHistoryEntry(event, events) {
  const correctionIds = descendantCorrectionIds(events, event.id);
  const corrected = correctionIds.length > 0;
  return freezeEntry({
    kind: "realized-sale",
    sourceRecordType: "provenance-event",
    sourceRecordId: event.id,
    date: event.effectiveDate ?? event.createdAt.slice(0, 10),
    recordedAt: event.createdAt,
    amountCents: event.amountCents,
    currency: event.currency,
    priced: event.amountCents !== null && Boolean(event.currency),
    method: event.method,
    counterparty: event.counterparty,
    sourceUrl: event.sourceUrl,
    sourceReference: event.reference,
    evidenceClass: event.evidenceClass,
    providerOriginVerified: false,
    physicalTreasureMatchVerified: false,
    influencesCurrentEstimate: false,
    corrected,
    active: !corrected,
    correctionIds
  });
}

export function buildVaultValueHistory({
  vaultStore,
  ownerAccountId,
  treasureId,
  valuationRecords,
  correctedEvidenceIds
} = {}) {
  if (!vaultStore?.database) throw new TypeError("Value history requires the Vault database boundary.");
  if (!ownerAccountId || !treasureId) throw new TypeError("Value history requires owner and treasure identifiers.");
  if (!Array.isArray(valuationRecords)) throw new TypeError("Value history requires valuation records.");
  if (!(correctedEvidenceIds instanceof Set)) throw new TypeError("Value history requires corrected evidence identifiers.");

  const provenance = listProvenanceEvents(vaultStore.database, ownerAccountId, treasureId);
  const provider = listProviderObservations(vaultStore.database, ownerAccountId, treasureId);
  const collectorMarketEntries = valuationRecords.map((record) => valuationHistoryEntry(record, correctedEvidenceIds));
  const providerEntries = provider.observations.map(providerObservationHistoryEntry);
  const saleEntries = provenance.events
    .filter((event) => event.eventType === "sold")
    .map((event) => realizedSaleHistoryEntry(event, provenance.events));
  const entries = [...collectorMarketEntries, ...providerEntries, ...saleEntries].sort(compareHistoryEntries);
  const currencies = [...new Set(entries
    .filter((entry) => entry.priced && entry.currency)
    .map((entry) => entry.currency))].sort();

  return Object.freeze({
    derived: true,
    persistedAsMutableValue: false,
    provenanceAvailable: provenance.available,
    providerObservationsAvailable: provider.available,
    entryCount: entries.length,
    marketObservationCount: collectorMarketEntries.length + providerEntries.length,
    collectorMarketObservationCount: collectorMarketEntries.length,
    providerMarketObservationCount: providerEntries.length,
    realizedSaleCount: saleEntries.length,
    pricedRealizedSaleCount: saleEntries.filter((entry) => entry.priced).length,
    unpricedRealizedSaleCount: saleEntries.filter((entry) => !entry.priced).length,
    currencies: Object.freeze(currencies),
    crossCurrencyAggregation: false,
    realizedSalesInfluenceMarketEstimate: false,
    providerObservationsInfluenceMarketEstimate: false,
    exactSourceRecordIds: true,
    entries: Object.freeze(entries)
  });
}
