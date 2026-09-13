import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceAwareKingdomServer } from "../apps/web/marketplace-server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createMarketplaceEngagementRepository } from "../packages/marketplace/src/engagement-repository.mjs";
import { createMarketplaceEngagementService } from "../packages/marketplace/src/engagement-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function registerAndSignIn(baseUrl, { email, password, displayName }) {
  const registration = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });
  assert.equal(registration.response.status, 201);
  const signIn = await requestJson(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(signIn.response.status, 200);
  const cookie = signIn.response.headers.get("set-cookie");
  assert.match(cookie, /kingdom_session=/);
  return cookie;
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-engagement-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceCoreService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const engagementRepository = createMarketplaceEngagementRepository({ vaultStore });
  const engagementService = createMarketplaceEngagementService({
    vaultStore,
    marketplaceRepository,
    marketplaceService: marketplaceCoreService,
    engagementRepository
  });
  const marketplaceService = Object.freeze({ ...marketplaceCoreService, ...engagementService });
  const config = { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false };
  const server = createMarketplaceAwareKingdomServer({
    config,
    logger: silentLogger,
    identityService,
    vaultService,
    marketplaceService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Marketplace seller storefront and buyer watchlist are wired end to end without fake reputation", async () => {
  await withServer(async (baseUrl) => {
    const sellerCookie = await registerAndSignIn(baseUrl, {
      email: "seller-storefront@example.com",
      password: "Seller Storefront Correct Horse 42!",
      displayName: "Royal Card Seller"
    });
    const buyerCookie = await registerAndSignIn(baseUrl, {
      email: "buyer-watchlist@example.com",
      password: "Buyer Watchlist Correct Horse 42!",
      displayName: "Royal Buyer"
    });

    const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({
        title: "1999 Pokémon Charizard 4/102 Holo",
        category: "Trading Card",
        manufacturer: "Wizards of the Coast",
        series: "Base Set",
        condition: "Excellent",
        quantity: 1
      })
    });
    assert.equal(treasure.response.status, 201);

    const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({
        treasureId: treasure.body.treasure.id,
        amountCents: 50000,
        currency: "USD",
        quantity: 1,
        fulfillmentMethod: "shipping",
        sellerDescription: "English holo collector copy"
      })
    });
    assert.equal(draft.response.status, 201);

    const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
    });
    assert.equal(published.response.status, 200);

    const mine = await requestJson(baseUrl, "/api/marketplace/seller-profile", { headers: { cookie: sellerCookie } });
    assert.equal(mine.response.status, 200);
    assert.equal(mine.body.seller.shopName, "Royal Card Seller");
    assert.equal(mine.body.seller.verifiedPurchaseFeedbackAvailable, false);
    assert.equal(mine.body.seller.feedbackRating, null);
    const sellerPublicId = mine.body.seller.id;

    const updated = await requestJson(baseUrl, "/api/marketplace/seller-profile", {
      method: "PATCH",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({
        shopName: "Royal Card Vault",
        bio: "Collector duplicates and vintage trading cards."
      })
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.seller.shopName, "Royal Card Vault");

    const market = await requestJson(baseUrl, "/api/marketplace/listings?pageSize=24");
    assert.equal(market.response.status, 200);
    assert.equal(market.body.listings.length, 1);
    assert.equal(market.body.listings[0].seller.id, sellerPublicId);
    assert.equal(market.body.listings[0].seller.shopName, "Royal Card Vault");
    assert.equal(market.body.listings[0].seller.verifiedPurchaseFeedbackAvailable, false);

    const storefront = await requestJson(baseUrl, `/api/marketplace/sellers/${encodeURIComponent(sellerPublicId)}/listings?limit=24`);
    assert.equal(storefront.response.status, 200);
    assert.equal(storefront.body.seller.shopName, "Royal Card Vault");
    assert.equal(storefront.body.seller.activeListingCount, 1);
    assert.equal(storefront.body.seller.identityVerificationAvailable, false);
    assert.equal(storefront.body.seller.verifiedPurchaseFeedbackCount, 0);
    assert.equal(storefront.body.listings[0].title, "1999 Pokémon Charizard 4/102 Holo");

    const ownWatch = await requestJson(baseUrl, "/api/marketplace/watchlist", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({ listingId: draft.body.listing.id })
    });
    assert.equal(ownWatch.response.status, 409);
    assert.equal(ownWatch.body.error, "marketplace_watchlist_own_listing");

    const watch = await requestJson(baseUrl, "/api/marketplace/watchlist", {
      method: "POST",
      headers: { cookie: buyerCookie },
      body: JSON.stringify({ listingId: draft.body.listing.id })
    });
    assert.equal(watch.response.status, 201);
    assert.equal(watch.body.item.created, true);
    assert.equal(watch.body.item.listing.seller.shopName, "Royal Card Vault");

    const duplicateWatch = await requestJson(baseUrl, "/api/marketplace/watchlist", {
      method: "POST",
      headers: { cookie: buyerCookie },
      body: JSON.stringify({ listingId: draft.body.listing.id })
    });
    assert.equal(duplicateWatch.response.status, 201);
    assert.equal(duplicateWatch.body.item.created, false);

    const privateList = await requestJson(baseUrl, "/api/marketplace/watchlist", { headers: { cookie: buyerCookie } });
    assert.equal(privateList.response.status, 200);
    assert.equal(privateList.body.count, 1);
    assert.equal(privateList.body.items[0].available, true);
    assert.equal(privateList.body.notificationsAvailable, false);

    const unauthenticatedWatchlist = await requestJson(baseUrl, "/api/marketplace/watchlist");
    assert.equal(unauthenticatedWatchlist.response.status, 401);

    const withdrawn = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/withdraw`, {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({})
    });
    assert.equal(withdrawn.response.status, 200);

    const afterWithdrawal = await requestJson(baseUrl, "/api/marketplace/watchlist", { headers: { cookie: buyerCookie } });
    assert.equal(afterWithdrawal.body.items[0].available, false);
    assert.equal(afterWithdrawal.body.items[0].listing, null);

    const removed = await requestJson(baseUrl, `/api/marketplace/watchlist/${encodeURIComponent(draft.body.listing.id)}`, {
      method: "DELETE",
      headers: { cookie: buyerCookie }
    });
    assert.equal(removed.response.status, 200);
    assert.equal(removed.body.result.removed, true);
  });
});
