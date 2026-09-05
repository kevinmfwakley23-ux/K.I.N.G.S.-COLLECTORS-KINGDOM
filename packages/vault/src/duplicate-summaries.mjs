import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_GROUPS = 12;
const MAX_TREASURES_PER_GROUP = 6;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function boundedInteger(value, name, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new VaultError(`invalid_${name}`, `${name} must be an integer between 1 and ${maximum}.`);
  }
  return value;
}

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function matchingBasis(treasure) {
  return Object.freeze({
    title: clean(treasure.title),
    category: clean(treasure.category),
    series: clean(treasure.series),
    manufacturer: clean(treasure.manufacturer),
    year: treasure.year === null || treasure.year === undefined ? null : Number(treasure.year)
  });
}

function mapTreasure(row) {
  return Object.freeze({
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    series: clean(row.series),
    manufacturer: clean(row.manufacturer),
    year: row.year === null ? null : Number(row.year),
    condition: clean(row.condition),
    quantity: Number(row.quantity),
    locationName: clean(row.location_name)
  });
}

export function createVaultDuplicateSummaryService({ filename } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault duplicate summary database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA busy_timeout = 5000;");

  function list(identity, { limit = 5, treasuresPerGroup = 4 } = {}) {
    const collector = requireIdentity(identity);
    const safeLimit = boundedInteger(limit, "duplicate_group_limit", 5, MAX_GROUPS);
    const safeTreasuresPerGroup = boundedInteger(
      treasuresPerGroup,
      "duplicate_group_treasure_limit",
      4,
      MAX_TREASURES_PER_GROUP
    );

    const groups = database.prepare(`SELECT duplicate_key, COUNT(*) AS count
      FROM vault_treasures
      WHERE account_id = ?
      GROUP BY duplicate_key
      HAVING COUNT(*) > 1
      ORDER BY count DESC, duplicate_key
      LIMIT ?`).all(collector.id, safeLimit);

    const treasureStatement = database.prepare(`SELECT
        t.id, t.title, t.category, t.series, t.manufacturer, t.year, t.condition, t.quantity,
        l.name AS location_name
      FROM vault_treasures t
      LEFT JOIN vault_locations l
        ON l.account_id = t.account_id AND l.id = t.location_id
      WHERE t.account_id = ? AND t.duplicate_key = ?
      ORDER BY t.created_at ASC, t.id ASC
      LIMIT ?`);

    return Object.freeze(groups.map((group) => {
      const treasures = treasureStatement.all(collector.id, group.duplicate_key, safeTreasuresPerGroup).map(mapTreasure);
      return Object.freeze({
        count: Number(group.count),
        returnedTreasureCount: treasures.length,
        truncated: Number(group.count) > treasures.length,
        matchingFields: treasures.length ? matchingBasis(treasures[0]) : null,
        treasures: Object.freeze(treasures),
        explanation: "Possible duplicate records share normalized title, category, series, publisher/manufacturer, and year. They remain separate Vault records until the collector decides otherwise."
      });
    }));
  }

  function close() {
    database.close();
  }

  return Object.freeze({
    list,
    close,
    maximumGroups: MAX_GROUPS,
    maximumTreasuresPerGroup: MAX_TREASURES_PER_GROUP,
    policy: Object.freeze({
      automaticMerge: false,
      automaticDelete: false,
      collectorDecisionRequired: true,
      basis: "normalized title/category/series/manufacturer/year",
      source: "authenticated-collector-vault-only"
    })
  });
}
