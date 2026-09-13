import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceAwareKingdomServer } from "../apps/web/marketplace-server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createMarketplaceQueryService } from "../packages/marketplace/src/query-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceSavedSearchRepository } from "../packages/marketplace/src/saved-search-repository.mjs";
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

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-saved-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceCoreService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const savedSearchRepository = createMarketplaceSavedSearchRepository({ vaultStore });
  const marketplaceQueryService = createMarketplaceQueryService({
    vaultStore,
    marketplaceRepository,
    marketplaceService: marketplaceCoreService,
    savedSearchRepository
  });
  const marketplaceService = Object.freeze({ ...marketplaceCoreService, ...marketplaceQueryService });
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

async function createPublishedListing(baseUrl, cookie, { title, amountCents }) {
  const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ title, category: "Sports Card", condition: "Near Mint", quantity: 1 })
  });
  assert.equal(treasure.response.status, 201);

  const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      treasureId: treasure.body.treasure.id,
      amountCents,
      currency: "USD",
      quantity: 1,
      fulfillmentMethod: "shipping",
      sellerDescription: "Dragon collector card"
    })
  });
  assert.equal(draft.response.status, 201);

  const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
  });
  assert.equal(published.response.status, 200);
  return published.body.listing;
}

test("authenticated Marketplace saved-search HTTP routes rerun live state and paginate with query-bound cursors", async () => {
  await withServer(async (baseUrl) => {
    const unauthorized = await requestJson(baseUrl, "/api/marketplace/saved-searches");
    assert.equal(unauthorized.response.status, 401);

    const registration = await requestJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "saved-search@example.com",
        password: "Saved Search Correct Horse 42!",
        displayName: "Saved Search Collector"
      })
    });
    assert.equal(registration.response.status, 201);

    const signIn = await requestJson(baseUrl, "/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "saved-search@example.com", password: "Saved Search Correct Horse 42!" })
    });
    assert.equal(signIn.response.status, 200);
    const cookie = signIn.response.headers.get("set-cookie");
    assert.match(cookie, /kingdom_session=/);

    await createPublishedListing(baseUrl, cookie, { title: "Blue Dragon Rookie", amountCents: 1000 });
    await createPublishedListing(baseUrl, cookie, { title: "Red Dragon Rookie", amountCents: 2000 });

    const created = await requestJson(baseUrl, "/api/marketplace/saved-searches", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        name: "Dragon rookies",
        filters: { query: "dragon", currency: "USD", sort: "price-asc" }
      })
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.savedSearch.notificationsAvailable, false);
    assert.equal(created.body.savedSearch.resultsAreSnapshots, false);
    assert.equal(created.body.capabilities.notificationsAvailable, false);
    const savedSearchId = created.body.savedSearch.id;

    const listed = await requestJson(baseUrl, "/api/marketplace/saved-searches", { headers: { cookie } });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.savedSearches.length, 1);
    assert.equal(listed.body.savedSearches[0].name, "Dragon rookies");

    const first = await requestJson(
      baseUrl,
      `/api/marketplace/saved-searches/${encodeURIComponent(savedSearchId)}/run?pageSize=1`,
      { headers: { cookie } }
    );
    assert.equal(first.response.status, 200);
    assert.equal(first.body.listings.length, 1);
    assert.equal(first.body.listings[0].title, "Blue Dragon Rookie");
    assert.equal(first.body.pageInfo.hasNext, true);
    assert.ok(first.body.pageInfo.nextCursor);

    const second = await requestJson(
      baseUrl,
      `/api/marketplace/saved-searches/${encodeURIComponent(savedSearchId)}/run?pageSize=1&cursor=${encodeURIComponent(first.body.pageInfo.nextCursor)}`,
      { headers: { cookie } }
    );
    assert.equal(second.response.status, 200);
    assert.equal(second.body.listings.length, 1);
    assert.equal(second.body.listings[0].title, "Red Dragon Rookie");
    assert.equal(second.body.pageInfo.hasNext, false);

    const wrongQuery = await requestJson(
      baseUrl,
      `/api/marketplace/listings?q=other&currency=USD&sort=price-asc&pageSize=1&cursor=${encodeURIComponent(first.body.pageInfo.nextCursor)}`
    );
    assert.equal(wrongQuery.response.status, 400);
    assert.equal(wrongQuery.body.error, "invalid_marketplace_cursor");

    await createPublishedListing(baseUrl, cookie, { title: "Gold Dragon Rookie", amountCents: 3000 });
    const rerun = await requestJson(
      baseUrl,
      `/api/marketplace/saved-searches/${encodeURIComponent(savedSearchId)}/run?pageSize=10`,
      { headers: { cookie } }
    );
    assert.equal(rerun.response.status, 200);
    assert.deepEqual(rerun.body.listings.map((listing) => listing.title), [
      "Blue Dragon Rookie",
      "Red Dragon Rookie",
      "Gold Dragon Rookie"
    ]);

    const removed = await requestJson(
      baseUrl,
      `/api/marketplace/saved-searches/${encodeURIComponent(savedSearchId)}`,
      { method: "DELETE", headers: { cookie } }
    );
    assert.equal(removed.response.status, 200);
    assert.equal(removed.body.result.deleted, true);

    const afterDelete = await requestJson(baseUrl, "/api/marketplace/saved-searches", { headers: { cookie } });
    assert.deepEqual(afterDelete.body.savedSearches, []);
  });
});
