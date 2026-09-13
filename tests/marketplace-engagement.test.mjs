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
const otherSeller = Object.freeze({ id: "seller-b", displayName: "Other Seller" });
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

function createStorefront(engagement, owner = seller, overrides = {}) {
  return engagement.updateMySellerProfile(owner, {
    publicId: overrides.publicId ?? "card-castle",
    shopName: overrides.shopName ?? "Card Castle Collectibles",
    bio: overrides.bio ?? "Carefully described collection duplicates.",
    published: overrides.published ?? true
  });
}

test("seller storefront remains private until explicit publication and exposes no private account identity", async () => {
  await withEngagement(({ vault, marketplaceService, engagement }) => {
    publish(vault, marketplaceService, seller, "Charizard Base Set");
    assert.equal(engagement.getMySellerProfile(seller), null);

    const draftProfile = createStorefront(engagement, seller, { published: false });
    assert.equal(draftProfile.isPublic, false);
    assert.equal(draftProfile.publicUrl, null);
    assert.equal(draftProfile.activeListingCount, 1);
    assert.equal("sellerAccountId" in draftProfile, false);
    assert.throws(
      () => engagement.getPublicSeller("card-castle"),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_seller_not_found"
    );

    const published = engagement.updateMySellerProfile(seller, { published: true });
    assert.equal(published.isPublic, true);
    assert.equal(published.publicUrl, "/marketplace-seller.html?id=card-castle");
    assert.ok(published.publishedAt);

    const publicSeller = engagement.getPublicSeller("card-castle");
    assert.equal(publicSeller.shopName, "Card Castle Collectibles");
    assert.equal(publicSeller.identityVerificationAvailable, false);
    assert.equal(publicSeller.verifiedPurchaseFeedbackAvailable, false);
    assert.equal(publicSeller.feedbackRating, null);
    assert.equal(publicSeller.verifiedPurchaseFeedbackCount, 0);
    assert.equal(publicSeller.transactionCheckoutAvailable, false);
    assert.equal("sellerAccountId" in publicSeller, false);
    assert.equal("email" in publicSeller, false);
  });
});

test("storefront public IDs are explicit, unique, reserved-route safe and immutable", async () => {
  await withEngagement(({ engagement }) => {
    assert.throws(
      () => engagement.updateMySellerProfile(seller, { publicId: "api", shopName: "Bad Route", published: true }),
      (error) => error instanceof MarketplaceError && error.code === "invalid_marketplace_storefront_id"
    );

    createStorefront(engagement, seller, { publicId: "card-castle", published: false });
    assert.throws(
      () => engagement.updateMySellerProfile(otherSeller, { publicId: "CARD-CASTLE", shopName: "Other Store", published: false }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_storefront_id_unavailable"
    );
    assert.throws(
      () => engagement.updateMySellerProfile(seller, { publicId: "renamed-store" }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_storefront_id_immutable"
    );
  });
});

test("seller storefront inventory is current Vault-backed inventory, never a frozen private catalog", async () => {
  await withEngagement(({ vault, marketplaceService, engagement }) => {
    const first = publish(vault, marketplaceService, seller, "First Card", 12000);
    publish(vault, marketplaceService, seller, "Second Card", 15000);

    const hidden = createStorefront(engagement, seller, { published: false });
    const undecorated = engagement.decoratePublicListing(marketplaceService.getPublic(first.listing.id));
    assert.equal(undecorated.sellerStorefrontAvailable, false);
    assert.equal(undecorated.seller, null);
    assert.throws(() => engagement.listPublicSellerListings(hidden.id), /not found/i);

    engagement.updateMySellerProfile(seller, { published: true });
    const before = engagement.listPublicSellerListings("card-castle", { limit: 24 });
    assert.equal(before.seller.activeListingCount, 2);
    assert.equal(before.listings.length, 2);
    assert.equal(before.inventoryIsComplete, true);
    assert.ok(before.listings.every((listing) => listing.seller?.id === "card-castle"));
    assert.ok(before.listings.every((listing) => !Object.hasOwn(listing, "treasureId")));

    vault.archiveTreasure(seller, first.treasure.id);
    const after = engagement.listPublicSellerListings("card-castle", { limit: 24 });
    assert.equal(after.seller.activeListingCount, 1);
    assert.deepEqual(after.listings.map((listing) => listing.title), ["Second Card"]);

    engagement.updateMySellerProfile(seller, { published: false });
    assert.throws(
      () => engagement.getPublicSeller("card-castle"),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_seller_not_found"
    );
  });
});

test("Marketplace watchlists are private, idempotent, reject own listings and preserve withdrawal as an unavailable tombstone", async () => {
  await withEngagement(({ vault, marketplaceService, engagement }) => {
    const published = publish(vault, marketplaceService, seller, "Watched Card");
    createStorefront(engagement);

    const first = engagement.addToWatchlist(buyer, published.listing.id);
    assert.equal(first.created, true);
    assert.equal(first.available, true);
    assert.equal(first.listing.title, "Watched Card");
    assert.equal(first.listing.seller.id, "card-castle");

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
    assert.equal(withdrawn.purchaseCommitmentCreated, false);

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
