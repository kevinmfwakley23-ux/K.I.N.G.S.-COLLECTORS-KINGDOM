import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_treasure_attributes (
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source_type TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  verification_provider TEXT,
  verification_reference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id, treasure_id, field_key)
);
CREATE INDEX IF NOT EXISTS vault_attributes_treasure_idx ON vault_treasure_attributes(account_id, treasure_id, field_label);
CREATE INDEX IF NOT EXISTS vault_attributes_key_idx ON vault_treasure_attributes(account_id, field_key);
`;

const FIELD_KEY = /^[a-z][a-z0-9_-]{0,59}$/;
const SOURCE_TYPES = new Set(["collector-entered", "imported"]);

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanText(value, name, max, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new VaultError(`invalid_${name}`, `${name} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > max) throw new VaultError(`invalid_${name}`, `${name} must contain 1 to ${max} characters.`);
  return clean;
}

function normalizeValue(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    if (typeof value === "string") {
      const clean = value.trim().replace(/\s+/g, " ");
      if (!clean || clean.length > 4000) throw new VaultError("invalid_attribute_value", "Attribute text must contain 1 to 4000 characters.");
      return clean;
    }
    if (typeof value === "number" && !Number.isFinite(value)) throw new VaultError("invalid_attribute_value", "Attribute numbers must be finite.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) throw new VaultError("invalid_attribute_value", "Attribute lists may contain at most 100 values.");
    return value.map((entry) => {
      if (!["string", "number", "boolean"].includes(typeof entry)) throw new VaultError("invalid_attribute_value", "Attribute lists may contain only text, numbers, or booleans.");
      if (typeof entry === "string") {
        const clean = entry.trim().replace(/\s+/g, " ");
        if (!clean || clean.length > 500) throw new VaultError("invalid_attribute_value", "Attribute list text must contain 1 to 500 characters.");
        return clean;
      }
      if (typeof entry === "number" && !Number.isFinite(entry)) throw new VaultError("invalid_attribute_value", "Attribute numbers must be finite.");
      return entry;
    });
  }
  throw new VaultError("invalid_attribute_value", "Attribute values must be text, a number, a boolean, null, or a simple list.");
}

function mapRow(row) {
  if (!row) return null;
  let value = null;
  try { value = JSON.parse(row.value_json); } catch {}
  return {
    key: row.field_key,
    label: row.field_label,
    value,
    sourceType: row.source_type,
    verificationStatus: row.verification_status,
    verificationProvider: row.verification_provider,
    verificationReference: row.verification_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createVaultAttributeService({ filename, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault attribute database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function requireTreasure(accountId, treasureId) {
    const row = database.prepare("SELECT id FROM vault_treasures WHERE account_id = ? AND id = ?").get(accountId, treasureId);
    if (!row) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return row.id;
  }

  function list(identity, treasureId) {
    const collector = requireIdentity(identity);
    requireTreasure(collector.id, String(treasureId));
    return database.prepare(`SELECT * FROM vault_treasure_attributes
      WHERE account_id = ? AND treasure_id = ? ORDER BY field_label COLLATE NOCASE, field_key`).all(collector.id, String(treasureId)).map(mapRow);
  }

  function upsert(identity, treasureId, input = {}) {
    const collector = requireIdentity(identity);
    const id = requireTreasure(collector.id, String(treasureId));
    const key = typeof input.key === "string" ? input.key.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") : "";
    if (!FIELD_KEY.test(key)) throw new VaultError("invalid_attribute_key", "Attribute key must start with a letter and use only letters, numbers, underscores, or hyphens.");
    const label = cleanText(input.label ?? key.replaceAll("_", " "), "attribute_label", 100, { required: true });
    const value = normalizeValue(input.value);
    const sourceType = typeof input.sourceType === "string" ? input.sourceType.trim().toLowerCase() : "collector-entered";
    if (!SOURCE_TYPES.has(sourceType)) throw new VaultError("invalid_attribute_source", "Attribute source must be collector-entered or imported.");
    const provider = cleanText(input.verificationProvider, "verification_provider", 100);
    const reference = cleanText(input.verificationReference, "verification_reference", 500);
    const timestamp = now().toISOString();
    const existing = database.prepare(`SELECT created_at FROM vault_treasure_attributes
      WHERE account_id = ? AND treasure_id = ? AND field_key = ?`).get(collector.id, id, key);

    // External verification is intentionally not accepted from this collector-editable boundary.
    // A future verifier service may promote verification_status after checking a real provider.
    database.prepare(`INSERT INTO vault_treasure_attributes (
      account_id,treasure_id,field_key,field_label,value_json,source_type,verification_status,
      verification_provider,verification_reference,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(account_id,treasure_id,field_key) DO UPDATE SET
      field_label=excluded.field_label,value_json=excluded.value_json,source_type=excluded.source_type,
      verification_status='not-checked',verification_provider=excluded.verification_provider,
      verification_reference=excluded.verification_reference,updated_at=excluded.updated_at`).run(
      collector.id, id, key, label, JSON.stringify(value), sourceType, "not-checked", provider, reference,
      existing?.created_at ?? timestamp, timestamp
    );

    return mapRow(database.prepare(`SELECT * FROM vault_treasure_attributes
      WHERE account_id = ? AND treasure_id = ? AND field_key = ?`).get(collector.id, id, key));
  }

  function remove(identity, treasureId, key) {
    const collector = requireIdentity(identity);
    const id = requireTreasure(collector.id, String(treasureId));
    const normalized = String(key ?? "").trim().toLowerCase();
    const result = database.prepare(`DELETE FROM vault_treasure_attributes
      WHERE account_id = ? AND treasure_id = ? AND field_key = ?`).run(collector.id, id, normalized);
    if (Number(result.changes) !== 1) throw new VaultError("attribute_not_found", "That collectible detail was not found.", 404);
    return { deleted: true, key: normalized };
  }

  function close() {
    database.close();
  }

  return Object.freeze({ list, upsert, remove, close });
}
