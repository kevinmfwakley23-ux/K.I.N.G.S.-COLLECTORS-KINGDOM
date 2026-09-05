import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_favorites (
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(account_id, treasure_id)
);
CREATE INDEX IF NOT EXISTS vault_favorites_account_created_idx
  ON vault_favorites(account_id, created_at DESC, treasure_id);
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

export function createVaultFavoriteService({ filename, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault Favorites database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function requireTreasure(accountId, treasureId) {
    const id = String(treasureId);
    const row = database.prepare("SELECT id FROM vault_treasures WHERE account_id = ? AND id = ?").get(accountId, id);
    if (!row) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return id;
  }

  function audit(accountId, treasureId, eventType) {
    database.prepare(`INSERT INTO vault_audit (id, account_id, treasure_id, event_type, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), accountId, treasureId, eventType, JSON.stringify({ treasureId }), now().toISOString()
    );
  }

  function get(identity, treasureId) {
    const collector = requireIdentity(identity);
    const id = requireTreasure(collector.id, treasureId);
    const row = database.prepare("SELECT created_at FROM vault_favorites WHERE account_id = ? AND treasure_id = ?").get(collector.id, id);
    return Object.freeze({ treasureId: id, favorite: Boolean(row), favoritedAt: row?.created_at ?? null });
  }

  function add(identity, treasureId) {
    const collector = requireIdentity(identity);
    const id = requireTreasure(collector.id, treasureId);
    const existing = database.prepare("SELECT created_at FROM vault_favorites WHERE account_id = ? AND treasure_id = ?").get(collector.id, id);
    if (existing) return Object.freeze({ treasureId: id, favorite: true, favoritedAt: existing.created_at, changed: false });
    const createdAt = now().toISOString();
    database.prepare("INSERT INTO vault_favorites (account_id, treasure_id, created_at) VALUES (?, ?, ?)").run(collector.id, id, createdAt);
    audit(collector.id, id, "vault.favorite_added");
    return Object.freeze({ treasureId: id, favorite: true, favoritedAt: createdAt, changed: true });
  }

  function remove(identity, treasureId) {
    const collector = requireIdentity(identity);
    const id = requireTreasure(collector.id, treasureId);
    const result = database.prepare("DELETE FROM vault_favorites WHERE account_id = ? AND treasure_id = ?").run(collector.id, id);
    const changed = Number(result.changes) === 1;
    if (changed) audit(collector.id, id, "vault.favorite_removed");
    return Object.freeze({ treasureId: id, favorite: false, favoritedAt: null, changed });
  }

  function listTreasureIds(identity, { limit = 200, offset = 0 } = {}) {
    const collector = requireIdentity(identity);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new VaultError("invalid_favorite_limit", "Favorite limit must be between 1 and 1000.");
    if (!Number.isInteger(offset) || offset < 0 || offset > 10_000_000) throw new VaultError("invalid_favorite_offset", "Favorite offset is invalid.");
    return database.prepare(`SELECT treasure_id FROM vault_favorites
      WHERE account_id = ? ORDER BY created_at DESC, treasure_id LIMIT ? OFFSET ?`)
      .all(collector.id, limit, offset).map((row) => row.treasure_id);
  }

  function count(identity) {
    const collector = requireIdentity(identity);
    return Number(database.prepare("SELECT COUNT(*) AS count FROM vault_favorites WHERE account_id = ?").get(collector.id)?.count ?? 0);
  }

  function close() {
    database.close();
  }

  return Object.freeze({ get, add, remove, listTreasureIds, count, close });
}
