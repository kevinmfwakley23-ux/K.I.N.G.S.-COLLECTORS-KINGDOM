import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_DESCRIPTION = 4_000;
const MAX_CONDITION_DISCLOSURE = 2_000;
const MAX_LIST_RESULTS = 500;

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_marketplace_preparation (
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  listing_description TEXT,
  condition_disclosure TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id, treasure_id)
);
CREATE INDEX IF NOT EXISTS vault_marketplace_preparation_updated_idx
  ON vault_marketplace_preparation(account_id, updated_at DESC);
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function optionalText(value, field, max) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${field}`, `${field} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  if (clean.length > max) throw new VaultError(`invalid_${field}`, `${field} must contain at most ${max} characters.`);
  return clean;
}

function check(id, label, satisfied, detail) {
  return Object.freeze({ id, label, satisfied: Boolean(satisfied), detail });
}

function assess(row) {
  const checks = Object.freeze([
    check("identity", "Clear item title", Boolean(String(row.title ?? "").trim()), "A buyer must be able to identify the item."),
    check("category", "Marketplace category foundation", Boolean(String(row.category ?? "").trim()), "A category is required for discovery and later Marketplace mapping."),
    check("condition", "Recorded item condition", Boolean(String(row.condition ?? "").trim()), "Condition must be recorded before a listing handoff."),
    check("actual-photo", "Actual-item photograph", Number(row.image_count ?? 0) > 0, "At least one photograph uploaded for this exact Vault treasure is required."),
    check("description", "Buyer-facing description draft", Boolean(String(row.listing_description ?? "").trim()), "Prepare a clear description of exactly what would be offered."),
    check("condition-disclosure", "Condition disclosure", Boolean(String(row.condition_disclosure ?? "").trim()), "State relevant wear, flaws, packaging condition, or that no issues are noted after inspection.")
  ]);
  const missingChecks = checks.filter((item) => !item.satisfied).map((item) => item.id);
  return Object.freeze({
    treasureId: row.id,
    title: row.title,
    category: row.category,
    condition: row.condition,
    quantity: Number(row.quantity),
    imageCount: Number(row.image_count ?? 0),
    listingDescription: row.listing_description ?? null,
    conditionDisclosure: row.condition_disclosure ?? null,
    checks,
    missingChecks,
    ready: missingChecks.length === 0,
    readinessScope: "vault-record-handoff",
    readinessMessage: missingChecks.length === 0
      ? "This Vault record has the core truthful item information needed to enter a future Marketplace listing workflow. Pricing, shipping, merchant requirements, payments, and publication are not implied by this status."
      : "This Vault record still needs truthful item information before it can enter a future Marketplace listing workflow. Pricing, shipping, merchant requirements, payments, and publication remain separate Marketplace-phase concerns.",
    preparationCreatedAt: row.preparation_created_at ?? null,
    preparationUpdatedAt: row.preparation_updated_at ?? null
  });
}

export function createVaultMarketplaceReadinessService({ filename, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault Marketplace-readiness database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function audit(accountId, treasureId, eventType, metadata) {
    database.prepare(`INSERT INTO vault_audit (id, account_id, treasure_id, event_type, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), accountId, treasureId, eventType, JSON.stringify(metadata), now().toISOString()
    );
  }

  function rowFor(accountId, treasureId) {
    return database.prepare(`SELECT
      t.id,
      t.title,
      t.category,
      t.condition,
      t.quantity,
      p.listing_description,
      p.condition_disclosure,
      p.created_at AS preparation_created_at,
      p.updated_at AS preparation_updated_at,
      (SELECT COUNT(*) FROM vault_media m
        WHERE m.account_id = t.account_id AND m.treasure_id = t.id AND m.content_type LIKE 'image/%') AS image_count
      FROM vault_treasures t
      LEFT JOIN vault_marketplace_preparation p
        ON p.account_id = t.account_id AND p.treasure_id = t.id
      WHERE t.account_id = ? AND t.id = ?`)
      .get(accountId, String(treasureId));
  }

  function requireRow(accountId, treasureId) {
    const row = rowFor(accountId, treasureId);
    if (!row) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return row;
  }

  function get(identity, treasureId) {
    const collector = requireIdentity(identity);
    return assess(requireRow(collector.id, treasureId));
  }

  function update(identity, treasureId, input = {}) {
    const collector = requireIdentity(identity);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new VaultError("invalid_marketplace_preparation", "Marketplace preparation data must be an object.");
    }
    const current = requireRow(collector.id, treasureId);
    const listingDescription = input.listingDescription === undefined
      ? current.listing_description ?? null
      : optionalText(input.listingDescription, "listing_description", MAX_DESCRIPTION);
    const conditionDisclosure = input.conditionDisclosure === undefined
      ? current.condition_disclosure ?? null
      : optionalText(input.conditionDisclosure, "condition_disclosure", MAX_CONDITION_DISCLOSURE);
    const timestamp = now().toISOString();
    const existing = database.prepare("SELECT treasure_id FROM vault_marketplace_preparation WHERE account_id = ? AND treasure_id = ?")
      .get(collector.id, String(treasureId));

    if (existing) {
      database.prepare(`UPDATE vault_marketplace_preparation
        SET listing_description = ?, condition_disclosure = ?, updated_at = ?
        WHERE account_id = ? AND treasure_id = ?`).run(
        listingDescription, conditionDisclosure, timestamp, collector.id, String(treasureId)
      );
    } else {
      database.prepare(`INSERT INTO vault_marketplace_preparation (
        account_id, treasure_id, listing_description, condition_disclosure, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`).run(
        collector.id, String(treasureId), listingDescription, conditionDisclosure, timestamp, timestamp
      );
    }

    const result = get(collector, treasureId);
    audit(collector.id, String(treasureId), "vault.marketplace_preparation_updated", {
      ready: result.ready,
      missingChecks: result.missingChecks
    });
    return result;
  }

  function list(identity, { readyOnly = false, incompleteOnly = false, limit = 100 } = {}) {
    const collector = requireIdentity(identity);
    if (readyOnly && incompleteOnly) throw new VaultError("invalid_marketplace_readiness_filter", "Choose either readyOnly or incompleteOnly, not both.");
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_RESULTS) {
      throw new VaultError("invalid_marketplace_readiness_limit", `Marketplace readiness limit must be an integer between 1 and ${MAX_LIST_RESULTS}.`);
    }
    const rows = database.prepare(`SELECT
      t.id,
      t.title,
      t.category,
      t.condition,
      t.quantity,
      p.listing_description,
      p.condition_disclosure,
      p.created_at AS preparation_created_at,
      p.updated_at AS preparation_updated_at,
      (SELECT COUNT(*) FROM vault_media m
        WHERE m.account_id = t.account_id AND m.treasure_id = t.id AND m.content_type LIKE 'image/%') AS image_count
      FROM vault_treasures t
      LEFT JOIN vault_marketplace_preparation p
        ON p.account_id = t.account_id AND p.treasure_id = t.id
      WHERE t.account_id = ?
      ORDER BY t.updated_at DESC, t.title COLLATE NOCASE
      LIMIT ?`).all(collector.id, limit);
    const items = rows.map(assess);
    if (readyOnly) return items.filter((item) => item.ready);
    if (incompleteOnly) return items.filter((item) => !item.ready);
    return items;
  }

  function close() {
    database.close();
  }

  return Object.freeze({
    get,
    update,
    list,
    close,
    maximumDescriptionLength: MAX_DESCRIPTION,
    maximumConditionDisclosureLength: MAX_CONDITION_DISCLOSURE,
    maximumListResults: MAX_LIST_RESULTS
  });
}
