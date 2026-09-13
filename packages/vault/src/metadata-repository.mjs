const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_treasure_metadata (
  treasure_id TEXT PRIMARY KEY REFERENCES vault_treasures(id) ON DELETE CASCADE,
  owner_account_id TEXT NOT NULL,
  year INTEGER CHECK(year IS NULL OR (year >= 1 AND year <= 9999)),
  tags_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_treasure_metadata_owner_year_idx
  ON vault_treasure_metadata(owner_account_id, year, treasure_id);
CREATE INDEX IF NOT EXISTS vault_treasure_metadata_owner_updated_idx
  ON vault_treasure_metadata(owner_account_id, updated_at DESC, treasure_id);

CREATE TABLE IF NOT EXISTS vault_treasure_tags (
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  tag_key TEXT NOT NULL,
  tag_label TEXT NOT NULL,
  PRIMARY KEY(treasure_id, tag_key)
);
CREATE INDEX IF NOT EXISTS vault_treasure_tags_owner_key_idx
  ON vault_treasure_tags(owner_account_id, tag_key, treasure_id);
CREATE INDEX IF NOT EXISTS vault_treasure_tags_owner_label_idx
  ON vault_treasure_tags(owner_account_id, tag_label COLLATE NOCASE, treasure_id);
`;

function parseTags(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapMetadata(row) {
  if (!row) return null;
  return Object.freeze({
    treasureId: row.treasure_id,
    ownerAccountId: row.owner_account_id,
    year: row.year === null ? null : Number(row.year),
    tags: Object.freeze(parseTags(row.tags_json)),
    updatedAt: row.updated_at
  });
}

export function canonicalTagKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function createVaultMetadataRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Vault metadata repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const findStatement = database.prepare(`
    SELECT * FROM vault_treasure_metadata
    WHERE owner_account_id = ? AND treasure_id = ?
    LIMIT 1
  `);
  const upsertStatement = database.prepare(`
    INSERT INTO vault_treasure_metadata (treasure_id, owner_account_id, year, tags_json, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(treasure_id) DO UPDATE SET
      owner_account_id = excluded.owner_account_id,
      year = excluded.year,
      tags_json = excluded.tags_json,
      updated_at = excluded.updated_at
  `);
  const deleteTagsStatement = database.prepare(`
    DELETE FROM vault_treasure_tags
    WHERE owner_account_id = ? AND treasure_id = ?
  `);
  const insertTagStatement = database.prepare(`
    INSERT INTO vault_treasure_tags (owner_account_id, treasure_id, tag_key, tag_label)
    VALUES (?, ?, ?, ?)
  `);

  function find(ownerAccountId, treasureId) {
    return mapMetadata(findStatement.get(ownerAccountId, treasureId));
  }

  function findMany(ownerAccountId, treasureIds = []) {
    if (!Array.isArray(treasureIds) || !treasureIds.length) return new Map();
    const ids = [...new Set(treasureIds.filter((id) => typeof id === "string" && id))];
    if (!ids.length) return new Map();
    const placeholders = ids.map(() => "?").join(",");
    const rows = database.prepare(`
      SELECT * FROM vault_treasure_metadata
      WHERE owner_account_id = ? AND treasure_id IN (${placeholders})
    `).all(ownerAccountId, ...ids);
    return new Map(rows.map((row) => {
      const metadata = mapMetadata(row);
      return [metadata.treasureId, metadata];
    }));
  }

  function upsert({ ownerAccountId, treasureId, year = null, tags = [], updatedAt }) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      upsertStatement.run(treasureId, ownerAccountId, year, JSON.stringify(tags), updatedAt);
      deleteTagsStatement.run(ownerAccountId, treasureId);
      for (const label of tags) {
        const key = canonicalTagKey(label);
        if (!key) continue;
        insertTagStatement.run(ownerAccountId, treasureId, key, label);
      }
      database.exec("COMMIT;");
    } catch (error) {
      try { database.exec("ROLLBACK;"); } catch {}
      throw error;
    }
    return find(ownerAccountId, treasureId);
  }

  function listTags(ownerAccountId, { limit = 500 } = {}) {
    const bounded = Number.isInteger(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 1000) : 500;
    return database.prepare(`
      SELECT tag_key, MIN(tag_label) AS tag_label, COUNT(DISTINCT treasure_id) AS treasure_count
      FROM vault_treasure_tags
      WHERE owner_account_id = ?
      GROUP BY tag_key
      ORDER BY treasure_count DESC, tag_label COLLATE NOCASE ASC
      LIMIT ?
    `).all(ownerAccountId, bounded).map((row) => Object.freeze({
      key: row.tag_key,
      label: row.tag_label,
      treasureCount: Number(row.treasure_count)
    }));
  }

  function exportForOwner(ownerAccountId) {
    return database.prepare(`
      SELECT * FROM vault_treasure_metadata
      WHERE owner_account_id = ?
      ORDER BY treasure_id ASC
    `).all(ownerAccountId).map(mapMetadata);
  }

  return Object.freeze({ find, findMany, upsert, listTags, exportForOwner });
}
