import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createVaultAttributeService } from "./attributes.mjs";
import { VaultError } from "./service.mjs";

const EVENT_TYPES = new Set(["acquired", "inherited", "gifted-in", "transferred-in", "sold", "gifted-out", "transferred-out", "other"]);

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_ownership_history (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_on TEXT,
  counterparty TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_ownership_treasure_idx ON vault_ownership_history(account_id, treasure_id, occurred_on, created_at);
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanText(value, name, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > max) throw new VaultError(`invalid_${name}`, `${name} must contain 1 to ${max} characters.`);
  return clean;
}

function cleanDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new VaultError("invalid_occurred_on", "Ownership event date must use YYYY-MM-DD.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new VaultError("invalid_occurred_on", "Ownership event date is invalid.");
  return value;
}

function mapEvent(row) {
  return row ? {
    id: row.id,
    treasureId: row.treasure_id,
    eventType: row.event_type,
    occurredOn: row.occurred_on,
    counterparty: row.counterparty,
    notes: row.notes,
    createdAt: row.created_at
  } : null;
}

export function createVaultOwnershipService({ filename, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault ownership database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);
  const attributeService = createVaultAttributeService({ filename, now });

  function requireTreasure(accountId, treasureId) {
    const row = database.prepare("SELECT id FROM vault_treasures WHERE account_id = ? AND id = ?").get(accountId, treasureId);
    if (!row) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return row.id;
  }

  function list(identity, treasureId) {
    const collector = requireIdentity(identity);
    requireTreasure(collector.id, String(treasureId));
    return database.prepare(`SELECT * FROM vault_ownership_history WHERE account_id = ? AND treasure_id = ?
      ORDER BY CASE WHEN occurred_on IS NULL THEN 1 ELSE 0 END, occurred_on DESC, created_at DESC`).all(collector.id, String(treasureId)).map(mapEvent);
  }

  function add(identity, treasureId, input = {}) {
    const collector = requireIdentity(identity);
    const id = requireTreasure(collector.id, String(treasureId));
    const eventType = typeof input.eventType === "string" ? input.eventType.trim().toLowerCase() : "";
    if (!EVENT_TYPES.has(eventType)) throw new VaultError("invalid_ownership_event_type", `Ownership event type must be one of: ${[...EVENT_TYPES].join(", ")}.`);
    const event = {
      id: randomUUID(),
      accountId: collector.id,
      treasureId: id,
      eventType,
      occurredOn: cleanDate(input.occurredOn),
      counterparty: cleanText(input.counterparty, "counterparty", 180),
      notes: cleanText(input.notes, "ownership_notes", 2000),
      createdAt: now().toISOString()
    };
    database.prepare(`INSERT INTO vault_ownership_history (id,account_id,treasure_id,event_type,occurred_on,counterparty,notes,created_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(event.id, event.accountId, event.treasureId, event.eventType, event.occurredOn, event.counterparty, event.notes, event.createdAt);
    return mapEvent(database.prepare("SELECT * FROM vault_ownership_history WHERE id = ? AND account_id = ?").get(event.id, collector.id));
  }

  function remove(identity, treasureId, eventId) {
    const collector = requireIdentity(identity);
    requireTreasure(collector.id, String(treasureId));
    const result = database.prepare("DELETE FROM vault_ownership_history WHERE account_id = ? AND treasure_id = ? AND id = ?").run(collector.id, String(treasureId), String(eventId));
    if (Number(result.changes) !== 1) throw new VaultError("ownership_event_not_found", "Ownership history entry was not found.", 404);
    return { deleted: true, id: String(eventId) };
  }

  function close() {
    attributeService.close();
    database.close();
  }

  return Object.freeze({
    list,
    add,
    remove,
    close,
    attributeService,
    eventTypes: Object.freeze([...EVENT_TYPES])
  });
}
