import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureVaultPerformanceIndexes } from "../packages/vault/src/performance-indexes.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

function planDetails(database, sql) {
  return database.prepare(`EXPLAIN QUERY PLAN ${sql}`).all("performance-owner", 49).map((row) => String(row.detail ?? "")).join("\n");
}

test("Royal Vault installs account-scoped indexes for default, value, and year collection sorts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-indexes-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  try {
    const result = ensureVaultPerformanceIndexes({ filename });
    assert.equal(result.complete, true);
    assert.deepEqual(result.installed, [...result.expected].sort());

    const database = new DatabaseSync(filename, { readOnly: true });
    try {
      const updatedPlan = planDetails(database, `SELECT t.* FROM vault_treasures t
        WHERE t.account_id = ? ORDER BY t.updated_at DESC LIMIT ?`);
      assert.match(updatedPlan, /vault_treasures_account_updated_idx/);

      const valuePlan = planDetails(database, `SELECT t.* FROM vault_treasures t
        WHERE t.account_id = ? ORDER BY COALESCE(t.estimated_value_cents, -1) DESC, t.title COLLATE NOCASE ASC LIMIT ?`);
      assert.match(valuePlan, /vault_treasures_account_value_sort_idx/);

      const yearPlan = planDetails(database, `SELECT t.* FROM vault_treasures t
        WHERE t.account_id = ? ORDER BY COALESCE(t.year, -1) DESC, t.title COLLATE NOCASE ASC LIMIT ?`);
      assert.match(yearPlan, /vault_treasures_account_year_sort_idx/);
    } finally {
      database.close();
    }
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("performance index installation is idempotent across repeated runtime starts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-indexes-repeat-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  try {
    const first = ensureVaultPerformanceIndexes({ filename });
    const second = ensureVaultPerformanceIndexes({ filename });
    assert.equal(first.complete, true);
    assert.equal(second.complete, true);
    assert.deepEqual(second.installed, first.installed);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
