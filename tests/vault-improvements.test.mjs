import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultDuplicateSummaryService } from "../packages/vault/src/duplicate-summaries.mjs";
import { createVaultImprovementService } from "../packages/vault/src/improvements.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultSetSummaryService } from "../packages/vault/src/set-summaries.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collectorA = Object.freeze({ id: "collector-improvements-a", displayName: "Collector A" });
const collectorB = Object.freeze({ id: "collector-improvements-b", displayName: "Collector B" });

async function withFixture(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-improvements-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const sets = createVaultSetSummaryService({ filename });
  const duplicates = createVaultDuplicateSummaryService({ filename });
  const improvements = createVaultImprovementService({ filename, setSummaryService: sets, duplicateSummaryService: duplicates });
  try {
    await run({ vault, ownership, improvements, filename });
  } finally {
    improvements.close();
    duplicates.close();
    sets.close();
    ownership.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("collection improvements are derived from the authenticated collector's real Vault gaps", async () => {
  await withFixture(async ({ vault, improvements }) => {
    const first = vault.createTreasure(collectorA, {
      title: "1999 Charizard Holo",
      category: "Trading Card Games (TCG)",
      series: "Base Set",
      manufacturer: "Wizards of the Coast",
      year: 1999,
      quantity: 1,
      estimatedValueCents: 25000,
      estimatedValueCurrency: "USD"
    });
    vault.createTreasure(collectorA, {
      title: "1999 Charizard Holo",
      category: "Trading Card Games (TCG)",
      series: "Base Set",
      manufacturer: "Wizards of the Coast",
      year: 1999,
      condition: "Played",
      quantity: 1
    });
    vault.createTreasure(collectorB, {
      title: "Private Other Collector Item",
      category: "Comic Books",
      quantity: 1
    });

    const recommendations = improvements.list(collectorA, { limit: 8 });
    const ids = recommendations.map((item) => item.id);
    assert.ok(ids.includes("record-storage-location"));
    assert.ok(ids.includes("add-item-photographs"));
    assert.ok(ids.includes("record-condition"));
    assert.ok(ids.includes("review-possible-duplicates"));
    assert.ok(recommendations.every((item) => item.basis === "authenticated-collector-vault-state"));
    assert.ok(recommendations.every((item) => item.automaticApplication === false));
    assert.ok(recommendations.every((item) => item.examples.length <= 3));
    assert.ok(recommendations.flatMap((item) => item.examples).every((item) => item.title !== "Private Other Collector Item"));

    const condition = recommendations.find((item) => item.id === "record-condition");
    assert.equal(condition.affectedCount, 1);
    assert.equal(condition.examples[0].id, first.id);
  });
});

test("improvement service returns no manufactured advice for an empty Vault", async () => {
  await withFixture(async ({ improvements }) => {
    assert.deepEqual(improvements.list(collectorA), []);
  });
});

test("improvement service is fail-closed for invalid identity and limits", async () => {
  await withFixture(async ({ vault, improvements }) => {
    vault.createTreasure(collectorA, { title: "Test Treasure", category: "Other / Custom Collectible", quantity: 1 });
    assert.throws(() => improvements.list(null), (error) => error instanceof VaultError && error.statusCode === 401);
    assert.throws(() => improvements.list(collectorA, { limit: 0 }), (error) => error instanceof VaultError && error.code === "invalid_improvement_limit");
    assert.throws(() => improvements.list(collectorA, { limit: 9 }), (error) => error instanceof VaultError && error.code === "invalid_improvement_limit");
  });
});
