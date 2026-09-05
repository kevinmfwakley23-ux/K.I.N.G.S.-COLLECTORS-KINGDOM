const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_provenance_events (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  effective_date TEXT,
  counterparty TEXT,
  method TEXT,
  amount_cents INTEGER CHECK(amount_cents IS NULL OR amount_cents >= 0),
  currency TEXT,
  reference TEXT,
  source_url TEXT,
  notes TEXT,
  corrects_event_id TEXT REFERENCES vault_provenance_events(id) ON DELETE RESTRICT,
  evidence_class TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_provenance_owner_treasure_idx
  ON vault_provenance_events(owner_account_id, treasure_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_provenance_owner_event_type_idx
  ON vault_provenance_events(owner_account_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_provenance_correction_idx
  ON vault_provenance_events(owner_account_id, corrects_event_id);
`;

function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
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
  };
}

function boundedLimit(value, maximum = 500) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 100;
  return Math.min(numeric, maximum);
}

export function createVaultProvenanceRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Vault provenance repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const insert = database.prepare(`
    INSERT INTO vault_provenance_events (
      id,owner_account_id,treasure_id,event_type,effective_date,counterparty,method,
      amount_cents,currency,reference,source_url,notes,corrects_event_id,evidence_class,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const find = database.prepare(`
    SELECT * FROM vault_provenance_events
    WHERE owner_account_id = ? AND id = ?
  `);

  function create(event) {
    insert.run(
      event.id,
      event.ownerAccountId,
      event.treasureId,
      event.eventType,
      event.effectiveDate ?? null,
      event.counterparty ?? null,
      event.method ?? null,
      event.amountCents ?? null,
      event.currency ?? null,
      event.reference ?? null,
      event.sourceUrl ?? null,
      event.notes ?? null,
      event.correctsEventId ?? null,
      event.evidenceClass,
      event.createdAt
    );
    return findById(event.ownerAccountId, event.id);
  }

  function findById(ownerAccountId, id) {
    return mapEvent(find.get(ownerAccountId, id));
  }

  function listForTreasure(ownerAccountId, treasureId, { limit = 100 } = {}) {
    return database.prepare(`
      SELECT * FROM vault_provenance_events
      WHERE owner_account_id = ? AND treasure_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(ownerAccountId, treasureId, boundedLimit(limit)).map(mapEvent);
  }

  function listForOwner(ownerAccountId) {
    return database.prepare(`
      SELECT * FROM vault_provenance_events
      WHERE owner_account_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(ownerAccountId).map(mapEvent);
  }

  return Object.freeze({
    create,
    findById,
    listForTreasure,
    listForOwner
  });
}
