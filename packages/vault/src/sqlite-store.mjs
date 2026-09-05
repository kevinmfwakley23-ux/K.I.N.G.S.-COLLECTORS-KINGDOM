import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_folders (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  parent_id TEXT REFERENCES vault_folders(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(account_id, parent_id, name)
);
CREATE INDEX IF NOT EXISTS vault_folders_account_idx ON vault_folders(account_id, parent_id, name);

CREATE TABLE IF NOT EXISTS vault_locations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  parent_id TEXT REFERENCES vault_locations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(account_id, parent_id, name)
);
CREATE INDEX IF NOT EXISTS vault_locations_account_idx ON vault_locations(account_id, parent_id, name);

CREATE TABLE IF NOT EXISTS vault_treasures (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  folder_id TEXT REFERENCES vault_folders(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES vault_locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  series TEXT,
  manufacturer TEXT,
  year INTEGER,
  condition TEXT,
  quantity INTEGER NOT NULL CHECK(quantity >= 1),
  purchase_price_cents INTEGER CHECK(purchase_price_cents IS NULL OR purchase_price_cents >= 0),
  purchase_currency TEXT,
  purchase_date TEXT,
  estimated_value_cents INTEGER CHECK(estimated_value_cents IS NULL OR estimated_value_cents >= 0),
  estimated_value_currency TEXT,
  valuation_source TEXT,
  valuation_as_of TEXT,
  notes TEXT,
  duplicate_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_treasures_account_created_idx ON vault_treasures(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_treasures_account_title_idx ON vault_treasures(account_id, title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS vault_treasures_account_category_idx ON vault_treasures(account_id, category COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS vault_treasures_account_folder_idx ON vault_treasures(account_id, folder_id);
CREATE INDEX IF NOT EXISTS vault_treasures_account_location_idx ON vault_treasures(account_id, location_id);
CREATE INDEX IF NOT EXISTS vault_treasures_duplicate_idx ON vault_treasures(account_id, duplicate_key);

CREATE TABLE IF NOT EXISTS vault_tags (
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY(treasure_id, tag)
);
CREATE INDEX IF NOT EXISTS vault_tags_tag_idx ON vault_tags(tag, treasure_id);

CREATE TABLE IF NOT EXISTS vault_media (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  original_name TEXT,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size >= 0),
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_media_treasure_idx ON vault_media(account_id, treasure_id, created_at);

CREATE TABLE IF NOT EXISTS vault_audit (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  treasure_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_audit_treasure_idx ON vault_audit(account_id, treasure_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_audit_account_idx ON vault_audit(account_id, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS vault_treasure_fts USING fts5(
  treasure_id UNINDEXED,
  account_id UNINDEXED,
  title,
  category,
  series,
  manufacturer,
  notes,
  tags,
  tokenize='unicode61 remove_diacritics 2'
);
`;

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(value ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function mapFolder(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    parentId: row.parent_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLocation(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    parentId: row.parent_id,
    name: row.name,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTreasure(row, tags = []) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    folderId: row.folder_id,
    locationId: row.location_id,
    title: row.title,
    category: row.category,
    series: row.series,
    manufacturer: row.manufacturer,
    year: row.year,
    condition: row.condition,
    quantity: row.quantity,
    purchasePriceCents: row.purchase_price_cents,
    purchaseCurrency: row.purchase_currency,
    purchaseDate: row.purchase_date,
    estimatedValueCents: row.estimated_value_cents,
    estimatedValueCurrency: row.estimated_value_currency,
    valuationSource: row.valuation_source,
    valuationAsOf: row.valuation_as_of,
    notes: row.notes,
    duplicateKey: row.duplicate_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags
  };
}

function mapMedia(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    treasureId: row.treasure_id,
    originalName: row.original_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    storagePath: row.storage_path,
    createdAt: row.created_at
  };
}

export class SqliteVaultStore {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec("PRAGMA busy_timeout = 5000;");
    this.database.exec(SCHEMA);
  }

  transaction(callback) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const result = callback();
      this.database.exec("COMMIT;");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  createFolder(folder) {
    this.database.prepare(`INSERT INTO vault_folders (id,account_id,parent_id,name,created_at,updated_at) VALUES (?,?,?,?,?,?)`).run(
      folder.id, folder.accountId, folder.parentId, folder.name, folder.createdAt, folder.updatedAt
    );
    return this.getFolder(folder.accountId, folder.id);
  }

  getFolder(accountId, id) {
    return mapFolder(this.database.prepare("SELECT * FROM vault_folders WHERE account_id = ? AND id = ?").get(accountId, id));
  }

  listFolders(accountId) {
    return this.database.prepare("SELECT * FROM vault_folders WHERE account_id = ? ORDER BY name COLLATE NOCASE, created_at").all(accountId).map(mapFolder);
  }

  deleteFolder(accountId, id) {
    const result = this.database.prepare("DELETE FROM vault_folders WHERE account_id = ? AND id = ?").run(accountId, id);
    return Number(result.changes) === 1;
  }

  countFolderChildren(accountId, id) {
    const row = this.database.prepare(`SELECT
      (SELECT COUNT(*) FROM vault_folders WHERE account_id = ? AND parent_id = ?) AS folders,
      (SELECT COUNT(*) FROM vault_treasures WHERE account_id = ? AND folder_id = ?) AS treasures`).get(accountId, id, accountId, id);
    return { folders: Number(row?.folders ?? 0), treasures: Number(row?.treasures ?? 0) };
  }

  createLocation(location) {
    this.database.prepare(`INSERT INTO vault_locations (id,account_id,parent_id,name,kind,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`).run(
      location.id, location.accountId, location.parentId, location.name, location.kind, location.createdAt, location.updatedAt
    );
    return this.getLocation(location.accountId, location.id);
  }

  getLocation(accountId, id) {
    return mapLocation(this.database.prepare("SELECT * FROM vault_locations WHERE account_id = ? AND id = ?").get(accountId, id));
  }

  listLocations(accountId) {
    return this.database.prepare("SELECT * FROM vault_locations WHERE account_id = ? ORDER BY name COLLATE NOCASE, created_at").all(accountId).map(mapLocation);
  }

  deleteLocation(accountId, id) {
    const result = this.database.prepare("DELETE FROM vault_locations WHERE account_id = ? AND id = ?").run(accountId, id);
    return Number(result.changes) === 1;
  }

  countLocationChildren(accountId, id) {
    const row = this.database.prepare(`SELECT
      (SELECT COUNT(*) FROM vault_locations WHERE account_id = ? AND parent_id = ?) AS locations,
      (SELECT COUNT(*) FROM vault_treasures WHERE account_id = ? AND location_id = ?) AS treasures`).get(accountId, id, accountId, id);
    return { locations: Number(row?.locations ?? 0), treasures: Number(row?.treasures ?? 0) };
  }

  replaceTags(treasureId, tags) {
    this.database.prepare("DELETE FROM vault_tags WHERE treasure_id = ?").run(treasureId);
    const insert = this.database.prepare("INSERT INTO vault_tags (treasure_id, tag) VALUES (?, ?)");
    for (const tag of tags) insert.run(treasureId, tag);
  }

  getTags(treasureId) {
    return this.database.prepare("SELECT tag FROM vault_tags WHERE treasure_id = ? ORDER BY tag COLLATE NOCASE").all(treasureId).map((row) => row.tag);
  }

  reindexTreasure(treasure) {
    this.database.prepare("DELETE FROM vault_treasure_fts WHERE treasure_id = ?").run(treasure.id);
    this.database.prepare(`INSERT INTO vault_treasure_fts (treasure_id,account_id,title,category,series,manufacturer,notes,tags) VALUES (?,?,?,?,?,?,?,?)`).run(
      treasure.id,
      treasure.accountId,
      treasure.title,
      treasure.category,
      treasure.series ?? "",
      treasure.manufacturer ?? "",
      treasure.notes ?? "",
      treasure.tags.join(" ")
    );
  }

  createTreasure(treasure) {
    return this.transaction(() => {
      this.database.prepare(`INSERT INTO vault_treasures (
        id,account_id,folder_id,location_id,title,category,series,manufacturer,year,condition,quantity,
        purchase_price_cents,purchase_currency,purchase_date,estimated_value_cents,estimated_value_currency,
        valuation_source,valuation_as_of,notes,duplicate_key,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        treasure.id, treasure.accountId, treasure.folderId, treasure.locationId, treasure.title, treasure.category,
        treasure.series, treasure.manufacturer, treasure.year, treasure.condition, treasure.quantity,
        treasure.purchasePriceCents, treasure.purchaseCurrency, treasure.purchaseDate, treasure.estimatedValueCents,
        treasure.estimatedValueCurrency, treasure.valuationSource, treasure.valuationAsOf, treasure.notes,
        treasure.duplicateKey, treasure.createdAt, treasure.updatedAt
      );
      this.replaceTags(treasure.id, treasure.tags);
      this.reindexTreasure(treasure);
      return this.getTreasure(treasure.accountId, treasure.id);
    });
  }

  getTreasure(accountId, id) {
    const row = this.database.prepare("SELECT * FROM vault_treasures WHERE account_id = ? AND id = ?").get(accountId, id);
    return row ? mapTreasure(row, this.getTags(id)) : null;
  }

  updateTreasure(treasure) {
    return this.transaction(() => {
      const result = this.database.prepare(`UPDATE vault_treasures SET
        folder_id=?,location_id=?,title=?,category=?,series=?,manufacturer=?,year=?,condition=?,quantity=?,
        purchase_price_cents=?,purchase_currency=?,purchase_date=?,estimated_value_cents=?,estimated_value_currency=?,
        valuation_source=?,valuation_as_of=?,notes=?,duplicate_key=?,updated_at=?
        WHERE account_id=? AND id=?`).run(
        treasure.folderId, treasure.locationId, treasure.title, treasure.category, treasure.series, treasure.manufacturer,
        treasure.year, treasure.condition, treasure.quantity, treasure.purchasePriceCents, treasure.purchaseCurrency,
        treasure.purchaseDate, treasure.estimatedValueCents, treasure.estimatedValueCurrency, treasure.valuationSource,
        treasure.valuationAsOf, treasure.notes, treasure.duplicateKey, treasure.updatedAt, treasure.accountId, treasure.id
      );
      if (Number(result.changes) !== 1) return null;
      this.replaceTags(treasure.id, treasure.tags);
      this.reindexTreasure(treasure);
      return this.getTreasure(treasure.accountId, treasure.id);
    });
  }

  deleteTreasure(accountId, id) {
    return this.transaction(() => {
      this.database.prepare("DELETE FROM vault_treasure_fts WHERE treasure_id = ? AND account_id = ?").run(id, accountId);
      const result = this.database.prepare("DELETE FROM vault_treasures WHERE account_id = ? AND id = ?").run(accountId, id);
      return Number(result.changes) === 1;
    });
  }

  listTreasureIdsByFts(accountId, ftsQuery, limit, offset) {
    return this.database.prepare(`SELECT treasure_id FROM vault_treasure_fts
      WHERE vault_treasure_fts MATCH ? AND account_id = ? LIMIT ? OFFSET ?`).all(ftsQuery, accountId, limit, offset).map((row) => row.treasure_id);
  }

  listTreasures(accountId, { category, folderId, locationId, tag, sort = "updated-desc", limit = 100, offset = 0, ids = null } = {}) {
    const clauses = ["t.account_id = ?"];
    const values = [accountId];
    if (category) { clauses.push("t.category = ? COLLATE NOCASE"); values.push(category); }
    if (folderId) { clauses.push("t.folder_id = ?"); values.push(folderId); }
    if (locationId) { clauses.push("t.location_id = ?"); values.push(locationId); }
    if (tag) { clauses.push("EXISTS (SELECT 1 FROM vault_tags tg WHERE tg.treasure_id = t.id AND tg.tag = ? COLLATE NOCASE)"); values.push(tag); }
    if (Array.isArray(ids)) {
      if (ids.length === 0) return [];
      clauses.push(`t.id IN (${ids.map(() => "?").join(",")})`);
      values.push(...ids);
    }

    const orderBy = {
      "updated-desc": "t.updated_at DESC",
      "updated-asc": "t.updated_at ASC",
      "created-desc": "t.created_at DESC",
      "title-asc": "t.title COLLATE NOCASE ASC",
      "title-desc": "t.title COLLATE NOCASE DESC",
      "value-desc": "COALESCE(t.estimated_value_cents, -1) DESC, t.title COLLATE NOCASE ASC",
      "year-desc": "COALESCE(t.year, -1) DESC, t.title COLLATE NOCASE ASC"
    }[sort] ?? "t.updated_at DESC";

    const rows = this.database.prepare(`SELECT t.* FROM vault_treasures t WHERE ${clauses.join(" AND ")} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...values, limit, offset);
    return rows.map((row) => mapTreasure(row, this.getTags(row.id)));
  }

  countTreasures(accountId, filters = {}) {
    const clauses = ["t.account_id = ?"];
    const values = [accountId];
    if (filters.category) { clauses.push("t.category = ? COLLATE NOCASE"); values.push(filters.category); }
    if (filters.folderId) { clauses.push("t.folder_id = ?"); values.push(filters.folderId); }
    if (filters.locationId) { clauses.push("t.location_id = ?"); values.push(filters.locationId); }
    if (filters.tag) { clauses.push("EXISTS (SELECT 1 FROM vault_tags tg WHERE tg.treasure_id = t.id AND tg.tag = ? COLLATE NOCASE)"); values.push(filters.tag); }
    return Number(this.database.prepare(`SELECT COUNT(*) AS count FROM vault_treasures t WHERE ${clauses.join(" AND ")}`).get(...values)?.count ?? 0);
  }

  getStats(accountId) {
    const summary = this.database.prepare(`SELECT
      COUNT(*) AS treasure_count,
      COALESCE(SUM(quantity), 0) AS unit_count,
      COALESCE(SUM(CASE WHEN estimated_value_currency = 'USD' THEN estimated_value_cents * quantity ELSE 0 END), 0) AS usd_value_cents,
      COUNT(DISTINCT category) AS category_count
      FROM vault_treasures WHERE account_id = ?`).get(accountId);
    const categories = this.database.prepare(`SELECT category, COUNT(*) AS count, COALESCE(SUM(quantity),0) AS units
      FROM vault_treasures WHERE account_id = ? GROUP BY category ORDER BY count DESC, category COLLATE NOCASE`).all(accountId);
    const duplicateGroups = Number(this.database.prepare(`SELECT COUNT(*) AS count FROM (
      SELECT duplicate_key FROM vault_treasures WHERE account_id = ? GROUP BY duplicate_key HAVING COUNT(*) > 1
    )`).get(accountId)?.count ?? 0);
    return {
      treasureCount: Number(summary?.treasure_count ?? 0),
      unitCount: Number(summary?.unit_count ?? 0),
      usdEstimatedValueCents: Number(summary?.usd_value_cents ?? 0),
      categoryCount: Number(summary?.category_count ?? 0),
      duplicateGroups,
      categories: categories.map((row) => ({ category: row.category, count: Number(row.count), units: Number(row.units) }))
    };
  }

  listDuplicateGroups(accountId) {
    const keys = this.database.prepare(`SELECT duplicate_key, COUNT(*) AS count FROM vault_treasures
      WHERE account_id = ? GROUP BY duplicate_key HAVING COUNT(*) > 1 ORDER BY count DESC, duplicate_key`).all(accountId);
    return keys.map((row) => ({
      duplicateKey: row.duplicate_key,
      count: Number(row.count),
      treasures: this.database.prepare("SELECT * FROM vault_treasures WHERE account_id = ? AND duplicate_key = ? ORDER BY created_at").all(accountId, row.duplicate_key).map((treasure) => mapTreasure(treasure, this.getTags(treasure.id)))
    }));
  }

  createMedia(media) {
    this.database.prepare(`INSERT INTO vault_media (id,account_id,treasure_id,original_name,content_type,byte_size,sha256,storage_path,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
        media.id, media.accountId, media.treasureId, media.originalName, media.contentType, media.byteSize, media.sha256, media.storagePath, media.createdAt
      );
    return this.getMedia(media.accountId, media.id);
  }

  getMedia(accountId, id) {
    return mapMedia(this.database.prepare("SELECT * FROM vault_media WHERE account_id = ? AND id = ?").get(accountId, id));
  }

  listMedia(accountId, treasureId) {
    return this.database.prepare("SELECT * FROM vault_media WHERE account_id = ? AND treasure_id = ? ORDER BY created_at").all(accountId, treasureId).map(mapMedia);
  }

  listMediaForTreasure(accountId, treasureId) {
    return this.listMedia(accountId, treasureId);
  }

  writeAudit(event) {
    this.database.prepare(`INSERT INTO vault_audit (id,account_id,treasure_id,event_type,metadata_json,created_at) VALUES (?,?,?,?,?,?)`).run(
      event.id, event.accountId, event.treasureId ?? null, event.eventType, JSON.stringify(event.metadata ?? {}), event.createdAt
    );
  }

  listAudit(accountId, treasureId, limit = 50) {
    return this.database.prepare(`SELECT event_type,metadata_json,created_at FROM vault_audit
      WHERE account_id = ? AND treasure_id = ? ORDER BY created_at DESC LIMIT ?`).all(accountId, treasureId, limit).map((row) => ({
      eventType: row.event_type,
      metadata: parseJson(row.metadata_json, {}),
      createdAt: row.created_at
    }));
  }

  close() {
    this.database.close();
  }
}
