import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceQueryService } from "../packages/marketplace/src/query-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceSavedSearchRepository } from "../packages/marketplace/src/saved-search-repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "market-query-seller" });
const otherCollector = Object.freeze({ id: "market-query-other" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

async function withQuery(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-query-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore });
  const savedSearchRepository = createMarketplaceSavedSearchRepository({ vaultStore });
  let tick = Date.parse("2026-09-13T15:00:00.000Z");
  const now = () => new Date(tick += 1000);
  const core = createMarketplaceService({ vaultStore, marketplaceRepository: repository, now });
  const query = createMarketplaceQueryService({
    vaultStore,
    marketplaceRepository: repository,
    marketplaceService: core,
    savedSearchRepository,
    now
  });
  try {
    await run({ vaultStore, vault, repository, core, query });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, core, { title, category = "Trading Card", amountCents, currency = "USD" }) {
  const treasure = vault.createTreasure(seller, { title, category, quantity: 1 });
  const draft = core.createDraft(seller, {
    treasureId: treasure.id,
    amountCents,
    currency,
    quantity: 1,
    fulfillmentMethod: "shipping"
  });
  return core.publish(seller, draft.id, attestations);
}

test("Marketplace keyset pagination returns stable non-overlapping pages", async () => {
  await withQuery(({ vault, core, query }) => {
    for (const [title, amountCents] of [
      ["Alpha", 1000],
      ["Bravo", 1000],
      ["Charlie", 2000],
      ["Delta", 2000],
      ["Echo", 3000]
    ]) publish(vault, core, { title, amountCents });

    const first = query.browsePage({ currency: "USD", sort: "price-asc", pageSize: 2 });
    assert.equal(first.listings.length, 2);
    assert.equal(first.pageInfo.hasNext, true);
    assert.ok(first.pageInfo.nextCursor);

    const second = query.browsePage({
      currency: "USD",
      sort: "price-asc",
      pageSize: 2,
      cursor: first.pageInfo.nextCursor
    });
    const third = query.browsePage({
      currency: "USD",
      sort: "price-asc",
      pageSize: 2,
      cursor: second.pageInfo.nextCursor
    });

    const ids = [...first.listings, ...second.listings, ...third.listings].map((item) => item.id);
    assert.equal(new Set(ids).size, 5);
    assert.equal(ids.length, 5);
    assert.equal(third.pageInfo.hasNext, false);
    assert.equal(third.pageInfo.nextCursor, null);
    assert.deepEqual(
      [...first.listings, ...second.listings, ...third.listings].map((item) => item.amountCents),
      [1000, 1000, 2000, 2000, 3000]
    );
  });
});

test("Marketplace cursors are bound to the exact search definition", async () => {
  await withQuery(({ vault, core, query }) => {
    publish(vault, core, { title: "Alpha", amountCents: 1000 });
    publish(vault, core, { title: "Bravo", amountCents: 2000 });
    publish(vault, core, { title: "Charlie", amountCents: 3000 });

    const first = query.browsePage({ currency: "USD", sort: "price-asc", pageSize: 1 });
    assert.throws(
      () => query.browsePage({ currency: "USD", sort: "price-desc", pageSize: 1, cursor: first.pageInfo.nextCursor }),
      (error) => error instanceof MarketplaceError && error.code === "invalid_marketplace_cursor"
    );
    assert.throws(
      () => query.browsePage({ currency: "USD", category: "Comic Book", sort: "price-asc", pageSize: 1, cursor: first.pageInfo.nextCursor }),
      (error) => error instanceof MarketplaceError && error.code === "invalid_marketplace_cursor"
    );
  });
});

test("saved Marketplace searches are private definitions and rerun against current market state", async () => {
  await withQuery(({ vault, core, query }) => {
    publish(vault, core, { title: "First Dragon", amountCents: 1000 });
    const saved = query.createSavedSearch(seller, {
      name: "Dragons",
      filters: { query: "dragon", currency: "USD", sort: "price-asc" }
    });

    assert.equal(saved.notificationsAvailable, false);
    assert.equal(saved.resultsAreSnapshots, false);
    assert.equal(saved.filters.query, "dragon");
    assert.equal(query.listSavedSearches(otherCollector).length, 0);
    assert.throws(
      () => query.getSavedSearch(otherCollector, saved.id),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_saved_search_not_found"
    );

    const before = query.runSavedSearch(seller, saved.id, { pageSize: 10 });
    assert.deepEqual(before.listings.map((item) => item.title), ["First Dragon"]);

    publish(vault, core, { title: "Second Dragon", amountCents: 2000 });
    const after = query.runSavedSearch(seller, saved.id, { pageSize: 10 });
    assert.deepEqual(after.listings.map((item) => item.title), ["First Dragon", "Second Dragon"]);
  });
});

test("saved Marketplace searches enforce owner-name uniqueness and support update/delete", async () => {
  await withQuery(({ query }) => {
    const created = query.createSavedSearch(seller, { name: "Vintage Cards", filters: { query: "vintage" } });
    assert.throws(
      () => query.createSavedSearch(seller, { name: "vintage cards", filters: { query: "other" } }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_saved_search_exists"
    );

    const updated = query.updateSavedSearch(seller, created.id, {
      name: "Vintage Sports Cards",
      filters: { query: "vintage", category: "Sports Card" }
    });
    assert.equal(updated.name, "Vintage Sports Cards");
    assert.equal(updated.filters.category, "Sports Card");

    assert.deepEqual(query.deleteSavedSearch(seller, created.id), { id: created.id, deleted: true });
    assert.equal(query.listSavedSearches(seller).length, 0);
  });
});

test("paged reads still fail closed when a returned published representation is tampered", async () => {
  await withQuery(({ vaultStore, vault, core, query }) => {
    const listing = publish(vault, core, { title: "Protected Card", amountCents: 5000 });
    vaultStore.database.prepare(`
      UPDATE marketplace_listings SET published_snapshot_json = ? WHERE id = ?
    `).run(JSON.stringify({ title: "tampered" }), listing.id);

    assert.throws(
      () => query.browsePage({ pageSize: 10 }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_representation_integrity_failure"
    );
  });
});
