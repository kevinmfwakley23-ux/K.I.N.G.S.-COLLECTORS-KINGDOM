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

function provenanceTableExists(database) {
  if (!database || typeof database.prepare !== "function") return false;
  const row = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'vault_provenance_events'
    LIMIT 1
  `).get();
  return Boolean(row);
}

function listProvenanceEvents(database, ownerAccountId, treasureId) {
  if (!provenanceTableExists(database)) {
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
    independentlyVerified: false,
    corrected,
    active: !corrected,
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
    independentlyVerified: false,
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
  const marketEntries = valuationRecords.map((record) => valuationHistoryEntry(record, correctedEvidenceIds));
  const saleEntries = provenance.events
    .filter((event) => event.eventType === "sold")
    .map((event) => realizedSaleHistoryEntry(event, provenance.events));
  const entries = [...marketEntries, ...saleEntries].sort(compareHistoryEntries);
  const currencies = [...new Set(entries
    .filter((entry) => entry.priced && entry.currency)
    .map((entry) => entry.currency))].sort();

  return Object.freeze({
    derived: true,
    persistedAsMutableValue: false,
    provenanceAvailable: provenance.available,
    entryCount: entries.length,
    marketObservationCount: marketEntries.length,
    realizedSaleCount: saleEntries.length,
    pricedRealizedSaleCount: saleEntries.filter((entry) => entry.priced).length,
    unpricedRealizedSaleCount: saleEntries.filter((entry) => !entry.priced).length,
    currencies: Object.freeze(currencies),
    crossCurrencyAggregation: false,
    realizedSalesInfluenceMarketEstimate: false,
    exactSourceRecordIds: true,
    entries: Object.freeze(entries)
  });
}
