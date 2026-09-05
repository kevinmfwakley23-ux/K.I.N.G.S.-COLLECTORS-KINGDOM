import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultMarketplaceReadinessService } from "../packages/vault/src/marketplace-readiness.mjs";
import { createVaultSearchService } from "../packages/vault/src/search-engine.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "search-scale-owner", displayName: "Scale Owner" });

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-search-engine-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  try {
    await run({ directory, filename, store, vault });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("dirty-tracked search pays the collection-wide cost once, then clean searches inspect zero treasures", async () => {
  await withVault(async ({ filename, vault }) => {
    let target = null;
    for (let index = 0; index < 420; index += 1) {
      const treasure = vault.createTreasure(collector, {
        title: index === 319 ? "Massive Vault Needle" : `Archive Item ${String(index).padStart(4, "0")}`,
        category: "Comic Books",
        condition: "Stored"
      });
      if (index === 319) target = treasure;
    }

    const search = createVaultSearchService({ filename });
    try {
      assert.deepEqual(search.searchTreasureIds(collector, "Massive Vault Needle", { limit: 8 }), [target.id]);
      const first = search.diagnostics(collector);
      assert.equal(first.lastSynchronization.mode, "initial-rebuild");
      assert.equal(first.indexedCount, 420);
      assert.equal(first.lastSynchronization.inspectedTreasureCount, 420);

      assert.deepEqual(search.searchTreasureIds(collector, "Massive Vault Needle", { limit: 8 }), [target.id]);
      const second = search.diagnostics(collector);
      assert.equal(second.lastSynchronization.mode, "clean");
      assert.equal(second.lastSynchronization.inspectedTreasureCount, 0);
      assert.equal(second.dirtyCount, 0);
      assert.equal(second.metrics.fullRebuilds, 1);
    } finally {
      search.close();
    }
  });
});

test("one treasure edit refreshes one search record and deletion removes it without a full rebuild", async () => {
  await withVault(async ({ filename, vault }) => {
    const treasure = vault.createTreasure(collector, {
      title: "Original Concert Poster",
      category: "Music Memorabilia",
      condition: "Excellent"
    });
    vault.createTreasure(collector, { title: "Unrelated Poster", category: "Music Memorabilia" });

    const search = createVaultSearchService({ filename });
    try {
      assert.deepEqual(search.searchTreasureIds(collector, "Original Concert", { limit: 8 }), [treasure.id]);
      vault.updateTreasure(collector, treasure.id, { title: "Pearl Jam Concert Poster" });

      assert.deepEqual(search.searchTreasureIds(collector, "Pearl Jam", { limit: 8 }), [treasure.id]);
      assert.deepEqual(search.searchTreasureIds(collector, "Original Concert", { limit: 8 }), []);
      const edited = search.diagnostics(collector);
      assert.equal(edited.lastSynchronization.mode, "incremental");
      assert.equal(edited.lastSynchronization.inspectedTreasureCount, 1);
      assert.equal(edited.metrics.fullRebuilds, 1);

      await vault.deleteTreasure(collector, treasure.id);
      assert.deepEqual(search.searchTreasureIds(collector, "Pearl Jam", { limit: 8 }), []);
      const deleted = search.diagnostics(collector);
      assert.equal(deleted.lastSynchronization.mode, "incremental");
      assert.equal(deleted.lastSynchronization.inspectedTreasureCount, 1);
      assert.equal(deleted.indexedCount, 1);
      assert.equal(deleted.metrics.fullRebuilds, 1);
    } finally {
      search.close();
    }
  });
});

test("optional Marketplace preparation installed after search startup becomes searchable through dirty triggers", async () => {
  await withVault(async ({ filename, vault }) => {
    const treasure = vault.createTreasure(collector, {
      title: "Numbered Rookie Card",
      category: "Sports Cards",
      condition: "Near Mint"
    });
    const search = createVaultSearchService({ filename });
    let marketplace = null;
    try {
      assert.deepEqual(search.searchTreasureIds(collector, "Numbered Rookie", { limit: 8 }), [treasure.id]);
      marketplace = createVaultMarketplaceReadinessService({ filename });
      marketplace.update(collector, treasure.id, {
        listingDescription: "Serial numbered rookie parallel from the championship season.",
        conditionDisclosure: "Minor edge whitening visible under direct light."
      });

      assert.deepEqual(search.searchTreasureIds(collector, "championship serial parallel", { limit: 8 }), [treasure.id]);
      assert.deepEqual(search.searchTreasureIds(collector, "edge whitening", { limit: 8 }), [treasure.id]);
      const diagnostics = search.diagnostics(collector);
      assert.equal(diagnostics.lastSynchronization.mode, "incremental");
      assert.equal(diagnostics.lastSynchronization.inspectedTreasureCount, 1);
      assert.equal(diagnostics.metrics.fullRebuilds, 1);
    } finally {
      marketplace?.close();
      search.close();
    }
  });
});
