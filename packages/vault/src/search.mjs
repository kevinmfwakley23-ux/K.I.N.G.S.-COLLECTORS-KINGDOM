import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const SEARCH_SCHEMA_VERSION = 1;
const MAX_QUERY_TOKENS = 16;
const STOPWORDS = new Set([
  "a", "an", "and", "are", "can", "collection", "do", "everything", "find", "for", "from", "have",
  "i", "in", "is", "it", "me", "my", "of", "please", "show", "that", "the", "to", "vault", "what",
  "where", "which", "with", "you", "your"
]);

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE VIRTUAL TABLE IF NOT EXISTS vault_extended_search USING fts5(
  treasure_id UNINDEXED,
  account_id UNINDEXED,
  content,
  tokenize='unicode61 remove_diacritics 2'
);
CREATE TABLE IF NOT EXISTS vault_extended_search_meta (
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL,
  core_updated_at TEXT NOT NULL,
  attribute_updated_at TEXT NOT NULL,
  ownership_updated_at TEXT NOT NULL,
  folder_updated_at TEXT NOT NULL,
  location_updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  PRIMARY KEY(account_id, treasure_id)
);
CREATE INDEX IF NOT EXISTS vault_extended_search_meta_account_idx
  ON vault_extended_search_meta(account_id, treasure_id);
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function integer(value, name, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) throw new VaultError(`invalid_${name}`, `${name} is invalid.`);
  return value;
}

function queryTokens(query) {
  if (typeof query !== "string" || !query.trim()) return [];
  const raw = query.normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const meaningful = raw.filter((token) => !STOPWORDS.has(token));
  const selected = meaningful.length ? meaningful : raw;
  return [...new Set(selected)].slice(0, MAX_QUERY_TOKENS);
}

function ftsQuery(query) {
  return queryTokens(query).map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");
}

function versionRows(database, accountId) {
  return database.prepare(`SELECT
      t.id AS treasure_id,
      t.updated_at AS core_updated_at,
      COALESCE((SELECT MAX(a.updated_at) FROM vault_treasure_attributes a
        WHERE a.account_id = t.account_id AND a.treasure_id = t.id), '') AS attribute_updated_at,
      COALESCE((SELECT MAX(o.created_at) FROM vault_ownership_history o
        WHERE o.account_id = t.account_id AND o.treasure_id = t.id), '') AS ownership_updated_at,
      COALESCE(f.updated_at, '') AS folder_updated_at,
      COALESCE(l.updated_at, '') AS location_updated_at
    FROM vault_treasures t
    LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
    LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
    WHERE t.account_id = ?`).all(accountId);
}

function contentExpression() {
  return `LOWER(
    COALESCE(t.title, '') || ' ' || COALESCE(t.category, '') || ' ' || COALESCE(t.series, '') || ' ' ||
    COALESCE(t.manufacturer, '') || ' ' || COALESCE(CAST(t.year AS TEXT), '') || ' ' || COALESCE(t.condition, '') || ' ' ||
    COALESCE(t.notes, '') || ' ' || COALESCE(t.valuation_source, '') || ' ' || COALESCE(t.purchase_date, '') || ' ' ||
    COALESCE(f.name, '') || ' ' || COALESCE(l.name, '') || ' ' ||
    COALESCE((SELECT GROUP_CONCAT(tg.tag, ' ') FROM vault_tags tg WHERE tg.treasure_id = t.id), '') || ' ' ||
    COALESCE((SELECT GROUP_CONCAT(
      a.field_label || ' ' || a.value_json || ' ' || a.source_type || ' ' || a.verification_status || ' ' ||
      COALESCE(a.verification_provider, '') || ' ' || COALESCE(a.verification_reference, ''), ' ')
      FROM vault_treasure_attributes a WHERE a.account_id = t.account_id AND a.treasure_id = t.id), '') || ' ' ||
    COALESCE((SELECT GROUP_CONCAT(
      o.event_type || ' ' || COALESCE(o.occurred_on, '') || ' ' || COALESCE(o.counterparty, '') || ' ' || COALESCE(o.notes, ''), ' ')
      FROM vault_ownership_history o WHERE o.account_id = t.account_id AND o.treasure_id = t.id), '')
  )`;
}

export function createVaultSearchService({ filename } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault search database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function removeOrphans(accountId) {
    const orphanRows = database.prepare(`SELECT m.treasure_id FROM vault_extended_search_meta m
      LEFT JOIN vault_treasures t ON t.account_id = m.account_id AND t.id = m.treasure_id
      WHERE m.account_id = ? AND t.id IS NULL`).all(accountId);
    const deleteSearch = database.prepare("DELETE FROM vault_extended_search WHERE account_id = ? AND treasure_id = ?");
    const deleteMeta = database.prepare("DELETE FROM vault_extended_search_meta WHERE account_id = ? AND treasure_id = ?");
    for (const row of orphanRows) {
      deleteSearch.run(accountId, row.treasure_id);
      deleteMeta.run(accountId, row.treasure_id);
    }
  }

  function fullRebuild(accountId, rows = versionRows(database, accountId)) {
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.prepare("DELETE FROM vault_extended_search WHERE account_id = ?").run(accountId);
      database.prepare("DELETE FROM vault_extended_search_meta WHERE account_id = ?").run(accountId);
      database.prepare(`INSERT INTO vault_extended_search (treasure_id, account_id, content)
        SELECT t.id, t.account_id, ${contentExpression()}
        FROM vault_treasures t
        LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
        LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
        WHERE t.account_id = ?`).run(accountId);
      const insertMeta = database.prepare(`INSERT INTO vault_extended_search_meta (
        account_id, treasure_id, core_updated_at, attribute_updated_at, ownership_updated_at,
        folder_updated_at, location_updated_at, schema_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const row of rows) {
        insertMeta.run(
          accountId,
          row.treasure_id,
          row.core_updated_at,
          row.attribute_updated_at,
          row.ownership_updated_at,
          row.folder_updated_at,
          row.location_updated_at,
          SEARCH_SCHEMA_VERSION
        );
      }
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }

  function refreshTreasure(accountId, row) {
    const treasure = database.prepare(`SELECT t.*, f.name AS folder_name, l.name AS location_name
      FROM vault_treasures t
      LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
      LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
      WHERE t.account_id = ? AND t.id = ?`).get(accountId, row.treasure_id);
    if (!treasure) return;
    const content = database.prepare(`SELECT ${contentExpression()} AS content
      FROM vault_treasures t
      LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
      LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
      WHERE t.account_id = ? AND t.id = ?`).get(accountId, row.treasure_id)?.content ?? "";
    database.prepare("DELETE FROM vault_extended_search WHERE account_id = ? AND treasure_id = ?").run(accountId, row.treasure_id);
    database.prepare("INSERT INTO vault_extended_search (treasure_id, account_id, content) VALUES (?, ?, ?)").run(row.treasure_id, accountId, content);
    database.prepare(`INSERT INTO vault_extended_search_meta (
      account_id, treasure_id, core_updated_at, attribute_updated_at, ownership_updated_at,
      folder_updated_at, location_updated_at, schema_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, treasure_id) DO UPDATE SET
      core_updated_at=excluded.core_updated_at,
      attribute_updated_at=excluded.attribute_updated_at,
      ownership_updated_at=excluded.ownership_updated_at,
      folder_updated_at=excluded.folder_updated_at,
      location_updated_at=excluded.location_updated_at,
      schema_version=excluded.schema_version`).run(
      accountId,
      row.treasure_id,
      row.core_updated_at,
      row.attribute_updated_at,
      row.ownership_updated_at,
      row.folder_updated_at,
      row.location_updated_at,
      SEARCH_SCHEMA_VERSION
    );
  }

  function synchronize(identity) {
    const collector = requireIdentity(identity);
    removeOrphans(collector.id);
    const rows = versionRows(database, collector.id);
    const metaRows = database.prepare(`SELECT * FROM vault_extended_search_meta WHERE account_id = ?`).all(collector.id);
    const meta = new Map(metaRows.map((row) => [row.treasure_id, row]));
    const stale = rows.filter((row) => {
      const current = meta.get(row.treasure_id);
      return !current ||
        Number(current.schema_version) !== SEARCH_SCHEMA_VERSION ||
        current.core_updated_at !== row.core_updated_at ||
        current.attribute_updated_at !== row.attribute_updated_at ||
        current.ownership_updated_at !== row.ownership_updated_at ||
        current.folder_updated_at !== row.folder_updated_at ||
        current.location_updated_at !== row.location_updated_at;
    });
    if (!stale.length) return { refreshed: 0, rebuilt: false };
    if (stale.length > 300 || metaRows.length === 0) {
      fullRebuild(collector.id, rows);
      return { refreshed: rows.length, rebuilt: true };
    }
    database.exec("BEGIN IMMEDIATE;");
    try {
      for (const row of stale) refreshTreasure(collector.id, row);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
    return { refreshed: stale.length, rebuilt: false };
  }

  function searchTreasureIds(identity, query, { limit = 5000 } = {}) {
    const collector = requireIdentity(identity);
    const safeLimit = integer(limit, "search_limit", { min: 1, max: 5000 });
    const expression = ftsQuery(query);
    if (!expression) return [];
    synchronize(collector);
    return database.prepare(`SELECT treasure_id FROM vault_extended_search
      WHERE vault_extended_search MATCH ? AND account_id = ? LIMIT ?`).all(expression, collector.id, safeLimit).map((row) => row.treasure_id);
  }

  function close() {
    database.close();
  }

  return Object.freeze({ synchronize, searchTreasureIds, close });
}
