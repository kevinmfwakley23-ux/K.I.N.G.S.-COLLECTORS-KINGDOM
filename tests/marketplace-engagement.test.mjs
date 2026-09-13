import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceEngagementRepository } from "../packages/marketplace/src/engagement-repository.mjs";
import { createMarketplaceEngagementService } from "../packages/marketplace/src/engagement-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "seller-a", displayName: "Card Castle" });
const buyer = Object.freeze({ id: "buyer-a", displayName: "Buyer A" });
const otherBuyer = Object.freeze({ id: "buyer-b", displayName: "Buyer B" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

async function withEngagement(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-engagement-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const engagementRepository = createMarketplaceEngagementRepository({ vaultStore });
  let tick = Date.parse("2026-09-13T15:00:00.000Z");
  const engagement = createMarketplaceEngagementService({
    vaultStore,
    marketplaceRepository,
    marketplaceService,
    engagementRepository,
    now: () => new Date(tick += 1000)
  });
  try {
    await run({ vaultStore, vault, marketplaceRepository, marketplaceService, engagementRepository, engagement });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, marketplaceService, owner, title, amountCents = 10000) {
  const treasure = vault.createTreasure(owner, {
    title,
    category: "Trading Card",
    manufacturer: "Example Maker",
    series: "Example Set",
    condition: "Near Mint",
    quantity: 1
  });
  const draft = marketplaceService.createDraft(owner, {
    treasureId: treasure.id,
    amountCents,
    currency: "USD",
    quantity: 1,
    fulfillmentMethod: "shipping",
    sellerDescription: `${title} collector copy`
  });
  const listing = marketplaceService.publish(owner, draft.id, attestations);
  return { treasure, listing };
}

test("Marketplace seller storefront exposes seller-controlled public identity without invented reputation", async () => {
  await withEngagement(({ vault, marketplaceService, engagement }) => {
    publish(vault, marketplaceService, seller, "Charizard Base Set");
    const mine = engagement.getMySellerProfile(seller);
    assert.equal(mine.shopName, "Card Castle");
    assert.equal(mine.activeListingCount, 1);
    assert.equal(mine.identityVerificationAvailable, false);
    assert.equal(mine.verifiedPurchaseFeedbackAvailable, false);
    assert.equal(mine.feedbackRating, null);
    assert.equal(mine.verifiedPurchaseFeedbackCount, 0);
    assert.equal("sellerAccountId" in mine, false);

    const updated = engagement.updateMySellerProfile(seller, {
      shopName: "Card Castle Collectibles",
      bio: "Vintage cards and carefully described collection duplicates."
    });
    assert.equal(updated.shopName, "Card Castle Collectibles");
    assert.match(updated.bio, /carefully described/);

    const publicSeller = engagement.getPublicSeller(updated.id);
    assert.deepEqual(publicSeller, updated);
    assert.match(publicSeller.reputationMessage, /verified completed transaction/i);
  });
});

test("seller storefront inventory is current Vault-backed inventory, not a frozen seller catalog", async () => {
  await withEngagement(({ vault, marketplaceService, engagement }) => {
    const first = publish(vault, marketplaceService, seller, "First Card", 12000);
    publish(vault, marketplaceService, seller, "Second Card", 15000);
    const profile = engagement.getMySellerProfile(seller);

    const before = engagement.listPublicSellerListings(profile.id, { limit: 24 });
    assert.equal(before.seller.activeListingCount, 2);
    assert.equal(before.listings.length, 2);
    assert.equal(before.inventoryIsComplete, true);
    assert.ok(before.listings.every((listing) => listing.seller?.id === profile.id));

    vault.archiveTreasure(seller, first.treasure.id);
    const after = engagement.listPublicSellerListings(profile.id, { limit: 24 });
    assert.equal(after.seller.activeListingCount, 1);
    assert.deepEqual(after.listings.map((listing) => listing.title), ["Second Card"]);
  });
});

test("Marketplace watchlists are private, idempotent, reject own listings and preserve withdrawal as an unavailable tombstone", async () => {
  await withEngagement(({ vault, marketplaceService, engagement }) => {
    const published = publish(vault, marketplaceService, seller, "Watched Card");
    engagement.getMySellerProfile(seller);

    const first = engagement.addToWatchlist(buyer, published.listing.id);
    assert.equal(first.created, true);
    assert.equal(first.available, true);
    assert.equal(first.listing.title, "Watched Card");

    const duplicate = engagement.addToWatchlist(buyer, published.listing.id);
    assert.equal(duplicate.created, false);
    assert.equal(engagement.listWatchlist(buyer).count, 1);
    assert.equal(engagement.listWatchlist(otherBuyer).count, 0);

    assert.throws(
      () => engagement.addToWatchlist(seller, published.listing.id),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_watchlist_own_listing"
    );

    marketplaceService.withdraw(seller, published.listing.id);
    const withdrawn = engagement.listWatchlist(buyer);
    assert.equal(withdrawn.items[0].available, false);
    assert.equal(withdrawn.items[0].listing, null);
    assert.equal(withdrawn.notificationsAvailable, false);

    assert.deepEqual(engagement.removeFromWatchlist(buyer, published.listing.id), {
      listingId: published.listing.id,
      removed: true
    });
    assert.equal(engagement.listWatchlist(buyer).count, 0);
  });
});

test("watchlist reads preserve the published-representation integrity boundary", async () => {
  await withEngagement(({ vaultStore, vault, marketplaceService, engagement }) => {
    const published = publish(vault, marketplaceService, seller, "Integrity Card");
    engagement.addToWatchlist(buyer, published.listing.id);
    vaultStore.database.prepare(`
      UPDATE marketplace_listings
      SET published_snapshot_json = ?
      WHERE id = ?
    `).run(JSON.stringify({ title: "Tampered" }), published.listing.id);

    assert.throws(
      () => engagement.listWatchlist(buyer),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_representation_integrity_failure"
    );
  });
});
