import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_SETS = 500;
const MAX_ENTRIES_PER_SET = 10_000;
const MAX_EXPECTED_QUANTITY = 1_000_000;

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_collection_sets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  series TEXT,
  source_type TEXT NOT NULL CHECK(source_type IN ('collector-defined','catalog-import')),
  source_label TEXT,
  source_reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_collection_sets_account_name_idx
  ON vault_collection_sets(account_id, name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS vault_collection_sets_account_updated_idx
  ON vault_collection_sets(account_id, updated_at DESC, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS vault_set_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  set_id TEXT NOT NULL REFERENCES vault_collection_sets(id) ON DELETE CASCADE,
  entry_key TEXT NOT NULL,
  label TEXT NOT NULL,
  expected_quantity INTEGER NOT NULL CHECK(expected_quantity >= 1),
  sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_set_entries_set_key_idx
  ON vault_set_entries(set_id, entry_key COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS vault_set_entries_account_sort_idx
  ON vault_set_entries(account_id, set_id, sort_order, label COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS vault_set_links (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  set_id TEXT NOT NULL REFERENCES vault_collection_sets(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES vault_set_entries(id) ON DELETE CASCADE,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK(quantity >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_set_links_entry_treasure_idx
  ON vault_set_links(entry_id, treasure_id);
CREATE UNIQUE INDEX IF NOT EXISTS vault_set_links_set_treasure_idx
  ON vault_set_links(set_id, treasure_id);
CREATE INDEX IF NOT EXISTS vault_set_links_account_entry_idx
  ON vault_set_links(account_id, set_id, entry_id);
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function text(value, field, max, { required = false } = {}) {
  if (value === undefined) {
    if (required) throw new VaultError(`invalid_${field}`, `${field} is required.`);
    return null;
  }
  if (value === null || value === "") {
    if (required) throw new VaultError(`invalid_${field}`, `${field} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${field}`, `${field} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean && required) throw new VaultError(`invalid_${field}`, `${field} is required.`);
  if (!clean) return null;
  if (clean.length > max) throw new VaultError(`invalid_${field}`, `${field} must contain at most ${max} characters.`);
  return clean;
}

function positiveInteger(value, field, max = MAX_EXPECTED_QUANTITY) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new VaultError(`invalid_${field}`, `${field} must be an integer between 1 and ${max}.`);
  }
  return value;
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000_000) {
    throw new VaultError(`invalid_${field}`, `${field} must be a non-negative integer.`);
  }
  return value;
}

function mapSet(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    series: row.series,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    sourceReference: row.source_reference,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createVaultSetService({ filename, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault collection-set database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function audit(accountId, eventType, metadata, treasureId = null) {
    database.prepare(`INSERT INTO vault_audit (id, account_id, treasure_id, event_type, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), accountId, treasureId, eventType, JSON.stringify(metadata), now().toISOString()
    );
  }

  function requireSet(accountId, setId) {
    const row = database.prepare("SELECT * FROM vault_collection_sets WHERE account_id = ? AND id = ?")
      .get(accountId, String(setId));
    if (!row) throw new VaultError("collection_set_not_found", "That collection set was not found in your Vault.", 404);
    return row;
  }

  function requireEntry(accountId, setId, entryId) {
    requireSet(accountId, setId);
    const row = database.prepare("SELECT * FROM vault_set_entries WHERE account_id = ? AND set_id = ? AND id = ?")
      .get(accountId, String(setId), String(entryId));
    if (!row) throw new VaultError("set_entry_not_found", "That expected set entry was not found.", 404);
    return row;
  }

  function requireTreasure(accountId, treasureId) {
    const row = database.prepare("SELECT id, title, quantity FROM vault_treasures WHERE account_id = ? AND id = ?")
      .get(accountId, String(treasureId));
    if (!row) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return row;
  }

  function entryRows(accountId, setId) {
    const rows = database.prepare(`SELECT e.*,
      COALESCE((
        SELECT SUM(CASE WHEN l.quantity < t.quantity THEN l.quantity ELSE t.quantity END)
        FROM vault_set_links l
        JOIN vault_treasures t ON t.account_id = l.account_id AND t.id = l.treasure_id
        WHERE l.account_id = e.account_id AND l.entry_id = e.id
      ), 0) AS owned_quantity
      FROM vault_set_entries e
      WHERE e.account_id = ? AND e.set_id = ?
      ORDER BY e.sort_order ASC, e.label COLLATE NOCASE ASC, e.entry_key COLLATE NOCASE ASC`)
      .all(accountId, String(setId));

    const links = database.prepare(`SELECT l.id, l.treasure_id, l.quantity, l.created_at, l.updated_at,
      t.title AS treasure_title, t.quantity AS treasure_quantity
      FROM vault_set_links l
      JOIN vault_treasures t ON t.account_id = l.account_id AND t.id = l.treasure_id
      WHERE l.account_id = ? AND l.entry_id = ?
      ORDER BY t.title COLLATE NOCASE ASC, l.created_at ASC`);

    return rows.map((row) => {
      const expectedQuantity = Number(row.expected_quantity);
      const ownedQuantity = Number(row.owned_quantity ?? 0);
      return Object.freeze({
        id: row.id,
        setId: row.set_id,
        entryKey: row.entry_key,
        label: row.label,
        expectedQuantity,
        ownedQuantity,
        missingQuantity: Math.max(expectedQuantity - ownedQuantity, 0),
        complete: ownedQuantity >= expectedQuantity,
        sortOrder: Number(row.sort_order),
        notes: row.notes,
        links: links.all(accountId, row.id).map((link) => ({
          id: link.id,
          treasureId: link.treasure_id,
          treasureTitle: link.treasure_title,
          linkedQuantity: Number(link.quantity),
          currentTreasureQuantity: Number(link.treasure_quantity),
          creditedQuantity: Math.min(Number(link.quantity), Number(link.treasure_quantity)),
          createdAt: link.created_at,
          updatedAt: link.updated_at
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    });
  }

  function summary(set, entries) {
    const expectedEntryCount = entries.length;
    const completeEntryCount = entries.filter((entry) => entry.complete).length;
    const expectedUnitCount = entries.reduce((sum, entry) => sum + entry.expectedQuantity, 0);
    const creditedOwnedUnitCount = entries.reduce((sum, entry) => sum + Math.min(entry.ownedQuantity, entry.expectedQuantity), 0);
    const missingUnitCount = entries.reduce((sum, entry) => sum + entry.missingQuantity, 0);
    return Object.freeze({
      ...set,
      expectedEntryCount,
      completeEntryCount,
      missingEntryCount: expectedEntryCount - completeEntryCount,
      expectedUnitCount,
      creditedOwnedUnitCount,
      missingUnitCount,
      completionPercent: expectedUnitCount ? Math.round((creditedOwnedUnitCount / expectedUnitCount) * 10_000) / 100 : 0,
      complete: expectedEntryCount > 0 && missingUnitCount === 0
    });
  }

  function get(identity, setId) {
    const collector = requireIdentity(identity);
    const set = mapSet(requireSet(collector.id, setId));
    const entries = entryRows(collector.id, set.id);
    return Object.freeze({ ...summary(set, entries), entries });
  }

  function list(identity) {
    const collector = requireIdentity(identity);
    return database.prepare("SELECT * FROM vault_collection_sets WHERE account_id = ? ORDER BY updated_at DESC, name COLLATE NOCASE")
      .all(collector.id)
      .map((row) => {
        const set = mapSet(row);
        return summary(set, entryRows(collector.id, set.id));
      });
  }

  function create(identity, input = {}) {
    const collector = requireIdentity(identity);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_collection_set", "Collection-set data must be an object.");
    const count = Number(database.prepare("SELECT COUNT(*) AS count FROM vault_collection_sets WHERE account_id = ?").get(collector.id)?.count ?? 0);
    if (count >= MAX_SETS) throw new VaultError("collection_set_limit", `A collector may keep at most ${MAX_SETS} collection sets.`, 409);

    const name = text(input.name, "collection_set_name", 120, { required: true });
    const category = text(input.category, "collection_set_category", 120);
    const series = text(input.series, "collection_set_series", 180);
    const sourceType = input.sourceType === undefined ? "collector-defined" : String(input.sourceType).trim();
    if (!new Set(["collector-defined", "catalog-import"]).has(sourceType)) {
      throw new VaultError("invalid_collection_set_source", "Collection-set source type is not supported.");
    }
    const sourceLabel = text(input.sourceLabel, "collection_set_source_label", 180);
    const sourceReference = text(input.sourceReference, "collection_set_source_reference", 500);
    const notes = text(input.notes, "collection_set_notes", 4000);
    if (database.prepare("SELECT id FROM vault_collection_sets WHERE account_id = ? AND name = ? COLLATE NOCASE").get(collector.id, name)) {
      throw new VaultError("collection_set_name_exists", "A collection set with that name already exists.", 409);
    }

    const id = randomUUID();
    const timestamp = now().toISOString();
    database.prepare(`INSERT INTO vault_collection_sets (
      id, account_id, name, category, series, source_type, source_label, source_reference, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, collector.id, name, category, series, sourceType, sourceLabel, sourceReference, notes, timestamp, timestamp
    );
    audit(collector.id, "vault.collection_set_created", { setId: id, name, sourceType });
    return get(collector, id);
  }

  function update(identity, setId, input = {}) {
    const collector = requireIdentity(identity);
    const current = mapSet(requireSet(collector.id, setId));
    const next = {
      name: input.name === undefined ? current.name : text(input.name, "collection_set_name", 120, { required: true }),
      category: input.category === undefined ? current.category : text(input.category, "collection_set_category", 120),
      series: input.series === undefined ? current.series : text(input.series, "collection_set_series", 180),
      sourceLabel: input.sourceLabel === undefined ? current.sourceLabel : text(input.sourceLabel, "collection_set_source_label", 180),
      sourceReference: input.sourceReference === undefined ? current.sourceReference : text(input.sourceReference, "collection_set_source_reference", 500),
      notes: input.notes === undefined ? current.notes : text(input.notes, "collection_set_notes", 4000)
    };
    if (input.sourceType !== undefined && String(input.sourceType) !== current.sourceType) {
      throw new VaultError("collection_set_source_immutable", "Collection-set source type cannot be changed by editing the set.", 409);
    }
    if (database.prepare("SELECT id FROM vault_collection_sets WHERE account_id = ? AND name = ? COLLATE NOCASE AND id <> ?")
      .get(collector.id, next.name, current.id)) {
      throw new VaultError("collection_set_name_exists", "A collection set with that name already exists.", 409);
    }
    const timestamp = now().toISOString();
    database.prepare(`UPDATE vault_collection_sets SET name=?, category=?, series=?, source_label=?, source_reference=?, notes=?, updated_at=?
      WHERE account_id=? AND id=?`).run(
      next.name, next.category, next.series, next.sourceLabel, next.sourceReference, next.notes, timestamp, collector.id, current.id
    );
    audit(collector.id, "vault.collection_set_updated", { setId: current.id, name: next.name });
    return get(collector, current.id);
  }

  function remove(identity, setId) {
    const collector = requireIdentity(identity);
    const current = mapSet(requireSet(collector.id, setId));
    database.prepare("DELETE FROM vault_collection_sets WHERE account_id = ? AND id = ?").run(collector.id, current.id);
    audit(collector.id, "vault.collection_set_removed", { setId: current.id, name: current.name });
    return Object.freeze({ deleted: true, id: current.id });
  }

  function addEntry(identity, setId, input = {}) {
    const collector = requireIdentity(identity);
    const set = mapSet(requireSet(collector.id, setId));
    const count = Number(database.prepare("SELECT COUNT(*) AS count FROM vault_set_entries WHERE account_id = ? AND set_id = ?")
      .get(collector.id, set.id)?.count ?? 0);
    if (count >= MAX_ENTRIES_PER_SET) throw new VaultError("set_entry_limit", `A collection set may contain at most ${MAX_ENTRIES_PER_SET} expected entries.`, 409);

    const entryKey = text(input.entryKey, "set_entry_key", 120, { required: true });
    const label = text(input.label, "set_entry_label", 180, { required: true });
    const expectedQuantity = input.expectedQuantity === undefined ? 1 : positiveInteger(input.expectedQuantity, "expected_quantity");
    const maxSort = Number(database.prepare("SELECT MAX(sort_order) AS value FROM vault_set_entries WHERE account_id = ? AND set_id = ?")
      .get(collector.id, set.id)?.value ?? -1);
    const sortOrder = input.sortOrder === undefined ? maxSort + 1 : nonNegativeInteger(input.sortOrder, "sort_order");
    const notes = text(input.notes, "set_entry_notes", 2000);
    if (database.prepare("SELECT id FROM vault_set_entries WHERE set_id = ? AND entry_key = ? COLLATE NOCASE").get(set.id, entryKey)) {
      throw new VaultError("set_entry_key_exists", "That expected entry key already exists in this collection set.", 409);
    }

    const id = randomUUID();
    const timestamp = now().toISOString();
    database.prepare(`INSERT INTO vault_set_entries (
      id, account_id, set_id, entry_key, label, expected_quantity, sort_order, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, collector.id, set.id, entryKey, label, expectedQuantity, sortOrder, notes, timestamp, timestamp
    );
    database.prepare("UPDATE vault_collection_sets SET updated_at = ? WHERE account_id = ? AND id = ?").run(timestamp, collector.id, set.id);
    audit(collector.id, "vault.set_entry_added", { setId: set.id, entryId: id, entryKey, expectedQuantity });
    return get(collector, set.id).entries.find((entry) => entry.id === id);
  }

  function updateEntry(identity, setId, entryId, input = {}) {
    const collector = requireIdentity(identity);
    const current = requireEntry(collector.id, setId, entryId);
    const next = {
      entryKey: input.entryKey === undefined ? current.entry_key : text(input.entryKey, "set_entry_key", 120, { required: true }),
      label: input.label === undefined ? current.label : text(input.label, "set_entry_label", 180, { required: true }),
      expectedQuantity: input.expectedQuantity === undefined ? Number(current.expected_quantity) : positiveInteger(input.expectedQuantity, "expected_quantity"),
      sortOrder: input.sortOrder === undefined ? Number(current.sort_order) : nonNegativeInteger(input.sortOrder, "sort_order"),
      notes: input.notes === undefined ? current.notes : text(input.notes, "set_entry_notes", 2000)
    };
    if (database.prepare("SELECT id FROM vault_set_entries WHERE set_id = ? AND entry_key = ? COLLATE NOCASE AND id <> ?")
      .get(String(setId), next.entryKey, current.id)) {
      throw new VaultError("set_entry_key_exists", "That expected entry key already exists in this collection set.", 409);
    }
    const timestamp = now().toISOString();
    database.prepare(`UPDATE vault_set_entries SET entry_key=?, label=?, expected_quantity=?, sort_order=?, notes=?, updated_at=?
      WHERE account_id=? AND set_id=? AND id=?`).run(
      next.entryKey, next.label, next.expectedQuantity, next.sortOrder, next.notes, timestamp, collector.id, String(setId), current.id
    );
    database.prepare("UPDATE vault_collection_sets SET updated_at = ? WHERE account_id = ? AND id = ?")
      .run(timestamp, collector.id, String(setId));
    audit(collector.id, "vault.set_entry_updated", { setId: String(setId), entryId: current.id, entryKey: next.entryKey, expectedQuantity: next.expectedQuantity });
    return get(collector, setId).entries.find((entry) => entry.id === current.id);
  }

  function removeEntry(identity, setId, entryId) {
    const collector = requireIdentity(identity);
    const current = requireEntry(collector.id, setId, entryId);
    const timestamp = now().toISOString();
    database.prepare("DELETE FROM vault_set_entries WHERE account_id = ? AND set_id = ? AND id = ?")
      .run(collector.id, String(setId), current.id);
    database.prepare("UPDATE vault_collection_sets SET updated_at = ? WHERE account_id = ? AND id = ?")
      .run(timestamp, collector.id, String(setId));
    audit(collector.id, "vault.set_entry_removed", { setId: String(setId), entryId: current.id, entryKey: current.entry_key });
    return Object.freeze({ deleted: true, id: current.id });
  }

  function linkTreasure(identity, setId, entryId, treasureId, input = {}) {
    const collector = requireIdentity(identity);
    const set = mapSet(requireSet(collector.id, setId));
    const entry = requireEntry(collector.id, set.id, entryId);
    const treasure = requireTreasure(collector.id, treasureId);
    const quantity = input.quantity === undefined ? 1 : positiveInteger(input.quantity, "linked_quantity");
    if (quantity > Number(treasure.quantity)) {
      throw new VaultError("linked_quantity_exceeds_treasure", "A set link cannot claim more units than the treasure record currently contains.", 409);
    }

    const existingForSet = database.prepare("SELECT * FROM vault_set_links WHERE account_id = ? AND set_id = ? AND treasure_id = ?")
      .get(collector.id, set.id, treasure.id);
    if (existingForSet && existingForSet.entry_id !== entry.id) {
      throw new VaultError("treasure_already_linked_to_set", "That treasure already fills a different expected entry in this collection set.", 409);
    }

    const timestamp = now().toISOString();
    if (existingForSet) {
      if (Number(existingForSet.quantity) === quantity) {
        return Object.freeze({ changed: false, linkId: existingForSet.id, setId: set.id, entryId: entry.id, treasureId: treasure.id, quantity });
      }
      database.prepare("UPDATE vault_set_links SET quantity = ?, updated_at = ? WHERE account_id = ? AND id = ?")
        .run(quantity, timestamp, collector.id, existingForSet.id);
      database.prepare("UPDATE vault_collection_sets SET updated_at = ? WHERE account_id = ? AND id = ?")
        .run(timestamp, collector.id, set.id);
      audit(collector.id, "vault.set_treasure_link_updated", { setId: set.id, entryId: entry.id, linkId: existingForSet.id, quantity }, treasure.id);
      return Object.freeze({ changed: true, linkId: existingForSet.id, setId: set.id, entryId: entry.id, treasureId: treasure.id, quantity });
    }

    const linkId = randomUUID();
    database.prepare(`INSERT INTO vault_set_links (
      id, account_id, set_id, entry_id, treasure_id, quantity, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      linkId, collector.id, set.id, entry.id, treasure.id, quantity, timestamp, timestamp
    );
    database.prepare("UPDATE vault_collection_sets SET updated_at = ? WHERE account_id = ? AND id = ?")
      .run(timestamp, collector.id, set.id);
    audit(collector.id, "vault.set_treasure_linked", { setId: set.id, entryId: entry.id, linkId, quantity }, treasure.id);
    return Object.freeze({ changed: true, linkId, setId: set.id, entryId: entry.id, treasureId: treasure.id, quantity });
  }

  function unlinkTreasure(identity, setId, entryId, treasureId) {
    const collector = requireIdentity(identity);
    const set = mapSet(requireSet(collector.id, setId));
    const entry = requireEntry(collector.id, set.id, entryId);
    const treasure = requireTreasure(collector.id, treasureId);
    const row = database.prepare("SELECT id FROM vault_set_links WHERE account_id = ? AND set_id = ? AND entry_id = ? AND treasure_id = ?")
      .get(collector.id, set.id, entry.id, treasure.id);
    if (!row) return Object.freeze({ changed: false, setId: set.id, entryId: entry.id, treasureId: treasure.id });
    const timestamp = now().toISOString();
    database.prepare("DELETE FROM vault_set_links WHERE account_id = ? AND id = ?").run(collector.id, row.id);
    database.prepare("UPDATE vault_collection_sets SET updated_at = ? WHERE account_id = ? AND id = ?")
      .run(timestamp, collector.id, set.id);
    audit(collector.id, "vault.set_treasure_unlinked", { setId: set.id, entryId: entry.id, linkId: row.id }, treasure.id);
    return Object.freeze({ changed: true, setId: set.id, entryId: entry.id, treasureId: treasure.id });
  }

  function close() {
    database.close();
  }

  return Object.freeze({
    list,
    get,
    create,
    update,
    remove,
    addEntry,
    updateEntry,
    removeEntry,
    linkTreasure,
    unlinkTreasure,
    close,
    maximumSets: MAX_SETS,
    maximumEntriesPerSet: MAX_ENTRIES_PER_SET
  });
}