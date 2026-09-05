import { randomUUID } from "node:crypto";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_reorganization_batches (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('preview','committed','expired')),
  move_collection INTEGER NOT NULL CHECK(move_collection IN (0,1)),
  destination_collection_id TEXT,
  move_location INTEGER NOT NULL CHECK(move_location IN (0,1)),
  destination_location_id TEXT,
  destination_snapshot_json TEXT NOT NULL,
  record_count INTEGER NOT NULL CHECK(record_count > 0),
  validation_error_count INTEGER NOT NULL CHECK(validation_error_count >= 0),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  committed_at TEXT,
  idempotency_key TEXT,
  commit_result_json TEXT
);
CREATE INDEX IF NOT EXISTS vault_reorganization_batches_owner_status_idx
  ON vault_reorganization_batches(owner_account_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS vault_reorganization_batches_owner_idempotency_idx
  ON vault_reorganization_batches(owner_account_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS vault_reorganization_rows (
  batch_id TEXT NOT NULL REFERENCES vault_reorganization_batches(id) ON DELETE CASCADE,
  owner_account_id TEXT NOT NULL,
  row_index INTEGER NOT NULL CHECK(row_index >= 0),
  treasure_id TEXT NOT NULL,
  row_status TEXT NOT NULL CHECK(row_status IN ('ready','error')),
  snapshot_json TEXT,
  error_json TEXT,
  before_updated_at TEXT,
  before_collection_id TEXT,
  before_location_id TEXT,
  PRIMARY KEY(batch_id, row_index)
);
CREATE INDEX IF NOT EXISTS vault_reorganization_rows_owner_batch_idx
  ON vault_reorganization_rows(owner_account_id, batch_id, row_index);
`;

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapCollection(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLocation(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    parentId: row.parent_id,
    name: row.name,
    locationType: row.location_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBatch(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    status: row.status,
    moveCollection: Boolean(row.move_collection),
    destinationCollectionId: row.destination_collection_id,
    moveLocation: Boolean(row.move_location),
    destinationLocationId: row.destination_location_id,
    destinationSnapshot: parseJson(row.destination_snapshot_json, {}),
    recordCount: Number(row.record_count),
    validationErrorCount: Number(row.validation_error_count),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    committedAt: row.committed_at,
    idempotencyKey: row.idempotency_key,
    commitResult: parseJson(row.commit_result_json, null)
  });
}

function mapRow(row) {
  if (!row) return null;
  return Object.freeze({
    batchId: row.batch_id,
    ownerAccountId: row.owner_account_id,
    index: Number(row.row_index),
    treasureId: row.treasure_id,
    status: row.row_status,
    snapshot: parseJson(row.snapshot_json, null),
    error: parseJson(row.error_json, null),
    beforeUpdatedAt: row.before_updated_at,
    beforeCollectionId: row.before_collection_id,
    beforeLocationId: row.before_location_id
  });
}

export function createVaultReorganizationRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("Vault reorganization repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const updateCollectionStatement = database.prepare(`
    UPDATE vault_collections
    SET name = ?, description = ?, updated_at = ?
    WHERE owner_account_id = ? AND id = ?
  `);
  const findCollectionStatement = database.prepare(`
    SELECT * FROM vault_collections WHERE owner_account_id = ? AND id = ?
  `);

  const updateLocationStatement = database.prepare(`
    UPDATE vault_locations
    SET parent_id = ?, name = ?, location_type = ?, notes = ?, updated_at = ?
    WHERE owner_account_id = ? AND id = ?
  `);
  const findLocationStatement = database.prepare(`
    SELECT * FROM vault_locations WHERE owner_account_id = ? AND id = ?
  `);

  function updateCollection(collection) {
    const result = updateCollectionStatement.run(
      collection.name,
      collection.description ?? null,
      collection.updatedAt,
      collection.ownerAccountId,
      collection.id
    );
    if (Number(result.changes) !== 1) return null;
    return mapCollection(findCollectionStatement.get(collection.ownerAccountId, collection.id));
  }

  function updateLocation(location) {
    const result = updateLocationStatement.run(
      location.parentId ?? null,
      location.name,
      location.locationType,
      location.notes ?? null,
      location.updatedAt,
      location.ownerAccountId,
      location.id
    );
    if (Number(result.changes) !== 1) return null;
    return mapLocation(findLocationStatement.get(location.ownerAccountId, location.id));
  }

  function descendantIds(ownerAccountId, locationId) {
    return database.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT id FROM vault_locations
        WHERE owner_account_id = ? AND parent_id = ?
        UNION ALL
        SELECT child.id
        FROM vault_locations child
        JOIN descendants d ON child.parent_id = d.id
        WHERE child.owner_account_id = ?
      )
      SELECT id FROM descendants
    `).all(ownerAccountId, locationId, ownerAccountId).map((row) => row.id);
  }

  function findBatch(ownerAccountId, batchId) {
    return mapBatch(database.prepare(`
      SELECT * FROM vault_reorganization_batches
      WHERE owner_account_id = ? AND id = ?
    `).get(ownerAccountId, batchId));
  }

  function findByIdempotencyKey(ownerAccountId, key) {
    if (!key) return null;
    return mapBatch(database.prepare(`
      SELECT * FROM vault_reorganization_batches
      WHERE owner_account_id = ? AND idempotency_key = ?
    `).get(ownerAccountId, key));
  }

  function listBatchRows(ownerAccountId, batchId) {
    return database.prepare(`
      SELECT * FROM vault_reorganization_rows
      WHERE owner_account_id = ? AND batch_id = ?
      ORDER BY row_index ASC
    `).all(ownerAccountId, batchId).map(mapRow);
  }

  function createBatch(batch, rows) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.prepare(`
        INSERT INTO vault_reorganization_batches (
          id,owner_account_id,status,move_collection,destination_collection_id,move_location,destination_location_id,
          destination_snapshot_json,record_count,validation_error_count,created_at,expires_at,committed_at,idempotency_key,commit_result_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        batch.id,
        batch.ownerAccountId,
        "preview",
        batch.moveCollection ? 1 : 0,
        batch.destinationCollectionId ?? null,
        batch.moveLocation ? 1 : 0,
        batch.destinationLocationId ?? null,
        JSON.stringify(batch.destinationSnapshot ?? {}),
        batch.recordCount,
        batch.validationErrorCount,
        batch.createdAt,
        batch.expiresAt,
        null,
        null,
        null
      );

      const insertRow = database.prepare(`
        INSERT INTO vault_reorganization_rows (
          batch_id,owner_account_id,row_index,treasure_id,row_status,snapshot_json,error_json,
          before_updated_at,before_collection_id,before_location_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `);
      for (const row of rows) {
        insertRow.run(
          batch.id,
          batch.ownerAccountId,
          row.index,
          row.treasureId,
          row.status,
          row.snapshot ? JSON.stringify(row.snapshot) : null,
          row.error ? JSON.stringify(row.error) : null,
          row.beforeUpdatedAt ?? null,
          row.beforeCollectionId ?? null,
          row.beforeLocationId ?? null
        );
      }
      database.exec("COMMIT;");
    } catch (error) {
      try {
        database.exec("ROLLBACK;");
      } catch {}
      throw error;
    }
    return findBatch(batch.ownerAccountId, batch.id);
  }

  function markExpired(ownerAccountId, batchId) {
    const result = database.prepare(`
      UPDATE vault_reorganization_batches
      SET status = 'expired'
      WHERE owner_account_id = ? AND id = ? AND status = 'preview'
    `).run(ownerAccountId, batchId);
    return Number(result.changes) === 1;
  }

  function commitBatch({ ownerAccountId, batchId, idempotencyKey, committedAt }) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      const batch = findBatch(ownerAccountId, batchId);
      if (!batch) {
        database.exec("ROLLBACK;");
        return Object.freeze({ kind: "not_found" });
      }
      if (batch.status === "committed") {
        database.exec("COMMIT;");
        return Object.freeze({ kind: "already_committed", batch });
      }
      if (batch.status === "expired") {
        database.exec("COMMIT;");
        return Object.freeze({ kind: "expired", batch });
      }
      if (Date.parse(batch.expiresAt) <= Date.parse(committedAt)) {
        database.prepare(`
          UPDATE vault_reorganization_batches SET status = 'expired'
          WHERE owner_account_id = ? AND id = ? AND status = 'preview'
        `).run(ownerAccountId, batchId);
        database.exec("COMMIT;");
        return Object.freeze({ kind: "expired", batch: findBatch(ownerAccountId, batchId) });
      }
      if (batch.validationErrorCount > 0) {
        database.exec("ROLLBACK;");
        return Object.freeze({ kind: "invalid_preview", batch });
      }

      const reused = findByIdempotencyKey(ownerAccountId, idempotencyKey);
      if (reused && reused.id !== batchId) {
        database.exec("ROLLBACK;");
        return Object.freeze({ kind: "idempotency_conflict", batch: reused });
      }

      if (batch.moveCollection && batch.destinationCollectionId) {
        const destination = database.prepare(`
          SELECT id FROM vault_collections WHERE owner_account_id = ? AND id = ?
        `).get(ownerAccountId, batch.destinationCollectionId);
        if (!destination) {
          database.exec("ROLLBACK;");
          return Object.freeze({ kind: "destination_stale", resource: "collection" });
        }
      }
      if (batch.moveLocation && batch.destinationLocationId) {
        const destination = database.prepare(`
          SELECT id FROM vault_locations WHERE owner_account_id = ? AND id = ?
        `).get(ownerAccountId, batch.destinationLocationId);
        if (!destination) {
          database.exec("ROLLBACK;");
          return Object.freeze({ kind: "destination_stale", resource: "location" });
        }
      }

      const rows = listBatchRows(ownerAccountId, batchId);
      const currentTreasureStatement = database.prepare(`
        SELECT id,title,collection_id,location_id,updated_at
        FROM vault_treasures
        WHERE owner_account_id = ? AND id = ? AND archived_at IS NULL
      `);
      const currentRows = [];
      const staleFailures = [];
      for (const row of rows) {
        const treasure = currentTreasureStatement.get(ownerAccountId, row.treasureId);
        if (!treasure) {
          staleFailures.push({ index: row.index, treasureId: row.treasureId, code: "treasure_not_found" });
          continue;
        }
        if (
          treasure.updated_at !== row.beforeUpdatedAt ||
          treasure.collection_id !== row.beforeCollectionId ||
          treasure.location_id !== row.beforeLocationId
        ) {
          staleFailures.push({ index: row.index, treasureId: row.treasureId, code: "treasure_changed" });
          continue;
        }
        currentRows.push({ row, treasure });
      }
      if (staleFailures.length) {
        database.exec("ROLLBACK;");
        return Object.freeze({ kind: "stale", failures: Object.freeze(staleFailures) });
      }

      const updateBoth = database.prepare(`
        UPDATE vault_treasures
        SET collection_id = ?, location_id = ?, updated_at = ?
        WHERE owner_account_id = ? AND id = ? AND archived_at IS NULL
      `);
      const updateCollectionOnly = database.prepare(`
        UPDATE vault_treasures
        SET collection_id = ?, updated_at = ?
        WHERE owner_account_id = ? AND id = ? AND archived_at IS NULL
      `);
      const updateLocationOnly = database.prepare(`
        UPDATE vault_treasures
        SET location_id = ?, updated_at = ?
        WHERE owner_account_id = ? AND id = ? AND archived_at IS NULL
      `);
      const insertEvent = database.prepare(`
        INSERT INTO vault_events (id,owner_account_id,treasure_id,event_type,metadata_json,created_at)
        VALUES (?,?,?,?,?,?)
      `);

      let movedCount = 0;
      let noOpCount = 0;
      const treasures = [];
      for (const { row, treasure } of currentRows) {
        const from = {
          collectionId: treasure.collection_id,
          locationId: treasure.location_id
        };
        const to = {
          collectionId: batch.moveCollection ? batch.destinationCollectionId : treasure.collection_id,
          locationId: batch.moveLocation ? batch.destinationLocationId : treasure.location_id
        };
        const changedFields = [];
        if (from.collectionId !== to.collectionId) changedFields.push("collectionId");
        if (from.locationId !== to.locationId) changedFields.push("locationId");

        if (!changedFields.length) {
          noOpCount += 1;
          treasures.push({ id: treasure.id, title: treasure.title, changedFields, from, to, noOp: true });
          continue;
        }

        let updateResult;
        if (batch.moveCollection && batch.moveLocation) {
          updateResult = updateBoth.run(to.collectionId, to.locationId, committedAt, ownerAccountId, treasure.id);
        } else if (batch.moveCollection) {
          updateResult = updateCollectionOnly.run(to.collectionId, committedAt, ownerAccountId, treasure.id);
        } else {
          updateResult = updateLocationOnly.run(to.locationId, committedAt, ownerAccountId, treasure.id);
        }
        if (Number(updateResult.changes) !== 1) {
          throw new Error(`Treasure ${treasure.id} could not be updated during atomic bulk reorganization.`);
        }

        insertEvent.run(
          randomUUID(),
          ownerAccountId,
          treasure.id,
          "vault.treasure_reorganized",
          JSON.stringify({ batchId, changedFields, from, to }),
          committedAt
        );
        movedCount += 1;
        treasures.push({ id: treasure.id, title: treasure.title, changedFields, from, to, noOp: false });
      }

      insertEvent.run(
        randomUUID(),
        ownerAccountId,
        null,
        "vault.bulk_reorganization_committed",
        JSON.stringify({
          batchId,
          selectedCount: rows.length,
          movedCount,
          noOpCount,
          destination: {
            moveCollection: batch.moveCollection,
            collectionId: batch.destinationCollectionId,
            moveLocation: batch.moveLocation,
            locationId: batch.destinationLocationId
          }
        }),
        committedAt
      );

      const commitResult = {
        batchId,
        status: "committed",
        committedAt,
        selectedCount: rows.length,
        movedCount,
        noOpCount,
        treasures
      };
      const updated = database.prepare(`
        UPDATE vault_reorganization_batches
        SET status = 'committed', committed_at = ?, idempotency_key = ?, commit_result_json = ?
        WHERE owner_account_id = ? AND id = ? AND status = 'preview'
      `).run(committedAt, idempotencyKey, JSON.stringify(commitResult), ownerAccountId, batchId);
      if (Number(updated.changes) !== 1) throw new Error("Bulk reorganization batch state changed before commit could finish.");

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
    updateCollection,
    updateLocation,
    descendantIds,
    createBatch,
    findBatch,
    findByIdempotencyKey,
    listBatchRows,
    markExpired,
    commitBatch
  });
}
