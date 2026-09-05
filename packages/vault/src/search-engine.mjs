import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createVaultFavoriteService } from "./favorites.mjs";
import { createVaultSavedViewService } from "./saved-searches.mjs";
import { VaultError } from "./service.mjs";

const SEARCH_SCHEMA_VERSION = 4;
const MAX_QUERY_TOKENS = 16;
const MAX_INCREMENTAL_REFRESH = 300;
const SORTS = new Set(["updated-desc", "updated-asc", "created-desc", "title-asc", "title-desc", "value-desc", "year-desc"]);
const FAVORITE_TERMS = new Set(["favorite", "favorites", "favourite", "favourites"]);
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
  evidence_revision TEXT NOT NULL DEFAULT '0',
  marketplace_updated_at TEXT NOT NULL DEFAULT '',
  folder_updated_at TEXT NOT NULL,
  location_updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  PRIMARY KEY(account_id, treasure_id)
);
CREATE INDEX IF NOT EXISTS vault_extended_search_meta_account_idx
  ON vault_extended_search_meta(account_id, treasure_id);
CREATE TABLE IF NOT EXISTS vault_extended_search_dirty (
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  marked_at TEXT NOT NULL,
  PRIMARY KEY(account_id, treasure_id)
);
CREATE INDEX IF NOT EXISTS vault_extended_search_dirty_account_idx
  ON vault_extended_search_dirty(account_id, marked_at, treasure_id);
CREATE TABLE IF NOT EXISTS vault_extended_search_trigger_state (
  trigger_group TEXT PRIMARY KEY,
  installed_at TEXT NOT NULL
);
`;

const CORE_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_treasure_insert
AFTER INSERT ON vault_treasures BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  VALUES (NEW.account_id, NEW.id, 'treasure-insert', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_treasure_update
AFTER UPDATE ON vault_treasures BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  VALUES (NEW.account_id, NEW.id, 'treasure-update', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_treasure_delete
AFTER DELETE ON vault_treasures BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  VALUES (OLD.account_id, OLD.id, 'treasure-delete', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_tag_insert
AFTER INSERT ON vault_tags BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  SELECT account_id, NEW.treasure_id, 'tag-insert', strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM vault_treasures WHERE id = NEW.treasure_id;
END;
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_tag_delete
AFTER DELETE ON vault_tags BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  SELECT account_id, OLD.treasure_id, 'tag-delete', strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM vault_treasures WHERE id = OLD.treasure_id;
END;
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_folder_update
AFTER UPDATE ON vault_folders BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  SELECT account_id, id, 'folder-update', strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM vault_treasures WHERE account_id = NEW.account_id AND folder_id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS vault_search_dirty_location_update
AFTER UPDATE ON vault_locations BEGIN
  INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
  SELECT account_id, id, 'location-update', strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM vault_treasures WHERE account_id = NEW.account_id AND location_id = NEW.id;
END;
`;

const OPTIONAL_TRIGGER_GROUPS = Object.freeze([
  {
    name: "attributes-v1",
    table: "vault_treasure_attributes",
    bootstrap: `INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
      SELECT account_id, treasure_id, 'attributes-bootstrap', strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM vault_treasure_attributes`,
    triggers: `
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_attribute_insert AFTER INSERT ON vault_treasure_attributes BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'attribute-insert', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_attribute_update AFTER UPDATE ON vault_treasure_attributes BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'attribute-update', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_attribute_delete AFTER DELETE ON vault_treasure_attributes BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (OLD.account_id, OLD.treasure_id, 'attribute-delete', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;`
  },
  {
    name: "ownership-v1",
    table: "vault_ownership_history",
    bootstrap: `INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
      SELECT account_id, treasure_id, 'ownership-bootstrap', strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM vault_ownership_history`,
    triggers: `
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_ownership_insert AFTER INSERT ON vault_ownership_history BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'ownership-insert', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_ownership_update AFTER UPDATE ON vault_ownership_history BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'ownership-update', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_ownership_delete AFTER DELETE ON vault_ownership_history BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (OLD.account_id, OLD.treasure_id, 'ownership-delete', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;`
  },
  {
    name: "evidence-v1",
    table: "vault_evidence_documents",
    bootstrap: `INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
      SELECT account_id, treasure_id, 'evidence-bootstrap', strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM vault_evidence_documents`,
    triggers: `
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_evidence_insert AFTER INSERT ON vault_evidence_documents BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'evidence-insert', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_evidence_update AFTER UPDATE ON vault_evidence_documents BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'evidence-update', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_evidence_delete AFTER DELETE ON vault_evidence_documents BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (OLD.account_id, OLD.treasure_id, 'evidence-delete', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;`
  },
  {
    name: "marketplace-preparation-v1",
    table: "vault_marketplace_preparation",
    bootstrap: `INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
      SELECT account_id, treasure_id, 'marketplace-bootstrap', strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM vault_marketplace_preparation`,
    triggers: `
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_marketplace_insert AFTER INSERT ON vault_marketplace_preparation BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'marketplace-insert', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_marketplace_update AFTER UPDATE ON vault_marketplace_preparation BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (NEW.account_id, NEW.treasure_id, 'marketplace-update', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
      CREATE TRIGGER IF NOT EXISTS vault_search_dirty_marketplace_delete AFTER DELETE ON vault_marketplace_preparation BEGIN
        INSERT OR REPLACE INTO vault_extended_search_dirty(account_id, treasure_id, reason, marked_at)
        VALUES (OLD.account_id, OLD.treasure_id, 'marketplace-delete', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;`
  }
]);

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function integer(value, name, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) throw new VaultError(`invalid_${name}`, `${name} is invalid.`);
  return value;
}

function cleanOptionalText(value, name, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > max) throw new VaultError(`invalid_${name}`, `${name} must contain 1 to ${max} characters.`);
  return clean;
}

function queryTokens(query) {
  if (typeof query !== "string" || !query.trim()) return [];
  const raw = query.normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const meaningful = raw.filter((token) => !STOPWORDS.has(token));
  const selected = meaningful.length ? meaningful : raw;
  return [...new Set(selected)].slice(0, MAX_QUERY_TOKENS);
}

function ftsQueryFromTokens(tokens) {
  return tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");
}

function queryPlan(query) {
  const tokens = queryTokens(query);
  const favoritesOnly = tokens.some((token) => FAVORITE_TERMS.has(token));
  const textTokens = favoritesOnly ? tokens.filter((token) => !FAVORITE_TERMS.has(token)) : tokens;
  return { tokens, favoritesOnly, expression: ftsQueryFromTokens(textTokens) };
}

function tableExists(database, tableName) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(tableName));
}

function ensureSearchMetaColumns(database) {
  const columns = new Set(database.prepare("PRAGMA table_info(vault_extended_search_meta)").all().map((row) => row.name));
  if (!columns.has("evidence_revision")) {
    database.exec("ALTER TABLE vault_extended_search_meta ADD COLUMN evidence_revision TEXT NOT NULL DEFAULT '0';");
  }
  if (!columns.has("marketplace_updated_at")) {
    database.exec("ALTER TABLE vault_extended_search_meta ADD COLUMN marketplace_updated_at TEXT NOT NULL DEFAULT ''; ");
  }
}

function installOptionalTriggers(database) {
  for (const group of OPTIONAL_TRIGGER_GROUPS) {
    if (!tableExists(database, group.table)) continue;
    database.exec(group.triggers);
    const installed = database.prepare("SELECT 1 FROM vault_extended_search_trigger_state WHERE trigger_group = ?").get(group.name);
    if (installed) continue;
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.exec(group.bootstrap);
      database.prepare("INSERT INTO vault_extended_search_trigger_state(trigger_group, installed_at) VALUES (?, ?)")
        .run(group.name, new Date().toISOString());
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }
}

function optionalVersionExpressions(database) {
  return {
    attributeUpdated: tableExists(database, "vault_treasure_attributes")
      ? `COALESCE((SELECT MAX(a.updated_at) FROM vault_treasure_attributes a
          WHERE a.account_id = t.account_id AND a.treasure_id = t.id), '')`
      : "''",
    ownershipUpdated: tableExists(database, "vault_ownership_history")
      ? `COALESCE((SELECT MAX(o.created_at) FROM vault_ownership_history o
          WHERE o.account_id = t.account_id AND o.treasure_id = t.id), '')`
      : "''",
    marketplaceUpdated: tableExists(database, "vault_marketplace_preparation")
      ? `COALESCE((SELECT p.updated_at FROM vault_marketplace_preparation p
          WHERE p.account_id = t.account_id AND p.treasure_id = t.id), '')`
      : "''"
  };
}

function versionRows(database, accountId, treasureId = null) {
  const optional = optionalVersionExpressions(database);
  const values = [accountId];
  const oneTreasure = treasureId === null ? "" : " AND t.id = ?";
  if (treasureId !== null) values.push(String(treasureId));
  return database.prepare(`SELECT
      t.id AS treasure_id,
      t.updated_at AS core_updated_at,
      ${optional.attributeUpdated} AS attribute_updated_at,
      ${optional.ownershipUpdated} AS ownership_updated_at,
      CAST((SELECT COUNT(*) FROM vault_audit va
        WHERE va.account_id = t.account_id AND va.treasure_id = t.id
        AND va.event_type IN ('vault.evidence_added','vault.evidence_updated','vault.evidence_removed')) AS TEXT) AS evidence_revision,
      ${optional.marketplaceUpdated} AS marketplace_updated_at,
      COALESCE(f.updated_at, '') AS folder_updated_at,
      COALESCE(l.updated_at, '') AS location_updated_at
    FROM vault_treasures t
    LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
    LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
    WHERE t.account_id = ?${oneTreasure}`).all(...values);
}

function contentExpression(database) {
  const attributeContent = tableExists(database, "vault_treasure_attributes")
    ? `COALESCE((SELECT GROUP_CONCAT(
      a.field_label || ' ' || a.value_json || ' ' || a.source_type || ' ' || a.verification_status || ' ' ||
      COALESCE(a.verification_provider, '') || ' ' || COALESCE(a.verification_reference, ''), ' ')
      FROM vault_treasure_attributes a WHERE a.account_id = t.account_id AND a.treasure_id = t.id), '')`
    : "''";
  const ownershipContent = tableExists(database, "vault_ownership_history")
    ? `COALESCE((SELECT GROUP_CONCAT(
      o.event_type || ' ' || COALESCE(o.occurred_on, '') || ' ' || COALESCE(o.counterparty, '') || ' ' || COALESCE(o.notes, ''), ' ')
      FROM vault_ownership_history o WHERE o.account_id = t.account_id AND o.treasure_id = t.id), '')`
    : "''";
  const evidenceContent = tableExists(database, "vault_evidence_documents")
    ? `COALESCE((SELECT GROUP_CONCAT(
      e.kind || ' ' || e.title || ' ' || COALESCE(e.source_label, '') || ' ' || COALESCE(e.document_date, '') || ' ' ||
      COALESCE(e.notes, '') || ' ' || COALESCE(e.original_name, '') || ' ' || e.source_type || ' ' || e.verification_status, ' ')
      FROM vault_evidence_documents e WHERE e.account_id = t.account_id AND e.treasure_id = t.id), '')`
    : "''";
  const marketplaceContent = tableExists(database, "vault_marketplace_preparation")
    ? `COALESCE((SELECT COALESCE(p.listing_description, '') || ' ' || COALESCE(p.condition_disclosure, '')
      FROM vault_marketplace_preparation p WHERE p.account_id = t.account_id AND p.treasure_id = t.id), '')`
    : "''";
  return `LOWER(
    COALESCE(t.title, '') || ' ' || COALESCE(t.category, '') || ' ' || COALESCE(t.series, '') || ' ' ||
    COALESCE(t.manufacturer, '') || ' ' || COALESCE(CAST(t.year AS TEXT), '') || ' ' || COALESCE(t.condition, '') || ' ' ||
    COALESCE(t.notes, '') || ' ' || COALESCE(t.valuation_source, '') || ' ' || COALESCE(t.purchase_date, '') || ' ' ||
    COALESCE(f.name, '') || ' ' || COALESCE(l.name, '') || ' ' ||
    COALESCE((SELECT GROUP_CONCAT(tg.tag, ' ') FROM vault_tags tg WHERE tg.treasure_id = t.id), '') || ' ' ||
    ${attributeContent} || ' ' ||
    ${ownershipContent} || ' ' ||
    ${evidenceContent} || ' ' ||
    ${marketplaceContent}
  )`;
}

function filterClauses(options, values) {
  const clauses = [];
  const category = cleanOptionalText(options.category, "category", 120);
  const folderId = cleanOptionalText(options.folderId, "folder_id", 200);
  const locationId = cleanOptionalText(options.locationId, "location_id", 200);
  const tag = cleanOptionalText(options.tag, "tag", 60)?.toLowerCase() ?? null;
  if (category) { clauses.push("t.category = ? COLLATE NOCASE"); values.push(category); }
  if (folderId) { clauses.push("t.folder_id = ?"); values.push(folderId); }
  if (locationId) { clauses.push("t.location_id = ?"); values.push(locationId); }
  if (tag) {
    clauses.push("EXISTS (SELECT 1 FROM vault_tags tg WHERE tg.treasure_id = t.id AND tg.tag = ? COLLATE NOCASE)");
    values.push(tag);
  }
  return clauses;
}

function orderBy(sort) {
  return {
    "updated-desc": "t.updated_at DESC",
    "updated-asc": "t.updated_at ASC",
    "created-desc": "t.created_at DESC",
    "title-asc": "t.title COLLATE NOCASE ASC",
    "title-desc": "t.title COLLATE NOCASE DESC",
    "value-desc": "COALESCE(t.estimated_value_cents, -1) DESC, t.title COLLATE NOCASE ASC",
    "year-desc": "COALESCE(t.year, -1) DESC, t.title COLLATE NOCASE ASC"
  }[sort];
}

export function createVaultSearchService({ filename } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault search database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);
  ensureSearchMetaColumns(database);
  database.exec(CORE_TRIGGERS);
  installOptionalTriggers(database);
  const favorites = createVaultFavoriteService({ filename });
  const savedViews = createVaultSavedViewService({ filename });

  function removeOrphans(accountId) {
    const orphanRows = database.prepare(`SELECT m.treasure_id FROM vault_extended_search_meta m
      LEFT JOIN vault_treasures t ON t.account_id = m.account_id AND t.id = m.treasure_id
      WHERE m.account_id = ? AND t.id IS NULL`).all(accountId);
    const deleteSearch = database.prepare("DELETE FROM vault_extended_search WHERE account_id = ? AND treasure_id = ?");
    const deleteMeta = database.prepare("DELETE FROM vault_extended_search_meta WHERE account_id = ? AND treasure_id = ?");
    const deleteDirty = database.prepare("DELETE FROM vault_extended_search_dirty WHERE account_id = ? AND treasure_id = ?");
    for (const row of orphanRows) {
      deleteSearch.run(accountId, row.treasure_id);
      deleteMeta.run(accountId, row.treasure_id);
      deleteDirty.run(accountId, row.treasure_id);
    }
  }

  function insertMeta(accountId, row) {
    database.prepare(`INSERT INTO vault_extended_search_meta (
      account_id, treasure_id, core_updated_at, attribute_updated_at, ownership_updated_at, evidence_revision,
      marketplace_updated_at, folder_updated_at, location_updated_at, schema_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, treasure_id) DO UPDATE SET
      core_updated_at=excluded.core_updated_at,
      attribute_updated_at=excluded.attribute_updated_at,
      ownership_updated_at=excluded.ownership_updated_at,
      evidence_revision=excluded.evidence_revision,
      marketplace_updated_at=excluded.marketplace_updated_at,
      folder_updated_at=excluded.folder_updated_at,
      location_updated_at=excluded.location_updated_at,
      schema_version=excluded.schema_version`).run(
      accountId,
      row.treasure_id,
      row.core_updated_at,
      row.attribute_updated_at,
      row.ownership_updated_at,
      row.evidence_revision,
      row.marketplace_updated_at,
      row.folder_updated_at,
      row.location_updated_at,
      SEARCH_SCHEMA_VERSION
    );
  }

  function fullRebuild(accountId) {
    const rows = versionRows(database, accountId);
    database.exec("BEGIN IMMEDIATE;");
    try {
      database.prepare("DELETE FROM vault_extended_search WHERE account_id = ?").run(accountId);
      database.prepare("DELETE FROM vault_extended_search_meta WHERE account_id = ?").run(accountId);
      database.prepare(`INSERT INTO vault_extended_search (treasure_id, account_id, content)
        SELECT t.id, t.account_id, ${contentExpression(database)}
        FROM vault_treasures t
        LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
        LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
        WHERE t.account_id = ?`).run(accountId);
      for (const row of rows) insertMeta(accountId, row);
      database.prepare("DELETE FROM vault_extended_search_dirty WHERE account_id = ?").run(accountId);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
    return rows.length;
  }

  function refreshTreasure(accountId, treasureId) {
    const row = versionRows(database, accountId, treasureId)[0];
    if (!row) {
      database.prepare("DELETE FROM vault_extended_search WHERE account_id = ? AND treasure_id = ?").run(accountId, String(treasureId));
      database.prepare("DELETE FROM vault_extended_search_meta WHERE account_id = ? AND treasure_id = ?").run(accountId, String(treasureId));
      database.prepare("DELETE FROM vault_extended_search_dirty WHERE account_id = ? AND treasure_id = ?").run(accountId, String(treasureId));
      return false;
    }
    const content = database.prepare(`SELECT ${contentExpression(database)} AS content
      FROM vault_treasures t
      LEFT JOIN vault_folders f ON f.account_id = t.account_id AND f.id = t.folder_id
      LEFT JOIN vault_locations l ON l.account_id = t.account_id AND l.id = t.location_id
      WHERE t.account_id = ? AND t.id = ?`).get(accountId, String(treasureId))?.content;
    if (content === undefined) return false;
    database.prepare("DELETE FROM vault_extended_search WHERE account_id = ? AND treasure_id = ?").run(accountId, String(treasureId));
    database.prepare("INSERT INTO vault_extended_search (treasure_id, account_id, content) VALUES (?, ?, ?)").run(String(treasureId), accountId, content);
    insertMeta(accountId, row);
    database.prepare("DELETE FROM vault_extended_search_dirty WHERE account_id = ? AND treasure_id = ?").run(accountId, String(treasureId));
    return true;
  }

  function synchronize(identity) {
    const collector = requireIdentity(identity);
    installOptionalTriggers(database);
    removeOrphans(collector.id);

    const schemaMismatch = database.prepare("SELECT 1 FROM vault_extended_search_meta WHERE account_id = ? AND schema_version <> ? LIMIT 1")
      .get(collector.id, SEARCH_SCHEMA_VERSION);
    if (schemaMismatch) {
      const refreshed = fullRebuild(collector.id);
      return { refreshed, rebuilt: true, mode: "schema-rebuild", dirtyCount: 0 };
    }

    let dirtyRows = database.prepare(`SELECT treasure_id FROM vault_extended_search_dirty
      WHERE account_id = ? ORDER BY marked_at ASC, treasure_id ASC LIMIT ?`).all(collector.id, MAX_INCREMENTAL_REFRESH + 1);
    if (dirtyRows.length > MAX_INCREMENTAL_REFRESH) {
      const refreshed = fullRebuild(collector.id);
      return { refreshed, rebuilt: true, mode: "bulk-rebuild", dirtyCount: dirtyRows.length };
    }

    let refreshed = 0;
    if (dirtyRows.length) {
      database.exec("BEGIN IMMEDIATE;");
      try {
        for (const row of dirtyRows) if (refreshTreasure(collector.id, row.treasure_id)) refreshed += 1;
        database.exec("COMMIT;");
      } catch (error) {
        database.exec("ROLLBACK;");
        throw error;
      }
    }

    const unindexedRows = database.prepare(`SELECT t.id AS treasure_id FROM vault_treasures t
      LEFT JOIN vault_extended_search_meta m ON m.account_id = t.account_id AND m.treasure_id = t.id
      WHERE t.account_id = ? AND m.treasure_id IS NULL LIMIT ?`).all(collector.id, MAX_INCREMENTAL_REFRESH + 1);
    if (unindexedRows.length > MAX_INCREMENTAL_REFRESH) {
      const rebuilt = fullRebuild(collector.id);
      return { refreshed: rebuilt, rebuilt: true, mode: "recovery-rebuild", dirtyCount: dirtyRows.length };
    }
    if (unindexedRows.length) {
      database.exec("BEGIN IMMEDIATE;");
      try {
        for (const row of unindexedRows) if (refreshTreasure(collector.id, row.treasure_id)) refreshed += 1;
        database.exec("COMMIT;");
      } catch (error) {
        database.exec("ROLLBACK;");
        throw error;
      }
    }

    dirtyRows = database.prepare("SELECT treasure_id FROM vault_extended_search_dirty WHERE account_id = ? LIMIT 1").all(collector.id);
    if (dirtyRows.length) {
      const rebuilt = fullRebuild(collector.id);
      return { refreshed: rebuilt, rebuilt: true, mode: "recovery-rebuild", dirtyCount: 1 };
    }

    return {
      refreshed,
      rebuilt: false,
      mode: refreshed ? "incremental" : "clean",
      dirtyCount: refreshed
    };
  }

  function search(identity, query, options = {}) {
    const collector = requireIdentity(identity);
    const plan = queryPlan(query);
    const limit = integer(options.limit ?? 50, "search_limit", { min: 1, max: 200 });
    const offset = integer(options.offset ?? 0, "search_offset", { min: 0, max: 10_000_000 });
    const sort = typeof options.sort === "string" && SORTS.has(options.sort) ? options.sort : "updated-desc";
    if (!plan.expression && !plan.favoritesOnly) return { ids: [], limit, offset, hasMore: false, searchApplied: false, queryTokens: [] };

    const values = [];
    const clauses = [];
    let from;
    if (plan.expression) {
      synchronize(collector);
      from = "vault_extended_search s JOIN vault_treasures t ON t.account_id = s.account_id AND t.id = s.treasure_id";
      clauses.push("vault_extended_search MATCH ?", "s.account_id = ?");
      values.push(plan.expression, collector.id);
    } else {
      from = "vault_treasures t";
      clauses.push("t.account_id = ?");
      values.push(collector.id);
    }
    if (plan.favoritesOnly) {
      clauses.push("EXISTS (SELECT 1 FROM vault_favorites vf WHERE vf.account_id = t.account_id AND vf.treasure_id = t.id)");
    }
    clauses.push(...filterClauses(options, values));

    const rows = database.prepare(`SELECT t.id AS treasure_id FROM ${from}
      WHERE ${clauses.join(" AND ")} ORDER BY ${orderBy(sort)} LIMIT ? OFFSET ?`).all(...values, limit + 1, offset);
    return {
      ids: rows.slice(0, limit).map((row) => row.treasure_id),
      limit,
      offset,
      hasMore: rows.length > limit,
      searchApplied: true,
      queryTokens: plan.tokens,
      favoriteFilterApplied: plan.favoritesOnly
    };
  }

  function searchTreasureIds(identity, query, { limit = 8 } = {}) {
    return search(identity, query, { limit, offset: 0, sort: "updated-desc" }).ids;
  }

  function close() {
    savedViews.close();
    favorites.close();
    database.close();
  }

  return Object.freeze({
    synchronize,
    search,
    searchTreasureIds,
    favorites,
    savedViews,
    close,
    searchSchemaVersion: SEARCH_SCHEMA_VERSION,
    maximumIncrementalRefresh: MAX_INCREMENTAL_REFRESH
  });
}
