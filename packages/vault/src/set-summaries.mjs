import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_SUMMARIES = 500;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function mapSummary(row) {
  const expectedEntryCount = Number(row.expected_entry_count ?? 0);
  const completeEntryCount = Number(row.complete_entry_count ?? 0);
  const expectedUnitCount = Number(row.expected_unit_count ?? 0);
  const creditedOwnedUnitCount = Number(row.credited_owned_unit_count ?? 0);
  const missingUnitCount = Number(row.missing_unit_count ?? 0);
  return Object.freeze({
    id: row.id,
    name: row.name,
    category: row.category,
    series: row.series,
    sourceType: row.source_type,
    sourceLabel: row.source_label,
    sourceReference: row.source_reference,
    notes: row.notes,
    expectedEntryCount,
    completeEntryCount,
    missingEntryCount: expectedEntryCount - completeEntryCount,
    expectedUnitCount,
    creditedOwnedUnitCount,
    missingUnitCount,
    completionPercent: expectedUnitCount ? Math.round((creditedOwnedUnitCount / expectedUnitCount) * 10_000) / 100 : 0,
    complete: expectedEntryCount > 0 && missingUnitCount === 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

const SUMMARY_SQL = `
WITH entry_progress AS (
  SELECT
    e.account_id,
    e.set_id,
    e.id AS entry_id,
    e.expected_quantity,
    COALESCE(SUM(
      CASE
        WHEN l.id IS NULL OR t.id IS NULL THEN 0
        WHEN l.quantity < t.quantity THEN l.quantity
        ELSE t.quantity
      END
    ), 0) AS owned_quantity
  FROM vault_set_entries e
  LEFT JOIN vault_set_links l
    ON l.account_id = e.account_id AND l.set_id = e.set_id AND l.entry_id = e.id
  LEFT JOIN vault_treasures t
    ON t.account_id = l.account_id AND t.id = l.treasure_id
  WHERE e.account_id = ?
  GROUP BY e.account_id, e.set_id, e.id, e.expected_quantity
),
set_progress AS (
  SELECT
    set_id,
    COUNT(*) AS expected_entry_count,
    SUM(CASE WHEN owned_quantity >= expected_quantity THEN 1 ELSE 0 END) AS complete_entry_count,
    SUM(expected_quantity) AS expected_unit_count,
    SUM(CASE WHEN owned_quantity < expected_quantity THEN owned_quantity ELSE expected_quantity END) AS credited_owned_unit_count,
    SUM(CASE WHEN expected_quantity > owned_quantity THEN expected_quantity - owned_quantity ELSE 0 END) AS missing_unit_count
  FROM entry_progress
  GROUP BY set_id
)
SELECT
  s.*,
  COALESCE(p.expected_entry_count, 0) AS expected_entry_count,
  COALESCE(p.complete_entry_count, 0) AS complete_entry_count,
  COALESCE(p.expected_unit_count, 0) AS expected_unit_count,
  COALESCE(p.credited_owned_unit_count, 0) AS credited_owned_unit_count,
  COALESCE(p.missing_unit_count, 0) AS missing_unit_count
FROM vault_collection_sets s
LEFT JOIN set_progress p ON p.set_id = s.id
WHERE s.account_id = ?
`;

export function createVaultSetSummaryService({ filename } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault set-summary database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");

  function list(identity, { incompleteOnly = false, limit = MAX_SUMMARIES } = {}) {
    const collector = requireIdentity(identity);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SUMMARIES) {
      throw new VaultError("invalid_set_summary_limit", `Set summary limit must be an integer between 1 and ${MAX_SUMMARIES}.`);
    }
    const incompleteClause = incompleteOnly
      ? " AND COALESCE(p.expected_entry_count, 0) > 0 AND COALESCE(p.missing_unit_count, 0) > 0"
      : "";
    const statement = database.prepare(`${SUMMARY_SQL}${incompleteClause} ORDER BY s.updated_at DESC, s.name COLLATE NOCASE LIMIT ?`);
    return statement.all(collector.id, collector.id, limit).map(mapSummary);
  }

  function get(identity, setId) {
    const collector = requireIdentity(identity);
    const row = database.prepare(`${SUMMARY_SQL} AND s.id = ? LIMIT 1`).get(collector.id, collector.id, String(setId));
    if (!row) throw new VaultError("collection_set_not_found", "That collection set was not found in your Vault.", 404);
    return mapSummary(row);
  }

  function close() {
    database.close();
  }

  return Object.freeze({ list, get, close, maximumSummaries: MAX_SUMMARIES });
}
