import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_SAVED_VIEWS = 100;
const SORTS = new Set(["updated-desc", "updated-asc", "created-desc", "title-asc", "title-desc", "value-desc", "year-desc"]);
const VIEWS = new Set(["grid", "list"]);

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_saved_views (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  query_text TEXT,
  category TEXT,
  folder_id TEXT REFERENCES vault_folders(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES vault_locations(id) ON DELETE SET NULL,
  tag TEXT,
  sort_key TEXT NOT NULL,
  view_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_saved_views_account_name_idx
  ON vault_saved_views(account_id, name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS vault_saved_views_account_updated_idx
  ON vault_saved_views(account_id, updated_at DESC, name COLLATE NOCASE);
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanText(value, name, max, { required = false } = {}) {
  if (value === undefined) {
    if (required) throw new VaultError(`invalid_${name}`, `${name} is required.`);
    return undefined;
  }
  if (value === null || value === "") {
    if (required) throw new VaultError(`invalid_${name}`, `${name} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean && required) throw new VaultError(`invalid_${name}`, `${name} is required.`);
  if (!clean) return null;
  if (clean.length > max) throw new VaultError(`invalid_${name}`, `${name} must contain at most ${max} characters.`);
  return clean;
}

function mapRow(row) {
  return row ? {
    id: row.id,
    name: row.name,
    query: row.query_text,
    category: row.category,
    folderId: row.folder_id,
    locationId: row.location_id,
    tag: row.tag,
    sort: row.sort_key,
    view: row.view_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } : null;
}

export function createVaultSavedViewService({ filename, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault saved-view database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function requireFolder(accountId, folderId) {
    if (!folderId) return null;
    const id = String(folderId);
    const found = database.prepare("SELECT id FROM vault_folders WHERE account_id = ? AND id = ?").get(accountId, id);
    if (!found) throw new VaultError("folder_not_found", "The saved view references a Vault folder that does not exist.", 404);
    return id;
  }

  function requireLocation(accountId, locationId) {
    if (!locationId) return null;
    const id = String(locationId);
    const found = database.prepare("SELECT id FROM vault_locations WHERE account_id = ? AND id = ?").get(accountId, id);
    if (!found) throw new VaultError("location_not_found", "The saved view references a physical location that does not exist.", 404);
    return id;
  }

  function normalize(accountId, input = {}, existing = null) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_saved_view", "Saved view data must be an object.");
    const name = input.name === undefined && existing
      ? existing.name
      : cleanText(input.name, "saved_view_name", 80, { required: true });
    const query = cleanText(input.query, "saved_view_query", 4000);
    const category = cleanText(input.category, "saved_view_category", 120);
    const tagText = cleanText(input.tag, "saved_view_tag", 60);
    const tag = tagText === undefined ? undefined : tagText === null ? null : tagText.toLowerCase();
    const sort = input.sort === undefined ? undefined : String(input.sort).trim();
    const view = input.view === undefined ? undefined : String(input.view).trim();
    if (sort !== undefined && !SORTS.has(sort)) throw new VaultError("invalid_saved_view_sort", "Saved view sort option is not supported.");
    if (view !== undefined && !VIEWS.has(view)) throw new VaultError("invalid_saved_view_mode", "Saved view mode must be grid or list.");

    return {
      name,
      query: query === undefined ? existing?.query ?? null : query,
      category: category === undefined ? existing?.category ?? null : category,
      folderId: input.folderId === undefined ? existing?.folderId ?? null : requireFolder(accountId, input.folderId),
      locationId: input.locationId === undefined ? existing?.locationId ?? null : requireLocation(accountId, input.locationId),
      tag: tag === undefined ? existing?.tag ?? null : tag,
      sort: sort === undefined ? existing?.sort ?? "updated-desc" : sort,
      view: view === undefined ? existing?.view ?? "grid" : view
    };
  }

  function list(identity) {
    const collector = requireIdentity(identity);
    return database.prepare("SELECT * FROM vault_saved_views WHERE account_id = ? ORDER BY updated_at DESC, name COLLATE NOCASE").all(collector.id).map(mapRow);
  }

  function get(identity, id) {
    const collector = requireIdentity(identity);
    const row = database.prepare("SELECT * FROM vault_saved_views WHERE account_id = ? AND id = ?").get(collector.id, String(id));
    if (!row) throw new VaultError("saved_view_not_found", "That saved Vault view was not found.", 404);
    return mapRow(row);
  }

  function create(identity, input = {}) {
    const collector = requireIdentity(identity);
    const count = Number(database.prepare("SELECT COUNT(*) AS count FROM vault_saved_views WHERE account_id = ?").get(collector.id)?.count ?? 0);
    if (count >= MAX_SAVED_VIEWS) throw new VaultError("saved_view_limit", `A collector may keep at most ${MAX_SAVED_VIEWS} saved Vault views.`, 409);
    const next = normalize(collector.id, input);
    if (database.prepare("SELECT id FROM vault_saved_views WHERE account_id = ? AND name = ? COLLATE NOCASE").get(collector.id, next.name)) {
      throw new VaultError("saved_view_name_exists", "A saved Vault view with that name already exists.", 409);
    }
    const timestamp = now().toISOString();
    const id = randomUUID();
    database.prepare(`INSERT INTO vault_saved_views (
      id,account_id,name,query_text,category,folder_id,location_id,tag,sort_key,view_mode,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, collector.id, next.name, next.query, next.category, next.folderId, next.locationId,
      next.tag, next.sort, next.view, timestamp, timestamp
    );
    return get(collector, id);
  }

  function update(identity, id, input = {}) {
    const collector = requireIdentity(identity);
    const existing = get(collector, id);
    const next = normalize(collector.id, input, existing);
    const duplicate = database.prepare("SELECT id FROM vault_saved_views WHERE account_id = ? AND name = ? COLLATE NOCASE AND id <> ?").get(collector.id, next.name, existing.id);
    if (duplicate) throw new VaultError("saved_view_name_exists", "A saved Vault view with that name already exists.", 409);
    database.prepare(`UPDATE vault_saved_views SET
      name=?,query_text=?,category=?,folder_id=?,location_id=?,tag=?,sort_key=?,view_mode=?,updated_at=?
      WHERE account_id=? AND id=?`).run(
      next.name, next.query, next.category, next.folderId, next.locationId, next.tag, next.sort, next.view,
      now().toISOString(), collector.id, existing.id
    );
    return get(collector, existing.id);
  }

  function remove(identity, id) {
    const collector = requireIdentity(identity);
    const result = database.prepare("DELETE FROM vault_saved_views WHERE account_id = ? AND id = ?").run(collector.id, String(id));
    if (Number(result.changes) !== 1) throw new VaultError("saved_view_not_found", "That saved Vault view was not found.", 404);
    return { deleted: true, id: String(id) };
  }

  function close() {
    database.close();
  }

  return Object.freeze({ list, get, create, update, remove, close, maximumSavedViews: MAX_SAVED_VIEWS });
}
