import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PERFORMANCE_INDEXES = Object.freeze([
  Object.freeze({
    name: "vault_treasures_account_updated_idx",
    sql: `CREATE INDEX IF NOT EXISTS vault_treasures_account_updated_idx
      ON vault_treasures(account_id, updated_at DESC)`
  }),
  Object.freeze({
    name: "vault_treasures_account_value_sort_idx",
    sql: `CREATE INDEX IF NOT EXISTS vault_treasures_account_value_sort_idx
      ON vault_treasures(account_id, COALESCE(estimated_value_cents, -1) DESC, title COLLATE NOCASE ASC)`
  }),
  Object.freeze({
    name: "vault_treasures_account_year_sort_idx",
    sql: `CREATE INDEX IF NOT EXISTS vault_treasures_account_year_sort_idx
      ON vault_treasures(account_id, COALESCE(year, -1) DESC, title COLLATE NOCASE ASC)`
  })
]);

export function ensureVaultPerformanceIndexes({ filename } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault performance index database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA busy_timeout = 5000;");
  try {
    for (const index of PERFORMANCE_INDEXES) database.exec(`${index.sql};`);
    const installed = database.prepare(`SELECT name FROM sqlite_master
      WHERE type = 'index' AND name IN (${PERFORMANCE_INDEXES.map(() => "?").join(",")})
      ORDER BY name`).all(...PERFORMANCE_INDEXES.map((index) => index.name)).map((row) => row.name);
    return Object.freeze({
      installed: Object.freeze(installed),
      expected: Object.freeze(PERFORMANCE_INDEXES.map((index) => index.name)),
      complete: installed.length === PERFORMANCE_INDEXES.length
    });
  } finally {
    database.close();
  }
}

export { PERFORMANCE_INDEXES };
