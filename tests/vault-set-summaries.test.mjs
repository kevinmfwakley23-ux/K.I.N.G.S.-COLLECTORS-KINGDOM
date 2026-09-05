import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultSetSummaryService } from "../packages/vault/src/set-summaries.mjs";
import { createVaultSetService } from "../packages/vault/src/sets.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "set-summary-owner", displayName: "Set Summary Owner" });
const other = Object.freeze({ id: "set-summary-other", displayName: "Other Collector" });

async function withServices(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-set-summary-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const sets = createVaultSetService({ filename });
  const summaries = createVaultSetSummaryService({ filename });
  try {
    await run({ vault, sets, summaries });
  } finally {
    summaries.close();
    sets.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("aggregate set summaries preserve detailed completion semantics without loading entry graphs", async () => {
  await withServices(async ({ vault, sets, summaries }) => {
    const set = sets.create(owner, { name: "Two-Coin Type Set", category: "Coins, Currency & Legal Tender" });
    const first = sets.addEntry(owner, set.id, { entryKey: "half-dollar", label: "Kennedy Half Dollar" });
    const second = sets.addEntry(owner, set.id, { entryKey: "dollar", label: "Eisenhower Dollar", expectedQuantity: 2 });
    const half = vault.createTreasure(owner, { title: "1964 Kennedy Half Dollar", category: "Coins, Currency & Legal Tender" });
    const dollars = vault.createTreasure(owner, { title: "1972 Eisenhower Dollars", category: "Coins, Currency & Legal Tender", quantity: 2 });

    sets.linkTreasure(owner, set.id, first.id, half.id, { quantity: 1 });
    sets.linkTreasure(owner, set.id, second.id, dollars.id, { quantity: 2 });

    const detailed = sets.get(owner, set.id);
    const summary = summaries.get(owner, set.id);
    for (const field of [
      "expectedEntryCount",
      "completeEntryCount",
      "missingEntryCount",
      "expectedUnitCount",
      "creditedOwnedUnitCount",
      "missingUnitCount",
      "completionPercent",
      "complete"
    ]) {
      assert.equal(summary[field], detailed[field], field);
    }
    assert.equal("entries" in summary, false);

    vault.updateTreasure(owner, dollars.id, { quantity: 1 });
    const reduced = summaries.get(owner, set.id);
    assert.equal(reduced.complete, false);
    assert.equal(reduced.creditedOwnedUnitCount, 2);
    assert.equal(reduced.missingUnitCount, 1);
    assert.equal(reduced.completionPercent, 66.67);
  });
});

test("aggregate incomplete-set query excludes empty and complete sets and remains owner scoped", async () => {
  await withServices(async ({ vault, sets, summaries }) => {
    sets.create(owner, { name: "Empty Planning Set", category: "Other / Custom Collectible" });

    const incomplete = sets.create(owner, { name: "Incomplete Comic Run", category: "Comic Books" });
    sets.addEntry(owner, incomplete.id, { entryKey: "1", label: "Issue #1" });

    const complete = sets.create(owner, { name: "Complete Signed Pair", category: "Autographed & Signed Items" });
    const entry = sets.addEntry(owner, complete.id, { entryKey: "signed-1", label: "Signed Item" });
    const treasure = vault.createTreasure(owner, { title: "Signed Item", category: "Autographed & Signed Items" });
    sets.linkTreasure(owner, complete.id, entry.id, treasure.id);

    assert.deepEqual(summaries.list(owner, { incompleteOnly: true }).map((item) => item.id), [incomplete.id]);
    assert.equal(summaries.list(other).length, 0);
  });
});
