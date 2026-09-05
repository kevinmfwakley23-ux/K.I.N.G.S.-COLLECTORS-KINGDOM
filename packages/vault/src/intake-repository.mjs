const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_intake_items (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('manual','camera')),
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  normalized_identifier TEXT NOT NULL,
  barcode_format TEXT,
  capture_count INTEGER NOT NULL DEFAULT 1 CHECK(capture_count > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dismissed')),
  first_captured_at TEXT NOT NULL,
  last_captured_at TEXT NOT NULL,
  dismissed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_intake_pending_identifier_idx
  ON vault_intake_items(owner_account_id, identifier_type, normalized_identifier)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS vault_intake_owner_status_idx
  ON vault_intake_items(owner_account_id, status, last_captured_at DESC);
`;

function requireDatabase(vaultStore) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Vault intake repository requires the Vault SQLite store.");
  }
  return vaultStore.database;
}

function mapItem(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    sourceType: row.source_type,
    identifierType: row.identifier_type,
    identifierValue: row.identifier_value,
    normalizedIdentifier: row.normalized_identifier,
    barcodeFormat: row.barcode_format,
    captureCount: Number(row.capture_count),
    notes: row.notes,
    status: row.status,
    firstCapturedAt: row.first_captured_at,
    lastCapturedAt: row.last_captured_at,
    dismissedAt: row.dismissed_at
  });
}

function safeLimit(value, maximum = 500) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 100;
  return Math.min(numeric, maximum);
}

export function createVaultIntakeRepository({ vaultStore } = {}) {
  const database = requireDatabase(vaultStore);
  database.exec(SCHEMA);

  function capture(item) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      const existing = mapItem(database.prepare(`
        SELECT * FROM vault_intake_items
        WHERE owner_account_id = ? AND identifier_type = ? AND normalized_identifier = ? AND status = 'pending'
      `).get(item.ownerAccountId, item.identifierType, item.normalizedIdentifier));

      if (existing) {
        database.prepare(`
          UPDATE vault_intake_items
          SET capture_count = capture_count + ?,
              source_type = ?,
              identifier_value = ?,
              barcode_format = COALESCE(?, barcode_format),
              notes = COALESCE(?, notes),
              last_captured_at = ?
          WHERE owner_account_id = ? AND id = ? AND status = 'pending'
        `).run(
          item.captureCount,
          item.sourceType,
          item.identifierValue,
          item.barcodeFormat ?? null,
          item.notes ?? null,
          item.lastCapturedAt,
          item.ownerAccountId,
          existing.id
        );
        database.exec("COMMIT;");
        return Object.freeze({
          item: findById(item.ownerAccountId, existing.id),
          merged: true
        });
      }

      database.prepare(`
        INSERT INTO vault_intake_items (
          id,owner_account_id,source_type,identifier_type,identifier_value,normalized_identifier,
          barcode_format,capture_count,notes,status,first_captured_at,last_captured_at,dismissed_at
        ) VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?,NULL)
      `).run(
        item.id,
        item.ownerAccountId,
        item.sourceType,
        item.identifierType,
        item.identifierValue,
        item.normalizedIdentifier,
        item.barcodeFormat ?? null,
        item.captureCount,
        item.notes ?? null,
        item.firstCapturedAt,
        item.lastCapturedAt
      );
      database.exec("COMMIT;");
      return Object.freeze({ item: findById(item.ownerAccountId, item.id), merged: false });
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  function findById(ownerAccountId, id) {
    return mapItem(database.prepare(`
      SELECT * FROM vault_intake_items
      WHERE owner_account_id = ? AND id = ?
    `).get(ownerAccountId, id));
  }

  function list(ownerAccountId, { status = "pending", limit = 100 } = {}) {
    const values = [ownerAccountId];
    let where = "owner_account_id = ?";
    if (status !== "all") {
      where += " AND status = ?";
      values.push(status);
    }
    values.push(safeLimit(limit));
    return database.prepare(`
      SELECT * FROM vault_intake_items
      WHERE ${where}
      ORDER BY last_captured_at DESC, id ASC
      LIMIT ?
    `).all(...values).map(mapItem);
  }

  function dismiss(ownerAccountId, id, dismissedAt) {
    const result = database.prepare(`
      UPDATE vault_intake_items
      SET status = 'dismissed', dismissed_at = ?, last_captured_at = ?
      WHERE owner_account_id = ? AND id = ? AND status = 'pending'
    `).run(dismissedAt, dismissedAt, ownerAccountId, id);
    return Number(result.changes) === 1 ? findById(ownerAccountId, id) : null;
  }

  function stats(ownerAccountId) {
    const row = database.prepare(`
      SELECT COUNT(*) AS pending_count, COALESCE(SUM(capture_count), 0) AS pending_capture_count
      FROM vault_intake_items
      WHERE owner_account_id = ? AND status = 'pending'
    `).get(ownerAccountId);
    return Object.freeze({
      pendingCount: Number(row.pending_count),
      pendingCaptureCount: Number(row.pending_capture_count)
    });
  }

  return Object.freeze({ capture, findById, list, dismiss, stats });
}
