import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createMarketplaceEngagementRepository } from "../packages/marketplace/src/engagement-repository.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "seller-sellable", roles: ["collector"] });
const attestations = Object.freeze({
  attestPossession: true,
  attestRightToSell: true,
  confirmAccuracy: true
});

async function withMarket(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-sellable-market-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let clock = Date.parse("2026-09-24T18:00:00.000Z");
  const now = () => new Date(clock);
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore, now });
  const marketplace = createMarketplaceService({ vaultStore, marketplaceRepository: repository, now });
  const engagementRepository = createMarketplaceEngagementRepository({ vaultStore, now });

  try {
    await run({
      vaultStore,
      vault,
      repository,
      marketplace,
      engagementRepository,
      advance(milliseconds) { clock += milliseconds; }
    });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publishListing(vault, marketplace, title, quantity) {
  const treasure = vault.createTreasure(seller, {
    title,
    category: "Sports Card",
    manufacturer: "Fleer",
    condition: "Near Mint",
    quantity,
    purchasePriceCents: 1000,
    currency: "USD"
  });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents: 2500,
    currency: "USD",
    quantity,
    fulfillmentMethod: "shipping",
    sellerDescription: `${title} public offer`
  });
  return marketplace.publish(seller, draft.id, attestations);
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

function hold(database, { id, listingId, state = "created", quantity = 1, expiresAt = null }) {
  database.prepare(`
    INSERT INTO marketplace_orders (id,listing_id,state,quantity,reservation_expires_at)
    VALUES (?,?,?,?,?)
  `).run(id, listingId, state, quantity, expiresAt);
}

test("discovery, facets, and storefronts expose only currently sellable inventory without deleting listing evidence", async () => {
  await withMarket(({ vaultStore, vault, repository, marketplace, engagementRepository, advance }) => {
    const partial = publishListing(vault, marketplace, "Partial inventory", 2);
    const full = publishListing(vault, marketplace, "Fully reserved inventory", 1);
    const free = publishListing(vault, marketplace, "Freely available inventory", 1);

    assert.equal(repository.listActive().length, 3, "legacy/non-transaction contexts remain discoverable before reservation schema exists");
    assert.equal(repository.activeFacets().totalActiveListings, 3);

    installReservationProjection(vaultStore.database);
    const future = new Date(Date.parse("2026-09-24T18:10:00.000Z")).toISOString();
    hold(vaultStore.database, { id: "hold-partial", listingId: partial.id, quantity: 1, expiresAt: future });
    hold(vaultStore.database, { id: "hold-full", listingId: full.id, quantity: 1, expiresAt: future });

    const activeIds = repository.listActive().map((listing) => listing.id);
    assert.deepEqual(new Set(activeIds), new Set([partial.id, free.id]), "partial stock stays visible while fully held stock is suppressed");

    const facets = repository.activeFacets();
    assert.equal(facets.totalActiveListings, 2);
    assert.equal(facets.categories.find((facet) => facet.value === "Sports Card")?.count, 2);
    assert.equal(facets.currencies.find((facet) => facet.value === "USD")?.count, 2);

    assert.deepEqual(
      new Set(engagementRepository.listActiveListingIdsForSellerAccount(seller.id)),
      new Set([partial.id, free.id])
    );
    assert.equal(engagementRepository.countActiveListingsForSellerAccount(seller.id), 2);

    const stillAddressable = marketplace.getPublic(full.id);
    assert.equal(stillAddressable.id, full.id, "a full reservation does not erase the immutable public listing record");
    assert.equal(stillAddressable.quantity, 1);

    advance(11 * 60 * 1000);
    assert.deepEqual(
      new Set(repository.listActive().map((listing) => listing.id)),
      new Set([partial.id, full.id, free.id]),
      "expired transient holds stop suppressing sellable inventory without requiring a browser cleanup"
    );
    assert.equal(repository.activeFacets().totalActiveListings, 3);
    assert.equal(engagementRepository.countActiveListingsForSellerAccount(seller.id), 3);

    hold(vaultStore.database, { id: "paid-free", listingId: free.id, state: "paid", quantity: 1 });
    assert.deepEqual(
      new Set(repository.listActive().map((listing) => listing.id)),
      new Set([partial.id, full.id]),
      "durable payment states continue holding inventory even without an expiry"
    );
    assert.equal(repository.activeFacets().totalActiveListings, 2);
    assert.equal(engagementRepository.countActiveListingsForSellerAccount(seller.id), 2);
    assert.equal(marketplace.getPublic(free.id).id, free.id, "durably held listing evidence remains directly addressable");
  });
});
