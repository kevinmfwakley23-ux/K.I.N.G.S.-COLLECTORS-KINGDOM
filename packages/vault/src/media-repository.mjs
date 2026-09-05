function requireDatabase(vaultStore) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Vault media repository requires the Vault SQLite store.");
  }
  return vaultStore.database;
}

function ensureDigestColumn(database) {
  const columns = database.prepare("PRAGMA table_info(vault_treasure_media)").all();
  if (!columns.some((column) => column.name === "sha256")) {
    database.exec("ALTER TABLE vault_treasure_media ADD COLUMN sha256 TEXT;");
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS vault_media_owner_treasure_sha256_idx
    ON vault_treasure_media(owner_account_id, treasure_id, sha256)
    WHERE sha256 IS NOT NULL;
  `);
}

function mapMedia(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
    mediaKind: row.media_kind,
    storageKey: row.storage_key,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    sha256: row.sha256 ?? null,
    createdAt: row.created_at
  });
}

export function createVaultMediaRepository({ vaultStore } = {}) {
  const database = requireDatabase(vaultStore);
  ensureDigestColumn(database);

  function create(media) {
    database.prepare(`
      INSERT INTO vault_treasure_media (
        id,owner_account_id,treasure_id,media_kind,storage_key,original_name,content_type,size_bytes,sha256,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      media.id,
      media.ownerAccountId,
      media.treasureId,
      media.mediaKind,
      media.storageKey,
      media.originalName ?? null,
      media.contentType,
      media.sizeBytes,
      media.sha256 ?? null,
      media.createdAt
    );
    return findById(media.ownerAccountId, media.id);
  }

  function findById(ownerAccountId, id) {
    return mapMedia(database.prepare(`
      SELECT * FROM vault_treasure_media
      WHERE owner_account_id = ? AND id = ?
    `).get(ownerAccountId, id));
  }

  function findBySha256(ownerAccountId, treasureId, sha256) {
    return mapMedia(database.prepare(`
      SELECT * FROM vault_treasure_media
      WHERE owner_account_id = ? AND treasure_id = ? AND sha256 = ?
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `).get(ownerAccountId, treasureId, sha256));
  }

  function listForTreasure(ownerAccountId, treasureId) {
    return database.prepare(`
      SELECT * FROM vault_treasure_media
      WHERE owner_account_id = ? AND treasure_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(ownerAccountId, treasureId).map(mapMedia);
  }

  function usage(ownerAccountId) {
    const row = database.prepare(`
      SELECT COUNT(*) AS media_count, COALESCE(SUM(size_bytes), 0) AS size_bytes
      FROM vault_treasure_media
      WHERE owner_account_id = ?
    `).get(ownerAccountId);
    return Object.freeze({
      mediaCount: Number(row.media_count),
      sizeBytes: Number(row.size_bytes)
    });
  }

  function remove(ownerAccountId, id) {
    return Number(database.prepare(`
      DELETE FROM vault_treasure_media
      WHERE owner_account_id = ? AND id = ?
    `).run(ownerAccountId, id).changes) === 1;
  }

  return Object.freeze({ create, findById, findBySha256, listForTreasure, usage, remove });
}
