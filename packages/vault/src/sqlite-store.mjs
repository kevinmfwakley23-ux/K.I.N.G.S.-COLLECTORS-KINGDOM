import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_collections (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_collections_owner_name_idx
  ON vault_collections(owner_account_id, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS vault_locations (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  parent_id TEXT REFERENCES vault_locations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_locations_owner_parent_idx
  ON vault_locations(owner_account_id, parent_id, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS vault_treasures (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  collection_id TEXT REFERENCES vault_collections(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES vault_locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  series TEXT,
  variant TEXT,
  condition_label TEXT,
  condition_notes TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  acquisition_date TEXT,
  purchase_price_cents INTEGER CHECK(purchase_price_cents IS NULL OR purchase_price_cents >= 0),
  currency TEXT,
  external_identifiers_json TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  notes TEXT,
  identifier_fingerprint TEXT,
  content_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_idx
  ON vault_treasures(owner_account_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_collection_idx
  ON vault_treasures(owner_account_id, collection_id, archived_at);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_location_idx
  ON vault_treasures(owner_account_id, location_id, archived_at);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_category_idx
  ON vault_treasures(owner_account_id, category COLLATE NOCASE, archived_at);
CREATE INDEX IF NOT EXISTS vault_treasures_identifier_fingerprint_idx
  ON vault_treasures(owner_account_id, identifier_fingerprint, archived_at);
CREATE INDEX IF NOT EXISTS vault_treasures_content_fingerprint_idx
  ON vault_treasures(owner_account_id, content_fingerprint, archived_at);

CREATE TABLE IF NOT EXISTS vault_treasure_media (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('image','document')),
  storage_key TEXT NOT NULL,
  original_name TEXT,
  content_type TEXT,
  size_bytes INTEGER CHECK(size_bytes IS NULL OR size_bytes >= 0),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_media_owner_treasure_idx
  ON vault_treasure_media(owner_account_id, treasure_id, created_at);

CREATE TABLE IF NOT EXISTS vault_events (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_events_owner_treasure_idx
  ON vault_events(owner_account_id, treasure_id, created_at DESC);
`;

function parseJson(value, fallback) {
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

function mapTreasure(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    collectionId: row.collection_id,
    locationId: row.location_id,
    title: row.title,
    category: row.category,
    description: row.description,
    manufacturer: row.manufacturer,
    series: row.series,
    variant: row.variant,
    condition: row.condition_label,
    conditionNotes: row.condition_notes,
    quantity: Number(row.quantity),
    acquisitionDate: row.acquisition_date,
    purchasePriceCents: row.purchase_price_cents === null ? null : Number(row.purchase_price_cents),
    currency: row.currency,
    externalIdentifiers: parseJson(row.external_identifiers_json, {}),
    attributes: parseJson(row.attributes_json, {}),
    notes: row.notes,
    identifierFingerprint: row.identifier_fingerprint,
    contentFingerprint: row.content_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}

function safeLimit(limit, maximum = 500) {
  const value = Number(limit);
  if (!Number.isInteger(value) || value < 1) return 100;
  return Math.min(value, maximum);
}

export class SqliteVaultStore {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec("PRAGMA busy_timeout = 5000;");
    this.database.exec(SCHEMA);
  }

  createCollection(collection) {
    this.database.prepare(`INSERT INTO vault_collections (id,owner_account_id,name,description,created_at,updated_at) VALUES (?,?,?,?,?,?)`).run(
      collection.id,
      collection.ownerAccountId,
      collection.name,
      collection.description ?? null,
      collection.createdAt,
      collection.updatedAt
    );
    return this.findCollectionById(collection.ownerAccountId, collection.id);
  }

  findCollectionById(ownerAccountId, id) {
    return mapCollection(this.database.prepare("SELECT * FROM vault_collections WHERE owner_account_id = ? AND id = ?").get(ownerAccountId, id));
  }

  listCollections(ownerAccountId) {
    return this.database.prepare(`
      SELECT c.*, COUNT(t.id) AS treasure_count, COALESCE(SUM(t.quantity), 0) AS unit_count
      FROM vault_collections c
      LEFT JOIN vault_treasures t
        ON t.collection_id = c.id AND t.owner_account_id = c.owner_account_id AND t.archived_at IS NULL
      WHERE c.owner_account_id = ?
      GROUP BY c.id
      ORDER BY c.name COLLATE NOCASE
    `).all(ownerAccountId).map((row) => ({
      ...mapCollection(row),
      treasureCount: Number(row.treasure_count),
      unitCount: Number(row.unit_count)
    }));
  }

  createLocation(location) {
    this.database.prepare(`INSERT INTO vault_locations (id,owner_account_id,parent_id,name,location_type,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).run(
      location.id,
      location.ownerAccountId,
      location.parentId ?? null,
      location.name,
      location.locationType,
      location.notes ?? null,
      location.createdAt,
      location.updatedAt
    );
    return this.findLocationById(location.ownerAccountId, location.id);
  }

  findLocationById(ownerAccountId, id) {
    return mapLocation(this.database.prepare("SELECT * FROM vault_locations WHERE owner_account_id = ? AND id = ?").get(ownerAccountId, id));
  }

  listLocations(ownerAccountId) {
    return this.database.prepare(`
      SELECT l.*, COUNT(t.id) AS treasure_count, COALESCE(SUM(t.quantity), 0) AS unit_count
      FROM vault_locations l
      LEFT JOIN vault_treasures t
        ON t.location_id = l.id AND t.owner_account_id = l.owner_account_id AND t.archived_at IS NULL
      WHERE l.owner_account_id = ?
      GROUP BY l.id
      ORDER BY l.created_at, l.name COLLATE NOCASE
    `).all(ownerAccountId).map((row) => ({
      ...mapLocation(row),
      treasureCount: Number(row.treasure_count),
      unitCount: Number(row.unit_count)
    }));
  }

  createTreasure(treasure) {
    this.database.prepare(`
      INSERT INTO vault_treasures (
        id,owner_account_id,collection_id,location_id,title,category,description,manufacturer,series,variant,
        condition_label,condition_notes,quantity,acquisition_date,purchase_price_cents,currency,
        external_identifiers_json,attributes_json,notes,identifier_fingerprint,content_fingerprint,
        created_at,updated_at,archived_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
      treasure.identifierFingerprint ?? null,
      treasure.contentFingerprint,
      treasure.createdAt,
      treasure.updatedAt,
      null
    );
    return this.findTreasureById(treasure.ownerAccountId, treasure.id, { includeArchived: true });
  }

  findTreasureById(ownerAccountId, id, { includeArchived = false } = {}) {
    const archivedClause = includeArchived ? "" : " AND archived_at IS NULL";
    return mapTreasure(this.database.prepare(`SELECT * FROM vault_treasures WHERE owner_account_id = ? AND id = ?${archivedClause}`).get(ownerAccountId, id));
  }

  updateTreasure(treasure) {
    const result = this.database.prepare(`
      UPDATE vault_treasures SET
        collection_id = ?, location_id = ?, title = ?, category = ?, description = ?, manufacturer = ?, series = ?, variant = ?,
        condition_label = ?, condition_notes = ?, quantity = ?, acquisition_date = ?, purchase_price_cents = ?, currency = ?,
        external_identifiers_json = ?, attributes_json = ?, notes = ?, identifier_fingerprint = ?, content_fingerprint = ?, updated_at = ?
      WHERE owner_account_id = ? AND id = ? AND archived_at IS NULL
    `).run(
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
      treasure.identifierFingerprint ?? null,
      treasure.contentFingerprint,
      treasure.updatedAt,
      treasure.ownerAccountId,
      treasure.id
    );
    if (Number(result.changes) !== 1) return null;
    return this.findTreasureById(treasure.ownerAccountId, treasure.id);
  }

  archiveTreasure(ownerAccountId, id, archivedAt) {
    const result = this.database.prepare(`UPDATE vault_treasures SET archived_at = ?, updated_at = ? WHERE owner_account_id = ? AND id = ? AND archived_at IS NULL`).run(
      archivedAt,
      archivedAt,
      ownerAccountId,
      id
    );
    return Number(result.changes) === 1;
  }

  listTreasures(ownerAccountId, filters = {}) {
    const where = ["owner_account_id = ?"];
    const values = [ownerAccountId];

    if (!filters.includeArchived) where.push("archived_at IS NULL");
    if (filters.collectionId) {
      where.push("collection_id = ?");
      values.push(filters.collectionId);
    }
    if (filters.locationId) {
      where.push("location_id = ?");
      values.push(filters.locationId);
    }
    if (filters.category) {
      where.push("category = ? COLLATE NOCASE");
      values.push(filters.category);
    }
    if (filters.condition) {
      where.push("condition_label = ? COLLATE NOCASE");
      values.push(filters.condition);
    }
    if (filters.query) {
      const pattern = `%${filters.query}%`;
      where.push(`(
        title LIKE ? COLLATE NOCASE OR manufacturer LIKE ? COLLATE NOCASE OR series LIKE ? COLLATE NOCASE OR
        variant LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE OR notes LIKE ? COLLATE NOCASE OR
        external_identifiers_json LIKE ? COLLATE NOCASE OR attributes_json LIKE ? COLLATE NOCASE
      )`);
      values.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const sortColumns = {
      title: "title COLLATE NOCASE",
      category: "category COLLATE NOCASE",
      createdAt: "created_at",
      updatedAt: "updated_at",
      acquisitionDate: "acquisition_date",
      purchasePrice: "purchase_price_cents"
    };
    const sort = sortColumns[filters.sort] ?? sortColumns.updatedAt;
    const order = filters.order === "asc" ? "ASC" : "DESC";
    const limit = safeLimit(filters.limit);

    return this.database.prepare(`SELECT * FROM vault_treasures WHERE ${where.join(" AND ")} ORDER BY ${sort} ${order}, id ASC LIMIT ?`).all(...values, limit).map(mapTreasure);
  }

  findDuplicateCandidates(ownerAccountId, { excludeId, identifierFingerprint, contentFingerprint, limit = 20 }) {
    const where = ["owner_account_id = ?", "archived_at IS NULL", "id <> ?"];
    const values = [ownerAccountId, excludeId ?? ""];
    const signals = [];

    if (identifierFingerprint) {
      signals.push("identifier_fingerprint = ?");
      values.push(identifierFingerprint);
    }
    if (contentFingerprint) {
      signals.push("content_fingerprint = ?");
      values.push(contentFingerprint);
    }
    if (!signals.length) return [];

    where.push(`(${signals.join(" OR ")})`);
    return this.database.prepare(`SELECT * FROM vault_treasures WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`).all(...values, safeLimit(limit, 50)).map(mapTreasure);
  }

  writeEvent(event) {
    this.database.prepare(`INSERT INTO vault_events (id,owner_account_id,treasure_id,event_type,metadata_json,created_at) VALUES (?,?,?,?,?,?)`).run(
      event.id,
      event.ownerAccountId,
      event.treasureId ?? null,
      event.eventType,
      JSON.stringify(event.metadata ?? {}),
      event.createdAt
    );
  }

  listTreasureEvents(ownerAccountId, treasureId, { limit = 50 } = {}) {
    return this.database.prepare(`SELECT event_type, metadata_json, created_at FROM vault_events WHERE owner_account_id = ? AND treasure_id = ? ORDER BY created_at DESC LIMIT ?`).all(
      ownerAccountId,
      treasureId,
      safeLimit(limit, 200)
    ).map((row) => ({
      eventType: row.event_type,
      metadata: parseJson(row.metadata_json, {}),
      createdAt: row.created_at
    }));
  }

  stats(ownerAccountId) {
    const totals = this.database.prepare(`
      SELECT COUNT(*) AS treasure_count, COALESCE(SUM(quantity), 0) AS unit_count,
             COALESCE(SUM(CASE WHEN purchase_price_cents IS NOT NULL THEN purchase_price_cents * quantity ELSE 0 END), 0) AS purchase_total_cents,
             SUM(CASE WHEN purchase_price_cents IS NOT NULL THEN 1 ELSE 0 END) AS priced_treasure_count
      FROM vault_treasures
      WHERE owner_account_id = ? AND archived_at IS NULL
    `).get(ownerAccountId);
    const categories = this.database.prepare(`
      SELECT category, COUNT(*) AS treasure_count, COALESCE(SUM(quantity), 0) AS unit_count
      FROM vault_treasures
      WHERE owner_account_id = ? AND archived_at IS NULL
      GROUP BY category
      ORDER BY treasure_count DESC, category COLLATE NOCASE
    `).all(ownerAccountId).map((row) => ({
      category: row.category,
      treasureCount: Number(row.treasure_count),
      unitCount: Number(row.unit_count)
    }));

    return {
      treasureCount: Number(totals.treasure_count),
      unitCount: Number(totals.unit_count),
      purchaseTotalCents: Number(totals.purchase_total_cents),
      pricedTreasureCount: Number(totals.priced_treasure_count),
      categories
    };
  }

  exportAll(ownerAccountId) {
    return {
      collections: this.listCollections(ownerAccountId),
      locations: this.listLocations(ownerAccountId),
      treasures: this.listTreasures(ownerAccountId, { includeArchived: true, sort: "createdAt", order: "asc", limit: 100000 })
    };
  }

  close() {
    this.database.close();
  }
}
