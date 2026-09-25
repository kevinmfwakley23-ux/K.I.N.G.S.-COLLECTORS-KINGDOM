import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceQueryService } from "../packages/marketplace/src/query-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceSavedSearchRepository } from "../packages/marketplace/src/saved-search-repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "saved-search-intelligence-seller" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

async function withMarket(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-saved-search-intelligence-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let clock = Date.parse("2026-09-24T18:00:00.000Z");
  const now = () => new Date(clock);
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore, now });
  const core = createMarketplaceService({ vaultStore, marketplaceRepository: repository, now });
  const savedSearchRepository = createMarketplaceSavedSearchRepository({ vaultStore });
  const query = createMarketplaceQueryService({
    vaultStore,
    marketplaceRepository: repository,
    marketplaceService: core,
    savedSearchRepository,
    now
  });
  try {
    await run({
      vaultStore,
      vault,
      repository,
      core,
      query,
      savedSearchRepository,
      advance(milliseconds) { clock += milliseconds; },
      now
    });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, core, { title, category = "Trading Card", amountCents = 2500, quantity = 1 }) {
  const treasure = vault.createTreasure(seller, { title, category, quantity });
  const draft = core.createDraft(seller, {
    treasureId: treasure.id,
    amountCents,
    currency: "USD",
    quantity,
    fulfillmentMethod: "shipping",
    sellerDescription: `${title} seller offer`
  });
  return core.publish(seller, draft.id, attestations);
}

function installReservationProjection(database) {
  database.exec(`
    CREATE TABLE marketplace_orders (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      state TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reservation_expires_at TEXT
    );
  `);
}

test("saved searches count newly published currently sellable matches without silently acknowledging them", async () => {
  await withMarket(({ vault, core, query, advance }) => {
    publish(vault, core, { title: "Existing Dragon" });
    advance(60_000);
    const created = query.createSavedSearch(seller, {
      name: "Dragons",
      filters: { query: "dragon", currency: "USD" }
    });

    assert.equal(created.newListingTrackingAvailable, true);
    assert.equal(created.notificationsAvailable, false);
    assert.equal(created.newlyPublishedMatchCount, 0);
    const originalCheckpoint = created.lastCheckedAt;

    advance(60_000);
    publish(vault, core, { title: "New Dragon" });
    publish(vault, core, { title: "New Phoenix" });

    const listed = query.listSavedSearches(seller)[0];
    assert.equal(listed.newlyPublishedMatchCount, 1);
    assert.equal(listed.lastCheckedAt, originalCheckpoint, "reading the saved-search panel must not advance the checkpoint");

    const preview = query.runSavedSearch(seller, created.id, { pageSize: 10 });
    assert.equal(preview.matchActivity.newlyPublishedSinceLastCheck, 1);
    assert.equal(preview.matchActivity.currentlySellableOnly, true);
    assert.equal(preview.matchActivity.notificationsAvailable, false);
    assert.equal(preview.savedSearch.lastCheckedAt, originalCheckpoint, "GET-style live reruns stay read-only");

    const acknowledged = query.updateSavedSearch(seller, created.id, { acknowledgeNewListings: true });
    assert.notEqual(acknowledged.lastCheckedAt, originalCheckpoint);
    assert.equal(acknowledged.newlyPublishedMatchCount, 0);
    assert.equal(query.listSavedSearches(seller)[0].newlyPublishedMatchCount, 0);
  });
});

test("saved-search checkpoints survive renames and reset when the search definition changes", async () => {
  await withMarket(({ vault, core, query, advance }) => {
    const saved = query.createSavedSearch(seller, { name: "Cards", filters: { query: "dragon" } });
    const firstCheckpoint = saved.lastCheckedAt;

    advance(60_000);
    publish(vault, core, { title: "Dragon Card" });
    assert.equal(query.listSavedSearches(seller)[0].newlyPublishedMatchCount, 1);

    const renamed = query.updateSavedSearch(seller, saved.id, { name: "Dragon Cards" });
    assert.equal(renamed.lastCheckedAt, firstCheckpoint, "renaming must not silently dismiss unseen listings");
    assert.equal(renamed.newlyPublishedMatchCount, 1);

    advance(60_000);
    const redefined = query.updateSavedSearch(seller, saved.id, { filters: { query: "phoenix" } });
    assert.notEqual(redefined.lastCheckedAt, firstCheckpoint, "a new search definition starts a new evidence window");
    assert.equal(redefined.newlyPublishedMatchCount, 0);
  });
});

test("fully reserved newly published matches are not counted until they are sellable again", async () => {
  await withMarket(({ vaultStore, vault, core, query, advance, now }) => {
    const saved = query.createSavedSearch(seller, { name: "Reserved dragons", filters: { query: "dragon" } });
    installReservationProjection(vaultStore.database);

    advance(60_000);
    const listing = publish(vault, core, { title: "Reserved Dragon" });
    const expiresAt = new Date(now().getTime() + 10 * 60_000).toISOString();
    vaultStore.database.prepare(`
      INSERT INTO marketplace_orders (id,listing_id,state,quantity,reservation_expires_at)
      VALUES (?,?,?,?,?)
    `).run("reservation-1", listing.id, "created", 1, expiresAt);

    assert.equal(query.listSavedSearches(seller)[0].newlyPublishedMatchCount, 0, "fully held inventory is not a current buyer opportunity");

    advance(11 * 60_000);
    const restored = query.listSavedSearches(seller)[0];
    assert.equal(restored.newlyPublishedMatchCount, 1, "an expired temporary hold reveals the still-unseen published match");
    assert.equal(restored.lastCheckedAt, saved.lastCheckedAt);

    const acknowledged = query.updateSavedSearch(seller, saved.id, { acknowledgeNewListings: true });
    assert.equal(acknowledged.newlyPublishedMatchCount, 0);
  });
});

test("saved-search repository migrates legacy rows with a creation-time checkpoint", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-saved-search-migration-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  try {
    vaultStore.database.exec(`
      CREATE TABLE marketplace_saved_searches (
        id TEXT PRIMARY KEY,
        owner_account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        filters_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    vaultStore.database.prepare(`
      INSERT INTO marketplace_saved_searches (id,owner_account_id,name,filters_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?)
    `).run(
      "legacy-search",
      seller.id,
      "Legacy",
      JSON.stringify({ query: "dragon", sort: "newest" }),
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:00:00.000Z"
    );

    const repository = createMarketplaceSavedSearchRepository({ vaultStore });
    const migrated = repository.findById(seller.id, "legacy-search");
    assert.equal(migrated.lastCheckedAt, "2026-09-20T10:00:00.000Z");
    assert.ok(vaultStore.database.prepare("PRAGMA table_info(marketplace_saved_searches)").all().some((column) => column.name === "last_checked_at"));
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
});