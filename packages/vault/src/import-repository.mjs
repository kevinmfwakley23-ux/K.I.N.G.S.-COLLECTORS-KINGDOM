const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_import_batches (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('preview','committed','cancelled','expired')),
  source_label TEXT,
  payload_hash TEXT NOT NULL,
  record_count INTEGER NOT NULL CHECK(record_count >= 0),
  accepted_count INTEGER NOT NULL CHECK(accepted_count >= 0),
  rejected_count INTEGER NOT NULL CHECK(rejected_count >= 0),
  review_count INTEGER NOT NULL CHECK(review_count >= 0),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  committed_at TEXT,
  idempotency_key TEXT,
  decision_fingerprint TEXT,
  commit_result_json TEXT
);
CREATE INDEX IF NOT EXISTS vault_import_batches_owner_status_idx
  ON vault_import_batches(owner_account_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS vault_import_batches_owner_idempotency_idx
  ON vault_import_batches(owner_account_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS vault_import_rows (
  batch_id TEXT NOT NULL REFERENCES vault_import_batches(id) ON DELETE CASCADE,
  owner_account_id TEXT NOT NULL,
  row_index INTEGER NOT NULL CHECK(row_index >= 0),
  row_status TEXT NOT NULL CHECK(row_status IN ('ready','review','rejected')),
  normalized_json TEXT,
  error_json TEXT,
  duplicate_json TEXT NOT NULL,
  identifier_fingerprint TEXT,
  content_fingerprint TEXT,
  search_text TEXT,
  committed_treasure_id TEXT,
  PRIMARY KEY(batch_id, row_index)
);
CREATE INDEX IF NOT EXISTS vault_import_rows_owner_batch_idx
  ON vault_import_rows(owner_account_id, batch_id, row_index);
`;

function requireDatabase(vaultStore) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Vault import repository requires the Vault SQLite store.");
  }
  return vaultStore.database;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapBatch(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    status: row.status,
    sourceLabel: row.source_label,
    payloadHash: row.payload_hash,
    recordCount: Number(row.record_count),
    acceptedCount: Number(row.accepted_count),
    rejectedCount: Number(row.rejected_count),
    reviewCount: Number(row.review_count),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    committedAt: row.committed_at,
    idempotencyKey: row.idempotency_key,
    decisionFingerprint: row.decision_fingerprint,
    commitResult: parseJson(row.commit_result_json, null)
  });
}

function mapRow(row) {
  if (!row) return null;
  return Object.freeze({
    batchId: row.batch_id,
    ownerAccountId: row.owner_account_id,
    index: Number(row.row_index),
    status: row.row_status,
    normalized: parseJson(row.normalized_json, null),
    error: parseJson(row.error_json, null),
    duplicates: parseJson(row.duplicate_json, []),
    identifierFingerprint: row.identifier_fingerprint,
    contentFingerprint: row.content_fingerprint,
    searchText: row.search_text,
    committedTreasureId: row.committed_treasure_id
  });
}

function insertTreasure(database, treasure) {
  database.prepare(`
    INSERT INTO vault_treasures (
      id,owner_account_id,collection_id,location_id,title,category,description,manufacturer,series,variant,
      condition_label,condition_notes,quantity,acquisition_date,purchase_price_cents,currency,
      external_identifiers_json,attributes_json,notes,search_text,identifier_fingerprint,content_fingerprint,
      created_at,updated_at,archived_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    treasure.id,
    treasure.ownerAccountId,
    treasure.collectionId ?? null,
    treasure.locationId ?? null,
    treasure.title,
    treasure.category,
    treasure.description ?? null,
    treasure.manufacturer ?? null,
    treasure.series ?? null,
    treasure.variant ?? null,
    treasure.condition ?? null,
    treasure.conditionNotes ?? null,
    treasure.quantity,
    treasure.acquisitionDate ?? null,
    treasure.purchasePriceCents ?? null,
    treasure.currency ?? null,
    JSON.stringify(treasure.externalIdentifiers ?? {}),
    JSON.stringify(treasure.attributes ?? {}),
    treasure.notes ?? null,
    treasure.searchText,
    treasure.identifierFingerprint ?? null,
    treasure.contentFingerprint,
    treasure.createdAt,
    treasure.updatedAt,
    null
  );
}

function insertEvent(database, event) {
  database.prepare(`
    INSERT INTO vault_events (id,owner_account_id,treasure_id,event_type,metadata_json,created_at)
    VALUES (?,?,?,?,?,?)
  `).run(
    event.id,
    event.ownerAccountId,
    event.treasureId,
    event.eventType,
    JSON.stringify(event.metadata ?? {}),
    event.createdAt
  );
}

export function createVaultImportRepository({ vaultStore } = {}) {
  const database = requireDatabase(vaultStore);
  database.exec(SCHEMA);

  function createBatch(batch, rows) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.prepare(`
        INSERT INTO vault_import_batches (
          id,owner_account_id,status,source_label,payload_hash,record_count,accepted_count,rejected_count,review_count,
          created_at,expires_at,committed_at,idempotency_key,decision_fingerprint,commit_result_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        batch.id,
        batch.ownerAccountId,
        "preview",
        batch.sourceLabel ?? null,
        batch.payloadHash,
        batch.recordCount,
        batch.acceptedCount,
        batch.rejectedCount,
        batch.reviewCount,
        batch.createdAt,
        batch.expiresAt,
        null,
        null,
        null,
        null
      );

      const insertRow = database.prepare(`
        INSERT INTO vault_import_rows (
          batch_id,owner_account_id,row_index,row_status,normalized_json,error_json,duplicate_json,
          identifier_fingerprint,content_fingerprint,search_text,committed_treasure_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `);
      for (const row of rows) {
        insertRow.run(
          batch.id,
          batch.ownerAccountId,
          row.index,
          row.status,
          row.normalized ? JSON.stringify(row.normalized) : null,
          row.error ? JSON.stringify(row.error) : null,
          JSON.stringify(row.duplicates ?? []),
          row.identifierFingerprint ?? null,
          row.contentFingerprint ?? null,
          row.searchText ?? null,
          null
        );
      }
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
    return findBatch(batch.ownerAccountId, batch.id);
  }

  function findBatch(ownerAccountId, id) {
    return mapBatch(database.prepare(`
      SELECT * FROM vault_import_batches
      WHERE owner_account_id = ? AND id = ?
    `).get(ownerAccountId, id));
  }

  function findByIdempotencyKey(ownerAccountId, key) {
    if (!key) return null;
    return mapBatch(database.prepare(`
      SELECT * FROM vault_import_batches
      WHERE owner_account_id = ? AND idempotency_key = ?
    `).get(ownerAccountId, key));
  }

  function listRows(ownerAccountId, batchId) {
    return database.prepare(`
      SELECT * FROM vault_import_rows
      WHERE owner_account_id = ? AND batch_id = ?
      ORDER BY row_index ASC
    `).all(ownerAccountId, batchId).map(mapRow);
  }

  function markExpired(ownerAccountId, batchId) {
    const result = database.prepare(`
      UPDATE vault_import_batches
      SET status = 'expired'
      WHERE owner_account_id = ? AND id = ? AND status = 'preview'
    `).run(ownerAccountId, batchId);
    return Number(result.changes) === 1;
  }

  function commitBatch({
    ownerAccountId,
    batchId,
    idempotencyKey,
    decisionFingerprint,
    committedAt,
    treasures,
    events,
    commitResult
  }) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      const current = findBatch(ownerAccountId, batchId);
      if (!current) {
        database.exec("ROLLBACK;");
        return Object.freeze({ kind: "not_found" });
      }
      if (current.status === "committed") {
        database.exec("COMMIT;");
        return Object.freeze({ kind: "already_committed", batch: current });
      }
      if (current.status !== "preview") {
        database.exec("ROLLBACK;");
        return Object.freeze({ kind: current.status, batch: current });
      }

      for (const treasure of treasures) insertTreasure(database, treasure);
      for (const event of events) insertEvent(database, event);

      const setCommittedTreasure = database.prepare(`
        UPDATE vault_import_rows
        SET committed_treasure_id = ?
        WHERE owner_account_id = ? AND batch_id = ? AND row_index = ? AND row_status <> 'rejected'
      `);
      for (const treasure of treasures) {
        const result = setCommittedTreasure.run(treasure.id, ownerAccountId, batchId, treasure.importRowIndex);
        if (Number(result.changes) !== 1) throw new Error(`Import row ${treasure.importRowIndex} could not be linked to its committed treasure.`);
      }

      const updated = database.prepare(`
        UPDATE vault_import_batches
        SET status = 'committed', committed_at = ?, idempotency_key = ?, decision_fingerprint = ?, commit_result_json = ?
        WHERE owner_account_id = ? AND id = ? AND status = 'preview'
      `).run(
        committedAt,
        idempotencyKey,
        decisionFingerprint,
        JSON.stringify(commitResult),
        ownerAccountId,
        batchId
      );
      if (Number(updated.changes) !== 1) throw new Error("Import batch state changed before commit could finish.");

      database.exec("COMMIT;");
      return Object.freeze({ kind: "committed", batch: findBatch(ownerAccountId, batchId) });
    } catch (error) {
      try {
        database.exec("ROLLBACK;");
      } catch {}
      throw error;
    }
  }

  return Object.freeze({
    createBatch,
    findBatch,
    findByIdempotencyKey,
    listRows,
    markExpired,
    commitBatch
  });
}
