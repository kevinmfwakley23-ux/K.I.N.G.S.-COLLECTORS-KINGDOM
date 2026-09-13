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

async function registerAndSignIn(baseUrl) {
  const credentials = {
    email: "listing-detail-seller@example.com",
    password: "Listing Detail Correct Horse 42!",
    displayName: "Detail Seller"
  };
  const registration = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
  assert.equal(registration.response.status, 201);
  const signIn = await requestJson(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email: credentials.email, password: credentials.password })
  });
  assert.equal(signIn.response.status, 200);
  const cookie = signIn.response.headers.get("set-cookie");
  assert.match(cookie, /kingdom_session=/);
  return cookie;
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-listing-detail-http-"));
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
  const server = createMarketplaceAwareKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    marketplaceService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, vaultStore });
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function publishListing(baseUrl, sellerCookie) {
  const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
    method: "POST",
    headers: { cookie: sellerCookie },
    body: JSON.stringify({
      title: "Amazing Spider-Man #300",
      category: "Comic Book",
      manufacturer: "Marvel",
      series: "Amazing Spider-Man",
      variant: "Newsstand",
      condition: "Very Fine",
      quantity: 1,
      purchasePriceCents: 22000,
      currency: "USD",
      notes: "Private owner note: acquired locally and stored in cabinet A."
    })
  });
  assert.equal(treasure.response.status, 201);

  const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
    method: "POST",
    headers: { cookie: sellerCookie },
    body: JSON.stringify({
      treasureId: treasure.body.treasure.id,
      amountCents: 70000,
      currency: "USD",
      quantity: 1,
      fulfillmentMethod: "shipping",
      sellerDescription: "First full Venom appearance; seller-described Very Fine copy."
    })
  });
  assert.equal(draft.response.status, 201);

  const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
    method: "POST",
    headers: { cookie: sellerCookie },
    body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
  });
  assert.equal(published.response.status, 200);
  return { treasure: treasure.body.treasure, listing: published.body.listing };
}

test("shareable listing detail API exposes only current sanitized public representation and optional public storefront identity", async () => {
  await withServer(async ({ baseUrl }) => {
    const sellerCookie = await registerAndSignIn(baseUrl);
    const { treasure, listing } = await publishListing(baseUrl, sellerCookie);

    const storefront = await requestJson(baseUrl, "/api/marketplace/seller-profile", {
      method: "PATCH",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({
        publicId: "detail-seller",
        shopName: "Detail Seller Collectibles",
        bio: "Comic books and trading cards.",
        published: true
      })
    });
    assert.equal(storefront.response.status, 200);

    const detail = await requestJson(baseUrl, `/api/marketplace/listings/${encodeURIComponent(listing.id)}`);
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.listing.id, listing.id);
    assert.equal(detail.body.listing.title, "Amazing Spider-Man #300");
    assert.equal(detail.body.listing.amountCents, 70000);
    assert.equal(detail.body.listing.currency, "USD");
    assert.match(detail.body.listing.representationSha256, /^[a-f0-9]{64}$/);
    assert.equal(detail.body.listing.seller.id, "detail-seller");
    assert.equal(detail.body.listing.seller.shopName, "Detail Seller Collectibles");
    assert.equal(detail.body.engagement.verifiedPurchaseFeedbackAvailable, false);

    for (const privateField of [
      "treasureId",
      "sellerAccountId",
      "purchasePriceCents",
      "notes",
      "locationId",
      "collectionId",
      "storageLocation"
    ]) assert.equal(privateField in detail.body.listing, false, `${privateField} must remain private`);
    assert.notEqual(detail.body.listing.id, treasure.id);
  });
});

test("shareable listing detail API refuses withdrawn and integrity-failed offers instead of replaying stale snapshots", async () => {
  await withServer(async ({ baseUrl, vaultStore }) => {
    const sellerCookie = await registerAndSignIn(baseUrl);
    const first = await publishListing(baseUrl, sellerCookie);

    const withdrawn = await requestJson(baseUrl, `/api/marketplace/listings/${first.listing.id}/withdraw`, {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({})
    });
    assert.equal(withdrawn.response.status, 200);

    const staleDetail = await requestJson(baseUrl, `/api/marketplace/listings/${first.listing.id}`);
    assert.equal(staleDetail.response.status, 404);
    assert.equal(staleDetail.body.error, "marketplace_listing_not_found");
    assert.equal("listing" in staleDetail.body, false);

    const secondTreasure = await requestJson(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({ title: "Secret Wars #8", category: "Comic Book", condition: "Fine", quantity: 1 })
    });
    const secondDraft = await requestJson(baseUrl, "/api/marketplace/listings", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({
        treasureId: secondTreasure.body.treasure.id,
        amountCents: 15000,
        currency: "USD",
        quantity: 1,
        fulfillmentMethod: "shipping",
        sellerDescription: "Seller-described Fine copy."
      })
    });
    const secondPublished = await requestJson(baseUrl, `/api/marketplace/listings/${secondDraft.body.listing.id}/publish`, {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
    });
    assert.equal(secondPublished.response.status, 200);

    vaultStore.database.prepare(`
      UPDATE marketplace_listings
      SET published_snapshot_json = ?
      WHERE id = ?
    `).run(JSON.stringify({ title: "Tampered stale representation" }), secondDraft.body.listing.id);

    const tamperedDetail = await requestJson(baseUrl, `/api/marketplace/listings/${secondDraft.body.listing.id}`);
    assert.equal(tamperedDetail.response.status, 500);
    assert.equal(tamperedDetail.body.error, "marketplace_representation_integrity_failure");
    assert.equal("listing" in tamperedDetail.body, false);
  });
});
